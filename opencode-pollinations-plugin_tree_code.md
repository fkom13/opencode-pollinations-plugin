# Documentation du projet: opencode-pollinations-plugin

> Généré le 28/01/2026 02:36:56

## 📂 Structure du projet

```
└── opencode-pollinations-plugin
    ├── bin
    │   └── setup.js
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
    │       ├── status.ts
    │       └── toast.ts
    └── tsconfig.json
```

## 📝 Contenu des fichiers

### 📄 `package.json`

```json
{
    "name": "opencode-pollinations-plugin",
    "displayName": "Pollinations AI (V5.1)",
    "version": "5.2.4",
    "description": "Native Pollinations.ai Provider Plugin for OpenCode",
    "publisher": "pollinations",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/fkom13/opencode-pollinations-plugin.git"
    },
    "type": "module",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "bin": {
        "opencode-pollinations-plugin": "./bin/setup.js"
    },
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "engines": {
        "vscode": "^1.80.0"
    },
    "activationEvents": [
        "onStartupFinished"
    ],
    "scripts": {
        "build": "tsc",
        "prepare": "npm run build",
        "package": "npx vsce package"
    },
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

### 📁 bin

#### 📄 `bin/setup.js`

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

// VERSION CHECK
if (args.includes('--version') || args.includes('-v')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    console.log(pkg.version);
    process.exit(0);
}

console.log('🌸 Pollinations Plugin Setup');

// 1. Locate Config
const configDir = path.join(os.homedir(), '.config', 'opencode');
const configFile = path.join(configDir, 'opencode.json');

if (!fs.existsSync(configFile)) {
    console.error(`❌ OpenCode config not found at: ${configFile}`);
    console.log('   Please run OpenCode once to generate it.');
    process.exit(1);
}

// 2. Read Config
let config;
try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
    console.error('❌ Failed to parse opencode.json');
    process.exit(1);
}

// 3. Detect Plugin Path
// We use the absolute path of THIS package installation to be safe
const pluginPath = path.resolve(__dirname, '..');
console.log(`📍 Plugin Path: ${pluginPath}`);

// 4. Update Config
if (!config.plugin) {
    config.plugin = [];
}

const pluginName = 'opencode-pollinations-plugin';
const alreadyExists = config.plugin.some(p => p === pluginName || p.includes('opencode-pollinations-plugin'));

if (!alreadyExists) {
    // We strive to use the CLEAN name if possible, but fallback to absolute path if installed locally
    // For global installs, absolute path is safest across envs
    config.plugin.push(pluginPath);
    console.log('✅ Added plugin to configuration.');

    // Backup
    fs.writeFileSync(configFile + '.bak', fs.readFileSync(configFile));

    // Write
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    console.log(`✨ Configuration saved: ${configFile}`);
} else {
    console.log('✅ Plugin already configured.');
}

console.log('\n🚀 Setup Complete! Restart OpenCode to see models.');

```

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
import { createToastHooks, setGlobalClient } from './server/toast.js';
import { createStatusHooks } from './server/status.js';
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
                    version: "v5.2.0",
                    mode: config.mode
                }));
                return;
            }

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
            log(`[Proxy] Started V5.2 on port ${TRACKING_PORT}`);
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
    log("Plugin Initializing V5.2.0 (Stable)...");

    // START PROXY
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    setGlobalClient(ctx.client);
    const toastHooks = createToastHooks(ctx.client);
    const commandHooks = createCommandHooks();

    return {
        async config(config) {
            log("[Hook] config() called");

            // STARTUP only - No complex hot reload logic
            // The user must restart OpenCode to refresh this list if they change keys.
            const modelsArray = await generatePollinationsConfig();

            const modelsObj: any = {};
            for (const m of modelsArray) {
                modelsObj[m.id] = m;
            }

            if (!config.provider) config.provider = {};

            config.provider['pollinations'] = {
                id: 'pollinations',
                name: 'Pollinations V5.2 (Native)',
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...createStatusHooks(ctx.client),
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
import { loadConfig, saveConfig, PollinationsConfigV5 } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { getDetailedUsage, DetailedUsageEntry } from './pollinations-api.js';

// === CONSTANTS & PRICING ===
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

// === INTERFACE ===
interface CommandResult {
    handled: boolean;
    response?: string;
    error?: string;
}

// === MARKDOWN HELPERS ===

function formatPollen(amount: number): string {
    return `${amount.toFixed(2)} 🌼`;
}

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
}

function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

function progressBar(value: number, max: number): string {
    const percentage = max > 0 ? Math.round((value / max) * 10) : 0;
    const filled = '█'.repeat(percentage);
    const empty = '░'.repeat(10 - percentage);
    return `\`${filled}${empty}\` (${(value / max * 100).toFixed(0)}%)`;
}

// === STATISTICAL LOGIC ===

interface CurrentPeriodStats {
    tierUsed: number;
    tierRemaining: number;
    packUsed: number;
    totalRequests: number;
    inputTokens: number;
    outputTokens: number;
    models: Map<string, { requests: number; cost: number; source: 'tier' | 'pack'; inputTokens: number; outputTokens: number }>;
}

function parseUsageTimestamp(timestamp: string): Date {
    return new Date(timestamp.replace(' ', 'T') + 'Z');
}

function calculateResetDate(nextResetAt: Date) {
    const now = new Date();
    const lastReset = new Date(nextResetAt.getTime() - 24 * 60 * 60 * 1000);
    return lastReset;
}

function calculateCurrentPeriodStats(
    usage: DetailedUsageEntry[],
    lastReset: Date,
    tierLimit: number
): CurrentPeriodStats {
    let tierUsed = 0;
    let packUsed = 0;
    let totalRequests = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const models = new Map<string, { requests: number; cost: number; source: 'tier' | 'pack'; inputTokens: number; outputTokens: number }>();

    const entries = usage.filter(entry => {
        const t = parseUsageTimestamp(entry.timestamp);
        return t >= lastReset;
    });

    for (const entry of entries) {
        totalRequests++;
        inputTokens += (entry.input_text_tokens || 0);
        outputTokens += (entry.output_text_tokens || 0);

        if (entry.meter_source === 'tier') tierUsed += entry.cost_usd;
        else packUsed += entry.cost_usd;

        const modelName = entry.model || 'unknown';
        const existing = models.get(modelName) || { requests: 0, cost: 0, source: entry.meter_source, inputTokens: 0, outputTokens: 0 };
        existing.requests++;
        existing.cost += entry.cost_usd;
        existing.inputTokens += (entry.input_text_tokens || 0);
        existing.outputTokens += (entry.output_text_tokens || 0);
        models.set(modelName, existing);
    }

    return {
        tierUsed,
        tierRemaining: Math.max(0, tierLimit - tierUsed),
        packUsed,
        totalRequests,
        inputTokens,
        outputTokens,
        models
    };
}

// === COMMAND HANDLER ===

export async function handleCommand(command: string): Promise<CommandResult> {
    const parts = command.trim().split(/\s+/);

    if (!parts[0].startsWith('/poll')) {
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

    saveConfig({ mode: mode as PollinationsConfigV5['mode'] });
    const config = loadConfig();
    if (config.gui.status !== 'none') {
        emitStatusToast('success', `Mode changé vers: ${mode}`, 'Pollinations Config');
    }

    return {
        handled: true,
        response: `✅ Mode changé: ${mode}`
    };
}

async function handleUsageCommand(args: string[]): Promise<CommandResult> {
    const isFull = args[0] === 'full';

    try {
        const quota = await getQuotaStatus(true);
        const config = loadConfig();
        const resetDate = quota.nextResetAt.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const timeUntilReset = quota.nextResetAt.getTime() - Date.now();
        const durationStr = formatDuration(Math.max(0, timeUntilReset));

        let response = `### 🌸 Dashboard Pollinations (${config.mode.toUpperCase()})\n\n`;

        response += `**Ressources**\n`;
        response += `- **Tier**: ${quota.tierEmoji} ${quota.tier.toUpperCase()} (${quota.tierLimit} pollen/jour)\n`;
        response += `- **Quota**: ${formatPollen(quota.tierLimit - quota.tierRemaining)} / ${formatPollen(quota.tierLimit)}\n`;
        response += `- **Usage**: ${progressBar(quota.tierLimit - quota.tierRemaining, quota.tierLimit)}\n`;
        response += `- **Wallet**: $${quota.walletBalance.toFixed(2)}\n`;
        response += `- **Reset**: ${resetDate} (dans ${durationStr})\n`;

        if (isFull && config.apiKey) {
            const usageData = await getDetailedUsage(config.apiKey);
            if (usageData && usageData.usage) {
                const lastReset = calculateResetDate(quota.nextResetAt);
                const stats = calculateCurrentPeriodStats(usageData.usage, lastReset, quota.tierLimit);

                response += `\n### 📊 Détail Période (depuis ${lastReset.toLocaleTimeString()})\n`;
                response += `**Total Requêtes**: ${stats.totalRequests} | **Tokens**: In ${formatTokens(stats.inputTokens)} / Out ${formatTokens(stats.outputTokens)}\n\n`;

                response += `| Modèle | Reqs | Coût | Tokens |\n`;
                response += `| :--- | :---: | :---: | :---: |\n`;

                const sorted = Array.from(stats.models.entries()).sort((a, b) => b[1].cost - a[1].cost);
                for (const [model, data] of sorted) {
                    response += `| \`${model}\` | ${data.requests} | ${formatPollen(data.cost)} | ${formatTokens(data.inputTokens + data.outputTokens)} |\n`;
                }
            } else {
                response += `\n> ⚠️ *Impossible de récupérer l'historique détaillé.*\n`;
            }
        } else if (isFull) {
            response += `\n> ⚠️ *Mode Full nécessite une API Key.*\n`;
        } else {
            response += `\n_Tapez_ \`/pollinations usage full\` _pour le détail._\n`;
        }

        return { handled: true, response: response.trim() };

    } catch (e) {
        return { handled: true, error: `Erreur: ${e}` };
    }
}

function handleFallbackCommand(args: string[]): CommandResult {
    const [main, agent] = args;

    if (!main) {
        const config = loadConfig();
        const freeConfig = `Free: main=${config.fallbacks.free.main}, agent=${config.fallbacks.free.agent}`;
        const enterConfig = `Enter: agent=${config.fallbacks.enter.agent}`;
        return {
            handled: true,
            response: `Fallbacks actuels:\n${freeConfig}\n${enterConfig}`
        };
    }

    // Default behavior for "/poll fallback <model> <agent>" is setting FREE fallbacks
    // User needs to use commands (maybe add /poll fallback enter ...) later
    // For now, map to Free Fallback as it's the primary Safety Net

    const config = loadConfig();
    saveConfig({
        fallbacks: {
            ...config.fallbacks,
            free: {
                main: main,
                agent: agent || config.fallbacks.free.agent
            }
        }
    });

    return {
        handled: true,
        response: `✅ Fallback (Free) configuré: main=${main}, agent=${agent || config.fallbacks.free.agent}`
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

    if (key === 'toast_verbosity' && value) {
        // BACKWARD COMPAT (Maps to Status GUI)
        if (!['none', 'alert', 'all'].includes(value)) {
            return { handled: true, error: 'Valeurs: none, alert, all' };
        }
        const config = loadConfig();
        saveConfig({
            gui: {
                ...config.gui,
                status: value as 'alert' | 'all' | 'none'
            }
        });
        return { handled: true, response: `✅ status_gui = ${value} (Legacy Mapping)` };
    }

    if (key === 'status_gui' && value) {
        if (!['none', 'alert', 'all'].includes(value)) return { handled: true, error: 'Valeurs: none, alert, all' };
        const config = loadConfig();
        saveConfig({ gui: { ...config.gui, status: value as 'alert' | 'all' | 'none' } });
        return { handled: true, response: `✅ status_gui = ${value}` };
    }

    if (key === 'logs_gui' && value) {
        if (!['none', 'error', 'verbose'].includes(value)) return { handled: true, error: 'Valeurs: none, error, verbose' };
        const config = loadConfig();
        saveConfig({ gui: { ...config.gui, logs: value as 'error' | 'verbose' | 'none' } });
        return { handled: true, response: `✅ logs_gui = ${value}` };
    }

    if (key === 'threshold_tier' && value) {
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            return { handled: true, error: 'Valeur entre 0 et 100 requise' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, tier: threshold } });
        return { handled: true, response: `✅ threshold_tier = ${threshold}%` };
    }

    if (key === 'threshold_wallet' && value) {
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            return { handled: true, error: 'Valeur entre 0 et 100 requise' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, wallet: threshold } });
        return { handled: true, response: `✅ threshold_wallet = ${threshold}%` };
    }

    if (key === 'status_bar' && value) {
        const enabled = value === 'true';
        saveConfig({ statusBar: enabled });
        return { handled: true, response: `✅ status_bar = ${enabled}` };
    }

    return {
        handled: true,
        error: `Clé inconnue: ${key}. Clés: status_gui, logs_gui, threshold_tier, threshold_wallet, status_bar`
    };
}

function handleHelpCommand(): CommandResult {
    const help = `
### 🌸 Pollinations Plugin - Commandes V5

- **\`/pollinations mode [mode]\`**: Change le mode (manual, alwaysfree, pro).
- **\`/pollinations usage [full]\`**: Affiche le dashboard (full = détail).
- **\`/pollinations fallback <main> [agent]\`**: Configure le Safety Net (Free).
- **\`/pollinations config [key] [value]\`**:
  - \`status_gui\`: none, alert, all (Status Dashboard).
  - \`logs_gui\`: none, error, verbose (Logs Techniques).
  - \`threshold_tier\`: 0-100 (Alerte %).
  - \`threshold_wallet\`: 0-100 (Safety Net %).
  - \`status_bar\`: true/false (Widget).
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

// PATHS
const HOMEDIR = os.homedir();
const CONFIG_DIR_POLLI = path.join(HOMEDIR, '.pollinations');
const CONFIG_FILE = path.join(CONFIG_DIR_POLLI, 'config.json');
const CONFIG_DIR_OPENCODE = path.join(HOMEDIR, '.config', 'opencode');
const OPENCODE_CONFIG_FILE = path.join(CONFIG_DIR_OPENCODE, 'opencode.json');
const AUTH_FILE = path.join(HOMEDIR, '.local', 'share', 'opencode', 'auth.json');

// === V5 CONFIGURATION SCHEMA ===

export interface PollinationsConfigV5 {
    version: string | number;
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;

    gui: {
        status: 'none' | 'alert' | 'all';
        logs: 'none' | 'error' | 'verbose';
    };

    thresholds: {
        tier: number;
        wallet: number;
    };

    fallbacks: {
        free: { main: string; agent: string; };
        enter: { agent: string; };
    };

    enablePaidTools: boolean;
    statusBar: boolean;
}

// LOAD PACKAGE VERSION
let PKG_VERSION = '5.2.0';
try {
    const pkgPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        PKG_VERSION = pkg.version;
    }
} catch (e) { }

const DEFAULT_CONFIG_V5: PollinationsConfigV5 = {
    version: PKG_VERSION,
    mode: 'manual',
    gui: { status: 'alert', logs: 'none' },
    thresholds: { tier: 10, wallet: 5 },
    fallbacks: {
        free: { main: 'free/mistral', agent: 'free/openai-fast' },
        enter: { agent: 'free/gemini' }
    },
    enablePaidTools: false,
    statusBar: true
};

function logConfig(msg: string) {
    try {
        if (!fs.existsSync('/tmp/opencode_pollinations_config_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_config_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_config_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

// SIMPLE LOAD (Direct Disk Read - No Caching, No Watchers)
// This ensures the Proxy ALWAYS sees the latest state from auth.json
export function loadConfig(): PollinationsConfigV5 {
    return readConfigFromDisk();
}

function readConfigFromDisk(): PollinationsConfigV5 {
    let config: any = { ...DEFAULT_CONFIG_V5 };
    let keyFound = false;

    // 1. Custom Config
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom };
            if (config.apiKey) keyFound = true;
        }
    } catch (e) { logConfig(`Error loading config: ${e}`); }

    // 2. Auth Store (Priority)
    if (!keyFound) {
        try {
            if (fs.existsSync(AUTH_FILE)) {
                const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
                const authData = JSON.parse(raw);
                const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];

                if (entry) {
                    const key = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (key && typeof key === 'string' && key.length > 10) {
                        config.apiKey = key;
                        config.mode = 'pro';
                        keyFound = true;
                    }
                }
            }
        } catch (e) { logConfig(`Error reading auth.json: ${e}`); }
    }

    // 3. OpenCode Config (Fallback)
    if (!keyFound) {
        try {
            if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
                const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
                const data = JSON.parse(raw);
                const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                    data?.provider?.pollinations_enter?.options?.apiKey;

                if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                    config.apiKey = nativeKey;
                    config.mode = 'pro';
                    keyFound = true;
                }
            }
        } catch (e) { }
    }

    if (!keyFound && config.mode === 'pro') {
        config.mode = 'manual';
    }

    return { ...config, version: PKG_VERSION } as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        const current = readConfigFromDisk();
        const updated = { ...current, ...updates, version: PKG_VERSION };

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

// --- MAIN GENERATOR logic ---

export async function generatePollinationsConfig(forceApiKey?: string): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Configuration (V5.1.22 Hot-Reload)...`);

    // Use forced key (from Hook) or cached key
    const effectiveKey = forceApiKey || config.apiKey;

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
        // Fallback Robust (Offline support)
        modelsOutput.push({ id: "free/mistral", name: "[Free] Mistral Nemo (Fallback)", object: "model", variants: {} });
        modelsOutput.push({ id: "free/openai", name: "[Free] OpenAI (Fallback)", object: "model", variants: {} });
        modelsOutput.push({ id: "free/gemini", name: "[Free] Gemini Flash (Fallback)", object: "model", variants: {} });
    }

    // 2. ENTERPRISE UNIVERSE
    if (effectiveKey && effectiveKey.length > 5 && effectiveKey !== 'dummy') {
        try {
            const enterListRaw = await fetchJson('https://gen.pollinations.ai/text/models', {
                'Authorization': `Bearer ${effectiveKey}`
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
            // Fallback Robust for Enterprise (User has Key but discovery failed)
            modelsOutput.push({ id: "enter/gpt-4o", name: "[Enter] GPT-4o (Fallback)", object: "model", variants: {} });
            modelsOutput.push({ id: "enter/claude-3-5-sonnet", name: "[Enter] Claude 3.5 Sonnet (Fallback)", object: "model", variants: {} });
            modelsOutput.push({ id: "enter/deepseek-reasoner", name: "[Enter] DeepSeek R1 (Fallback)", object: "model", variants: {} });
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
import { emitStatusToast } from './toast.js';

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

// CRASH GUARD
const CRASH_LOG = '/tmp/opencode_pollinations_crash.log';
process.on('uncaughtException', (err) => {
    try {
        const msg = `[CRASH] Uncaught Exception: ${err.message}\n${err.stack}\n`;
        fs.appendFileSync(CRASH_LOG, msg);
        console.error(msg);
    } catch (e) { }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    try {
        const msg = `[CRASH] Unhandled Rejection: ${reason}\n`;
        fs.appendFileSync(CRASH_LOG, msg);
    } catch (e) { }
});

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

// LIFECYCLE DEBUG (Sync Write)
const LIFE_LOG = '/tmp/POLLI_LIFECYCLE.log';
const LOC_LOG = '/tmp/POLLI_LOCATION.log'; // NEW: Track source location

try {
    fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [STARTUP] PID:${process.pid} Initializing...\n`);
    fs.writeFileSync(LOC_LOG, `[${new Date().toISOString()}] RUNNING FROM: ${__filename}\n`);
} catch (e) { }

process.on('exit', (code) => {
    try { fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [EXIT] PID:${process.pid} Exiting with code ${code}\n`); } catch (e) { }
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}`;
    log(`[SERVER] Started V3 Phase 3 (Auth Enabled) on port ${PORT}`);
    try { fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [LISTEN] PID:${process.pid} Listening on ${PORT}\n`); } catch (e) { }
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

// === ACCOUNT API (Usage & Quota) ===

export interface DetailedUsageEntry {
    timestamp: string;
    type: string;
    model: string;
    api_key: string;
    api_key_type: string;
    meter_source: 'tier' | 'pack';
    input_text_tokens: number;
    input_cached_tokens: number;
    input_audio_tokens: number;
    input_image_tokens: number;
    output_text_tokens: number;
    output_reasoning_tokens: number;
    output_audio_tokens: number;
    output_image_tokens: number;
    cost_usd: number;
    response_time_ms: number;
}

export interface DetailedUsageResponse {
    usage: DetailedUsageEntry[];
    count: number;
}

export async function getDetailedUsage(apiKey: string): Promise<DetailedUsageResponse | null> {
    if (!apiKey || apiKey.length < 10) return null;

    try {
        logDebug("Fetching Detailed Usage...");
        const response = await fetch('https://gen.pollinations.ai/account/usage', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            logDebug(`Usage API Error: ${response.status}`);
            return null;
        }

        const data: any = await response.json();
        // Handle varying response structures if necessary -> Assuming { usage: [...] }
        return data as DetailedUsageResponse;
    } catch (e) {
        logDebug(`Error Usage: ${e}`);
        return null;
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
        if (retries > 0 && (response.status === 429 || response.status >= 500)) {
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
            emitLogToast('info', `Routing to: FREE UNIVERSE (${actualModel})`, 'Pollinations Routing');
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

        // 3.6 STOP SEQUENCES (Prevent Looping - CRITICAL FIX)
        // Inject explicit stop sequences to prevent "User:" hallucinations
        if (!proxyBody.stop) {
            proxyBody.stop = ["\nUser:", "\nModel:", "User:", "Model:"];
        }

        // 3.5 PREPARE SIGNATURE HASHING
        let currentRequestHash: string | null = null;
        if (proxyBody.messages && proxyBody.messages.length > 0) {
            const lastMsg = proxyBody.messages[proxyBody.messages.length - 1];
            currentRequestHash = hashMessage(lastMsg);
        }

        // =========================================================
        // LOGIC BLOCK: MODEL SPECIFIC ADAPTATIONS
        // =========================================================

        if (proxyBody.tools && Array.isArray(proxyBody.tools)) {

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
            else if (
                (actualModel.includes("gemini") && !isEnterprise) ||
                (actualModel.includes("gemini") && actualModel.includes("fast"))
            ) {
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                if (hasFunctions) {
                    // 1. Disable Magic Grounding (Source of loops/crashes)
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };

                    // 2. Remove 'google_search' explicitly (Replica of V3.5.5 logic)
                    proxyBody.tools = proxyBody.tools.filter((t: any) => {
                        const isFunc = t.type === 'function' || t.function;
                        const name = t.function?.name || t.name;
                        return isFunc && name !== 'google_search';
                    });

                    // 3. Ensure tools are Vertex-Compatible
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
                    log(`[Proxy] Gemini Free: Tools RESTORED but Sanitized (No Search/Grounding).`);
                }
            }
            // B3. GEMINI ENTERPRISE 3.0+
            else if (actualModel.includes("gemini")) {
                const hasFunctions = proxyBody.tools.some((t: any) => t.type === 'function' || t.function);
                if (hasFunctions) {
                    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
                    // Keep Search Tool in List
                    proxyBody.tools = proxyBody.tools.filter((t: any) => t.type === 'function' || t.function);
                    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
                }
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

            // TRANSPARENT FALLBACK ON 4xx Errors (Payment, Rate Limit, Auth) IF Enterprise
            if ((fetchRes.status === 402 || fetchRes.status === 429 || fetchRes.status === 401 || fetchRes.status === 403) && isEnterprise) {
                log(`[SafetyNet] Upstream Rejection (${fetchRes.status}). Triggering Transparent Fallback.`);

                // 1. Switch Config
                actualModel = config.fallbacks.free.main.replace('free/', '');
                isEnterprise = false;
                isFallbackActive = true;

                if (fetchRes.status === 402) fallbackReason = "Insufficient Funds (Upstream 402)";
                else if (fetchRes.status === 429) fallbackReason = "Rate Limit (Upstream 429)";
                else if (fetchRes.status === 401) fallbackReason = "Invalid API Key (Upstream 401)";
                else fallbackReason = `Access Denied (${fetchRes.status})`;

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

            // Only emit if not silenced (handled inside emitStatusToast)
            emitStatusToast('info', fullMsg, 'Pollinations Status');
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
import * as https from 'https'; // Use Native HTTPS
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

// === LOGGING ===
function logQuota(msg: string) {
    try {
        fs.appendFileSync('/tmp/pollinations_quota_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

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
        logQuota("Fetching Quota Data...");

        // Fetch parallèle using HTTPS helper
        const [profileRes, balanceRes, usageRes] = await Promise.all([
            fetchAPI<Profile>('/account/profile', config.apiKey),
            fetchAPI<{ balance: number }>('/account/balance', config.apiKey),
            fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey)
        ]);

        logQuota(`Fetch Success. Tier: ${profileRes.tier}, Balance: ${balanceRes.balance}`);

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

        // Fix rounding errors
        const cleanTierRemaining = Math.max(0, parseFloat(tierRemaining.toFixed(4)));

        // Le wallet c'est le reste (balance totale - ce qu'il reste du tier gratuit non consommé)
        const walletBalance = Math.max(0, balance - cleanTierRemaining);
        const cleanWalletBalance = Math.max(0, parseFloat(walletBalance.toFixed(4)));

        cachedQuota = {
            tierRemaining: cleanTierRemaining,
            tierUsed,
            tierLimit,
            walletBalance: cleanWalletBalance,
            nextResetAt: resetInfo.nextReset,
            timeUntilReset: resetInfo.timeUntilReset,
            canUseEnterprise: cleanTierRemaining > 0.05 || cleanWalletBalance > 0.05,
            isUsingWallet: cleanTierRemaining <= 0.05 && cleanWalletBalance > 0.05,
            needsAlert: tierLimit > 0 ? (cleanTierRemaining / tierLimit * 100) <= config.thresholds.tier : false,
            tier: profile.tier,
            tierEmoji: tierInfo.emoji
        };

        lastQuotaFetch = now;
        return cachedQuota;

    } catch (e) {
        logQuota(`ERROR fetching quota: ${e}`);
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

// === HELPERS (Native HTTPS) ===

function fetchAPI<T>(endpoint: string, apiKey: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'gen.pollinations.ai',
            port: 443,
            path: endpoint,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'opencode-pollinations-plugin/5.1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e: any) {
                    reject(new Error(`JSON Parse Error: ${e.message}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Network Error: ${e.message}`));
        });

        req.end();
    });
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

##### 📄 `src/server/status.ts`

```typescript

import { loadConfig } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';

export function createStatusHooks(client: any) {
    return {
        'session.idle': async () => {
            const config = loadConfig();

            // Si la barre de statut est activée via 'status_bar' (bool)
            // L'utilisateur peut l'activer via /pollinations config status_bar true

            if (config.statusBar) {
                const quota = await getQuotaStatus(false);
                const statusText = formatStatus(quota);

                try {
                    // ASTUCE: Toasts longue durée (30s) rafraîchis à chaque idle
                    // Simule un widget persistent à droite.
                    await client.tui.showToast({
                        body: {
                            message: statusText,
                            variant: 'info',
                            duration: 30000
                        }
                    });
                } catch (e) { }
            }
        }
    };
}

function formatStatus(quota: QuotaStatus): string {
    const tierName = quota.tier === 'alwaysfree' ? 'Free' : quota.tier;
    return `${tierName} ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} 🌼 | Wallet $${quota.walletBalance.toFixed(2)}`;
}

```

##### 📄 `src/server/toast.ts`

```typescript
import * as fs from 'fs';
import { loadConfig } from './config.js';

// === QUEUE GLOBALE & CLIENT ===

interface ToastMessage {
    id: string;
    channel: 'status' | 'log';
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    displayed: boolean;
}

const toastQueue: ToastMessage[] = [];
let globalClient: any = null;

// === CONFIGURATION ===
// On charge la config au moment de l'émission pour décider

// === FONCTIONS PUBLIQUES ===

export function setGlobalClient(client: any) {
    globalClient = client;
}

// 1. CANAL LOGS (Technique)
export function emitLogToast(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title?: string
) {
    const config = loadConfig();
    const verbosity = config.gui.logs;

    if (verbosity === 'none') return;
    if (verbosity === 'error' && type !== 'error' && type !== 'warning') return;
    // 'verbose' shows all

    dispatchToast('log', type, message, title || 'Pollinations Log');
}

// 2. CANAL STATUS (Dashboard)
export function emitStatusToast(
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title?: string
) {
    const config = loadConfig();
    const verbosity = config.gui.status;

    if (verbosity === 'none') return;
    // 'alert' logic handled by caller (proxy.ts) usually, but we can filter here too? 
    // Actually, 'all' sends everything. 'alert' sends only warnings/errors.
    if (verbosity === 'alert' && type !== 'error' && type !== 'warning') return;

    dispatchToast('status', type, message, title || 'Pollinations Status');
}

// INTERNAL DISPATCHER
function dispatchToast(
    channel: 'status' | 'log',
    type: 'info' | 'warning' | 'error' | 'success',
    message: string,
    title: string
) {
    const toast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel,
        type,
        title,
        message,
        timestamp: Date.now(),
        displayed: false
    };

    toastQueue.push(toast);
    logToastToFile(toast);

    if (globalClient) {
        globalClient.tui.showToast({
            body: {
                title: toast.title,
                message: toast.message,
                variant: toast.type,
                duration: channel === 'status' ? 6000 : 4000 // Status stays longer
            }
        }).then(() => {
            toast.displayed = true;
        }).catch(() => { });
    }

    while (toastQueue.length > 20) {
        toastQueue.shift();
    }
}

// === HELPERS ===

function logToastToFile(toast: ToastMessage) {
    try {
        const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.channel.toUpperCase()}] [${toast.type.toUpperCase()}] ${toast.message}`;
        fs.appendFileSync('/tmp/pollinations-toasts.log', logLine + '\n');
    } catch (e) { }
}


export function createToastHooks(client: any) {
    return {
        'session.idle': async ({ event }: any) => {
            // Deprecated: We use immediate dispatch now. 
            // Kept for backward compat if needed or legacy queued items.
        }
    };
}

```

