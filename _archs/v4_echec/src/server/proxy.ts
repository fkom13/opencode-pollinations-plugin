
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config.js';

// --- PERSISTENCE: SIGNATURE MAP (Multi-Round Support) ---
const SIG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/pollinations-signature.json');
let signatureMap: Record<string, string> = {};
let lastSignature: string | null = null; // V1 Fallback Global

function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        if (!fs.existsSync('/tmp/opencode_pollinations_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', `[Proxy] ${ts} ${msg}\n`);
    } catch (e) { }
}

try {
    if (fs.existsSync(SIG_FILE)) {
        signatureMap = JSON.parse(fs.readFileSync(SIG_FILE, 'utf-8'));
    }
} catch (e) { }

function saveSignatureMap() {
    try {
        if (!fs.existsSync(path.dirname(SIG_FILE))) fs.mkdirSync(path.dirname(SIG_FILE), { recursive: true });
        fs.writeFileSync(SIG_FILE, JSON.stringify(signatureMap, null, 2));
    } catch (e) { log(`ERROR: Error mapping signature: ${String(e)}`); }
}

// RECURSIVE NORMALIZER for Stable Hashing
// Handles arrays, objects (like tool_calls), and strings consistently.
function normalizeContent(c: any): string {
    if (!c) return "";
    if (typeof c === 'string') return c.replace(/\s+/g, ''); // Standard String
    if (Array.isArray(c)) return c.map(normalizeContent).join(''); // Recurse Array
    if (typeof c === 'object') {
        // Sort keys for deterministic JSON (tool_calls order)
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

// --- SANITIZATION HELPERS (V1 + V3 Hybrid) ---

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
    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = dereferenceSchema(schema.properties[key], rootDefs);
        }
    }
    if (schema.items) {
        schema.items = dereferenceSchema(schema.items, rootDefs);
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

function truncateTools(tools: any[], limit: number = 120): any[] {
    if (!tools || tools.length <= limit) return tools;
    return tools.slice(0, limit);
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

// --- MAIN HANDLER ---

export async function handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse, bodyRaw: string) {
    let targetUrl = '';
    let authHeader: string | undefined = undefined;

    // DEBUG LOG ENTRY
    log(`[Proxy] Request: ${req.url} Method: ${req.method} BodySize: ${bodyRaw.length}`);

    try {
        const body: ChatRequest = JSON.parse(bodyRaw);
        const config = loadConfig();

        log(`Incoming Model (OpenCode ID): ${body.model}`);

        // --- V4 SMART MODES LOGIC ---
        let actualModel = body.model || "openai";
        let isEnterprise = false;
        let fallbackReason: string | null = null;

        // Determine effective mode
        const mode = config.mode || 'manual';
        const hasKey = !!config.apiKey && config.apiKey.length > 5;

        // Perform Usage Check if Smart Mode enabled
        if (hasKey && (mode === 'alwaysfree' || mode === 'pro')) {
            try {
                const { getUserUsage } = await import('./usage-manager.js');
                const usage = await getUserUsage(config.apiKey!);
                log(`[Analysis] Mode=${mode} TierRemaining=${usage.usage.tierRemaining.toFixed(2)}`);

                if (mode === 'alwaysfree') {
                    if (usage.usage.tierRemaining <= 0.05) {
                        log(`[Logic] AlwaysFree: Tier exhausted. FALLBACK to Free Model.`);
                        fallbackReason = "Quota Free épuisé.";
                        actualModel = config.fallback_models?.[0] || 'pollinations/free/mistral';
                        if (!actualModel.startsWith('pollinations/free/')) actualModel = `pollinations/free/${actualModel}`;
                    }
                } else if (mode === 'pro') {
                    if (usage.usage.tierRemaining <= 0.05 && usage.walletBalance <= 0.05) {
                        log(`[Logic] Pro: All Budgets exhausted. FALLBACK to Free Model.`);
                        fallbackReason = "Budget épuisé.";
                        actualModel = config.fallback_models?.[0] || 'pollinations/free/mistral';
                        if (!actualModel.startsWith('pollinations/free/')) actualModel = `pollinations/free/${actualModel}`;
                    }
                }
            } catch (err) {
                log(`[LogicWarning] Failed to check usage: ${err}.`);
            }
        }

        // Standard Routing
        if (actualModel.startsWith('pollinations/enter/')) {
            if (!hasKey) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: "API Key required for Enterprise models." } }));
                return;
            }
            targetUrl = 'https://gen.pollinations.ai/v1/chat/completions';
            authHeader = `Bearer ${config.apiKey}`;
            actualModel = actualModel.replace('pollinations/enter/', '');
            isEnterprise = true;
            log(`Routing to ENTERPRISE: ${actualModel}`);
        } else if (actualModel.startsWith('pollinations/free/')) {
            // FREE -> text.pollinations.ai/openai/chat/completions
            targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
            authHeader = undefined;
            actualModel = actualModel.replace('pollinations/free/', '');
            log(`Routing to FREE: ${actualModel}`);
        } else {
            // Default -> Free
            targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
            authHeader = undefined;
            log(`Routing to DEFAULT (Free): ${actualModel}`);
        }

        // 2. Prepare Proxy Body
        const proxyBody: any = {
            ...body,
            model: actualModel
        };

        // 3. Global Hygiene
        if (!isEnterprise && !proxyBody.seed) {
            proxyBody.seed = Math.floor(Math.random() * 1000000);
        }
        if (isEnterprise) proxyBody.private = true;
        if (proxyBody.stream_options) delete proxyBody.stream_options;

        // 3.5 Signature Hashing (Gemini Fix)
        let currentRequestHash: string | null = null;
        if (proxyBody.messages && proxyBody.messages.length > 0) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];
            currentRequestHash = hashMessage(lastMsg);
        }

        // Logic Block: Tools, Truncation, Gemini Grounding (Omitted for brevity, logic maintained from previous versions)
        if (proxyBody.tools && Array.isArray(proxyBody.tools)) {
            if (actualModel.includes("gpt") || actualModel.includes("openai") || actualModel.includes("azure")) {
                proxyBody.tools = truncateTools(proxyBody.tools, 120);
                if (proxyBody.messages) {
                    proxyBody.messages.forEach((m: any) => {
                        if (m.tool_calls) { m.tool_calls.forEach((tc: any) => { if (tc.id?.length > 40) tc.id = tc.id.substring(0, 40); }); }
                        if (m.tool_call_id?.length > 40) m.tool_call_id = m.tool_call_id.substring(0, 40);
                    });
                }
            }
            if (actualModel === "nomnom" || (actualModel.includes("gemini") && !isEnterprise)) {
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                if (hasFunctions) {
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                    proxyBody.tools = proxyBody.tools.filter((t: any) => {
                        const name = t.function?.name || t.name;
                        return (t.type === 'function' || t.function) && name !== 'google_search';
                    });
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
                }
            } else if (actualModel.includes("gemini")) {
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                if (hasFunctions) {
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
                }
            }
        }

        // Gemini ID Fixes
        if (actualModel.includes("gemini") && proxyBody.messages) {
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
                        if (m.tool_calls) { m.tool_calls.forEach((tc: any) => { if (!tc.thought_signature) tc.thought_signature = sig; }); }
                    }
                }
            });
            if (lastMsg.role === 'tool') {
                let targetAssistantMsg: any = null;
                for (let i = proxyBody.messages.length - 2; i >= 0; i--) {
                    if (proxyBody.messages[i].role === 'assistant' && proxyBody.messages[i].tool_calls) { targetAssistantMsg = proxyBody.messages[i]; break; }
                }
                if (targetAssistantMsg) {
                    const originalId = targetAssistantMsg.tool_calls[0].id;
                    if (lastMsg.tool_call_id !== originalId) lastMsg.tool_call_id = originalId;
                }
            }
        }

        // 4. Headers & Forward
        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'User-Agent': 'curl/8.5.0'
        };
        if (authHeader) headers['Authorization'] = authHeader;

        const fetchRes = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(proxyBody)
        });

        log(`[Proxy] Upstream Response: ${fetchRes.status} ${fetchRes.statusText}`);

        res.statusCode = fetchRes.status;
        if (fetchRes.status === 404) {
            const errText = await fetchRes.text();
            log(`[Proxy] 404 Details: ${errText.slice(0, 200)}`);
            res.end("Not Found: " + fetchRes.statusText);
            return;
        }

        fetchRes.headers.forEach((val, key) => {
            if (key !== 'content-encoding' && key !== 'content-length') {
                res.setHeader(key, val);
            }
        });

        if (fetchRes.body) {
            let accumulated = "";
            let currentSignature: string | null = null;
            // @ts-ignore
            for await (const chunk of fetchRes.body) {
                const buffer = Buffer.from(chunk);
                let chunkStr = buffer.toString();
                // FIX STOP REASON
                if (chunkStr.includes('"finish_reason"')) {
                    const stopRegex = /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g;
                    if (stopRegex.test(chunkStr)) {
                        chunkStr = chunkStr.replace(stopRegex, chunkStr.includes('"tool_calls"') ? '"finish_reason": "tool_calls"' : '"finish_reason": "stop"');
                    }
                }
                // SIGNATURE CAPTURE
                if (!currentSignature) {
                    const match = chunkStr.match(/"thought_signature"\s*:\s*"([^"]+)"/);
                    if (match) currentSignature = match[1];
                }
                res.write(chunkStr);
            }
            if (currentSignature && currentRequestHash) {
                signatureMap[currentRequestHash] = currentSignature;
                saveSignatureMap();
                lastSignature = currentSignature;
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
