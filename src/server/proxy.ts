import * as http from 'http'; // V4.2 Snapshot Force
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config.js';
import { handleCommand } from './commands.js';
import { emitStatusToast, emitLogToast } from './toast.js';

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

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<Response> {
    try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status === 404 || response.status === 401 || response.status === 400) {
            // Don't retry client errors (except rate limit)
            return response;
        }
        if (retries > 0 && (response.status === 429 || response.status >= 500 || response.status === 520)) {
            // Check for specific "Queue" message in 520/429 body if possible (async read?)
            // For now, just retry blindly on 520/5xx
            log(`[Retry] Upstream Error ${response.status}. Retrying in ${RETRY_DELAY_MS}ms... (${retries} left)`);
            await sleep(RETRY_DELAY_MS);
            return fetchWithRetry(url, options, retries - 1);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            log(`[Retry] Network Error: ${error}. Retrying... (${retries} left)`);
            await sleep(RETRY_DELAY_MS);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// --- MAIN HANDLER ---

export async function handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse, bodyRaw: string) {
    let targetUrl = '';
    let authHeader: string | undefined = undefined;

    try {
        const body: ChatRequest = JSON.parse(bodyRaw);
        const config = loadConfig();

        // DEBUG: Trace Config State for Hot Reload verification
        log(`[Proxy Request] Config Loaded. Mode: ${config.mode}, HasKey: ${!!config.apiKey}, KeyLength: ${config.apiKey ? config.apiKey.length : 0}`);

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

        // B. SAFETY NETS (The Core V5 Logic)
        if (config.mode === 'alwaysfree') {
            if (isEnterprise) {
                if (quota.tier === 'error') {
                    log(`[SafetyNet] AlwaysFree Mode: Quota Check Failed. Switching to Free Fallback.`);
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = "Quota Unreachable (Safety)";
                } else {
                    const tierRatio = quota.tierLimit > 0 ? (quota.tierRemaining / quota.tierLimit) : 0;
                    if (tierRatio <= (config.thresholds.tier / 100)) {
                        log(`[SafetyNet] AlwaysFree Mode: Tier (${(tierRatio * 100).toFixed(1)}%) <= Threshold (${config.thresholds.tier}%). Switching.`);
                        actualModel = config.fallbacks.free.main.replace('free/', '');
                        isEnterprise = false;
                        isFallbackActive = true;
                        fallbackReason = `Daily Tier < ${config.thresholds.tier}% (Wallet Protected)`;
                    }
                }
            }
        }
        else if (config.mode === 'pro') {
            if (isEnterprise) {
                if (quota.tier === 'error') {
                    log(`[SafetyNet] Pro Mode: Quota Unreachable. Switching to Free Fallback.`);
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = "Quota Unreachable (Safety)";
                } else {
                    const tierRatio = quota.tierLimit > 0 ? (quota.tierRemaining / quota.tierLimit) : 0;

                    // Logic: Fallback if Wallet is Low (< Threshold) AND Tier is Exhausted (< Threshold %)
                    // Wait, user wants priority to Free Tier.
                    // If Free Tier is available (Ratio > Threshold), we usage it (don't fallback).
                    // If Free Tier is exhausted (Ratio <= Threshold), THEN check Wallet.
                    // If Wallet also Low, THEN Fallback.

                    if (quota.walletBalance < config.thresholds.wallet && tierRatio <= (config.thresholds.tier / 100)) {
                        log(`[SafetyNet] Pro Mode: Wallet < $${config.thresholds.wallet} AND Tier < ${config.thresholds.tier}%. Switching.`);
                        actualModel = config.fallbacks.free.main.replace('free/', '');
                        isEnterprise = false;
                        isFallbackActive = true;
                        fallbackReason = `Wallet & Tier Critical`;
                    }
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

            // B0. KIMI / MOONSHOT SURGICAL FIX (Restored for Debug)
            // Tools are ENABLED. We rely on penalties and strict stops to fight loops.
            if (actualModel.includes("kimi") || actualModel.includes("moonshot")) {
                log(`[Proxy] Kimi: Tools ENABLED. Applying penalties/stops.`);
                proxyBody.frequency_penalty = 1.1;
                proxyBody.presence_penalty = 0.4;
                proxyBody.stop = ["<|endoftext|>", "User:", "\nUser", "User :"];
            }

            // A. AZURE/OPENAI FIXES
            if (actualModel.includes("gpt") || actualModel.includes("openai") || actualModel.includes("azure")) {
                proxyBody.tools = truncateTools(proxyBody.tools, 120);

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

            // B1. NOMNOM SPECIAL (Disable Grounding, KEEP Search Tool)
            if (actualModel === "nomnom") {
                proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                // Keep Tools, Just Sanitize
                proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools || []);
                log(`[Proxy] Nomnom Fix: Grounding Disabled, Search Tool KEPT.`);
            }
            // B2. GEMINI FREE / FAST (CRASH FIX: STRICT SANITIZATION)
            // Restore Tools but REMOVE conflicting ones (Search)
            // B. GEMINI UNIFIED FIX (Free, Fast, Pro, Enterprise, Legacy)
            // Handles: "tools" vs "grounding" conflicts, and "infinite loops" via Stop Sequences.
            // B. GEMINI UNIFIED FIX (Free, Fast, Pro, Enterprise, Legacy)
            // Fixes "Multiple tools" error (Vertex) and "JSON body validation failed" (v5.3.5 regression)
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
            const isEnterpriseFallback = (fetchRes.status === 402 || fetchRes.status === 429 || fetchRes.status === 401 || fetchRes.status === 403) && isEnterprise;
            const isGeminiToolsFallback = fetchRes.status === 401 && actualModel.includes('gemini') && !isEnterprise && proxyBody.tools && proxyBody.tools.length > 0;

            // STRICT MANUAL MODE: Disable "Magic" Fallbacks
            if ((isEnterpriseFallback || isGeminiToolsFallback) && config.mode !== 'manual') {
                log(`[SafetyNet] Upstream Rejection (${fetchRes.status}). Triggering Transparent Fallback.`);

                if (isEnterpriseFallback) {
                    // 1a. Enterprise -> Free Fallback
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;

                    if (fetchRes.status === 402) fallbackReason = "Insufficient Funds (Upstream 402)";
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
                        let accumulated = "";
                        let currentSignature: string | null = null;

                        // @ts-ignore
                        for await (const chunk of retryRes.body) {
                            const buffer = Buffer.from(chunk);
                            const chunkStr = buffer.toString();
                            // ... (Copy basic stream logic or genericize? Copying safe for hotfix)
                            accumulated += chunkStr;
                            res.write(chunkStr);
                        }

                        // INJECT NOTIFICATION AT END
                        const warningMsg = `\n\n> ⚠️ **Safety Net**: ${fallbackReason}. Switched to \`${actualModel}\`.`;
                        const safeId = "fallback-" + Date.now();
                        const warningChunk = {
                            id: safeId,
                            object: "chat.completion.chunk",
                            created: Math.floor(Date.now() / 1000),
                            model: actualModel,
                            choices: [{ index: 0, delta: { role: "assistant", content: warningMsg }, finish_reason: null }]
                        };
                        res.write(`data: ${JSON.stringify(warningChunk)}\n\n`);

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

        // Stream Loop
        if (fetchRes.body) {
            let accumulated = "";
            let currentSignature: string | null = null;

            // @ts-ignore
            for await (const chunk of fetchRes.body) {
                const buffer = Buffer.from(chunk);
                let chunkStr = buffer.toString();

                // FIX: STOP REASON NORMALIZATION using Regex Safely
                // 1. If Kimi/Model sends "tool_calls" reason but "tool_calls":null, FORCE STOP.
                if (chunkStr.includes('"finish_reason": "tool_calls"') && chunkStr.includes('"tool_calls":null')) {
                    chunkStr = chunkStr.replace('"finish_reason": "tool_calls"', '"finish_reason": "stop"');
                }

                // 2. Original Logic: Ensure formatting but avoid false positives on null
                // Only upgrade valid stops to tool_calls if we see actual tool array start
                if (chunkStr.includes('"finish_reason"')) {
                    const stopRegex = /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g;
                    if (stopRegex.test(chunkStr)) {
                        if (chunkStr.includes('"tool_calls":[') || chunkStr.includes('"tool_calls": [')) {
                            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "tool_calls"');
                        } else {
                            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "stop"');
                        }
                    }
                }

                // SIGNATURE CAPTURE
                if (!currentSignature) {
                    const match = chunkStr.match(/"thought_signature"\s*:\s*"([^"]+)"/);
                    if (match && match[1]) currentSignature = match[1];
                }

                // SAFETY STOP: SERVER-SIDE LOOP DETECTION (GUILLOTINE)
                if (chunkStr.includes("User:") || chunkStr.includes("\nUser") || chunkStr.includes("user:")) {
                    if (chunkStr.match(/(\n|^)\s*(User|user)\s*:/)) {
                        res.end();
                        return; // HARD STOP
                    }
                }

                accumulated += chunkStr;
                res.write(chunkStr);
            }

            // INJECT NOTIFICATION AT END
            if (isFallbackActive) {
                const warningMsg = `\n\n> ⚠️ **Safety Net**: ${fallbackReason}. Switched to \`${actualModel}\`.`;
                const safeId = "fallback-" + Date.now();
                const warningChunk = {
                    id: safeId,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: actualModel,
                    choices: [{ index: 0, delta: { role: "assistant", content: warningMsg }, finish_reason: null }]
                };
                res.write(`data: ${JSON.stringify(warningChunk)}\n\n`);
            }

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
