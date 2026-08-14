import * as http from 'http'; // V4.2 Snapshot Force
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, saveConfig } from './config.js';
import { handleCommand } from './commands.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { buildConnectResponse } from './connect-response.js';

import { log } from './logger.js';
import { getConfigDir } from './config.js';
import { t } from '../locales/index.js';

// --- PERSISTENCE: SIGNATURE MAP (Multi-Round Support) ---
const SIG_FILE = path.join(getConfigDir(), 'pollinations-signature.json');
let signatureMap: Record<string, string> = {};
let lastSignature: string | null = null; // V1 Fallback Global

try {
    if (fs.existsSync(SIG_FILE)) {
        signatureMap = JSON.parse(fs.readFileSync(SIG_FILE, 'utf-8'));
    }
} catch (e) { log(`[Proxy Signature] Error loading: ${e}`); }

function saveSignatureMap() {
    try {
        if (!fs.existsSync(path.dirname(SIG_FILE))) fs.mkdirSync(path.dirname(SIG_FILE), { recursive: true });
        fs.writeFileSync(SIG_FILE, JSON.stringify(signatureMap, null, 2));
    } catch (e) { log(`ERROR: Error mapping signature: ${String(e)}`); }
}

// RECURSIVE NORMALIZER for Stable Hashing
function normalizeContent(c: any): string {
    if (!c) return "";
    if (typeof c === 'string') return c.replace(/\s+/g, ''); // Standard String
    if (Array.isArray(c)) return c.map(normalizeContent).join(''); // Recurse Array
    if (typeof c === 'object') {
        const keys = Object.keys(c).sort();
        return keys.map(k => k + normalizeContent(c[k])).join('');
    }
    return String(c);
}

function hashMessage(content: any): string {
    const normalized = normalizeContent(content);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// --- SANITIZATION HELPERS ---

function dereferenceSchema(schema: any, rootDefs: any): any {
    if (!schema || typeof schema !== 'object') return schema;
    if (schema.$ref || schema.ref) {
        const refKey = (schema.$ref || schema.ref).split('/').pop();
        if (rootDefs && rootDefs[refKey]) {
            const def = dereferenceSchema(JSON.parse(JSON.stringify(rootDefs[refKey])), rootDefs);
            delete schema.$ref;
            delete schema.ref;
            Object.assign(schema, def);
        } else {
            for (const key in schema) {
                if (key !== 'description' && key !== 'default') delete schema[key];
            }
            schema.type = "string";
            schema.description = (schema.description || "") + " [Ref Failed]";
        }
    }

    // VERTEX FIX: 'const' not supported -> convert to 'enum'
    if (schema.const !== undefined) {
        schema.enum = [schema.const];
        delete schema.const;
    }

    // VERTEX FIX: 'anyOf' must be exclusive (no other siblings)
    if (schema.anyOf || schema.oneOf) {
        // Vertex demands strict exclusivity.
        // We keep 'definitions'/'$defs' if present at root (though unlikely here)
        // But for a property node, we must strip EVERYTHING else.
        const keys = Object.keys(schema);
        keys.forEach(k => {
            if (k !== 'anyOf' && k !== 'oneOf' && k !== 'definitions' && k !== '$defs') {
                delete schema[k];
            }
        });
    }

    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = dereferenceSchema(schema.properties[key], rootDefs);
        }
    }
    if (schema.items) {
        schema.items = dereferenceSchema(schema.items, rootDefs);
    }
    if (schema.anyOf) {
        schema.anyOf = schema.anyOf.map((s: any) => dereferenceSchema(s, rootDefs));
    }
    if (schema.oneOf) {
        schema.oneOf = schema.oneOf.map((s: any) => dereferenceSchema(s, rootDefs));
    }
    if (schema.allOf) {
        schema.allOf = schema.allOf.map((s: any) => dereferenceSchema(s, rootDefs));
    }

    if (schema.optional !== undefined) delete schema.optional;
    if (schema.title) delete schema.title;
    return schema;
}

function sanitizeToolsForVertex(tools: any[]): any[] {
    return tools.map(tool => {
        if (!tool.function || !tool.function.parameters) return tool;
        let params = tool.function.parameters;
        const defs = params.definitions || params.$defs;
        params = dereferenceSchema(params, defs);
        if (params.definitions) delete params.definitions;
        if (params.$defs) delete params.$defs;
        tool.function.parameters = params;
        return tool;
    });
}

function sanitizeToolsForBedrock(tools: any[]): any[] {
    return tools.map(tool => {
        if (tool.function) {
            if (!tool.function.description || tool.function.description.length === 0) {
                tool.function.description = " "; // Force non-empty string
            }
        }
        return tool;
    });
}

function sanitizeSchemaForKimi(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    // Kimi Fixes
    if (schema.title) delete schema.title;

    // Fix empty objects "{}" which Kimi hates.
    // If it's an empty object without type, assume string or object?
    // Often happens with "additionalProperties: {}"
    if (Object.keys(schema).length === 0) {
        schema.type = "string"; // Fallback to safe type
        schema.description = "Any value";
    }

    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = sanitizeSchemaForKimi(schema.properties[key]);
        }
    }
    if (schema.items) sanitizeSchemaForKimi(schema.items);
    return schema;
}

function truncateTools(tools: any[], limit: number = 120): any[] {
    if (!tools || tools.length <= limit) return tools;
    return tools.slice(0, limit);
}

// v6.5: single source for the dynamic paid_only list (saved by generate-config.ts).
function isPaidOnlyModel(model: string): boolean {
    try {
        const standardPaidPath = path.join(getConfigDir(), 'pollinations-paid-models.json');
        if (fs.existsSync(standardPaidPath)) {
            const paidModels = JSON.parse(fs.readFileSync(standardPaidPath, 'utf-8'));
            return Array.isArray(paidModels) && paidModels.includes(model);
        }
    } catch (e) { log(`[Proxy] Error checking paid models: ${e}`); }
    return false;
}

// --- INTERFACES ---

interface ChatRequest {
    model: string;
    messages: any[];
    stream?: boolean;
    stream_options?: any;
    tools?: any[];
    tools_config?: any; // For Gemini Grounding
    [key: string]: any;
}

const MAX_RETRIES = 1; // v6.5: at most 1 initial request + 1 retry (429 only)
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 600000; // 10 Minutes global timeout

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RETRY POLICY (v6.5) — double-billing safe.
// Invariants:
//   client timeout != upstream failure
//   client abort   != upstream cancellation
//   5xx ambiguous  != guaranteed "not submitted"
// A request that may have been received upstream must NEVER be replayed
// automatically only because the client did not receive a response.
// ============================================================================
type RetrySignal = 'abort' | 'network' | number;

export function classifyRetry(signal: RetrySignal): 'RETRY' | 'NO_RETRY' {
    if (signal === 'abort' || signal === 'network') {
        // Timeout / connection reset after possible submission → NO REPLAY.
        return 'NO_RETRY';
    }
    if (signal === 429) {
        // Rate limit is the only class we retry, conservatively (single
        // retry). Chat streaming is NOT idempotent upstream, so we keep this
        // minimal and never retry ambiguous 5xx/520.
        return 'RETRY';
    }
    // 5xx / 520 / 402 / 4xx: ambiguous or billing-relevant → NO blind replay.
    return 'NO_RETRY';
}

export async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(url, { ...options, signal: controller.signal });
    } catch (error: any) {
        clearTimeout(timeoutId);
        const isAbort = error?.name === 'AbortError' || controller.signal.aborted;
        if (retries > 0 && classifyRetry(isAbort ? 'abort' : 'network') === 'RETRY') {
            log(`[Retry] Network Error: ${error}. Retrying... (${retries} left)`);
            await sleep(RETRY_DELAY_MS);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
    clearTimeout(timeoutId);

    if (response.ok) return response;
    if (response.status === 404 || response.status === 401 || response.status === 400) {
        // Don't retry client errors (except rate limit)
        return response;
    }
    if (retries > 0 && classifyRetry(response.status) === 'RETRY') {
        log(`[Retry] Upstream Error ${response.status}. Retrying in ${RETRY_DELAY_MS}ms... (${retries} left)`);
        await sleep(RETRY_DELAY_MS);
        return fetchWithRetry(url, options, retries - 1);
    }
    return response;
}

// ============================================================================
// REASONING NORMALIZATION (v6.5) — M8/M9
// DeepSeek/Kimi expose `reasoning_content`; Qwen exposes `reasoning` +
// `reasoning_details` (Responses hybrid). These must never leak into OpenCode
// as text. Kimi also emits top-level `tool_calls[].name: null` (canonical is
// `function.name`) and `message.tools: null`.
// Rule: never merge reasoning* into content; strip the backend-specific fields;
//       preserve usage.completion_tokens_details.reasoning_tokens.
// ============================================================================
const REASONING_KEYS = ['reasoning_content', 'reasoning', 'reasoning_details'];

function stripReasoning(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) stripReasoning(item);
        return obj;
    }
    for (const key of REASONING_KEYS) {
        if (key in obj) delete obj[key];
    }
    return obj;
}

function normalizeToolCallShape(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) normalizeToolCallShape(item);
        return obj;
    }
    // Kimi: top-level name === null is a parasite; function.name is canonical.
    if ('name' in obj && obj.name === null) {
        delete obj.name;
    }
    // deepseek/kimi: message.tools === null is a parasite.
    if ('tools' in obj && obj.tools === null) {
        delete obj.tools;
    }
    return obj;
}

function normalizeChatChunk(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) normalizeChatChunk(item);
        return obj;
    }
    const delta = obj.delta;
    if (delta && typeof delta === 'object') {
        stripReasoning(delta);
        if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) normalizeToolCallShape(tc);
        }
    }
    const message = obj.message;
    if (message && typeof message === 'object') {
        stripReasoning(message);
        normalizeToolCallShape(message);
        if (Array.isArray(message.tool_calls)) {
            for (const tc of message.tool_calls) normalizeToolCallShape(tc);
        }
    }
    if (Array.isArray(obj.choices)) {
        for (const ch of obj.choices) normalizeChatChunk(ch);
    }
    return obj;
}

/** Normalize a single raw SSE `data:` payload line (JSON). Non-JSON passes through. */
export function normalizeChunkLine(payload: string): string {
    const trimmed = payload.trim();
    if (!trimmed) return payload;
    try {
        const obj = JSON.parse(trimmed);
        normalizeChatChunk(obj);
        return JSON.stringify(obj);
    } catch {
        return payload; // e.g. [DONE]
    }
}

// --- UNIFIED SSE STREAM PROCESSOR (v6.5) ---
// Buffers SSE blocks (\n\n), normalizes each JSON chunk (reasoning strip +
// Kimi tool_calls name:null), preserves finish_reason/signature semantics,
// applies loop-detection guillotine, and injects the fallback warning.
interface SseStreamOpts {
    isFallbackActive: boolean;
    actualModel: string;
    fallbackReason: string;
}

async function streamSseUpstream(
    res: http.ServerResponse,
    stream: AsyncIterable<Uint8Array>,
    opts: SseStreamOpts
): Promise<string | null> {
    let buffer = '';
    let currentSignature: string | null = null;

    const flushBlock = (block: string) => {
        const lines = block.split('\n');
        const outLines: string[] = [];
        for (const ln of lines) {
            if (ln.startsWith('data:')) {
                const payload = ln.slice(5).trim();
                const normalized = normalizeChunkLine(payload);
                outLines.push(`data: ${normalized}`);
                if (!currentSignature) {
                    const m = normalized.match(/"thought_signature"\s*:\s*"([^"]+)"/);
                    if (m && m[1]) currentSignature = m[1];
                }
            } else {
                outLines.push(ln);
            }
        }
        let out = outLines.join('\n');

        // FIX: STOP REASON NORMALIZATION (kept from v6.4.10)
        if (out.includes('"finish_reason": "tool_calls"') && out.includes('"tool_calls":null')) {
            out = out.replace('"finish_reason": "tool_calls"', '"finish_reason": "stop"');
        }
        if (out.includes('"finish_reason"')) {
            const stopRegex = /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g;
            if (stopRegex.test(out)) {
                if (out.includes('"tool_calls":[') || out.includes('"tool_calls": [')) {
                    out = out.replace(stopRegex, '"finish_reason": "tool_calls"');
                } else {
                    out = out.replace(stopRegex, '"finish_reason": "stop"');
                }
            }
        }

        res.write(out + '\n\n');
    };

    for await (const chunk of stream) {
        buffer += Buffer.from(chunk).toString().replace(/\r\n/g, '\n');

        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            // SAFETY STOP: SERVER-SIDE LOOP DETECTION (GUILLOTINE)
            if (block.includes("User:") || block.includes("\nUser") || block.includes("user:")) {
                if (block.match(/(\n|^)\s*(User|user)\s*:/)) {
                    res.end();
                    return currentSignature;
                }
            }
            flushBlock(block);
        }
    }
    if (buffer.trim()) {
        flushBlock(buffer);
    }

    // INJECT FALLBACK NOTIFICATION AT END
    if (opts.isFallbackActive) {
        const warningMsg = `\n\n> ⚠️ **Safety Net**: ${opts.fallbackReason}. Switched to \`${opts.actualModel}\`.`;
        const safeId = "fallback-" + Date.now();
        const warningChunk = {
            id: safeId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: opts.actualModel,
            choices: [{ index: 0, delta: { role: "assistant", content: warningMsg }, finish_reason: null }]
        };
        res.write(`data: ${JSON.stringify(warningChunk)}\n\n`);
    }

    return currentSignature;
}

// --- MEDIA UPLOAD HELPER (Vision Support) ---
// Uploads a base64 data URL to media.pollinations.ai and returns a public URL.
// This is needed because gen.pollinations.ai does not support OpenAI multimodal format
// but auto-detects image URLs in plain text.
async function uploadToPollinationsMedia(dataUrl: string, authHeader?: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch('https://media.pollinations.ai/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { 'Authorization': authHeader } : {}),
            },
            body: JSON.stringify({ data: dataUrl }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${errText.substring(0, 100)}`);
        }

        const json = await res.json() as { url?: string; id?: string };
        if (json.url) return json.url;
        if (json.id) return `https://media.pollinations.ai/${json.id}`;
        throw new Error('No URL in response');
    } finally {
        clearTimeout(timeout);
    }
}

// --- MAIN HANDLER ---

export async function handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse, bodyRaw: string) {
    let targetUrl = '';
    let authHeader: string | undefined = undefined;

    try {
        const body: ChatRequest = JSON.parse(bodyRaw);
        const config = loadConfig();

        log(`[Proxy Request] Mode: ${config.mode}, HasKey: ${!!config.apiKey}`);

        // 0. COMMAND HANDLING
        if (body.messages && body.messages.length > 0) {
            const lastMsg = body.messages[body.messages.length - 1];
            if (lastMsg.role === 'user') {
                let text = "";
                if (typeof lastMsg.content === 'string') {
                    text = lastMsg.content;
                } else if (Array.isArray(lastMsg.content)) {
                    // Handle Multimodal [{type:'text', text:'...'}]
                    text = lastMsg.content
                        .map((c: any) => c.text || c.content || "")
                        .join("");
                }
                text = text.trim();

                log(`[Command Check] Extracted: "${text.substring(0, 50)}..." from type: ${typeof lastMsg.content}`);
                if (text.startsWith('/pollinations') || text.startsWith('/poll')) {
                    log(`[Command] Intercepting: ${text}`);
                    const cmdResult = await handleCommand(text);
                    if (cmdResult.handled) {
                        if (true) { // ALWAYS MOCK STREAM for Compatibility
                            res.writeHead(200, {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive'
                            });

                            const content = cmdResult.response || cmdResult.error || "Commande exécutée.";
                            const id = "pollinations-cmd-" + Date.now();
                            const created = Math.floor(Date.now() / 1000);

                            // Mock Chunk 1: Content
                            const chunk1 = {
                                id, object: "chat.completion.chunk", created, model: body.model,
                                choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }]
                            };
                            res.write(`data: ${JSON.stringify(chunk1)}\n\n`);

                            // Mock Chunk 2: Stop
                            const chunk2 = {
                                id, object: "chat.completion.chunk", created, model: body.model,
                                choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
                            };
                            res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
                            res.write("data: [DONE]\n\n");

                            res.end();
                            return; // SHORT CIRCUIT
                        }
                    }
                }
            }
        }

        log(`Incoming Model (OpenCode ID): ${body.model}`);

        // 0. SPECIAL: pollinations/connect (Guide & Status)
        const CONNECT_MODEL_IDS = ['pollinations/connect', 'free/pollinations/connect', 'enter/pollinations/connect', 'connect-pollinations'];
        if (CONNECT_MODEL_IDS.includes(body.model)) {
            const guideContent = await buildConnectResponse(config);

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const chunk = JSON.stringify({
                id: 'connect-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'pollinations/connect',
                choices: [{
                    index: 0,
                    delta: { role: 'assistant', content: guideContent },
                    finish_reason: 'stop' // Instant finish
                }]
            });

            res.write(`data: ${chunk}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        // 1. STRICT ROUTING & SAFETY NET LOGIC (V5)
        let actualModel = body.model || "openai";
        let isEnterprise = false;
        let isFallbackActive = false;
        let fallbackReason = "";

        // LOAD QUOTA FOR SAFETY CHECKS
        const { getQuotaStatus, formatQuotaForToast } = await import('./quota.js');
        const quota = await getQuotaStatus(false);

        // A. Resolve Base Target
        if (actualModel.startsWith('enter/')) {
            isEnterprise = true;
            actualModel = actualModel.replace('enter/', '');
        } else if (actualModel.startsWith('free/')) {
            isEnterprise = false;
            actualModel = actualModel.replace('free/', '');
        }

        // A.1 PAID-ONLY MODEL RESOLUTION (v6.5)
        // Paid-only models always debit pack (upstream contract). The dynamic
        // list is saved by generate-config.ts from the live catalog.
        const paidOnlyRequested = isEnterprise && isPaidOnlyModel(actualModel);

        // QUEST_ELIGIBLE_ONLY: hard-block paid_only models (no paid route).
        if (paidOnlyRequested && config.mode === 'quest_only') {
            log(`[QuestOnly] BLOCKED: Paid Only Model (${actualModel}).`);
            emitStatusToast('warning', t('proxy.warnings.paid_blocked_questonly_title', { model: actualModel }), 'Quest-Only Mode');

            const blockMsg = {
                id: `chatcmpl-block-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: actualModel,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: t('proxy.warnings.paid_blocked_questonly_msg', { model: actualModel })
                    },
                    finish_reason: 'stop'
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(blockMsg));
            return;
        }

        // Other modes: paid_only requires wallet (pack). If the wallet is
        // empty, fall back to the free universe gracefully instead of a 402.
        if (paidOnlyRequested && quota.walletBalance <= 0.001) { // Floating point safety
            log(`[SafetyNet] Paid Only Model (${actualModel}) requested but Wallet is Empty ($${quota.walletBalance}). Falling back to free.`);
            actualModel = config.fallbacks.free.main.replace('free/', '');
            isEnterprise = false;
            isFallbackActive = true;
            fallbackReason = "Paid Only Model requires purchased credits";
        }

        // B. SAFETY NETS (v6.5 — Quest/Paid semantics)

        // 0. GLOBAL CHECK: Auth Limited (403 on Quota)
        // If we can't read quota because of 403, we downgrade to Manual but ALLOW the request.
        if (isEnterprise && quota.errorType === 'auth_limited') {
            // Only warn/switch if we were trying to be smart (Auto Mode)
            if (config.mode !== 'manual') {
                log(`[SafetyNet] Limited Key Detected (403). Downgrading to Manual Mode.`);
                saveConfig({ mode: 'manual', keyHasAccessToProfile: false });
                config.mode = 'manual'; // Local override to skip safety nets below

                emitStatusToast('warning', 'Clé Limitée: Passage en Mode Manuel', 'Permissions (403)');
            }
        }

        const quotaReadable = quota.errorType !== 'network' && quota.errorType !== 'unknown';

        if (config.mode === 'quest') {
            // QUEST_PREFERRED: Quest first (server default), Paid fallback is
            // allowed upstream. Client net only falls back to the free
            // universe when the quota read failed, or when BOTH Quest and
            // Paid look exhausted.
            if (isEnterprise && !isFallbackActive) {
                if (!quotaReadable) {
                    log(`[SafetyNet] Quest Mode: Quota Check Failed. Switching to Free Fallback.`);
                    emitStatusToast('warning', t('proxy.warnings.quota_unreachable_title'), 'Quest Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.quota_unreachable_msg');
                } else if (!quota.canUseEnterprise) {
                    log(`[SafetyNet] Quest Mode: Quest (~${quota.questBalance}) and Paid (~${quota.walletBalance}) exhausted. Switching.`);
                    emitStatusToast('warning', t('proxy.warnings.balance_exhausted_title'), 'Quest Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.balance_exhausted_msg');
                }
            }
        }
        else if (config.mode === 'quest_only') {
            // QUEST_ELIGIBLE_ONLY: best-effort client guard. Never send an
            // enterprise request when Quest looks exhausted. NOTE: upstream
            // can still debit pack in a race/real-cost — documented, not a
            // server guarantee.
            if (isEnterprise && !isFallbackActive) {
                if (!quotaReadable) {
                    log(`[SafetyNet] Quest-Only Mode: Quota Check Failed. Switching to Free Fallback.`);
                    emitStatusToast('warning', t('proxy.warnings.quota_unreachable_title'), 'Quest-Only Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.quota_unreachable_msg');
                } else if (quota.questBalance <= (config.thresholds.quest ?? 0.05)) {
                    log(`[SafetyNet] Quest-Only Mode: Quest (~${quota.questBalance}) <= floor (${config.thresholds.quest ?? 0.05}). Switching.`);
                    emitStatusToast('warning', t('proxy.warnings.quest_floor_title', { floor: config.thresholds.quest ?? 0.05 }), 'Quest-Only Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.quest_floor_msg', { floor: config.thresholds.quest ?? 0.05 });
                }
            }
        }
        else if (config.mode === 'paid') {
            // PAID_ALLOWED: protect the wallet (like the old "pro" net).
            if (isEnterprise && !isFallbackActive) {
                if (!quotaReadable) {
                    log(`[SafetyNet] Paid Mode: Quota Unreachable. Switching to Free Fallback.`);
                    emitStatusToast('warning', t('proxy.warnings.quota_unreachable_title'), 'Paid Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.quota_unreachable_msg');
                } else if (quota.walletBalance < (config.thresholds.wallet || 0.5)) {
                    log(`[SafetyNet] Paid Mode: Wallet (~${quota.walletBalance}) < floor (${config.thresholds.wallet || 0.5}). Switching.`);
                    emitStatusToast('warning', t('proxy.warnings.wallet_limit_title', { wallet: config.thresholds.wallet || 0.5 }), 'Paid Mode');
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = t('proxy.warnings.wallet_limit_msg', { threshold: config.thresholds.wallet || 0.5 });
                }
            }
        }

        // C. Construct URL & Headers
        if (isEnterprise) {
            if (!config.apiKey) {
                emitLogToast('error', "Missing API Key for Enterprise Model", 'Proxy Error');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: "API Key required for Enterprise models." } }));
                return;
            }
            targetUrl = 'https://gen.pollinations.ai/v1/chat/completions';
            authHeader = `Bearer ${config.apiKey}`;
            log(`Routing to ENTERPRISE: ${actualModel}`);
        } else {
            targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
            authHeader = undefined;
            log(`Routing to FREE: ${actualModel} ${isFallbackActive ? '(FALLBACK)' : ''}`);
            // emitLogToast('info', `Routing to: FREE UNIVERSE (${actualModel})`, 'Pollinations Routing'); // Too noisy
        }

        // NOTIFY SWITCH
        if (isFallbackActive) {
            emitStatusToast('warning', `⚠️ Safety Net: ${actualModel} (${fallbackReason})`, 'Pollinations Safety');
        }

        // 2. Prepare Proxy Body
        const proxyBody: any = {
            ...body,
            model: actualModel
        };

        // === SECTION 2.1 — MULTIMODAL PASSTHROUGH ===
        // The native OpenAI multimodal format [{type:"image_url",...}] is passed through as-is.
        // Bug: Pollinations issue #8705 (opened 2026-03-01) — server does String(content)
        // on array content, breaking vision. When fixed server-side, vision will work natively.
        // The uploadToPollinationsMedia() helper is kept in stand-by for future fallback use.
        // No transformation is applied — we send what OpenCode gives us.

        // 3. Global Hygiene
        if (!isEnterprise && !proxyBody.seed) {
            proxyBody.seed = Math.floor(Math.random() * 1000000);
        }
        if (isEnterprise) proxyBody.private = true;
        if (proxyBody.stream_options) delete proxyBody.stream_options;

        // 3.6 STOP SEQUENCES (-REMOVED-)
        // We do NOT inject 'stop' automatically anymore.
        // Azure OpenAI strictly rejects 'stop' for many models (o1, etc) and throws 400.
        // We rely on the upstream model to handle stops, or the client to send it if needed.


        // 3.5 PREPARE SIGNATURE HASHING
        let currentRequestHash: string | null = null;
        if (proxyBody.messages && proxyBody.messages.length > 0) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];
            currentRequestHash = hashMessage(lastMsg);
        }

        // =========================================================
        // LOGIC BLOCK: MODEL SPECIFIC ADAPTATIONS
        // =========================================================

        if (proxyBody.tools && Array.isArray(proxyBody.tools) && proxyBody.tools.length > 0) {

            // B0. KIMI / MOONSHOT SURGICAL FIX
            if (actualModel.includes("kimi") || actualModel.includes("moonshot")) {
                log(`[Proxy] Kimi: Tools ENABLED. Applying penalties/stops/sanitization.`);
                proxyBody.frequency_penalty = 1.1;
                proxyBody.presence_penalty = 0.4;
                proxyBody.stop = ["<|endoftext|>", "User:", "\nUser", "User :"];

                // KIMI FIX: Remove 'title' from schema
                proxyBody.tools = proxyBody.tools.map((t: any) => {
                    if (t.function && t.function.parameters) {
                        t.function.parameters = sanitizeSchemaForKimi(t.function.parameters);
                    }
                    return t;
                });
            }

            // A. AZURE/OPENAI FIXES + MIDJOURNEY + GROK
            if (actualModel.includes("gpt") || actualModel.includes("openai") || actualModel.includes("azure") || actualModel.includes("midijourney") || actualModel.includes("grok")) {
                const limit = (actualModel.includes("midijourney") || actualModel.includes("grok")) ? 128 : 120;
                proxyBody.tools = truncateTools(proxyBody.tools, limit);

                if (proxyBody.reasoning_effort) delete proxyBody.reasoning_effort;
                if (proxyBody.reasoningEffort) delete proxyBody.reasoningEffort;

                if (proxyBody.messages) {
                    proxyBody.messages.forEach((m: any) => {
                        if (m.tool_calls) {
                            m.tool_calls.forEach((tc: any) => {
                                if (tc.id && tc.id.length > 40) tc.id = tc.id.substring(0, 40);
                            });
                        }
                        if (m.tool_call_id && m.tool_call_id.length > 40) {
                            m.tool_call_id = m.tool_call_id.substring(0, 40);
                        }
                    });
                }
            }

            // BEDROCK FIX (Claude / Nova / ChickyTutor)
            if (actualModel.includes("claude") || actualModel.includes("nova") || actualModel.includes("bedrock") || actualModel.includes("chickytutor")) {
                log(`[Proxy] Bedrock: Sanitizing tools description.`);
                proxyBody.tools = sanitizeToolsForBedrock(proxyBody.tools);
            }

            // B1. NOMNOM SPECIAL (Disable Grounding, KEEP Search Tool)
            if (actualModel === "nomnom") {
                proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                // Keep Tools, Just Sanitize
                proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools || []);
                log(`[Proxy] Nomnom Fix: Grounding Disabled, Search Tool KEPT.`);
            }
            // B. GEMINI UNIFIED FIX (Free, Fast, Pro, Enterprise, Legacy)
            else if (actualModel.includes("gemini")) {
                let hasFunctions = false;
                if (proxyBody.tools && Array.isArray(proxyBody.tools)) {
                    hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                }

                if (hasFunctions) {
                    // 1. Strict cleanup of 'google_search' tool
                    proxyBody.tools = proxyBody.tools.filter((t: any) => {
                        const isFunc = t.type === 'function' || t.function;
                        const name = t.function?.name || t.name;
                        return isFunc && name !== 'google_search';
                    });




                    // 2. Sanitize & RESTORE GROUNDING CONFIG (Essential for Vertex Auth)
                    if (proxyBody.tools.length > 0) {
                        if (hasFunctions) {
                            proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);

                            // ONLY for Free/Vertex: Add tools_config to disable search grounding (required for free tier).
                            // For Enterprise, adding this causes 403 Forbidden on some keys.
                            if (!isEnterprise) {
                                proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                            }
                        }
                    } else {
                        // 3. If no tools left (or only search was present), DELETE 'tools' entirely
                        delete proxyBody.tools;
                        if (proxyBody.tools_config) delete proxyBody.tools_config;
                    }
                }

                // 4. STOP SEQUENCES REMOVED (Validation Fix v5.4.0/1)
                // Do NOT inject stop sequences (User:/Model:) as they cause "JSON body validation failed".

                log(`[Proxy] Gemini Logic: Tools=${proxyBody.tools ? proxyBody.tools.length : 'REMOVED'}, Stops NOT Injected.`);
            }
        }

        // C. GEMINI ID BACKTRACKING & SIGNATURE
        if ((actualModel.includes("gemini") || actualModel === "nomnom") && proxyBody.messages) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];

            proxyBody.messages.forEach((m: any, index: number) => {
                if (m.role === 'assistant') {
                    let sig = null;
                    if (index > 0) {
                        const prevMsg = proxyBody.messages[index - 1];
                        const prevHash = hashMessage(prevMsg);
                        sig = signatureMap[prevHash];
                    }
                    if (!sig) sig = lastSignature;
                    if (sig) {
                        if (!m.thought_signature) m.thought_signature = sig;
                        if (m.tool_calls) {
                            m.tool_calls.forEach((tc: any) => {
                                if (!tc.thought_signature) tc.thought_signature = sig;
                                if (tc.function && !tc.function.thought_signature) tc.function.thought_signature = sig;
                            });
                        }
                    }
                } else if (m.role === 'tool') {
                    let sig = null;
                    if (index > 0) sig = lastSignature; // Fallback
                    if (sig && !m.thought_signature) {
                        m.thought_signature = sig;
                    }
                }
            });

            // Fix Tool Response ID
            if (lastMsg.role === 'tool') {
                let targetAssistantMsg: any = null;
                for (let i = proxyBody.messages.length - 2; i >= 0; i--) {
                    const m = proxyBody.messages[i];
                    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
                        targetAssistantMsg = m;
                        break;
                    }
                }
                if (targetAssistantMsg) {
                    const originalId = targetAssistantMsg.tool_calls[0].id;
                    const currentId = lastMsg.tool_call_id;
                    if (currentId !== originalId) {
                        lastMsg.tool_call_id = originalId;
                    }
                }
            }
        }

        // 4. Headers
        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'User-Agent': 'curl/8.5.0'
        };
        if (authHeader) headers['Authorization'] = authHeader;

        // 5. Forward (Global Fetch with Retry)
        const fetchRes = await fetchWithRetry(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(proxyBody)
        });

        res.statusCode = fetchRes.status;
        fetchRes.headers.forEach((val, key) => {
            if (key !== 'content-encoding' && key !== 'content-length') {
                res.setHeader(key, val);
            }
        });

        if (!fetchRes.ok) {
            log(`Upstream Error: ${fetchRes.status} ${fetchRes.statusText}`);

            // TRANSPARENT FALLBACK LOGIC
            // 1. Enterprise Safety Net (Quota/Auth/RateLimit)
            // 2. Gemini Tools Fix (Gemini + Tools -> 401 -> Fallback to OpenAI)
            const isEnterpriseFallback = (fetchRes.status === 402 || fetchRes.status === 429 || fetchRes.status === 502 || fetchRes.status === 401 || fetchRes.status === 403) && isEnterprise;
            const isGeminiToolsFallback = fetchRes.status === 401 && actualModel.includes('gemini') && !isEnterprise && proxyBody.tools && proxyBody.tools.length > 0;

            // STRICT MANUAL MODE: Disable "Magic" Fallbacks
            if ((isEnterpriseFallback || isGeminiToolsFallback) && config.mode !== 'manual') {
                log(`[SafetyNet] Upstream Rejection (${fetchRes.status}). Triggering Transparent Fallback.`);

                if (isEnterpriseFallback) {
                    // 1a. Enterprise -> Free Fallback
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;

                    if (fetchRes.status === 402) {
                        fallbackReason = "Insufficient Funds (Upstream 402)";
                        // Force refresh quota cache so next pre-flight check is accurate
                        try { await getQuotaStatus(true); } catch (e) { log(`[Proxy Quota] Silent refresh error: ${e}`); }
                    }
                    else if (fetchRes.status === 429) fallbackReason = "Rate Limit (Upstream 429)";
                    else if (fetchRes.status === 401) fallbackReason = "Invalid API Key (Upstream 401)";
                    else fallbackReason = `Access Denied (${fetchRes.status})`;
                } else {
                    // 1b. Gemini Tools -> OpenAI Fallback
                    log(`[Fix] Gemini Tools 401 detected. Falling back to 'openai' model.`);
                    actualModel = 'openai'; // Assume gpt-4o-mini or similar capable of tools
                    isFallbackActive = true;
                    fallbackReason = "Gemini Tools Auth Failed (Fallback to OpenAI)";
                }

                // 2. Notify
                emitStatusToast('warning', `⚠️ Safety Net: ${actualModel} (${fallbackReason})`, 'Pollinations Safety');
                emitLogToast('warning', `Recovering from ${fetchRes.status} -> Switching to ${actualModel}`, 'Safety Net');

                // 3. Re-Prepare Request
                targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
                const retryHeaders = { ...headers };
                delete retryHeaders['Authorization']; // Free = No Auth

                const retryBody = { ...proxyBody, model: actualModel };

                // 4. Retry Fetch
                const retryRes = await fetchWithRetry(targetUrl, {
                    method: 'POST',
                    headers: retryHeaders,
                    body: JSON.stringify(retryBody)
                });

                if (retryRes.ok) {
                    res.statusCode = retryRes.status;
                    // Overwrite response with retry
                    // We need to handle the stream of retryRes now.
                    // The easiest way is to assign fetchRes = retryRes, BUT fetchRes is const.
                    // Refactor needed? No, I can just stream retryRes here and return.

                    retryRes.headers.forEach((val, key) => {
                        if (key !== 'content-encoding' && key !== 'content-length') {
                            res.setHeader(key, val);
                        }
                    });

                    if (retryRes.body) {
                        // @ts-ignore
                        const sig = await streamSseUpstream(res, retryRes.body, {
                            isFallbackActive: true,
                            actualModel,
                            fallbackReason
                        });
                        if (sig && currentRequestHash) {
                            signatureMap[currentRequestHash] = sig;
                            saveSignatureMap();
                            lastSignature = sig;
                        }

                        // DASHBOARD UPDATE
                        const dashboardMsg = formatQuotaForToast(quota); // Quota is stale/empty but that's fine
                        const fullMsg = `${dashboardMsg} | ⚙️ PRO (FALLBACK)`;
                        emitStatusToast('info', fullMsg, 'Pollinations Status');

                        res.end();
                        return; // EXIT FUNCTION, HANDLED.
                    }
                }
            }
        }

        // Stream Loop — unified SSE processor (reasoning strip + Kimi normalization)
        if (fetchRes.body) {
            // @ts-ignore
            const currentSignature = await streamSseUpstream(res, fetchRes.body, {
                isFallbackActive,
                actualModel,
                fallbackReason
            });

            // END STREAM: SAVE MAP & EMIT TOAST
            if (currentSignature && currentRequestHash) {
                signatureMap[currentRequestHash] = currentSignature;
                saveSignatureMap();
                lastSignature = currentSignature;
            }

            // V5 DASHBOARD TOAST
            const dashboardMsg = formatQuotaForToast(quota);
            let modeLabel = config.mode.toUpperCase();
            if (isFallbackActive) modeLabel += " (FALLBACK)";

            const fullMsg = `${dashboardMsg} | ⚙️ ${modeLabel}`;

            // Only emit if not silenced AND only for Enterprise/Paid requests
            if (isEnterprise) {
                emitStatusToast('info', fullMsg, 'Pollinations Status');
            }
        }

        res.end();

    } catch (e) {
        log(`ERROR: Proxy Handler Error: ${String(e)}`);
        if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Internal Proxy Error", details: String(e) }));
        }
    }
}
