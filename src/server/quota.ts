
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

        // Fetch parallèle using HTTPS helper
        const [profileRes, balanceRes, usageRes] = await Promise.all([
            fetchAPI<Profile>('/account/profile', config.apiKey),
            fetchAPI<{ balance: number }>('/account/balance', config.apiKey),
            fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey)
        ]);

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

    } catch (e) {
        logQuota(`ERROR fetching quota: ${e}`);
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
            tierEmoji: '⚠️'
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
