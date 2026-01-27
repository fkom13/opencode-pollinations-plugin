
import * as https from 'https';
import * as fs from 'fs';
import { loadConfig } from './config.js';

// --- INTERFACES SCRICT ---

interface PollinationsModel {
    name: string;
    description?: string;
    type?: string;
    tools?: boolean;
    reasoning?: boolean;
    context?: number;
    [key: string]: any;
}

interface OpenCodeModel {
    id: string; // "free/gemini"
    name: string;
    object: string;
    variants?: any;
    options?: any;
    limit?: {
        context?: number;
        output?: number;
    };
}

// --- LOGGING ---
const LOG_FILE = '/tmp/opencode_pollinations_config.log';
function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');
        fs.appendFileSync(LOG_FILE, `[ConfigGen] ${ts} ${msg}\n`);
    } catch (e) { }
    // Force output to stderr for CLI visibility if needed, but clean.
}

// Fetch Helper
function fetchJson(url: string, headers: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    log(`JSON Parse Error for ${url}: ${e}`);
                    resolve([]); // Fail safe -> empty list
                }
            });
        });
        req.on('error', (e) => {
            log(`Network Error for ${url}: ${e.message}`);
            reject(e);
        });
        req.setTimeout(5000, () => { // 5s timeout
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

function formatName(id: string, censored: boolean = true): string {
    let clean = id.replace(/^pollinations\//, '').replace(/-/g, ' ');
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    if (!censored) clean += " (Uncensored)";
    return clean;
}

// --- MAIN GENERATOR logic ---

export async function generatePollinationsConfig(): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Configuration (V4.5 Clean Dynamic)...`);

    // 1. FREE UNIVERSE
    try {
        // Switch to main models endpoint (User provided curl confirms it has 'description')
        const freeList = await fetchJson('https://text.pollinations.ai/models');
        const list = Array.isArray(freeList) ? freeList : (freeList.data || []);

        list.forEach((m: any) => {
            const mapped = mapModel(m, 'free/', '[Free] ');
            modelsOutput.push(mapped);
        });
        log(`Fetched ${modelsOutput.length} Free models.`);
    } catch (e) {
        log(`Error fetching Free models: ${e}`);
        // Fallback minimal (Network Error case)
        modelsOutput.push({ id: "free/openai", name: "[Free] OpenAI (Network Error)", object: "model", variants: {} });
    }

    // 2. ENTERPRISE UNIVERSE
    if (config.apiKey && config.apiKey.length > 5 && config.apiKey !== 'dummy') {
        try {
            const enterListRaw = await fetchJson('https://gen.pollinations.ai/text/models', {
                'Authorization': `Bearer ${config.apiKey}`
            });
            const enterList = Array.isArray(enterListRaw) ? enterListRaw : (enterListRaw.data || []);

            enterList.forEach((m: any) => {
                if (m.tools === false) return;
                const mapped = mapModel(m, 'enter/', '[Enter] ');
                modelsOutput.push(mapped);
            });
            log(`Total models (Free+Pro): ${modelsOutput.length}`);

        } catch (e) {
            log(`Error fetching Enterprise models: ${e}`);
            // Pas de fallback statique pour Enterprise, c'est le réseau qui décide.
        }
    }

    return modelsOutput;
}

// --- MAPPING ENGINE ---

function mapModel(raw: any, prefix: string, namePrefix: string): OpenCodeModel {
    const rawId = raw.id || raw.name;
    const fullId = prefix + rawId; // ex: "free/gemini" or "enter/nomnom" (prefix passed is "enter/")

    let baseName = raw.description;
    if (!baseName || baseName === rawId) {
        baseName = formatName(rawId, raw.censored !== false);
    }

    // CLEANUP: Simple Truncation Rule (Requested by User)
    // "Start from left, find ' - ', delete everything after."
    if (baseName && baseName.includes(' - ')) {
        baseName = baseName.split(' - ')[0].trim();
    }

    const finalName = `${namePrefix}${baseName}`;

    const modelObj: OpenCodeModel = {
        id: fullId,
        name: finalName,
        object: 'model',
        variants: {}
    };

    // --- ENRICHISSEMENT ---
    if (raw.reasoning === true || rawId.includes('thinking') || rawId.includes('reasoning')) {
        modelObj.variants = { ...modelObj.variants, high_reasoning: { options: { reasoningEffort: "high", budgetTokens: 16000 } } };
    }
    if (rawId.includes('gemini') && !rawId.includes('fast')) {
        if (!modelObj.variants.high_reasoning && (rawId === 'gemini' || rawId === 'gemini-large')) {
            modelObj.variants.high_reasoning = { options: { reasoningEffort: "high", budgetTokens: 16000 } };
        }
    }
    if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama')) {
        modelObj.variants.safe_tokens = { options: { maxTokens: 8000 } };
    }
    // NOVA FIX: Bedrock limit ~10k (User reported error > 10000)
    // We MUST set the limit on the model object itself so OpenCode respects it by default.
    if (rawId.includes('nova')) {
        modelObj.limit = {
            output: 8000,
            context: 128000 // Nova Micro/Lite/Pro usually 128k
        };
        // Also keep variant just in case
        modelObj.variants.bedrock_safe = { options: { maxTokens: 8000 } };
    }
    // NOMNOM FIX: User reported error if max_tokens is missing.
    // Also it is a 'Gemini-scrape' model, so we treat it similar to Gemini but with strict limit.
    if (rawId.includes('nomnom') || rawId.includes('scrape')) {
        modelObj.limit = {
            output: 2048, // User used 1500 successfully
            context: 32768
        };
    }
    if (rawId.includes('fast') || rawId.includes('flash') || rawId.includes('lite')) {
        if (!rawId.includes('gemini')) {
            modelObj.variants.speed = { options: { thinking: { disabled: true } } };
        }
    }

    return modelObj;
}
