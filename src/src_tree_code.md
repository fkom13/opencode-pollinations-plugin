# Documentation du projet: src

> Généré le 17/02/2026 23:06:00

## 📂 Structure du projet

```
└── src
    ├── index.ts
    ├── server
    │   ├── commands.ts
    │   ├── config.ts
    │   ├── generate-config.ts
    │   ├── index.ts
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
        ├── index.ts
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
import { loadConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks, createToolHooks, setGlobalClient } from './server/toast.js';
import { createStatusHooks } from './server/status.js';
import { createCommandHooks, setClientForCommands } from './server/commands.js';
import { createToolRegistry } from './tools/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const LOG_FILE = '/tmp/opencode_pollinations_v4.log';

function log(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

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
            const assignedPort = server.address().port;
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
    console.log(`🚀 POLLINATIONS PLUGIN v${v} LOADED 🚀`);

    // START PROXY
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;


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

> 💡 **RMBG keys**: Use the \`rmbg_keys\` tool (works with any model).
`.trim();

    return { handled: true, response: help };
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
        enter: { agent: 'free/openai-fast' }
    },
    enablePaidTools: false,
    keyHasAccessToProfile: true, // Default true for legacy keys
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
    let finalKey: string | undefined = undefined;
    let source: string = 'none';

    // TIMESTAMP BASED PRIORITY LOGIC
    // We want the most recently updated Valid Key to win.

    let configTime = 0;
    let authTime = 0;

    try { if (fs.existsSync(CONFIG_FILE)) configTime = fs.statSync(CONFIG_FILE).mtime.getTime(); } catch (e) { }
    try { if (fs.existsSync(AUTH_FILE)) authTime = fs.statSync(AUTH_FILE).mtime.getTime(); } catch (e) { }

    // 1. EXTRACT KEYS
    let configKey: string | undefined = undefined;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const custom = JSON.parse(raw);
            config = { ...config, ...custom }; // Helper: We load the rest of config anyway
            if (custom.apiKey && custom.apiKey.length > 5) configKey = custom.apiKey;
        } catch (e) { }
    }

    let authKey: string | undefined = undefined;
    if (fs.existsSync(AUTH_FILE)) {
        try {
            const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
            const authData = JSON.parse(raw);
            const entry = authData['pollinations'] || authData['pollinations_enter'] || authData['pollinations_api_key'];
            if (entry) {
                const k = (typeof entry === 'object' && entry.key) ? entry.key : entry;
                if (k && typeof k === 'string' && k.length > 10) authKey = k;
            }
        } catch (e) { }
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
            if (fs.existsSync(OPENCODE_CONFIG_FILE)) {
                const raw = fs.readFileSync(OPENCODE_CONFIG_FILE, 'utf-8');
                const data = JSON.parse(raw);
                const nativeKey = data?.provider?.pollinations?.options?.apiKey ||
                    data?.provider?.pollinations_enter?.options?.apiKey;
                if (nativeKey && nativeKey.length > 5 && nativeKey !== 'dummy') {
                    finalKey = nativeKey;
                    source = 'opencode.json';
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

#### 📄 `server/generate-config.ts`

```typescript

import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig } from './config.js';
const HOMEDIR = os.homedir();
const CONFIG_DIR_POLLI = path.join(HOMEDIR, '.pollinations');
const CONFIG_FILE = path.join(CONFIG_DIR_POLLI, 'config.json');

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

export async function generatePollinationsConfig(forceApiKey?: string, forceStrict: boolean = false): Promise<OpenCodeModel[]> {
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

    // 1.5 FORCE ENSURE CRITICAL MODELS
    // Sometimes the API list changes or is cached weirdly. We force vital models.
    const hasGemini = modelsOutput.find(m => m.id === 'free/gemini');
    if (!hasGemini) {
        log(`[ConfigGen] Force-injecting free/gemini.`);
        modelsOutput.push({ id: "free/gemini", name: "[Free] Gemini Flash (Force)", object: "model", variants: {} });
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
                const mapped = mapModel(m, 'enter/', '[Enter] ');
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
            modelsOutput.push({ id: "enter/gpt-4o", name: "[Enter] GPT-4o (Fallback)", object: "model", variants: {} });
            // ...
            modelsOutput.push({ id: "enter/claude-3-5-sonnet", name: "[Enter] Claude 3.5 Sonnet (Fallback)", object: "model", variants: {} });
            modelsOutput.push({ id: "enter/deepseek-reasoner", name: "[Enter] DeepSeek R1 (Fallback)", object: "model", variants: {} });
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

    let namePrefixFinal = namePrefix;
    if (raw.paid_only) {
        namePrefixFinal = namePrefix.replace('[Enter]', '[💎 Paid]');
    }

    // Get capability icons from API metadata
    const capabilityIcons = getCapabilityIcons(raw);
    const finalName = `${namePrefixFinal}${baseName}${capabilityIcons}`;

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

#### 📄 `server/index.ts`

```typescript
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { getAggregatedModels } from './pollinations-api.js';
import { loadConfig, saveConfig } from './config.js';
import { handleChatCompletion } from './proxy.js';
import { createCommandHooks, setClientForCommands, checkKeyPermissions } from './commands.js';
import type { Plugin } from '@opencode-ai/plugin';
import { fileURLToPath } from 'url';

const LOG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/plugins/pollinations-v6.log');

// Simple file logger
function log(msg: string) {
    const ts = new Date().toISOString();
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) {
            fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) { }
}

const PORT = parseInt(process.env.POLLINATIONS_PORT || '10001', 10);
let serverInstance: http.Server | null = null;

// --- SERVER LOGIC ---
function startServer() {
    if (serverInstance) return;

    serverInstance = http.createServer(async (req, res) => {
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

        // AUTH ENDPOINT
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
                version: "v6.0.0-beta.99",
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

    // ANTI-ZOMBIE
    try {
        const { execSync } = require('child_process');
        try {
            console.log(`[POLLINATIONS] Checking port ${PORT}...`);
            execSync(`fuser -k ${PORT}/tcp || true`);
            console.log(`[POLLINATIONS] Port ${PORT} cleared.`);
        } catch (e) { }
    } catch (e) { }

    // STARTUP CHECK
    (async () => {
        const config = loadConfig();
        if (config.apiKey) {
            try {
                console.log('Pollinations Plugin: Verifying API Key on startup...');
                const check = await checkKeyPermissions(config.apiKey);
                if (!check.ok) {
                    console.warn(`Pollinations Plugin: Limited Key Detected on Startup (${check.reason}). Enforcing Manual Mode.`);
                    saveConfig({ apiKey: config.apiKey, mode: 'manual', keyHasAccessToProfile: false });
                } else {
                    if (config.keyHasAccessToProfile === false) saveConfig({ apiKey: config.apiKey, keyHasAccessToProfile: true });
                }
            } catch (e) { console.error('Pollinations Plugin: Startup Check Failed:', e); }
        }
    })();

    serverInstance.listen(PORT, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${PORT}`;
        log(`[SERVER] Started V6 (Plugin Mode) on port ${PORT}`);
        console.log(`POLLINATIONS_V6_URL=${url}`);
    });
}

// --- OPENCODE PLUGIN EXPORT ---
export const plugin: Plugin = async ({ client }) => {
    // 1. Inject Client for Command Handling
    setClientForCommands(client);

    // 2. Start Local Proxy Server
    startServer();

    // 3. Register Hooks (Commands, TUI, etc.)
    return createCommandHooks();
};

// --- STANDALONE SUPPORT ---
// If run directly via `node dist/index.js`, start server immediately
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startServer();
}

```

#### 📄 `server/pollinations-api.ts`

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

#### 📄 `server/proxy.ts`

```typescript
import * as http from 'http'; // V4.2 Snapshot Force
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, saveConfig } from './config.js';
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
                // NEW: Paid Only Check for Always Free
                try {
                    const homedir = process.env.HOME || '/tmp';
                    const standardPaidPath = path.join(homedir, '.pollinations', 'pollinations-paid-models.json');
                    if (fs.existsSync(standardPaidPath)) {
                        const paidModels = JSON.parse(fs.readFileSync(standardPaidPath, 'utf-8'));
                        if (paidModels.includes(actualModel)) {
                            log(`[SafetyNet] alwaysfree Mode: Request for Paid Only Model (${actualModel}). FALLBACK.`);
                            actualModel = config.fallbacks.free.main.replace('free/', '');
                            isEnterprise = false;
                            isFallbackActive = true;
                            fallbackReason = "Mode AlwaysFree actif: Ce modèle payant consomme du wallet. Passez en mode PRO.";
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

```

#### 📄 `server/quota.ts`

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
    errorType?: 'auth_limited' | 'network' | 'unknown'; // NEW: Specific Error Type
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

        // SEQUENTIAL FETCH (Avoid Rate Limits)
        // We fetch one by one. If one fails, we catch and return fallback.
        const profileRes = await fetchAPI<Profile>('/account/profile', config.apiKey);
        const balanceRes = await fetchAPI<{ balance: number }>('/account/balance', config.apiKey);
        const usageRes = await fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey);

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

    } catch (e: any) {
        logQuota(`ERROR fetching quota: ${e.message}`);

        let errorType: 'auth_limited' | 'network' | 'unknown' = 'unknown';
        if (e.message && e.message.includes('403')) {
            errorType = 'auth_limited';
        } else if (e.message && e.message.includes('Network Error')) {
            errorType = 'network';
        }

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
            tierEmoji: '⚠️',
            errorType
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
    if (quota.errorType === 'auth_limited') {
        return `🔑 CLE LIMITÉE (Génération Seule) | 💎 Wallet: N/A | ⏰ Reset: N/A`;
    }

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

### 📁 tools

#### 📄 `tools/index.ts`

```typescript
/**
 * Tool Registry — Conditional Injection System
 * 
 * Free Universe (no key): 7 tools always available
 * Enter Universe (with key): +5 Pollinations tools
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
// Phase 4D: Pollinations tools — TO BE IMPLEMENTED
// import { genImageTool } from './pollinations/gen_image.js';
// import { genVideoTool } from './pollinations/gen_video.js';
// import { genAudioTool } from './pollinations/gen_audio.js';
// import { genMusicTool } from './pollinations/gen_music.js';
// import { deepsearchTool } from './pollinations/deepsearch.js';
// import { searchCrawlScrapeTool } from './pollinations/search_crawl_scrape.js';

import * as fs from 'fs';

const LOG_FILE = '/tmp/opencode_pollinations_v4.log';
function log(msg: string) {
    try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [Tools] ${msg}\n`); } catch { }
}

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
    const config = loadConfig();

    // === FREE UNIVERSE: Always injected ===

    // Design tools
    tools['gen_qrcode'] = genQrcodeTool;
    tools['gen_diagram'] = genDiagramTool;
    tools['gen_palette'] = genPaletteTool;

    // Power tools
    tools['file_to_url'] = fileToUrlTool;
    tools['remove_background'] = removeBackgroundTool;
    tools['extract_frames'] = extractFramesTool;
    tools['extract_audio'] = extractAudioTool;
    tools['rmbg_keys'] = rmbgKeysTool;

    // gen_image (free version) — TODO Phase 4D
    // tools['gen_image'] = genImageTool;

    log(`Free tools injected: ${Object.keys(tools).length}`);

    // === ENTER UNIVERSE: Only with valid API key ===
    if (keyPresent) {
        // Pollinations paid tools — TODO Phase 4D
        // tools['gen_video'] = genVideoTool;
        // tools['gen_audio'] = genAudioTool;
        // tools['gen_music'] = genMusicTool;
        // tools['deepsearch'] = deepsearchTool;
        // tools['search_crawl_scrape'] = searchCrawlScrapeTool;

        log(`Enter tools injected (key detected). Total: ${Object.keys(tools).length}`);
    } else {
        log(`Enter tools SKIPPED (no key). Total: ${Object.keys(tools).length}`);
    }

    return tools;
}

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
        dir = path.isAbsolute(customPath)
            ? customPath
            : path.resolve(process.cwd(), customPath);
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

// ─── FFmpeg check ───────────────────────────────────────────────────────────

function hasSystemFFmpeg(): boolean {
    try {
        require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch { return false; }
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
                `  • Linux: sudo apt install ffmpeg`,
                `  • macOS: brew install ffmpeg`,
                `  • Windows: choco install ffmpeg`,
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
            const { execSync } = require('child_process');
            const probe = execSync(
                `ffprobe -v quiet -select_streams a -show_entries stream=codec_type -of csv=p=0 "${videoPath}"`,
                { timeout: 10000, encoding: 'utf-8' }
            ).trim();
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
            const { execSync } = require('child_process');

            // Build ffmpeg command
            let cmd = `ffmpeg -y -i "${videoPath}" -vn`;

            // Time range
            if (args.start) cmd += ` -ss ${args.start}`;
            if (args.end) cmd += ` -to ${args.end}`;

            // Format-specific encoding
            switch (outputFormat) {
                case 'mp3': cmd += ` -acodec libmp3lame -q:a 2`; break;
                case 'wav': cmd += ` -acodec pcm_s16le`; break;
                case 'aac': cmd += ` -acodec aac -b:a 192k`; break;
                case 'flac': cmd += ` -acodec flac`; break;
            }

            cmd += ` "${outputFile}"`;
            execSync(cmd, { stdio: 'ignore', timeout: 120000 });

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
                const durRaw = execSync(
                    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputFile}"`,
                    { timeout: 5000, encoding: 'utf-8' }
                ).trim();
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
        const { execSync } = require('child_process');

        // Use ffprobe JSON output for reliable parsing
        const probeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
        const raw = execSync(probeCmd, { timeout: 15000, encoding: 'utf-8' });
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

// ─── FFmpeg availability ────────────────────────────────────────────────────

function hasSystemFFmpeg(): boolean {
    try {
        const { execSync } = require('child_process');
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch { return false; }
}

// ─── Frame extraction ───────────────────────────────────────────────────────

function extractWithSystemFFmpeg(
    videoPath: string,
    outputDir: string,
    baseName: string,
    options: { at_time?: string; start?: string; end?: string; fps?: number }
): string[] {
    const { execSync } = require('child_process');
    const outputs: string[] = [];

    let cmd = `ffmpeg -y -i "${videoPath}"`;

    if (options.at_time) {
        const singleOutput = path.join(outputDir, `${baseName}_at_${options.at_time.replace(/:/g, '-')}.png`);
        cmd += ` -ss ${options.at_time} -frames:v 1 "${singleOutput}"`;
        execSync(cmd, { stdio: 'ignore', timeout: 60000 });
        if (fs.existsSync(singleOutput)) outputs.push(singleOutput);
    } else {
        if (options.start) cmd += ` -ss ${options.start}`;
        if (options.end) cmd += ` -to ${options.end}`;
        const fps = options.fps || 1;
        const outputPattern = path.join(outputDir, `${baseName}_%03d.png`);
        cmd += ` -vf "fps=${fps}" "${outputPattern}"`;
        execSync(cmd, { stdio: 'ignore', timeout: 120000 });

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
                `  • Linux: sudo apt install ffmpeg`,
                `  • macOS: brew install ffmpeg`,
                `  • Windows: choco install ffmpeg`,
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

// ─── Provider Defaults ───────────────────────────────────────────────────────

const CUT_API_URL = 'https://cut.esprit-artificiel.com';
const CUT_API_KEY = 'REDACTED';
const BACKGROUNDCUT_API_URL = 'https://backgroundcut.co/api/v1/cut/';

// ─── Key Storage ─────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(
    process.env.HOME || process.env.USERPROFILE || '/tmp',
    '.pollinations', 'backgroundcut_keys.json'
);

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

const KEYS_FILE = path.join(
    process.env.HOME || process.env.USERPROFILE || '/tmp',
    '.pollinations', 'backgroundcut_keys.json'
);

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

