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
        case 'connect':
            return handleConnectCommand(args);
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

function handleConnectCommand(args: string[]): CommandResult {
    const key = args[0];

    if (!key) {
        return {
            handled: true,
            error: `Utilisation: /pollinations connect <sk-xxxx>`
        };
    }

    if (!key.startsWith('sk-')) {
        return {
            handled: true,
            error: `Clé invalide. Elle doit commencer par 'sk-'.`
        };
    }

    // Save API Key only (User decides mode manually)
    saveConfig({ apiKey: key });

    // Confirm
    emitStatusToast('success', 'API Key enregistrée', 'Pollinations Config');

    return {
        handled: true,
        response: `✅ API Key connectée. (Utilisez /pollinations mode pro pour l'activer)`
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
