import * as https from 'https';
import { loadConfig } from './config.js';

// === INTERFACES ===

import { DetailedUsageEntry } from './pollinations-api.js';

interface BalanceResponse {
    total?: number;       // PR #12449 (new format)
    allowance?: number;   // PR #12449 — Quest allowance if present (not in prod yet)
    pack?: number;        // PR #12449 — paid pollen if present (not in prod yet)
    balance?: number;     // legacy format (single combined number)
    currency?: string;
}

/**
 * v6.5 — Quest/Paid semantics.
 * The old tier/refill model (KNOWN_REFILLS, hourly allowance deduction,
 * tierMetaForAllowance) has been removed: upstream deleted the hourly refill
 * (cron disabled 2026-06, code removed 2026-07). The client cannot read a
 * reliable Quest/Paid split from /account/balance in prod, so `questBalance`
 * is a BEST-EFFORT estimate (claimed quest pollen minus tier-metered usage
 * since claim). `walletBalance` is Paid pollen when exposed (pack), otherwise
 * estimated as total minus quest. meter_source in /account/usage remains the
 * only authoritative retrospective split.
 */
export interface QuotaStatus {
    questBalance: number;    // best-effort Quest pollen available
    walletBalance: number;   // Paid pollen (pack) — best-effort when pack absent
    totalBalance: number;    // raw {balance} total from /account/balance

    canUseEnterprise: boolean;
    isUsingWallet: boolean;
    needsAlert: boolean;

    errorType?: 'auth_limited' | 'network' | 'unknown';
}

// === CACHE & CONSTANTS ===

const CACHE_TTL = 30000;
let cachedQuota: QuotaStatus | null = null;
let lastQuotaFetch: number = 0;

const STASH_CACHE_TTL = 5 * 60 * 1000; // 5 min — Quest stash changes rarely
let cachedStash: { questStash: number; claimedQuestTier: number; tierConsumedSinceClaim: number } | null = null;
let lastStashFetch: number = 0;

const ONE_HOUR_MS = 60 * 60 * 1000;

// === LOGGING ===
import { logApi } from './logger.js';
function logQuota(msg: string) {
    logApi(`[QUOTA] ${msg}`);
}

// === SMART FETCH API (cursor-based) ===

export async function fetchUsageForPeriod(apiKey: string, lastReset: Date): Promise<DetailedUsageEntry[]> {
    let allUsage: DetailedUsageEntry[] = [];
    const limit = 100;
    let cursorEventId: string | null = null;

    while (true) {
        let queryPath = `/account/usage?limit=${limit}`;
        if (cursorEventId) {
            queryPath += `&before_event_id=${encodeURIComponent(cursorEventId)}`;
        }

        let usageRes;
        try {
            usageRes = await fetchAPI<{ usage: DetailedUsageEntry[]; count: number }>(queryPath, apiKey);
        } catch (e) {
            logQuota(`SmartFetch failed: ${e}`);
            break;
        }

        if (!usageRes.usage || usageRes.usage.length === 0) {
            break;
        }

        let reachedCutoff = false;
        for (const entry of usageRes.usage) {
            const timestampStr = entry.timestamp.includes('Z')
                ? entry.timestamp
                : entry.timestamp.replace(' ', 'T') + 'Z';
            const entryTime = new Date(timestampStr);
            if (entryTime < lastReset) {
                reachedCutoff = true;
                break;
            }
            allUsage.push(entry);
        }

        if (reachedCutoff || usageRes.usage.length < limit) {
            break;
        }

        const lastEntry = usageRes.usage[usageRes.usage.length - 1];
        cursorEventId = (lastEntry as any).cursor_event_id || null;
        if (!cursorEventId) break;
    }

    logQuota(`SmartFetch: Retrieved ${allUsage.length} transactions for current period.`);
    return allUsage;
}

// === MAIN QUOTA FUNCTION ===

export async function getQuotaStatus(forceRefresh = false): Promise<QuotaStatus> {
    const config = loadConfig();

    if (!config.apiKey) {
        return createDefaultQuota(0);
    }

    const now = Date.now();
    if (!forceRefresh && cachedQuota && (now - lastQuotaFetch) < CACHE_TTL) {
        return cachedQuota;
    }

    try {
        logQuota("Fetching Quota Data...");

        const balanceRes = await fetchAPI<BalanceResponse>('/account/balance', config.apiKey);

        // Fetch quest stash BEFORE paidPollen calculation (cached 5 min)
        const nowStash = Date.now();
        if (!cachedStash || (nowStash - lastStashFetch) > STASH_CACHE_TTL) {
            try {
                cachedStash = await fetchQuestStash(config.apiKey!);
                lastStashFetch = nowStash;
            } catch { /* keep previous */ }
        }
        const questEstimate = cachedStash?.questStash ?? 0;

        const totalBalance = balanceRes.total
            ?? balanceRes.balance
            ?? 0;

        // Quest balance: native allowance when available (PR #12541 not in prod),
        // else best-effort stash estimate.
        const questBalance = balanceRes.allowance !== undefined
            ? Math.max(0, balanceRes.allowance)
            : questEstimate;

        // Paid pollen: native pack when available, else total minus quest estimate.
        const paidPollenNative = balanceRes.pack;
        const walletBalance = paidPollenNative !== undefined
            ? Math.max(0, paidPollenNative)
            : Math.max(0, totalBalance - questBalance);

        const cleanQuestBalance = Math.max(0, parseFloat(questBalance.toFixed(4)));
        const cleanWalletBalance = Math.max(0, parseFloat(walletBalance.toFixed(4)));

        // Alerts (v6.5): thresholds are absolute pollen floors, not percentages.
        const questNeedsAlert = cleanQuestBalance > 0 && cleanQuestBalance < (config.thresholds.quest ?? 0.05);
        const walletNeedsAlert = cleanWalletBalance > 0 && cleanWalletBalance < (config.thresholds.wallet ?? 0.5);

        logQuota(`Fetch Success. Quest: ${cleanQuestBalance}, Paid: ${cleanWalletBalance}, Total: ${totalBalance}`);

        cachedQuota = {
            questBalance: cleanQuestBalance,
            walletBalance: cleanWalletBalance,
            totalBalance,
            canUseEnterprise: cleanQuestBalance > 0.05 || cleanWalletBalance > 0.05,
            isUsingWallet: cleanQuestBalance <= 0.05 && cleanWalletBalance > 0.05,
            needsAlert: questNeedsAlert || walletNeedsAlert
        };

        lastQuotaFetch = now;
        return cachedQuota;

    } catch (e: any) {
        logQuota(`ERROR fetching quota: ${e.message}`);

        let errorType: 'auth_limited' | 'network' | 'unknown' = 'unknown';
        if (e.message && e.message.includes('403')) errorType = 'auth_limited';
        else if (e.message && e.message.includes('Network Error')) errorType = 'network';

        return cachedQuota || { ...createDefaultQuota(0), errorType };
    }
}

function createDefaultQuota(_limit: number): QuotaStatus {
    return {
        questBalance: 0,
        walletBalance: 0,
        totalBalance: 0,
        canUseEnterprise: false,
        isUsingWallet: false,
        needsAlert: false
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
                'User-Agent': 'opencode-pollinations-plugin/6.5.0'
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

        // v6.5: bound the request (quota read was previously unbounded → hang risk).
        req.setTimeout(10000, () => {
            req.destroy(new Error('Timeout: quota API fetch exceeded 10s'));
        });

        req.end();
    });
}

/** Next top-of-hour UTC reset window (used for usage period windows only). */
export function calculateResetInfo(): { nextReset: Date; lastReset: Date } {
    const now = new Date();
    const nextReset = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours() + 1,
        0, 0, 0
    ));
    const lastReset = new Date(nextReset.getTime() - ONE_HOUR_MS);
    return { nextReset, lastReset };
}

export function formatQuotaForToast(quota: QuotaStatus): string {
    if (quota.errorType === 'auth_limited') {
        return `🔑 CLE LIMITÉE (Génération Seule) | 💎 Paid: N/A | 🎁 Quest: N/A`;
    }

    return `🎁 Quest: ~${quota.questBalance.toFixed(2)} | 💎 Paid: ~${quota.walletBalance.toFixed(2)}${quota.needsAlert ? ' | ⚠️' : ''}`;
}

/**
 * Best-effort Quest balance: claimed quest pollen (tier bucket) minus
 * tier-metered consumption since the earliest claim. This is NOT a server
 * guarantee — the authoritative split is meter_source in /account/usage.
 */
export async function fetchQuestStash(apiKey: string): Promise<{ questStash: number; claimedQuestTier: number; tierConsumedSinceClaim: number }> {
    let claimedQuestTier = 0;
    let firstClaimMs = Infinity;
    let tierConsumedSinceClaim = 0;

    try {
        const qres = await fetchAPI<{ quests: Array<{ reward?: { pollenAmount: number; claimedAt: string | null; balanceBucket: string } | null }> }>('/account/quests', apiKey);
        for (const q of (qres?.quests || [])) {
            const r = q.reward;
            if (r && r.claimedAt && r.balanceBucket === 'tier') {
                claimedQuestTier += (r.pollenAmount || 0);
                const cms = new Date(r.claimedAt).getTime();
                if (!isNaN(cms) && cms < firstClaimMs) firstClaimMs = cms;
            }
        }

        if (claimedQuestTier > 0 && isFinite(firstClaimMs)) {
            const ures = await fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage?limit=500', apiKey);
            for (const e of (ures?.usage || [])) {
                const ts = new Date(String(e.timestamp).replace(' ', 'T') + (String(e.timestamp).includes('Z') ? '' : 'Z')).getTime();
                if (e.meter_source === 'tier' && !isNaN(ts) && ts >= firstClaimMs) {
                    tierConsumedSinceClaim += (e.cost_usd || 0);
                }
            }
        }
    } catch { /* fallback gracefully */ }

    const questStash = Math.max(0, claimedQuestTier - tierConsumedSinceClaim);
    return { questStash, claimedQuestTier, tierConsumedSinceClaim };
}
