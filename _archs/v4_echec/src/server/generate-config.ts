
import * as fs from 'fs';
import { loadConfig } from './config.js';
import { fetchFreeModels, fetchEnterpriseModels } from './pollinations-api.js';

// --- INTERFACES SCRICT ---

interface OpenCodeModel {
    id: string; // "pollinations/free/gemini"
    name: string;
    object: string;
    variants?: any;
    options?: any;
}

// --- LOGGING --- (Copied from working implementation)
function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        if (!fs.existsSync('/tmp/opencode_pollinations_debug.log')) {
            fs.writeFileSync('/tmp/opencode_pollinations_debug.log', '');
        }
        fs.appendFileSync('/tmp/opencode_pollinations_debug.log', `[ConfigGen] ${ts} ${msg}\n`);
    } catch (e) { }
}


// --- MAIN GENERATOR logic ---

export async function generatePollinationsConfig(): Promise<OpenCodeModel[]> {
    const config = loadConfig();
    const modelsOutput: OpenCodeModel[] = [];

    log(`Starting Dynamic Discovery (Unified V4)...`);

    // 1. FREE UNIVERSE
    try {
        const freeModels = await fetchFreeModels();
        log(`Fetched ${freeModels.length} Free models from Unified API.`);

        freeModels.forEach(m => {
            const mapped = mapModelFromUnified(m);
            modelsOutput.push(mapped);
        });

    } catch (e) {
        log(`Error fetching Free models: ${e}`);
        // Fallback
        modelsOutput.push({ id: "pollinations/free/openai", name: "[Free] OpenAI (Fallback)", object: "model", variants: {} });
    }

    // 2. ENTERPRISE UNIVERSE
    if (config.apiKey) {
        try {
            const enterModels = await fetchEnterpriseModels(config.apiKey);
            log(`Fetched ${enterModels.length} Enterprise models from Unified API.`);

            enterModels.forEach(m => {
                const mapped = mapModelFromUnified(m);
                modelsOutput.push(mapped);
            });

        } catch (e) {
            log(`Error fetching Enterprise models: ${e}`);
        }
    } else {
        log(`No API Key found. Skipping Enterprise discovery.`);
    }

    log(`Total Mapped Models: ${modelsOutput.length}`);
    return modelsOutput;
}

// --- MAPPING ENGINE (Unified) ---

function mapModelFromUnified(apiModel: any): OpenCodeModel {
    // apiModel from 'pollinations-api' already has:
    // id: "pollinations/free/...", name: "Correct Name", description: "..."
    // We just need to add Variants.

    const modelObj: OpenCodeModel = {
        id: apiModel.id,
        name: apiModel.name, // Use the CLEAN name from api logic
        object: 'model',
        variants: {} // Init variants
    };

    // --- ENRICHISSEMENT (VARIANTS) (Preserved Logic) ---
    const rawId = apiModel.id.toLowerCase();

    // 1. Thinking Models (Reasoning)
    if (rawId.includes('thinking') || rawId.includes('reasoning') || rawId.includes('gemini-2.0-flash-thinking')) {
        modelObj.variants = {
            ...modelObj.variants,
            high_reasoning: {
                options: {
                    reasoningEffort: "high",
                    budgetTokens: 16000
                }
            }
        };
    }

    // 2. Gemini Specifics (3.0 vs 2.5 Logic determined by ID)
    if (rawId.includes('gemini') && !rawId.includes('fast')) {
        // Assume 3.0 or Pro
        // Thinking variant is good here too.
        if (!modelObj.variants.high_reasoning && (rawId.includes('gemini') || rawId.includes('gemini-large'))) {
            modelObj.variants.high_reasoning = { options: { reasoningEffort: "high", budgetTokens: 16000 } };
        }
    }

    // 3. Bedrock Limitation (MaxTokens 8000)
    // Models often on Bedrock: Claude, Mistral, Llama via Pollinations
    if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama')) {
        // User requested "limit_8k" explicitly in recent prompt (Step 7579), earlier code had "safe_tokens"
        // I will use "limit_8k" as per user request example.
        modelObj.variants.limit_8k = {
            options: { maxTokens: 8000 }
        };
    }

    // 4. Fast Models (Disable Thinking explicitly)
    if (rawId.includes('fast') || rawId.includes('flash') || rawId.includes('lite')) {
        // UNLESS it is Gemini Flash Thinking!
        if (!rawId.includes('thinking')) {
            modelObj.variants.speed = {
                options: { thinking: { disabled: true } }
            };
        }
    }

    return modelObj;
}
