# Documentation du projet: src

> Généré le 20/02/2026 01:01:57

## 📂 Structure du projet

```
└── src
    ├── index.ts
    ├── server
    │   ├── commands.ts
    │   ├── config.ts
    │   ├── connect-response.ts
    │   ├── generate-config.ts
    │   ├── logger.ts
    │   ├── models
    │   │   ├── cache.ts
    │   │   ├── fetcher.ts
    │   │   ├── index.ts
    │   │   └── types.ts
    │   ├── pollinations-api.ts
    │   ├── proxy.ts
    │   ├── quota.ts
    │   ├── status.ts
    │   └── toast.ts
    └── tools
        ├── design
        │   ├── gen_diagram.ts
        │   ├── gen_palette.ts
        │   └── gen_qrcode.ts
        ├── ffmpeg.ts
        ├── index.ts
        ├── pollinations
        │   ├── cost-guard.ts
        │   ├── deepsearch.ts
        │   ├── gen_audio.ts
        │   ├── gen_image.ts
        │   ├── gen_music.ts
        │   ├── gen_video.ts
        │   ├── polli_web_search.ts
        │   ├── search_crawl_scrape.ts
        │   ├── shared.ts
        │   └── transcribe_audio.ts
        ├── power
        │   ├── extract_audio.ts
        │   ├── extract_frames.ts
        │   ├── file_to_url.ts
        │   ├── remove_background.ts
        │   └── rmbg_keys.ts
        └── shared.ts
```

## 📝 Contenu des fichiers

### 📄 `index.ts`

```typescript

import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig, migrateLegacyConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks, createToolHooks, setGlobalClient } from './server/toast.js';
import { createStatusHooks } from './server/status.js';
import { createCommandHooks, setClientForCommands } from './server/commands.js';
import { createToolRegistry } from './tools/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import * as os from 'os';
import * as path from 'path';
import { log } from './server/logger.js';
import { ModelRegistry } from './server/models/index.js';

// Port killing removed: Using dynamic ports.

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            // ... (Request Handling) ...
            // We reuse the existing logic structure but simplified startup
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
                    version: require('../package.json').version,
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

        // Listen on random port (0) to avoid conflicts (CLI/IDE)
        server.listen(0, '127.0.0.1', () => {
            // @ts-ignore
            const assignedPort = (server.address() as net.AddressInfo).port;
            log(`[Proxy] Started v${require('../package.json').version} (Dynamic Port) on port ${assignedPort}`);
            resolve(assignedPort);
        });

        server.on('error', (e) => {
            log(`[Proxy] Fatal Error: ${e}`);
            resolve(0);
        });
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    const v = require('../package.json').version;
    log(`Plugin Initializing v${v}...`);
    log(`[ENV] Keys: ${Object.keys(process.env).filter(k => k.includes('OPENCODE') || k.includes('APP') || k.includes('DATA')).join(', ')}`);
    console.log(`🚀 POLLINATIONS PLUGIN v${v} LOADED 🚀`);

    // MIGRATE CONFIG
    migrateLegacyConfig();

    // START PROXY
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    // INIT MODEL REGISTRY (non-blocking, fire-and-forget)
    ModelRegistry.refresh().then(() => {
        const stats = ModelRegistry.stats();
        log(`[ModelRegistry] Ready: ${stats.image} image, ${stats.video} video, ${stats.audio} audio, ${stats.text} text`);
    }).catch(e => log(`[ModelRegistry] Init failed (will use fallback): ${e}`));

    setGlobalClient(ctx.client);
    setClientForCommands(ctx.client);
    const toastHooks = createToastHooks(ctx.client);
    const commandHooks = createCommandHooks();

    // Build tool registry (conditional on API key presence)
    const toolRegistry = createToolRegistry();
    log(`[Tools] ${Object.keys(toolRegistry).length} tools registered`);

    return {
        tool: toolRegistry,
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

            // Dynamic Provider Name
            const version = require('../package.json').version;
            config.provider['pollinations'] = {
                id: 'pollinations',
                name: `Pollinations AI (v${version})`,
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...createToolHooks(ctx.client),
        ...createStatusHooks(ctx.client),
        ...commandHooks
    };
};

export default PollinationsPlugin;

```

### 📁 server

#### 📄 `server/commands.ts`

```typescript
import * as https from 'https';
import { loadConfig, saveConfig, PollinationsConfigV5 } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { getDetailedUsage, DetailedUsageEntry } from './pollinations-api.js';
import { generatePollinationsConfig } from './generate-config.js';
import { ModelRegistry } from './models/index.js';
import type { PollinationsModel, ModelCategory } from './models/types.js';

// --- HELPER: STRICT PERMISSION CHECK ---
interface CheckResult { ok: boolean; status?: number | string; reason?: string; }

function checkEndpoint(ep: string, key: string): Promise<CheckResult> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'gen.pollinations.ai',
            path: ep,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`,
                'User-Agent': 'Pollinations-Plugin/5.6.0' // Identify cleanly
            }
        }, (res) => {
            const isJson = res.headers['content-type']?.includes('application/json');

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 && isJson) {
                    // Double Check Check Body for Logical Errors masked as 200
                    try {
                        const json = JSON.parse(data);
                        if (json.error || json.success === false) {
                            resolve({ ok: false, reason: "API Logical Error", status: 200 });
                        } else {
                            resolve({ ok: true });
                        }
                    } catch (e) {
                        resolve({ ok: false, reason: "Invalid JSON", status: 200 });
                    }
                } else {
                    resolve({ ok: false, status: res.statusCode, reason: isJson ? "API Error" : "Not JSON (Cloudflare?)" });
                }
            });
        });
        req.on('error', (e) => resolve({ ok: false, status: e.message || 'Error' }));
        req.setTimeout(10000, () => req.destroy()); // 10s Timeout
        req.end();
    });
}

export async function checkKeyPermissions(key: string): Promise<CheckResult> {
    // SEQUENTIAL CHECK (Avoid Rate Limits on Key Verification)
    const endpoints = ['/account/profile', '/account/balance', '/account/usage'];

    for (const ep of endpoints) {
        const res = await checkEndpoint(ep, key);
        if (!res.ok) {
            return { ok: false, reason: `${ep} (${res.status})` };
        }
    }
    return { ok: true };
}

// === CONSTANTS & PRICING ===
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    microbe: { pollen: 0.1, emoji: '🦠' },
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

let globalClient: any = null;
export function setClientForCommands(client: any) {
    globalClient = client;
}

export async function handleCommand(command: string): Promise<CommandResult> {
    const parts = command.trim().split(/\s+/);

    if (!parts[0].startsWith('/poll')) {
        return { handled: false };
    }

    const subCommand = parts[1];
    const args = parts.slice(2);

    switch (subCommand) {
        case 'mode':
            return await handleModeCommand(args);
        case 'usage':
            return await handleUsageCommand(args);
        case 'connect':
            return await handleConnectCommand(args);
        case 'fallback':
            return handleFallbackCommand(args);
        case 'config':
            return handleConfigCommand(args);
        case 'help':
            return handleHelpCommand();
        case 'models':
            return handleModelsCommand(args);
        case 'pricing':
            return handlePricingCommand();
        case 'addKey': // External trigger
            // UI Pollution Fix: User hates appendPrompt.
            // Just return a message telling them to use the tool.
            return {
                handled: true,
                response: "💡 Pour ajouter une clé : Utilisez l'outil `rmbg_keys`\nExemple : `rmbg_keys action=add key=bkgc_...`"
            };
        default:
            return {
                handled: true,
                error: `Commande inconnue: ${subCommand}. Utilisez /pollinations help`
            };
    }
}

// === SUB-COMMANDS ===

async function handleModeCommand(args: string[]): Promise<CommandResult> {
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

    const checkConfig = loadConfig();

    // JIT VERIFICATION for PRO and ALWAYSFREE Mode
    if (mode === 'pro' || mode === 'alwaysfree') {
        const checkConfig = loadConfig(); // Reload to be sure
        const key = checkConfig.apiKey;

        if (!key) {
            // If NO key, allow alwaysfree? Yes.
            // If HAS key, verify it? Yes.
            if (mode === 'pro') return { handled: true, error: "❌ Mode Pro nécessite une Clé API configurée." };
        }

        emitStatusToast('info', 'Vérification des droits...', 'Mode Pro');
        try {
            // Force verify permissions NOW
            const check = await checkKeyPermissions(key as string);
            if (!check.ok) {
                saveConfig({ mode: 'manual', keyHasAccessToProfile: false });
                return {
                    handled: true,
                    error: `❌ **Mode Refusé**\nVotre clé est limitée (Code ${check.status}: ${check.reason}).\nPassage en mode **manual**.`
                };
            }
            // Valid -> Ensure flag is true
            saveConfig({ keyHasAccessToProfile: true });
        } catch (e: any) {
            return { handled: true, error: `❌ Erreur de vérification: ${e.message}` };
        }
    }

    // Allow switch (if alwaysfree or manual, or verified pro)
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
            if (config.keyHasAccessToProfile === false) {
                response += `\n> ⚠️ *Votre clé API ne permet pas l'accès aux détails d'usage (Restriction).*`;
            } else {
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

async function handleConnectCommand(args: string[]): Promise<CommandResult> {
    const key = args[0];

    if (!key) {
        return {
            handled: true,
            error: `Utilisation: /pollinations connect <votre_clé_api>`
        };
    }

    // 1. Universal Validation (No Syntax Check) - Functional Check
    emitStatusToast('info', 'Vérification de la clé...', 'Pollinations Config');

    try {
        const models = await generatePollinationsConfig(key, true);

        // 2. Check if we got Enterprise models
        const enterpriseModels = models.filter(m => m.id.startsWith('enter/'));

        if (enterpriseModels.length > 0) {
            // SUCCESS
            saveConfig({ apiKey: key }); // Don't force mode 'pro'. Let user decide.

            const masked = key.substring(0, 6) + '...';
            // Count Paid Only models found
            const diamondCount = enterpriseModels.filter(m => m.name.includes('💎')).length;

            // CHECK RESTRICTIONS: Strict Check (Usage + Profile + Balance)
            let forcedModeMsg = "";
            let isLimited = false;
            let limitReason = "";

            try {
                // Strict Probe: Must be able to read ALL accounting data
                const check = await checkKeyPermissions(key);
                if (!check.ok) {
                    isLimited = true;
                    limitReason = check.reason || "Unknown";
                }
            } catch (e: any) { isLimited = true; limitReason = e.message; }

            // If Limited -> FORCE MANUAL
            if (isLimited) {
                saveConfig({ apiKey: key, mode: 'manual', keyHasAccessToProfile: false });
                forcedModeMsg = `\n⚠️ **Clé Limitée** (Echec: ${limitReason}) -> Mode **MANUEL** forcé.\n*Requis pour mode Auto: Profile, Balance & Usage.*`;
            } else {
                saveConfig({ apiKey: key, keyHasAccessToProfile: true }); // Let user keep current mode or default
            }

            emitStatusToast('success', `Clé Valide! (${enterpriseModels.length} modèles Pro débloqués)`, 'Pollinations Config');

            return {
                handled: true,
                response: `✅ **Connexion Réussie!**\n- Clé: \`${masked}\`\n- Modèles Débloqués: ${enterpriseModels.length} (dont ${diamondCount} 💎 Paid)${forcedModeMsg}`
            };
        } else {
            // FAILURE (Valid JSON but no Enterprise models - likely Invalid Key or Free plan only?)
            // If key is invalid, generatePollinationsConfig usually returns fallback free models BUT
            // we specifically checked 'enter/'. If 0 enterprise models found for a *provided* key, it's suspicious.
            // Actually config generator returns Free models + Enter models if key works.
            // If key is BAD, fetchJson throws/logs error, and returns fallbacks (Enter GPT-4o Fallback).
            // Wait, generate-config falls back to providing a list containing "[Enter] GPT-4o (Fallback)" if fetch failed.
            // So we need to detect if it's a "REAL" fetch or a "FALLBACK" fetch.
            // The fallback models have `variants: {}` usually, but real ones might too.
            // A better check: The fallback list is hardcoded in generate-config.ts catch block.
            // Let's modify generate-config to return EMPTY list on error?
            // Or just check if the returned models work?
            // Simplest: If `generatePollinationsConfig` returns any model starting with `enter/` that includes "(Fallback)" in name, we assume failure?
            // "GPT-4o (Fallback)" is the name.

            const isFallback = models.some(m => m.name.includes('(Fallback)') && m.id.startsWith('enter/'));

            if (isFallback) {
                throw new Error("Clé rejetée par l'API (Accès refusé ou invalide).");
            }

            // If we are here, we got no enter models, or empty list?
            // If key is valid but has no access?
            throw new Error("Aucun modèle Enterprise détecté pour cette clé.");
        }

    } catch (e: any) {
        // 3. FAILURE HANDLING - Revert to FREE
        saveConfig({ apiKey: undefined, mode: 'manual' }); // Clear Key, Set Manual

        emitStatusToast('error', `Clé Invalide. Retour au mode Gratuit.`, 'Pollinations Config');
        return {
            handled: true,
            error: `❌ **Échec Connexion**: ${e.message || e}\n\nLa configuration a été réinitialisée (Mode Gratuit/Manuel).`
        };
    }
}

function handleConfigCommand(args: string[]): CommandResult {
    const [key, value] = args;

    if (!key) {
        const config = loadConfig();
        // Mask API key for security (R6)
        const safeConfig = { ...config };
        if (safeConfig.apiKey) {
            const k = safeConfig.apiKey;
            safeConfig.apiKey = k.length > 8
                ? `${k.substring(0, 5)}****${k.substring(k.length - 4)}`
                : '****';
        }
        return {
            handled: true,
            response: JSON.stringify(safeConfig, null, 2)
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

    if (key === 'cost_estimator' && value) {
        const enabled = value === 'true';
        const config = loadConfig();
        saveConfig({ ...config, costEstimator: enabled });
        return { handled: true, response: `✅ cost_estimator = ${enabled}` };
    }

    if (key === 'enablePaidTools' && value) {
        const enabled = value === 'true';
        saveConfig({ enablePaidTools: enabled });
        return { handled: true, response: `✅ enablePaidTools = ${enabled}${!enabled ? ' (wallet protection active)' : ''}` };
    }

    if (key === 'costThreshold' && value) {
        const threshold = parseFloat(value);
        if (isNaN(threshold) || threshold < 0) {
            return { handled: true, error: 'Valeur numérique positive requise (en pollen). Ex: 0.15' };
        }
        saveConfig({ costThreshold: threshold });
        return { handled: true, response: `✅ costThreshold = ${threshold} 🌻` };
    }

    if (key === 'costConfirmation' && value) {
        const enabled = value === 'true';
        saveConfig({ costConfirmationRequired: enabled });
        return { handled: true, response: `✅ costConfirmationRequired = ${enabled}` };
    }

    return {
        handled: true,
        error: `Clé inconnue: ${key}. Clés: status_gui, logs_gui, threshold_tier, threshold_wallet, status_bar, cost_estimator, enablePaidTools, costThreshold, costConfirmation`
    };
}

function handleHelpCommand(): CommandResult {
    const help = `
### 🌸 Pollinations Plugin - Commandes V6

**Mode & Usage**
- **\`/pollinations mode [mode]\`**: Change le mode (manual, alwaysfree, pro).
- **\`/pollinations usage [full]\`**: Affiche le dashboard (full = détail).
- **\`/pollinations fallback <main> [agent]\`**: Configure le Safety Net.

**Configuration**
- **\`/pollinations config [key] [value]\`**:
   - \`status_gui\`: none, alert, all
  - \`logs_gui\`: none, error, verbose
  - \`threshold_tier\` / \`threshold_wallet\`: 0-100
  - \`status_bar\`: true/false
  - \`cost_estimator\`: true/false (show cost in outputs)
  - \`enablePaidTools\`: true/false (wallet protection)
  - \`costThreshold\`: seuil en pollen (défaut: 0.15)
  - \`costConfirmation\`: true/false (confirmation coût)

**Modèles & Pricing**
- **\`/pollinations models [type]\`**: Liste des modèles (type: image, video, audio, text)
- **\`/pollinations pricing\`**: Tableau de pricing détaillé

> 💡 **RMBG keys**: Use the \`rmbg_keys\` tool (works with any model).
`.trim();

    return { handled: true, response: help };
}

// === MODELS & PRICING COMMANDS ===

function handleModelsCommand(args: string[]): CommandResult {
    const filter = args[0] as ModelCategory | undefined; // optional: image, video, audio, text

    if (!ModelRegistry.isReady()) {
        return {
            handled: true,
            response: '⏳ Le registre des modèles est en cours de chargement. Réessayez dans quelques secondes.'
        };
    }

    const categories: { cat: ModelCategory; emoji: string; label: string }[] = [
        { cat: 'image', emoji: '🎨', label: 'Image' },
        { cat: 'video', emoji: '🎬', label: 'Video' },
        { cat: 'audio', emoji: '🔊', label: 'Audio' },
        { cat: 'text', emoji: '📝', label: 'Text' },
    ];

    const sections: string[] = ['## 📋 Modèles Pollinations Enter\n'];

    for (const { cat, emoji, label } of categories) {
        if (filter && filter !== cat) continue;

        const models = ModelRegistry.list(cat);
        if (models.length === 0) continue;

        sections.push(`### ${emoji} ${label} (${models.length} modèles)\n`);
        sections.push('| Modèle | Description | Badges | Input | Output |');
        sections.push('|--------|-------------|--------|-------|--------|');

        for (const m of models) {
            const badges = buildBadges(m);
            const input = buildInputIcons(m);
            const output = buildOutputCost(m);
            sections.push(`| ${m.name} | ${m.description.substring(0, 40)} | ${badges} | ${input} | ${output} |`);
        }
        sections.push('');
    }

    sections.push('> 💎 = Wallet direct (paid\\_only) · 🌱 = Free-tier puis wallet · 🖼️ = Supporte Image input');

    return { handled: true, response: sections.join('\n') };
}

function handlePricingCommand(): CommandResult {
    if (!ModelRegistry.isReady()) {
        return {
            handled: true,
            response: '⏳ Le registre des modèles est en cours de chargement. Réessayez dans quelques secondes.'
        };
    }

    const sections: string[] = ['## 💰 Pricing Pollinations Enter\n'];
    sections.push('> 💎 **Wallet direct** (paid\\_only) — débit immédiat du wallet');
    sections.push('> 🌱 **Free-tier** — pollen journalier d\'abord, puis wallet si épuisé\n');

    const categories: { cat: ModelCategory; emoji: string; label: string; unit: string }[] = [
        { cat: 'image', emoji: '🎨', label: 'Image', unit: '🌻/img' },
        { cat: 'video', emoji: '🎬', label: 'Video', unit: '🌻/s' },
        { cat: 'audio', emoji: '🔊', label: 'Audio', unit: '🌻' },
    ];

    for (const { cat, emoji, label } of categories) {
        const models = ModelRegistry.list(cat);
        if (models.length === 0) continue;

        sections.push(`### ${emoji} ${label}\n`);
        sections.push('| Modèle | Coût | Type Pollen | Badges |');
        sections.push('|--------|------|-------------|--------|');

        for (const m of models) {
            const cost = buildOutputCost(m);
            const pollenType = m.paid_only ? '💎 Wallet' : '🌱 Free-tier';
            const badges = buildBadges(m);
            sections.push(`| ${m.name} | ${cost} | ${pollenType} | ${badges} |`);
        }
        sections.push('');
    }

    return { handled: true, response: sections.join('\n') };
}

// ─── Formatting Helpers for Models/Pricing ────────────────────────────────

function buildBadges(m: PollinationsModel): string {
    const parts: string[] = [];
    if (m.paid_only) parts.push('💎');
    if (m.supportsI2X) {
        const tag = m.category === 'video' ? 'I2V' : 'I2I';
        parts.push(`🖼️ ${tag}`);
    }
    if (m.reasoning) parts.push('🧠');
    if (m.voices && m.voices.length > 0) parts.push(`🎤 ${m.voices.length}v`);
    return parts.length > 0 ? parts.join(' ') : '—';
}

function buildInputIcons(m: PollinationsModel): string {
    const icons: string[] = [];
    if (m.input_modalities.includes('text')) icons.push('📝');
    if (m.input_modalities.includes('image')) icons.push('🖼️');
    if (m.input_modalities.includes('audio')) icons.push('🎤');
    return icons.join('') || '📝';
}

function buildOutputCost(m: PollinationsModel): string {
    const p = m.pricing;
    if (p.completionImageTokens) {
        return p.completionImageTokens < 0.0001
            ? `~tokens`
            : `${p.completionImageTokens} 🌻/img`;
    }
    if (p.completionVideoSeconds) return `${p.completionVideoSeconds} 🌻/s`;
    if (p.completionVideoTokens) return `~tokens/s`;
    if (p.completionAudioTokens) return `${p.completionAudioTokens} 🌻/tok`;
    if (p.completionAudioSeconds) return `${p.completionAudioSeconds} 🌻/s`;
    if (p.promptAudioSeconds) return `${p.promptAudioSeconds} 🌻/s`;
    if (p.completionTextTokens) return `${p.completionTextTokens} 🌻/tok`;
    return '~tokens';
}

// === INTEGRATION OPENCODE ===

export function createCommandHooks() {
    return {
        'tui.command.execute': async (input: any, output: any) => {
            if (!input.command.startsWith('/pollinations')) {
                return;
            }

            try {
                // Parse command
                const rawArgs = input.command.replace('/pollinations', '').trim();
                const result = await handleCommand(rawArgs);

                if (result.handled) {
                    if (result.error) {
                        output.error = `❌ **Erreur:** ${result.error}`;
                    } else if (result.response) {
                        output.response = result.response;
                    }
                    // If no response and no error, assume handled silently (like appendPrompt)
                }
            } catch (err: any) {
                output.error = `❌ **Erreur Critique:** ${err.message}`;
            }
        },

        // Hook for UI Commands (Palette / Buttons)
        'command.execute.before': async (input: any, output: any) => {
            const cmd = input.command;
            if (cmd === 'pollinations.addKey') {
                handleCommand('addKey'); // Return help message
            } else if (cmd === 'pollinations.usage') {
                const res = await handleCommand('usage');
                if (res.response) globalClient?.tui.showToast({ title: "Pollinations Usage", metadata: { type: 'info', message: "Voir logs pour usage détaillé" } });
            } else if (cmd === 'pollinations.mode') {
                // UI Pollution Fix: SILENCE.
                // User explicitly requested NO messages.
            }
        }
    };

}

```

#### 📄 `server/config.ts`

```typescript

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// PATHS
// PATHS & CROSS-PLATFORM LOGIC
export function getConfigDir(): string {
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || os.homedir(), 'pollinations');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'pollinations');
        default:
            return path.join(
                process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
                'pollinations'
            );
    }
}

export const CONFIG_DIR = getConfigDir();
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Legacy/External Paths (OpenCode specific)
const HOMEDIR = os.homedir();

// Multi-OS Candidate Paths for Auth & Global Config
function getExternalConfigPaths() {
    const candidatesAuth: string[] = [];
    const candidatesConfig: string[] = [];

    // 0. OpenCode Environment Variables (Highest Priority)
    if (process.env.OPENCODE_CONFIG) {
        // Direct config file path
        candidatesConfig.push(process.env.OPENCODE_CONFIG);
    }
    if (process.env.OPENCODE_CONFIG_DIR) {
        // Config directory override
        candidatesConfig.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'opencode.json'));
        candidatesConfig.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'config.json'));
        candidatesAuth.push(path.join(process.env.OPENCODE_CONFIG_DIR, 'auth.json'));
    }
    // Also check standard env vars often used in overrides
    if (process.env.OPENCODE_AUTH) candidatesAuth.push(process.env.OPENCODE_AUTH);


    // 1. Linux Standard (Current)
    // ... rest of function ...
    candidatesAuth.push(path.join(HOMEDIR, '.local', 'share', 'opencode', 'auth.json'));
    candidatesConfig.push(path.join(HOMEDIR, '.config', 'opencode', 'opencode.json'));

    // 2. Windows Standard (%APPDATA%)
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(HOMEDIR, 'AppData', 'Roaming');
        candidatesAuth.push(path.join(appData, 'opencode', 'auth.json'));
        candidatesAuth.push(path.join(appData, 'OpenCode', 'auth.json'));
        candidatesConfig.push(path.join(appData, 'opencode', 'config.json'));
    }

    // 3. Mac Standard
    if (process.platform === 'darwin') {
        const support = path.join(HOMEDIR, 'Library', 'Application Support', 'OpenCode');
        candidatesAuth.push(path.join(support, 'auth.json'));
        candidatesConfig.push(path.join(support, 'config.json'));
    }

    return { auth: candidatesAuth, config: candidatesConfig };
}

const EXTERNAL_PATHS = getExternalConfigPaths();

// === V5 CONFIGURATION SCHEMA ===

export interface PollinationsConfigV5 {
    version: string | number;
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;
    keyHasAccessToProfile?: boolean;

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
    costThreshold: number; // Default 0.15 🌻
    costConfirmationRequired: boolean; // Ask confirmation when cost exceeds threshold (default: true)
    statusBar: boolean;
    costEstimator: boolean; // Show cost estimates in tool outputs (default: true)
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
        enter: { agent: 'free/openai-fast' }
    },
    enablePaidTools: false,
    costThreshold: 0.15, // Default 0.15 🌻
    costConfirmationRequired: true, // Ask confirmation when cost exceeds threshold
    keyHasAccessToProfile: true, // Default true for legacy keys
    statusBar: true,
    costEstimator: true, // Show cost estimates by default
};

import { log as logSystem } from './logger.js';

function logConfig(msg: string) {
    logSystem(`[Config] ${msg}`);
}

// SIMPLE LOAD (Direct Disk Read - No Caching, No Watchers)
// This ensures the Proxy ALWAYS sees the latest state from auth.json
export function loadConfig(): PollinationsConfigV5 {
    return readConfigFromDisk();
}

function readConfigFromDisk(): PollinationsConfigV5 {
    let config: any = { ...DEFAULT_CONFIG_V5 };
    let finalKey: string | undefined = undefined;
    let source: string = 'none';

    // TIMESTAMP BASED PRIORITY LOGIC
    // We want the most recently updated Valid Key to win.

    let configTime = 0;
    let authTime = 0;

    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { }
    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { }
    try {
        for (const f of EXTERNAL_PATHS.auth) {
            if (fs.existsSync(f)) {
                authTime = Math.max(authTime, fs.statSync(f).mtime.getTime());
            }
        }
    } catch (e) { }

    // 1. EXTRACT KEYS
    // 1. EXTRACT KEYS
    let configKey: string | undefined = undefined;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom }; // Helper: We load the rest of config anyway
            if (custom.apiKey && custom.apiKey.length > 5) configKey = custom.apiKey;
        } catch (e) {
            logConfig(`ERROR reading config.json: ${e}`);
            // Backup corrupt file to avoid overwrite loop
            try { fs.copyFileSync(CONFIG_FILE, CONFIG_FILE + '.corrupt'); } catch { }
        }
    }

    let authKey: string | undefined = undefined;

    // Check all auth candidates
    for (const authFile of EXTERNAL_PATHS.auth) {
        if (fs.existsSync(authFile)) {
            try {
                authTime = Math.max(authTime, fs.statSync(authFile).mtime.getTime()); // Track newest
                const raw = fs.readFileSync(authFile, 'utf-8');
                const authData = JSON.parse(raw);
                const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];
                if (entry) {
                    const k = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                    if (k && typeof k === 'string' && k.length > 10) {
                        authKey = k;
                        break; // Found a key, stop looking (priority to first found? or newest? First in list is Linux default so ok)
                    }
                }
            } catch (e) {
                logConfig(`ERROR reading auth candidate ${authFile}: ${e}`);
            }
        }
    }

    // 2. DETERMINE WINNER
    // If both exist, newest wins. If one exists, it wins.
    if (configKey && authKey) {
        if (configTime >= authTime) {
            finalKey = configKey;
            source = 'config.json';
        } else {
            finalKey = authKey;
            source = 'auth.json';
        }
    } else if (configKey) {
        finalKey = configKey;
        source = 'config.json';
    } else if (authKey) {
        finalKey = authKey;
        source = 'auth.json';
    }

    // 3. Fallback to OpenCode Global Config (Lowest Priority)
    if (!finalKey) {
        try {
            for (const configFile of EXTERNAL_PATHS.config) {
                if (fs.existsSync(configFile)) {
                    const raw = fs.readFileSync(configFile, 'utf-8');
                    const data = JSON.parse(raw);
                    const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                        data?.provider?.pollinations_enter?.options?.apiKey;
                    if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                        finalKey = nativeKey;
                        source = 'opencode_global';
                        break;
                    }
                }
            }
        } catch (e) { }
    }

    // 4. APPLY
    if (finalKey) {
        config.apiKey = finalKey;
        // config.mode = 'pro'; // REMOVED: Mode is decoupled from Key presence.
    } else {
        // Ensure no phantom key remains
        delete config.apiKey;
        // if (config.mode === 'pro') config.mode = 'manual'; // OPTIONAL: Downgrade if no key? User says "No link".
        // Actually, if I am in PRO mode and lose my key, I am broken. Falling back to manual is safer?
        // User said "Manual mode is like standard API".
        // Let's REMOVE this auto-downgrade too to be strictly "Decoupled".
        // If user is in PRO without key, they get "Missing Key" error, which is correct.
    }

    return { ...config, version: PKG_VERSION } as PollinationsConfigV5;
}

export function saveConfig(updates: Partial<PollinationsConfigV5>) {
    try {
        const current = readConfigFromDisk();
        const updated = { ...current, ...updates, version: PKG_VERSION };

        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
        return updated;
    } catch (e) {
        logConfig(`Error saving config: ${e}`);
        throw e;
    }
}

// === MIGRATION UTIL ===
export function migrateLegacyConfig() {
    try {
        const legacyDir = path.join(os.homedir(), '.pollinations');
        const newDir = getConfigDir();

        if (fs.existsSync(legacyDir) && legacyDir !== newDir) {
            logConfig(`Migrating legacy config from ${legacyDir} to ${newDir}`);
            if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

            const files = fs.readdirSync(legacyDir);
            for (const file of files) {
                const srcPath = path.join(legacyDir, file);
                const destPath = path.join(newDir, file);

                // Don't overwrite existing new files (priority to new system)
                if (!fs.existsSync(destPath)) {
                    // Check if it's a file
                    if (fs.statSync(srcPath).isFile()) {
                        fs.copyFileSync(srcPath, destPath); // Copy first
                        // fs.unlinkSync(srcPath); // Optional: Delete old? Let's keep for safety for now.
                        logConfig(`Migrated: ${file}`);
                    }
                }
            }
        }
    } catch (e) {
        logConfig(`Migration Error: ${e}`);
    }
}

```

#### 📄 `server/connect-response.ts`

```typescript
import { PollinationsConfigV5 } from './config.js';

export function buildConnectResponse(config: PollinationsConfigV5): string {
    const hasKey = !!config.apiKey;
    const mode = config.mode;

    if (hasKey) {
        return `## ✅ Plugin Pollinations connecté

**Mode actuel** : \`${mode}\`

Sélectionnez n'importe quel modèle \`pollinations/*\` dans la liste pour commencer.

---

**Commandes rapides :**

| Commande | Description |
|----------|-------------|
| \`/poll-usage\` | Solde Pollen + quota tier |
| \`/poll-usage-full\` | Détail par modèle |
| \`/poll-mode-pro\` | Activer le mode Pro |
| \`/poll-mode-free\` | Forcer les modèles gratuits |
| \`/poll-mode-manual\` | Contrôle manuel |
| \`/poll-models\` | Liste des modèles |
| \`/poll-pricing\` | Tarifs par modèle |
| \`/poll-status\` | Santé du plugin |

---

**Ressources :**
- Dashboard : https://enter.pollinations.ai
- Discord : https://discord.gg/pollinations-ai-885844321461485618
- GitHub : https://github.com/fkom13/opencode-pollinations-plugin`;
    }

    return `## 🌸 Bienvenue dans le Plugin Pollinations

**Accès gratuit immédiat — aucune clé requise**

Sélectionnez un modèle \`pollinations/*\` dans la liste et discutez directement.

Modèles gratuits disponibles : \`openai-fast\`, \`gemini-fast\`, \`mistral\`, \`qwen-coder\`, \`nova-fast\`

---

## 🔑 Débloquer les modèles premium

Claude, GPT-5, Gemini 3, Seedance Pro, Veo, ElevenLabs...

**Étape 1 — Créer un compte gratuit**
👉 https://enter.pollinations.ai

**Étape 2 — Créer une clé API**
Dans votre dashboard, section **API Keys**, créez une clé **Secret** (\`sk_...\`).

**Étape 3 — Connecter la clé**
\`\`\`
/poll-connect sk_votre_clé_ici
\`\`\`
Puis **redémarrez OpenCode** pour voir les modèles premium.

---

## 🌱 Tiers — Pollen gratuit par jour

| Tier | Pollen/jour | Condition |
|------|:-----------:|-----------|
| 🌱 Spore | 1 | Inscription |
| 🌿 Seed | 3 | Dev GitHub actif (8+ points) |
| 🌸 Flower | 10 | App publiée dans l'écosystème |
| 🍯 Nectar | 20 | Contributeur majeur |

> 🎁 **Beta** : tout achat de Pollen est **doublé** ($5 → 10 Pollen, etc.)

---

## 💰 Exemples de prix (1 Pollen ≈ 1$)

| Modèle | Coût | Quantité par Pollen |
|--------|------|:-----------------:|
| \`openai-fast\` (GPT-5 Nano) | 0.06/M input | ~700 réponses |
| \`claude-fast\` (Haiku 4.5) | 1.0/M input | ~100 réponses |
| \`flux\` (image) | 0.0002/img | ~5 000 images |
| \`gen_music\` (ElevenLabs Music) | 0.005/sec | 200s de musique |
| \`veo\` (vidéo) | 0.15/sec | ~6s de vidéo HD |

---

**Besoin d'aide ?**
- \`/poll-help\` — Aide complète du plugin
- Discord : https://discord.gg/pollinations-ai-885844321461485618`;
}

```

#### 📄 `server/generate-config.ts`

```typescript

import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, CONFIG_FILE } from './config.js';

// --- INTERFACES SCRICT ---

interface PollinationsModel {
    name: string;
    description?: string;
    type?: string;
    tools?: boolean;
    reasoning?: boolean;
    context?: number;
    context_window?: number;
    input_modalities?: string[];
    output_modalities?: string[];
    paid_only?: boolean;
    pricing?: {
        promptTextTokens?: number;
        completionTextTokens?: number;
        promptImageTokens?: number;
        promptAudioTokens?: number;
        completionAudioTokens?: number;
    };
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
    modalities?: {
        input?: string[];
        output?: string[];
    };
}

import { log as logSystem } from './logger.js';

// --- LOGGING ---
function log(msg: string) {
    logSystem(`[ConfigGen] ${msg}`);
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

export async function generatePollinationsConfig(forceApiKey?: string, forceStrict: boolean = false): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Configuration (V5.1.22 Hot-Reload)...`);

    // Use forced key (from Hook) or cached key
    const effectiveKey = forceApiKey || config.apiKey;

    // 0. CONNECT MODEL (Always present, first in list)
    modelsOutput.push({
        id: 'pollinations/connect',
        name: '🌸 Pollinations — Guide & Connexion',
        object: 'model',
        variants: {}
    });

    // 1. FREE UNIVERSE
    try {
        // Switch to main models endpoint (User provided curl confirms it has 'description')
        const freeList = await fetchJson('https://text.pollinations.ai/models');
        const list = Array.isArray(freeList) ? freeList : (freeList.data || []);

        list.forEach((m: any) => {
            const mapped = mapModel(m, 'free/', '');
            modelsOutput.push(mapped);
        });
        log(`Fetched ${modelsOutput.length} Free models.`);
    } catch (e) {
        log(`Error fetching Free models: ${e}`);
        // Fallback Robust (Offline support)
        modelsOutput.push({ id: "free/mistral", name: "Mistral Nemo (Fallback)", object: "model", variants: {} });
        modelsOutput.push({ id: "free/openai", name: "OpenAI (Fallback)", object: "model", variants: {} });
        modelsOutput.push({ id: "free/gemini", name: "Gemini Flash (Fallback)", object: "model", variants: {} });
    }

    // ALIAS Removed for Clean Config
    // const hasGeminiAlias = modelsOutput.find(m => m.id === 'pollinations/free/gemini');
    // if (!hasGeminiAlias) {
    //    modelsOutput.push({ id: "pollinations/free/gemini", name: "[Free] Gemini Flash (Alias)", object: "model", variants: {} });
    // }

    // 2. ENTERPRISE UNIVERSE
    if (effectiveKey && effectiveKey.length > 5 && effectiveKey !== 'dummy') {
        try {
            // Use /text/models for full metadata (input_modalities, tools, reasoning, pricing)
            const enterListRaw = await fetchJson('https://gen.pollinations.ai/text/models', {
                'Authorization': `Bearer ${effectiveKey}`
            });
            const enterList = Array.isArray(enterListRaw) ? enterListRaw : (enterListRaw.data || []);

            const paidModels: string[] = [];
            enterList.forEach((m: any) => {
                if (m.tools === false) return;
                const mapped = mapModel(m, 'enter/', '');
                modelsOutput.push(mapped);
                if (m.paid_only) {
                    paidModels.push(mapped.id.replace('enter/', '')); // Store bare ID "gemini-large"
                }
            });
            log(`Total models (Free+Pro): ${modelsOutput.length}`);

            // Save Paid Models List for Proxy
            try {
                const paidListPath = path.join(config.gui ? path.dirname(CONFIG_FILE) : '/tmp', 'pollinations-paid-models.json');
                // Ensure dir exists (re-use config dir logic from config.ts if possible, or just assume it exists since config loaded)
                if (fs.existsSync(path.dirname(paidListPath))) {
                    fs.writeFileSync(paidListPath, JSON.stringify(paidModels));
                }
            } catch (e) { log(`Error saving paid models list: ${e}`); }

        } catch (e) {
            log(`Error fetching Enterprise models: ${e}`);

            // STRICT MODE (Validation): Do not return fake fallback models.
            if (forceStrict) throw e;

            // Fallback Robust for Enterprise (User has Key but discovery failed)
            modelsOutput.push({ id: "enter/gpt-4o", name: "GPT-4o (Fallback)", object: "model", variants: {} });
            // ...
            modelsOutput.push({ id: "enter/claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Fallback)", object: "model", variants: {} });
            modelsOutput.push({ id: "enter/deepseek-reasoner", name: "DeepSeek R1 (Fallback)", object: "model", variants: {} });
        }
    }

    return modelsOutput;
}

// --- CAPABILITY ICONS ---

function getCapabilityIcons(raw: PollinationsModel): string {
    const icons: string[] = [];

    // Vision: accepts images
    if (raw.input_modalities?.includes('image')) icons.push('👁️');

    // Audio Input
    if (raw.input_modalities?.includes('audio')) icons.push('🎙️');

    // Audio Output
    if (raw.output_modalities?.includes('audio')) icons.push('🔊');

    // Reasoning capability
    if (raw.reasoning === true) icons.push('🧠');

    // Web Search (from description)
    if (raw.description?.toLowerCase().includes('search') ||
        raw.name?.includes('search') ||
        raw.name?.includes('perplexity')) {
        icons.push('🔍');
    }

    // Tool/Function calling
    if (raw.tools === true) icons.push('💻');

    return icons.length > 0 ? ` ${icons.join('')}` : '';
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

    // Gérer les icônes pour paid_only et modèles FREE
    let paidPrefix = '';
    let freeSuffix = '';

    if (raw.paid_only) {
        paidPrefix = '💎 '; // Icône diamant devant les modèles payants
    }

    if (prefix === 'free/') {
        freeSuffix = ' (free)'; // Suffixe pour l'univers FREE
    }

    // Get capability icons from API metadata
    const capabilityIcons = getCapabilityIcons(raw);
    const finalName = `${paidPrefix}${baseName}${capabilityIcons}${freeSuffix}`;

    const modelObj: OpenCodeModel = {
        id: fullId,
        name: finalName,
        object: 'model',
        variants: {},
        // Declare modalities for OpenCode vision support
        modalities: {
            input: raw.input_modalities || ['text'],
            output: raw.output_modalities || ['text']
        }
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

    // BEDROCK/ENTERPRISE LIMITS (Chickytutor only)
    if (rawId.includes('chickytutor')) {
        modelObj.limit = {
            output: 8192,
            context: 128000
        };
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

#### 📄 `server/logger.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Centraliser tous les logs dans un seul dossier temporaire
const LOG_DIR = path.join(os.tmpdir(), 'pollinations-plugin');
const LOG_FILE = path.join(LOG_DIR, 'plugin.log');
const API_LOG_FILE = path.join(LOG_DIR, 'api-debug.log');
const TOAST_LOG_FILE = path.join(LOG_DIR, 'toasts.log');

// Initialisation unique
function ensureLogDir() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    } catch { /* Silent fail — logging should never crash the app */ }
}
ensureLogDir();

export function log(msg: string, file = LOG_FILE): void {
    try {
        ensureLogDir(); // Ensure dir exists (in case it was deleted)
        fs.appendFileSync(file, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { }
}

export function logApi(msg: string): void {
    log(msg, API_LOG_FILE);
}

export function logToast(msg: string): void {
    log(msg, TOAST_LOG_FILE);
}

export const LOG_FILES = {
    main: LOG_FILE,
    api: API_LOG_FILE,
    toast: TOAST_LOG_FILE,
};

```

#### 📄 `server/pollinations-api.ts`

```typescript

import { loadConfig } from './config.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

import { logApi as logDebug } from './logger.js';

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

// === DAILY USAGE API (Server-side aggregated, no 100-entry limit) ===

export interface DailyUsageEntry {
    date: string;       // Format "YYYY-MM-DD"
    model: string;
    meter_source: 'tier' | 'pack' | 'combined';
    requests: number;
    cost_usd: number;
}

export interface DailyUsageResponse {
    usage: DailyUsageEntry[];
}

export async function getDailyUsage(apiKey: string): Promise<DailyUsageResponse | null> {
    if (!apiKey || apiKey.length < 10) return null;

    try {
        logDebug("Fetching Daily Usage (aggregated)...");
        const response = await fetch('https://gen.pollinations.ai/account/usage/daily', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            logDebug(`Daily Usage API Error: ${response.status}`);
            return null;
        }

        const data: any = await response.json();
        return data as DailyUsageResponse;
    } catch (e) {
        logDebug(`Error Daily Usage: ${e}`);
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

#### 📄 `server/proxy.ts`

```typescript
import * as http from 'http'; // V4.2 Snapshot Force
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, saveConfig } from './config.js';
import { handleCommand } from './commands.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { buildConnectResponse } from './connect-response.js';

import { log } from './logger.js';
import { getConfigDir } from './config.js';

// --- PERSISTENCE: SIGNATURE MAP (Multi-Round Support) ---
const SIG_FILE = path.join(getConfigDir(), 'pollinations-signature.json');
let signatureMap: Record<string, string> = {};
let lastSignature: string | null = null; // V1 Fallback Global

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
const FETCH_TIMEOUT_MS = 600000; // 10 Minutes global timeout

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<Response> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

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

        // 0. SPECIAL: pollinations/connect (Guide & Status)
        const CONNECT_MODEL_IDS = ['pollinations/connect', 'free/pollinations/connect', 'enter/pollinations/connect', 'connect-pollinations'];
        if (CONNECT_MODEL_IDS.includes(body.model)) {
            const guideContent = buildConnectResponse(config);

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

        // A.1 PAID MODEL ENFORCEMENT (V5.5 Strategy)
        // Check dynamic list saved by generate-config.ts
        if (isEnterprise) {
            try {
                const paidListPath = path.join(config.gui ? path.dirname(path.join(process.env.HOME || '/tmp', '.config/opencode/pollinations-signature.json')) : '/tmp', 'pollinations-paid-models.json');
                // Wait, logic above for config path is messy. Let's use standard path logic:
                // config.ts uses ~/.pollinations/config.json usually.
                // generate-config uses path.join(config.gui ? path.dirname(CONFIG_FILE) : '/tmp')
                // Let's rely on standard ~/.pollinations location if possible, or try both.

                const homedir = process.env.HOME || '/tmp';
                const standardPaidPath = path.join(homedir, '.pollinations', 'pollinations-paid-models.json');

                if (fs.existsSync(standardPaidPath)) {
                    const paidModels = JSON.parse(fs.readFileSync(standardPaidPath, 'utf-8'));
                    if (paidModels.includes(actualModel)) {
                        // IT IS A PAID ONLY MODEL.
                        // STRICT CHECK: Wallet > 0 required. (Not just Tier)
                        if (quota.walletBalance <= 0.001) { // Floating point safety
                            log(`[SafetyNet] Paid Only Model (${actualModel}) requested but Wallet is Empty ($${quota.walletBalance}). BLOCKING.`);

                            // Immediate Block or Fallback?
                            // Text says: "💎 Paid Only models require purchased pollen only"
                            // Blocking is safer/clearer than falling back to a free model which might not be what the user expects for a "Pro" feature?
                            // Actually, Fallback to Free is usually better for UX if configured, BUT for specific "Paid Only" requests, the user explicitly chose a powerful model.
                            // Falling back to Mistral might be confusing if they asked for Gemini-Large.
                            // BUT we are failing gracefully.
                            // Let's Fallback to Free Default and Warn.

                            actualModel = config.fallbacks.free.main.replace('free/', '');
                            isEnterprise = false;
                            isFallbackActive = true;
                            fallbackReason = "Paid Only Model requires purchased credits";
                        }
                    }
                }
            } catch (e) { log(`[Proxy] Error checking paid models: ${e}`); }
        }

        // B. SAFETY NETS (The Core V5 Logic)

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

            // WE DO NOT RETURN 403. WE ALLOW THE REQUEST.
            // Since config.mode is now 'manual', the next checks (alwaysfree/pro) will be skipped.
        }

        if (config.mode === 'alwaysfree') {
            if (isEnterprise) {
                // Paid Only Check: BLOCK (not fallback) in AlwaysFree mode
                try {
                    const homedir = process.env.HOME || '/tmp';
                    const standardPaidPath = path.join(homedir, '.pollinations', 'pollinations-paid-models.json');
                    if (fs.existsSync(standardPaidPath)) {
                        const paidModels = JSON.parse(fs.readFileSync(standardPaidPath, 'utf-8'));
                        if (paidModels.includes(actualModel)) {
                            log(`[AlwaysFree] BLOCKED: Paid Only Model (${actualModel}).`);
                            emitStatusToast('warning', `🚫 Modèle payant bloqué: ${actualModel}`, 'AlwaysFree Mode');

                            const blockMsg = {
                                id: `chatcmpl-block-${Date.now()}`,
                                object: 'chat.completion',
                                created: Math.floor(Date.now() / 1000),
                                model: actualModel,
                                choices: [{
                                    index: 0,
                                    message: {
                                        role: 'assistant',
                                        content: `🚫 **Modèle payant non disponible en mode AlwaysFree**\n\nLe modèle \`${actualModel}\` consomme directement votre wallet (💎 Paid Only).\n\n**Solutions :**\n• \`/pollinations config mode pro\` — Autorise les modèles payants avec protection wallet\n• \`/pollinations config mode manual\` — Aucune restriction, contrôle total`
                                    },
                                    finish_reason: 'stop'
                                }],
                                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                            };

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(blockMsg));
                            return;
                        }
                    }
                } catch (e) { }

                if (!isFallbackActive && quota.tier === 'error') {
                    // Network error or unknown error (but NOT auth_limited, handled above)
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
                    // Network error or unknown
                    log(`[SafetyNet] Pro Mode: Quota Unreachable. Switching to Free Fallback.`);
                    actualModel = config.fallbacks.free.main.replace('free/', '');
                    isEnterprise = false;
                    isFallbackActive = true;
                    fallbackReason = "Quota Unreachable (Safety)";
                } else {
                    const tierRatio = quota.tierLimit > 0 ? (quota.tierRemaining / quota.tierLimit) : 0;
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

                    if (fetchRes.status === 402) {
                        fallbackReason = "Insufficient Funds (Upstream 402)";
                        // Force refresh quota cache so next pre-flight check is accurate
                        try { await getQuotaStatus(true); } catch (e) { }
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

```

#### 📄 `server/quota.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https'; // Use Native HTTPS
import * as crypto from 'crypto';
import { loadConfig, getConfigDir } from './config.js';

// === INTERFACES ===

interface Profile {
    name: string;
    email: string;
    githubUsername: string;
    tier: string;
    createdAt: string;
    nextResetAt: string;
}

export interface DetailedUsageEntry {
    timestamp: string;
    type: string;
    model: string;
    meter_source: 'tier' | 'pack';
    cost_usd: number;
    requests?: number;
    // ... autres champs
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
    errorType?: 'auth_limited' | 'network' | 'unknown';
}

// === CACHE & CONSTANTS ===

const CACHE_TTL = 30000; // 30 secondes
let cachedQuota: QuotaStatus | null = null;
let lastQuotaFetch: number = 0;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_RETENTION_MS = 48 * 60 * 60 * 1000; // 48h history

// === TIER LIMITS ===

const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    microbe: { pollen: 0.1, emoji: '🦠' },
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

// === LOGGING ===
import { logApi } from './logger.js';
function logQuota(msg: string) {
    logApi(`[QUOTA] ${msg}`);
}

// === HISTORY MANAGER (JSON) ===

function getHistoryFilePath(): string {
    const historyDir = getConfigDir();
    if (!fs.existsSync(historyDir)) {
        try { fs.mkdirSync(historyDir, { recursive: true }); } catch (e) { }
    }
    return path.join(historyDir, 'usage_history.json');
}

function computeEntrySignature(entry: DetailedUsageEntry): string {
    // Unique signature per transaction: timestamp + model + cost + source
    return crypto.createHash('md5').update(`${entry.timestamp}|${entry.model}|${entry.cost_usd}|${entry.meter_source}`).digest('hex');
}

function updateLocalHistory(newEntries: DetailedUsageEntry[]): DetailedUsageEntry[] {
    const filePath = getHistoryFilePath();
    let history: DetailedUsageEntry[] = [];

    // 1. Load existing
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            history = JSON.parse(raw);
        }
    } catch (e) {
        logQuota(`Failed to load history: ${e}`);
        history = [];
    }

    // 2. Merge (Deduplication via Signature)
    const existingSignatures = new Set(history.map(computeEntrySignature));
    let addedCount = 0;

    for (const entry of newEntries) {
        const sig = computeEntrySignature(entry);
        if (!existingSignatures.has(sig)) {
            history.push(entry);
            existingSignatures.add(sig);
            addedCount++;
        }
    }

    // 3. Prune (> 48h)
    const now = Date.now();
    const beforePrune = history.length;
    history = history.filter(e => {
        const entryTime = new Date(e.timestamp.replace(' ', 'T') + 'Z').getTime();
        return (now - entryTime) < HISTORY_RETENTION_MS;
    });

    // 4. Sort (Newest first)
    history.sort((a, b) => new Date(b.timestamp.replace(' ', 'T') + 'Z').getTime() - new Date(a.timestamp.replace(' ', 'T') + 'Z').getTime());

    // 5. Save
    try {
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
        logQuota(`History Update: Added ${addedCount}, Pruned ${beforePrune - history.length}, Total ${history.length} entries.`);
    } catch (e) {
        logQuota(`Failed to save history: ${e}`);
    }

    return history;
}

// === MAIN QUOTA FUNCTION ===

export async function getQuotaStatus(forceRefresh = false): Promise<QuotaStatus> {
    const config = loadConfig();

    if (!config.apiKey) {
        return createDefaultQuota('none', 0);
    }

    const now = Date.now();
    if (!forceRefresh && cachedQuota && (now - lastQuotaFetch) < CACHE_TTL) {
        return cachedQuota;
    }

    try {
        logQuota("Fetching Quota Data...");

        // 1. Fetch API
        // SEQUENTIAL FETCH (Avoid Rate Limits)
        const profileRes = await fetchAPI<Profile>('/account/profile', config.apiKey);
        const balanceRes = await fetchAPI<{ balance: number }>('/account/balance', config.apiKey);
        const usageRes = await fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey);

        logQuota(`Fetch Success. Tier: ${profileRes.tier}, Balance: ${balanceRes.balance}`);

        const profile = profileRes;
        const balance = balanceRes.balance;

        // 2. Update Local History (The Source of Truth)
        const fullHistory = updateLocalHistory(usageRes.usage || []);

        const tierInfo = TIER_LIMITS[profile.tier] || { pollen: 1, emoji: '❓' };
        const tierLimit = tierInfo.pollen;

        // 3. Calculate Reset & Usage from History
        const resetInfo = calculateResetInfo(profile.nextResetAt);
        const { tierUsed } = calculateCurrentPeriodUsage(fullHistory, resetInfo);

        // 4. Calculate Balances
        const tierRemaining = Math.max(0, tierLimit - tierUsed);

        // Fix rounding errors
        const cleanTierRemaining = Math.max(0, parseFloat(tierRemaining.toFixed(4)));

        // Le wallet c'est le reste (balance totale - ce qu'il reste du tier gratuit non consommé)
        // Formula: Pollinations Balance = Wallet + TierRemaining.
        const walletBalance = Math.max(0, balance - cleanTierRemaining);
        const cleanWalletBalance = Math.max(0, parseFloat(walletBalance.toFixed(4)));

        // needsAlert: check BOTH tier threshold AND wallet threshold
        const tierAlertPercent = tierLimit > 0 ? (cleanTierRemaining / tierLimit * 100) : 0;
        const tierNeedsAlert = tierLimit > 0 && tierAlertPercent <= config.thresholds.tier;
        const walletNeedsAlert = cleanWalletBalance > 0 && cleanWalletBalance < (config.thresholds.wallet || 0.5);

        cachedQuota = {
            tierRemaining: cleanTierRemaining,
            tierUsed,
            tierLimit,
            walletBalance: cleanWalletBalance,
            nextResetAt: resetInfo.nextReset,
            timeUntilReset: resetInfo.timeUntilReset,
            canUseEnterprise: cleanTierRemaining > 0.05 || cleanWalletBalance > 0.05,
            isUsingWallet: cleanTierRemaining <= 0.05 && cleanWalletBalance > 0.05,
            needsAlert: tierNeedsAlert || walletNeedsAlert,
            tier: profile.tier,
            tierEmoji: tierInfo.emoji
        };

        lastQuotaFetch = now;
        return cachedQuota;

    } catch (e: any) {
        logQuota(`ERROR fetching quota: ${e.message}`);

        let errorType: 'auth_limited' | 'network' | 'unknown' = 'unknown';
        if (e.message && e.message.includes('403')) errorType = 'auth_limited';
        else if (e.message && e.message.includes('Network Error')) errorType = 'network';

        return cachedQuota || { ...createDefaultQuota('error', 1), errorType };
    }
}

function createDefaultQuota(tierName: string, limit: number): QuotaStatus {
    return {
        tierRemaining: 0,
        tierUsed: 0,
        tierLimit: limit,
        walletBalance: 0,
        nextResetAt: new Date(),
        timeUntilReset: 0,
        canUseEnterprise: false,
        isUsingWallet: false,
        needsAlert: false,
        tier: tierName,
        tierEmoji: TIER_LIMITS[tierName]?.emoji || '❌'
    };
}

// === HELPERS ===

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

    const resetHour = nextResetFromAPI.getUTCHours();
    const resetMinute = nextResetFromAPI.getUTCMinutes();
    const resetSecond = nextResetFromAPI.getUTCSeconds();

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
        lastReset = todayResetUTC;
        nextReset = new Date(todayResetUTC.getTime() + ONE_DAY_MS);
    } else {
        lastReset = new Date(todayResetUTC.getTime() - ONE_DAY_MS);
        nextReset = todayResetUTC;
    }

    const timeUntilReset = nextReset.getTime() - now.getTime();
    const timeSinceReset = now.getTime() - lastReset.getTime();
    const progressPercent = (timeSinceReset / ONE_DAY_MS) * 100;

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

    const entriesAfterReset = usage.filter(entry => {
        // Safe Parse
        const timestamp = entry.timestamp.replace(' ', 'T') + 'Z';
        const entryTime = new Date(timestamp);
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

export function formatQuotaForToast(quota: QuotaStatus): string {
    if (quota.errorType === 'auth_limited') {
        return `🔑 CLE LIMITÉE (Génération Seule) | 💎 Wallet: N/A | ⏰ Reset: N/A`;
    }

    const tierPercent = quota.tierLimit > 0
        ? Math.round((quota.tierRemaining / quota.tierLimit) * 100)
        : 0;

    const ms = quota.timeUntilReset;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const resetIn = `${hours}h${minutes}m`;

    return `${quota.tierEmoji} Tier: ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} (${tierPercent}%) | 💎 Wallet: $${quota.walletBalance.toFixed(2)} | ⏰ Reset: ${resetIn}`;
}

```

#### 📄 `server/status.ts`

```typescript
import { loadConfig } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';

export function createStatusHooks(client: any) {
    return {
        // [DEPRECATED] Hook session.idle supprimé car il polluait les autres providers.
        // Les notifications de statut sont désormais gérées par le proxy après chaque requête pollinations/enter.
    };
}

function formatStatus(quota: QuotaStatus): string {
    const tierName = quota.tier === 'alwaysfree' ? 'Free' : quota.tier;
    return `${tierName} ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} 🌼 | Wallet $${quota.walletBalance.toFixed(2)}`;
}
```

#### 📄 `server/toast.ts`

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

import { logToast } from './logger.js';

function logToastToFile(toast: ToastMessage) {
    const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.channel.toUpperCase()}] [${toast.type.toUpperCase()}] ${toast.message}`;
    logToast(logLine);
}

export function createToastHooks(client: any) {
    return {
        'session.idle': async ({ event }: any) => {
            // Deprecated: We use immediate dispatch now. 
            // Kept for backward compat if needed or legacy queued items.
        }
    };
}

// 3. CANAL TOOLS (Natif)
export function createToolHooks(client: any) {
    return {
        'tool.execute.after': async (input: any, output: any) => {
            // Check for metadata in the output
            if (output.metadata && output.metadata.message) {
                const meta = output.metadata;
                const type = meta.type || 'info';
                // If title is not in metadata, try to use the one from output or default
                const title = meta.title || output.title || 'Pollinations Tool';

                // Emit the toast
                emitStatusToast(type, meta.message, title);
            }
        }
    };
}

```

#### 📁 models

##### 📄 `server/models/cache.ts`

```typescript
/**
 * ModelRegistry — Singleton cache for Pollinations models
 * 
 * Central access point for all model metadata. Backed by the fetcher
 * with a configurable TTL. Falls back to static data if fetch fails.
 */

import { log } from '../logger.js';
import { loadConfig } from '../config.js';
import { fetchAllModels } from './fetcher.js';
import type { PollinationsModel, ModelCategory, ModelRegistryInterface } from './types.js';

// ─── Static Fallback Data ────────────────────────────────────────────────
// Minimal fallback used ONLY when API is unreachable at startup.
// Keeps the plugin functional offline.

const STATIC_FALLBACK: PollinationsModel[] = [
    // Image — most common
    { name: 'flux', description: 'Flux Schnell', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.0002 }, paid_only: false, supportsI2X: false, outputType: 'image', input_modalities: ['text'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'zimage', description: 'Z-Image Turbo', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.0002 }, paid_only: false, supportsI2X: false, outputType: 'image', input_modalities: ['text'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'klein', description: 'FLUX.2 Klein 4B', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.008 }, paid_only: false, supportsI2X: true, outputType: 'image', input_modalities: ['text', 'image'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'kontext', description: 'FLUX.1 Kontext', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.04 }, paid_only: true, supportsI2X: true, outputType: 'image', input_modalities: ['text', 'image'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    // Video — essential
    { name: 'grok-video', description: 'Grok Video', category: 'video', aliases: [], pricing: { currency: 'pollen', completionVideoSeconds: 0.0025 }, paid_only: false, supportsI2X: true, outputType: 'video', input_modalities: ['text', 'image'], output_modalities: ['video'], durationRange: [1, 15], aspectRatios: ['16:9', '9:16', '1:1', '4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~10s' },
    { name: 'veo', description: 'Veo 3.1 Fast', category: 'video', aliases: [], pricing: { currency: 'pollen', completionVideoSeconds: 0.15 }, paid_only: true, supportsI2X: true, outputType: 'video', input_modalities: ['text', 'image'], output_modalities: ['video'], durationRange: [4, 8], aspectRatios: ['16:9', '9:16', '1:1'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~45-68s' },
    // Audio — essential
    { name: 'elevenlabs', description: 'ElevenLabs v3 TTS', category: 'audio', aliases: [], pricing: { currency: 'pollen', completionAudioTokens: 0.00018 }, paid_only: false, supportsI2X: false, outputType: 'audio', input_modalities: ['text'], output_modalities: ['audio'] },
    { name: 'whisper', description: 'Whisper v3 STT', category: 'audio', aliases: [], pricing: { currency: 'pollen', promptAudioSeconds: 0.0000445 }, paid_only: false, supportsI2X: false, outputType: 'audio', input_modalities: ['audio'], output_modalities: ['text'] },
];

// ─── Cache Configuration ─────────────────────────────────────────────────

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

// ─── Registry Implementation ─────────────────────────────────────────────

class ModelRegistryImpl implements ModelRegistryInterface {
    private models: PollinationsModel[] = [];
    private lastRefresh: number = 0;
    private ttl: number = DEFAULT_TTL;
    private ready: boolean = false;
    private refreshing: boolean = false;

    /** Get a single model by category and name */
    get(category: ModelCategory, name: string): PollinationsModel | undefined {
        return this.models.find(m => m.category === category && m.name === name);
    }

    /** Also search by alias */
    getByNameOrAlias(category: ModelCategory, name: string): PollinationsModel | undefined {
        return this.models.find(m =>
            m.category === category && (m.name === name || m.aliases.includes(name))
        );
    }

    /** List all models in a category */
    list(category: ModelCategory): PollinationsModel[] {
        return this.models.filter(m => m.category === category);
    }

    /** Check if registry has been populated */
    isReady(): boolean {
        return this.ready;
    }

    /** Check if cache is stale */
    isStale(): boolean {
        return Date.now() - this.lastRefresh > this.ttl;
    }

    /** Force refresh from API */
    async refresh(apiKey?: string): Promise<void> {
        if (this.refreshing) return; // Prevent concurrent refreshes
        this.refreshing = true;

        try {
            const key = apiKey || loadConfig().apiKey;
            const fetched = await fetchAllModels(key);

            if (fetched.length > 0) {
                this.models = fetched;
                this.lastRefresh = Date.now();
                this.ready = true;
                log(`[ModelRegistry] Refreshed: ${this.models.length} models cached.`);
            } else {
                // API returned empty — keep existing data or use fallback
                if (!this.ready) {
                    this.models = [...STATIC_FALLBACK];
                    this.ready = true;
                    log(`[ModelRegistry] API empty. Using static fallback (${STATIC_FALLBACK.length} models).`);
                } else {
                    log(`[ModelRegistry] API returned empty, keeping existing ${this.models.length} models.`);
                }
            }
        } catch (e) {
            if (!this.ready) {
                this.models = [...STATIC_FALLBACK];
                this.ready = true;
                log(`[ModelRegistry] Fetch failed, using static fallback: ${e}`);
            } else {
                log(`[ModelRegistry] Refresh failed, keeping cache: ${e}`);
            }
        } finally {
            this.refreshing = false;
        }
    }

    /** Get all models across all categories */
    all(): PollinationsModel[] {
        return [...this.models];
    }

    /** Auto-refresh if stale (non-blocking) */
    ensureFresh(): void {
        if (this.isStale()) {
            this.refresh().catch(() => { }); // Fire-and-forget
        }
    }

    /** Get count per category (for logging) */
    stats(): Record<ModelCategory, number> {
        return {
            image: this.list('image').length,
            video: this.list('video').length,
            audio: this.list('audio').length,
            text: this.list('text').length,
        };
    }
}

// ─── Singleton Export ────────────────────────────────────────────────────

export const ModelRegistry = new ModelRegistryImpl();

```

##### 📄 `server/models/fetcher.ts`

```typescript
/**
 * Model Fetcher — Dynamic model discovery from Pollinations API
 * 
 * Fetches /image/models and /audio/models from gen.pollinations.ai,
 * categorizes them by output_modalities, and applies local patches
 * for data the API doesn't provide (video duration, aspect ratios, etc.).
 */

import * as https from 'https';
import { log } from '../logger.js';
import type { PollinationsModel, ModelCategory, ModelPricing } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────

const API_BASE = 'gen.pollinations.ai';

// ─── Local Patches (data NOT provided by the API) ────────────────────────

const VIDEO_LOCAL_EXTRAS: Record<string, Partial<PollinationsModel>> = {
    'grok-video': { durationRange: [1, 15], aspectRatios: ['16:9', '9:16', '1:1', '4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~10s' },
    'ltx-2': { durationRange: [5, 20], aspectRatios: ['16:9'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~35s' },
    'wan': { durationRange: [5, 15], aspectRatios: ['16:9', '9:16', '1:1', '4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~30s' },
    'veo': { durationRange: [4, 8], aspectRatios: ['16:9', '9:16', '1:1'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~45-68s' },
    'seedance': { durationRange: [4, 12], aspectRatios: ['16:9', '9:16', '1:1'], costHeader: 'x-usage-completion-video-tokens', genTimeEstimate: '~30s' },
    'seedance-pro': { durationRange: [4, 12], aspectRatios: ['16:9', '9:16', '1:1'], costHeader: 'x-usage-completion-video-tokens', genTimeEstimate: '~30s' },
};

const IMAGE_LOCAL_EXTRAS: Record<string, Partial<PollinationsModel>> = {
    'kontext': { costHeader: 'x-usage-completion-image-tokens' },
    'klein': { costHeader: 'x-usage-completion-image-tokens' },
};

// ─── HTTP Helper ─────────────────────────────────────────────────────────

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    log(`[ModelFetcher] JSON parse error for ${url}: ${e}`);
                    resolve([]);
                }
            });
        });
        req.on('error', (e: Error) => {
            log(`[ModelFetcher] Network error for ${url}: ${e.message}`);
            reject(e);
        });
        req.setTimeout(8000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// ─── Category Detection ──────────────────────────────────────────────────

function detectCategory(raw: any): ModelCategory {
    const outputs: string[] = raw.output_modalities || [];
    if (outputs.includes('video')) return 'video';
    if (outputs.includes('image')) return 'image';
    if (outputs.includes('audio')) return 'audio';
    return 'text';
}

function detectOutputType(raw: any): ModelCategory {
    return detectCategory(raw);
}

// ─── Model Mapping ──────────────────────────────────────────────────────

function mapRawToModel(raw: any, fallbackCategory: ModelCategory): PollinationsModel {
    const category = detectCategory(raw);
    const inputMods: string[] = raw.input_modalities || ['text'];
    const outputMods: string[] = raw.output_modalities || ['text'];
    const pricing: ModelPricing = {
        currency: raw.pricing?.currency || 'pollen',
        ...(raw.pricing || {}),
    };

    const model: PollinationsModel = {
        name: raw.name || raw.id || 'unknown',
        description: raw.description || raw.name || '',
        category,
        aliases: raw.aliases || [],
        pricing,
        paid_only: raw.paid_only === true,
        supportsI2X: inputMods.includes('image'),
        outputType: detectOutputType(raw),
        input_modalities: inputMods,
        output_modalities: outputMods,
        voices: raw.voices,
        tools: raw.tools,
        reasoning: raw.reasoning,
        is_specialized: raw.is_specialized,
        context_window: raw.context_window,
    };

    // Apply local patches
    if (category === 'video' && VIDEO_LOCAL_EXTRAS[model.name]) {
        Object.assign(model, VIDEO_LOCAL_EXTRAS[model.name]);
    }
    if (category === 'image' && IMAGE_LOCAL_EXTRAS[model.name]) {
        Object.assign(model, IMAGE_LOCAL_EXTRAS[model.name]);
    }

    return model;
}

// ─── Main Fetch Function ─────────────────────────────────────────────────

/**
 * Fetch all models from the Pollinations API.
 * 
 * - /image/models returns both image AND video models (sorted by output_modalities)
 * - /audio/models returns audio models (TTS, STT, music)
 * 
 * @param apiKey - Bearer token for authenticated endpoints
 * @returns Array of unified PollinationsModel objects
 */
export async function fetchAllModels(apiKey?: string): Promise<PollinationsModel[]> {
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.length > 5 && apiKey !== 'dummy') {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const results: PollinationsModel[] = [];
    const seen = new Set<string>();

    const endpoints = [
        { url: `https://${API_BASE}/image/models`, fallbackCategory: 'image' as ModelCategory },
        { url: `https://${API_BASE}/audio/models`, fallbackCategory: 'audio' as ModelCategory },
    ];

    const fetches = endpoints.map(async ({ url, fallbackCategory }) => {
        try {
            const raw = await fetchJson(url, headers);
            const list: any[] = Array.isArray(raw) ? raw : (raw.data || []);

            for (const item of list) {
                const model = mapRawToModel(item, fallbackCategory);
                if (!seen.has(model.name)) {
                    seen.add(model.name);
                    results.push(model);
                }
            }
            log(`[ModelFetcher] Fetched ${list.length} models from ${url}`);
        } catch (e) {
            log(`[ModelFetcher] Failed to fetch ${url}: ${e}`);
            // Silently fail — cache will use static fallback
        }
    });

    await Promise.all(fetches);

    log(`[ModelFetcher] Total: ${results.length} models (${results.filter(m => m.category === 'image').length} image, ${results.filter(m => m.category === 'video').length} video, ${results.filter(m => m.category === 'audio').length} audio)`);

    return results;
}

```

##### 📄 `server/models/index.ts`

```typescript
/**
 * Model Registry — Barrel Export
 */
export { ModelRegistry } from './cache.js';
export { fetchAllModels } from './fetcher.js';
export type {
    PollinationsModel,
    ModelCategory,
    ModelPricing,
    ModelRegistryInterface
} from './types.js';

```

##### 📄 `server/models/types.ts`

```typescript
/**
 * Unified Model Types for ModelRegistry
 * 
 * Single source of truth for all Pollinations model metadata.
 * Replaces the fragmented hardcoded constants in shared.ts.
 */

// ─── Core Model Interface ────────────────────────────────────────────────

export type ModelCategory = 'image' | 'video' | 'audio' | 'text';

export interface ModelPricing {
    currency: string;  // Always 'pollen'
    completionImageTokens?: number;
    completionVideoSeconds?: number;
    completionVideoTokens?: number;
    completionAudioTokens?: number;
    completionAudioSeconds?: number;
    promptAudioTokens?: number;
    promptAudioSeconds?: number;
    promptTextTokens?: number;
    promptCachedTokens?: number;
    promptImageTokens?: number;
    completionTextTokens?: number;
}

export interface PollinationsModel {
    name: string;
    description: string;
    category: ModelCategory;
    aliases: string[];
    pricing: ModelPricing;
    paid_only: boolean;
    supportsI2X: boolean;       // input_modalities includes "image"
    outputType: ModelCategory;  // Derived from output_modalities[0]
    voices?: string[];
    tools?: boolean;
    reasoning?: boolean;
    is_specialized?: boolean;
    context_window?: number;

    // Input/Output modalities (raw from API)
    input_modalities: string[];
    output_modalities: string[];

    // ─── Local patch data (not provided by API) ──────────────
    durationRange?: [number, number];
    aspectRatios?: string[];
    costHeader?: string;
    genTimeEstimate?: string;
}

// ─── Registry Interface ──────────────────────────────────────────────────

export interface ModelRegistryInterface {
    /** Get a single model by category and name */
    get(category: ModelCategory, name: string): PollinationsModel | undefined;
    /** List all models in a category */
    list(category: ModelCategory): PollinationsModel[];
    /** Check if registry has been populated */
    isReady(): boolean;
    /** Force refresh from API */
    refresh(apiKey?: string): Promise<void>;
    /** Get all models across all categories */
    all(): PollinationsModel[];
}

```

### 📁 tools

#### 📄 `tools/ffmpeg.ts`

```typescript
import { spawnSync } from 'child_process';
import * as os from 'os';

/**
 * Check if ffmpeg is available in the system PATH
 */
export function hasSystemFFmpeg(): boolean {
    const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}

/**
 * Check if ffprobe is available in the system PATH
 */
export function hasSystemFFprobe(): boolean {
    const result = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return result.status === 0 && !result.error;
}

/**
 * Get cross-platform installation instructions
 */
export function getFFmpegInstallInstructions(): string {
    const platform = process.platform;
    const instructions: Record<string, string> = {
        linux: 'sudo apt install ffmpeg  (Debian/Ubuntu)\nsudo dnf install ffmpeg  (Fedora)',
        darwin: 'brew install ffmpeg',
        win32: 'choco install ffmpeg  (Chocolatey)\nwinget install ffmpeg  (WinGet)\nOu télécharger sur https://ffmpeg.org/download.html',
    };
    return instructions[platform] || 'Voir https://ffmpeg.org/download.html';
}

/**
 * Helper to run ffmpeg commands safely
 */
export function runFFmpeg(args: string[], options: { timeout?: number } = {}): void {
    const result = spawnSync('ffmpeg', args, {
        stdio: 'ignore',
        timeout: options.timeout || 120000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`FFmpeg failed with code ${result.status}`);
}

/**
 * Helper to run ffprobe commands safely and return stdout
 */
export function runFFprobe(args: string[], options: { timeout?: number } = {}): string {
    const result = spawnSync('ffprobe', args, {
        encoding: 'utf-8',
        timeout: options.timeout || 15000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`FFprobe failed: ${result.stderr}`);
    return result.stdout;
}

```

#### 📄 `tools/index.ts`

```typescript
/**
 * Tool Registry — Conditional Injection System
 * 
 * Free Universe (no key): 8 tools always available
 * Enter Universe (with key): +6 Pollinations tools
 * 
 * Tools are injected ONCE at plugin init. Restart needed after /poll connect.
 */

import { loadConfig } from '../server/config.js';

// === FREE TOOLS (Always available) ===
import { genQrcodeTool } from './design/gen_qrcode.js';
import { genDiagramTool } from './design/gen_diagram.js';
import { genPaletteTool } from './design/gen_palette.js';
import { fileToUrlTool } from './power/file_to_url.js';
import { removeBackgroundTool } from './power/remove_background.js';
import { extractFramesTool } from './power/extract_frames.js';
import { extractAudioTool } from './power/extract_audio.js';
import { rmbgKeysTool } from './power/rmbg_keys.js';

// === ENTER TOOLS (Require API key) ===
import { genImageTool } from './pollinations/gen_image.js';
import { genVideoTool } from './pollinations/gen_video.js';
import { genAudioTool } from './pollinations/gen_audio.js';
import { transcribeAudioTool } from './pollinations/transcribe_audio.js';
import { genMusicTool } from './pollinations/gen_music.js';
import { polliWebSearchTool } from './pollinations/polli_web_search.js';

import * as fs from 'fs';

import * as os from 'os';
import * as path from 'path';
import { log } from '../server/logger.js';

/**
 * Detect if a valid API key is present
 */
function hasValidKey(): boolean {
    const config = loadConfig();
    return !!(config.apiKey && config.apiKey.length > 5 && config.apiKey !== 'dummy');
}

/**
 * Build the tool registry based on user's access level
 * 
 * @returns Record<string, Tool> to be spread into the plugin's tool: {} property
 */
export function createToolRegistry(): Record<string, any> {
    const tools: Record<string, any> = {};
    const keyPresent = hasValidKey();

    // === FREE UNIVERSE: Always injected (8 tools) ===

    // Design tools (3)
    tools['gen_qrcode'] = genQrcodeTool;
    tools['gen_diagram'] = genDiagramTool;
    tools['gen_palette'] = genPaletteTool;

    // Power tools (5)
    tools['file_to_url'] = fileToUrlTool;
    tools['remove_background'] = removeBackgroundTool;
    tools['extract_frames'] = extractFramesTool;
    tools['extract_audio'] = extractAudioTool;
    tools['rmbg_keys'] = rmbgKeysTool;

    log(`Free tools injected: ${Object.keys(tools).length}`);

    // === ENTER UNIVERSE: Only with valid API key (+6 tools) ===
    if (keyPresent) {
        // Pollinations media tools
        tools['gen_image'] = genImageTool;
        tools['gen_video'] = genVideoTool;
        tools['gen_audio'] = genAudioTool;
        tools['transcribe_audio'] = transcribeAudioTool;
        tools['gen_music'] = genMusicTool;

        // Unified search tool (replaces deepsearch + search_crawl_scrape)
        tools['polli_web_search'] = polliWebSearchTool;

        log(`Enter tools injected (key detected). Total: ${Object.keys(tools).length}`);
    } else {
        log(`Enter tools SKIPPED (no key). Total: ${Object.keys(tools).length}`);
    }

    return tools;
}

// Re-export for convenience
export {
    genImageTool,
    genVideoTool,
    genAudioTool,
    transcribeAudioTool,
    genMusicTool,
    polliWebSearchTool,
};

```

#### 📄 `tools/shared.ts`

```typescript
/**
 * Shared utilities for power tools — file saving, paths, and formatting.
 * All tools use these helpers for consistent behavior.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── Default base directory ──────────────────────────────────────────────────

const DEFAULT_BASE = path.join(os.homedir(), 'Downloads', 'pollinations');

/**
 * Subdirectories for each tool category
 */
export const TOOL_DIRS = {
    qrcodes: 'qrcodes',
    diagrams: 'diagrams',
    palettes: 'palettes',
    rembg: 'rembg',
    frames: 'frames',
    audio: 'audio',
    uploads: 'uploads',
} as const;

/**
 * Resolve the output directory — uses customPath if provided,
 * otherwise falls back to ~/Downloads/pollinations/{subdir}
 * Works on all OSes (Linux, macOS, Windows).
 */
export function resolveOutputDir(subdir: string, customPath?: string): string {
    let dir: string;

    if (customPath) {
        // If customPath is absolute, use it directly
        // If relative, resolve from cwd
        // Handle tilde ~ manual expansion for cross-platform support
        if (customPath.startsWith('~')) {
            dir = path.join(os.homedir(), customPath.slice(1));
        } else {
            dir = path.isAbsolute(customPath)
                ? customPath
                : path.resolve(process.cwd(), customPath);
        }
    } else {
        dir = path.join(DEFAULT_BASE, subdir);
    }

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return dir;
}

/**
 * Format file size for human-readable output
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Sanitize a filename — remove special chars, keep it safe
 */
export function safeName(input: string): string {
    return input.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_');
}

/**
 * Format a timestamp for display (human readable)
 */
export function formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

```

#### 📁 design

##### 📄 `tools/design/gen_diagram.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';
const MERMAID_INK_BASE = 'https://mermaid.ink';

/**
 * Encode Mermaid code for mermaid.ink API
 * Uses base64 encoding of the diagram definition
 */
function encodeMermaid(code: string): string {
    return Buffer.from(code, 'utf-8').toString('base64url');
}

/**
 * Fetch binary content from URL
 */
function fetchBinary(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'OpenCode-Pollinations-Plugin/6.0' } }, (res) => {
            // Follow redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchBinary(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout fetching diagram'));
        });
    });
}

export const genDiagramTool: ToolDefinition = tool({
    description: `Render a Mermaid diagram to SVG or PNG image. 
Uses mermaid.ink (free, no auth required). Supports all Mermaid syntax:
flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, mindmap, timeline, etc.
The diagram code should be valid Mermaid syntax WITHOUT the \`\`\`mermaid fences.`,

    args: {
        code: tool.schema.string().describe('Mermaid diagram code (e.g. "graph LR; A-->B; B-->C")'),
        format: tool.schema.enum(['svg', 'png']).optional().describe('Output format (default: svg)'),
        theme: tool.schema.enum(['default', 'dark', 'forest', 'neutral']).optional().describe('Diagram theme (default: default)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/diagrams/'),
    },

    async execute(args, context) {
        const format = args.format || 'svg';
        const theme = args.theme || 'default';
        const outputDir = resolveOutputDir(TOOL_DIRS.diagrams, args.output_path);

        // Build mermaid.ink URL
        // For themed rendering, we wrap with config
        const themedCode = theme !== 'default'
            ? `%%{init: {'theme': '${theme}'}}%%\n${args.code}`
            : args.code;

        const encoded = encodeMermaid(themedCode);
        const endpoint = format === 'svg' ? 'svg' : 'img';
        const url = `${MERMAID_INK_BASE}/${endpoint}/${encoded}`;

        // Generate filename
        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `diagram_${Date.now()}`;
        const filePath = path.join(outputDir, `${safeName}.${format}`);

        try {
            const data = await fetchBinary(url);

            if (data.length < 50) {
                return `❌ Diagram Error: mermaid.ink returned empty/invalid response. Check your Mermaid syntax.`;
            }

            fs.writeFileSync(filePath, data);

            const fileSizeKB = (data.length / 1024).toFixed(1);

            // Extract diagram type from first line
            const firstLine = args.code.trim().split('\n')[0].trim();
            const diagramType = firstLine.replace(/[;\s{].*/g, '');

            context.metadata({ title: `📊 Diagram: ${diagramType}` });

            return [
                `📊 Diagram Rendered`,
                `━━━━━━━━━━━━━━━━━━━`,
                `Type: ${diagramType}`,
                `Theme: ${theme}`,
                `Format: ${format.toUpperCase()}`,
                `File: ${filePath}`,
                `Weight: ${fileSizeKB} KB`,
                `URL: ${url}`,
                `Cost: Free (mermaid.ink)`,
            ].join('\n');

        } catch (err: any) {
            return `❌ Diagram Error: ${err.message}\n💡 Verify your Mermaid syntax at https://mermaid.live`;
        }
    },
});

```

##### 📄 `tools/design/gen_palette.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';

// --- Color Math (HSL based) ---

interface HSL { h: number; s: number; l: number; }

function hexToHSL(hex: string): HSL {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(baseHex: string, scheme: string, count: number): { hex: string; role: string }[] {
    const base = hexToHSL(baseHex);
    const colors: { hex: string; role: string }[] = [];

    switch (scheme) {
        case 'complementary':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 180) % 360, base.s, base.l), role: 'Complement' });
            // Fill shades
            for (let i = 2; i < count; i++) {
                const lShift = base.l + (i % 2 === 0 ? 15 : -15) * Math.ceil(i / 2);
                colors.push({ hex: hslToHex(base.h, base.s, Math.max(10, Math.min(90, lShift))), role: `Shade ${i - 1}` });
            }
            break;

        case 'analogous':
            for (let i = 0; i < count; i++) {
                const offset = (i - Math.floor(count / 2)) * 30;
                colors.push({
                    hex: hslToHex((base.h + offset + 360) % 360, base.s, base.l),
                    role: offset === 0 ? 'Base' : `${offset > 0 ? '+' : ''}${offset}°`
                });
            }
            break;

        case 'triadic':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 120) % 360, base.s, base.l), role: 'Triad +120°' });
            colors.push({ hex: hslToHex((base.h + 240) % 360, base.s, base.l), role: 'Triad +240°' });
            for (let i = 3; i < count; i++) {
                const lShift = base.l + (i % 2 === 0 ? 12 : -12) * Math.ceil((i - 2) / 2);
                colors.push({ hex: hslToHex((base.h + (i * 120)) % 360, base.s, Math.max(10, Math.min(90, lShift))), role: `Accent ${i - 2}` });
            }
            break;

        case 'split-complementary':
            colors.push({ hex: baseHex, role: 'Base' });
            colors.push({ hex: hslToHex((base.h + 150) % 360, base.s, base.l), role: 'Split +150°' });
            colors.push({ hex: hslToHex((base.h + 210) % 360, base.s, base.l), role: 'Split +210°' });
            for (let i = 3; i < count; i++) {
                colors.push({ hex: hslToHex(base.h, base.s, Math.max(10, Math.min(90, base.l + (i * 10 - 30)))), role: `Tone ${i - 2}` });
            }
            break;

        case 'monochromatic':
        default:
            for (let i = 0; i < count; i++) {
                const l = Math.round(15 + (i / (count - 1)) * 70); // 15% to 85%
                colors.push({
                    hex: hslToHex(base.h, base.s, l),
                    role: l < base.l ? `Dark ${Math.abs(i - Math.floor(count / 2))}` : l === base.l ? 'Base' : `Light ${Math.abs(i - Math.floor(count / 2))}`,
                });
            }
            // Mark closest to base
            let closestIdx = 0;
            let closestDiff = Infinity;
            colors.forEach((c, i) => {
                const diff = Math.abs(hexToHSL(c.hex).l - base.l);
                if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
            });
            colors[closestIdx].role = 'Base';
            break;
    }

    return colors.slice(0, count);
}

function generateSVG(colors: { hex: string; role: string }[]): string {
    const swatchW = 120;
    const swatchH = 80;
    const gap = 8;
    const totalW = colors.length * (swatchW + gap) - gap + 40;
    const totalH = swatchH + 60;

    const swatches = colors.map((c, i) => {
        const x = 20 + i * (swatchW + gap);
        const textColor = hexToHSL(c.hex).l > 50 ? '#1a1a1a' : '#ffffff';
        return `
    <rect x="${x}" y="20" width="${swatchW}" height="${swatchH}" rx="8" fill="${c.hex}" stroke="#333" stroke-width="1"/>
    <text x="${x + swatchW / 2}" y="${swatchH / 2 + 15}" text-anchor="middle" fill="${textColor}" font-family="monospace" font-size="13" font-weight="bold">${c.hex.toUpperCase()}</text>
    <text x="${x + swatchW / 2}" y="${swatchH + 38}" text-anchor="middle" fill="#666" font-family="sans-serif" font-size="11">${c.role}</text>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" fill="#0d0d0d" rx="12"/>
  ${swatches}
</svg>`;
}

export const genPaletteTool: ToolDefinition = tool({
    description: `Generate a harmonious color palette from a base hex color.
Outputs a visual SVG palette + JSON color codes. Works 100% offline.
Schemes: monochromatic, complementary, analogous, triadic, split-complementary.
Perfect for frontend design, branding, and UI theming.`,

    args: {
        color: tool.schema.string().describe('Base hex color (e.g. "#3B82F6" or "3B82F6")'),
        scheme: tool.schema.enum(['monochromatic', 'complementary', 'analogous', 'triadic', 'split-complementary']).optional()
            .describe('Color harmony scheme (default: analogous)'),
        count: tool.schema.number().min(3).max(8).optional().describe('Number of colors (default: 5, max: 8)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/palettes/'),
    },

    async execute(args, context) {
        const scheme = args.scheme || 'analogous';
        const count = args.count || 5;

        // Normalize hex
        let hex = args.color.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9a-fA-F]{3,6}$/.test(hex)) {
            return `❌ Invalid hex color: "${args.color}". Use format: #3B82F6 or 3B82F6`;
        }
        if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];

        // Generate palette
        const colors = generatePalette(hex, scheme, count);

        const outputDir = resolveOutputDir(TOOL_DIRS.palettes, args.output_path);

        // Save SVG
        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `palette_${hex.replace('#', '')}_${scheme}`;
        const svgPath = path.join(outputDir, `${safeName}.svg`);
        const svg = generateSVG(colors);
        fs.writeFileSync(svgPath, svg);

        // Build CSS custom properties snippet
        const cssVars = colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n');

        context.metadata({ title: `🎨 Palette: ${scheme} from ${hex}` });

        const colorTable = colors.map(c => `  ${c.hex.toUpperCase()}  ${c.role}`).join('\n');

        return [
            `🎨 Color Palette Generated`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `Base: ${hex.toUpperCase()}`,
            `Scheme: ${scheme}`,
            `Colors (${count}):`,
            colorTable,
            ``,
            `File: ${svgPath}`,
            ``,
            `CSS Variables:`,
            `:root {`,
            cssVars,
            `}`,
            ``,
            `Cost: Free (local computation)`,
        ].join('\n');
    },
});

```

##### 📄 `tools/design/gen_qrcode.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, TOOL_DIRS } from '../shared.js';

export const genQrcodeTool: ToolDefinition = tool({
    description: `Generate a QR code image from text, URL, or WiFi credentials. 
Outputs a PNG file saved locally. Works 100% offline, no API key needed.
Examples: URLs, plain text, WiFi (format: WIFI:T:WPA;S:NetworkName;P:Password;;)`,

    args: {
        content: tool.schema.string().describe('The text, URL, or WiFi string to encode into a QR code'),
        size: tool.schema.number().min(128).max(2048).optional().describe('QR code size in pixels (default: 512)'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/qrcodes/'),
    },

    async execute(args, context) {
        const size = args.size || 512;
        const outputDir = resolveOutputDir(TOOL_DIRS.qrcodes, args.output_path);

        const safeName = args.filename
            ? args.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `qr_${Date.now()}`;
        const filePath = path.join(outputDir, `${safeName}.png`);

        try {
            await QRCode.toFile(filePath, args.content, {
                width: size,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });

            const stats = fs.statSync(filePath);
            const fileSizeKB = (stats.size / 1024).toFixed(1);
            const displayContent = args.content.length > 80
                ? args.content.substring(0, 77) + '...'
                : args.content;

            context.metadata({ title: `🔲 QR Code: ${displayContent}` });

            return [
                `🔲 QR Code Généré`,
                `━━━━━━━━━━━━━━━━━━`,
                `Contenu: ${displayContent}`,
                `Taille: ${size}×${size}px`,
                `Fichier: ${filePath}`,
                `Poids: ${fileSizeKB} KB`,
                `Coût: Gratuit (génération locale)`,
            ].join('\n');

        } catch (err: any) {
            return `❌ Erreur QR Code: ${err.message}`;
        }
    },
});

```

#### 📁 pollinations

##### 📄 `tools/pollinations/cost-guard.ts`

```typescript
/**
 * Cost Guard — Wallet protection for Pollinations tools
 * 
 * Sprint 3: Centralized cost control barrier.
 * Checks config.tools settings before allowing tool execution.
 * 
 * Config keys (from config.ts → PollinationsConfigV5.tools):
 *   - enable_paid_models: boolean — block paid_only models when false
 *   - ask_cost_confirmation: boolean — request confirmation when cost > limit
 *   - cost_limit: number — threshold in Pollen (default 0.1)
 */

import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import { formatCost } from './shared.js';

// ─── Types ───────────────────────────────────────────────────────────────

export interface CostCheckResult {
    allowed: boolean;
    reason?: string;
    confirmationRequired?: boolean;
    message?: string;
}

// ─── Main Function ───────────────────────────────────────────────────────

/**
 * Check if a generation should proceed based on cost control settings.
 * 
 * Reads directly from PollinationsConfigV5 flat fields:
 *   - enablePaidTools: boolean (default false) — wallet protection
 *   - costConfirmationRequired: boolean (default true) — per-call confirmation
 *   - costThreshold: number (default 0.15) — cost limit in pollen
 * 
 * @param modelName - The model being used
 * @param estimatedCost - Estimated cost in Pollen
 * @param category - The model category ('image' | 'video' | 'audio')
 * @returns CostCheckResult with allowed status and messages
 */
export function checkCostControl(
    modelName: string,
    estimatedCost: number,
    category: 'image' | 'video' | 'audio' = 'image'
): CostCheckResult {
    const config = loadConfig();
    const enablePaid = config.enablePaidTools !== false; // default true for backward compat
    const askConfirm = config.costConfirmationRequired === true; // default from config (true)
    const costLimit = config.costThreshold ?? 0.15;

    // ─── Check 1: Is the model paid_only and wallet protection active? ────
    if (!enablePaid) {
        const m = ModelRegistry.getByNameOrAlias(category, modelName);
        if (m?.paid_only) {
            return {
                allowed: false,
                reason: 'paid_model_disabled',
                message: `❌ **Modèle payant bloqué** : \`${modelName}\` est un modèle payant (💎 paid_only).
🔒 La protection wallet est activée (enablePaidTools = false).
💡 Pour autoriser : \`/pollinations config enablePaidTools true\``,
            };
        }
    }

    // ─── Check 2: Does cost exceed threshold? (independent of enablePaid) ─
    if (askConfirm && estimatedCost > costLimit) {
        return {
            allowed: true, // Still allowed, but needs user awareness
            confirmationRequired: true,
            reason: 'cost_exceeds_limit',
            message: `⚠️ **Coût élevé** : ${formatCost(estimatedCost)} (seuil: ${formatCost(costLimit)})
💡 Modèle: \`${modelName}\` | Catégorie: ${category}
🔧 Ajuster le seuil : \`/pollinations config costThreshold <valeur>\``,
        };
    }

    // ─── All checks passed ────────────────────────────────────────────────
    return {
        allowed: true,
        message: estimatedCost > 0
            ? `💰 Coût estimé: ${formatCost(estimatedCost)}`
            : undefined,
    };
}

/**
 * Format a cost check result as a user-facing string.
 * Returns null if no message needed (allowed, no warnings).
 */
export function formatCostCheckMessage(result: CostCheckResult): string | null {
    if (!result.allowed) {
        return result.message || '❌ Opération bloquée par le Cost Guard.';
    }
    if (result.confirmationRequired) {
        return result.message || '⚠️ Coût élevé détecté.';
    }
    return null; // No message needed — proceed silently
}

```

##### 📄 `tools/pollinations/deepsearch.ts`

```typescript
/**
 * deepsearch Tool - Deep Research with AI
 * 
 * Uses perplexity-reasoning for in-depth research and analysis
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
} from './shared.js';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const deepsearchTool: ToolDefinition = tool({
    description: `Perform deep research and analysis on a topic using AI reasoning.

**Model:** perplexity-reasoning

This tool provides comprehensive research with:
- Multi-step reasoning
- Source citations
- In-depth analysis
- Fact verification

**Use for:**
- Complex research questions
- Technical analysis
- Fact-checking
- Comparative studies

**Cost:** ~0.000002-0.000008 🌻 per token (very affordable)`,

    args: {
        query: tool.schema.string().describe('Research query or question to investigate'),
        depth: tool.schema.enum(['quick', 'standard', 'thorough']).optional()
            .describe('Research depth (default: standard)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Deep Search nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = 'perplexity-reasoning';
        const depth = args.depth || 'standard';

        // Metadata
        context.metadata({ title: `🔍 Deep Search: ${args.query.substring(0, 50)}...` });

        try {
            // Build system prompt based on depth
            const systemPrompts: Record<string, string> = {
                quick: 'Provide a concise but thorough answer with key sources. Be efficient.',
                standard: 'Provide comprehensive research with analysis, sources, and reasoning steps.',
                thorough: 'Provide exhaustive research with multiple perspectives, detailed analysis, all relevant sources, and thorough fact-checking. Consider edge cases and alternative viewpoints.',
            };

            const { data } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompts[depth] },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: depth === 'thorough' ? 8000 : depth === 'standard' ? 4000 : 2000,
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(data.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No response';

            // Format result
            const lines = [
                `🔍 Deep Search Results`,
                `━━━━━━━━━━━━━━━━━━`,
                `Query: ${args.query}`,
                `Depth: ${depth}`,
                `Model: ${model}`,
                ``,
                content,
            ];

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            return `❌ Erreur Deep Search: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/gen_audio.ts`

```typescript
/**
 * gen_audio Tool - Pollinations Text-to-Speech
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Two TTS options:
 * 1. openai-audio (DEFAULT): GPT-4o Audio Preview - uses /v1/chat/completions with modalities
 *    - Supports both TTS and STT (Speech-to-Text)
 *    - Least expensive option
 *    - Voices: alloy, echo, fable, onyx, nova, shimmer
 *    - Formats: mp3, wav, pcm16
 * 
 * 2. elevenlabs: ElevenLabs v3 TTS - uses /audio/{text}
 *    - 34 expressive voices
 *    - Higher quality but more expensive
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsPost,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateTtsCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    getAudioModels,
} from './shared.js';
import { checkCostControl, formatCostCheckMessage } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── TTS Configuration ────────────────────────────────────────────────────

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const ELEVENLABS_VOICES = [
    'rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy',
    'sarah', 'emily', 'lily', 'matilda',
    'adam', 'antoni', 'arnold', 'josh', 'sam', 'daniel',
    'charlie', 'james', 'fin', 'callum', 'liam', 'george', 'brian', 'bill',
    'ash', 'ballad', 'coral', 'sage', 'verse',
];

const DEFAULT_VOICE = 'alloy';
const DEFAULT_MODEL = 'openai-audio'; // Changed: openai-audio is now default (least expensive)
const DEFAULT_FORMAT = 'mp3';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genAudioTool: ToolDefinition = tool({
    description: `Convert text to speech using Pollinations AI.

**🔊 Models:**

| Model | Type | Voices | Format | Cost | Notes |
|-------|------|--------|--------|------|-------|
| openai-audio | TTS + STT | 6 | mp3, wav, pcm16 | Lowest | **DEFAULT** - GPT-4o Audio |
| elevenlabs | TTS | 34 | mp3, wav, etc. | Higher | Expressive voices |

**🎵 OpenAI Audio (Default, Recommended):**
- Voices: \`alloy\`, \`echo\`, \`fable\`, \`onyx\`, \`nova\`, \`shimmer\`
- Formats: \`mp3\` (default), \`wav\`, \`pcm16\`
- Uses GPT-4o Audio Preview modalities endpoint
- Lowest cost option

**🎤 ElevenLabs:**
- 34 expressive voices including: rachel, domi, bella, adam, etc.
- Higher quality natural-sounding speech
- More expensive but more expressive

**💡 Tips:**
- Use \`openai-audio\` for cost-effective TTS
- Use \`elevenlabs\` for more expressive/character voices
- For STT (transcription), use the \`transcribe_audio\` tool`,

    args: {
        text: tool.schema.string().describe('Text to convert to speech'),
        voice: tool.schema.string().optional().describe(`Voice to use (default: ${DEFAULT_VOICE})`),
        model: tool.schema.string().optional().describe(`TTS model (default: ${DEFAULT_MODEL})`),
        format: tool.schema.enum(['mp3', 'wav', 'pcm16']).optional().describe('Audio format (default: mp3, openai-audio only)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Le TTS nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const text = args.text;
        const model = args.model || DEFAULT_MODEL;
        const voice = args.voice || DEFAULT_VOICE;
        const format = args.format || DEFAULT_FORMAT;

        // Validate model (unknown models accepted as beta)
        const audioModels = getAudioModels();
        const modelInfo = audioModels[model];
        const isBetaModel = !modelInfo;

        if (isBetaModel) {
            emitStatusToast('warning', `Modèle "${model}" non référencé — mode (beta)`, '🔊 gen_audio');
        }

        // Validate voice for selected model
        if (model === 'openai-audio' && !OPENAI_VOICES.includes(voice)) {
            return `⚠️ Voix "${voice}" non supportée par openai-audio.
💡 Voix OpenAI: ${OPENAI_VOICES.join(', ')}`;
        }

        if (model === 'elevenlabs' && !ELEVENLABS_VOICES.includes(voice)) {
            return `⚠️ Voix "${voice}" non reconnue pour elevenlabs.
💡 Voix ElevenLabs populaires: rachel, domi, bella, adam, josh...
📋 Total: ${ELEVENLABS_VOICES.length} voix disponibles`;
        }

        // Estimate cost
        const estimatedCost = estimateTtsCost(text.length);

        // Cost Guard check
        const costCheck = checkCostControl(model, estimatedCost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }
        const costWarning = formatCostCheckMessage(costCheck);

        // Emit start toast
        emitStatusToast('info', `Génération audio: ${model} (${text.length} chars)`, '🔊 gen_audio');

        // Metadata
        context.metadata({ title: `🔊 TTS: ${voice}${isBetaModel ? ' (beta)' : ''} (${text.length} chars)` });

        try {
            let audioData: Buffer;
            let responseHeaders: Record<string, string> = {};
            let actualFormat = format;

            if (model === 'openai-audio') {
                // === OpenAI Audio: Use modalities endpoint ===
                // POST /v1/chat/completions with audio modalities
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/chat/completions',
                    {
                        model: 'openai-audio',
                        modalities: ['text', 'audio'],
                        audio: {
                            voice: voice,
                            format: format,
                        },
                        messages: [
                            {
                                role: 'user',
                                content: text
                            }
                        ],
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );

                const data = JSON.parse(response.data.toString());

                // Extract audio from response
                const audioBase64 = data.choices?.[0]?.message?.audio?.data;
                if (!audioBase64) {
                    throw new Error('No audio data in response');
                }

                audioData = Buffer.from(audioBase64, 'base64');
                responseHeaders = response.headers;

            } else if (model === 'elevenlabs') {
                // === ElevenLabs: Use audio endpoint ===
                // GET/POST /audio/{text}
                const promptEncoded = encodeURIComponent(text);
                const url = `https://gen.pollinations.ai/audio/${promptEncoded}?model=elevenlabs&voice=${voice}`;

                // For elevenlabs, we might need a different approach
                // Let's use POST with JSON body
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/audio/speech',
                    {
                        model: 'elevenlabs',
                        input: text,
                        voice: voice,
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );

                // Check if response is JSON (error) or binary (audio)
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const data = JSON.parse(response.data.toString());
                    throw new Error(data.error?.message || 'Unknown error');
                }

                audioData = response.data;
                responseHeaders = response.headers;
            } else {
                // Fallback to OpenAI-compatible endpoint
                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/audio/speech',
                    {
                        model: model,
                        input: text,
                        voice: voice,
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );

                audioData = response.data;
                responseHeaders = response.headers;
            }

            // Save audio
            const outputDir = args.save_to || getDefaultOutputDir('audio');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('tts', `${model}_${voice}`, actualFormat);
            const filePath = path.join(outputDir, filename.endsWith(`.${actualFormat}`) ? filename : `${filename}.${actualFormat}`);

            fs.writeFileSync(filePath, audioData);
            const fileSize = fs.statSync(filePath).size;

            // Estimate duration (approx 15 chars per second for speech)
            const estimatedDuration = Math.ceil(text.length / 15);

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costWarning) {
                lines.push(costWarning);
                lines.push('');
            }

            lines.push(`🔊 Audio Généré (TTS)`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Texte: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
            lines.push(`Modèle: ${model}${isBetaModel ? ' (beta)' : model === 'openai-audio' ? ' (recommandé)' : ''}`);
            lines.push(`Voix: ${voice}`);
            lines.push(`Format: ${actualFormat}`);
            lines.push(`Durée estimée: ~${estimatedDuration}s`);
            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Cost info
            if (isCostEstimatorEnabled()) {
                lines.push(`Coût estimé: ${formatCost(estimatedCost)}`);
            }

            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', `Audio généré ✓ (${model}, ${voice})`, '🔊 gen_audio');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🔊 gen_audio');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            return `❌ Erreur TTS: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/gen_image.ts`

```typescript
/**
 * gen_image Tool - Pollinations Image Generation
 * 
 * Updated: 2026-02-19 - Dynamic ModelRegistry + Cost Guard + Toasts
 * 
 * All models are dynamic from the Pollinations API.
 * Unknown models are accepted as (beta) and passed through to the API.
 * Cost Guard reads enablePaidTools, costConfirmationRequired, costThreshold.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    hasApiKey,
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateImageCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    supportsI2I,
    getPaidImageModels,
} from './shared.js';
import { checkCostControl, formatCostCheckMessage } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'flux';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genImageTool: ToolDefinition = tool({
    description: `Generate an image from a text prompt using Pollinations AI.

**💎 Models disponibles** (clé API requise):
| Model | Cost | T2I | I2I | Notes |
|-------|------|-----|-----|-------|
| flux | 0.0002 🌻 | ✅ | ❌ | Fast high-quality |
| zimage | 0.0002 🌻 | ✅ | ❌ | 6B Flux with 2x upscaling |
| imagen-4 | 0.0025 🌻 | ✅ | ❌ | Google high fidelity |
| klein | 0.008 🌻 | ✅ | ✅ | FLUX.2 Klein 4B |
| klein-large | 0.012 🌻 | ✅ | ✅ | FLUX.2 Klein 9B |
| kontext | 0.04 🌻 | ✅ | ✅ | In-Context Editing |
| seedream | 0.03 🌻 | ✅ | ✅ | ByteDance ARK quality |
| seedream-pro | 0.04 🌻 | ✅ | ✅ | 4K, Multi-Image support |
| gptimage | tokens | ✅ | ❌ | OpenAI GPT Image Mini |
| gptimage-large | tokens | ✅ | ❌ | OpenAI GPT Image 1.5 |
| nanobanana | tokens | ✅ | ✅ | Gemini 2.5 Flash |
| nanobanana-pro | tokens | ✅ | ✅ | Gemini 3 Pro Thinking |

**🖼️ Image-to-Image (I2I)**:
Models with I2I support can transform existing images.
- Use \`reference_image\` parameter with URL or local path
- \`seedream-pro\` supports multiple images (comma-separated URLs)
- \`kontext\` specializes in in-context editing

**⚙️ Per-Model Parameters**:
- \`width/height\`: All models (default: 1024x1024)
- \`quality\`: gptimage only (low/med/high)
- \`transparent\`: gptimage only (true/false)
- \`seed\`: Reproducibility (-1 for random)`,

    args: {
        prompt: tool.schema.string().describe('Description of the image to generate'),
        model: tool.schema.string().optional().describe('Model to use (default: flux). Unknown models accepted as (beta).'),
        width: tool.schema.number().min(256).max(4096).optional().describe('Image width (default: 1024)'),
        height: tool.schema.number().min(256).max(4096).optional().describe('Image height (default: 1024)'),
        reference_image: tool.schema.string().optional().describe('URL(s) for image-to-image editing (comma-separated for multi-image models)'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        quality: tool.schema.enum(['low', 'med', 'high']).optional().describe('Quality for gptimage models only'),
        transparent: tool.schema.boolean().optional().describe('Transparent background for gptimage models only'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        const hasKey = hasApiKey();

        // Determine model based on key presence
        let model = args.model || DEFAULT_MODEL;
        const width = args.width || 1024;
        const height = args.height || 1024;

        // Fetch known models from registry
        const imageModels = getPaidImageModels();
        const knownModel = !!imageModels[model];
        const isBetaModel = !knownModel;

        // Force Auth Check for ALL Image Generations
        if (!hasKey) {
            return `❌ **Clé API Requise** pour la génération d'images.
💡 Utilisez \`/pollinations connect <clé>\` pour activer le service.
💎 Modèles disponibles: ${Object.keys(imageModels).slice(0, 5).join(', ')}...`;
        }

        // Unknown model → beta passthrough (don't reject)
        if (isBetaModel) {
            emitStatusToast('warning', `Modèle "${model}" non référencé — mode (beta)`, '🎨 gen_image');
        }

        // Validate I2I support (for known models only; beta models get default behavior)
        if (args.reference_image && knownModel && !supportsI2I(model)) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'Image-to-Image.
💡 Modèles I2I supportés: ${Object.entries(imageModels)
                    .filter(([, info]) => info.i2i)
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Estimate cost
        const estimatedCost = estimateImageCost(model);

        // Cost Guard check
        const costCheck = checkCostControl(model, estimatedCost, 'image');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }
        const costWarning = formatCostCheckMessage(costCheck);

        // Emit start toast
        emitStatusToast('info', `Génération image: ${model} (${width}×${height})`, '🎨 gen_image');

        // Set metadata
        context.metadata({ title: `🎨 Image: ${model}${isBetaModel ? ' (beta)' : ''}` });

        try {
            let imageData: Buffer;
            let responseHeaders: Record<string, string> = {};
            let usedModel = model;

            // === ENTER endpoint ONLY (gen.pollinations.ai) ===
            const params = new URLSearchParams({
                nologo: 'true',
                private: 'true',
                width: String(width),
                height: String(height),
            });

            // Model parameter
            params.set('model', model);

            // Seed
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            // I2I: reference image(s)
            if (args.reference_image) {
                // Check if it's a local file path
                let imageUrl = args.reference_image;
                if (!args.reference_image.startsWith('http')) {
                    // For local files, we'd need to upload first
                    // For now, require URL
                    return `❌ Les fichiers locaux nécessitent d'être uploadés d'abord.
💡 Utilisez l'outil \`file_to_url\` pour obtenir une URL publique.`;
                }
                params.set('image', imageUrl);
            }

            // Quality (gptimage only)
            if (args.quality && model.startsWith('gptimage')) {
                params.set('quality', args.quality);
            }

            // Transparent (gptimage only)
            if (args.transparent !== undefined && model.startsWith('gptimage')) {
                params.set('transparent', String(args.transparent));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            const url = `https://gen.pollinations.ai/image/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {};
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const result = await httpsGet(url, headers);
            imageData = result.data;
            responseHeaders = result.headers;

            // Update used model from response if available
            if (responseHeaders['x-model-used']) {
                usedModel = responseHeaders['x-model-used'];
            }

            // Save the image
            const outputDir = args.save_to || getDefaultOutputDir('images');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('image', usedModel, 'png');
            const filePath = path.join(outputDir, filename.endsWith('.png') ? filename : `${filename}.png`);

            fs.writeFileSync(filePath, imageData);
            const fileSize = fs.statSync(filePath).size;

            // Extract actual cost from headers if available
            let actualCost = estimatedCost;
            if (isCostEstimatorEnabled() && responseHeaders['x-usage-completion-image-tokens']) {
                const tokens = parseFloat(responseHeaders['x-usage-completion-image-tokens']);
                // Token-based cost calculation would go here
            }

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costWarning) {
                lines.push(costWarning);
                lines.push('');
            }

            lines.push(`🎨 Image Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt.substring(0, 100)}${args.prompt.length > 100 ? '...' : ''}`);
            lines.push(`Modèle: ${usedModel}${isBetaModel ? ' (beta)' : ''}`);
            lines.push(`Résolution: ${width}×${height}`);

            // Add I2I info if used
            if (args.reference_image) {
                lines.push(`I2I Source: ${args.reference_image.substring(0, 50)}...`);
            }

            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Cost info
            lines.push(`Coût estimé: ${formatCost(actualCost)}`);
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', `Image générée ✓ (${usedModel})`, '🎨 gen_image');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎨 gen_image');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants pour le modèle "${model}".
💡 Vérifiez votre solde avec /pollinations usage`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.
🔧 Vérifiez votre clé avec /pollinations connect`;
            }
            if (err.message?.includes('400')) {
                return `❌ Paramètres invalides: ${err.message}
💡 Vérifiez que le modèle supporte les paramètres fournis.`;
            }
            return `❌ Erreur génération image: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/gen_music.ts`

```typescript
/**
 * gen_music Tool - Pollinations Music Generation
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Model: elevenmusic (ElevenLabs Music)
 * Endpoint: gen.pollinations.ai/audio/{text}
 * 
 * Parameters:
 * - duration: 3-300 seconds
 * - instrumental: boolean (vocals or instrumental only)
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateMusicCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
} from './shared.js';
import { checkCostControl, formatCostCheckMessage } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const MIN_DURATION = 3;
const MAX_DURATION = 300; // 5 minutes
const DEFAULT_DURATION = 10;
const MODEL_NAME = 'elevenmusic';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genMusicTool: ToolDefinition = tool({
    description: `Generate music from a text description using Pollinations AI.

**🎵 Model:** elevenmusic (ElevenLabs Music)

**📝 Parameters:**
- \`duration\`: 3-300 seconds (default: 10s)
- \`instrumental\`: true = no vocals, false = vocals allowed

**💡 Example Prompts:**
- "upbeat jazz with saxophone solo"
- "ambient electronic for meditation"
- "epic orchestral film score with dramatic strings"
- "lo-fi hip hop beats with piano"
- "acoustic guitar ballad with soft vocals"
- "electronic dance music with heavy bass drop"

**💰 Cost:** ~0.005 🌻 per second
- 10 seconds ≈ 0.05 🌻
- 30 seconds ≈ 0.15 🌻
- 60 seconds ≈ 0.30 🌻

**⚠️ Notes:**
- Generation time scales with duration (~1s per second of audio)
- Longer tracks (60s+) may take 1-2 minutes
- Instrumental mode produces cleaner results for background music`,

    args: {
        prompt: tool.schema.string().describe('Description of the music to generate'),
        duration: tool.schema.number().min(MIN_DURATION).max(MAX_DURATION).optional()
            .describe(`Duration in seconds (default: ${DEFAULT_DURATION}, max: ${MAX_DURATION})`),
        instrumental: tool.schema.boolean().optional().describe('Instrumental only - no vocals (default: false)'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La génération musicale nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const duration = Math.min(args.duration || DEFAULT_DURATION, MAX_DURATION);
        const instrumental = args.instrumental || false;

        // Estimate cost
        const estimatedCost = estimateMusicCost(duration);

        // Cost Guard check
        const costCheck = checkCostControl(MODEL_NAME, estimatedCost, 'audio');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }
        const costWarning = formatCostCheckMessage(costCheck);

        // Estimate generation time
        const genTimeSeconds = Math.ceil(duration * 1.2);

        // Emit start toast
        emitStatusToast('info', `Génération musique: ${duration}s (~${genTimeSeconds}s gen)`, '🎵 gen_music');

        // Metadata
        context.metadata({ title: `🎵 Music: ${duration}s (~${genTimeSeconds}s gen time)` });

        try {
            // Build URL
            const params = new URLSearchParams({
                model: MODEL_NAME,
                nologo: 'true',
                private: 'true',
                duration: String(duration),
            });

            if (instrumental) {
                params.set('instrumental', 'true');
            }

            // Seed for reproducibility
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            const url = `https://gen.pollinations.ai/audio/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`,
            };

            // Music generation takes time
            const result = await httpsGet(url, headers);
            const audioData = result.data;
            const responseHeaders = result.headers;

            // Save audio
            const outputDir = args.save_to || getDefaultOutputDir('music');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('music', MODEL_NAME, 'mp3');
            const filePath = path.join(outputDir, filename.endsWith('.mp3') ? filename : `${filename}.mp3`);

            fs.writeFileSync(filePath, audioData);
            const fileSize = fs.statSync(filePath).size;

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costWarning) {
                lines.push(costWarning);
                lines.push('');
            }

            lines.push(`🎵 Musique Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt}`);
            lines.push(`Durée: ~${duration}s`);
            lines.push(`Mode: ${instrumental ? 'Instrumental (sans voix)' : 'Avec voix possible'}`);
            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);

            // Cost info
            if (isCostEstimatorEnabled()) {
                lines.push(`Coût estimé: ${formatCost(estimatedCost)}`);
            }

            if (responseHeaders['x-model-used']) {
                lines.push(`Modèle utilisé: ${responseHeaders['x-model-used']}`);
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Emit success toast
            emitStatusToast('success', `Musique générée ✓ (${duration}s)`, '🎵 gen_music');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎵 gen_music');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            if (err.message?.includes('Timeout')) {
                return `❌ Timeout - La génération musicale a pris trop de temps.
💡 Essayez une durée plus courte.`;
            }
            return `❌ Erreur génération musicale: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/gen_video.ts`

```typescript
/**
 * gen_video Tool - Pollinations Video Generation
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Video models with different capabilities:
 * - T2V (Text-to-Video): grok-video, ltx-2, veo, seedance, seedance-pro
 * - I2V (Image-to-Video): wan (I2V ONLY!), veo, seedance, seedance-pro
 * - Veo Interpolation: Uses image=url1,url2 for transitions
 * 
 * Response headers for cost tracking:
 * - x-usage-completion-video-seconds (grok, ltx-2, veo, wan)
 * - x-usage-completion-video-tokens (seedance, seedance-pro)
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsGet,
    ensureDir,
    generateFilename,
    getDefaultOutputDir,
    formatCost,
    formatFileSize,
    estimateVideoCost,
    extractCostFromHeaders,
    isCostEstimatorEnabled,
    supportsI2V,
    requiresI2V,
    validateAspectRatio,
    getDurationRange,
    getVideoModels,
} from './shared.js';
import { checkCostControl, formatCostCheckMessage } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const CHEAPEST_MODEL = 'grok-video';
const DEFAULT_DURATION = 3;
const DEFAULT_ASPECT_RATIO = '16:9';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const genVideoTool: ToolDefinition = tool({
    description: `Generate a video from a text prompt or image using Pollinations AI.

**🎬 Available Models:**

| Model | T2V | I2V | Audio | Duration | Aspect Ratios | Cost | Gen Time |
|-------|-----|-----|-------|----------|---------------|------|----------|
| grok-video | ✅ | ❌ | ✅ | 1-15s | 16:9, 9:16, 1:1, 4:3 | 0.0025/s | ~10s |
| ltx-2 | ✅ | ❌ | ✅ | 5-20s | 16:9 | 0.01/s | ~35s |
| wan | ❌ | ✅ | ✅ | 5-15s | 16:9, 9:16, 1:1, 4:3 | 0.025/s | ~30s |
| veo | ✅ | ✅ | ✅ | 4-8s | 16:9, 9:16, 1:1 | 0.15/s 💎 | ~45-68s |
| seedance | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens | ~30s |
| seedance-pro | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens | ~30s |

**⚠️ Important Notes:**
- \`wan\` = I2V **ONLY** (Text-to-Video NOT supported!)
- \`veo\` interpolation: Use \`reference_image=url1,url2\` for transitions
- \`ltx-2\` may return 520 intermittently (retry OK)
- \`grok-video\` includes audio generation

**💡 Tips:**
- Start with \`grok-video\` for testing (cheapest: 0.0025/sec)
- Use \`wan\` for image-to-video with native audio
- Use \`veo\` for highest quality (most expensive: 0.15/sec)`,

    args: {
        prompt: tool.schema.string().describe('Description of the video to generate'),
        model: tool.schema.string().optional().describe(`Video model (default: ${CHEAPEST_MODEL})`),
        duration: tool.schema.number().min(1).max(20).optional().describe('Duration in seconds (default: 3, varies by model)'),
        aspect_ratio: tool.schema.enum(['16:9', '9:16', '1:1', '4:3']).optional().describe('Aspect ratio (default: 16:9, varies by model)'),
        reference_image: tool.schema.string().optional().describe('URL for I2V (required for wan) or comma-separated URLs for veo interpolation'),
        seed: tool.schema.number().optional().describe('Seed for reproducibility (-1 for random)'),
        save_to: tool.schema.string().optional().describe('Custom output directory'),
        filename: tool.schema.string().optional().describe('Custom filename (without extension)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La génération vidéo nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = args.model || CHEAPEST_MODEL;
        const aspectRatio = args.aspect_ratio || DEFAULT_ASPECT_RATIO;

        // Get model config from dynamic registry
        const videoModels = getVideoModels();
        const modelConfig = videoModels[model];
        const isBetaModel = !modelConfig;

        if (isBetaModel) {
            emitStatusToast('warning', `Modèle "${model}" non référencé — mode (beta)`, '🎬 gen_video');
        }

        // Validate duration (for known models; beta models use defaults)
        const [minDuration, maxDuration] = isBetaModel ? [1, 20] : getDurationRange(model);
        const duration = args.duration || Math.min(DEFAULT_DURATION, maxDuration);

        if (duration < minDuration || duration > maxDuration) {
            return `❌ Durée invalide pour ${model}: ${duration}s
💡 Durée supportée: ${minDuration}-${maxDuration}s`;
        }

        // Validate aspect ratio (for known models; beta models accept any)
        if (!isBetaModel && !validateAspectRatio(model, aspectRatio)) {
            return `❌ Aspect ratio non supporté par ${model}: ${aspectRatio}
💡 Ratios supportés: ${modelConfig!.aspectRatios.join(', ')}`;
        }

        // Check I2V requirements
        const requiresReferenceImage = !isBetaModel && requiresI2V(model);
        const supportsReferenceImage = isBetaModel || supportsI2V(model);

        if (requiresReferenceImage && !args.reference_image) {
            return `❌ Le modèle "${model}" nécessite une image de départ (I2V ONLY).
💡 Ajoutez --reference_image <url>
💡 Pour du T2V, utilisez: grok-video, ltx-2, veo, seedance`;
        }

        if (args.reference_image && !supportsReferenceImage) {
            return `⚠️ Le modèle "${model}" ne supporte pas l'I2V.
💡 Modèles I2V: ${Object.entries(videoModels)
                    .filter(([, info]) => info.i2v)
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Estimate cost
        const estimatedCost = estimateVideoCost(model, duration);

        // Cost Guard check
        const costCheck = checkCostControl(model, estimatedCost, 'video');
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }
        const costWarning = formatCostCheckMessage(costCheck);

        // Emit start toast
        emitStatusToast('info', `Génération vidéo: ${model} (${duration}s)`, '🎬 gen_video');

        // Metadata
        context.metadata({ title: `🎬 Video: ${model}${isBetaModel ? ' (beta)' : ''} (${duration}s)` });

        try {
            // Build URL
            const params = new URLSearchParams({
                model: model,
                nologo: 'true',
                private: 'true',
            });

            // Duration parameter
            params.set('duration', String(duration));

            // Aspect ratio - convert to width/height for API
            const aspectToSize: Record<string, { w: number; h: number }> = {
                '16:9': { w: 1920, h: 1080 },
                '9:16': { w: 1080, h: 1920 },
                '1:1': { w: 1024, h: 1024 },
                '4:3': { w: 1440, h: 1080 },
            };
            const size = aspectToSize[aspectRatio] || aspectToSize['16:9'];
            params.set('width', String(size.w));
            params.set('height', String(size.h));

            // I2V: reference image(s)
            if (args.reference_image) {
                // Veo interpolation: comma-separated URLs
                // Other I2V models: single URL
                params.set('image', args.reference_image);
            }

            // Seed for reproducibility
            if (args.seed !== undefined) {
                params.set('seed', String(args.seed));
            }

            const promptEncoded = encodeURIComponent(args.prompt);
            const url = `https://gen.pollinations.ai/image/${promptEncoded}?${params}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${apiKey}`,
            };

            // Video generation takes time (30-70 seconds depending on model)
            const result = await httpsGet(url, headers);
            const videoData = result.data;
            const responseHeaders = result.headers;

            // Save video
            const outputDir = args.save_to || getDefaultOutputDir('videos');
            ensureDir(outputDir);

            const filename = args.filename || generateFilename('video', model, 'mp4');
            const filePath = path.join(outputDir, filename.endsWith('.mp4') ? filename : `${filename}.mp4`);

            fs.writeFileSync(filePath, videoData);
            const fileSize = fs.statSync(filePath).size;

            // Extract actual cost from headers
            let actualCost = estimatedCost;
            const costTracking = extractCostFromHeaders(responseHeaders);

            if (isCostEstimatorEnabled()) {
                if (costTracking.videoSeconds) {
                    // Calculate from actual seconds
                    const costMatch = modelConfig.cost.match(/[\d.]+/);
                    if (costMatch && modelConfig.costHeader === 'x-usage-completion-video-seconds') {
                        actualCost = costTracking.videoSeconds * parseFloat(costMatch[0]);
                    }
                } else if (costTracking.videoTokens) {
                    // Token-based cost (seedance models)
                    actualCost = costTracking.videoTokens * 0.00001; // Approximate
                }
            }

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costWarning) {
                lines.push(costWarning);
                lines.push('');
            }

            lines.push(`🎬 Vidéo Générée`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Prompt: ${args.prompt.substring(0, 80)}${args.prompt.length > 80 ? '...' : ''}`);
            lines.push(`Modèle: ${model}${isBetaModel ? ' (beta)' : ''}${modelConfig?.cost?.includes('💎') ? ' 💎' : ''}`);
            lines.push(`Durée: ~${duration}s`);
            lines.push(`Aspect: ${aspectRatio}`);

            // Add I2V info if used
            if (args.reference_image) {
                const isInterpolation = model === 'veo' && args.reference_image.includes(',');
                lines.push(`I2V Mode: ${isInterpolation ? 'Interpolation (multi-image)' : 'Single image'}`);
                lines.push(`Source: ${args.reference_image.substring(0, 50)}...`);
            }

            // Audio info (known models only)
            if (modelConfig?.audio) {
                lines.push(`Audio: ✅ Généré automatiquement`);
            } else if (!isBetaModel) {
                lines.push(`Audio: ❌ Non supporté par ce modèle`);
            }

            lines.push(`Fichier: ${filePath}`);
            lines.push(`Taille: ${formatFileSize(fileSize)}`);
            lines.push(`Coût estimé: ${formatCost(actualCost)}`);

            if (responseHeaders['x-model-used']) {
                lines.push(`Modèle utilisé: ${responseHeaders['x-model-used']}`);
            }
            if (responseHeaders['x-request-id']) {
                lines.push(`Request ID: ${responseHeaders['x-request-id']}`);
            }

            // Gen time estimate (known models only)
            if (modelConfig?.genTime) {
                lines.push(`⏱️ Temps de génération: ${modelConfig.genTime}`);
            }

            // Emit success toast
            emitStatusToast('success', `Vidéo générée ✓ (${model}, ${duration}s)`, '🎬 gen_video');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🎬 gen_video');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.
💡 Essayez \`grok-video\` (le moins cher: 0.0025/sec)`;
            }
            if (err.message?.includes('400')) {
                if (requiresI2V(model) && !args.reference_image) {
                    return `❌ Le modèle "${model}" est I2V ONLY.
💡 Ajoutez --reference_image <url>`;
                }
                return `❌ Paramètres invalides: ${err.message}`;
            }
            if (err.message?.includes('520') && model === 'ltx-2') {
                return `⚠️ LTX-2 a retourné une erreur 520 (intermittent).
💡 Réessayez dans quelques secondes.`;
            }
            if (err.message?.includes('Timeout')) {
                return `❌ Timeout - La génération vidéo a pris trop de temps.
💡 Réessayez avec une durée plus courte.`;
            }
            return `❌ Erreur génération vidéo: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/polli_web_search.ts`

```typescript
/**
 * polli_web_search Tool - Unified Web Search via Pollinations AI
 * 
 * Replaces: deepsearch.ts + search_crawl_scrape.ts
 * 
 * Three modes mapped to API models:
 * - rapid: Fast web search (perplexity-fast or Google Search model)
 * - medium: Standard web search with sources (perplexity-fast)
 * - deep: Deep research with reasoning (perplexity-reasoning)
 * 
 * Models are resolved dynamically from /text/models registry.
 * Integrated with Cost Guard and Toast notifications.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
    formatCost,
} from './shared.js';
import { checkCostControl, formatCostCheckMessage } from './cost-guard.js';
import { emitStatusToast } from '../../server/toast.js';

// ─── Mode Configuration ────────────────────────────────────────────────────

interface SearchMode {
    model: string;
    maxTokens: number;
    systemPrompt: string;
    label: string;
    emoji: string;
}

const SEARCH_MODES: Record<string, SearchMode> = {
    rapid: {
        model: 'perplexity-fast',
        maxTokens: 1500,
        systemPrompt: 'You are a quick web search assistant. Provide concise, accurate answers with key sources. Be efficient and direct.',
        label: 'Recherche Rapide',
        emoji: '⚡',
    },
    medium: {
        model: 'perplexity-fast',
        maxTokens: 3000,
        systemPrompt: 'You are a web search assistant. Provide comprehensive research with analysis, sources, and reasoning steps. Always include source URLs.',
        label: 'Recherche Standard',
        emoji: '🔎',
    },
    deep: {
        model: 'perplexity-reasoning',
        maxTokens: 8000,
        systemPrompt: 'You are a deep research assistant. Provide exhaustive research with multiple perspectives, detailed analysis, all relevant sources, and thorough fact-checking. Consider edge cases and alternative viewpoints. Always include source URLs.',
        label: 'Recherche Profonde',
        emoji: '🔬',
    },
};

// ─── Cost Estimation ────────────────────────────────────────────────────

function estimateSearchCost(mode: string): number {
    switch (mode) {
        case 'rapid': return 0.001;
        case 'medium': return 0.003;
        case 'deep': return 0.008;
        default: return 0.003;
    }
}

// ─── Tool Definition ──────────────────────────────────────────────────────

export const polliWebSearchTool: ToolDefinition = tool({
    description: `Search the web using Pollinations AI with three depth levels.

**Modes:**

| Mode | Modèle | Usage | Coût estimé |
|------|--------|-------|-------------|
| ⚡ rapid | perplexity-fast | Quick facts, current events | ~0.001 🌻 |
| 🔎 medium | perplexity-fast | Standard research with sources | ~0.003 🌻 |
| 🔬 deep | perplexity-reasoning | In-depth analysis, multi-perspective | ~0.008 🌻 |

**💡 Tips:**
- Use \`rapid\` for quick lookups and current news
- Use \`medium\` for documentation search and general queries
- Use \`deep\` for complex research, fact-checking, and analysis
- Add \`recency\` filter for time-sensitive queries`,

    args: {
        query: tool.schema.string().describe('Search query or research question'),
        mode: tool.schema.enum(['rapid', 'medium', 'deep']).optional()
            .describe('Search depth (default: medium)'),
        include_sources: tool.schema.boolean().optional()
            .describe('Include source URLs in response (default: true)'),
        recency: tool.schema.enum(['any', 'day', 'week', 'month']).optional()
            .describe('Filter by recency (default: any)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Web Search nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const mode = args.mode || 'medium';
        const modeConfig = SEARCH_MODES[mode];
        const includeSources = args.include_sources !== false;

        // Cost Guard
        const estimatedCost = estimateSearchCost(mode);
        const costCheck = checkCostControl(modeConfig.model, estimatedCost, 'audio'); // text models use audio category
        if (!costCheck.allowed) {
            return costCheck.message || '❌ Opération bloquée par le Cost Guard.';
        }
        const costWarning = formatCostCheckMessage(costCheck);

        // Emit start toast
        emitStatusToast('info', `${modeConfig.emoji} ${modeConfig.label}: ${args.query.substring(0, 40)}...`, '🌐 polli_web_search');

        // Metadata
        context.metadata({ title: `${modeConfig.emoji} Search: ${args.query.substring(0, 50)}...` });

        try {
            // Build recency hint
            const recencyHints: Record<string, string> = {
                any: '',
                day: 'Focus on information from the last 24 hours. ',
                week: 'Focus on information from the last week. ',
                month: 'Focus on information from the last month. ',
            };

            const systemPrompt = `${modeConfig.systemPrompt}
${recencyHints[args.recency || 'any']}
${includeSources ? 'Always include source URLs at the end of your response.' : ''}`;

            const { data } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: modeConfig.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: modeConfig.maxTokens,
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(data.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No results found';

            // Build result
            const lines: string[] = [];

            // Inject costWarning at top if present
            if (costWarning) {
                lines.push(costWarning);
                lines.push('');
            }

            lines.push(`${modeConfig.emoji} ${modeConfig.label}`);
            lines.push(`━━━━━━━━━━━━━━━━━━`);
            lines.push(`Query: ${args.query}`);
            lines.push(`Mode: ${mode} | Modèle: ${modeConfig.model}`);
            if (args.recency && args.recency !== 'any') {
                lines.push(`Récence: ${args.recency}`);
            }
            lines.push(`Coût estimé: ${formatCost(estimatedCost)}`);
            lines.push('');
            lines.push(content);

            // Emit success toast
            emitStatusToast('success', `Recherche terminée ✓ (${mode})`, '🌐 polli_web_search');

            return lines.join('\n');

        } catch (err: any) {
            emitStatusToast('error', `Erreur: ${err.message?.substring(0, 60)}`, '🌐 polli_web_search');

            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits pollen insuffisants.`;
            }
            return `❌ Erreur Web Search: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/search_crawl_scrape.ts`

```typescript
/**
 * search_crawl_scrape Tool - Web Search and Content Extraction
 * 
 * Uses perplexity-fast for quick web search with sources
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import {
    getApiKey,
    httpsPost,
} from './shared.js';

// ─── Tool Definition ──────────────────────────────────────────────────────

export const searchCrawlScrapeTool: ToolDefinition = tool({
    description: `Search the web and extract information quickly.

**Model:** perplexity-fast

**Features:**
- Real-time web search
- Source citations
- Quick summaries
- Current information

**Use for:**
- Quick fact lookups
- Current news/events
- Documentation search
- General web queries

**Cost:** ~0.000001 🌻 per token (very cheap)`,

    args: {
        query: tool.schema.string().describe('Search query'),
        include_sources: tool.schema.boolean().optional()
            .describe('Include source URLs in response (default: true)'),
        recency: tool.schema.enum(['any', 'day', 'week', 'month']).optional()
            .describe('Filter by recency (default: any)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ Web Search nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = 'perplexity-fast';
        const includeSources = args.include_sources !== false;

        // Build recency hint
        const recencyHints: Record<string, string> = {
            any: '',
            day: 'Focus on information from the last 24 hours. ',
            week: 'Focus on information from the last week. ',
            month: 'Focus on information from the last month. ',
        };

        // Metadata
        context.metadata({ title: `🔎 Search: ${args.query.substring(0, 40)}...` });

        try {
            const systemPrompt = `You are a web search assistant. Provide concise, accurate answers based on web search results.
${recencyHints[args.recency || 'any']}
${includeSources ? 'Always include source URLs at the end of your response.' : ''}`;

            const { data } = await httpsPost(
                'https://gen.pollinations.ai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: args.query },
                    ],
                    max_tokens: 2000,
                },
                {
                    'Authorization': `Bearer ${apiKey}`,
                }
            );

            const jsonData = JSON.parse(data.toString());
            const content = jsonData.choices?.[0]?.message?.content || 'No results found';

            // Format result
            const lines = [
                `🔎 Web Search Results`,
                `━━━━━━━━━━━━━━━━━━`,
                `Query: ${args.query}`,
                `Model: ${model}`,
                ``,
                content,
            ];

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            return `❌ Erreur Web Search: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/pollinations/shared.ts`

```typescript
/**
 * Shared utilities for Pollinations API tools
 * 
 * Updated: 2026-02-18 - Sprint 2: Dynamic ModelRegistry integration
 * Hardcoded model lists replaced by ModelRegistry lookups with static fallback.
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import type { PollinationsModel } from '../../server/models/types.js';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PollinationsConfig {
    apiKey?: string;
    mode?: string;
}

export interface ModelInfo {
    name: string;
    pricing: {
        currency: string;
        completionImageTokens?: number;
        completionVideoSeconds?: number;
        completionVideoTokens?: number;
        completionAudioTokens?: number;
        completionAudioSeconds?: number;
        promptAudioSeconds?: number;
        promptTextTokens?: number;
        completionTextTokens?: number;
    };
    paid_only?: boolean;
    input_modalities?: string[];
    output_modalities?: string[];
    description?: string;
}

export interface GenerationResult {
    success: boolean;
    url?: string;
    localPath?: string;
    cost: number;
    model: string;
    error?: string;
}

export interface CostTracking {
    imageTokens?: number;
    videoSeconds?: number;
    videoTokens?: number;
    modelUsed?: string;
    requestId?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────

const API_BASE = 'gen.pollinations.ai';
const FREE_IMAGE_BASE = 'image.pollinations.ai';

export function getApiKey(): string | undefined {
    const config = loadConfig();
    return config.apiKey;
}

export function hasApiKey(): boolean {
    const key = getApiKey();
    return !!(key && key.length > 5 && key !== 'dummy');
}

// ─── Model Data (Dynamic via ModelRegistry) ───────────────────────────────

/**
 * FREE Image Models (DEPRECATED - image.pollinations.ai is dead)
 */
export const FREE_IMAGE_MODELS = {};

/**
 * Dynamic Paid Image Models accessor.
 * Returns data from ModelRegistry if ready, otherwise falls back to static data.
 * 
 * BACKWARD COMPATIBLE: Same shape as the old hardcoded PAID_IMAGE_MODELS
 */
export function getPaidImageModels(): Record<string, {
    desc: string;
    cost: string;
    t2i: boolean;
    i2i: boolean;
    params: string[];
    notes?: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('image');
        const result: Record<string, any> = {};
        for (const m of models) {
            const costStr = formatPricingForDisplay(m);
            result[m.name] = {
                desc: m.description,
                cost: costStr,
                t2i: true, // All image models support T2I
                i2i: m.supportsI2X,
                params: m.supportsI2X
                    ? ['width', 'height', 'image']
                    : ['width', 'height'],
                notes: m.paid_only ? 'Paid Only' : undefined,
            };
        }
        return result;
    }
    return _STATIC_PAID_IMAGE_MODELS;
}

/**
 * Dynamic Video Models accessor.
 * BACKWARD COMPATIBLE: Same shape as old VIDEO_MODELS
 */
export function getVideoModels(): Record<string, {
    desc: string;
    cost: string;
    t2v: boolean;
    i2v: boolean;
    audio: boolean;
    duration: [number, number];
    aspectRatios: string[];
    costHeader: string;
    genTime: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('video');
        const result: Record<string, any> = {};
        for (const m of models) {
            const costStr = formatPricingForDisplay(m);
            result[m.name] = {
                desc: m.description,
                cost: costStr,
                t2v: !_STATIC_I2V_ONLY.has(m.name), // wan is I2V only
                i2v: m.supportsI2X,
                audio: !_STATIC_NO_AUDIO.has(m.name),
                duration: m.durationRange || [1, 10],
                aspectRatios: m.aspectRatios || ['16:9'],
                costHeader: m.costHeader || 'x-usage-completion-video-seconds',
                genTime: m.genTimeEstimate || '~30s',
            };
        }
        return result;
    }
    return _STATIC_VIDEO_MODELS;
}

/**
 * Dynamic Audio Models accessor.
 * BACKWARD COMPATIBLE: Same shape as old AUDIO_MODELS
 */
export function getAudioModels(): Record<string, {
    desc: string;
    type: 'tts' | 'stt' | 'both';
    endpoint: string;
    params: string[];
    voices?: string[];
    notes?: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('audio');
        const result: Record<string, any> = {};
        for (const m of models) {
            const audioType = detectAudioType(m);
            result[m.name] = {
                desc: m.description,
                type: audioType,
                endpoint: _STATIC_AUDIO_ENDPOINTS[m.name] || (audioType === 'stt' ? '/v1/audio/transcriptions' : `/audio/{text}`),
                params: audioType === 'stt' ? ['file'] : ['voice', 'format'],
                voices: m.voices,
                notes: m.paid_only ? 'Paid Only' : undefined,
            };
        }
        return result;
    }
    return _STATIC_AUDIO_MODELS;
}

/**
 * Music Model accessor (backward compatible)
 */
export function getMusicModel(): Record<string, {
    desc: string;
    endpoint: string;
    params: string[];
    duration: [number, number];
}> {
    // Check registry for elevenmusic
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenmusic');
        if (m) {
            return {
                'elevenmusic': {
                    desc: m.description,
                    endpoint: '/audio/{text}',
                    params: ['duration', 'instrumental'],
                    duration: [3, 300],
                }
            };
        }
    }
    return _STATIC_MUSIC_MODEL;
}

// ─── Backward Compatibility ──────────────────────────────────────────────
// OLD const exports removed (caused TDZ error at module load).
// Consumers must use the function forms:
//   getPaidImageModels(), getVideoModels(), getAudioModels(), getMusicModel()
// For direct model lookup: use ModelRegistry.getByNameOrAlias()

// ─── Private Static Fallback Data ─────────────────────────────────────────
// Used ONLY when ModelRegistry is not ready (startup race, offline).

const _STATIC_I2V_ONLY = new Set(['wan']); // Models that are I2V only (no T2V)
const _STATIC_NO_AUDIO = new Set(['seedance', 'seedance-pro']); // Video models without audio

const _STATIC_AUDIO_ENDPOINTS: Record<string, string> = {
    'openai-audio': '/v1/chat/completions',
    'elevenlabs': '/audio/{text}',
    'whisper': '/v1/audio/transcriptions',
    'scribe': '/v1/audio/transcriptions',
    'elevenmusic': '/audio/{text}',
};

const _STATIC_PAID_IMAGE_MODELS: Record<string, {
    desc: string;
    cost: string;
    t2i: boolean;
    i2i: boolean;
    params: string[];
    notes?: string;
}> = {
    'flux': { desc: 'Flux Schnell', cost: '0.0002 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'sana': { desc: 'Sana (Efficient)', cost: '0.0002 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'zimage': { desc: 'Z-Image Turbo (6B Flux 2x)', cost: '0.0002 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'imagen-4': { desc: 'Imagen 4 (alpha)', cost: '0.0025 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'klein': { desc: 'FLUX.2 Klein 4B', cost: '0.008 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'klein-large': { desc: 'FLUX.2 Klein 9B', cost: '0.012 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'gptimage': { desc: 'GPT Image 1 Mini (OpenAI)', cost: 'tokens', t2i: true, i2i: false, params: ['width', 'height', 'quality', 'transparent'] },
    'gptimage-large': { desc: 'GPT Image 1.5 (Advanced)', cost: 'tokens', t2i: true, i2i: false, params: ['width', 'height', 'quality', 'transparent'] },
    'kontext': { desc: 'FLUX.1 Kontext', cost: '0.04 🌻 💎', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: 'In-Context Editing' },
    'seedream': { desc: 'Seedream 4.0 (ByteDance ARK)', cost: '0.03 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'seedream-pro': { desc: 'Seedream 4.5 Pro (ARK 4K)', cost: '0.04 🌻 💎', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: '4K, Multi-Image' },
    'nanobanana': { desc: 'NanoBanana (Gemini 2.5 Flash)', cost: 'tokens', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'nanobanana-pro': { desc: 'NanoBanana Pro (Gemini 3 Pro)', cost: 'tokens', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: 'Thinking Model' },
};

const _STATIC_VIDEO_MODELS: Record<string, {
    desc: string;
    cost: string;
    t2v: boolean;
    i2v: boolean;
    audio: boolean;
    duration: [number, number];
    aspectRatios: string[];
    costHeader: string;
    genTime: string;
}> = {
    'grok-video': {
        desc: 'Grok Video (alpha)',
        cost: '0.0025/sec',
        t2v: true, i2v: false, audio: true,
        duration: [1, 15],
        aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~10s'
    },
    'ltx-2': {
        desc: 'LTX-2 (Lightricks)',
        cost: '0.01/sec',
        t2v: true, i2v: false, audio: true,
        duration: [5, 20],
        aspectRatios: ['16:9'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~35s'
    },
    'wan': {
        desc: 'Wan 2.6 (Alibaba)',
        cost: '0.025/sec',
        t2v: false, i2v: true, audio: true,
        duration: [5, 15],
        aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~30s'
    },
    'veo': {
        desc: 'Veo 3.1 Fast (Google)',
        cost: '0.15/sec 💎',
        t2v: true, i2v: true, audio: true,
        duration: [4, 8],
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~45-68s',
    },
    'seedance': {
        desc: 'Seedance Lite (BytePlus)',
        cost: 'tokens',
        t2v: true, i2v: true, audio: false,
        duration: [4, 12],
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-tokens',
        genTime: '~30s'
    },
    'seedance-pro': {
        desc: 'Seedance Pro-Fast (BytePlus)',
        cost: 'tokens',
        t2v: true, i2v: true, audio: false,
        duration: [4, 12],
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-tokens',
        genTime: '~30s'
    },
};

const _STATIC_AUDIO_MODELS: Record<string, {
    desc: string;
    type: 'tts' | 'stt' | 'both';
    endpoint: string;
    params: string[];
    voices?: string[];
    notes?: string;
}> = {
    'openai-audio': {
        desc: 'GPT-4o Audio Preview',
        type: 'both',
        endpoint: '/v1/chat/completions',
        params: ['voice', 'format'],
        voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        notes: 'DEFAULT - least expensive'
    },
    'elevenlabs': {
        desc: 'ElevenLabs v3',
        type: 'tts',
        endpoint: '/audio/{text}',
        params: ['voice', 'response_format'],
        voices: ['rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy', 'sarah', 'emily', 'lily', 'matilda', 'adam', 'antoni', 'arnold', 'josh', 'sam', 'daniel', 'charlie', 'james', 'fin', 'callum', 'liam', 'george', 'brian', 'bill', 'ash', 'ballad', 'coral', 'sage', 'verse'],
    },
    'whisper': {
        desc: 'OpenAI Whisper v3',
        type: 'stt',
        endpoint: '/v1/audio/transcriptions',
        params: ['file'],
        notes: 'POST ONLY (multipart)'
    },
};

const _STATIC_MUSIC_MODEL = {
    'elevenmusic': {
        desc: 'ElevenLabs Music',
        endpoint: '/audio/{text}',
        params: ['duration', 'instrumental'],
        duration: [3, 300] as [number, number],
    }
};

// ─── Private Helpers ─────────────────────────────────────────────────────

function formatPricingForDisplay(m: PollinationsModel): string {
    const p = m.pricing;
    if (p.completionImageTokens) {
        return p.completionImageTokens < 0.001
            ? 'tokens'
            : `${p.completionImageTokens} 🌻${m.paid_only ? ' 💎' : ''}`;
    }
    if (p.completionVideoSeconds) {
        return `${p.completionVideoSeconds}/sec${m.paid_only ? ' 💎' : ''}`;
    }
    if (p.completionVideoTokens) {
        return 'tokens';
    }
    if (p.completionAudioTokens) {
        return `${p.completionAudioTokens} 🌻/tok`;
    }
    if (p.completionAudioSeconds) {
        return `${p.completionAudioSeconds}/sec`;
    }
    if (p.promptAudioSeconds) {
        return `${p.promptAudioSeconds}/sec`;
    }
    return 'tokens';
}

function detectAudioType(m: PollinationsModel): 'tts' | 'stt' | 'both' {
    const hasAudioInput = m.input_modalities.includes('audio');
    const hasAudioOutput = m.output_modalities.includes('audio');
    if (hasAudioInput && hasAudioOutput) return 'both';
    if (hasAudioInput) return 'stt';
    return 'tts';
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────

export function httpsGet(
    url: string,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            // Handle redirects
            if ([301, 302, 307].includes(res.statusCode || 0) && res.headers.location) {
                httpsGet(res.headers.location, headers).then(resolve).catch(reject);
                return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

export function httpsPost(
    url: string,
    body: any,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const bodyData = typeof body === 'string' ? body : JSON.stringify(body);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData),
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    const errorBody = Buffer.concat(chunks).toString();
                    reject(new Error(`HTTP ${res.statusCode}: ${errorBody.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.write(bodyData);
        req.end();
    });
}

/**
 * Multipart POST for file uploads (STT)
 */
export function httpsPostMultipart(
    url: string,
    fields: Record<string, string | Buffer>,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const boundary = `----FormBoundary${Date.now()}`;

        const parts: Buffer[] = [];
        for (const [key, value] of Object.entries(fields)) {
            parts.push(Buffer.from(`--${boundary}\r\n`));
            if (Buffer.isBuffer(value)) {
                parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="audio.mp3"\r\n`));
                parts.push(Buffer.from(`Content-Type: audio/mpeg\r\n\r\n`));
                parts.push(value);
                parts.push(Buffer.from('\r\n'));
            } else {
                parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
                parts.push(Buffer.from(value));
                parts.push(Buffer.from('\r\n'));
            }
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const bodyData = Buffer.concat(parts);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyData.length,
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    const errorBody = Buffer.concat(chunks).toString();
                    reject(new Error(`HTTP ${res.statusCode}: ${errorBody.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.write(bodyData);
        req.end();
    });
}

// ─── Model Discovery (delegated to ModelRegistry) ─────────────────────────

/**
 * @deprecated Use ModelRegistry.list() directly
 */
export async function fetchModels(type: 'image' | 'audio' | 'text'): Promise<ModelInfo[]> {
    ModelRegistry.ensureFresh();
    const models = ModelRegistry.list(type as any);
    return models.map(m => ({
        name: m.name,
        pricing: m.pricing,
        paid_only: m.paid_only,
        input_modalities: m.input_modalities,
        output_modalities: m.output_modalities,
        description: m.description,
    }));
}

/**
 * @deprecated Use ModelRegistry.get() directly
 */
export async function getModelInfo(type: 'image' | 'audio' | 'text', name: string): Promise<ModelInfo | undefined> {
    ModelRegistry.ensureFresh();
    const m = ModelRegistry.getByNameOrAlias(type as any, name);
    if (!m) return undefined;
    return {
        name: m.name,
        pricing: m.pricing,
        paid_only: m.paid_only,
        input_modalities: m.input_modalities,
        output_modalities: m.output_modalities,
        description: m.description,
    };
}

// ─── Cost Estimation & Tracking ───────────────────────────────────────────

/**
 * Extract cost tracking from response headers
 */
export function extractCostFromHeaders(headers: Record<string, string>): CostTracking {
    return {
        imageTokens: headers['x-usage-completion-image-tokens']
            ? parseFloat(headers['x-usage-completion-image-tokens'])
            : undefined,
        videoSeconds: headers['x-usage-completion-video-seconds']
            ? parseFloat(headers['x-usage-completion-video-seconds'])
            : undefined,
        videoTokens: headers['x-usage-completion-video-tokens']
            ? parseFloat(headers['x-usage-completion-video-tokens'])
            : undefined,
        modelUsed: headers['x-model-used'],
        requestId: headers['x-request-id'],
    };
}

/**
 * Check if cost estimator is enabled in config
 */
export function isCostEstimatorEnabled(): boolean {
    const config = loadConfig() as any;
    return config.costEstimator !== false; // Default true
}

export function estimateImageCost(model: string): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('image', model);
        if (m && m.pricing.completionImageTokens) {
            return m.pricing.completionImageTokens;
        }
    }
    // Fallback to static
    const info = _STATIC_PAID_IMAGE_MODELS[model];
    if (!info) return 0.0002;
    const costMatch = info.cost.match(/[\d.]+/);
    return costMatch ? parseFloat(costMatch[0]) : 0.0002;
}

export function estimateVideoCost(model: string, duration: number): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        if (m) {
            if (m.pricing.completionVideoSeconds) {
                return duration * m.pricing.completionVideoSeconds;
            }
            if (m.pricing.completionVideoTokens) {
                const tokensPerSecond = 21780;
                return (duration * tokensPerSecond) * m.pricing.completionVideoTokens;
            }
        }
    }
    // Fallback to static
    const info = _STATIC_VIDEO_MODELS[model];
    if (!info) return duration * 0.01;

    if (info.costHeader === 'x-usage-completion-video-tokens') {
        const tokensPerSecond = 21780;
        return (duration * tokensPerSecond) * 0.00001;
    }

    const costMatch = info.cost.match(/[\d.]+/);
    const perSecond = costMatch ? parseFloat(costMatch[0]) : 0.01;
    return duration * perSecond;
}

export function estimateTtsCost(textLength: number): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenlabs');
        if (m && m.pricing.completionAudioTokens) {
            return (textLength / 1000) * m.pricing.completionAudioTokens;
        }
    }
    return (textLength / 1000) * 0.00018;
}

export function estimateMusicCost(duration: number): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenmusic');
        if (m && m.pricing.completionAudioSeconds) {
            return duration * m.pricing.completionAudioSeconds;
        }
    }
    return duration * 0.005;
}

// ─── File Utils ──────────────────────────────────────────────────────────

export function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function generateFilename(type: string, model: string, ext: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${type}_${model}_${timestamp}.${ext}`;
}

export function getDefaultOutputDir(type: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    return path.join(home, 'Downloads', 'pollinations', type);
}

export function formatCost(cost: number): string {
    if (cost < 0.001) return `${(cost * 1000).toFixed(4)} m🌻`;
    if (cost < 1) return `${cost.toFixed(4)} 🌻`;
    return `${cost.toFixed(2)} 🌻`;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Validation Helpers (Dynamic via ModelRegistry) ──────────────────────

/**
 * Check if model supports Image-to-Image
 */
export function supportsI2I(model: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('image', model);
        return m?.supportsI2X === true;
    }
    const info = _STATIC_PAID_IMAGE_MODELS[model];
    return info?.i2i === true;
}

/**
 * Check if video model supports Image-to-Video
 */
export function supportsI2V(model: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return m?.supportsI2X === true;
    }
    const info = _STATIC_VIDEO_MODELS[model];
    return info?.i2v === true;
}

/**
 * Check if video model requires Image-to-Video (no T2V)
 */
export function requiresI2V(model: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        if (m) {
            return _STATIC_I2V_ONLY.has(m.name); // Only wan is I2V-only for now
        }
    }
    const info = _STATIC_VIDEO_MODELS[model];
    return info?.t2v === false && info?.i2v === true;
}

/**
 * Validate aspect ratio for video model
 */
export function validateAspectRatio(model: string, ratio: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return m?.aspectRatios?.includes(ratio) ?? false;
    }
    const info = _STATIC_VIDEO_MODELS[model];
    return info?.aspectRatios.includes(ratio) ?? false;
}

/**
 * Get valid duration range for video model
 */
export function getDurationRange(model: string): [number, number] {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return (m?.durationRange as [number, number]) ?? [1, 10];
    }
    const info = _STATIC_VIDEO_MODELS[model];
    return info?.duration ?? [1, 10];
}

```

##### 📄 `tools/pollinations/transcribe_audio.ts`

```typescript
/**
 * transcribe_audio Tool - Pollinations Speech-to-Text (STT)
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * 
 * Two STT options:
 * 1. openai-audio (DEFAULT): GPT-4o Audio Preview - uses /v1/chat/completions with modalities
 *    - Least expensive option
 *    - Can handle both audio input and output
 * 
 * 2. whisper: OpenAI Whisper v3 - uses /v1/audio/transcriptions
 *    - POST ONLY with multipart/form-data
 *    - Specialized for transcription
 *    - Higher accuracy for long audio
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import {
    getApiKey,
    httpsPost,
    httpsPostMultipart,
    ensureDir,
    formatFileSize,
    getAudioModels,
} from './shared.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'openai-audio';
const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg'];

// ─── Tool Definition ──────────────────────────────────────────────────────

export const transcribeAudioTool: ToolDefinition = tool({
    description: `Transcribe audio to text using Pollinations AI.

**🎙️ Models:**

| Model | Endpoint | Best For | Notes |
|-------|----------|----------|-------|
| openai-audio | /v1/chat/completions | Short-medium audio | **DEFAULT** - lowest cost |
| whisper | /v1/audio/transcriptions | Long audio, high accuracy | POST multipart only |

**📁 Supported Formats:**
mp3, wav, m4a, webm, mp4, mpeg, mpga, oga, ogg

**💡 Tips:**
- Use \`openai-audio\` for cost-effective transcription
- Use \`whisper\` for highest accuracy on long recordings
- Supports both local files and URLs

**📋 Output:**
- Returns transcribed text
- Includes detected language (if available)
- Shows processing time`,

    args: {
        file: tool.schema.string().describe('Path to audio file or URL to transcribe'),
        model: tool.schema.string().optional().describe(`STT model (default: ${DEFAULT_MODEL})`),
        language: tool.schema.string().optional().describe('Language hint (e.g., "en", "fr", "es")'),
        save_transcript: tool.schema.boolean().optional().describe('Save transcript to file (default: false)'),
    },

    async execute(args, context) {
        const apiKey = getApiKey();
        if (!apiKey) {
            return `❌ La transcription nécessite une clé API Pollinations.
🔧 Connectez votre clé avec /pollinations connect`;
        }

        const model = args.model || DEFAULT_MODEL;

        // Validate model
        const audioModels = getAudioModels();
        const modelInfo = audioModels[model];
        if (!modelInfo || (modelInfo.type !== 'stt' && modelInfo.type !== 'both')) {
            return `❌ Modèle STT inconnu: ${model}
💡 Modèles STT disponibles: ${Object.entries(audioModels)
                    .filter(([, info]) => info.type === 'stt' || info.type === 'both')
                    .map(([name]) => name)
                    .join(', ')}`;
        }

        // Check file
        let audioPath = args.file;
        let audioBuffer: Buffer;
        let fileName = 'audio.mp3';

        if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
            // Download from URL
            context.metadata({ title: `🎙️ STT: Downloading...` });

            try {
                const https = await import('https');
                const http = await import('http');
                const protocol = audioPath.startsWith('https') ? https : http;

                audioBuffer = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    protocol.get(audioPath, (res) => {
                        if (res.statusCode === 301 || res.statusCode === 302) {
                            // Follow redirect
                            const redirectUrl = res.headers.location;
                            if (redirectUrl) {
                                const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
                                redirectProtocol.get(redirectUrl, (res2) => {
                                    res2.on('data', chunk => chunks.push(chunk));
                                    res2.on('end', () => resolve(Buffer.concat(chunks)));
                                    res2.on('error', reject);
                                }).on('error', reject);
                                return;
                            }
                        }
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });

                // Extract filename from URL
                try {
                    const urlPath = new URL(audioPath).pathname;
                    fileName = path.basename(urlPath) || 'audio.mp3';
                } catch {
                    fileName = 'audio.mp3';
                }

            } catch (err: any) {
                return `❌ Impossible de télécharger l'audio: ${err.message}`;
            }

        } else {
            // Local file
            if (!fs.existsSync(audioPath)) {
                return `❌ Fichier non trouvé: ${audioPath}`;
            }

            // Check format
            const ext = path.extname(audioPath).toLowerCase().replace('.', '');
            if (!SUPPORTED_FORMATS.includes(ext)) {
                return `⚠️ Format non supporté: .${ext}
💡 Formats supportés: ${SUPPORTED_FORMATS.join(', ')}`;
            }

            audioBuffer = fs.readFileSync(audioPath);
            fileName = path.basename(audioPath);
        }

        const fileSize = audioBuffer.length;

        // Metadata
        context.metadata({ title: `🎙️ STT: ${model} (${formatFileSize(fileSize)})` });

        try {
            let transcript = '';
            let detectedLanguage = '';

            if (model === 'openai-audio') {
                // === OpenAI Audio: Use modalities endpoint ===
                // Convert audio to base64
                const base64Audio = audioBuffer.toString('base64');
                const mimeType = fileName.endsWith('.mp3') ? 'audio/mpeg' :
                    fileName.endsWith('.wav') ? 'audio/wav' :
                        'audio/mp4';

                const response = await httpsPost(
                    'https://gen.pollinations.ai/v1/chat/completions',
                    {
                        model: 'openai-audio',
                        modalities: ['text', 'audio'],
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: args.language
                                            ? `Transcribe this audio to text. Language: ${args.language}`
                                            : 'Transcribe this audio to text.'
                                    },
                                    {
                                        type: 'input_audio',
                                        input_audio: {
                                            data: base64Audio,
                                            format: fileName.endsWith('.mp3') ? 'mp3' : 'wav'
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );

                const data = JSON.parse(response.data.toString());
                transcript = data.choices?.[0]?.message?.content || '';

            } else if (model === 'whisper') {
                // === Whisper: Use multipart endpoint ===
                const fields: Record<string, string | Buffer> = {
                    file: audioBuffer,
                    model: 'whisper',
                };

                if (args.language) {
                    fields.language = args.language;
                }

                const response = await httpsPostMultipart(
                    'https://gen.pollinations.ai/v1/audio/transcriptions',
                    fields,
                    {
                        'Authorization': `Bearer ${apiKey}`,
                    }
                );

                const data = JSON.parse(response.data.toString());
                transcript = data.text || '';
                detectedLanguage = data.language || '';
            }

            if (!transcript) {
                return `❌ Aucune transcription générée.
💡 Vérifiez que l'audio contient de la parole claire.`;
            }

            // Build result
            const lines: string[] = [
                `🎙️ Transcription Audio`,
                `━━━━━━━━━━━━━━━━━━`,
                `Fichier: ${fileName}`,
                `Taille: ${formatFileSize(fileSize)}`,
                `Modèle: ${model}`,
            ];

            if (detectedLanguage) {
                lines.push(`Langue détectée: ${detectedLanguage}`);
            }
            if (args.language) {
                lines.push(`Langue demandée: ${args.language}`);
            }

            lines.push(``);
            lines.push(`📝 **Transcription:**`);
            lines.push(``);
            lines.push(transcript);

            // Save transcript if requested
            if (args.save_transcript) {
                const outputDir = process.env.HOME
                    ? path.join(process.env.HOME, 'Downloads', 'pollinations', 'transcripts')
                    : '/tmp';
                ensureDir(outputDir);

                const baseName = path.basename(fileName, path.extname(fileName));
                const outputPath = path.join(outputDir, `${baseName}_transcript.txt`);

                fs.writeFileSync(outputPath, transcript);
                lines.push(``);
                lines.push(`💾 Transcription sauvegardée: ${outputPath}`);
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message?.includes('402') || err.message?.includes('Payment')) {
                return `❌ Crédits insuffisants.`;
            }
            if (err.message?.includes('401') || err.message?.includes('403')) {
                return `❌ Clé API invalide ou non autorisée.`;
            }
            if (err.message?.includes('413') || err.message?.includes('too large')) {
                return `❌ Fichier audio trop volumineux.
💡 Essayez de compresser ou découper l'audio.`;
            }
            return `❌ Erreur transcription: ${err.message}`;
        }
    },
});

```

#### 📁 power

##### 📄 `tools/power/extract_audio.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { resolveOutputDir, formatFileSize, safeName, formatTimestamp, TOOL_DIRS } from '../shared.js';
import { hasSystemFFmpeg, getFFmpegInstallInstructions, runFFmpeg, runFFprobe } from '../ffmpeg.js';

// ─── Download helper ────────────────────────────────────────────────────────

function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ext = path.extname(new URL(url).pathname) || '.mp4';
        const tempPath = path.join(os.tmpdir(), `video_${Date.now()}${ext}`);
        const proto = url.startsWith('https') ? https : http;

        const req = (proto as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const ws = fs.createWriteStream(tempPath);
            res.pipe(ws);
            ws.on('finish', () => { ws.close(); resolve(tempPath); });
            ws.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout (120s)')); });
    });
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const extractAudioTool: ToolDefinition = tool({
    description: `Extract the audio track from a video file or URL.
Outputs MP3, WAV, AAC, or FLAC format.
Can optionally extract only a time range (start/end).
Requires system ffmpeg installed.
Free to use — no API key needed.`,

    args: {
        source: tool.schema.string().describe('Video file path (absolute) or URL'),
        format: tool.schema.enum(['mp3', 'wav', 'aac', 'flac']).optional()
            .describe('Output audio format (default: mp3)'),
        start: tool.schema.string().optional()
            .describe('Start time to extract from (e.g. "00:00:10" or "10")'),
        end: tool.schema.string().optional()
            .describe('End time to extract to (e.g. "00:01:30" or "90")'),
        filename: tool.schema.string().optional()
            .describe('Custom output filename (without extension). Auto-generated if omitted'),
        output_path: tool.schema.string().optional()
            .describe('Custom output directory. Default: ~/Downloads/pollinations/audio/'),
    },

    async execute(args, context) {
        if (!hasSystemFFmpeg()) {
            return [
                `❌ FFmpeg non trouvé!`,
                ``,
                `Cet outil nécessite ffmpeg :`,
                getFFmpegInstallInstructions().split('\n').map(l => `  • ${l}`).join('\n')
            ].join('\n');
        }

        // Resolve source
        let videoPath: string;
        let isRemote = false;

        if (args.source.startsWith('http://') || args.source.startsWith('https://')) {
            isRemote = true;
            context.metadata({ title: `🎵 Téléchargement vidéo...` });
            try {
                videoPath = await downloadFile(args.source);
            } catch (err: any) {
                return `❌ Erreur téléchargement: ${err.message}`;
            }
        } else {
            videoPath = args.source;
            if (!fs.existsSync(videoPath)) {
                return `❌ Fichier introuvable: ${videoPath}`;
            }
        }

        // Check if video has audio
        try {
            // Using runFFprobe helper
            const probe = runFFprobe([
                '-v', 'quiet',
                '-select_streams', 'a',
                '-show_entries', 'stream=codec_type',
                '-of', 'csv=p=0',
                videoPath
            ], { timeout: 10000 }).trim();

            if (!probe) {
                if (isRemote) try { fs.unlinkSync(videoPath); } catch { }
                return `❌ Aucune piste audio détectée dans cette vidéo.`;
            }
        } catch { }

        const outputFormat = args.format || 'mp3';
        const outputDir = resolveOutputDir(TOOL_DIRS.audio, args.output_path);
        const baseName = args.filename
            ? safeName(args.filename)
            : safeName(path.basename(videoPath, path.extname(videoPath)));
        const outputFile = path.join(outputDir, `${baseName}.${outputFormat}`);

        try {
            context.metadata({ title: `🎵 Extraction audio...` });

            // Build ffmpeg args
            const ffmpegArgs = ['-y', '-i', videoPath, '-vn'];

            // Time range
            if (args.start) ffmpegArgs.push('-ss', args.start);
            if (args.end) ffmpegArgs.push('-to', args.end);

            // Format-specific encoding
            switch (outputFormat) {
                case 'mp3': ffmpegArgs.push('-acodec', 'libmp3lame', '-q:a', '2'); break;
                case 'wav': ffmpegArgs.push('-acodec', 'pcm_s16le'); break;
                case 'aac': ffmpegArgs.push('-acodec', 'aac', '-b:a', '192k'); break;
                case 'flac': ffmpegArgs.push('-acodec', 'flac'); break;
            }

            ffmpegArgs.push(outputFile);

            runFFmpeg(ffmpegArgs, { timeout: 120000 });

            // Cleanup
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }

            if (!fs.existsSync(outputFile)) {
                return `❌ Extraction échouée — aucun fichier audio produit.`;
            }

            const stats = fs.statSync(outputFile);

            // Get audio duration
            let durationStr = 'N/A';
            try {
                const durRaw = runFFprobe([
                    '-v', 'quiet',
                    '-show_entries', 'format=duration',
                    '-of', 'csv=p=0',
                    outputFile
                ], { timeout: 5000 }).trim();

                const dur = parseFloat(durRaw);
                if (!isNaN(dur)) durationStr = formatTimestamp(dur);
            } catch { }

            return [
                `🎵 Audio Extrait`,
                `━━━━━━━━━━━━━━━━━`,
                `Source: ${isRemote ? args.source : path.basename(videoPath)}`,
                `Format: ${outputFormat.toUpperCase()}`,
                `Durée: ${durationStr}`,
                `Fichier: ${outputFile}`,
                `Taille: ${formatFileSize(stats.size)}`,
                args.start || args.end ? `Plage: ${args.start || '0:00'} → ${args.end || 'fin'}` : '',
                ``,
                `Coût: Gratuit (ffmpeg local)`,
            ].filter(Boolean).join('\n');

        } catch (err: any) {
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            return `❌ Erreur extraction audio: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/power/extract_frames.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { resolveOutputDir, formatFileSize, safeName, formatTimestamp, TOOL_DIRS } from '../shared.js';
import { hasSystemFFmpeg, getFFmpegInstallInstructions, runFFmpeg, runFFprobe } from '../ffmpeg.js';

// ─── Video metadata extraction via ffprobe ──────────────────────────────────

interface VideoMetadata {
    duration: number;       // seconds
    durationStr: string;    // formatted HH:MM:SS.ms
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: string;
    fileSize: string;
    hasAudio: boolean;
    audioCodec?: string;
    audioSampleRate?: string;
    audioChannels?: number;
    format: string;
}

function extractMetadata(videoPath: string): VideoMetadata | null {
    try {
        // Use ffprobe JSON output for reliable parsing
        const raw = runFFprobe([
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            videoPath
        ]);
        const data = JSON.parse(raw);

        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
        const format = data.format || {};

        const duration = parseFloat(format.duration || videoStream?.duration || '0');
        const fpsStr = videoStream?.r_frame_rate || '0/1';
        const [fpsNum, fpsDen] = fpsStr.split('/').map(Number);
        const fps = fpsDen ? Math.round((fpsNum / fpsDen) * 100) / 100 : 0;

        const stats = fs.statSync(videoPath);

        return {
            duration,
            durationStr: formatTimestamp(duration),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps,
            codec: videoStream?.codec_name || 'unknown',
            bitrate: format.bit_rate ? `${Math.round(parseInt(format.bit_rate) / 1000)} kbps` : 'N/A',
            fileSize: formatFileSize(stats.size),
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name,
            audioSampleRate: audioStream?.sample_rate ? `${audioStream.sample_rate} Hz` : undefined,
            audioChannels: audioStream?.channels,
            format: format.format_name || path.extname(videoPath).slice(1),
        };
    } catch {
        return null;
    }
}

function formatMetadataReport(meta: VideoMetadata, source: string): string {
    const lines = [
        `📋 Métadonnées Vidéo`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `Source: ${source}`,
        `Durée: ${meta.durationStr} (${meta.duration.toFixed(2)}s)`,
        `Résolution: ${meta.width}×${meta.height}`,
        `FPS: ${meta.fps}`,
        `Codec: ${meta.codec}`,
        `Bitrate: ${meta.bitrate}`,
        `Taille: ${meta.fileSize}`,
        `Format: ${meta.format}`,
    ];

    if (meta.hasAudio) {
        lines.push(`Audio: ${meta.audioCodec || 'oui'} (${meta.audioSampleRate || 'N/A'}, ${meta.audioChannels || '?'}ch)`);
    } else {
        lines.push(`Audio: aucun`);
    }

    return lines.join('\n');
}

// ─── Video download ─────────────────────────────────────────────────────────

function downloadVideo(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
        const proto = url.startsWith('https') ? https : http;

        const req = (proto as typeof https).get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)' } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadVideo(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const ws = fs.createWriteStream(tempPath);
            res.pipe(ws);
            ws.on('finish', () => { ws.close(); resolve(tempPath); });
            ws.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout téléchargement (120s)')); });
    });
}

// ─── Frame extraction ───────────────────────────────────────────────────────

function extractWithSystemFFmpeg(
    videoPath: string,
    outputDir: string,
    baseName: string,
    options: { at_time?: string; start?: string; end?: string; fps?: number }
): string[] {
    const outputs: string[] = [];

    if (options.at_time) {
        // Single Frame Extraction
        const singleOutput = path.join(outputDir, `${baseName}_at_${options.at_time.replace(/:/g, '-')}.png`);

        runFFmpeg([
            '-y', '-i', videoPath,
            '-ss', options.at_time,
            '-frames:v', '1',
            singleOutput
        ], { timeout: 60000 });

        if (fs.existsSync(singleOutput)) outputs.push(singleOutput);
    } else {
        // Range Extraction
        const fps = options.fps || 1;
        const outputPattern = path.join(outputDir, `${baseName}_%03d.png`);

        const args = ['-y', '-i', videoPath];
        if (options.start) args.push('-ss', options.start);
        if (options.end) args.push('-to', options.end);

        args.push('-vf', `fps=${fps}`, outputPattern);

        runFFmpeg(args, { timeout: 120000 });

        fs.readdirSync(outputDir)
            .filter(f => f.startsWith(baseName) && f.endsWith('.png'))
            .sort()
            .forEach(f => outputs.push(path.join(outputDir, f)));
    }

    return outputs;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const extractFramesTool: ToolDefinition = tool({
    description: `Extract image frames from a video file or URL, and/or inspect video metadata.
Can extract a single frame at a specific timestamp, or multiple frames from a time range.
Set metadata_only=true to just get video info (duration, resolution, fps, codec, audio).
Requires system ffmpeg (sudo apt install ffmpeg).
Supports MP4, WebM, AVI, MKV, and other common formats.
Free to use — no API key needed.`,

    args: {
        source: tool.schema.string().describe('Video file path (absolute) or URL'),
        at_time: tool.schema.string().optional().describe('Extract single frame at timestamp (e.g. "00:00:05" or "5")'),
        start: tool.schema.string().optional().describe('Start time for range extraction (e.g. "00:00:02")'),
        end: tool.schema.string().optional().describe('End time for range extraction (e.g. "00:00:10")'),
        fps: tool.schema.number().min(0.1).max(30).optional().describe('Frames per second for range extraction (default: 1)'),
        filename: tool.schema.string().optional().describe('Base filename prefix. Auto-generated if omitted'),
        output_path: tool.schema.string().optional().describe('Custom output directory (absolute or relative). Default: ~/Downloads/pollinations/frames/'),
        metadata_only: tool.schema.boolean().optional().describe('If true, only return video metadata without extracting frames'),
    },

    async execute(args, context) {
        // Check ffmpeg
        if (!hasSystemFFmpeg()) {
            return [
                `❌ FFmpeg non trouvé!`,
                ``,
                `Cet outil nécessite ffmpeg. Installez-le :`,
                getFFmpegInstallInstructions().split('\n').map(l => `  • ${l}`).join('\n')
            ].join('\n');
        }

        // Resolve source: URL → download, path → validate
        let videoPath: string;
        let isRemote = false;

        if (args.source.startsWith('http://') || args.source.startsWith('https://')) {
            isRemote = true;
            context.metadata({ title: `🎬 Téléchargement vidéo...` });
            try {
                videoPath = await downloadVideo(args.source);
            } catch (err: any) {
                return `❌ Erreur téléchargement: ${err.message}`;
            }
        } else {
            videoPath = args.source;
            if (!fs.existsSync(videoPath)) {
                return `❌ Fichier introuvable: ${videoPath}`;
            }
        }

        // ─── Metadata mode ─────────────────────────────────────────────
        if (args.metadata_only) {
            const meta = extractMetadata(videoPath);
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            if (!meta) return `❌ Impossible de lire les métadonnées. Vérifiez que ffprobe est installé.`;
            return formatMetadataReport(meta, isRemote ? args.source : path.basename(videoPath));
        }

        // ─── Frame extraction mode ──────────────────────────────────────
        const outputDir = resolveOutputDir(TOOL_DIRS.frames, args.output_path);
        const baseName = args.filename
            ? safeName(args.filename)
            : `frame_${Date.now()}`;

        try {
            context.metadata({ title: `🎬 Extraction frames...` });

            // Get metadata for context
            const meta = extractMetadata(videoPath);

            const extractedFiles = extractWithSystemFFmpeg(videoPath, outputDir, baseName, {
                at_time: args.at_time,
                start: args.start,
                end: args.end,
                fps: args.fps,
            });

            // Cleanup temp video
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }

            if (extractedFiles.length === 0) {
                return `❌ Aucune frame extraite. Vérifiez vos timestamps et la source vidéo.`;
            }

            const totalSize = extractedFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);

            const fileList = extractedFiles.length <= 5
                ? extractedFiles.map(f => `  📷 ${path.basename(f)}`).join('\n')
                : [
                    ...extractedFiles.slice(0, 3).map(f => `  📷 ${path.basename(f)}`),
                    `  ... et ${extractedFiles.length - 3} de plus`,
                ].join('\n');

            const lines = [
                `🎬 Frames Extraites`,
                `━━━━━━━━━━━━━━━━━━━`,
                `Source: ${isRemote ? args.source : path.basename(videoPath)}`,
            ];

            // Add video metadata if available
            if (meta) {
                lines.push(`Vidéo: ${meta.width}×${meta.height} • ${meta.fps} fps • ${meta.durationStr}`);
            }

            lines.push(
                `Frames: ${extractedFiles.length}`,
                `Dossier: ${outputDir}`,
                `Taille totale: ${formatFileSize(totalSize)}`,
                `Fichiers:`,
                fileList,
                ``,
                `Coût: Gratuit (ffmpeg local)`,
            );

            return lines.join('\n');

        } catch (err: any) {
            if (isRemote && fs.existsSync(videoPath)) {
                try { fs.unlinkSync(videoPath); } catch { }
            }
            return `❌ Erreur extraction: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/power/file_to_url.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// ─── Provider Definitions ───────────────────────────────────────────────────

interface UploadProvider {
    name: string;
    maxSize: number;   // bytes
    expiry: string;
    upload: (filePath: string, fileName: string, fileData: Buffer, mimeType: string, expiry: string) => Promise<string>;
}

const PROVIDERS: UploadProvider[] = [
    // Provider 1: Litterbox (catbox.moe) — fiable, anonyme, testé OK
    {
        name: 'litterbox.catbox.moe',
        maxSize: 200 * 1024 * 1024, // 200MB
        expiry: '1h-72h',
        upload: (filePath, fileName, fileData, mimeType, expiry) => httpUpload({
            url: 'https://litterbox.catbox.moe/resources/internals/api.php',
            fields: { reqtype: 'fileupload', time: expiry },
            fileField: 'fileToUpload',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const trimmed = body.trim();
                if (trimmed.startsWith('https://')) return trimmed;
                throw new Error(`Réponse inattendue: ${trimmed.substring(0, 100)}`);
            },
        }),
    },

    // Provider 2: tmpfile.link — CDN rapide, 100MB max, 7j
    {
        name: 'tmpfile.link',
        maxSize: 100 * 1024 * 1024, // 100MB
        expiry: '7 jours',
        upload: (filePath, fileName, fileData, mimeType) => httpUpload({
            url: 'https://tmpfile.link/api/upload',
            fields: {},
            fileField: 'file',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const json = JSON.parse(body);
                if (json.downloadLink) return json.downloadLink;
                throw new Error(`Pas de downloadLink: ${body.substring(0, 100)}`);
            },
        }),
    },

    // Provider 3: file.io — auto-destruction après 1er téléchargement
    {
        name: 'file.io',
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB
        expiry: '14 jours (auto-détruit)',
        upload: (filePath, fileName, fileData, mimeType) => httpUpload({
            url: 'https://file.io',
            fields: { expires: '14d' },
            fileField: 'file',
            fileName, fileData, mimeType,
            parseResponse: (body) => {
                const json = JSON.parse(body);
                if (json.success && json.link) return json.link;
                throw new Error(`file.io erreur: ${json.message || body.substring(0, 100)}`);
            },
        }),
    },
];

// ─── Generic HTTP Multipart Upload (zero deps) ─────────────────────────────

interface HttpUploadOptions {
    url: string;
    fields: Record<string, string>;
    fileField: string;
    fileName: string;
    fileData: Buffer;
    mimeType: string;
    parseResponse: (body: string) => string;
}

function httpUpload(opts: HttpUploadOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
        const parts: Buffer[] = [];

        // Text fields
        for (const [key, value] of Object.entries(opts.fields)) {
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
            ));
        }

        // File field
        parts.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${opts.fileField}"; filename="${opts.fileName}"\r\nContent-Type: ${opts.mimeType}\r\n\r\n`
        ));
        parts.push(opts.fileData);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);
        const url = new URL(opts.url);
        const isHttps = url.protocol === 'https:';
        const mod = isHttps ? https : http;

        const req = mod.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length,
                'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-Plugin/6.0)',
                'Accept': 'application/json, text/plain, */*',
            },
        }, (res) => {
            // Follow redirects (301, 302, 307)
            if (res.statusCode && [301, 302, 307].includes(res.statusCode) && res.headers.location) {
                httpUpload({ ...opts, url: res.headers.location }).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(opts.parseResponse(data));
                    } catch (err: any) {
                        reject(new Error(`Parse error: ${err.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', (err) => reject(new Error(`Réseau: ${err.message}`)));
        req.setTimeout(45000, () => {
            req.destroy();
            reject(new Error('Timeout (45s)'));
        });
        req.write(body);
        req.end();
    });
}

// ─── Upload with Cascade Fallback ───────────────────────────────────────────

async function uploadWithFallback(
    filePath: string,
    fileSize: number,
    expiry: string
): Promise<{ url: string; provider: string; expiry: string; attempts: string[] }> {
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const mimeType = getMimeType(fileName);
    const attempts: string[] = [];

    for (const provider of PROVIDERS) {
        if (fileSize > provider.maxSize) {
            attempts.push(`⏭️ ${provider.name}: fichier trop gros (max ${formatFileSize(provider.maxSize)})`);
            continue;
        }

        try {
            const url = await provider.upload(filePath, fileName, fileData, mimeType, expiry);
            return { url, provider: provider.name, expiry: provider.expiry, attempts };
        } catch (err: any) {
            attempts.push(`❌ ${provider.name}: ${err.message}`);
        }
    }

    throw new Error(
        `Tous les services d'upload ont échoué:\n${attempts.join('\n')}`
    );
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
        '.pdf': 'application/pdf', '.txt': 'text/plain',
        '.json': 'application/json', '.html': 'text/html', '.css': 'text/css',
        '.js': 'application/javascript', '.ts': 'text/typescript',
        '.zip': 'application/zip', '.tar': 'application/x-tar',
        '.gz': 'application/gzip', '.7z': 'application/x-7z-compressed',
    };
    return types[ext] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const fileToUrlTool: ToolDefinition = tool({
    description: `Upload a local file to get a temporary public URL.
Uses a resilient multi-provider system with automatic fallback:
  1. litterbox.catbox.moe (200MB, 1h-72h, anonymous)
  2. tmpfile.link (100MB, 7 days, CDN global)
  3. file.io (2GB, auto-destruct after 1 download)
If one service is down, the next one is tried automatically.
No API key needed, no account required.`,

    args: {
        file_path: tool.schema.string().describe('Absolute path to the local file to upload'),
        expiry: tool.schema.enum(['1h', '12h', '24h', '72h']).optional()
            .describe('How long the URL stays active on primary provider (default: 24h)'),
    },

    async execute(args, context) {
        const expiry = args.expiry || '24h';

        // Validate file exists
        if (!fs.existsSync(args.file_path)) {
            return `❌ Fichier introuvable: ${args.file_path}`;
        }

        const stats = fs.statSync(args.file_path);
        if (stats.size === 0) {
            return `❌ Fichier vide: ${args.file_path}`;
        }
        if (stats.size > 2 * 1024 * 1024 * 1024) {
            return `❌ Fichier trop volumineux (${formatFileSize(stats.size)}). Max: 2 GB`;
        }

        try {
            context.metadata({ title: `📤 Upload: ${path.basename(args.file_path)}` });

            const result = await uploadWithFallback(args.file_path, stats.size, expiry);

            const lines = [
                `📤 Fichier Uploadé`,
                `━━━━━━━━━━━━━━━━━━`,
                `Fichier: ${path.basename(args.file_path)}`,
                `Taille: ${formatFileSize(stats.size)}`,
                `URL: ${result.url}`,
                `Service: ${result.provider}`,
                `Expiration: ${result.expiry}`,
                ``,
                `Coût: Gratuit (hébergement anonyme)`,
            ];

            // Show fallback attempts if any
            if (result.attempts.length > 0) {
                lines.push('', '⚠️ Fallbacks utilisés:');
                lines.push(...result.attempts);
            }

            return lines.join('\n');

        } catch (err: any) {
            return `❌ Erreur Upload: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/power/remove_background.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { emitStatusToast } from '../../server/toast.js';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { resolveOutputDir, formatFileSize, TOOL_DIRS } from '../shared.js';
import { getConfigDir } from '../../server/config.js';

// ─── Provider Defaults ───────────────────────────────────────────────────────

const CUT_API_URL = 'https://cut.esprit-artificiel.com';
const CUT_API_KEY = 'REDACTED';
const BACKGROUNDCUT_API_URL = 'https://backgroundcut.co/api/v1/cut/';

// ─── Key Storage ─────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(getConfigDir(), 'backgroundcut_keys.json');

interface KeyStore {
    keys: string[];
    currentIndex: number;
}

function loadKeys(): KeyStore {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
        }
    } catch { }
    return { keys: [], currentIndex: 0 };
}

function getRotatedKeys(): string[] {
    const store = loadKeys();
    if (store.keys.length === 0) return [];

    // Return keys starting from currentIndex looping back to start
    const before = store.keys.slice(store.currentIndex);
    const after = store.keys.slice(0, store.currentIndex);
    return [...before, ...after];
}

function advanceKeyIndex(): void {
    const store = loadKeys();
    if (store.keys.length === 0) return;
    store.currentIndex = (store.currentIndex + 1) % store.keys.length;
    try {
        const dir = path.dirname(KEYS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2));
    } catch { }
}


// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function httpRequest(url: string, options: https.RequestOptions, body?: Buffer): Promise<{ statusCode: number; body: Buffer; json?: any }> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
                const responseBody = Buffer.concat(chunks);
                const statusCode = res.statusCode || 500;
                let json: any;
                try { json = JSON.parse(responseBody.toString()); } catch { }
                resolve({ statusCode, body: responseBody, json });
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout (60s)')); });
        if (body) req.write(body);
        req.end();
    });
}

function downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : require('http');
        protocol.get(url, (res: any) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location).then(resolve).catch(reject);
            }
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

// ─── Helper: Get Image Size (Linux/Unix 'file' command) ─────────────────────

function getImageSize(filePath: string): { width: number; height: number } | null {
    try {
        const { execSync } = require('child_process');
        const output = execSync(`file "${filePath}"`).toString();
        // Regex for "IDAT, 800 x 600," or ", 800 x 600,"
        const match = output.match(/, (\d+) ?x ?(\d+),/);
        if (match) {
            return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
    } catch (e) {
        // Fallback or silence
    }
    return null;
}

// ─── Provider: cut.esprit-artificiel.com (returns binary PNG directly) ────────

async function removeViaCut(imageData: Buffer, filename: string, mimeType: string): Promise<Buffer> {
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(imageData);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const url = new URL(`${CUT_API_URL}/remove-bg`);
    const res = await httpRequest(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'X-Api-Key': CUT_API_KEY,
            'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
        },
    }, body);

    if (res.statusCode >= 400) {
        throw new Error(`CUT API Error ${res.statusCode}: ${res.body.toString().substring(0, 200)}`);
    }
    return res.body;
}

// ─── Provider: BackgroundCut.co (returns JSON with output_image_url) ─────────

async function removeViaBackgroundCut(
    imageData: Buffer,
    filename: string,
    mimeType: string,
    apiKey: string,
    quality: string = 'medium',
    returnFormat: string = 'png',
    maxResolution?: number
): Promise<Buffer> {
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    // File field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    parts.push(imageData);

    // Quality
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\n${quality}`));

    // Return format
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="return_format"\r\n\r\n${returnFormat.toUpperCase()}`));

    // Max resolution
    if (maxResolution) {
        parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="max_resolution"\r\n\r\n${maxResolution}`));
    }

    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const res = await httpRequest(BACKGROUNDCUT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'Authorization': `Token ${apiKey}`,
            'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
        },
    }, body);

    // Error handling with specific codes
    if (res.statusCode === 401) throw new Error('BGCUT_401:Invalid or missing API key');
    if (res.statusCode === 402) throw new Error('BGCUT_402:No credits remaining');
    if (res.statusCode === 429) throw new Error('BGCUT_429:Rate limit exceeded');
    if (res.statusCode === 413) throw new Error('BGCUT_413:File too large (max 12MB)');
    if (res.statusCode >= 400) {
        const msg = res.json?.error || res.body.toString().substring(0, 200);
        throw new Error(`BGCUT_${res.statusCode}:${msg}`);
    }

    // Download the result image from the URL
    const outputUrl = res.json?.output_image_url;
    if (!outputUrl) throw new Error('BackgroundCut returned no output URL');

    return await downloadFile(outputUrl);
}

// ─── Main Tool ───────────────────────────────────────────────────────────────

export const removeBackgroundTool: ToolDefinition = tool({
    description: `Remove the background from an image, producing a transparent PNG or WebP.

**Providers:**
- \`cut\` (default free) — Built-in u2netp AI. Slower. Ignores quality/format/resolution.
- \`backgroundcut\` — Premium API. Requires API key. Supports all parameters.

**Setup:** Use \`rmbg_keys\` tool to manage API keys.
**Auto mode:** Uses BackgroundCut if key is available, falls back to cut.`,

    args: {
        image_path: tool.schema.string().describe('Absolute path to the image file'),
        filename: tool.schema.string().optional().describe('Custom output filename (e.g. "my_image.png") or name without extension'),
        output_path: tool.schema.string().optional().describe('Custom output directory. Default: ~/Downloads/pollinations/rembg/'),
        provider: tool.schema.string().optional().describe('Provider: "auto" (default), "cut" (free), or "backgroundcut" (premium)'), // Removed .enum() as it caused errors
        api_key: tool.schema.string().optional().describe('BackgroundCut API key (overrides stored keys)'),
        quality: tool.schema.string().optional().describe('BackgroundCut only: "low", "medium" (default), "high"'),
        return_format: tool.schema.string().optional().describe('BackgroundCut only: "png" (default), "webp"'),
        max_resolution: tool.schema.number().optional().describe('BackgroundCut only: Max output resolution in pixels'),
    },

    async execute(args, context) {
        // ── Validate input ──
        if (!fs.existsSync(args.image_path)) {
            return `❌ File not found: ${args.image_path}`;
        }

        const ext = path.extname(args.image_path).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            return `❌ Unsupported format: ${ext}. Use PNG, JPEG, or WebP.`;
        }

        const inputStats = fs.statSync(args.image_path);
        if (inputStats.size > 12 * 1024 * 1024) {
            return `❌ File too large (${formatFileSize(inputStats.size)}). Max: 12MB`;
        }

        // ── Resolve provider ──
        const provider = (args.provider || 'auto') as string;
        const quality = (args.quality || 'medium') as string;
        const returnFormat = (args.return_format || 'png') as string;
        const imageData = fs.readFileSync(args.image_path);
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        const basename = path.basename(args.image_path);

        // ─── Resolve API keys ──
        let keysToCheck: string[] = [];
        if (args.api_key) {
            keysToCheck = [args.api_key];
        } else {
            keysToCheck = getRotatedKeys();
        }

        // ── Determine initial provider strategy ──
        // If specific provider requested, we stick to it (unless auto fallback)
        // If auto, we try keys then fallback to cut

        let effectiveProvider = provider;
        if (provider === 'auto') {
            // If we have keys, start with backgroundcut, else cut
            effectiveProvider = keysToCheck.length > 0 ? 'backgroundcut' : 'cut';
        }

        // ── Info message when no BackgroundCut key ──
        if (keysToCheck.length === 0 && (provider === 'auto' || provider === 'backgroundcut')) {
            // console.log("No BackgroundCut key found. Using free provider."); // SILENCED
            context.metadata({
                title: "RMBG (Free)",
                metadata: { type: 'info', message: "Mode Gratuit (Pas de clé détectée)" }
            });
            const noKeyMsg = [
                `ℹ️ **No BackgroundCut API key configured** — using free provider (slower, rate-limited).`,
                ``,
                `🚀 **Want faster, higher-quality results?**`,
                `1. Sign up at https://backgroundcut.co (5$ free credits, 60 days)`,
                `2. Run: \`rmbg_keys action=add key=YOUR_API_KEY\``,
                `3. Multiple keys supported — they rotate automatically!`,
            ].join('\n');

            if (provider === 'backgroundcut' && !args.api_key) {
                return `❌ BackgroundCut provider selected but no API keys stored.\n\n${noKeyMsg}`;
            }
            // In auto mode, we continue with free provider
            context.metadata({ title: `ℹ️ Using free provider (no BackgroundCut key)` });
        }

        // ── Resolve output filename ──
        const outputDir = resolveOutputDir(TOOL_DIRS.rembg, args.output_path);
        let finalFilename = '';

        const targetExt = (returnFormat === 'webp' && effectiveProvider === 'backgroundcut') ? '.webp' : '.png';

        if (args.filename) {
            if (args.filename.toLowerCase().endsWith(targetExt)) {
                finalFilename = args.filename;
            } else if (args.filename.match(/\.[a-z0-9]+$/i)) {
                // Force proper extension
                finalFilename = args.filename.replace(/\.[a-z0-9]+$/i, targetExt);
            } else {
                finalFilename = `${args.filename}${targetExt}`;
            }
        } else {
            finalFilename = `${path.basename(args.image_path, ext)}_nobg${targetExt}`;
        }

        const outputPath = path.join(outputDir, finalFilename);
        const outputExt = path.extname(outputPath).replace('.', ''); // Fix for log display

        // ── Execute ──
        try {
            let resultBuffer: Buffer | null = null;
            let usedProvider = 'cut'; // Default
            let fallbackUsed = false;
            let successKey = '';

            // 1. Try BackgroundCut loop if applicable
            if (effectiveProvider === 'backgroundcut' && keysToCheck.length > 0) {
                emitStatusToast('info', `Démarrage: ${basename}`, '✂️ BackgroundCut');

                for (const key of keysToCheck) {
                    try {
                        emitStatusToast('info', `Clé ${key.substring(0, 8)}...`, '>>> Rotation RMBG');
                        // console.log(`[RMBG] Trying key ${key.substring(0, 8)}...`); // SILENCED
                        resultBuffer = await removeViaBackgroundCut(
                            imageData, basename, mimeType,
                            key, quality, returnFormat, args.max_resolution
                        );

                        // Success!
                        usedProvider = 'backgroundcut';
                        successKey = key;

                        // Advance index globally so next call uses next key (fair rotation)
                        advanceKeyIndex();

                        // Only set final metadata on success
                        context.metadata({
                            title: "RMBG (Premium)",
                            metadata: { type: 'success', message: "Détourage HD réussi (BackgroundCut)" }
                        });
                        break; // Exit loop on success

                    } catch (err: any) {
                        const isFallbackable = err.message.startsWith('BGCUT_402') ||
                            err.message.startsWith('BGCUT_429') ||
                            err.message.startsWith('BGCUT_401');

                        if (isFallbackable) {
                            // console.log(`⚠️ Key ${key.substring(0, 8)} failed (${err.message}). Rotating...`); // SILENCED
                            continue; // Try next key
                        } else {
                            throw err; // Fatal error (file size etc)
                        }
                    }
                }
            }

            // 2. Fallback to Free Provider if no result yet
            if (!resultBuffer) {
                if (effectiveProvider === 'backgroundcut' && provider !== 'auto') {
                    throw new Error('All provided keys failed or are expired.');
                }

                if (effectiveProvider === 'backgroundcut') {
                    emitStatusToast('warning', 'Toutes les clés ont échoué. Mode Gratuit activé.', '⚠️ Fallback');
                    // console.log('⚠️ All BackgroundCut keys failed. Falling back to free provider.'); // SILENCED
                    fallbackUsed = true;
                } else {
                    emitStatusToast('info', `Détourage via API Gratuite: ${basename}`, '✂️ Free RMBG');
                }

                resultBuffer = await removeViaCut(imageData, basename, mimeType);

                context.metadata({
                    title: "RMBG (Free)",
                    metadata: { type: 'success', message: "Détourage Standard réussi" }
                });
                usedProvider = 'cut (free)';
            }

            if (!resultBuffer || resultBuffer.length < 100) {
                return `❌ Background removal returned invalid data.`;
            }

            const finalPath = path.resolve(outputPath);
            fs.writeFileSync(finalPath, resultBuffer);

            // Double check existence
            if (!fs.existsSync(finalPath)) {
                throw new Error(`File write failed at: ${finalPath}`);
            }

            const dims = getImageSize(finalPath);
            const dimStr = dims ? `${dims.width}×${dims.height}` : 'N/A';

            const lines = [
                `✂️ Background Removed`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `Input: ${basename} (${formatFileSize(inputStats.size)})`,
                `Output: ${finalPath}`,
                `Size: ${formatFileSize(resultBuffer.length)}`,
                `Dimensions: ${dimStr}`,
                `Format: ${outputExt.toUpperCase()} (transparent)`,
                `Provider: ${usedProvider}`,
                `Cost: Free`,
            ];

            if (fallbackUsed) {
                lines.push(``, `⚠️ BackgroundCut key may be expired/rate-limited. Check with \`rmbg_keys action=list\``);
            }

            // Add info message for users without key
            if (keysToCheck.length === 0 && usedProvider.includes('free')) {
                lines.push(``, `💡 Tip: Add a BackgroundCut key for faster HD results: \`rmbg_keys action=add key=...\``);
            }

            return lines.join('\n');

        } catch (err: any) {
            if (err.message.includes('429') || err.message.includes('rate')) {
                return `⏳ Rate limited. Please try again in 30 seconds.`;
            }
            if (err.message.startsWith('BGCUT_402')) {
                return `💳 BackgroundCut: No credits remaining. Add a new key or wait for renewal.\nRun: \`rmbg_keys action=add key=...\``;
            }
            return `❌ Background Removal Error: ${err.message}`;
        }
    },
});

```

##### 📄 `tools/power/rmbg_keys.ts`

```typescript
import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as fs from 'fs';
import * as path from 'path';

// ─── Shared Logic (Duplicated from rmbg to avoid circular deps if not using shared.ts for this) ──

import { CONFIG_DIR } from '../../server/config.js';

const KEYS_FILE = path.join(CONFIG_DIR, 'backgroundcut_keys.json');

interface KeyStore {
    keys: string[];
    currentIndex: number;
}

function loadKeys(): KeyStore {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
        }
    } catch { }
    return { keys: [], currentIndex: 0 };
}

function saveKeys(store: KeyStore) {
    try {
        const dir = path.dirname(KEYS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2));
    } catch { }
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const rmbgKeysTool: ToolDefinition = tool({
    description: `Manage BackgroundCut API keys for the remove_background tool.
Allows adding, listing, removing, and clearing keys.
Keys are stored locally in ~/.pollinations/backgroundcut_keys.json`,

    args: {
        action: tool.schema.string().describe('Action to perform: "list", "add", "remove", "clear"'), // Removed .enum()
        key: tool.schema.string().optional().describe('API Key to add or remove (required for add/remove)'),
    },

    async execute(args, context) {
        const action = args.action.toLowerCase();
        let store = loadKeys();

        switch (action) {
            case 'list':
                if (store.keys.length === 0) {
                    return `🔑 No keys stored. Using free provider (cut).`;
                }
                const maskedKeys = store.keys.map((k, i) => {
                    const active = i === store.currentIndex ? ' (active)' : '';
                    return `   ${i + 1}. ${k.substring(0, 8)}...${k.substring(k.length - 4)}${active}`;
                });
                return `🔑 BackgroundCut Keys: ${store.keys.length} stored\n${maskedKeys.join('\n')}`;

            case 'add':
                if (!args.key) return `❌ Error: Missing 'key' argument for add action.`;
                if (store.keys.includes(args.key)) return `⚠️ Key already exists.`;

                store.keys.push(args.key);
                saveKeys(store);

                context.metadata({
                    title: '🔑 Key Added',
                    metadata: { type: 'success', message: 'BackgroundCut key stored successfully' }
                });
                return `✅ Key added! Total keys: ${store.keys.length}.`;

            case 'remove':
                if (!args.key) return `❌ Error: Missing 'key' argument for remove action.`;
                const initialLen = store.keys.length;
                store.keys = store.keys.filter(k => k !== args.key);
                if (store.keys.length === initialLen) return `⚠️ Key not found.`;

                // Reset index if out of bounds
                if (store.currentIndex >= store.keys.length) store.currentIndex = 0;
                saveKeys(store);
                return `🗑️ Key removed. Remaining: ${store.keys.length}`;

            case 'clear':
                store = { keys: [], currentIndex: 0 };
                saveKeys(store);
                return `🗑️ All keys cleared. Reverting to free provider.`;

            default:
                return `❌ Unknown action: ${action}. Use list, add, remove, clear.`;
        }
    }
});

```

