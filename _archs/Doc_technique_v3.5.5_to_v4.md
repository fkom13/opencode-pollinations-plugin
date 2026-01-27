📚 Documentation Technique Complète - OpenCode Pollinations Plugin V3 → V4
Table des Matières (Mise à jour)
Vue d'ensemble de l'architecture
Analyse détaillée par fichier
Flux de données et séquence d'exécution
Subtilités techniques et difficultés résolues
Points de vigilance pour la V4
🆕 Script pollinations-usage - Référence Quota API
🆕 Architecture V4 Détaillée
Tests de non-régression
🆕 Roadmap V5
1. Vue d'ensemble de l'architecture
(Section identique à la V3 - voir documentation précédente)

2-5. Sections V3
(Sections identiques à la documentation précédente)

6. Script pollinations-usage - Référence Quota API
6.1 Importance pour la V4
Le script pollinations-usage est une référence d'implémentation pour toutes les fonctionnalités de quota et usage de la V4. Il contient:

Les endpoints API exacts de Pollinations
Les structures de données retournées
La logique de calcul du reset quotidien
Le pricing des modèles
Les tiers et leurs limites
6.2 Endpoints API à réutiliser
TypeScript

// Extrait de pollinations-usage/index.ts - À RÉUTILISER DANS V4

const BASE_URL = 'https://gen.pollinations.ai';

// === ENDPOINTS CRITIQUES ===

// 1. Profil utilisateur (tier, reset time)
GET /account/profile
→ Response: {
    name: string;
    email: string;
    githubUsername: string;
    tier: 'spore' | 'seed' | 'flower' | 'nectar';
    createdAt: string;
    nextResetAt: string;  // ISO timestamp du prochain reset
}

// 2. Solde Pollen total
GET /account/balance
→ Response: { balance: number }  // En pollen (1 pollen ≈ $1)

// 3. Usage détaillé (entrées individuelles)
GET /account/usage
→ Response: {
    usage: DetailedUsageEntry[];
    count: number;
}

// 4. Usage agrégé par jour
GET /account/usage/daily
→ Response: {
    usage: DailyUsageEntry[];
    count: number;
}
6.3 Structures de données à importer
TypeScript

// === TYPES À COPIER DANS src/server/quota.ts ===

interface DetailedUsageEntry {
    timestamp: string;           // "2026-01-23 01:11:21" (UTC)
    type: string;
    model: string;
    api_key: string;
    api_key_type: string;
    meter_source: 'tier' | 'pack';  // CRITIQUE: tier = gratuit, pack = payant
    input_text_tokens: number;
    input_cached_tokens: number;
    input_audio_tokens: number;
    input_image_tokens: number;
    output_text_tokens: number;
    output_reasoning_tokens: number;
    output_audio_tokens: number;
    output_image_tokens: number;
    cost_usd: number;           // Coût en pollen/USD
    response_time_ms: number;
}

interface DailyUsageEntry {
    date: string;               // "2026-01-23"
    model: string;
    meter_source: 'tier' | 'pack' | 'combined';
    requests: number;
    cost_usd: number;
    api_key_names: string[];
}
6.4 Limites des Tiers
TypeScript

// === TIER LIMITS - À COPIER DANS config.ts ===

const TIER_LIMITS: Record<string, { pollen: number; emoji: string; description: string }> = {
    spore:  { pollen: 1,  emoji: '🦠', description: 'Sign up' },
    seed:   { pollen: 3,  emoji: '🌱', description: '8+ dev points' },
    flower: { pollen: 10, emoji: '🌸', description: 'Publish an app' },
    nectar: { pollen: 20, emoji: '🍯', description: 'Coming soon 🔮' },
};
6.5 Calcul du Reset Quotidien (CRITIQUE)
TypeScript

// === LOGIQUE DE RESET - À COPIER DANS quota.ts ===

interface ResetInfo {
    nextReset: Date;
    lastReset: Date;
    timeUntilReset: number;      // ms
    timeSinceReset: number;      // ms
    resetHour: number;           // Heure UTC du reset (personnalisée par user)
    resetMinute: number;
    resetSecond: number;
    progressPercent: number;     // 0-100
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
6.6 Calcul du Quota Restant (CRITIQUE)
TypeScript

// === CALCUL TIER RESTANT - À COPIER DANS quota.ts ===

function calculateCurrentPeriodStats(
    usage: DetailedUsageEntry[],
    resetInfo: ResetInfo,
    tierLimit: number
): CurrentPeriodStats {
    let tierUsed = 0;
    let packUsed = 0;

    // Parser le timestamp de l'API
    function parseUsageTimestamp(timestamp: string): Date {
        // Format: "2026-01-23 01:11:21" (UTC)
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

    return {
        tierUsed,
        tierRemaining: Math.max(0, tierLimit - tierUsed),
        packUsed,
        // ... autres stats
    };
}
6.7 Intégration dans la V4
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX D'UTILISATION DU QUOTA EN V4                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INITIALISATION (au démarrage du proxy)                                   │
│     └─► GET /account/profile                                                 │
│         └─► Stocker tier, tierLimit, nextResetAt                             │
│                                                                              │
│  2. AVANT CHAQUE REQUÊTE ENTERPRISE (mode alwaysfree/pro)                   │
│     └─► GET /account/usage (avec cache 30s)                                  │
│         └─► Calculer tierRemaining avec calculateCurrentPeriodStats()        │
│         └─► Décider du routing selon le mode                                 │
│                                                                              │
│  3. APRÈS CHAQUE REQUÊTE TERMINÉE (session.idle)                            │
│     └─► Si toast_verbosity === 'always':                                     │
│         └─► Afficher bilan: "Tier: X/Y restant | Wallet: $Z"                 │
│                                                                              │
│  4. ALERTES (seuils configurables)                                          │
│     └─► Si tierRemaining < threshold:                                        │
│         └─► Toast Warning: "⚠️ Quota Free à X%"                              │
│     └─► Si walletBalance < wallet_threshold:                                 │
│         └─► Toast Warning: "⚠️ Wallet bas: $Y restant"                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
7. Architecture V4 Détaillée
7.1 Structure de fichiers V4
text

└── opencode-pollinations-plugin
    ├── package.json
    ├── tsconfig.json
    ├── src
    │   ├── index.ts                    # Point d'entrée (hooks OpenCode)
    │   ├── types.ts                    # Interfaces TypeScript centralisées
    │   └── server
    │       ├── config.ts               # Configuration persistante (ÉTENDU)
    │       ├── generate-config.ts      # Génération dynamique des modèles
    │       ├── proxy.ts                # Proxy HTTP (REFACTORISÉ)
    │       ├── quota.ts                # 🆕 Gestion quota/usage API
    │       ├── toast.ts                # 🆕 Système de notifications
    │       ├── commands.ts             # 🆕 Commandes CLI
    │       ├── router.ts               # 🆕 Logique de routing par mode
    │       └── pollinations-api.ts     # Agrégation des modèles
    └── dist/                           # Build output
7.2 Configuration Étendue (config.ts)
TypeScript

// src/server/config.ts - VERSION V4

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.env.HOME || '/tmp', '.config/opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'pollinations-config.json');

// === INTERFACE DE CONFIGURATION V4 ===

export interface PollinationsConfigV4 {
    // Authentification
    apiKey?: string;
    
    // Mode de fonctionnement (3 modes)
    mode: 'manual' | 'alwaysfree' | 'pro';
    
    // Modèles de fallback (pour alwaysfree/pro quand quota épuisé)
    fallbackModels: {
        main: string;    // Modèle principal (défaut: 'mistral')
        agent: string;   // Modèle pour agents (défaut: 'openai-fast')
    };
    
    // Seuils d'alerte (en pourcentage)
    thresholds: {
        tier: number;    // Seuil alerte tier (défaut: 10)
        wallet: number;  // Seuil alerte wallet (défaut: 5)
    };
    
    // Verbosité des toasts
    toastVerbosity: 'alert' | 'always';
    // 'alert'  = Uniquement warnings/fallbacks
    // 'always' = Bilan après chaque multi-turn terminé
    
    // Outils natifs Pollinations (image/video)
    enablePaidTools: boolean;  // Défaut: false (sécurité budget)
    
    // Cache du profil utilisateur
    cachedProfile?: {
        tier: string;
        tierLimit: number;
        nextResetAt: string;
        lastFetch: number;
    };
}

// === VALEURS PAR DÉFAUT ===

const DEFAULT_CONFIG: PollinationsConfigV4 = {
    mode: 'manual',
    fallbackModels: {
        main: 'mistral',
        agent: 'openai-fast'
    },
    thresholds: {
        tier: 10,
        wallet: 5
    },
    toastVerbosity: 'alert',
    enablePaidTools: false
};

// === FONCTIONS DE GESTION ===

export function loadConfig(): PollinationsConfigV4 {
    // Même logique de hiérarchie que V3 (auth.json > opencode.json > config custom)
    // + Merge avec DEFAULT_CONFIG
    
    // ... (code existant pour charger apiKey) ...
    
    // Charger les options custom
    let customConfig: Partial<PollinationsConfigV4> = {};
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            customConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        }
    } catch (e) {
        // Ignorer
    }
    
    return {
        ...DEFAULT_CONFIG,
        ...customConfig,
        apiKey: /* apiKey from auth hierarchy */
    };
}

export function saveConfig(updates: Partial<PollinationsConfigV4>): PollinationsConfigV4 {
    const current = loadConfig();
    const updated = { ...current, ...updates };
    
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return updated;
}
7.3 Système de Quota (quota.ts) - NOUVEAU
TypeScript

// src/server/quota.ts - NOUVEAU FICHIER V4

import * as fs from 'fs';
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
    // ... autres champs
}

interface ResetInfo {
    nextReset: Date;
    lastReset: Date;
    timeUntilReset: number;
    tierLimit: number;
}

interface QuotaStatus {
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
    spore:  { pollen: 1,  emoji: '🦠' },
    seed:   { pollen: 3,  emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

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
        // Fetch parallèle
        const [profileRes, balanceRes, usageRes] = await Promise.all([
            fetchAPI<Profile>('/account/profile', config.apiKey),
            fetchAPI<{ balance: number }>('/account/balance', config.apiKey),
            fetchAPI<{ usage: DetailedUsageEntry[] }>('/account/usage', config.apiKey)
        ]);
        
        const profile = profileRes;
        const balance = balanceRes.balance;
        const usage = usageRes.usage || [];
        
        const tierInfo = TIER_LIMITS[profile.tier] || { pollen: 3, emoji: '❓' };
        const tierLimit = tierInfo.pollen;
        
        // Calculer le reset
        const resetInfo = calculateResetInfo(profile.nextResetAt);
        
        // Calculer l'usage de la période actuelle
        const { tierUsed, packUsed } = calculateCurrentPeriodUsage(usage, resetInfo);
        
        const tierRemaining = Math.max(0, tierLimit - tierUsed);
        const walletBalance = Math.max(0, balance - tierRemaining);
        
        cachedQuota = {
            tierRemaining,
            tierUsed,
            tierLimit,
            walletBalance,
            nextResetAt: resetInfo.nextReset,
            timeUntilReset: resetInfo.timeUntilReset,
            canUseEnterprise: tierRemaining > 0 || walletBalance > 0,
            isUsingWallet: tierRemaining === 0 && walletBalance > 0,
            needsAlert: (tierRemaining / tierLimit * 100) <= config.thresholds.tier,
            tier: profile.tier,
            tierEmoji: tierInfo.emoji
        };
        
        lastQuotaFetch = now;
        return cachedQuota;
        
    } catch (e) {
        logQuota(`Error fetching quota: ${e}`);
        // Retourner le cache ou un état par défaut
        return cachedQuota || {
            tierRemaining: 0,
            tierUsed: 0,
            tierLimit: 3,
            walletBalance: 0,
            nextResetAt: new Date(),
            timeUntilReset: 0,
            canUseEnterprise: false,
            isUsingWallet: false,
            needsAlert: true,
            tier: 'unknown',
            tierEmoji: '❓'
        };
    }
}

// === HELPERS ===

async function fetchAPI<T>(endpoint: string, apiKey: string): Promise<T> {
    const response = await fetch(`https://gen.pollinations.ai${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'opencode-pollinations-plugin/4.0.0'
        }
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
}

function calculateResetInfo(nextResetAt: string): ResetInfo {
    // ... (code copié de pollinations-usage) ...
}

function calculateCurrentPeriodUsage(
    usage: DetailedUsageEntry[], 
    resetInfo: ResetInfo
): { tierUsed: number; packUsed: number } {
    // ... (code copié de pollinations-usage) ...
}

function logQuota(msg: string) {
    try {
        fs.appendFileSync('/tmp/pollinations-quota.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {}
}

// === EXPORT POUR LES ALERTES ===

export function formatQuotaForToast(quota: QuotaStatus): string {
    const tierPercent = quota.tierLimit > 0 
        ? Math.round((quota.tierRemaining / quota.tierLimit) * 100) 
        : 0;
    
    const resetIn = formatDuration(quota.timeUntilReset);
    
    return `${quota.tierEmoji} Tier: ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} (${tierPercent}%) | 💎 Wallet: $${quota.walletBalance.toFixed(2)} | ⏰ Reset: ${resetIn}`;
}

function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes}m`;
}
7.4 Système de Routing par Mode (router.ts) - NOUVEAU
TypeScript

// src/server/router.ts - NOUVEAU FICHIER V4

import { loadConfig, PollinationsConfigV4 } from './config.js';
import { getQuotaStatus, QuotaStatus } from './quota.js';
import { emitToast } from './toast.js';

// === INTERFACES ===

interface RoutingDecision {
    targetUrl: string;
    actualModel: string;
    authHeader?: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
}

// === MAIN ROUTER ===

export async function resolveRouting(
    requestedModel: string,
    isAgent: boolean = false
): Promise<RoutingDecision> {
    const config = loadConfig();
    
    const isEnterprise = requestedModel.startsWith('pollinations/enter/');
    const isFree = requestedModel.startsWith('pollinations/free/');
    const baseModel = requestedModel.replace(/^pollinations\/(enter|free)\//, '');
    
    // === MODE MANUAL ===
    // Route exactement comme demandé, pas de magie
    if (config.mode === 'manual') {
        if (isEnterprise && config.apiKey) {
            return {
                targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                actualModel: baseModel,
                authHeader: `Bearer ${config.apiKey}`,
                fallbackUsed: false
            };
        }
        // Free ou pas de clé
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: isFree ? baseModel : baseModel, // Keep as-is
            authHeader: undefined,
            fallbackUsed: false
        };
    }
    
    // === MODES AVEC INTELLIGENCE (alwaysfree / pro) ===
    
    if (!config.apiKey) {
        // Pas de clé = toujours Free
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }
    
    // Récupérer le quota actuel
    const quota = await getQuotaStatus();
    
    // Émettre les alertes si nécessaire
    handleQuotaAlerts(quota, config);
    
    // === MODE ALWAYSFREE ===
    if (config.mode === 'alwaysfree') {
        if (isEnterprise) {
            if (quota.tierRemaining > 0) {
                // Tier disponible → Enterprise OK
                return {
                    targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                    actualModel: baseModel,
                    authHeader: `Bearer ${config.apiKey}`,
                    fallbackUsed: false
                };
            } else {
                // Tier épuisé → BLOQUER Enterprise, Fallback sur Free
                const fallbackModel = isAgent 
                    ? config.fallbackModels.agent 
                    : config.fallbackModels.main;
                
                emitToast('warning', 
                    `Quota Free épuisé 🛑 → Relai sur ${fallbackModel} gratuit 🔀`,
                    'AlwaysFree Mode'
                );
                
                return {
                    targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                    actualModel: fallbackModel,
                    authHeader: undefined,
                    fallbackUsed: true,
                    fallbackReason: 'tier_exhausted_alwaysfree'
                };
            }
        }
        // Requête Free demandée → Route normalement
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }
    
    // === MODE PRO ===
    if (config.mode === 'pro') {
        if (isEnterprise) {
            if (quota.canUseEnterprise) {
                // Tier ou Wallet disponible → Enterprise OK
                
                // Alerte si bascule sur Wallet
                if (quota.isUsingWallet) {
                    emitToast('info', 
                        `Tier épuisé → Utilisation du Wallet ($${quota.walletBalance.toFixed(2)} restant)`,
                        'Mode Pro'
                    );
                }
                
                return {
                    targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                    actualModel: baseModel,
                    authHeader: `Bearer ${config.apiKey}`,
                    fallbackUsed: false
                };
            } else {
                // Tier ET Wallet épuisés → Fallback sur Free
                const fallbackModel = isAgent 
                    ? config.fallbackModels.agent 
                    : config.fallbackModels.main;
                
                emitToast('error', 
                    `💸 Wallet épuisé ! Fallback sur ${fallbackModel} gratuit`,
                    'Mode Pro - Fallback'
                );
                
                return {
                    targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                    actualModel: fallbackModel,
                    authHeader: undefined,
                    fallbackUsed: true,
                    fallbackReason: 'wallet_exhausted'
                };
            }
        }
        // Requête Free → Route normalement
        return {
            targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
            actualModel: baseModel,
            authHeader: undefined,
            fallbackUsed: false
        };
    }
    
    // Fallback par défaut (ne devrait pas arriver)
    return {
        targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
        actualModel: baseModel,
        authHeader: undefined,
        fallbackUsed: false
    };
}

// === GESTION DES ALERTES ===

function handleQuotaAlerts(quota: QuotaStatus, config: PollinationsConfigV4) {
    // Alerte Tier
    if (quota.needsAlert && quota.tierLimit > 0) {
        const tierPercent = Math.round((quota.tierRemaining / quota.tierLimit) * 100);
        emitToast('warning', 
            `⚠️ Quota Tier à ${tierPercent}% (${quota.tierRemaining.toFixed(2)}/${quota.tierLimit})`,
            'Alerte Quota'
        );
    }
    
    // Alerte Wallet (uniquement si tier épuisé et mode pro)
    if (config.mode === 'pro' && quota.isUsingWallet) {
        const walletThreshold = config.thresholds.wallet;
        if (quota.walletBalance <= walletThreshold) {
            emitToast('warning', 
                `⚠️ Wallet bas: $${quota.walletBalance.toFixed(2)} restant`,
                'Alerte Wallet'
            );
        }
    }
}
7.5 Système de Toast (toast.ts) - NOUVEAU
TypeScript

// src/server/toast.ts - NOUVEAU FICHIER V4

import * as fs from 'fs';

// === INTERFACES ===

interface ToastMessage {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: number;
    displayed: boolean;
}

// === QUEUE GLOBALE ===

const toastQueue: ToastMessage[] = [];

// === FONCTIONS PUBLIQUES ===

export function emitToast(
    type: ToastMessage['type'], 
    message: string, 
    title?: string
) {
    const toast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: title || getDefaultTitle(type),
        message,
        timestamp: Date.now(),
        displayed: false
    };
    
    toastQueue.push(toast);
    logToast(toast);
    
    // Limiter la queue à 20 messages
    while (toastQueue.length > 20) {
        toastQueue.shift();
    }
}

export function getPendingToasts(): ToastMessage[] {
    return toastQueue.filter(t => !t.displayed);
}

export function markToastDisplayed(id: string) {
    const toast = toastQueue.find(t => t.id === id);
    if (toast) toast.displayed = true;
}

export function clearToasts() {
    toastQueue.length = 0;
}

// === HELPERS ===

function getDefaultTitle(type: ToastMessage['type']): string {
    switch (type) {
        case 'info':    return '🌸 Pollinations';
        case 'warning': return '⚠️ Attention';
        case 'error':   return '❌ Erreur';
        case 'success': return '✅ Succès';
    }
}

function logToast(toast: ToastMessage) {
    try {
        const logLine = `[${new Date(toast.timestamp).toISOString()}] [${toast.type.toUpperCase()}] ${toast.title}: ${toast.message}`;
        fs.appendFileSync('/tmp/pollinations-toasts.log', logLine + '\n');
    } catch (e) {}
}

// === INTEGRATION OPENCODE ===
// Ces hooks sont utilisés dans index.ts

export function createToastHooks() {
    return {
        // Hook appelé quand une session devient idle (fin de multi-turn)
        'session.idle': async ({ event }: any) => {
            const config = await import('./config.js').then(m => m.loadConfig());
            
            // Afficher les toasts en attente
            const pending = getPendingToasts();
            for (const toast of pending) {
                // Ici on utiliserait l'API OpenCode pour afficher
                // Pour l'instant on log
                console.log(`[TOAST] ${toast.title}: ${toast.message}`);
                markToastDisplayed(toast.id);
            }
            
            // Si verbosity = 'always', afficher le bilan
            if (config.toastVerbosity === 'always') {
                const { getQuotaStatus, formatQuotaForToast } = await import('./quota.js');
                const quota = await getQuotaStatus(true); // Force refresh
                console.log(`[BILAN] ${formatQuotaForToast(quota)}`);
            }
        }
    };
}
7.6 Commandes CLI (commands.ts) - NOUVEAU
TypeScript

// src/server/commands.ts - NOUVEAU FICHIER V4

import { loadConfig, saveConfig, PollinationsConfigV4 } from './config.js';
import { getQuotaStatus, formatQuotaForToast } from './quota.js';
import { emitToast } from './toast.js';

// === INTERFACE ===

interface CommandResult {
    handled: boolean;
    response?: string;
    error?: string;
}

// === COMMAND HANDLER ===

export async function handleCommand(command: string): Promise<CommandResult> {
    const parts = command.trim().split(/\s+/);
    
    // Commande doit commencer par /pollinations
    if (parts[0] !== '/pollinations' && parts[0] !== '/poll') {
        return { handled: false };
    }
    
    const subCommand = parts[1];
    const args = parts.slice(2);
    
    switch (subCommand) {
        case 'mode':
            return handleModeCommand(args);
            
        case 'usage':
            return await handleUsageCommand(args);
            
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
    
    saveConfig({ mode: mode as PollinationsConfigV4['mode'] });
    emitToast('success', `Mode changé: ${mode}`);
    
    return {
        handled: true,
        response: `✅ Mode changé: ${mode}`
    };
}

async function handleUsageCommand(args: string[]): Promise<CommandResult> {
    const format = args[0] || 'compact';
    
    try {
        const quota = await getQuotaStatus(true); // Force refresh
        
        if (format === 'compact') {
            return {
                handled: true,
                response: formatQuotaForToast(quota)
            };
        }
        
        // Format détaillé
        const config = loadConfig();
        const resetDate = quota.nextResetAt.toLocaleString('fr-FR');
        
        const detailed = `
╔═══════════════════════════════════════════════════════════════╗
║               🌸 POLLINATIONS USAGE REPORT                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Mode:          ${config.mode.padEnd(45)}║
║  Tier:          ${quota.tierEmoji} ${quota.tier.padEnd(43)}║
╠═══════════════════════════════════════════════════════════════╣
║  Quota Free:    ${quota.tierRemaining.toFixed(2)}/${quota.tierLimit} pollen${' '.repeat(35)}║
║  Wallet:        $${quota.walletBalance.toFixed(2)}${' '.repeat(45)}║
║  Reset:         ${resetDate.padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
        `.trim();
        
        return {
            handled: true,
            response: detailed
        };
        
    } catch (e) {
        return {
            handled: true,
            error: `Erreur récupération usage: ${e}`
        };
    }
}

function handleFallbackCommand(args: string[]): CommandResult {
    const [main, agent] = args;
    
    if (!main) {
        const config = loadConfig();
        return {
            handled: true,
            response: `Fallback actuel: main=${config.fallbackModels.main}, agent=${config.fallbackModels.agent}`
        };
    }
    
    saveConfig({
        fallbackModels: {
            main: main,
            agent: agent || main
        }
    });
    
    return {
        handled: true,
        response: `✅ Fallback configuré: main=${main}, agent=${agent || main}`
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
    
    // Setter
    if (key === 'toast_verbosity' && value) {
        if (!['alert', 'always'].includes(value)) {
            return { handled: true, error: 'Valeurs: alert, always' };
        }
        saveConfig({ toastVerbosity: value as 'alert' | 'always' });
        return { handled: true, response: `✅ toast_verbosity = ${value}` };
    }
    
    if (key === 'threshold_tier' && value) {
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            return { handled: true, error: 'Valeur entre 0 et 100' };
        }
        const config = loadConfig();
        saveConfig({ thresholds: { ...config.thresholds, tier: threshold } });
        return { handled: true, response: `✅ threshold_tier = ${threshold}%` };
    }
    
    if (key === 'enable_paid_tools' && value) {
        const enabled = value === 'true';
        saveConfig({ enablePaidTools: enabled });
        return { handled: true, response: `✅ enable_paid_tools = ${enabled}` };
    }
    
    return {
        handled: true,
        error: `Clé inconnue: ${key}`
    };
}

function handleHelpCommand(): CommandResult {
    const help = `
🌸 Pollinations Plugin - Commandes

/pollinations mode [manual|alwaysfree|pro]
    Affiche ou change le mode de fonctionnement

/pollinations usage [compact|full]
    Affiche l'usage actuel (quota, wallet, reset)

/pollinations fallback <main> [agent]
    Configure les modèles de fallback

/pollinations config [key] [value]
    Affiche ou modifie la configuration
    Clés: toast_verbosity, threshold_tier, enable_paid_tools

/pollinations help
    Affiche cette aide
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
7.7 Index Principal V4 (index.ts) - REFACTORISÉ
TypeScript

// src/index.ts - VERSION V4

import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as fs from 'fs';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks } from './server/toast.js';
import { createCommandHooks } from './server/commands.js';

const LOG_FILE = '/tmp/opencode_pollinations_v4.log';

function log(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {}
}

// === PROXY SERVER ===

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const PORT = parseInt(process.env.POLLINATIONS_PORT || '10001', 10);
        
        const server = http.createServer(async (req, res) => {
            log(`[Proxy] ${req.method} ${req.url}`);

            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            // Health Check
            if (req.method === 'GET' && req.url === '/health') {
                const config = loadConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: "ok",
                    version: "v4.0.0",
                    mode: config.mode,
                    hasKey: !!config.apiKey
                }));
                return;
            }

            // Chat Completions
            if (req.method === 'POST' && req.url === '/v1/chat/completions') {
                const chunks: any[] = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', async () => {
                    try {
                        const bodyRaw = Buffer.concat(chunks).toString();
                        await handleChatCompletion(req, res, bodyRaw);
                    } catch (e) {
                        log(`Error: ${e}`);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: String(e) }));
                    }
                });
                return;
            }

            res.writeHead(404);
            res.end("Not Found");
        });

        server.listen(PORT, '127.0.0.1', () => {
            log(`[Proxy] Started V4 on port ${PORT}`);
            resolve(PORT);
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                log(`[Proxy] Port ${PORT} in use, reusing`);
                resolve(PORT);
            } else {
                log(`[Proxy] Error: ${e}`);
                resolve(0);
            }
        });
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    log("Plugin Initializing V4...");
    
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}`;

    // Merge des hooks
    const toastHooks = createToastHooks();
    const commandHooks = createCommandHooks();

    return {
        // Hook de configuration des modèles
        async config(config) {
            log("[Hook] config() called");
            
            const pluginConfig = loadConfig();
            const modelsArray = await generatePollinationsConfig();

            const modelsObj: any = {};
            for (const m of modelsArray) {
                modelsObj[m.id] = m;
            }

            if (!config.provider) config.provider = {};
            
            config.provider['pollinations_enter'] = {
                id: 'pollinations',
                name: 'Pollinations V4',
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models`);
        },
        
        // Hooks de toasts
        ...toastHooks,
        
        // Hooks de commandes
        ...commandHooks,
        
        // Hook d'événements génériques
        event: async ({ event }) => {
            // Log des événements pour debug
            if (event.type === 'session.idle') {
                log(`[Event] Session idle`);
            }
        }
    };
};

export default PollinationsPlugin;
7.8 Tableau récapitulatif des modes
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPORTEMENT PAR MODE                                │
├─────────────┬───────────────────┬───────────────────┬───────────────────────┤
│             │     MANUAL        │    ALWAYSFREE     │        PRO            │
├─────────────┼───────────────────┼───────────────────┼───────────────────────┤
│ Tier > 0    │ Route Enterprise  │ Route Enterprise  │ Route Enterprise      │
├─────────────┼───────────────────┼───────────────────┼───────────────────────┤
│ Tier = 0    │ Route Enterprise  │ ⚠️ FALLBACK FREE  │ Route Enterprise      │
│ Wallet > 0  │ (erreur possible) │ (protège wallet)  │ + Toast "Using Wallet"│
├─────────────┼───────────────────┼───────────────────┼───────────────────────┤
│ Tier = 0    │ Route Enterprise  │ ⚠️ FALLBACK FREE  │ ⚠️ FALLBACK FREE      │
│ Wallet = 0  │ (erreur 402)      │                   │ + Toast "Wallet Empty"│
├─────────────┼───────────────────┼───────────────────┼───────────────────────┤
│ Fallback    │ ❌ Jamais         │ ✅ Automatique    │ ✅ Automatique        │
├─────────────┼───────────────────┼───────────────────┼───────────────────────┤
│ Consomme    │ ❌ Sans limite    │ ❌ Tier ONLY      │ ✅ Tier puis Wallet   │
│ Wallet?     │                   │                   │                       │
└─────────────┴───────────────────┴───────────────────┴───────────────────────┘
8. Tests de non-régression
8.1 Script de test V4
Bash

#!/bin/bash
# test-regression-v4.sh

set -e

OPENCODE_DIR="$HOME/Bureau/oracle/opencode"
LOG_FILE="/tmp/pollinations-regression-v4.log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "🧪 Tests de non-régression V4" | tee "$LOG_FILE"
echo "==============================" | tee -a "$LOG_FILE"

cd "$OPENCODE_DIR" || exit 1

test_model() {
    local model="$1"
    local prompt="$2"
    local description="$3"
    
    echo -e "\n${CYAN}Testing:${NC} $model" | tee -a "$LOG_FILE"
    echo -e "  ${YELLOW}Prompt:${NC} $prompt" | tee -a "$LOG_FILE"
    
    local output
    output=$(timeout 120s opencode run "$prompt" -m "$model" 2>&1) || true
    
    if echo "$output" | grep -qi "error\|failed\|exception\|401\|402\|403"; then
        echo -e "  ${RED}❌ FAIL${NC}" | tee -a "$LOG_FILE"
        echo "  Output: ${output:0:200}..." | tee -a "$LOG_FILE"
        return 1
    elif [ -n "$output" ]; then
        echo -e "  ${GREEN}✅ PASS${NC}" | tee -a "$LOG_FILE"
        return 0
    else
        echo -e "  ${RED}❌ FAIL (empty)${NC}" | tee -a "$LOG_FILE"
        return 1
    fi
}

PASSED=0
FAILED=0

echo -e "\n${CYAN}=== ENTERPRISE MODELS ===${NC}"

# Gemini Enter (Multi-turn)
test_model "pollinations/enter/gemini" "météo à paris" "Multi-turn" && ((PASSED++)) || ((FAILED++))
test_model "pollinations/enter/gemini-fast" "météo à paris" "Multi-turn" && ((PASSED++)) || ((FAILED++))

# Autres modèles Enter
test_model "pollinations/enter/openai" "salut" "Simple" && ((PASSED++)) || ((FAILED++))
test_model "pollinations/enter/glm" "salut" "Simple" && ((PASSED++)) || ((FAILED++))
test_model "pollinations/enter/claude-fast" "salut" "Simple" && ((PASSED++)) || ((FAILED++))

echo -e "\n${CYAN}=== FREE MODELS ===${NC}"

test_model "pollinations/free/gemini" "météo à paris" "Multi-turn" && ((PASSED++)) || ((FAILED++))
test_model "pollinations/free/openai-fast" "salut" "Simple" && ((PASSED++)) || ((FAILED++))

echo -e "\n=============================="
echo -e "Passed: ${GREEN}$PASSED${NC} | Failed: ${RED}$FAILED${NC}"

[ $FAILED -eq 0 ] && exit 0 || exit 1
8.2 Tests des nouvelles fonctionnalités V4
Bash

# Test des commandes
opencode run "/pollinations help"
opencode run "/pollinations mode"
opencode run "/pollinations usage compact"
opencode run "/pollinations usage full"

# Test changement de mode
opencode run "/pollinations mode alwaysfree"
opencode run "/pollinations mode pro"
opencode run "/pollinations mode manual"

# Test configuration
opencode run "/pollinations config"
opencode run "/pollinations fallback mistral openai-fast"
9. Roadmap V5
9.1 Fonctionnalités planifiées
Feature	Description	Priorité
Native Tool Integration	Support image_generation et video_generation avec prévisualisation inline	🔴 High
Cost Analysis	Graphiques ASCII de consommation dans le terminal	🟡 Medium
Model Fine-tuning	Interface pour ajuster TopP, Temperature par modèle	🟢 Low
Session Cost Tracking	Coût cumulé par session affiché en temps réel	🟡 Medium
Budget Limits	Limites de dépense configurables par jour/semaine	🔴 High
9.2 Améliorations techniques
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROADMAP TECHNIQUE V5                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. REFACTORING                                                              │
│     ├── Supprimer provider.ts et provider_v1.ts (code mort)                  │
│     ├── Unifier les logs dans un seul fichier configurable                  │
│     └── Ajouter des tests unitaires (Vitest/Jest)                           │
│                                                                              │
│  2. PERFORMANCE                                                              │
│     ├── Cache des modèles avec invalidation intelligente                    │
│     ├── Connection pooling pour les requêtes upstream                       │
│     └── Streaming optimisé (backpressure handling)                          │
│                                                                              │
│  3. OBSERVABILITÉ                                                           │
│     ├── Métriques Prometheus pour monitoring                                │
│     ├── Tracing des requêtes (request ID propagation)                       │
│     └── Dashboard web local optionnel                                       │
│                                                                              │
│  4. SÉCURITÉ                                                                │
│     ├── Rotation automatique des clés API                                   │
│     ├── Chiffrement du fichier de configuration                             │
│     └── Rate limiting local anti-abus                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
Annexe C: Mapping Complet des Modèles Pollinations
(Extrait de pollinations-usage pour référence)

TypeScript

const MODEL_PRICING: Record<string, { unit: string; perPollen: number; category: string; provider: string }> = {
    // === TEXT ===
    'nova-fast':          { unit: 'response', perPollen: 50000,  category: 'text', provider: 'Amazon' },
    'nova-micro':         { unit: 'response', perPollen: 100000, category: 'text', provider: 'Amazon' },
    'gemini-fast':        { unit: 'response', perPollen: 3600,   category: 'text', provider: 'Google' },
    'gemini':             { unit: 'response', perPollen: 150,    category: 'text', provider: 'Google' },
    'gemini-large':       { unit: 'response', perPollen: 25,     category: 'text', provider: 'Google' },
    'mistral':            { unit: 'response', perPollen: 3200,   category: 'text', provider: 'Mistral' },
    'qwen-coder':         { unit: 'response', perPollen: 1400,   category: 'text', provider: 'Alibaba' },
    'grok':               { unit: 'response', perPollen: 900,    category: 'text', provider: 'xAI' },
    'openai':             { unit: 'response', perPollen: 800,    category: 'text', provider: 'OpenAI' },
    'openai-fast':        { unit: 'response', perPollen: 650,    category: 'text', provider: 'OpenAI' },
    'openai-large':       { unit: 'response', perPollen: 100,    category: 'text', provider: 'OpenAI' },
    'deepseek':           { unit: 'response', perPollen: 300,    category: 'text', provider: 'DeepSeek' },
    'kimi':               { unit: 'response', perPollen: 100,    category: 'text', provider: 'Moonshot' },
    'minimax':            { unit: 'response', perPollen: 45,     category: 'text', provider: 'MiniMax' },
    'glm':                { unit: 'response', perPollen: 50,     category: 'text', provider: 'Zhipu' },
    'claude-fast':        { unit: 'response', perPollen: 55,     category: 'text', provider: 'Anthropic (Haiku)' },
    'claude':             { unit: 'response', perPollen: 25,     category: 'text', provider: 'Anthropic (Sonnet)' },
    'claude-large':       { unit: 'response', perPollen: 15,     category: 'text', provider: 'Anthropic (Opus)' },
    'perplexity-fast':    { unit: 'response', perPollen: 750,    category: 'text', provider: 'Perplexity' },
    'perplexity-reasoning': { unit: 'response', perPollen: 150,  category: 'text', provider: 'Perplexity' },
    
    // === IMAGE ===
    'flux':               { unit: 'image', perPollen: 5000,  category: 'image', provider: 'Black Forest Labs' },
    'turbo':              { unit: 'image', perPollen: 3300,  category: 'image', provider: 'SDXL' },
    'gptimage':           { unit: 'image', perPollen: 75,    category: 'image', provider: 'DALL-E 3' },
    'gptimage-large':     { unit: 'image', perPollen: 15,    category: 'image', provider: 'DALL-E 3 HD' },
    
    // === VIDEO ===
    'seedance':           { unit: 'video', perPollen: 6,  category: 'video', provider: 'Seedance' },
    'veo':                { unit: 'video', perPollen: 1,  category: 'video', provider: 'Google Veo 3' },
};
Cette documentation complète devrait vous permettre de développer la V4 sans régression, en réutilisant la logique éprouvée du script pollinations-usage pour la gestion des quotas.
