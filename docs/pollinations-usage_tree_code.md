# Documentation du projet: pollinations-usage

> Généré le 25/01/2026 21:49:16

## 📂 Structure du projet

```
└── pollinations-usage
    ├── index.ts
    ├── infos_submit.txt
    └── package.json
```

## 📝 Contenu des fichiers

### 📄 `index.ts`

```typescript
#!/usr/bin/env npx ts-node

import https from 'https';

// ================================
// CONFIGURATION
// ================================
const API_KEY = process.env.POLLINATIONS_API_KEY || '';
const BASE_URL = 'https://gen.pollinations.ai';
const VERSION = '2.1.0';

const TIER_LIMITS: Record<string, { pollen: number; emoji: string; description: string }> = {
    spore: { pollen: 1, emoji: '🦠', description: 'Sign up' },
    seed: { pollen: 3, emoji: '🌱', description: '8+ dev points' },
    flower: { pollen: 10, emoji: '🌸', description: 'Publish an app' },
    nectar: { pollen: 20, emoji: '🍯', description: 'Coming soon 🔮' },
};

// Pricing des modèles (unités par pollen)
const MODEL_PRICING: Record<string, { unit: string; perPollen: number; category: string; provider: string }> = {
    // Text
    'nova-fast': { unit: 'response', perPollen: 50000, category: 'text', provider: 'Amazon' },
    'nova-micro': { unit: 'response', perPollen: 100000, category: 'text', provider: 'Amazon' },
    'gemini-fast': { unit: 'response', perPollen: 3600, category: 'text', provider: 'Google' },
    'gemini': { unit: 'response', perPollen: 150, category: 'text', provider: 'Google' },
    'gemini-large': { unit: 'response', perPollen: 25, category: 'text', provider: 'Google' },
    'mistral': { unit: 'response', perPollen: 3200, category: 'text', provider: 'Mistral' },
    'qwen-coder': { unit: 'response', perPollen: 1400, category: 'text', provider: 'Alibaba' },
    'grok': { unit: 'response', perPollen: 900, category: 'text', provider: 'xAI' },
    'openai': { unit: 'response', perPollen: 800, category: 'text', provider: 'OpenAI' },
    'openai-fast': { unit: 'response', perPollen: 650, category: 'text', provider: 'OpenAI' },
    'openai-large': { unit: 'response', perPollen: 100, category: 'text', provider: 'OpenAI' },
    'deepseek': { unit: 'response', perPollen: 300, category: 'text', provider: 'DeepSeek' },
    'kimi': { unit: 'response', perPollen: 100, category: 'text', provider: 'Moonshot' },
    'minimax': { unit: 'response', perPollen: 45, category: 'text', provider: 'MiniMax' },
    'glm': { unit: 'response', perPollen: 50, category: 'text', provider: 'Zhipu' },
    'claude-fast': { unit: 'response', perPollen: 55, category: 'text', provider: 'Anthropic (Haiku)' },
    'claude': { unit: 'response', perPollen: 25, category: 'text', provider: 'Anthropic (Sonnet)' },
    'claude-large': { unit: 'response', perPollen: 15, category: 'text', provider: 'Anthropic (Opus)' },
    'perplexity-fast': { unit: 'response', perPollen: 750, category: 'text', provider: 'Perplexity' },
    'perplexity-reasoning': { unit: 'response', perPollen: 150, category: 'text', provider: 'Perplexity' },
    // Image
    'flux': { unit: 'image', perPollen: 5000, category: 'image', provider: 'Black Forest Labs' },
    'zimage': { unit: 'image', perPollen: 5000, category: 'image', provider: 'Turbo' },
    'turbo': { unit: 'image', perPollen: 3300, category: 'image', provider: 'SDXL' },
    'klein': { unit: 'image', perPollen: 150, category: 'image', provider: 'FLUX.2 4B' },
    'gptimage': { unit: 'image', perPollen: 75, category: 'image', provider: 'DALL-E 3' },
    'gptimage-large': { unit: 'image', perPollen: 15, category: 'image', provider: 'DALL-E 3 HD' },
    'kontext': { unit: 'image', perPollen: 25, category: 'image', provider: 'FLUX.1 Kontext' },
    'seedream': { unit: 'image', perPollen: 35, category: 'image', provider: 'Seedream' },
    'seedream-pro': { unit: 'image', perPollen: 25, category: 'image', provider: 'Seedream Pro' },
    'nanobanana': { unit: 'image', perPollen: 25, category: 'image', provider: 'NanoBanana' },
    'nanobanana-pro': { unit: 'image', perPollen: 6, category: 'image', provider: 'NanoBanana Pro' },
    // Video
    'seedance-pro': { unit: 'video', perPollen: 10, category: 'video', provider: 'Seedance Pro' },
    'seedance': { unit: 'video', perPollen: 6, category: 'video', provider: 'Seedance' },
    'veo': { unit: 'video', perPollen: 1, category: 'video', provider: 'Google Veo 3' },
    'wan': { unit: 'video', perPollen: 6, category: 'video', provider: 'Wan + Audio' },
};

// ================================
// TYPES
// ================================
interface Profile {
    name: string;
    email: string;
    githubUsername: string;
    tier: string;
    createdAt: string;
    nextResetAt: string;
}

interface BalanceResponse {
    balance: number;
}

// Usage détaillé (endpoint /account/usage)
interface DetailedUsageEntry {
    timestamp: string;
    type: string;
    model: string;
    api_key: string;
    api_key_type: string;
    meter_source: 'tier' | 'pack';
    input_text_tokens: number;
    input_cached_tokens: number;
    input_audio_tokens: number;
    input_image_tokens: number;
    output_text_tokens: number;
    output_reasoning_tokens: number;
    output_audio_tokens: number;
    output_image_tokens: number;
    cost_usd: number;
    response_time_ms: number;
}

interface DetailedUsageResponse {
    usage: DetailedUsageEntry[];
    count: number;
}

// Usage agrégé par jour (endpoint /account/usage/daily)
interface DailyUsageEntry {
    date: string;
    model: string;
    meter_source: 'tier' | 'pack' | 'combined';
    requests: number;
    cost_usd: number;
    api_key_names: string[];
}

interface DailyUsageResponse {
    usage: DailyUsageEntry[];
    count: number;
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

interface CurrentPeriodStats {
    tierUsed: number;
    tierRemaining: number;
    packUsed: number;
    totalRequests: number;
    entriesCount: number;
    inputTokens: number;
    outputTokens: number;
    models: Map<string, { requests: number; cost: number; source: 'tier' | 'pack'; inputTokens: number; outputTokens: number }>;
}

interface DayData {
    total: number;
    tierUsed: number;
    packUsed: number;
    requests: number;
    models: Map<string, { requests: number; cost: number }>;
}

interface ModelStats {
    totalRequests: number;
    totalCost: number;
    tierCost: number;
    packCost: number;
    avgCostPerRequest: number;
    inputTokens: number;
    outputTokens: number;
    category: string;
}

interface CLIOptions {
    help: boolean;
    json: boolean;
    compact: boolean;
    days: number;
    models: boolean;
    balance: boolean;
    debug: boolean;
}

// ================================
// CLI PARSING
// ================================
function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    return {
        help: args.includes('--help') || args.includes('-h'),
        json: args.includes('--json'),
        compact: args.includes('--compact') || args.includes('-c'),
        days: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '15'),
        models: args.includes('--models') || args.includes('-m'),
        balance: args.includes('--balance') || args.includes('-b'),
        debug: args.includes('--debug') || args.includes('-d'),
    };
}

function showHelp(): void {
    console.log(`
    ${c.bright}${c.cyan}╔═══════════════════════════════════════════════════════════════╗${c.reset}
    ${c.bright}${c.cyan}║${c.reset}     🌸 ${c.bright}Pollinations.ai Usage Monitor v${VERSION}${c.reset}                  ${c.cyan}║${c.reset}
    ${c.bright}${c.cyan}╚═══════════════════════════════════════════════════════════════╝${c.reset}

    ${c.bright}Usage:${c.reset}
    POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts [options]

    ${c.bright}Options:${c.reset}
    ${c.cyan}-h, --help${c.reset}          Affiche cette aide
    ${c.cyan}-c, --compact${c.reset}       Affichage compact (solde + reset uniquement)
    ${c.cyan}-b, --balance${c.reset}       Affiche uniquement le solde
    ${c.cyan}-m, --models${c.reset}        Référence des modèles et pricing
    ${c.cyan}-d, --debug${c.reset}         Mode debug (données brutes)
    ${c.cyan}--json${c.reset}              Sortie en JSON (pour CI/CD)
    ${c.cyan}--days=N${c.reset}            Nombre de jours d'historique (défaut: 15)

    ${c.bright}Variables d'environnement:${c.reset}
    ${c.yellow}POLLINATIONS_API_KEY${c.reset}    Clé API (requise)

    ${c.bright}Codes de sortie:${c.reset}
    ${c.green}0${c.reset}    Succès
    ${c.red}1${c.reset}    Erreur générale
    ${c.red}2${c.reset}    Clé API manquante
    ${c.red}3${c.reset}    Erreur API (401/402/403)

    ${c.bright}Exemples:${c.reset}
    ${c.dim}# Dashboard complet${c.reset}
    POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts

    ${c.dim}# Solde compact${c.reset}
    POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts -c

    ${c.dim}# Export JSON pour CI/CD${c.reset}
    POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts --json > usage.json

    ${c.dim}# Voir les 30 derniers jours${c.reset}
    POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts --days=30

    ${c.dim}# Liste des modèles et pricing${c.reset}
    npx ts-node script.ts --models

    ${c.bright}Tiers disponibles:${c.reset}
    🦠 ${c.dim}Spore${c.reset}   - 1 pollen/jour  (Sign up)
    🌱 ${c.dim}Seed${c.reset}    - 3 pollen/jour  (8+ dev points)
    🌸 ${c.dim}Flower${c.reset}  - 10 pollen/jour (Publish an app)
    🍯 ${c.dim}Nectar${c.reset}  - 20 pollen/jour (Coming soon)
    `);
}

// ================================
// COLORS & FORMATTING
// ================================
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

const c = colors;

// Désactiver les couleurs si pas de TTY ou si --json
const noColor = !process.stdout.isTTY || process.argv.includes('--json');
if (noColor) {
    Object.keys(colors).forEach(key => {
        (colors as any)[key] = '';
    });
}

function formatPollen(amount: number, decimals: number = 2): string {
    return `${amount.toFixed(decimals)} 🌼`;
}

function formatUSD(amount: number): string {
    return `$${amount.toFixed(4)}`;
}

function formatNumber(num: number): string {
    return num.toLocaleString('fr-FR');
}

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function bar(value: number, max: number, width: number = 30, showPercent: boolean = true): string {
    const ratio = max > 0 ? Math.min(value / max, 2) : 0;
    const filled = Math.round(ratio * width);
    const percentage = max > 0 ? (value / max * 100).toFixed(1) : '0.0';

    let color = c.green;
    if (ratio > 1) color = c.red;
    else if (ratio > 0.8) color = c.yellow;
    else if (ratio > 0.5) color = c.cyan;

    const filledBar = '█'.repeat(Math.min(filled, width));
    const emptyBar = '░'.repeat(Math.max(0, width - filled));
    const overflow = filled > width ? `${c.bgRed}${'█'.repeat(Math.min(filled - width, 10))}${c.reset}` : '';

    const percentStr = showPercent ? ` ${percentage}%` : '';
    return `${color}${filledBar}${c.dim}${emptyBar}${c.reset}${overflow}${percentStr}`;
}

function sparkline(values: number[]): string {
    if (values.length === 0) return '';
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values.map(v => {
        const index = Math.floor(((v - min) / range) * (chars.length - 1));
        return chars[index];
    }).join('');
}

function printHeader(text: string): void {
    console.log();
    console.log(`${c.bright}${c.cyan}${'═'.repeat(65)}${c.reset}`);
    console.log(`${c.bright}${c.cyan}  ${text}${c.reset}`);
    console.log(`${c.bright}${c.cyan}${'═'.repeat(65)}${c.reset}`);
}

function printSubHeader(text: string): void {
    console.log();
    console.log(`${c.bright}${c.yellow}── ${text} ${'─'.repeat(Math.max(0, 55 - text.length))}${c.reset}`);
}

function printBox(lines: string[], title?: string): void {
    const width = 63;
    console.log();
    console.log(`${c.cyan}┌${'─'.repeat(width)}┐${c.reset}`);
    if (title) {
        console.log(`${c.cyan}│${c.reset} ${c.bright}${title.padEnd(width - 2)}${c.reset} ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├${'─'.repeat(width)}┤${c.reset}`);
    }
    for (const line of lines) {
        const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
        const padding = Math.max(0, width - 2 - visibleLength);
        console.log(`${c.cyan}│${c.reset} ${line}${' '.repeat(padding)} ${c.cyan}│${c.reset}`);
    }
    console.log(`${c.cyan}└${'─'.repeat(width)}┘${c.reset}`);
}

// ================================
// API CALLS
// ================================
interface FetchResult<T> {
    data?: T;
    error?: string;
    statusCode?: number;
}

function fetchAPI<T>(endpoint: string): Promise<FetchResult<T>> {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${endpoint}`;
        const options = {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'User-Agent': `pollinations-monitor/${VERSION}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);

                    if (res.statusCode && res.statusCode >= 400) {
                        resolve({
                            error: parsed.error || parsed.message || `HTTP ${res.statusCode}`,
                            statusCode: res.statusCode
                        });
                        return;
                    }

                    resolve({ data: parsed, statusCode: res.statusCode });
                } catch (e) {
                    resolve({
                        error: `Parse error: ${e}`,
                        statusCode: res.statusCode
                    });
                }
            });
        }).on('error', (err) => {
            resolve({ error: err.message });
        });
    });
}

function handleAPIError(result: FetchResult<any>, context: string): never | void {
    if (result.error) {
        const errorMessages: Record<number, string> = {
            400: 'Requête invalide',
            401: 'Clé API invalide ou expirée',
            402: 'Solde Pollen insuffisant',
            403: 'Permission refusée pour cet endpoint',
            500: 'Erreur serveur Pollinations'
        };

        const message = errorMessages[result.statusCode || 0] || result.error;
        console.error(`\n${c.red}✖ Erreur ${context}:${c.reset} ${message}`);

        if (result.statusCode === 401) {
            console.error(`${c.dim}  Vérifiez votre POLLINATIONS_API_KEY${c.reset}`);
        }
        if (result.statusCode === 402) {
            console.error(`${c.dim}  Rechargez votre compte sur https://pollinations.ai${c.reset}`);
        }

        process.exit(3);
    }
}

// ================================
// RESET TIME CALCULATION
// ================================
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
        nextReset = new Date(todayResetUTC.getTime() + 24 * 60 * 60 * 1000);
    } else {
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

// ================================
// PARSE TIMESTAMP FROM USAGE API
// ================================
function parseUsageTimestamp(timestamp: string): Date {
    // Format: "2026-01-23 01:11:21" (UTC)
    const isoString = timestamp.replace(' ', 'T') + 'Z';
    return new Date(isoString);
}

// ================================
// CALCULATE CURRENT PERIOD USAGE (PRÉCIS!)
// ================================
function calculateCurrentPeriodStats(
    usage: DetailedUsageEntry[],
    resetInfo: ResetInfo,
    tierLimit: number
): CurrentPeriodStats {
    let tierUsed = 0;
    let packUsed = 0;
    let totalRequests = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const models = new Map<string, { requests: number; cost: number; source: 'tier' | 'pack'; inputTokens: number; outputTokens: number }>();

    const entriesAfterReset = usage.filter(entry => {
        const entryTime = parseUsageTimestamp(entry.timestamp);
        return entryTime >= resetInfo.lastReset;
    });

    for (const entry of entriesAfterReset) {
        totalRequests++;
        inputTokens += entry.input_text_tokens + entry.input_cached_tokens + entry.input_audio_tokens + entry.input_image_tokens;
        outputTokens += entry.output_text_tokens + entry.output_reasoning_tokens + entry.output_audio_tokens + entry.output_image_tokens;

        if (entry.meter_source === 'tier') {
            tierUsed += entry.cost_usd;
        } else if (entry.meter_source === 'pack') {
            packUsed += entry.cost_usd;
        }

        // Normaliser le nom du modèle
        const modelName = normalizeModelName(entry.model);
        const existing = models.get(modelName) || { requests: 0, cost: 0, source: entry.meter_source, inputTokens: 0, outputTokens: 0 };
        existing.requests++;
        existing.cost += entry.cost_usd;
        existing.inputTokens += entry.input_text_tokens + entry.input_cached_tokens;
        existing.outputTokens += entry.output_text_tokens + entry.output_reasoning_tokens;
        models.set(modelName, existing);
    }

    return {
        tierUsed,
        tierRemaining: Math.max(0, tierLimit - tierUsed),
        packUsed,
        totalRequests,
        entriesCount: entriesAfterReset.length,
        inputTokens,
        outputTokens,
        models
    };
}

function normalizeModelName(model: string): string {
    // Extraire le nom simple du modèle depuis les noms complets
    const mappings: Record<string, string> = {
        'accounts/fireworks/models/minimax-m2p1': 'minimax',
        'accounts/fireworks/models/glm-4p7': 'glm',
        'accounts/fireworks/models/deepseek-v3p2': 'deepseek',
        'moonshotai/kimi-k2-thinking-maas': 'kimi',
        'Qwen3-Coder-30B-A3B-Instruct': 'qwen-coder',
        'gemini-3-pro-preview': 'gemini-large',
        'gemini-3-flash-preview': 'gemini',
        'us.anthropic.claude-sonnet-4-5-20250929-v1:0': 'claude',
        'global.anthropic.claude-opus-4-5-20251101-v1:0': 'claude-large',
        'grok-4-fast-non-reasoning': 'grok',
        'gpt-5.2-2025-12-11': 'openai-large',
        'gpt-5-nano-2025-08-07': 'openai-fast',
        'gpt-5-mini-2025-08-07': 'openai',
        'mistral-small-3.2-24b-instruct-2506': 'mistral',
    };

    return mappings[model] || model.split('/').pop()?.replace(/-preview$/, '') || model;
}

// ================================
// ANALYZE DAILY USAGE
// ================================
function analyzeByDate(usage: DailyUsageEntry[]): Map<string, DayData> {
    const byDate = new Map<string, DayData>();

    for (const entry of usage) {
        if (!byDate.has(entry.date)) {
            byDate.set(entry.date, {
                total: 0,
                tierUsed: 0,
                packUsed: 0,
                requests: 0,
                models: new Map()
            });
        }

        const day = byDate.get(entry.date)!;
        day.total += entry.cost_usd;
        day.requests += entry.requests;

        if (entry.meter_source === 'tier') {
            day.tierUsed += entry.cost_usd;
        } else if (entry.meter_source === 'pack') {
            day.packUsed += entry.cost_usd;
        } else if (entry.meter_source === 'combined') {
            day.tierUsed += entry.cost_usd / 2;
            day.packUsed += entry.cost_usd / 2;
        }

        const modelData = day.models.get(entry.model) || { requests: 0, cost: 0 };
        modelData.requests += entry.requests;
        modelData.cost += entry.cost_usd;
        day.models.set(entry.model, modelData);
    }

    return byDate;
}

function analyzeByModel(usage: DailyUsageEntry[]): Map<string, ModelStats> {
    const byModel = new Map<string, ModelStats>();

    for (const entry of usage) {
        if (!byModel.has(entry.model)) {
            const pricing = MODEL_PRICING[entry.model];
            byModel.set(entry.model, {
                totalRequests: 0,
                totalCost: 0,
                tierCost: 0,
                packCost: 0,
                avgCostPerRequest: 0,
                inputTokens: 0,
                outputTokens: 0,
                category: pricing?.category || 'unknown'
            });
        }

        const model = byModel.get(entry.model)!;
        model.totalRequests += entry.requests;
        model.totalCost += entry.cost_usd;

        if (entry.meter_source === 'tier') {
            model.tierCost += entry.cost_usd;
        } else if (entry.meter_source === 'pack') {
            model.packCost += entry.cost_usd;
        } else if (entry.meter_source === 'combined') {
            model.tierCost += entry.cost_usd / 2;
            model.packCost += entry.cost_usd / 2;
        }

        model.avgCostPerRequest = model.totalCost / model.totalRequests;
    }

    return byModel;
}

function calculatePredictions(
    byDate: Map<string, DayData>,
    balance: number
): { avgDaily: number; daysRemaining: number; weeklyProjection: number } {
    const last7Days = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

    if (last7Days.length === 0) {
        return { avgDaily: 0, daysRemaining: Infinity, weeklyProjection: 0 };
    }

    const packUsageLast7 = last7Days.reduce((sum, [, d]) => sum + d.packUsed, 0);
    const avgDailyPackUsage = packUsageLast7 / last7Days.length;

    const daysRemaining = avgDailyPackUsage > 0 ? balance / avgDailyPackUsage : Infinity;
    const weeklyProjection = avgDailyPackUsage * 7;

    return {
        avgDaily: avgDailyPackUsage,
        daysRemaining,
        weeklyProjection
    };
}

// ================================
// DISPLAY FUNCTIONS
// ================================
function displayCompactBalance(
    balance: number,
    tierLimit: number,
    stats: CurrentPeriodStats,
    resetInfo: ResetInfo,
    tierEmoji: string
): void {
    const walletBalance = Math.max(0, balance - stats.tierRemaining);
    const balanceColor = walletBalance < 1 ? c.red : walletBalance < 5 ? c.yellow : c.green;
    const remainingColor = stats.tierRemaining > tierLimit * 0.5 ? c.green :
    stats.tierRemaining > 0 ? c.yellow : c.red;

    console.log(`
    ${c.bright}Pollinations.ai Status${c.reset} ${tierEmoji}
    ────────────────────────
    💎 Wallet:       ${balanceColor}${formatPollen(walletBalance)}${c.reset}
    🌼 Tier restant: ${remainingColor}${formatPollen(stats.tierRemaining)}${c.reset} / ${formatPollen(tierLimit)}
    ⏰ Reset dans:   ${formatDuration(resetInfo.timeUntilReset)}
    📊 Total:        ${formatPollen(balance)}
    `);

    if (stats.entriesCount === 0) {
        console.log(`    ${c.green}✨ Aucune utilisation depuis le reset${c.reset}`);
    } else {
        console.log(`    ${c.dim}${stats.entriesCount} requête(s) depuis le reset${c.reset}`);
    }

    if (walletBalance < 2) {
        console.log(`\n    ${c.yellow}⚠ Solde wallet bas ! Pensez à recharger${c.reset}`);
    }
}

function displayProfile(profile: Profile, tierLimit: number, resetInfo: ResetInfo): void {
    printHeader(`🌸 PROFIL POLLINATIONS`);

    const tierInfo = TIER_LIMITS[profile.tier] || { pollen: 3, emoji: '❓', description: 'Inconnu' };
    const resetTimeUTC = `${String(resetInfo.resetHour).padStart(2, '0')}:${String(resetInfo.resetMinute).padStart(2, '0')}:${String(resetInfo.resetSecond).padStart(2, '0')} UTC`;

    console.log(`
    ${c.bright}Nom:${c.reset}              ${profile.name || 'N/A'}
    ${c.bright}Email:${c.reset}            ${profile.email || 'N/A'}
    ${c.bright}GitHub:${c.reset}           ${c.cyan}@${profile.githubUsername || 'N/A'}${c.reset}
    ${c.bright}Tier:${c.reset}             ${tierInfo.emoji} ${c.bright}${profile.tier.toUpperCase()}${c.reset} (${tierLimit} pollen/jour)
    ${c.dim}                  ${tierInfo.description}${c.reset}
    ${c.bright}Créé le:${c.reset}          ${formatDateTime(new Date(profile.createdAt))}
    ${c.bright}Reset quotidien:${c.reset}  ${resetTimeUTC}
    `);
}

function displayCurrentPeriod(
    stats: CurrentPeriodStats,
    tierLimit: number,
    resetInfo: ResetInfo
): void {
    printHeader(`📊 PÉRIODE EN COURS`);

    const remainingColor = stats.tierRemaining > tierLimit * 0.5 ? c.green :
    stats.tierRemaining > 0 ? c.yellow : c.red;

    console.log(`
    ${c.dim}Depuis: ${formatDateTime(resetInfo.lastReset)}${c.reset}

    ┌─────────────────────────────────────────────────────────┐
    │  ${c.bright}Tier utilisé:${c.reset}     ${formatPollen(stats.tierUsed).padEnd(20)} / ${formatPollen(tierLimit)}      │
    │  ${bar(stats.tierUsed, tierLimit, 45)}    │
    │                                                         │
    │  ${c.bright}Crédit restant:${c.reset}   ${remainingColor}${formatPollen(stats.tierRemaining).padEnd(35)}${c.reset}  │
    │  ${c.bright}Pack utilisé:${c.reset}     ${formatPollen(stats.packUsed).padEnd(35)}  │
    │  ${c.bright}Requêtes:${c.reset}         ${String(stats.totalRequests).padEnd(35)}  │
    └─────────────────────────────────────────────────────────┘

    ${c.bright}⏰ Prochain reset:${c.reset} ${formatDateTime(resetInfo.nextReset)}
    ${c.bright}   Dans:${c.reset}           ${c.yellow}${formatDuration(resetInfo.timeUntilReset)}${c.reset}

    ${c.dim}Progression du cycle (${resetInfo.progressPercent.toFixed(0)}%):${c.reset}
    ${bar(resetInfo.progressPercent, 100, 50)}
    `);

    if (stats.tierUsed > tierLimit) {
        console.log(`    ${c.bgRed}${c.white} ⚠ DÉPASSEMENT: ${formatPollen(stats.tierUsed - tierLimit)} facturé sur votre pack ${c.reset}\n`);
    }

    if (stats.models.size > 0) {
        printSubHeader('Modèles utilisés cette période');
        console.log();
        console.log(`  ${c.dim}Modèle                    Requêtes    Coût         Source    Tokens${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(70)}${c.reset}`);

        const sortedModels = Array.from(stats.models.entries())
        .sort((a, b) => b[1].cost - a[1].cost);

        for (const [model, data] of sortedModels) {
            const sourceColor = data.source === 'tier' ? c.green : c.yellow;
            const tokenInfo = data.inputTokens > 0 || data.outputTokens > 0
            ? `${formatTokens(data.inputTokens)}→${formatTokens(data.outputTokens)}`
            : '-';
            console.log(
                `  ${model.padEnd(26)}` +
                `${String(data.requests).padEnd(12)}` +
                `${formatPollen(data.cost).padEnd(13)}` +
                `${sourceColor}${data.source.padEnd(10)}${c.reset}` +
                `${tokenInfo}`
            );
        }
    } else {
        console.log(`\n  ${c.green}✨ Aucune utilisation depuis le dernier reset${c.reset}`);
    }
}

function displayBalance(
    balance: number,
    tierLimit: number,
    stats: CurrentPeriodStats,
    predictions: ReturnType<typeof calculatePredictions>
): void {
    printSubHeader('💎 WALLET');

    const walletBalance = Math.max(0, balance - stats.tierRemaining);
    const balanceColor = walletBalance < 1 ? c.red : walletBalance < 5 ? c.yellow : c.green;

    const lines = [
        `${c.bright}Balance totale:${c.reset}   ${formatPollen(balance)}`,
        `├── ${c.bright}Wallet (packs):${c.reset} ${balanceColor}${formatPollen(walletBalance)}${c.reset}`,
        `└── ${c.bright}Tier restant:${c.reset}   ${c.green}${formatPollen(stats.tierRemaining)}${c.reset}`,
    ];

    printBox(lines, '💰 SOLDE POLLEN');

    if (predictions.avgDaily > 0) {
        console.log(`\n    ${c.bright}📈 Prédictions (basées sur 7j):${c.reset}`);
        console.log(`    ├─ Usage pack moyen:     ${formatPollen(predictions.avgDaily)}/jour`);
        console.log(`    ├─ Projection hebdo:     ${formatPollen(predictions.weeklyProjection)}`);
        if (predictions.daysRemaining < Infinity && walletBalance > 0) {
            const daysColor = predictions.daysRemaining < 7 ? c.red : predictions.daysRemaining < 14 ? c.yellow : c.green;
            console.log(`    └─ Jours restants:       ${daysColor}~${Math.floor(predictions.daysRemaining)} jours${c.reset}`);
        }
    }

    if (walletBalance < 5) {
        console.log(`\n    ${c.yellow}⚠ Solde wallet bas ! Pensez à recharger sur pollinations.ai${c.reset}`);
    }
}

function displayDailyUsage(
    byDate: Map<string, DayData>,
    tierLimit: number,
    days: number
): void {
    printHeader(`📅 HISTORIQUE (${days} derniers jours)`);

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];

    // Sparkline des 7 derniers jours
    const last7 = sortedDates.slice(0, 7).reverse();
    const last7Values = last7.map(d => byDate.get(d)?.total || 0);
    if (last7Values.length > 0) {
        console.log(`\n  ${c.dim}Tendance 7j:${c.reset} ${c.cyan}${sparkline(last7Values)}${c.reset} (min: ${formatUSD(Math.min(...last7Values))}, max: ${formatUSD(Math.max(...last7Values))})`);
    }

    console.log();
    console.log(`  ${c.dim}Date          Requêtes   Total      Tier       Pack       Limite (${tierLimit}$)${c.reset}`);
    console.log(`  ${c.dim}${'─'.repeat(75)}${c.reset}`);

    let totalOverage = 0;
    let totalSpent = 0;

    for (const date of sortedDates.slice(0, days)) {
        const day = byDate.get(date)!;
        const isToday = date === today;
        const overage = Math.max(0, day.tierUsed - tierLimit);

        totalOverage += overage;
        totalSpent += day.total;

        let dateLabel = date;
        let labelPadding = 14;
        if (isToday) {
            dateLabel = `${c.bright}${c.green}${date}${c.reset} ${c.bgGreen}NOW${c.reset}`;
            labelPadding = 30;
        }

        console.log(
            `  ${dateLabel.padEnd(labelPadding)}` +
            `${String(day.requests).padEnd(11)}` +
            `${formatUSD(day.total).padEnd(11)}` +
            `${formatUSD(day.tierUsed).padEnd(11)}` +
            `${formatUSD(day.packUsed).padEnd(11)}` +
            `${bar(day.total, tierLimit, 15)}`
        );
    }

    console.log(`  ${c.dim}${'─'.repeat(75)}${c.reset}`);

    const avgDaily = totalSpent / Math.min(sortedDates.length, days);
    console.log(`  ${c.bright}Moyenne journalière:${c.reset} ${formatUSD(avgDaily)}`);
    if (totalOverage > 0) {
        console.log(`  ${c.bright}Total dépassements:${c.reset} ${c.red}${formatUSD(totalOverage)}${c.reset}`);
    }
}

function displayModelStats(byModel: Map<string, ModelStats>): void {
    printHeader(`🤖 STATISTIQUES PAR MODÈLE`);

    const categories: Record<string, Array<[string, ModelStats]>> = {
        text: [],
        image: [],
        video: [],
        unknown: []
    };

    for (const [model, stats] of byModel.entries()) {
        const cat = stats.category || 'unknown';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push([model, stats]);
    }

    const categoryNames: Record<string, string> = {
        text: '💬 Modèles Texte',
        image: '🖼️ Modèles Image',
        video: '🎬 Modèles Vidéo',
        unknown: '❓ Autres'
    };

    for (const [category, models] of Object.entries(categories)) {
        if (models.length === 0) continue;

        const sortedModels = models.sort((a, b) => b[1].totalCost - a[1].totalCost);

        printSubHeader(categoryNames[category] || category);
        console.log();
        console.log(`  ${c.dim}Modèle                 Requêtes    Coût Total    $/Req${c.reset}`);
        console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

        let catTotal = 0;
        let catRequests = 0;

        for (const [model, data] of sortedModels) {
            catTotal += data.totalCost;
            catRequests += data.totalRequests;

            const costColor = data.avgCostPerRequest > 0.1 ? c.red :
            data.avgCostPerRequest > 0.01 ? c.yellow : c.green;

            console.log(
                `  ${model.padEnd(23)}` +
                `${formatNumber(data.totalRequests).padEnd(12)}` +
                `${formatPollen(data.totalCost).padEnd(14)}` +
                `${costColor}${formatUSD(data.avgCostPerRequest)}${c.reset}`
            );
        }

        console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);
        console.log(`  ${c.bright}Sous-total:${c.reset} ${formatNumber(catRequests)} requêtes, ${formatPollen(catTotal)}`);
    }
}

function displayTopExpensiveModels(byModel: Map<string, ModelStats>): void {
    printSubHeader('🔥 Top 5 modèles les plus coûteux par requête');

    const sorted = Array.from(byModel.entries())
    .filter(([, stats]) => stats.totalRequests >= 1)
    .sort((a, b) => b[1].avgCostPerRequest - a[1].avgCostPerRequest)
    .slice(0, 5);

    if (sorted.length === 0) {
        console.log(`\n  ${c.dim}Pas assez de données${c.reset}`);
        return;
    }

    console.log();
    const maxCost = sorted[0][1].avgCostPerRequest;

    for (const [model, data] of sorted) {
        const barWidth = Math.max(1, Math.round((data.avgCostPerRequest / maxCost) * 30));
        const costColor = data.avgCostPerRequest > 0.1 ? c.red : c.yellow;
        console.log(
            `  ${model.padEnd(22)} ${costColor}${'█'.repeat(barWidth)}${c.reset} ${formatUSD(data.avgCostPerRequest)}/req`
        );
    }
}

function displayEfficientModels(byModel: Map<string, ModelStats>): void {
    printSubHeader('💚 Top 5 modèles les plus économiques');

    const sorted = Array.from(byModel.entries())
    .filter(([, stats]) => stats.totalRequests >= 5)
    .sort((a, b) => a[1].avgCostPerRequest - b[1].avgCostPerRequest)
    .slice(0, 5);

    if (sorted.length === 0) {
        console.log(`\n  ${c.dim}Pas assez de données${c.reset}`);
        return;
    }

    console.log();
    for (let i = 0; i < sorted.length; i++) {
        const [model, data] = sorted[i];
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
        console.log(
            `  ${medal} ${model.padEnd(20)} ${c.green}${formatUSD(data.avgCostPerRequest)}/req${c.reset} (${formatNumber(data.totalRequests)} req)`
        );
    }
}

function displaySummary(
    profile: Profile,
    balance: number,
    stats: CurrentPeriodStats,
    tierLimit: number,
    resetInfo: ResetInfo,
    byDate: Map<string, DayData>,
    byModel: Map<string, ModelStats>
): void {
    printHeader(`📈 RÉSUMÉ GLOBAL`);

    const tierInfo = TIER_LIMITS[profile.tier] || { emoji: '❓', pollen: tierLimit };
    const walletBalance = Math.max(0, balance - stats.tierRemaining);

    // Totaux globaux
    let totalSpent = 0;
    let totalTier = 0;
    let totalPack = 0;
    let totalRequests = 0;
    let daysOverLimit = 0;

    for (const [, data] of byDate.entries()) {
        totalSpent += data.total;
        totalTier += data.tierUsed;
        totalPack += data.packUsed;
        totalRequests += data.requests;
        if (data.tierUsed > tierLimit) daysOverLimit++;
    }

    console.log(`
    ${c.cyan}╔═══════════════════════════════════════════════════════════════╗${c.reset}
    ${c.cyan}║${c.reset}  ${tierInfo.emoji} ${c.bright}${profile.tier.toUpperCase()}${c.reset} - Crédit quotidien                              ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}                                                               ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}     ${stats.tierRemaining > 0 ? c.green : c.red}${c.bright}${formatPollen(stats.tierRemaining, 3).padStart(15)}${c.reset}  /  ${formatPollen(tierLimit)}                 ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}     ${bar(stats.tierUsed, tierLimit, 45, false)}        ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}                                                               ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}  ⏰ Reset dans ${c.yellow}${formatDuration(resetInfo.timeUntilReset).padEnd(20)}${c.reset}                    ${c.cyan}║${c.reset}
    ${c.cyan}║${c.reset}  💎 Wallet:     ${walletBalance > 5 ? c.green : c.yellow}${formatPollen(walletBalance).padEnd(20)}${c.reset}                  ${c.cyan}║${c.reset}
    ${c.cyan}╚═══════════════════════════════════════════════════════════════╝${c.reset}
    `);

    console.log(`    ${c.bright}📊 Statistiques globales${c.reset}`);
    console.log(`    ├─ Total dépensé:              ${formatPollen(totalSpent)}`);
    console.log(`    ├─ Dont tier (gratuit):        ${c.green}${formatPollen(totalTier)}${c.reset}`);
    console.log(`    ├─ Dont packs (payé):          ${totalPack > 0 ? c.yellow : c.dim}${formatPollen(totalPack)}${c.reset}`);
    console.log(`    ├─ Requêtes totales:           ${formatNumber(totalRequests)}`);
    console.log(`    ├─ Jours avec dépassement:     ${daysOverLimit > 0 ? c.red : c.green}${daysOverLimit}${c.reset}`);
    console.log(`    └─ Jours d'activité:           ${byDate.size}`);

    // Top 3 modèles
    console.log();
    console.log(`    ${c.bright}🏆 Top 3 modèles par usage${c.reset}`);
    const top3 = Array.from(byModel.entries())
    .sort((a, b) => b[1].totalCost - a[1].totalCost)
    .slice(0, 3);

    for (let i = 0; i < top3.length; i++) {
        const [model, data] = top3[i];
        const medal = ['🥇', '🥈', '🥉'][i];
        console.log(`    ${medal} ${model.padEnd(22)} ${formatPollen(data.totalCost)} (${formatNumber(data.totalRequests)} req)`);
    }

    console.log();
}

function displayModelsReference(): void {
    printHeader(`📋 RÉFÉRENCE DES MODÈLES & PRICING`);

    console.log(`
    ${c.bright}💬 TEXTE${c.reset}
    ${c.dim}Modèle               Réponses/pollen    Provider${c.reset}
    ${c.dim}${'─'.repeat(55)}${c.reset}`);

    const textModels = Object.entries(MODEL_PRICING)
    .filter(([, v]) => v.category === 'text')
    .sort((a, b) => b[1].perPollen - a[1].perPollen);

    for (const [model, info] of textModels) {
        const efficiency = info.perPollen >= 1000 ? c.green : info.perPollen >= 100 ? c.yellow : c.red;
        console.log(`    ${model.padEnd(21)}${efficiency}${formatNumber(info.perPollen).padEnd(19)}${c.reset}${info.provider}`);
    }

    console.log(`
    ${c.bright}🖼️ IMAGE${c.reset}
    ${c.dim}Modèle               Images/pollen      Provider${c.reset}
    ${c.dim}${'─'.repeat(55)}${c.reset}`);

    const imageModels = Object.entries(MODEL_PRICING)
    .filter(([, v]) => v.category === 'image')
    .sort((a, b) => b[1].perPollen - a[1].perPollen);

    for (const [model, info] of imageModels) {
        const efficiency = info.perPollen >= 100 ? c.green : info.perPollen >= 20 ? c.yellow : c.red;
        console.log(`    ${model.padEnd(21)}${efficiency}${formatNumber(info.perPollen).padEnd(19)}${c.reset}${info.provider}`);
    }

    console.log(`
    ${c.bright}🎬 VIDÉO${c.reset}
    ${c.dim}Modèle               Vidéos/pollen      Provider${c.reset}
    ${c.dim}${'─'.repeat(55)}${c.reset}`);

    const videoModels = Object.entries(MODEL_PRICING)
    .filter(([, v]) => v.category === 'video')
    .sort((a, b) => b[1].perPollen - a[1].perPollen);

    for (const [model, info] of videoModels) {
        const efficiency = info.perPollen >= 5 ? c.green : info.perPollen >= 2 ? c.yellow : c.red;
        console.log(`    ${model.padEnd(21)}${efficiency}${formatNumber(info.perPollen).padEnd(19)}${c.reset}${info.provider}`);
    }

    console.log(`
    ${c.dim}Légende: ${c.green}■${c.reset} Économique  ${c.yellow}■${c.reset} Moyen  ${c.red}■${c.reset} Coûteux${c.reset}
    `);
}

function displayDebugInfo(
    profile: Profile,
    balance: number,
    usage: DetailedUsageEntry[],
    resetInfo: ResetInfo,
    stats: CurrentPeriodStats
): void {
    printHeader('🔧 DEBUG INFO');

    console.log(`
    ${c.bright}=== RESET INFO ===${c.reset}
    nextResetAt (API):     ${profile.nextResetAt}
    Reset time:            ${resetInfo.resetHour}:${String(resetInfo.resetMinute).padStart(2, '0')}:${String(resetInfo.resetSecond).padStart(2, '0')} UTC
    Last reset:            ${resetInfo.lastReset.toISOString()}
    Next reset:            ${resetInfo.nextReset.toISOString()}
    Time since reset:      ${formatDuration(resetInfo.timeSinceReset)}
    Time until reset:      ${formatDuration(resetInfo.timeUntilReset)}
    Progress:              ${resetInfo.progressPercent.toFixed(2)}%
    Now:                   ${new Date().toISOString()}

    ${c.bright}=== BALANCE ===${c.reset}
    Balance (API):         ${balance}
    Tier used:             ${stats.tierUsed}
    Tier remaining:        ${stats.tierRemaining}
    Pack used:             ${stats.packUsed}
    Requests:              ${stats.totalRequests}
    Input tokens:          ${formatTokens(stats.inputTokens)}
    Output tokens:         ${formatTokens(stats.outputTokens)}

    ${c.bright}=== USAGE ENTRIES ===${c.reset}
    Total entries (API):   ${usage.length}
    Entries after reset:   ${stats.entriesCount}
    `);

    console.log(`    ${c.bright}Dernières 15 entrées:${c.reset}`);
    const last15 = usage.slice(0, 15);
    for (const entry of last15) {
        const entryTime = parseUsageTimestamp(entry.timestamp);
        const isAfterReset = entryTime >= resetInfo.lastReset;
        const marker = isAfterReset ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        const modelShort = normalizeModelName(entry.model).substring(0, 20).padEnd(20);
        console.log(`      ${marker} ${entry.timestamp} | ${modelShort} | ${entry.meter_source.padEnd(4)} | ${formatUSD(entry.cost_usd)}`);
    }

    console.log(`\n    ${c.dim}✓ = après reset (compte dans tier actuel)${c.reset}`);
    console.log(`    ${c.dim}✗ = avant reset (période précédente)${c.reset}`);
}

function outputJSON(data: any): void {
    console.log(JSON.stringify(data, null, 2));
}

// ================================
// MAIN
// ================================
async function main(): Promise<void> {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    if (options.models) {
        displayModelsReference();
        process.exit(0);
    }

    if (!API_KEY) {
        console.error(`${c.red}✖ Erreur: POLLINATIONS_API_KEY non définie${c.reset}`);
        console.log(`\n${c.dim}Exécutez:${c.reset}`);
        console.log(`  export POLLINATIONS_API_KEY="sk_votre_clé"`);
        console.log(`\n${c.dim}Ou:${c.reset}`);
        console.log(`  POLLINATIONS_API_KEY=sk_xxx npx ts-node script.ts`);
        process.exit(2);
    }

    if (!options.json) {
        console.log(`\n${c.dim}🔄 Récupération des données...${c.reset}`);
    }

    try {
        // Fetch all data in parallel
        const [profileResult, balanceResult, usageResult, dailyUsageResult] = await Promise.all([
            fetchAPI<Profile>('/account/profile'),
                                                                                                fetchAPI<BalanceResponse>('/account/balance'),
                                                                                                fetchAPI<DetailedUsageResponse>('/account/usage'),
                                                                                                fetchAPI<DailyUsageResponse>('/account/usage/daily')
        ]);

        handleAPIError(profileResult, 'profil');
        handleAPIError(balanceResult, 'solde');
        handleAPIError(usageResult, 'usage');
        handleAPIError(dailyUsageResult, 'usage daily');

        const profile = profileResult.data!;
        const balance = balanceResult.data?.balance ?? 0;
        const usage = usageResult.data?.usage ?? [];
        const dailyUsage = dailyUsageResult.data?.usage ?? [];

        const tierInfo = TIER_LIMITS[profile.tier] || { pollen: 3, emoji: '❓', description: 'Inconnu' };
        const tierLimit = tierInfo.pollen;

        // Calculer le reset avec précision
        const resetInfo = calculateResetInfo(profile.nextResetAt);

        // Calculer l'usage PRÉCIS de la période actuelle
        const stats = calculateCurrentPeriodStats(usage, resetInfo, tierLimit);

        // Analyser les données historiques
        const byDate = analyzeByDate(dailyUsage);
        const byModel = analyzeByModel(dailyUsage);
        const predictions = calculatePredictions(byDate, balance);

        // Debug mode
        if (options.debug) {
            displayDebugInfo(profile, balance, usage, resetInfo, stats);
        }

        // JSON output
        if (options.json) {
            outputJSON({
                version: VERSION,
                timestamp: new Date().toISOString(),
                       profile: {
                           name: profile.name,
                           email: profile.email,
                           github: profile.githubUsername,
                           tier: profile.tier,
                           tierEmoji: tierInfo.emoji,
                           tierLimit,
                           createdAt: profile.createdAt
                       },
                       balance: {
                           total: balance,
                           wallet: Math.max(0, balance - stats.tierRemaining),
                       tierRemaining: stats.tierRemaining
                       },
                       currentPeriod: {
                           tierUsed: stats.tierUsed,
                           tierRemaining: stats.tierRemaining,
                           packUsed: stats.packUsed,
                           requests: stats.totalRequests,
                           inputTokens: stats.inputTokens,
                           outputTokens: stats.outputTokens,
                           lastReset: resetInfo.lastReset.toISOString(),
                       nextReset: resetInfo.nextReset.toISOString(),
                       timeUntilResetMs: resetInfo.timeUntilReset,
                       progressPercent: resetInfo.progressPercent,
                       models: Object.fromEntries(stats.models)
                       },
                       predictions: {
                           avgDailyPackUsage: predictions.avgDaily,
                           daysRemaining: predictions.daysRemaining === Infinity ? null : predictions.daysRemaining,
                           weeklyProjection: predictions.weeklyProjection
                       },
                       history: {
                           byDate: Object.fromEntries(
                               Array.from(byDate.entries()).map(([date, data]) => [
                                   date,
                                   { total: data.total, tier: data.tierUsed, pack: data.packUsed, requests: data.requests }
                               ])
                           ),
                           byModel: Object.fromEntries(
                               Array.from(byModel.entries()).map(([model, data]) => [
                                   model,
                                   { requests: data.totalRequests, cost: data.totalCost, avgCost: data.avgCostPerRequest, category: data.category }
                               ])
                           )
                       }
            });
            process.exit(0);
        }

        // Compact output
        if (options.compact || options.balance) {
            displayCompactBalance(balance, tierLimit, stats, resetInfo, tierInfo.emoji);
            process.exit(0);
        }

        // Full output
        displayProfile(profile, tierLimit, resetInfo);
        displaySummary(profile, balance, stats, tierLimit, resetInfo, byDate, byModel);
        displayCurrentPeriod(stats, tierLimit, resetInfo);
        displayBalance(balance, tierLimit, stats, predictions);
        displayDailyUsage(byDate, tierLimit, options.days);
        displayModelStats(byModel);
        displayTopExpensiveModels(byModel);
        displayEfficientModels(byModel);

        console.log(`\n${c.dim}─────────────────────────────────────────────────────────────────${c.reset}`);
        console.log(`${c.dim}Pollinations Monitor v${VERSION} • https://pollinations.ai${c.reset}\n`);

    } catch (error) {
        console.error(`${c.red}✖ Erreur inattendue:${c.reset}`, error);
        process.exit(1);
    }
}

main();

```

### 📄 `infos_submit.txt`

```text
https://github.com/pollinations/pollinations/issues/new?template=tier-app-submission.yml


```

### 📄 `package.json`

```json
{
  "name": "pollinations-usage",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "fkomprod@gmail.com",
  "license": "ISC",
  "dependencies": {
    "@types/node": "^25.0.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}

```

