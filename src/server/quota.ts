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
