import * as https from 'https';
import { loadConfig, saveConfig, saveKeyToAuthJson, PollinationsConfigV5 } from './config.js';
import { getQuotaStatus, QuotaStatus, fetchUsageForPeriod, calculateResetInfo } from './quota.js';
import { emitStatusToast, emitLogToast } from './toast.js';
import { DetailedUsageEntry } from './pollinations-api.js';
import { generatePollinationsConfig } from './generate-config.js';
import { ModelRegistry } from './models/index.js';
import type { PollinationsModel, ModelCategory } from './models/types.js';
import { t } from '../locales/index.js';
import { buildQuestsReport } from '../tools/pollinations/polli_quests.js';



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

function calculateCurrentPeriodStats(
    usage: DetailedUsageEntry[],
    lastReset: Date
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
        tierRemaining: 0,
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
        case 'login':
            return await startDeviceLogin();
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
        case 'quests':
            return await handleQuestsCommand(args);
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

    // v6.5 Quest/Paid modes + legacy aliases (alwaysfree → quest, pro → paid).
    const LEGACY_MODE_ALIASES: Record<string, string> = {
        'alwaysfree': 'quest',
        'pro': 'paid',
    };
    const resolvedMode = LEGACY_MODE_ALIASES[mode] || mode;

    if (!['manual', 'quest', 'quest_only', 'paid'].includes(resolvedMode)) {
        return {
            handled: true,
            error: t('commands.mode.invalid', { mode })
        };
    }

    const checkConfig = loadConfig();

    // JIT VERIFICATION for Quest/Paid modes (requires a valid key)
    if (resolvedMode === 'quest' || resolvedMode === 'quest_only' || resolvedMode === 'paid') {
        const key = checkConfig.apiKey;

        if (!key) {
            if (resolvedMode === 'paid' || resolvedMode === 'quest_only') {
                return { handled: true, error: t('commands.mode.key_required', { mode: resolvedMode }) };
            }
        } else {
            emitStatusToast('info', t('commands.mode.verifying'), 'Mode');
            try {
                // Force verify permissions NOW
                const check = await checkKeyPermissions(key);
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
    }

    // Allow switch
    saveConfig({ mode: resolvedMode as PollinationsConfigV5['mode'] });
    const config = loadConfig();
    if (config.gui.status !== 'none') {
        emitStatusToast('success', t('commands.mode.success', { mode: resolvedMode }), 'Pollinations Config');
    }

    const aliasNote = LEGACY_MODE_ALIASES[mode] ? ` ${t('commands.mode.legacy_alias', { legacy: mode, mode: resolvedMode })}` : '';

    return {
        handled: true,
        response: t('commands.mode.success', { mode: resolvedMode }) + aliasNote
    };
}

export async function handleUsageCommand(args: string[]): Promise<CommandResult> {
    const isFull = args[0] === 'full';

    try {
        const quota = await getQuotaStatus(true);
        const config = loadConfig();
        const resetInfo = calculateResetInfo();

        let response = t('commands.usage.title', { mode: config.mode.toUpperCase() });

        response += t('commands.usage.resources');

        const quest = quota.questBalance;
        const paid = quota.walletBalance;
        const total = quota.totalBalance || (quest + paid);

        response += t('commands.usage.split', {
            quest: quest.toFixed(2),
            paid: paid.toFixed(2),
            total: total.toFixed(2),
        });
        response += t('commands.usage.quest_note');

        if (isFull && config.apiKey) {
            if (config.keyHasAccessToProfile === false) {
                response += t('commands.usage.restricted_key');
            } else {
                const lastReset = resetInfo.lastReset;
                const usageData = await fetchUsageForPeriod(config.apiKey, lastReset);
                if (usageData && usageData.length > 0) {
                    const stats = calculateCurrentPeriodStats(usageData, lastReset);

                    response += t('commands.usage.period_detail', { time: lastReset.toLocaleTimeString() });
                    response += t('commands.usage.total_reqs', { reqs: stats.totalRequests, inTok: formatTokens(stats.inputTokens), outTok: formatTokens(stats.outputTokens) });

                    // Exact consumption split by meter_source (tier = Quest Pollen, pack = Paid).
                    // This is the ONLY reliable split the API exposes.
                    response += t('commands.usage.source_split', {
                        tier: formatPollen(stats.tierUsed),
                        pack: formatPollen(stats.packUsed),
                    });

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

// ─── DEVICE FLOW LOGIN (option C: background poller) ───────────────────────

/** Best-effort cross-platform browser open. Never throws (headless-safe). */
function openBrowser(url: string): boolean {
    try {
        const cp = require('child_process');
        const platform = process.platform;
        const cmd = platform === 'win32' ? 'start ""'
            : platform === 'darwin' ? 'open'
            : 'xdg-open';
        // Detached + ignore stdio so it never blocks the proxy process.
        const child = cp.spawn(cmd, [url], {
            shell: platform === 'win32',
            detached: true,
            stdio: 'ignore',
        });
        child.unref?.();
        return true;
    } catch {
        return false;
    }
}

function postJsonEnter(path: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = https.request({
            hostname: 'enter.pollinations.ai',
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': 'opencode-pollinations-plugin',
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Bad JSON: ${data.slice(0, 120)}`)); }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
    });
}

let loginPollActive = false;

// Publishable app key (pk_) — embedded for BYOP attribution: the consent screen
// shows "plugin by fkom13" and traffic is credited to this app. Safe to ship
// publicly (publishable by design); earningsEnabled=false so users pay nothing extra.
const APP_CLIENT_ID = 'pk_sATzVHuna3I5e7Sf';

// Shared result promise so the tool's `wait` mode can attach to the running poll.
type LoginOutcome = { status: 'connected' | 'expired' | 'error'; message: string };
let loginResultPromise: Promise<LoginOutcome> | null = null;
let lastLoginPrompt: string | null = null; // code+URL prompt, reused on wait timeout

/**
 * Wait mode for the tool: ensures a login is running (auto-starts + opens the
 * browser if needed), then waits up to ~90s and returns the final outcome.
 * On timeout it returns the code/URL prompt so the agent can ask the user to
 * finish authorizing, then be called again with wait:true.
 */
export async function awaitDeviceLogin(): Promise<string> {
    // Auto-start if nothing is in progress (single-call UX: open + wait + report).
    if (!loginPollActive || !loginResultPromise) {
        const started = await startDeviceLogin();
        if (started.error) return started.error;
        // If it reported "already running" without a promise, fall through to wait.
    }

    if (!loginResultPromise) {
        return lastLoginPrompt || t('commands.login.nothing_pending');
    }

    const WAIT_CAP_MS = 120000;
    const timeout = new Promise<LoginOutcome>((res) =>
        setTimeout(() => res({ status: 'error', message: '__TIMEOUT__' }), WAIT_CAP_MS)
    );

    const outcome = await Promise.race([loginResultPromise, timeout]);
    if (outcome.message === '__TIMEOUT__') {
        // Still pending — hand back the code/URL so the user can finish, then retry.
        return (lastLoginPrompt ? lastLoginPrompt + '\n\n' : '') + t('commands.login.still_waiting');
    }
    return outcome.message;
}

export async function startDeviceLogin(): Promise<CommandResult> {
    if (loginPollActive) {
        return { handled: true, response: t('commands.login.already_running') };
    }

    let codeResp: any;
    try {
        codeResp = await postJsonEnter('/api/device/code', {
            client_id: APP_CLIENT_ID,
            scope: 'profile usage keys',   // all scopes shown for transparency; keys (Account Admin) checked by default, user can uncheck
        });
    } catch (e: any) {
        return { handled: true, error: t('commands.login.code_error', { error: e.message }) };
    }

    const userCode = codeResp.user_code;
    const deviceCode = codeResp.device_code;
    const verifyUri = codeResp.verification_uri || 'https://enter.pollinations.ai/device';
    // Standard device link (proven reliable). Scope is applied server-side via the
    // /api/device/code POST body — passing budget/expiry/scope in the /authorize URL
    // breaks submission (their form coerces empty->default and array-scope fails validation).
    // For an unlimited key: user clears Budget + Expiry fields on the form before Authorize.
    const verifyComplete = codeResp.verification_uri_complete || `${verifyUri}?user_code=${userCode}`;
    const interval = (codeResp.interval || 5) * 1000;
    const expiresIn = (codeResp.expires_in || 900) * 1000;

    if (!userCode || !deviceCode) {
        return { handled: true, error: t('commands.login.code_error', { error: 'no code returned' }) };
    }

    // Background poller — non-blocking. Resolves the shared promise on completion.
    loginPollActive = true;
    const deadline = Date.now() + Math.min(expiresIn, 300000); // cap 5 min for UX

    let resolveOutcome: (o: LoginOutcome) => void;
    loginResultPromise = new Promise<LoginOutcome>((res) => { resolveOutcome = res; });
    const finish = (o: LoginOutcome) => { loginPollActive = false; resolveOutcome(o); };

    const poll = async () => {
        if (Date.now() > deadline) {
            const msg = t('commands.login.expired');
            emitStatusToast('warning', msg, 'Pollinations Login');
            finish({ status: 'expired', message: msg });
            return;
        }
        try {
            const tok = await postJsonEnter('/api/device/token', { device_code: deviceCode });
            if (tok.access_token) {
                // Got the key — validate & hot-load it (no restart needed)
                const key = tok.access_token;
                try {
                    await generatePollinationsConfig(key, true);
                    // Verify what the user actually granted (they choose on the consent form).
                    // Do NOT presume profile access — check it, like /poll connect does.
                    let limited = false;
                    try {
                        const check = await checkKeyPermissions(key);
                        limited = !check.ok;
                    } catch { limited = true; }

                    saveConfig({ apiKey: key, keyHasAccessToProfile: !limited, ...(limited ? { mode: 'manual' } : {}) });
                    saveKeyToAuthJson(key);

                    const msg = limited
                        ? t('commands.login.success_limited')
                        : t('commands.login.success_toast');
                    emitStatusToast(limited ? 'warning' : 'success', msg, 'Pollinations Login');
                    finish({ status: 'connected', message: msg });
                } catch (e: any) {
                    const msg = t('commands.login.validate_error', { error: e.message });
                    emitStatusToast('error', msg, 'Pollinations Login');
                    finish({ status: 'error', message: msg });
                }
                return;
            }
            // pending → keep polling
            setTimeout(poll, interval);
        } catch (e: any) {
            // authorization_pending / slow_down / transient → keep polling
            setTimeout(poll, interval);
        }
    };
    setTimeout(poll, interval);

    // Try to open the consent page automatically (headless-safe; URL shown as fallback).
    const opened = openBrowser(verifyComplete);

    const promptText = (opened ? t('commands.login.opened') + '\n\n' : '') + t('commands.login.prompt', {
        code: userCode,
        uri: verifyUri,
        uri_complete: verifyComplete,
    });
    lastLoginPrompt = promptText;

    return {
        handled: true,
        response: promptText,
    };
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
| **mode** | \`${config.mode}\` | ${t('commands.config.mode_role')} | \`/poll mode <quest/quest_only/paid/manual>\` |
| **enablePaidTools**| \`${config.enablePaidTools ?? true}\` | ${t('commands.config.enablePaidTools_role')} | \`/poll config enablePaidTools <true/false>\` |
| **costConfirmationRequired**| \`${config.costConfirmationRequired ?? true}\` | ${t('commands.config.costConfirmationRequired_role')} | \`/poll config costConfirmationRequired <true/false>\` |
| **costThreshold**| \`${config.costThreshold ?? 0.15} 🌻\` | ${t('commands.config.costThreshold_role')} | \`/poll config costThreshold <X>\` |
| **cost_estimator**| \`${config.costEstimator ?? true}\` | ${t('commands.config.cost_estimator_role')} | \`/poll config cost_estimator <true/false>\` |
| **fallbacks.free.main** | \`${config.fallbacks?.free?.main || 'free/mistral'}\` | ${t('commands.config.fallback_main_role')} | \`/poll fallback <main> <agent>\` |
| **fallbacks.free.agent** | \`${config.fallbacks?.free?.agent || 'free/openai-fast'}\`| ${t('commands.config.fallback_agent_role')} | \`/poll fallback <main> <agent>\` |
| **fallbacks.enter.agent** | \`${config.fallbacks?.enter?.agent || 'free/openai-fast'}\`| ${t('commands.config.fallback_enter_role')} | *${t('commands.config.managed_auto')}* |
| **status_gui** | \`${config.gui?.status || 'all'}\` | ${t('commands.config.status_gui_role')} | \`/poll config status_gui <all/alert/none>\` |
| **logs_gui** | \`${config.gui?.logs || 'error'}\` | ${t('commands.config.logs_gui_role')} | \`/poll config logs_gui <verbose/error/none>\` |
| **threshold_quest** | \`${config.thresholds?.quest ?? 0.05} 🌻\` | ${t('commands.config.threshold_quest_role')} | \`/poll config threshold_quest <pollen>\` |
| **threshold_wallet** | \`${config.thresholds?.wallet ?? 0.5} 🌻\` | ${t('commands.config.threshold_wallet_role')} | \`/poll config threshold_wallet <pollen>\` |
| **status_bar** | \`${config.statusBar ?? true}\` | ${t('commands.config.status_bar_role')} | \`/poll config status_bar <true/false>\` |
| **lang** | \`${config.lang || 'en'}\` | ${t('commands.config.lang_role')} | \`/poll config lang <en/fr/es/de/it>\` |`;

        return {
            handled: true,
            response: markdownResponse
        };
    }

    if (key === 'lang' && value) {
        if (!['en', 'fr', 'es', 'de', 'it', 'zh'].includes(value)) {
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

    if (key === 'threshold_quest' && value) {
        const threshold = parseFloat(value);
        if (isNaN(threshold) || threshold < 0) {
            return { handled: true, error: 'Valeur numérique positive requise (en pollen). Ex: 0.05' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, quest: threshold } });
        return { handled: true, response: `✅ threshold_quest = ${threshold} 🌻` };
    }

    if (key === 'threshold_wallet' && value) {
        const threshold = parseFloat(value);
        if (isNaN(threshold) || threshold < 0) {
            return { handled: true, error: 'Valeur numérique positive requise (en pollen). Ex: 0.5' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, wallet: threshold } });
        return { handled: true, response: `✅ threshold_wallet = ${threshold} 🌻` };
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
        error: `Clé inconnue: ${key}. Clés: status_gui, logs_gui, threshold_quest, threshold_wallet, status_bar, cost_estimator, enablePaidTools, costThreshold, costConfirmationRequired, lang`
    };
}

function handleHelpCommand(): CommandResult {
    const config = loadConfig();

    const configKeys = [
        { key: 'lang',              values: 'en, fr, es, de, it, zh',             i18n: 'commands.help.config.lang' },
        { key: 'status_gui',        values: 'none, alert, all',                    i18n: 'commands.help.config.status_gui' },
        { key: 'logs_gui',          values: 'none, error, verbose',                i18n: 'commands.help.config.logs_gui' },
        { key: 'threshold_quest',   values: 'pollen (e.g. 0.05)',                  i18n: 'commands.help.config.threshold_quest' },
        { key: 'threshold_wallet',  values: 'pollen (e.g. 0.5)',                   i18n: 'commands.help.config.threshold_wallet' },
        { key: 'status_bar',        values: 'true/false',                          i18n: 'commands.help.config.status_bar' },
        { key: 'cost_estimator',    values: 'true/false',                          i18n: 'commands.help.config.cost_estimator' },
        { key: 'enablePaidTools',   values: 'true/false',                          i18n: 'commands.help.config.enablePaidTools' },
        { key: 'costThreshold',     values: 'number (pollen)',                     i18n: 'commands.help.config.costThreshold' },
        { key: 'costConfirmationRequired', values: 'true/false',                   i18n: 'commands.help.config.costConfirmationRequired' },
    ];

    const configSection = configKeys.map(k =>
        `   - \`${k.key}\`: ${t(k.i18n)} (\`${k.values}\`)`
    ).join('\n');

    const help = `
${t('commands.help.title')}
${t('commands.help.alias_note')}

${t('commands.help.mode_usage')}

${t('commands.help.configuration_intro')}
${configSection}

${t('commands.help.models_pricing')}
`.trim();

    return { handled: true, response: help };
}

// === MODELS & PRICING COMMANDS ===

function parseNameDesc(m: PollinationsModel): { nom: string, desc: string } {
    const displayName = m.title || m.description || m.name;
    const fullDesc = m.description || m.name;
    if (m.title && m.description) {
        return { nom: m.title, desc: m.description };
    }
    const parts = displayName.split(" - ");
    if (parts.length > 1) {
        return { nom: parts[0].trim(), desc: parts.slice(1).join(" - ").trim() };
    }
    return { nom: displayName, desc: "" };
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
        { cat: '3d', emoji: '🧊', label: t('commands.models.cats.3d') },
        { cat: 'embedding', emoji: '🔢', label: t('commands.models.cats.embedding') },
        { cat: 'realtime', emoji: '⚡', label: t('commands.models.cats.realtime') },
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

    if (config.apiKey) {
        try {
            const res = await fetch('https://gen.pollinations.ai/account/profile', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                if (data.githubUsername) name = data.githubUsername;
            }
        } catch (e) {
            // Ignorer
        }
    }

    // v6.5: Quest/Paid page (the old tier/refill table was removed upstream —
    // hourly refills no longer exist).
const response = `${t('commands.infos.title', { name })}
${t('commands.infos.features_title')}
${t('commands.infos.features_free')}

${t('commands.infos.features_pro')}

${t('commands.infos.features_config')}

${t('commands.infos.get_started')}

${t('commands.infos.about')}

${t('commands.infos.quest_paid_title')}

${t('commands.infos.quest_paid_body')}

${t('commands.infos.quests')}

${t('commands.infos.pollen_title')}

${t('commands.infos.pollen_get')}

${t('commands.infos.pollen_spend')}`;

    return { handled: true, response };
}

async function handleQuestsCommand(args: string[]): Promise<CommandResult> {
    const arg = (args[0] || 'all').toLowerCase();
    const filter: 'all' | 'available' | 'claimable' =
        arg === 'available' ? 'available' : arg === 'claimable' ? 'claimable' : 'all';
    try {
        const report = await buildQuestsReport(filter);
        return { handled: true, response: report };
    } catch (e: any) {
        return { handled: true, error: `Erreur: ${e.message || e}` };
    }
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
