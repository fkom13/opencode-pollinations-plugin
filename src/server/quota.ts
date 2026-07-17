import * as https from 'https';
import { loadConfig } from './config.js';

// === INTERFACES ===

import { DetailedUsageEntry } from './pollinations-api.js';

interface BalanceResponse {
    total?: number;       // PR #12449 (new format)
    allowance?: number;   // PR #12449 — hourly refill (0.01/0.15/0.4/0.8/10)
    pack?: number;        // PR #12449 — paid pollen
    balance?: number;     // legacy format (single combined number)
    currency?: string;
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
    tierRemaining: number;
    tierUsed: number;
    tierLimit: number;       // hourly refill (deduced or native allowance)
    questStash: number;      // accumulated quest pollen (claimed - consumed)
    walletBalance: number;

    nextResetAt: Date;
    timeUntilReset: number;

    canUseEnterprise: boolean;
    isUsingWallet: boolean;
    needsAlert: boolean;

    tier: string;
    tierEmoji: string;
    errorType?: 'auth_limited' | 'network' | 'unknown';
}

// === CACHE & CONSTANTS ===

const CACHE_TTL = 30000;
let cachedQuota: QuotaStatus | null = null;
let lastQuotaFetch: number = 0;

const STASH_CACHE_TTL = 5 * 60 * 1000; // 5 min — le stash Quest change rarement
let cachedStash: { questStash: number; claimedQuestTier: number; tierConsumedSinceClaim: number } | null = null;
let lastStashFetch: number = 0;

const ONE_HOUR_MS = 60 * 60 * 1000;

const KNOWN_REFILLS = [
    { pollen: 0,    emoji: '👤', label: 'anonymous' },
    { pollen: 0.01, emoji: '🍄', label: 'spore' },
    { pollen: 0.15, emoji: '🌱', label: 'seed' },
    { pollen: 0.4,  emoji: '🌸', label: 'flower' },
    { pollen: 0.8,  emoji: '🍯', label: 'nectar' },
    { pollen: 10,   emoji: '🐝', label: 'router' },
];

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

// === ALLOWANCE DEDUCTION ===

async function fetchUsageForAllowance(apiKey: string): Promise<DetailedUsageEntry[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * ONE_HOUR_MS);
    const allUsage: DetailedUsageEntry[] = [];
    let cursorEventId: string | null = null;
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
        let path = `/account/usage?days=7&limit=500`;
        if (cursorEventId) {
            path += `&before_event_id=${encodeURIComponent(cursorEventId)}`;
        }

        const res = await fetchAPI<{ usage: DetailedUsageEntry[]; count: number }>(path, apiKey);

        if (!res.usage || res.usage.length === 0) break;

        let reachedCutoff = false;
        for (const entry of res.usage) {
            const ts = (entry.timestamp.includes('Z') ? entry.timestamp : entry.timestamp.replace(' ', 'T') + 'Z');
            if (new Date(ts) < sevenDaysAgo) { reachedCutoff = true; break; }
            allUsage.push(entry);
        }

        if (reachedCutoff || res.usage.length < 500) break;

        const last = res.usage[res.usage.length - 1] as any;
        cursorEventId = last?.cursor_event_id || null;
        if (!cursorEventId) break;
        pageCount++;
    }

    logQuota(`deduceAllowance: fetched ${allUsage.length} records over ${pageCount + 1} pages`);
    return allUsage;
}

async function deduceAllowanceFromApi(apiKey: string): Promise<number> {
    try {
        const allUsage = await fetchUsageForAllowance(apiKey);
        if (allUsage.length === 0) return 0;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * ONE_HOUR_MS);
        const hourlyBuckets = new Map<number, number>();

        for (const entry of allUsage) {
            if (entry.meter_source !== 'tier') continue;
            const ts = entry.timestamp.includes('Z') ? entry.timestamp : entry.timestamp.replace(' ', 'T') + 'Z';
            const entryTime = new Date(ts);
            if (entryTime < sevenDaysAgo) continue;

            const hourKey = entryTime.getUTCFullYear() * 1000000
                + entryTime.getUTCMonth() * 10000
                + entryTime.getUTCDate() * 100
                + entryTime.getUTCHours();
            hourlyBuckets.set(hourKey, (hourlyBuckets.get(hourKey) || 0) + entry.cost_usd);
        }

        const maxHourlyTier = Math.max(0, ...hourlyBuckets.values());
        const match = KNOWN_REFILLS.slice().reverse().find(r => r.pollen <= maxHourlyTier + 0.02);

        logQuota(`deduceAllowance: ${allUsage.length} records, ${hourlyBuckets.size} hourly buckets, max=${maxHourlyTier.toFixed(4)}, deduced=${match?.pollen ?? 0} (${match?.label})`);
        return match ? match.pollen : 0;
    } catch (e) {
        logQuota(`deduceAllowance failed: ${e}`);
        return 0;
    }
}

function deduceAllowanceFromUsage(usage: DetailedUsageEntry[]): number {
    const tierCosts = usage
        .filter(u => u.meter_source === 'tier')
        .map(u => u.cost_usd);
    const maxHourlyTier = Math.max(0, ...tierCosts);
    const match = KNOWN_REFILLS.slice().reverse().find(r => r.pollen <= maxHourlyTier + 0.02);
    return match ? match.pollen : 0;
}

/** Map hourly refill amount → display meta (exported for unit tests). */
export function tierMetaForAllowance(allowance: number): { label: string; emoji: string } {
    const match = KNOWN_REFILLS.find(r => r.pollen === allowance)
        || KNOWN_REFILLS.findLast(r => r.pollen <= allowance);
    return match
        ? { label: match.label, emoji: match.emoji }
        : { label: 'unknown', emoji: '❓' };
}

/** Known hourly refill ladder (read-only, for tests / UI). */
export function getKnownRefills(): ReadonlyArray<{ pollen: number; emoji: string; label: string }> {
    return KNOWN_REFILLS;
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

        const balanceRes = await fetchAPI<BalanceResponse>('/account/balance', config.apiKey);

        const resetInfo = calculateResetInfo();
        const periodUsage = await fetchUsageForPeriod(config.apiKey, resetInfo.lastReset);

        const allowance = balanceRes.allowance
            ?? (config as any).refillOverride
            ?? await deduceAllowanceFromApi(config.apiKey);

        const tierMeta = tierMetaForAllowance(allowance);
        const tierLimit = allowance;

        const { tierUsed } = calculateCurrentPeriodUsage(periodUsage, resetInfo);
        const tierRemaining = Math.max(0, tierLimit - tierUsed);
        const cleanTierRemaining = Math.max(0, parseFloat(tierRemaining.toFixed(4)));

        const totalBalance = balanceRes.total
            ?? balanceRes.balance
            ?? 0;

        // Fetch quest stash BEFORE paidPollen calculation (cached 5 min)
        const nowStash = Date.now();
        if (!cachedStash || (nowStash - lastStashFetch) > STASH_CACHE_TTL) {
            try {
                cachedStash = await fetchQuestStash(config.apiKey!);
                lastStashFetch = nowStash;
            } catch { /* keep previous */ }
        }
        const questStash = cachedStash?.questStash ?? 0;

        const paidPollenNative = balanceRes.pack;
        const paidPollen = paidPollenNative !== undefined
            ? paidPollenNative
            : Math.max(0, totalBalance - cleanTierRemaining - questStash);

        const cleanWalletBalance = Math.max(0, parseFloat(paidPollen.toFixed(4)));

        const tierAlertPercent = tierLimit > 0 ? (cleanTierRemaining / tierLimit * 100) : 0;
        const tierNeedsAlert = tierLimit > 0 && tierAlertPercent <= config.thresholds.tier;
        const walletNeedsAlert = cleanWalletBalance > 0 && cleanWalletBalance < (config.thresholds.wallet || 0.5);

        logQuota(`Fetch Success. Allowance: ${allowance}, Stash: ${questStash}, Paid: ${cleanWalletBalance}, Total: ${totalBalance}`);

        cachedQuota = {
            tierRemaining: cleanTierRemaining,
            tierUsed,
            tierLimit,
            questStash,
            walletBalance: cleanWalletBalance,
            nextResetAt: resetInfo.nextReset,
            timeUntilReset: resetInfo.timeUntilReset,
            canUseEnterprise: cleanTierRemaining > 0.05 || cleanWalletBalance > 0.05,
            isUsingWallet: cleanTierRemaining <= 0.05 && cleanWalletBalance > 0.05,
            needsAlert: tierNeedsAlert || walletNeedsAlert,
            tier: tierMeta.label,
            tierEmoji: tierMeta.emoji
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
    const meta = tierMetaForAllowance(limit);
    return {
        tierRemaining: 0,
        tierUsed: 0,
        tierLimit: limit,
        questStash: 0,
        walletBalance: 0,
        nextResetAt: new Date(),
        timeUntilReset: 0,
        canUseEnterprise: false,
        isUsingWallet: false,
        needsAlert: false,
        tier: tierName !== 'none' ? meta.label : 'none',
        tierEmoji: meta.emoji
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
                'User-Agent': 'opencode-pollinations-plugin/6.4.1'
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

/** Next top-of-hour UTC reset window (exported for unit tests). */
export function calculateResetInfo(): ResetInfo {
    const now = new Date();
    const nextReset = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours() + 1,
        0, 0, 0
    ));
    const lastReset = new Date(nextReset.getTime() - ONE_HOUR_MS);

    const timeUntilReset = Math.max(0, nextReset.getTime() - now.getTime());
    const timeSinceReset = Math.max(0, now.getTime() - lastReset.getTime());
    const progressPercent = Math.min(100, (timeSinceReset / ONE_HOUR_MS) * 100);

    return {
        nextReset,
        lastReset,
        timeUntilReset,
        timeSinceReset,
        resetHour: nextReset.getUTCHours(),
        resetMinute: 0,
        resetSecond: 0,
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

    const stashStr = quota.questStash > 0
        ? ` | 🎁 ~${quota.questStash.toFixed(2)} (stash)`
        : '';

    return `${quota.tierEmoji} ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} (${tierPercent}%)${stashStr} | 💎 $${quota.walletBalance.toFixed(2)} | ⏰ ${resetIn}`;
}

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