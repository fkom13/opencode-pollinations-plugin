import * as https from 'https';
import { loadConfig, saveConfig, saveKeyToAuthJson, PollinationsConfigV5 } from './config.js';
import { getQuotaStatus, QuotaStatus, fetchUsageForPeriod } from './quota.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { DetailedUsageEntry } from './pollinations-api.js';
import { generatePollinationsConfig } from './generate-config.js';
import { ModelRegistry } from './models/index.js';
import type { PollinationsModel, ModelCategory } from './models/types.js';
import { t } from '../locales/index.js';

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
    // SINGLE CHECK to reduce latency and avoid rate-limits (HIGH-01)
    const res = await checkEndpoint('/account/profile', key);
    if (!res.ok) {
        return { ok: false, reason: `/account/profile (${res.status})` };
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
            return await handleModelsCommand(args);
        case 'pricing':
            return await handlePricingCommand();
        case 'infos':
            return await handleInfosCommand();
        case 'addKey': // External trigger
            // UI Pollution Fix: User hates appendPrompt.
            // Just return a message telling them to use the tool.
            return {
                handled: true,
                response: t('commands.generic.add_key_hint')
            };
        default:
            return {
                handled: true,
                response: t('commands.generic.unknown_command', { cmd: subCommand })
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
            response: t('commands.mode.current', { mode: config.mode })
        };
    }

    if (!['manual', 'alwaysfree', 'pro'].includes(mode)) {
        return {
            handled: true,
            error: t('commands.mode.invalid', { mode })
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
            if (mode === 'pro') return { handled: true, error: t('commands.mode.pro_requires_key') };
        }

        emitStatusToast('info', t('commands.mode.verifying'), 'Mode Pro');
        try {
            // Force verify permissions NOW
            const check = await checkKeyPermissions(key as string);
            if (!check.ok) {
                saveConfig({ mode: 'manual', keyHasAccessToProfile: false });
                return {
                    handled: true,
                    error: t('commands.mode.denied', { status: check.status || '?', reason: check.reason || '?' })
                };
            }
            // Valid -> Ensure flag is true
            saveConfig({ keyHasAccessToProfile: true });
        } catch (e: any) {
            return { handled: true, error: t('commands.mode.verify_error', { error: e.message }) };
        }
    }

    // Allow switch (if alwaysfree or manual, or verified pro)
    saveConfig({ mode: mode as PollinationsConfigV5['mode'] });
    const config = loadConfig();
    if (config.gui.status !== 'none') {
        emitStatusToast('success', t('commands.mode.success', { mode }), 'Pollinations Config');
    }

    return {
        handled: true,
        response: t('commands.mode.success', { mode })
    };
}

export async function handleUsageCommand(args: string[]): Promise<CommandResult> {
    const isFull = args[0] === 'full';

    try {
        const quota = await getQuotaStatus(true);
        const config = loadConfig();
        const resetDate = quota.nextResetAt.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const timeUntilReset = quota.nextResetAt.getTime() - Date.now();
        const durationStr = formatDuration(Math.max(0, timeUntilReset));

        let response = t('commands.usage.title', { mode: config.mode.toUpperCase() });

        response += t('commands.usage.resources');
        response += t('commands.usage.tier', { emoji: quota.tierEmoji, tier: quota.tier.toUpperCase(), limit: quota.tierLimit });
        response += t('commands.usage.quota', { remaining: formatPollen(quota.tierLimit - quota.tierRemaining), limit: formatPollen(quota.tierLimit) });
        response += t('commands.usage.usage_bar', { bar: progressBar(quota.tierLimit - quota.tierRemaining, quota.tierLimit) });
        response += t('commands.usage.wallet', { balance: quota.walletBalance.toFixed(2) });
        response += t('commands.usage.reset', { date: resetDate, duration: durationStr });

        if (isFull && config.apiKey) {
            if (config.keyHasAccessToProfile === false) {
                response += t('commands.usage.restricted_key');
            } else {
                const lastReset = calculateResetDate(quota.nextResetAt);
                const usageData = await fetchUsageForPeriod(config.apiKey, lastReset);
                if (usageData && usageData.length > 0) {
                    const stats = calculateCurrentPeriodStats(usageData, lastReset, quota.tierLimit);

                    response += t('commands.usage.period_detail', { time: lastReset.toLocaleTimeString() });
                    response += t('commands.usage.total_reqs', { reqs: stats.totalRequests, inTok: formatTokens(stats.inputTokens), outTok: formatTokens(stats.outputTokens) });

                    response += t('commands.usage.table_head1');
                    response += t('commands.usage.table_head2');

                    const sorted = Array.from(stats.models.entries()).sort((a, b) => b[1].cost - a[1].cost);
                    for (const [model, data] of sorted) {
                        response += `| \`${model}\` | ${data.requests} | ${formatPollen(data.cost)} | ${formatTokens(data.inputTokens + data.outputTokens)} |\n`;
                    }
                } else {
                    response += t('commands.usage.no_history');
                }
            }
        } else if (isFull) {
            response += t('commands.usage.full_requires_key');
        } else {
            response += t('commands.usage.hint_full');
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
            response: t('commands.fallback.current', { free: freeConfig, enter: enterConfig })
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
        response: t('commands.fallback.success', { main, agent: agent || config.fallbacks.free.agent })
    };
}

async function handleConnectCommand(args: string[]): Promise<CommandResult> {
    const key = args[0];

    if (!key) {
        return {
            handled: true,
            error: t('commands.connect.usage')
        };
    }

    // 1. Universal Validation (No Syntax Check) - Functional Check
    emitStatusToast('info', t('commands.connect.verifying'), 'Pollinations Config');

    try {
        const models = await generatePollinationsConfig(key, true);

        // 2. Check if we got Enterprise models
        const enterpriseModels = models.filter(m => m.id.startsWith('enter/'));

        if (enterpriseModels.length > 0) {
            // SUCCESS
            saveConfig({ apiKey: key }); // Don't force mode 'pro'. Let user decide.
            saveKeyToAuthJson(key); // NATIVE SYNC: Hot-reload on OpenCode bypasses restart requirement !

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
                forcedModeMsg = t('commands.connect.limited', { reason: limitReason });
            } else {
                saveConfig({ apiKey: key, keyHasAccessToProfile: true }); // Let user keep current mode or default
            }

            emitStatusToast('success', t('commands.connect.success_toast', { count: enterpriseModels.length }), 'Pollinations Config');

            return {
                handled: true,
                response: t('commands.connect.success_response', { key: masked, count: enterpriseModels.length, diamond: diamondCount, forced_msg: forcedModeMsg })
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
                throw new Error(t('proxy.errors.key_rejected'));
            }

            // If we are here, we got no enter models, or empty list?
            // If key is valid but has no access?
            throw new Error(t('proxy.errors.no_enter_models'));
        }

    } catch (e: any) {
        // 3. FAILURE HANDLING - Revert to FREE
        saveConfig({ apiKey: undefined, mode: 'manual' }); // Clear Key, Set Manual

        emitStatusToast('error', t('toasts.invalid_key_revert'), 'Pollinations Config');
        return {
            handled: true,
            error: t('proxy.errors.invalid_key_free_mode', { error: e.message || String(e) })
        };
    }
}

function handleConfigCommand(args: string[]): CommandResult {
    const [key, value] = args;

    if (!key) {
        const config = loadConfig();
        const k = config.apiKey ? (config.apiKey.length > 8 ? `${config.apiKey.substring(0, 5)}****${config.apiKey.substring(config.apiKey.length - 4)}` : '****') : t('commands.config.not_configured');

        const markdownResponse = `${t('commands.config.title', { version: config.version || 'inconnue' })}
${t('commands.config.alias_note')}
${t('commands.config.intro')}

${t('commands.config.table_headers')}
${t('commands.config.table_divider')}
| **apiKey** | \`${k}\` | ${t('commands.config.api_key_role')} | \`/poll connect <key>\` |
| **mode** | \`${config.mode}\` | ${t('commands.config.mode_role')} | \`/poll mode <manual/pro/alwaysfree>\` |
| **enablePaidTools**| \`${config.enablePaidTools ?? true}\` | ${t('commands.config.enablePaidTools_role')} | \`/poll config enablePaidTools <true/false>\` |
| **costConfirmationRequired**| \`${config.costConfirmationRequired ?? true}\` | ${t('commands.config.costConfirmationRequired_role')} | \`/poll config costConfirmationRequired <true/false>\` |
| **costThreshold**| \`${config.costThreshold ?? 0.15} 🌻\` | ${t('commands.config.costThreshold_role')} | \`/poll config costThreshold <X>\` |
| **cost_estimator**| \`${config.costEstimator ?? true}\` | ${t('commands.config.cost_estimator_role')} | \`/poll config cost_estimator <true/false>\` |
| **fallbacks.free.main** | \`${config.fallbacks?.free?.main || 'free/mistral'}\` | ${t('commands.config.fallback_main_role')} | \`/poll fallback <main> <agent>\` |
| **fallbacks.free.agent** | \`${config.fallbacks?.free?.agent || 'free/openai-fast'}\`| ${t('commands.config.fallback_agent_role')} | \`/poll fallback <main> <agent>\` |
| **fallbacks.enter.agent** | \`${config.fallbacks?.enter?.agent || 'free/openai-fast'}\`| ${t('commands.config.fallback_enter_role')} | *${t('commands.config.managed_auto')}* |
| **status_gui** | \`${config.gui?.status || 'all'}\` | ${t('commands.config.status_gui_role')} | \`/poll config status_gui <all/alert/none>\` |
| **logs_gui** | \`${config.gui?.logs || 'error'}\` | ${t('commands.config.logs_gui_role')} | \`/poll config logs_gui <verbose/error/none>\` |
| **threshold_tier** | \`${config.thresholds?.tier || 80}%\` | ${t('commands.config.threshold_tier_role')} | \`/poll config threshold_tier <1-100>\` |
| **threshold_wallet** | \`${config.thresholds?.wallet || 80}%\` | ${t('commands.config.threshold_wallet_role')} | \`/poll config threshold_wallet <1-100>\` |
| **status_bar** | \`${config.statusBar ?? true}\` | ${t('commands.config.status_bar_role')} | \`/poll config status_bar <true/false>\` |
| **lang** | \`${config.lang || 'en'}\` | ${t('commands.config.lang_role')} | \`/poll config lang <en/fr/es/de/it>\` |`;

        return {
            handled: true,
            response: markdownResponse
        };
    }

    if (key === 'lang' && value) {
        if (!['en', 'fr', 'es', 'de', 'it'].includes(value)) {
            return { handled: true, error: "Valeurs supportées: en, fr, es, de, it" };
        }
        saveConfig({ lang: value });
        return { handled: true, response: `✅ lang = ${value} (redémarrage recommandé)` };
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

    if (key === 'costConfirmationRequired' && value) {
        const enabled = value === 'true';
        saveConfig({ costConfirmationRequired: enabled });
        return { handled: true, response: `✅ costConfirmationRequired = ${enabled}` };
    }



    return {
        handled: true,
        error: `Clé inconnue: ${key}. Clés: status_gui, logs_gui, threshold_tier, threshold_wallet, status_bar, cost_estimator, enablePaidTools, costThreshold, costConfirmationRequired, lang`
    };
}

function handleHelpCommand(): CommandResult {
    const help = `
${t('commands.help.title')}
${t('commands.help.alias_note')}

${t('commands.help.mode_usage')}

${t('commands.help.configuration')}

${t('commands.help.models_pricing')}
`.trim();

    return { handled: true, response: help };
}

// === MODELS & PRICING COMMANDS ===

function parseNameDesc(m: PollinationsModel): { nom: string, desc: string } {
    const fullDesc = m.description || m.name;
    const parts = fullDesc.split(" - ");
    if (parts.length > 1) {
        return { nom: parts[0].trim(), desc: parts.slice(1).join(" - ").trim() };
    }
    return { nom: fullDesc, desc: "" };
}

export async function handleModelsCommand(args: string[]): Promise<CommandResult> {
    const filter = args[0] as ModelCategory | undefined; // optional: image, video, audio, text

    if (!ModelRegistry.isReady()) {
        return {
            handled: true,
            response: t('commands.models.loading')
        };
    }

    const sections: string[] = [];

    // --- FETCH FREE UNIVERSE GITHUB/LEGACY MODELS ---
    if (!filter || filter === 'text') {
        try {
            const freeRes = await fetch('https://text.pollinations.ai/models', { signal: AbortSignal.timeout(4000) });
            if (freeRes.ok) {
                const freeData = await freeRes.json();
                sections.push(t('commands.models.free_title'));
                sections.push(t('commands.models.free_desc'));
                sections.push(t('commands.models.free_headers1'));
                sections.push(t('commands.models.free_headers2'));
                for (const m of freeData) {
                    const desc = m.description || m.name;
                    const aliases = m.aliases ? m.aliases.join(', ') : m.name;
                    sections.push(`| \`${m.name}\` | ${aliases} | ${desc.substring(0, 40)} | ${m.vision ? '👁️' : '❌'} | ${m.tools ? '🛠️' : '❌'} |`);
                }
                sections.push('');
            }
        } catch (e) {
            sections.push(t('commands.models.free_error'));
        }
    }

    sections.push(t('commands.models.enter_title'));

    const categories: { cat: ModelCategory; emoji: string; label: string }[] = [
        { cat: 'image', emoji: '🎨', label: t('commands.models.cats.image') },
        { cat: 'video', emoji: '🎬', label: t('commands.models.cats.video') },
        { cat: 'audio', emoji: '🔊', label: t('commands.models.cats.audio') },
        { cat: 'text', emoji: '📝', label: t('commands.models.cats.text') },
    ];

    for (const { cat, emoji, label } of categories) {
        if (filter && filter !== cat) continue;

        const models = ModelRegistry.list(cat);
        if (models.length === 0) continue;

        const sorted = [...models].sort((a, b) => a.name.localeCompare(b.name));

        sections.push(t('commands.models.cat_title', { emoji, label, count: models.length }));
        sections.push(t('commands.models.enter_headers1'));
        sections.push(t('commands.models.enter_headers2'));

        for (const m of sorted) {
            const { nom, desc } = parseNameDesc(m);
            const badges = buildBadges(m);
            const input = buildInputIcons(m);
            const output = buildOutputCost(m);
            sections.push(`| ${nom} | \`${m.name}\` | ${desc.substring(0, 40)} | ${badges} | ${input} | ${output} |`);
        }
        sections.push('');
    }

    sections.push(t('commands.models.capabilities'));
    sections.push(t('commands.models.other'));

    return { handled: true, response: sections.join('\n') };
}

export async function handlePricingCommand(): Promise<CommandResult> {
    try {
        const cp = require('child_process');
        const path = require('path');
        // Pointeur __dirname -> dist/server. Donc on cible scripts/pollinations_pricing.js
        const scriptPath = path.join(__dirname, 'scripts', 'pollinations_pricing.js');

        // Exécution locale via Node (sécurisé pour le bundle prod, pas de npx tsx)
        const output = cp.execSync(`node "${scriptPath}"`, { encoding: 'utf-8', stdio: 'pipe' });

        return { handled: true, response: output };
    } catch (e: any) {
        return { handled: true, error: `Erreur lors de la récupération des prix: ${e.message}` };
    }
}

// ─── Formatting Helpers for Models/Pricing ────────────────────────────────

function buildBadges(m: PollinationsModel): string {
    const f: string[] = [];
    if (m.paid_only) f.push('💎');

    const allFlags = [...(m.input_modalities || []), ...(m.output_modalities || []), m.name];
    if (m.supportsI2X) allFlags.push("👁️");
    const str = allFlags.join(" ").toLowerCase();

    if (str.includes("image") || str.includes("👁️")) f.push("👁️");
    if (m.reasoning || str.includes("reasoning")) f.push("🧠");
    if (str.includes("audio") || str.includes("whisper") || str.includes("scribe") || str.includes("🎙️")) f.push("🎙️");
    if (str.includes("search") || str.includes("sonar") || str.includes("gemini")) f.push("🔍");
    if (m.output_modalities.includes("audio") || (m.voices && m.voices.length > 0) || str.includes("tts") || str.includes("music")) f.push("🔊");
    if (str.includes("coder") || str.includes("code") || str.includes("gemini")) f.push("💻");

    return f.filter((v, i, a) => a.indexOf(v) === i).join(" ");
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
    const tokens = t('commands.pricing_units.tokens');
    const s = t('commands.pricing_units.s');
    const img = t('commands.pricing_units.img');
    const tok = t('commands.pricing_units.tok');

    if (p.completionImageTokens) {
        return p.completionImageTokens < 0.0001
            ? tokens
            : `${p.completionImageTokens} ${img}`;
    }
    if (p.completionVideoSeconds) return `${p.completionVideoSeconds} ${s}`;
    if (p.completionVideoTokens) return `${tokens}/s`;
    if (p.completionAudioTokens) return `${p.completionAudioTokens} ${tok}`;
    if (p.completionAudioSeconds) return `${p.completionAudioSeconds} ${s}`;
    if (p.promptAudioSeconds) return `${p.promptAudioSeconds} ${s}`;
    if (p.completionTextTokens) return `${p.completionTextTokens} ${tok}`;
    return tokens;
}

export async function handleInfosCommand(): Promise<CommandResult> {
    const config = loadConfig();
    let name = "Developer";
    let tier = "anonymous";

    if (config.apiKey) {
        try {
            const res = await fetch('https://gen.pollinations.ai/account/profile', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                if (data.name) name = data.name;
                tier = data.tier || "anonymous";
            }
        } catch (e) {
            // Ignorer l'erreur réseau et garder les valeurs par défaut
        }
    }

    const emojis: Record<string, string> = {
        microbe: '🦠', spore: '🍄', seed: '🌱', flower: '🌸', nectar: '🍯', anonymous: '👤'
    };
    const tierEmoji = emojis[tier] || '❓';

    const response = `${t('commands.infos.title', { name })}
${t('commands.infos.features_title')}
${t('commands.infos.features_free')}

${t('commands.infos.features_pro')}

${t('commands.infos.features_config')}

${t('commands.infos.tiers_title', { emoji: tierEmoji, tier: tier.toUpperCase() })}
${t('commands.infos.about')}

${t('commands.infos.levels_title')}
${t('commands.infos.levels_list')}

${t('commands.infos.beta_note')}

${t('commands.infos.pollen_title')}

${t('commands.infos.pollen_get')}

${t('commands.infos.pollen_spend')}`;

    return { handled: true, response };
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
                        output.error = t('commands.generic.tui_error', { error: result.error });
                    } else if (result.response) {
                        output.response = result.response;
                    }
                    // If no response and no error, assume handled silently (like appendPrompt)
                }
            } catch (err: any) {
                output.error = t('commands.generic.tui_critical', { error: err.message });
            }
        },

        // Hook for UI Commands (Palette / Buttons)
        'command.execute.before': async (input: any, output: any) => {
            const cmd = input.command;
            if (cmd === 'pollinations.addKey') {
                handleCommand('addKey'); // Return help message
            } else if (cmd === 'pollinations.usage') {
                const res = await handleCommand('usage');
                if (res.response) globalClient?.tui.showToast({ title: "Pollinations Usage", metadata: { type: 'info', message: t('commands.generic.tui_usage_msg') } });
            } else if (cmd === 'pollinations.mode') {
                // UI Pollution Fix: SILENCE.
                // User explicitly requested NO messages.
            }
        }
    };

}
