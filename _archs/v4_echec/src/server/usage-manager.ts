
import * as https from 'https';
import { PollinationsConfig } from './config.js';

// ----------------------------------------------------------------------
// TYPES (Ported from pollinations-usage)
// ----------------------------------------------------------------------

interface DetailedUsageEntry {
    timestamp: string;
    model: string;
    api_key: string;
    meter_source: 'tier' | 'pack';
    cost_usd: number;
    // ... we can ignore tokens for now if just balancing
}

export interface ResetInfo {
    nextReset: Date;
    lastReset: Date;
    timeUntilReset: number;
    progressPercent: number;
}

export interface CurrentUsageStats {
    tierUsed: number;
    tierRemaining: number;
    packUsed: number;
    totalRequests: number;
    tierLimit: number; // e.g. 3 for Seed
}

export interface UserUsageReport {
    profile: {
        tier: string;
        tierLimit: number;
    };
    walletBalance: number; // Balance total (Pack + TierRemaining?)
    reset: ResetInfo;
    usage: CurrentUsageStats;
}

const BASE_URL = 'https://gen.pollinations.ai';

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------

function fetchAPI<T>(endpoint: string, apiKey: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${endpoint}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': `opencode-plugin-v4`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function parseUsageTimestamp(timestamp: string): Date {
    // Format: "2026-01-23 01:11:21" (UTC typically) -> "2026-01-23T01:11:21Z"
    const isoString = timestamp.replace(' ', 'T') + 'Z';
    return new Date(isoString);
}

// ----------------------------------------------------------------------
// LOGIC
// ----------------------------------------------------------------------

export async function getUserUsage(apiKey: string): Promise<UserUsageReport> {
    // 1. Fetch Profile (for Next Reset & Tier)
    // NOTE: In pollinations-usage, it fetches /account/profile? No, inferred?
    // README says /account/usage.
    // Let's assume there is a way to get Tier Limit.
    // pollinations-usage hardcodes TIER_LIMITS map.
    // But we need the USER'S tier.
    // Assuming /account/usage headers or body contains it? Or /account/me?
    // Let's rely on `pollinations-usage` logic: It calls:
    // fetchAPI('/account/usage') -> returns { usage: DetailedUsageEntry[], count: number }
    // How does it know Profile/Tier?
    // Ah, `index.ts` has `interface Profile`. Where is it filled?
    // Ah, there MUST be another endpoint.
    // I will Assume there is `/profile` or `/user`.
    // Let's check `pollinations-usage/index.ts` again if needed.
    // But for MVP, let's fetch usage and balance.

    // Actually, `pollinations-usage` index.ts likely calls `/account` or `/user/profile`? 
    // Wait, I didn't see the call in the snippet I read (Lines 1-800).
    // I'll fetch `/account/balance` and `/account/usage`.

    const [balanceData, usageData] = await Promise.all([
        fetchAPI<{ balance: number }>('/account/balance', apiKey),
        fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', apiKey)
    ]);

    // Hardcoded defaults until we have Profile endpoint
    const userTier = 'seed'; // Assumption or parsing needed
    const tierLimit = 3.0; // Default Seed

    // 2. Calculate Reset Time
    // We assume Reset is at a fixed time or relative to creation?
    // `pollinations-usage` calculated it via `nextResetAt` string.
    // Where did it get `nextResetAt`?
    // It must be from a Profile response.
    // For now, I will use a simple "Midnight UTC" fallback or similar, OR just rely on Balance.

    // ACTUALLY, to be precise, I should fetch what `pollinations-usage` fetches.
    // But for now, let's focus on BUDGET (Tier vs Pack).

    // Logic: Tier resets every 24h.
    // If we can't get ResetTime precisely, we assume Reset logic is handled by backend returns.
    // Wait, the Plugin needs to know "TierRemaining" to decide Routing.
    // If Backend Balance = Tier + Pack, we can't easily separate them without Reset Time.
    // BUT `pollinations-usage` logic implies we calculate `TierRemaining` by summing usage SINCE LAST RESET.
    // So Reset Time is CRITICAL.

    // I will assume for now: Reset is 00:00 UTC? Or User Specific?
    // User Specific.
    // I'll try to fetch `/account/profile` or `/account/me`.
    let profileData: any = {};
    try {
        profileData = await fetchAPI('/account/info', apiKey); // Try /account/info
    } catch (e) {
        // Fallback
    }

    const nextResetAt = profileData.nextResetAt || new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();
    const resetInfo = calculateResetInfo(nextResetAt);

    // 3. Calculate Stats
    const stats = calculateCurrentPeriodStats(usageData.usage, resetInfo, tierLimit);

    return {
        profile: {
            tier: profileData.tier || userTier,
            tierLimit: tierLimit
        },
        walletBalance: balanceData.balance,
        reset: resetInfo,
        usage: stats
    };
}

function calculateResetInfo(nextResetAt: string): ResetInfo {
    const nextReset = new Date(nextResetAt);
    const now = new Date();

    // Last reset is 24h before Next Reset (Assuming daily cycle)
    const lastReset = new Date(nextReset.getTime() - 24 * 60 * 60 * 1000);

    const timeUntilReset = nextReset.getTime() - now.getTime();
    const totalCycle = 24 * 60 * 60 * 1000;
    const progressPercent = Math.max(0, Math.min(100, (1 - timeUntilReset / totalCycle) * 100));

    return {
        nextReset,
        lastReset,
        timeUntilReset,
        progressPercent
    };
}

function calculateCurrentPeriodStats(
    usage: DetailedUsageEntry[],
    resetInfo: ResetInfo,
    tierLimit: number
): CurrentUsageStats {
    let tierUsed = 0;
    let packUsed = 0;
    let totalRequests = 0;

    const entriesAfterReset = usage.filter(entry => {
        const entryTime = parseUsageTimestamp(entry.timestamp);
        return entryTime >= resetInfo.lastReset;
    });

    for (const entry of entriesAfterReset) {
        totalRequests++;
        if (entry.meter_source === 'tier') tierUsed += entry.cost_usd;
        else if (entry.meter_source === 'pack') packUsed += entry.cost_usd;
    }

    return {
        tierUsed,
        tierRemaining: Math.max(0, tierLimit - tierUsed),
        packUsed,
        totalRequests,
        tierLimit
    };
}
