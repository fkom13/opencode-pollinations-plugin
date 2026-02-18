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

    if (key === 'cost_estimator' && value) {
        const enabled = value === 'true';
        const config = loadConfig();
        saveConfig({ ...config, costEstimator: enabled });
        return { handled: true, response: `✅ cost_estimator = ${enabled}` };
    }

    return {
        handled: true,
        error: `Clé inconnue: ${key}. Clés: status_gui, logs_gui, threshold_tier, threshold_wallet, status_bar, cost_estimator`
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
