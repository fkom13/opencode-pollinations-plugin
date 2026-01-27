# Documentation du projet: opencode-pollinations-plugin

> Généré le 25/01/2026 20:23:14

## 📂 Structure du projet

```
└── opencode-pollinations-plugin
    ├── config.json
    ├── package.json
    ├── src
    │   ├── index.ts
    │   ├── provider.ts
    │   ├── provider_v1.ts
    │   └── server
    │       ├── config.ts
    │       ├── generate-config.ts
    │       ├── index.ts
    │       ├── pollinations-api.ts
    │       └── proxy.ts
    └── tsconfig.json
```

## 📝 Contenu des fichiers

### 📄 `config.json`

```json
{"apiKey": "bad_key"}

```

### 📄 `package.json`

```json
{
    "name": "opencode-pollinations-plugin",
    "version": "0.1.0",
    "description": "Native Pollinations.ai Provider Plugin for OpenCode",
    "type": "module",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "files": [
        "dist"
    ],
    "scripts": {
        "build": "tsc"
    },
    "dependencies": {
        "@opencode-ai/plugin": "^1.0.85",
        "zod": "^3.22.4"
    },
    "devDependencies": {
        "@types/node": "^20.0.0",
        "typescript": "^5.0.0"
    }
}
```

### 📄 `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ESNext",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true
    },
    "include": [
        "src/**/*"
    ]
}
```

### 📁 src

#### 📄 `src/index.ts`

```typescript

import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { generatePollinationsConfig } from './server/generate-config.js';

const LOG_FILE = '/tmp/opencode_pollinations_debug.log';

// Global cache for signature (simple single-user assumption)
let lastSignature: string | null = null;

function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) { }
}

const POLLINATIONS_API_URL = "https://gen.pollinations.ai";

// --- PROXY IMPORTS ---
// We need to import the proxy handler function. 
// Ideally we should import from ./server/proxy.js but the file structure is compiled.
// For simplicity in this single-file V1-like structure, we rely on the proxy code being part of the build or imported dynamically.
// Wait, in V3 we split 'proxy.ts' into 'src/server/proxy.ts'.
import { handleChatCompletion } from './server/proxy.js'; // Ensure this matches build output

// Embedded Proxy Server
const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            log(`[Proxy] Incoming Request: ${req.method} ${req.url}`);

            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end();
                return;
            }

            // Collect Body
            const chunks: any[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                const bodyRaw = Buffer.concat(chunks).toString();
                // Delegate to Proxy Logic (Centralized in proxy.ts)
                await handleChatCompletion(req, res, bodyRaw);
            });
        });

        server.listen(10001, '127.0.0.1', () => { // Fixed port for stability
            const addr = server.address() as any;
            log(`[Proxy] Started on port ${addr.port}`);

            // Lifecycle Management
            const cleanup = () => {
                log(`[Proxy] Shutting down server on port ${addr.port}`);
                server.close();
            };

            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            process.on('exit', cleanup);

            resolve(addr.port);
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                log(`[Proxy] Port 10001 in use, assuming existing proxy.`);
                resolve(10001);
            } else {
                console.error("Proxy Start Error:", e);
                resolve(0);
            }
        });
    });
};

export const PollinationsPlugin: Plugin = async () => {
    log("Plugin Initializing (V3 Phase 4)...");
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}`;

    return {
        async config(config) {
            log("[Hook] Config hook called");

            // Dynamic Config Generation (Phase 4)
            // Fetch models, map variants (Thinking, MaxTokens), handle Gemini versions
            const modelsArray = await generatePollinationsConfig();

            const modelsObj: any = {};
            if (Array.isArray(modelsArray)) {
                modelsArray.forEach((m: any) => {
                    modelsObj[m.id] = m;
                });
            }

            // Ensure provider structure
            if (!config.provider) config.provider = {};

            if (!config.provider['pollinations_enter']) {
                config.provider['pollinations_enter'] = {
                    id: 'pollinations',
                    name: 'Pollinations V3 (Enterprise)',
                    options: { baseURL: localBaseUrl },
                    models: {}
                } as any;
            }

            const p = config.provider['pollinations_enter'] as any;

            // Inject Models
            p.models = modelsObj;

            // Force Localhost URL (The Proxy)
            p.options = p.options || {};
            p.options.baseURL = localBaseUrl;
        }
    };
};

export default PollinationsPlugin;

```

#### 📄 `src/provider.ts`

```typescript

// Removed invalid imports
import * as fs from 'fs';

// --- Sanitization Helpers (Ported from Gateway/Upstream) ---

function safeId(id: string): string {
    if (!id) return id;
    if (id.length > 30) return id.substring(0, 30);
    return id;
}

function logDebug(message: string, data?: any) {
    try {
        const timestamp = new Date().toISOString();
        let logMsg = `[${timestamp}] ${message}`;
        if (data) {
            logMsg += `\n${JSON.stringify(data, null, 2)}`;
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', logMsg + '\n\n');
    } catch (e) {
        // ignore logging errors
    }
}

function sanitizeTools(tools: any[]): any[] {
    if (!Array.isArray(tools)) return tools;

    const cleanSchema = (schema: any) => {
        if (!schema || typeof schema !== "object") return;
        if (schema.optional !== undefined) delete schema.optional;
        if (schema.ref !== undefined) delete schema.ref;
        if (schema["$ref"] !== undefined) delete schema["$ref"];

        if (schema.properties) {
            for (const key in schema.properties) cleanSchema(schema.properties[key]);
        }
        if (schema.items) cleanSchema(schema.items);
    };

    return tools.map((tool) => {
        const newTool = { ...tool };
        if (newTool.function && newTool.function.parameters) {
            cleanSchema(newTool.function.parameters);
        }
        return newTool;
    });
}

function filterTools(tools: any[], maxCount = 120): any[] {
    if (!Array.isArray(tools)) return [];
    if (tools.length <= maxCount) return tools;

    const priorities = [
        "bash", "read", "write", "edit", "webfetch", "glob", "grep",
        "searxng_remote_search", "deepsearch_deep_search", "google_search",
        "task", "todowrite"
    ];

    const priorityTools = tools.filter((t) => priorities.includes(t.function.name));
    const otherTools = tools.filter((t) => !priorities.includes(t.function.name));

    const slotsLeft = maxCount - priorityTools.length;
    const othersKept = otherTools.slice(0, Math.max(0, slotsLeft));

    logDebug(`[POLLI-PLUGIN] Filtering tools: ${tools.length} -> ${priorityTools.length + othersKept.length}`);
    return [...priorityTools, ...othersKept];
}

// --- Fetch Implementation ---

export const createPollinationsFetch = (apiKey: string) => async (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> => {
    let url = input.toString();
    const options = init || {};
    let body: any = null;

    if (options.body && typeof options.body === "string") {
        try {
            body = JSON.parse(options.body);
        } catch (e) {
            // Not JSON, ignore
        }
    }

    // --- INTERCEPTION & SANITIZATION ---
    if (body) {
        let model = body.model || "";

        // 0. Model Name Normalization
        if (typeof model === "string" && model.startsWith("pollinations/enter/")) {
            body.model = model.replace("pollinations/enter/", "");
            model = body.model;
        }

        // FIX: Remove stream_options (causes 400 on some OpenAI proxies)
        if (body.stream_options) {
            delete body.stream_options;
        }

        // 1. Azure Tool Limit Fix
        if ((model.includes("openai") || model.includes("gpt")) && body.tools) {
            if (body.tools.length > 120) {
                body.tools = filterTools(body.tools, 120);
            }
        }

        // 2. Vertex/Gemini Schema Fix
        if (model.includes("gemini") && body.tools) {
            body.tools = sanitizeTools(body.tools);
        }

        // Re-serialize body
        options.body = JSON.stringify(body);
    }

    // Ensure Headers
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("Content-Type", "application/json");
    options.headers = headers;

    logDebug(`Req: ${url}`, body);

    try {
        const response = await global.fetch(url, options);

        // Log response status
        // We clone to read text for debugging errors
        if (!response.ok) {
            try {
                const clone = response.clone();
                const text = await clone.text();
                logDebug(`Res (Error): ${response.status}`, text);
            } catch (e) {
                logDebug(`Res (Error): ${response.status} (Read failed)`);
            }
        } else {
            logDebug(`Res (OK): ${response.status}`);
        }

        return response;
    } catch (e: any) {
        logDebug(`Fetch Error: ${e.message}`);
        throw e;
    }
};

```

#### 📄 `src/provider_v1.ts`

```typescript

// Removed invalid imports
import * as fs from 'fs';

// --- Sanitization Helpers (Ported from Gateway/Upstream) ---

function safeId(id: string): string {
    if (!id) return id;
    if (id.length > 30) return id.substring(0, 30);
    return id;
}

function logDebug(message: string, data?: any) {
    try {
        const timestamp = new Date().toISOString();
        let logMsg = `[${timestamp}] ${message}`;
        if (data) {
            logMsg += `\n${JSON.stringify(data, null, 2)}`;
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', logMsg + '\n\n');
    } catch (e) {
        // ignore logging errors
    }
}

function sanitizeTools(tools: any[]): any[] {
    if (!Array.isArray(tools)) return tools;

    const cleanSchema = (schema: any) => {
        if (!schema || typeof schema !== "object") return;
        if (schema.optional !== undefined) delete schema.optional;
        if (schema.ref !== undefined) delete schema.ref;
        if (schema["$ref"] !== undefined) delete schema["$ref"];

        if (schema.properties) {
            for (const key in schema.properties) cleanSchema(schema.properties[key]);
        }
        if (schema.items) cleanSchema(schema.items);
    };

    return tools.map((tool) => {
        const newTool = { ...tool };
        if (newTool.function && newTool.function.parameters) {
            cleanSchema(newTool.function.parameters);
        }
        return newTool;
    });
}

function filterTools(tools: any[], maxCount = 120): any[] {
    if (!Array.isArray(tools)) return [];
    if (tools.length <= maxCount) return tools;

    const priorities = [
        "bash", "read", "write", "edit", "webfetch", "glob", "grep",
        "searxng_remote_search", "deepsearch_deep_search", "google_search",
        "task", "todowrite"
    ];

    const priorityTools = tools.filter((t) => priorities.includes(t.function.name));
    const otherTools = tools.filter((t) => !priorities.includes(t.function.name));

    const slotsLeft = maxCount - priorityTools.length;
    const othersKept = otherTools.slice(0, Math.max(0, slotsLeft));

    logDebug(`[POLLI-PLUGIN] Filtering tools: ${tools.length} -> ${priorityTools.length + othersKept.length}`);
    return [...priorityTools, ...othersKept];
}

// --- Fetch Implementation ---

export const createPollinationsFetch = (apiKey: string) => async (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> => {
    let url = input.toString();
    const options = init || {};
    let body: any = null;

    if (options.body && typeof options.body === "string") {
        try {
            body = JSON.parse(options.body);
        } catch (e) {
            // Not JSON, ignore
        }
    }

    // --- INTERCEPTION & SANITIZATION ---
    if (body) {
        let model = body.model || "";

        // 0. Model Name Normalization
        if (typeof model === "string" && model.startsWith("pollinations/enter/")) {
            body.model = model.replace("pollinations/enter/", "");
            model = body.model;
        }

        // FIX: Remove stream_options (causes 400 on some OpenAI proxies)
        if (body.stream_options) {
            delete body.stream_options;
        }

        // 1. Azure Tool Limit Fix
        if ((model.includes("openai") || model.includes("gpt")) && body.tools) {
            if (body.tools.length > 120) {
                body.tools = filterTools(body.tools, 120);
            }
        }

        // 2. Vertex/Gemini Schema Fix
        if (model.includes("gemini") && body.tools) {
            body.tools = sanitizeTools(body.tools);
        }

        // Re-serialize body
        options.body = JSON.stringify(body);
    }

    // Ensure Headers
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("Content-Type", "application/json");
    options.headers = headers;

    logDebug(`Req: ${url}`, body);

    try {
        const response = await global.fetch(url, options);

        // Log response status
        // We clone to read text for debugging errors
        if (!response.ok) {
            try {
                const clone = response.clone();
                const text = await clone.text();
                logDebug(`Res (Error): ${response.status}`, text);
            } catch (e) {
                logDebug(`Res (Error): ${response.status} (Read failed)`);
            }
        } else {
            logDebug(`Res (OK): ${response.status}`);
        }

        return response;
    } catch (e: any) {
        logDebug(`Fetch Error: ${e.message}`);
        throw e;
    }
};

```

#### 📁 server

##### 📄 `src/server/config.ts`

```typescript

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.env.HOME || '/tmp', '.config/opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'pollinations-config.json');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR, 'opencode.json');
const AUTH_FILE = path.join(process.env.HOME || '/tmp', '.local/share/opencode/auth.json');

export interface PollinationsConfig {
    apiKey?: string;
    mode: 'manual' | 'alwaysfree' | 'pro';
    customModels?: any[];
}

const DEFAULT_CONFIG: PollinationsConfig = {
    mode: 'manual',
    customModels: []
};

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Debug Helper
function logConfig(msg: string) {
    try {
        const fs = require('fs');
        fs.appendFileSync('/tmp/pollinations-config-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export function loadConfig(): PollinationsConfig {
    // 1. Try Native Auth Storage (auth.json) - Where /connect saves keys
    try {
        if (fs.existsSync(AUTH_FILE)) {
            const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
            const authData = JSON.parse(raw);

            // OpenCode stores keys by Provider ID. 
            // In index.ts, we set ID to 'pollinations'.
            // Check for 'pollinations' or 'pollinations_enter'
            const entry = authData['pollinations'] || authData['pollinations_enter'];

            // Handle { type: 'api', key: '...' } structure vs legacy string
            const key = (typeof entry === 'object' && entry?.key) ? entry.key : entry;

            if (key && typeof key === 'string' && key.length > 5) {
                logConfig(`Found Key in auth.json for 'pollinations'`);
                return { mode: 'pro', apiKey: key, customModels: [] };
            }
        } else {
            logConfig(`Auth file not found at ${AUTH_FILE}`);
        }
    } catch (e) {
        logConfig(`Error reading auth.json: ${e}`);
    }

    // 2. Try Native OpenCode Config first (Standard Path)
    try {
        if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
            const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
            const data = JSON.parse(raw);
            const nativeKey = data?.provider?.pollinations_enter?.options?.apiKey;

            if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                logConfig(`Found Native Key in opencode.json: ...${nativeKey.slice(-4)}`);
                return {
                    mode: 'pro',
                    apiKey: nativeKey,
                    customModels: []
                };
            }
        }
    } catch (e) {
        logConfig(`Error reading opencode.json: ${e}`);
    }

    // 3. Fallback to Custom Config (Legacy/Manual)
    logConfig(`HOME=${process.env.HOME}, CONFIG_FILE=${CONFIG_FILE}`);
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            logConfig(`Loaded custom config...`);
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        } else {
            logConfig(`Custom config file not found at ${CONFIG_FILE}`);
        }
    } catch (e) {
        console.error("Failed to load config:", e);
        logConfig(`Error loading custom config: ${e}`);
    }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<PollinationsConfig>) {
    try {
        const current = loadConfig();
        const updated = { ...current, ...config };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        console.error("Failed to save config:", e);
        throw e;
    }
}

```

##### 📄 `src/server/generate-config.ts`

```typescript

import * as https from 'https';
import * as fs from 'fs';
import { loadConfig } from './config.js';

// --- INTERFACES SCRICT ---

interface PollinationsModel {
    name: string; // "gemini", "gpt-4o"
    description?: string;
    type?: string;
    tools?: boolean; // CRITICAL FILTER
    reasoning?: boolean; // For Thinking variants
    context?: number;
    [key: string]: any;
}

interface OpenCodeModel {
    id: string; // "pollinations/free/gemini"
    name: string;
    object: string;
    variants?: any;
    options?: any;
}

// --- LOGGING --- (Copied from working implementation)
function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        if (!fs.existsSync('/tmp/opencode_pollinations_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', `[ConfigGen] ${ts} ${msg}\n`);
    } catch (e) { }
}

// Fetch Helper
function fetchJson(url: string, headers: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    log(`JSON Parse Error for ${url}: ${e}`);
                    resolve([]); // Fail safe
                }
            });
        });
        req.on('error', (e) => {
            log(`Network Error for ${url}: ${e.message}`);
            reject(e);
        });
    });
}

// --- MAIN GENERATOR logic ---

export async function generatePollinationsConfig(): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Dynamic Discovery (V3 Phase 5)...`);

    // 1. FREE UNIVERSE (https://text.pollinations.ai/openai/models)
    // Note: User specified text.pollinations.ai/openai/models
    try {
        const freeList = await fetchJson('https://text.pollinations.ai/openai/models');
        // Structure is usually { data: [...] } or [...]
        const list = Array.isArray(freeList) ? freeList : (freeList.data || []);

        log(`Fetched ${list.length} Free models.`);
        if (list.length > 0) {
            log(`[DEBUG] First Free Model Raw: ${JSON.stringify(list[0])}`);
        }

        list.forEach((m: any) => {
            // FILTER RELAXED for Free models (Metadata unreliable)
            // Just map all available free models.
            const mapped = mapModel(m, 'pollinations/free/', '[Free] ');
            modelsOutput.push(mapped);
        });
    } catch (e) {
        log(`Error fetching Free models: ${e}`);
        // Fallback for Free (Offline Safety)
        modelsOutput.push({ id: "pollinations/free/openai", name: "[Free] OpenAI (Fallback)", object: "model", variants: {} });
    }

    // 2. ENTERPRISE UNIVERSE (https://gen.pollinations.ai/text/models)
    if (config.apiKey) {
        try {
            log(`Fetching Enterprise models with Key...`);
            const enterListRaw = await fetchJson('https://gen.pollinations.ai/text/models', {
                'Authorization': `Bearer ${config.apiKey}`
            });
            const enterList = Array.isArray(enterListRaw) ? enterListRaw : (enterListRaw.data || []);

            log(`Fetched ${enterList.length} Enterprise models.`);

            enterList.forEach((m: any) => {
                // Enterprise usually declared tools correctly.
                // Keep filter if reliable, or relax if user wants ALL Enter models too?
                // User said "filtrage de TOUS les modeles qui ne font pas de tooling".
                // But Free metadata was empty. Enter metadata might be better.
                // Let's keep filter for Enter IF present, but if tool prop is missing, maybe allow?
                // For safety, I will require tools ONLY if property exists and is false.
                if (m.tools === false) {
                    log(`Skipping Enter Model ${m.name || m.id}: Explicit tools:false.`);
                    return;
                }

                const mapped = mapModel(m, 'pollinations/enter/', '[Enter] ');
                modelsOutput.push(mapped);
            });

        } catch (e) {
            log(`Error fetching Enterprise models: ${e}`);
        }
    } else {
        log(`No API Key found. Skipping Enterprise discovery.`);
    }

    log(`Total Mapped Models: ${modelsOutput.length}`);
    return modelsOutput;
}

// --- MAPPING ENGINE ---

function mapModel(raw: any, prefix: string, namePrefix: string): OpenCodeModel {
    const rawId = raw.id || raw.name;
    const fullId = prefix + rawId;
    // Clearer Naming: "[Free] Mistral"
    const baseName = raw.description || raw.name || rawId;
    const finalName = `${namePrefix}${baseName}`;

    const modelObj: OpenCodeModel = {
        id: fullId,
        name: finalName,
        object: 'model',
        variants: {} // Init variants
    };

    // --- ENRICHISSEMENT (VARIANTS) ---

    // 1. Thinking Models (Reasoning)
    // Heuristic: Metadata 'reasoning': true OR ID contains 'thinking'/'reasoning'
    if (raw.reasoning === true || rawId.includes('thinking') || rawId.includes('reasoning')) {
        modelObj.variants = {
            ...modelObj.variants,
            high_reasoning: {
                options: {
                    reasoningEffort: "high",
                    budgetTokens: 16000
                }
            }
        };
    }

    // 2. Gemini Specifics (3.0 vs 2.5 Logic determined by ID)
    if (rawId.includes('gemini') && !rawId.includes('fast')) {
        // Assume 3.0 or Pro
        // Thinking variant is good here too.
        if (!modelObj.variants.high_reasoning && (rawId === 'gemini' || rawId === 'gemini-large')) {
            modelObj.variants.high_reasoning = { options: { reasoningEffort: "high", budgetTokens: 16000 } };
        }
    }

    // 3. Bedrock Limitation (MaxTokens 8000)
    // Models often on Bedrock: Claude, Mistral, Llama via Pollinations
    if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama')) {
        // Apply limit via 'bedrock_safe' variant or Default?
        // User said "que pour ceux ... erreurs explicite".
        // Safer to provide a variant "8k_limit".
        modelObj.variants.safe_tokens = {
            options: { maxTokens: 8000 }
        };
    }

    // 4. Fast Models (Disable Thinking explicitly)
    if (rawId.includes('fast') || rawId.includes('flash') || rawId.includes('lite')) {
        // UNLESS it is Gemini 3 Flash which supports thinking! 
        // User said: "gemini 3 flash c'est un thinking".
        // Only disable for known non-thinking fast models (e.g. openai-fast, nova-fast).
        if (!rawId.includes('gemini')) {
            modelObj.variants.speed = {
                options: { thinking: { disabled: true } }
            };
        }
    }

    return modelObj;
}

```

##### 📄 `src/server/index.ts`

```typescript

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { getAggregatedModels } from './pollinations-api.js';
import { loadConfig, saveConfig } from './config.js';
import { handleChatCompletion } from './proxy.js';

const LOG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/plugins/pollinations-v3.log');

// Simple file logger
function log(msg: string) {
    const ts = new Date().toISOString();
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) {
            fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) {
        // silent fail
    }
}

const server = http.createServer(async (req, res) => {
    log(`${req.method} ${req.url}`);

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // AUTH ENDPOINT (Kept for compatibility, though Native Auth is preferred)
    if (req.method === 'POST' && req.url === '/v1/auth') {
        const chunks: any[] = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                if (body && body.apiKey) {
                    saveConfig({ apiKey: body.apiKey, mode: 'pro' });
                    log(`[AUTH] Key saved via Server Endpoint`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: "ok" }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Missing apiKey" }));
                }
            } catch (e) {
                log(`[AUTH] Error: ${e}`);
                res.writeHead(500);
                res.end(JSON.stringify({ error: String(e) }));
            }
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        const config = loadConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: "ok",
            version: "v3.0.0-phase3",
            mode: config.mode,
            hasKey: !!config.apiKey
        }));
        return;
    }

    if (req.method === 'GET' && req.url === '/v1/models') {
        try {
            const models = await getAggregatedModels();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(models));
        } catch (e) {
            log(`Error fetching models: ${e}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Failed to fetch models" }));
        }
        return;
    }

    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        // Accumulate body for the proxy
        const chunks: any[] = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const bodyRaw = Buffer.concat(chunks).toString();
                await handleChatCompletion(req, res, bodyRaw);
            } catch (e) {
                log(`Error in chat handler: ${e}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Internal Server Error in Chat Handler" }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end("Not Found");
});

const PORT = parseInt(process.env.POLLINATIONS_PORT || '10001', 10);

// ANTI-ZOMBIE (Visible Logs Restored)
try {
    const { execSync } = require('child_process');
    try {
        console.log(`[POLLINATIONS] Checking port ${PORT}...`);
        execSync(`fuser -k ${PORT}/tcp || true`);
        console.log(`[POLLINATIONS] Port ${PORT} cleared.`);
    } catch (e) {
        console.log(`[POLLINATIONS] Port check skipped (cmd missing?)`);
    }
} catch (e) { }

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}`;
    log(`[SERVER] Started V3 Phase 3 (Auth Enabled) on port ${PORT}`);
    console.log(`POLLINATIONS_V3_URL=${url}`);
});

```

##### 📄 `src/server/pollinations-api.ts`

```typescript

import { loadConfig } from './config.js';
import * as fs from 'fs';

// Internal Types
interface OpenAIModel {
    id: string;
    name: string;
    object: "model";
    created: number;
    owned_by: string;
    permission: any[];
    capabilities: { failure?: boolean; completion?: boolean; chat: boolean; tools?: boolean };
    context_window?: number;
    description?: string;
    modalities?: { input: string[], output: string[] };
}

// Debug Helper
function logDebug(msg: string) {
    try {
        fs.appendFileSync('/tmp/pollinations-api-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

const HEADERS = {
    'User-Agent': 'curl/8.5.0',
    'Origin': '',
    'Referer': ''
};

function formatName(name: string, censored: boolean): string {
    let clean = name.replace(/^pollinations\//, '').replace(/-/g, ' ');
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    if (!censored) clean += " (Uncensored)";
    return clean;
}

// Helper to guess context window if not provided by API
function getContextWindow(id: string): number {
    const n = id.toLowerCase();
    if (n.includes('128k') || n.includes('gpt-4') || n.includes('turbo')) return 128000;
    if (n.includes('gemini') || n.includes('flash') || n.includes('pro')) return 1048576;
    return 32768; // Default
}

// Fetch Free Models (Public API)
async function fetchFreeModels(): Promise<OpenAIModel[]> {
    try {
        logDebug("Fetching Free Models (Dynamic Inspection)...");
        const response = await fetch('https://text.pollinations.ai/models', { headers: HEADERS });
        if (!response.ok) throw new Error(`${response.status}`);

        const data: any = await response.json();
        const models: any[] = Array.isArray(data) ? data : (data.data || []);

        // Log sample for verification
        if (models.length > 0) logDebug(`Sample Free: ${JSON.stringify(models[0])}`);

        return models
            .filter((m: any) => m.tools === true) // FILTER: Tools Only
            .map((m: any) => {
                const id = m.name || m.id;
                // Use Description if available, else generated name
                const desc = m.description ? m.description : formatName(id, m.censored);
                const displayName = `Pollinations Free: ${desc}`;

                return {
                    id: `pollinations/free/${id}`,
                    name: displayName,
                    object: "model",
                    created: 1700000000,
                    owned_by: "pollinations-free",
                    permission: [],
                    capabilities: { chat: true, completion: true, tools: true },
                    context_window: m.context_window || getContextWindow(id),
                    description: m.description,
                    modalities: { input: ['text'], output: ['text'] } // Improve if 'vision' flag exists in API
                };
            });
    } catch (e) {
        logDebug(`Error Free: ${e}`);
        return [];
    }
}

// Fetch Enterprise Models
async function fetchEnterpriseModels(apiKey: string): Promise<OpenAIModel[]> {
    if (!apiKey || apiKey === 'dummy' || apiKey.length < 5) return [];

    try {
        logDebug(`Fetching Enter Models...`);
        const response = await fetch('https://gen.pollinations.ai/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            logDebug(`Enter API Error: ${response.status}`);
            return [];
        }

        const rawData: any = await response.json();
        const rawModels = Array.isArray(rawData) ? rawData : (rawData.data || []);
        logDebug(`Fetched ${rawModels.length} Enter models.`);

        if (rawModels.length > 0) logDebug(`Sample Enter: ${JSON.stringify(rawModels[0])}`);

        return rawModels
            .filter((m: any) => {
                if (typeof m === 'string') return true; // Strings = pass (cant check tools)
                return m.tools === true; // Objects = check tools
            })
            .map((m: any) => {
                // Enter models might be strings or objects. 
                // If string, we can't extract description dynamically -> Fallback formatted name
                const isObj = typeof m === 'object';
                const id = isObj ? (m.id || m.name) : m;
                const desc = (isObj && m.description) ? m.description : formatName(id, true);

                const displayName = `Pollinations Pro: ${desc}`;

                return {
                    id: `pollinations/enter/${id}`,
                    name: displayName,
                    object: "model",
                    created: 1700000000,
                    owned_by: "pollinations-enter",
                    permission: [],
                    capabilities: { chat: true, completion: true, tools: true },
                    context_window: (isObj && m.context_window) ? m.context_window : getContextWindow(id),
                    modalities: { input: ['text'], output: ['text'] }
                };
            });
    } catch (e) {
        logDebug(`Error Enter: ${e}`);
        return [];
    }
}

export async function getAggregatedModels(): Promise<{ object: string, data: OpenAIModel[] }> {
    const config = loadConfig();
    const [free, enter] = await Promise.all([
        fetchFreeModels(),
        fetchEnterpriseModels(config.apiKey || '')
    ]);
    // Merge: Enter first
    return { object: "list", data: [...enter, ...free] };
}

```

##### 📄 `src/server/proxy.ts`

```typescript

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
    // log(`[DEBUG] Hashing: "${normalized.slice(0, 50)}..."`); // Debug only
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// LEGACY HASH (Backward Compatibility)
function hashMessageLegacy(content: string): string {
    if (!content) return "empty";
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
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

    try {
        const body: ChatRequest = JSON.parse(bodyRaw);
        const config = loadConfig();

        log(`Incoming Model (OpenCode ID): ${body.model}`);

        // 1. STRICT ROUTING LOGIC (Phase 5)
        let actualModel = body.model || "openai";
        let isEnterprise = false;

        if (actualModel.startsWith('pollinations/enter/')) {
            // ENTERPRISE -> gen.pollinations.ai/v1
            if (!config.apiKey) {
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
            // FREE -> text.pollinations.ai/openai
            targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
            authHeader = undefined; // STRICT: No Auth
            actualModel = actualModel.replace('pollinations/free/', '');
            log(`Routing to FREE: ${actualModel}`);
        } else {
            // Fallback (Should not happen if config is strict, but handle safely)
            // Default to Free
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
        // Seed required for Free to ensure determinism if missing?
        if (!isEnterprise && !proxyBody.seed) {
            proxyBody.seed = Math.floor(Math.random() * 1000000);
        }
        if (isEnterprise) proxyBody.private = true;
        if (proxyBody.stream_options) delete proxyBody.stream_options; // OpenAI Compat Fix

        // 3.5 PREPARE SIGNATURE HASHING (Gemini Thinking Fix)
        // We key the signature by the HASH OF THE PROMPT (Last Message).
        // This avoids needing to reconstruct the full response from the stream to generate the key.
        let currentRequestHash: string | null = null;
        if (proxyBody.messages && proxyBody.messages.length > 0) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];
            // Ensure we only hash the Prompt (User/Tool Output), which is stable text/json
            currentRequestHash = hashMessage(lastMsg);
        }

        // =========================================================
        // LOGIC BLOCK: MODEL SPECIFIC ADAPTATIONS
        // =========================================================

        if (proxyBody.tools && Array.isArray(proxyBody.tools)) {

            // A. AZURE/OPENAI FIXES (Truncation + ID Length)
            if (actualModel.includes("gpt") || actualModel.includes("openai") || actualModel.includes("azure")) {
                proxyBody.tools = truncateTools(proxyBody.tools, 120);

                // Truncate Tool Call IDs in History (Strict Azure/OpenAI Limit ~40 chars)
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

            // B. GEMINI & NOMNOM FIXES (Grounding Disable + Search Exclusion)
            // Critical for Gemini 2.5 Fast (Error 400), NomNom, AND Gemini Free (Flash 2.5).
            // ALLOW Search for Gemini 3.0 (Enterprise) as requested.
            if (
                actualModel === "nomnom" ||
                (actualModel.includes("gemini") && (actualModel.includes("fast") || actualModel.includes("legacy"))) ||
                (actualModel.includes("gemini") && !isEnterprise) // Strict: All Free Gemini = No Search
            ) {
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);

                if (hasFunctions) {
                    // Disable Grounding via Config to avoid "Search Tool" conflict with Functions
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };

                    // Filter: Ensure ONLY functions are in 'tools' array AND Exclude 'google_search'
                    proxyBody.tools = proxyBody.tools.filter((t: any) => {
                        const isFunc = t.type === 'function' || t.function;
                        const name = t.function?.name || t.name;
                        return isFunc && name !== 'google_search';
                    });

                    // Sanitize format (Ref handling for Vertex)
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);

                    log(`[Proxy] Gemini/NomNom Fix: Grounding Disabled, Excluded google_search. Sending ${proxyBody.tools.length} tools.`);
                }
            } else if (actualModel.includes("gemini")) {
                // Standard Gemini 3.0 Sanitization (Grounding OFF if functions present, but Search Tool ALLOWED in list)
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                if (hasFunctions) {
                    // Still disable grounding to prefer function usage? Or allow mix?
                    // User said "remettre google_search aux 3.0". Assuming it works there.
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                    // We do NOT exclude google_search here.
                    proxyBody.tools = proxyBody.tools.filter((t: any) => t.type === 'function' || t.function);
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
                }
            }
        }

        // C. GEMINI ID BACKTRACKING (Context Fix & Signature Injection)
        if (actualModel.includes("gemini") && proxyBody.messages) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];

            // 1. Inject Signatures into History (Prompt-Keyed)
            proxyBody.messages.forEach((m: any, index: number) => {
                if (m.role === 'assistant') {
                    let sig = null;

                    // Look at PREVIOUS message (The Prompt that generated this Assistant Response)
                    if (index > 0) {
                        const prevMsg = proxyBody.messages[index - 1];
                        const prevHash = hashMessage(prevMsg);
                        sig = signatureMap[prevHash];
                    }

                    // Fallback to Last Signature if linear (Better than nothing)
                    if (!sig) sig = lastSignature;

                    if (sig) {
                        if (!m.thought_signature) m.thought_signature = sig;
                        // Inject into Tool Calls if present
                        if (m.tool_calls) {
                            m.tool_calls.forEach((tc: any) => {
                                if (!tc.thought_signature) tc.thought_signature = sig;
                                if (tc.function && !tc.function.thought_signature) tc.function.thought_signature = sig;
                            });
                        }
                    }
                }
            });

            // 2. Fix Tool Response ID
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
                        // log(`[Proxy] Fixed ID mismatch: ${currentId} -> ${originalId}`);
                        lastMsg.tool_call_id = originalId;
                    }
                }
            }
        }

        // 4. Headers Construction
        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            // ALWAYS Fake CURL User-Agent to pass WAF/Filters (Validated Fix)
            'User-Agent': 'curl/8.5.0'
        };

        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Remove Origin/Referer explicitly? (Node doesn't send them by default unless forwarded)
        // We do NOT forward req.headers blindly here, we build fresh options.

        // 5. Forward (Global Fetch)
        const fetchRes = await fetch(targetUrl, {
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
        }

        // Stream Loop
        if (fetchRes.body) {
            let accumulated = "";
            let currentSignature: string | null = null;

            // @ts-ignore
            for await (const chunk of fetchRes.body) {
                const buffer = Buffer.from(chunk);
                let chunkStr = buffer.toString();

                // FIX: STOP REASON NORMALIZATION
                if (chunkStr.includes('"finish_reason"')) {
                    const stopRegex = /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g;
                    if (stopRegex.test(chunkStr)) {
                        if (chunkStr.includes('"tool_calls"')) {
                            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "tool_calls"');
                        } else {
                            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "stop"');
                        }
                    }
                }

                // SIGNATURE CAPTURE (Restored)
                if (!currentSignature) {
                    const match = chunkStr.match(/"thought_signature"\s*:\s*"([^"]+)"/);
                    if (match && match[1]) currentSignature = match[1];
                }

                accumulated += chunkStr;
                res.write(chunkStr);
            }

            // END STREAM: SAVE MAP (Prompt Keyed)
            if (currentSignature && currentRequestHash) {
                // We map the PROMPT HASH -> RESULT SIGNATURE
                signatureMap[currentRequestHash] = currentSignature;
                saveSignatureMap();
                lastSignature = currentSignature; // Update Global Fallback
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

```

