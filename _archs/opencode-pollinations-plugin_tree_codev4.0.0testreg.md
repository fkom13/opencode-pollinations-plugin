# Documentation du projet: opencode-pollinations-plugin

> Généré le 26/01/2026 06:01:12

## 📂 Structure du projet

```
└── opencode-pollinations-plugin
    ├── config.json
    ├── docs
    ├── logs
    ├── package.json
    ├── src
    │   ├── index.ts
    │   ├── provider.ts
    │   ├── provider_v1.ts
    │   └── server
    │       ├── commands.ts
    │       ├── config.ts
    │       ├── generate-config.ts
    │       ├── index.ts
    │       ├── pollinations-api.ts
    │       ├── proxy.ts
    │       ├── quota.ts
    │       ├── router.ts
    │       └── toast.ts
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
    "version": "4.0.0",
    "description": "Native Pollinations.ai Provider Plugin for OpenCode",
    "publisher": "pollinations",
    "type": "module",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "engines": {
        "vscode": "^1.80.0"
    },
    "activationEvents": [
        "*"
    ],
    "contributes": {
        "commands": [
            {
                "command": "pollinations.mode",
                "title": "Pollinations: Change Mode"
            },
            {
                "command": "pollinations.usage",
                "title": "Pollinations: Show Usage"
            }
        ]
    },
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

### 📁 docs

### 📁 logs

### 📁 src

#### 📄 `src/index.ts`

```typescript

import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks } from './server/toast.js';
import { createCommandHooks } from './server/commands.js';

const LOG_FILE = '/tmp/opencode_pollinations_v4.log';

function log(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

const TRACKING_PORT = 10001;

// === ANTI-ZOMBIE ATOMIC CLEANUP ===
try {
    log(`[Init] Checking port ${TRACKING_PORT} for zombies...`);
    execSync(`fuser -k ${TRACKING_PORT}/tcp || true`);
    log(`[Init] Port ${TRACKING_PORT} cleaned.`);
} catch (e) {
    log(`[Init] Zombie cleanup warning: ${e}`);
}

// === GESTION DU CYCLE DE VIE PROXY ===

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            log(`[Proxy] Request: ${req.method} ${req.url}`);

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.method === 'GET' && req.url === '/health') {
                const config = loadConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: "ok",
                    version: "v4.0.5",
                    mode: config.mode
                }));
                return;
            }

            // SUPPORT FLEXIBLE DES PATHS
            // Le SDK peut envoyer /v1/chat/completions ou juste /chat/completions
            if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
                const chunks: any[] = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', async () => {
                    try {
                        const bodyRaw = Buffer.concat(chunks).toString();
                        await handleChatCompletion(req, res, bodyRaw);
                    } catch (e) {
                        log(`Error: ${e}`);
                        if (!res.headersSent) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: String(e) }));
                        }
                    }
                });
                return;
            }

            log(`[Proxy] 404 Not Found for ${req.url}`);
            res.writeHead(404);
            res.end("Not Found");
        });

        server.listen(TRACKING_PORT, '127.0.0.1', () => {
            log(`[Proxy] Started V4 on port ${TRACKING_PORT}`);
            resolve(TRACKING_PORT);
        });

        server.on('error', (e: any) => {
            log(`[Proxy] Fatal Error: ${e}`);
            resolve(0);
        });
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    log("Plugin Initializing V4.0.5 (Path Fix)...");

    const port = await startProxy();
    // IMPORTANT: On ajoute /v1 à la base URL pour guider le SDK, 
    // mais le proxy accepte aussi sans.
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    const toastHooks = createToastHooks();
    const commandHooks = createCommandHooks();

    return {
        async config(config) {
            log("[Hook] config() called");

            const modelsArray = await generatePollinationsConfig();
            const modelsObj: any = {};
            for (const m of modelsArray) {
                // Ensure ID is relative for mapping ("free/gemini") 
                // BUT Provider needs full ID ? No, the object key is the relative ID
                // OpenCode: provider.models[id]
                // id comes from generatePollinationsConfig which returns "free/gemini"
                // So modelsObj["free/gemini"] = ... matches.
                modelsObj[m.id] = m;
            }

            if (!config.provider) config.provider = {};

            config.provider['pollinations'] = {
                id: 'pollinations',
                name: 'Pollinations V4',
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...commandHooks
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

##### 📄 `src/server/commands.ts`

```typescript

import { loadConfig, saveConfig, PollinationsConfigV4 } from './config.js';
import { getQuotaStatus, formatQuotaForToast } from './quota.js';
import { emitToast } from './toast.js';

// === INTERFACE ===

interface CommandResult {
    handled: boolean;
    response?: string;
    error?: string;
}

// === COMMAND HANDLER ===

export async function handleCommand(command: string): Promise<CommandResult> {
    const parts = command.trim().split(/\s+/);

    // Commande doit commencer par /pollinations
    if (parts[0] !== '/pollinations' && parts[0] !== '/poll') {
        return { handled: false };
    }

    const subCommand = parts[1];
    const args = parts.slice(2);

    switch (subCommand) {
        case 'mode':
            return handleModeCommand(args);

        case 'usage':
            return await handleUsageCommand(args);

        case 'fallback':
            return handleFallbackCommand(args);

        case 'config':
            return handleConfigCommand(args);

        case 'help':
            return handleHelpCommand();

        default:
            return {
                handled: true,
                error: `Commande inconnue: ${subCommand}. Utilisez /pollinations help`
            };
    }
}

// === SUB-COMMANDS ===

function handleModeCommand(args: string[]): CommandResult {
    const mode = args[0];

    if (!mode) {
        const config = loadConfig();
        return {
            handled: true,
            response: `Mode actuel: ${config.mode}`
        };
    }

    if (!['manual', 'alwaysfree', 'pro'].includes(mode)) {
        return {
            handled: true,
            error: `Mode invalide: ${mode}. Valeurs: manual, alwaysfree, pro`
        };
    }

    saveConfig({ mode: mode as PollinationsConfigV4['mode'] });
    emitToast('success', `Mode changé: ${mode}`);

    return {
        handled: true,
        response: `✅ Mode changé: ${mode}`
    };
}

async function handleUsageCommand(args: string[]): Promise<CommandResult> {
    const format = args[0] || 'compact';

    try {
        const quota = await getQuotaStatus(true); // Force refresh

        if (format === 'compact') {
            return {
                handled: true,
                response: formatQuotaForToast(quota)
            };
        }

        // Format détaillé
        const config = loadConfig();
        const resetDate = quota.nextResetAt.toLocaleString('fr-FR');

        const detailed = `
╔═══════════════════════════════════════════════════════════════╗
║               🌸 POLLINATIONS USAGE REPORT                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Mode:          ${config.mode.padEnd(45)}║
║  Tier:          ${quota.tierEmoji} ${quota.tier.padEnd(43)}║
╠═══════════════════════════════════════════════════════════════╣
║  Quota Free:    ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} pollen${' '.repeat(Math.max(0, 35 - quota.tierRemaining.toFixed(2).length - quota.tierLimit.toString().length))}║
║  Wallet:        $${quota.walletBalance.toFixed(2)}${' '.repeat(Math.max(0, 45 - quota.walletBalance.toFixed(2).length))}║
║  Reset:         ${resetDate.padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
        `.trim();

        return {
            handled: true,
            response: detailed
        };

    } catch (e) {
        return {
            handled: true,
            error: `Erreur récupération usage: ${e}`
        };
    }
}

function handleFallbackCommand(args: string[]): CommandResult {
    const [main, agent] = args;

    if (!main) {
        const config = loadConfig();
        return {
            handled: true,
            response: `Fallback actuel: main=${config.fallbackModels.main}, agent=${config.fallbackModels.agent}`
        };
    }

    saveConfig({
        fallbackModels: {
            main: main,
            agent: agent || main
        }
    });

    return {
        handled: true,
        response: `✅ Fallback configuré: main=${main}, agent=${agent || main}`
    };
}

function handleConfigCommand(args: string[]): CommandResult {
    const [key, value] = args;

    if (!key) {
        const config = loadConfig();
        return {
            handled: true,
            response: JSON.stringify(config, null, 2)
        };
    }

    // Setter
    if (key === 'toast_verbosity' && value) {
        if (!['alert', 'always'].includes(value)) {
            return { handled: true, error: 'Valeurs: alert, always' };
        }
        saveConfig({ toastVerbosity: value as 'alert' | 'all' });
        return { handled: true, response: `✅ toast_verbosity = ${value}` };
    }

    if (key === 'threshold_tier' && value) {
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            return { handled: true, error: 'Valeur entre 0 et 100' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, tier: threshold } });
        return { handled: true, response: `✅ threshold_tier = ${threshold}%` };
    }

    if (key === 'enable_paid_tools' && value) {
        const enabled = value === 'true';
        saveConfig({ enablePaidTools: enabled });
        return { handled: true, response: `✅ enable_paid_tools = ${enabled}` };
    }

    return {
        handled: true,
        error: `Clé inconnue: ${key}`
    };
}

function handleHelpCommand(): CommandResult {
    const help = `
🌸 Pollinations Plugin - Commandes

/pollinations mode [manual|alwaysfree|pro]
    Affiche ou change le mode de fonctionnement

/pollinations usage [compact|full]
    Affiche l'usage actuel (quota, wallet, reset)

/pollinations fallback <main> [agent]
    Configure les modèles de fallback

/pollinations config [key] [value]
    Affiche ou modifie la configuration
    Clés: toast_verbosity, threshold_tier, enable_paid_tools

/pollinations help
    Affiche cette aide
    `.trim();

    return { handled: true, response: help };
}

// === INTEGRATION OPENCODE ===

export function createCommandHooks() {
    return {
        'tui.command.execute': async (input: any, output: any) => {
            const result = await handleCommand(input.command);

            if (result.handled) {
                output.handled = true;
                if (result.response) {
                    output.response = result.response;
                }
                if (result.error) {
                    output.error = result.error;
                }
            }
        }
    };
}

```

##### 📄 `src/server/config.ts`

```typescript

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// PATHS (V3.5.5 COMPATIBLE)
const HOMEDIR = os.homedir();
// V4 Specific Config
const CONFIG_DIR_POLLI = path.join(HOMEDIR, '.pollinations');
const CONFIG_FILE = path.join(CONFIG_DIR_POLLI, 'config.json');

// OPENCODE Native Configs (Source of Truth for Keys)
const CONFIG_DIR_OPENCODE = path.join(HOMEDIR, '.config', 'opencode');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR_OPENCODE, 'opencode.json');
// CRITICAL FIX: Location of auth tokens in OpenCode
const AUTH_FILE = path.join(HOMEDIR, '.local', 'share', 'opencode', 'auth.json');

export interface PollinationsConfigV4 {
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;
    fallbackModels: {
        main: string;
        agent: string;
    };
    thresholds: {
        tier: number;
        wallet: number;
    };
    toastVerbosity: 'none' | 'alert' | 'all';
    enablePaidTools: boolean;
}

const DEFAULT_CONFIG: PollinationsConfigV4 = {
    mode: 'manual',
    fallbackModels: {
        main: 'free/mistral', // Updated to relative ID
        agent: 'free/openai-fast'
    },
    thresholds: {
        tier: 10,
        wallet: 5
    },
    toastVerbosity: 'alert',
    enablePaidTools: false
};

// Debug Helper
function logConfig(msg: string) {
    try {
        if (!fs.existsSync('/tmp/opencode_pollinations_config_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_config_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_config_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

export function loadConfig(): PollinationsConfigV4 {
    let config = { ...DEFAULT_CONFIG };
    let keyFound = false;

    // 1. Try Custom Config (V4 persistence)
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom };
            if (custom.apiKey) {
                logConfig(`Loaded API Key from poll-config`);
                keyFound = true;
            }
        }
    } catch (e) { logConfig(`Error loading custom config: ${e}`); }

    // 2. Try Native Auth Storage (~/.local/share/opencode/auth.json) - RECOVERED FROM V3.5.5
    if (!keyFound) {
        try {
            if (fs.existsSync(AUTH_FILE)) {
                const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
                const authData = JSON.parse(raw);

                // Check both provider IDs (Legacy & New)
                // Keys can be string or { type: 'api', key: '...' }
                const entry = authData['pollinations'] || authData['pollinations_enter'];

                if (entry) {
                    const key = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (key && typeof key === 'string' && key.length > 10) {
                        config.apiKey = key;
                        config.mode = 'pro'; // Auto-switch to Pro if key found
                        keyFound = true;
                        logConfig(`Recovered API Key from OpenCode Auth Store (${AUTH_FILE})`);
                    }
                }
            } else {
                logConfig(`Auth file not found at ${AUTH_FILE}`);
            }
        } catch (e) {
            logConfig(`Error reading auth.json: ${e}`);
        }
    }

    // 3. Try OpenCode Config (~/.config/opencode/opencode.json)
    if (!keyFound) {
        try {
            if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
                const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
                const data = JSON.parse(raw);
                // Look in provider options
                const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                    data?.provider?.pollinations_enter?.options?.apiKey;

                if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                    config.apiKey = nativeKey;
                    config.mode = 'pro';
                    keyFound = true;
                    logConfig(`Found Native Key in opencode.json`);
                }
            }
        } catch (e) {
            logConfig(`Error reading opencode.json: ${e}`);
        }
    }

    // Default mode logic if no key
    if (!keyFound && config.mode === 'pro') {
        config.mode = 'manual'; // Fallback to avoid errors
    }

    return config;
}

export function saveConfig(updates: Partial<PollinationsConfigV4>) {
    try {
        const current = loadConfig();
        const updated = { ...current, ...updates };

        if (!fs.existsSync(CONFIG_DIR_POLLI)) {
            fs.mkdirSync(CONFIG_DIR_POLLI, { recursive: true });
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        logConfig(`Error saving config: ${e}`);
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
    name: string;
    description?: string;
    type?: string;
    tools?: boolean;
    reasoning?: boolean;
    context?: number;
    [key: string]: any;
}

interface OpenCodeModel {
    id: string; // "free/gemini"
    name: string;
    object: string;
    variants?: any;
    options?: any;
    limit?: {
        context?: number;
        output?: number;
    };
}

// --- LOGGING ---
const LOG_FILE = '/tmp/opencode_pollinations_config.log';
function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');
        fs.appendFileSync(LOG_FILE, `[ConfigGen] ${ts} ${msg}\n`);
    } catch (e) { }
    // Force output to stderr for CLI visibility if needed, but clean.
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
                    resolve([]); // Fail safe -> empty list
                }
            });
        });
        req.on('error', (e) => {
            log(`Network Error for ${url}: ${e.message}`);
            reject(e);
        });
        req.setTimeout(5000, () => { // 5s timeout
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

function formatName(id: string, censored: boolean = true): string {
    let clean = id.replace(/^pollinations\//, '').replace(/-/g, ' ');
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    if (!censored) clean += " (Uncensored)";
    return clean;
}

// --- MAIN GENERATOR logic ---

export async function generatePollinationsConfig(): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Configuration (V4.5 Clean Dynamic)...`);

    // 1. FREE UNIVERSE
    try {
        // Switch to main models endpoint (User provided curl confirms it has 'description')
        const freeList = await fetchJson('https://text.pollinations.ai/models');
        const list = Array.isArray(freeList) ? freeList : (freeList.data || []);

        list.forEach((m: any) => {
            const mapped = mapModel(m, 'free/', '[Free] ');
            modelsOutput.push(mapped);
        });
        log(`Fetched ${modelsOutput.length} Free models.`);
    } catch (e) {
        log(`Error fetching Free models: ${e}`);
        // Fallback for Free
        modelsOutput.push({ id: "free/openai", name: "[Free] OpenAI (Fallback)", object: "model", variants: {} });
    }

    // 2. ENTERPRISE UNIVERSE
    if (config.apiKey && config.apiKey.length > 5 && config.apiKey !== 'dummy') {
        try {
            const enterListRaw = await fetchJson('https://gen.pollinations.ai/text/models', {
                'Authorization': `Bearer ${config.apiKey}`
            });
            const enterList = Array.isArray(enterListRaw) ? enterListRaw : (enterListRaw.data || []);

            enterList.forEach((m: any) => {
                if (m.tools === false) return;
                const mapped = mapModel(m, 'enter/', '[Enter] ');
                modelsOutput.push(mapped);
            });
            log(`Total models (Free+Pro): ${modelsOutput.length}`);

        } catch (e) {
            log(`Error fetching Enterprise models: ${e}`);
            // Pas de fallback statique pour Enterprise, c'est le réseau qui décide.
        }
    }

    return modelsOutput;
}

// --- MAPPING ENGINE ---

function mapModel(raw: any, prefix: string, namePrefix: string): OpenCodeModel {
    const rawId = raw.id || raw.name;
    const fullId = prefix + rawId; // ex: "free/gemini" or "enter/nomnom" (prefix passed is "enter/")

    let baseName = raw.description;
    if (!baseName || baseName === rawId) {
        baseName = formatName(rawId, raw.censored !== false);
    }

    // CLEANUP: Simple Truncation Rule (Requested by User)
    // "Start from left, find ' - ', delete everything after."
    if (baseName && baseName.includes(' - ')) {
        baseName = baseName.split(' - ')[0].trim();
    }

    const finalName = `${namePrefix}${baseName}`;

    const modelObj: OpenCodeModel = {
        id: fullId,
        name: finalName,
        object: 'model',
        variants: {}
    };

    // --- ENRICHISSEMENT ---
    if (raw.reasoning === true || rawId.includes('thinking') || rawId.includes('reasoning')) {
        modelObj.variants = { ...modelObj.variants, high_reasoning: { options: { reasoningEffort: "high", budgetTokens: 16000 } } };
    }
    if (rawId.includes('gemini') && !rawId.includes('fast')) {
        if (!modelObj.variants.high_reasoning && (rawId === 'gemini' || rawId === 'gemini-large')) {
            modelObj.variants.high_reasoning = { options: { reasoningEffort: "high", budgetTokens: 16000 } };
        }
    }
    if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama')) {
        modelObj.variants.safe_tokens = { options: { maxTokens: 8000 } };
    }
    // NOVA FIX: Bedrock limit ~10k (User reported error > 10000)
    // We MUST set the limit on the model object itself so OpenCode respects it by default.
    if (rawId.includes('nova')) {
        modelObj.limit = {
            output: 8000,
            context: 128000 // Nova Micro/Lite/Pro usually 128k
        };
        // Also keep variant just in case
        modelObj.variants.bedrock_safe = { options: { maxTokens: 8000 } };
    }
    // NOMNOM FIX: User reported error if max_tokens is missing.
    // Also it is a 'Gemini-scrape' model, so we treat it similar to Gemini but with strict limit.
    if (rawId.includes('nomnom') || rawId.includes('scrape')) {
        modelObj.limit = {
            output: 2048, // User used 1500 successfully
            context: 32768
        };
    }
    if (rawId.includes('fast') || rawId.includes('flash') || rawId.includes('lite')) {
        if (!rawId.includes('gemini')) {
            modelObj.variants.speed = { options: { thinking: { disabled: true } } };
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

        if (actualModel.startsWith('enter/')) {
            // ENTERPRISE -> gen.pollinations.ai/v1
            if (!config.apiKey) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                // Return descriptive error? Or 404? 
                // Return proper auth error
                res.end(JSON.stringify({ error: { message: "API Key required for Enterprise models." } }));
                return;
            }
            targetUrl = 'https://gen.pollinations.ai/v1/chat/completions';
            authHeader = `Bearer ${config.apiKey}`;
            actualModel = actualModel.replace('enter/', '');
            isEnterprise = true;
            log(`Routing to ENTERPRISE: ${actualModel}`);
        } else if (actualModel.startsWith('free/')) {
            // FREE -> text.pollinations.ai/openai
            targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
            authHeader = undefined; // STRICT: No Auth
            actualModel = actualModel.replace('free/', '');
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

##### 📄 `src/server/quota.ts`

```typescript

import * as fs from 'fs';
import { loadConfig } from './config.js';

// === INTERFACES (copiées de pollinations-usage) ===

interface Profile {
    name: string;
    email: string;
    githubUsername: string;
    tier: string;
    createdAt: string;
    nextResetAt: string;
}

interface DetailedUsageEntry {
    timestamp: string;
    type: string;
    model: string;
    meter_source: 'tier' | 'pack';
    cost_usd: number;
    // ... autres champs simplifiés
}

interface ResetInfo {
    nextReset: Date;
    lastReset: Date;
    timeUntilReset: number;
    timeSinceReset: number;
    resetHour: number;
    resetMinute: number;
    resetSecond: number;
    progressPercent: number;
}

export interface QuotaStatus {
    // État actuel
    tierRemaining: number;      // Pollen gratuit restant
    tierUsed: number;           // Pollen gratuit utilisé
    tierLimit: number;          // Limite du tier (1/3/10/20)
    walletBalance: number;      // Solde wallet payant

    // Infos reset
    nextResetAt: Date;
    timeUntilReset: number;     // ms

    // Flags de décision
    canUseEnterprise: boolean;  // tier > 0 OU wallet > 0
    isUsingWallet: boolean;     // tier === 0 ET wallet > 0
    needsAlert: boolean;        // Sous le seuil configuré

    // Pour les toasts
    tier: string;               // 'spore', 'seed', 'flower', 'nectar'
    tierEmoji: string;
}

// === CACHE ===

const CACHE_TTL = 30000; // 30 secondes
let cachedQuota: QuotaStatus | null = null;
let lastQuotaFetch: number = 0;

// === TIER LIMITS ===

const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

// === FONCTIONS PRINCIPALES ===

export async function getQuotaStatus(forceRefresh = false): Promise<QuotaStatus> {
    const config = loadConfig();

    if (!config.apiKey) {
        // Pas de clé = Mode manual par défaut, pas de quota
        return {
            tierRemaining: 0,
            tierUsed: 0,
            tierLimit: 0,
            walletBalance: 0,
            nextResetAt: new Date(),
            timeUntilReset: 0,
            canUseEnterprise: false,
            isUsingWallet: false,
            needsAlert: false,
            tier: 'none',
            tierEmoji: '❌'
        };
    }

    const now = Date.now();
    if (!forceRefresh && cachedQuota && (now - lastQuotaFetch) < CACHE_TTL) {
        return cachedQuota;
    }

    try {
        // Fetch parallèle
        const [profileRes, balanceRes, usageRes] = await Promise.all([
            fetchAPI<Profile>('/account/profile', config.apiKey),
            fetchAPI<{ balance: number }>('/account/balance', config.apiKey),
            fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey)
        ]);

        const profile = profileRes;
        const balance = balanceRes.balance;
        const usage = usageRes.usage || [];

        const tierInfo = TIER_LIMITS[profile.tier] || { pollen: 1, emoji: '❓' }; // Default 1 (Spore)
        const tierLimit = tierInfo.pollen;

        // Calculer le reset
        const resetInfo = calculateResetInfo(profile.nextResetAt);

        // Calculer l'usage de la période actuelle
        const { tierUsed } = calculateCurrentPeriodUsage(usage, resetInfo);

        const tierRemaining = Math.max(0, tierLimit - tierUsed);

        // Le wallet c'est le reste (balance totale - ce qu'il reste du tier gratuit non consommé)
        // Attention: l'API balance retourne le TOTAL (credits + free tier potentiellement)
        // Mais pour simplifier, on considère que si tierRemaining > 0, on tape dans le tier, 
        // et le solde wallet "payant" réel est balance - tierRemaining.
        // Si tierRemaining = 0, balance est le vrai solde payant.
        const walletBalance = Math.max(0, balance - tierRemaining);

        cachedQuota = {
            tierRemaining,
            tierUsed,
            tierLimit,
            walletBalance,
            nextResetAt: resetInfo.nextReset,
            timeUntilReset: resetInfo.timeUntilReset,
            canUseEnterprise: tierRemaining > 0.05 || walletBalance > 0.05, // Marge de sécurité
            isUsingWallet: tierRemaining <= 0.05 && walletBalance > 0.05,
            needsAlert: (tierRemaining / tierLimit * 100) <= config.thresholds.tier,
            tier: profile.tier,
            tierEmoji: tierInfo.emoji
        };

        lastQuotaFetch = now;
        return cachedQuota;

    } catch (e) {
        logQuota(`Error fetching quota: ${e}`);
        // Retourner le cache ou un état par défaut safe
        return cachedQuota || {
            tierRemaining: 0,
            tierUsed: 0,
            tierLimit: 1,
            walletBalance: 0,
            nextResetAt: new Date(),
            timeUntilReset: 0,
            canUseEnterprise: false,
            isUsingWallet: false,
            needsAlert: true,
            tier: 'error',
            tierEmoji: '⚠️'
        };
    }
}

// === HELPERS ===

async function fetchAPI<T>(endpoint: string, apiKey: string): Promise<T> {
    const response = await fetch(`https://gen.pollinations.ai${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'opencode-pollinations-plugin/4.0.0'
        }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

function calculateResetInfo(nextResetAt: string): ResetInfo {
    const nextResetFromAPI = new Date(nextResetAt);
    const now = new Date();

    // Extraire l'heure de reset depuis l'API (varie par utilisateur!)
    const resetHour = nextResetFromAPI.getUTCHours();
    const resetMinute = nextResetFromAPI.getUTCMinutes();
    const resetSecond = nextResetFromAPI.getUTCSeconds();

    // Calculer le reset d'aujourd'hui à cette heure
    const todayResetUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        resetHour,
        resetMinute,
        resetSecond
    ));

    let lastReset: Date;
    let nextReset: Date;

    if (now >= todayResetUTC) {
        // Le reset d'aujourd'hui est passé
        lastReset = todayResetUTC;
        nextReset = new Date(todayResetUTC.getTime() + 24 * 60 * 60 * 1000);
    } else {
        // Le reset d'aujourd'hui n'est pas encore passé
        lastReset = new Date(todayResetUTC.getTime() - 24 * 60 * 60 * 1000);
        nextReset = todayResetUTC;
    }

    const timeUntilReset = nextReset.getTime() - now.getTime();
    const timeSinceReset = now.getTime() - lastReset.getTime();
    const cycleDuration = 24 * 60 * 60 * 1000;
    const progressPercent = (timeSinceReset / cycleDuration) * 100;

    return {
        nextReset,
        lastReset,
        timeUntilReset,
        timeSinceReset,
        resetHour,
        resetMinute,
        resetSecond,
        progressPercent
    };
}

function calculateCurrentPeriodUsage(
    usage: DetailedUsageEntry[],
    resetInfo: ResetInfo
): { tierUsed: number; packUsed: number } {
    let tierUsed = 0;
    let packUsed = 0;

    // Parser le timestamp de l'API avec Z pour UTC
    function parseUsageTimestamp(timestamp: string): Date {
        // Format: "2026-01-23 01:11:21"
        const isoString = timestamp.replace(' ', 'T') + 'Z';
        return new Date(isoString);
    }

    // FILTRER: Ne garder que les entrées APRÈS le dernier reset
    const entriesAfterReset = usage.filter(entry => {
        const entryTime = parseUsageTimestamp(entry.timestamp);
        return entryTime >= resetInfo.lastReset;
    });

    for (const entry of entriesAfterReset) {
        if (entry.meter_source === 'tier') {
            tierUsed += entry.cost_usd;
        } else if (entry.meter_source === 'pack') {
            packUsed += entry.cost_usd;
        }
    }

    return { tierUsed, packUsed };
}

function logQuota(msg: string) {
    try {
        fs.appendFileSync('/tmp/pollinations-quota.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

// === EXPORT POUR LES ALERTES ===

export function formatQuotaForToast(quota: QuotaStatus): string {
    const tierPercent = quota.tierLimit > 0
        ? Math.round((quota.tierRemaining / quota.tierLimit) * 100)
        : 0;

    // Format compact: 1h23m
    const ms = quota.timeUntilReset;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const resetIn = `${hours}h${minutes}m`;

    return `${quota.tierEmoji} Tier: ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} (${tierPercent}%) | 💎 Wallet: $${quota.walletBalance.toFixed(2)} | ⏰ Reset: ${resetIn}`;
}

```

##### 📄 `src/server/router.ts`

```typescript

import { loadConfig, PollinationsConfigV4 } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';
import { emitToast } from './toast.js';

// === INTERFACES ===

export interface RoutingDecision {
    targetUrl: string;
    actualModel: string;
    authHeader?: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
}

// === MAIN ROUTER ===

export async function resolveRouting(
    requestedModel: string,
    isAgent: boolean = false
): Promise<RoutingDecision> {
    const config = loadConfig();

    // Normalisation de l'ID modèle pour l'analyse
    // Peut arriver sous forme: "pollinations/free/gemini" OU "free/gemini"

    const isEnterprise = requestedModel.includes('/enter/') || requestedModel.startsWith('enter/');
    const isFree = requestedModel.includes('/free/') || requestedModel.startsWith('free/');

    // Extraction du "baseModel" (ex: "gemini", "openai")
    let baseModel = requestedModel;
    baseModel = baseModel.replace(/^pollinations\//, ''); // Remove plugin prefix
    baseModel = baseModel.replace(/^(enter|free)\//, ''); // Remove tier prefix

    // === MODE MANUAL ===
    if (config.mode === 'manual') {
        if (isEnterprise && config.apiKey) {
            return {
                targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                actualModel: baseModel,
                authHeader: `Bearer ${config.apiKey}`,
                fallbackUsed: false
            };
        }
        // Default Free
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }

    // === MODES INTELLIGENTS ===

    if (!config.apiKey) {
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }

    const quota = await getQuotaStatus();
    handleQuotaAlerts(quota, config);

    // === ALWAYSFREE ===
    if (config.mode === 'alwaysfree') {
        if (isEnterprise) {
            if (quota.tierRemaining > 0) {
                return {
                    targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                    actualModel: baseModel,
                    authHeader: `Bearer ${config.apiKey}`,
                    fallbackUsed: false
                };
            } else {
                const fallbackModel = isAgent ? config.fallbackModels.agent : config.fallbackModels.main;
                emitToast('warning', `Quota Free épuisé 🛑 → Relai sur ${fallbackModel} gratuit 🔀`, 'Mode AlwaysFree');
                return {
                    targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                    actualModel: fallbackModel,
                    authHeader: undefined,
                    fallbackUsed: true,
                    fallbackReason: 'tier_exhausted'
                };
            }
        }
        // Free
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }

    // === PRO ===
    if (config.mode === 'pro') {
        if (isEnterprise) {
            if (quota.canUseEnterprise) {
                if (quota.isUsingWallet) {
                    emitToast('info', `Tier épuisé → Utilisation du Wallet ($${quota.walletBalance.toFixed(2)})`, 'Mode Pro');
                }
                return {
                    targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                    actualModel: baseModel,
                    authHeader: `Bearer ${config.apiKey}`,
                    fallbackUsed: false
                };
            } else {
                const fallbackModel = isAgent ? config.fallbackModels.agent : config.fallbackModels.main;
                emitToast('error', `💸 Wallet épuisé ! Fallback sur ${fallbackModel}`, 'Mode Pro');
                return {
                    targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                    actualModel: fallbackModel,
                    authHeader: undefined,
                    fallbackUsed: true,
                    fallbackReason: 'wallet_exhausted'
                };
            }
        }
        // Free
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }

    // Default
    return {
        targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
        actualModel: baseModel,
        authHeader: undefined,
        fallbackUsed: false
    };
}

function handleQuotaAlerts(quota: QuotaStatus, config: PollinationsConfigV4) {
    if (quota.needsAlert && quota.tierLimit > 0) {
        const tierPercent = Math.round((quota.tierRemaining / quota.tierLimit) * 100);
        emitToast('warning', `⚠️ Quota Tier à ${tierPercent}%`, 'Alerte Quota');
    }
}

```

##### 📄 `src/server/toast.ts`

```typescript

import * as fs from 'fs';

// === INTERFACES ===

interface ToastMessage {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    displayed: boolean;
}

// === QUEUE GLOBALE ===

const toastQueue: ToastMessage[] = [];

// === FONCTIONS PUBLIQUES ===

export function emitToast(
    type: ToastMessage['type'],
    message: string,
    title?: string
) {
    const toast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: title || getDefaultTitle(type),
        message,
        timestamp: Date.now(),
        displayed: false
    };

    toastQueue.push(toast);
    logToast(toast);

    // Limiter la queue à 20 messages
    while (toastQueue.length > 20) {
        toastQueue.shift();
    }
}

export function getPendingToasts(): ToastMessage[] {
    return toastQueue.filter(t => !t.displayed);
}

export function markToastDisplayed(id: string) {
    const toast = toastQueue.find(t => t.id === id);
    if (toast) toast.displayed = true;
}

export function clearToasts() {
    toastQueue.length = 0;
}

// === HELPERS ===

function getDefaultTitle(type: ToastMessage['type']): string {
    switch (type) {
        case 'info': return '🌸 Pollinations';
        case 'warning': return '⚠️ Attention';
        case 'error': return '❌ Erreur';
        case 'success': return '✅ Succès';
    }
}

function logToast(toast: ToastMessage) {
    try {
        const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.type.toUpperCase()}] ${toast.title}: ${toast.message}`;
        fs.appendFileSync('/tmp/pollinations-toasts.log', logLine + '\n');
    } catch (e) { }
}

// === INTEGRATION OPENCODE ===
// Ces hooks sont utilisés dans index.ts

export function createToastHooks() {
    return {
        // Hook appelé quand une session devient idle (fin de multi-turn)
        'session.idle': async ({ event }: any) => {
            const config = await import('./config.js').then(m => m.loadConfig());

            // Afficher les toasts en attente
            const pending = getPendingToasts();
            for (const toast of pending) {
                // Ici on utiliserait l'API OpenCode pour afficher
                // Pour l'instant on log
                console.log(`[TOAST] ${toast.title}: ${toast.message}`);
                markToastDisplayed(toast.id);
            }

            // Si verbosity = 'always', afficher le bilan
            if (config.toastVerbosity === 'all') {
                const { getQuotaStatus, formatQuotaForToast } = await import('./quota.js');
                const quota = await getQuotaStatus(true); // Force refresh
                console.log(`[BILAN] ${formatQuotaForToast(quota)}`);
            }
        }
    };
}

```

