import * as https from 'https';

export interface Model {
    id: string;
    originalId: string;
    name: string;
    description: string;
    contextWindow: number;
    source: 'enterprise' | 'free';
    namespace: string;
}

const ENTERPRISE_DISCOVERY_URL = "https://gen.pollinations.ai/models"; // Correct root endpoint based on curl test
const FREE_DISCOVERY_URL = "https://text.pollinations.ai/models";

const TIMEOUT_MS = 6000;

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers, timeout: TIMEOUT_MS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON from ${url}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
    });
}

// Minimal static fallback (Safety Net only)
const STATIC_ENTERPRISE_BASE: Model[] = [
    {
        id: "pollinations/enter/gemini",
        originalId: "gemini",
        name: "[Enter] Gemini 2.0 Flash (Google)",
        description: "Google's fastest multimodal model with vision and tools.",
        contextWindow: 128000,
        source: 'enterprise',
        namespace: "pollinations/enter/"
    },
    {
        id: "pollinations/enter/openai",
        originalId: "openai",
        name: "[Enter] OpenAI GPT-4o",
        description: "OpenAI's flagship omni model.",
        contextWindow: 128000,
        source: 'enterprise',
        namespace: "pollinations/enter/"
    }
];

export class ModelDiscovery {
    private cache: Model[] | null = null;

    async getModels(apiKey?: string): Promise<Model[]> {
        if (this.cache) return this.cache;

        // Map to hold unique models by ID. 
        // We start with STATIC to ensure they exist, but Dynamic will overwrite them if found.
        const uniqueModels = new Map<string, Model>();
        STATIC_ENTERPRISE_BASE.forEach(m => uniqueModels.set(m.id, m));

        // 1. Fetch Dynamic Enterprise
        try {
            const headers: Record<string, string> = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
            const enterRaw = await fetchJson(ENTERPRISE_DISCOVERY_URL, headers).catch(e => {
                console.warn(`[Pollinations] Enterprise fetch failed: ${e.message}`);
                return [];
            });

            if (Array.isArray(enterRaw)) {
                enterRaw.forEach((m: any) => {
                    // Filter: Must support tools? Or at least be a chat model.
                    // The API returns "tools": true/false. We prefer tools=true.
                    // But if user wants ALL models, we can relax. 
                    // Let's stick to tools=true for "Smart" plugin, or include all but flag them?
                    // Safe bet: Include all but prefer those with tools.

                    if (m.tools === true || m.name.includes("gpt") || m.name.includes("gemini")) {
                        const id = `pollinations/enter/${m.name}`;
                        uniqueModels.set(id, {
                            id: id,
                            originalId: m.name,
                            name: `[Enter] ${m.description || m.name}`, // Use Description if avail
                            description: m.description || "Enterprise AI Model",
                            contextWindow: m.context_window || 128000, // Default to large
                            source: 'enterprise',
                            namespace: 'pollinations/enter/'
                        });
                    }
                });
            }
        } catch (e) {
            console.error("[Pollinations] Enterprise discovery error:", e);
        }

        // 2. Fetch Dynamic Free
        try {
            const freeRaw = await fetchJson(FREE_DISCOVERY_URL).catch(e => {
                console.warn(`[Pollinations] Free fetch failed: ${e.message}`);
                return [];
            });

            if (Array.isArray(freeRaw)) {
                freeRaw.forEach((m: any) => {
                    if (m.tools === true) {
                        const id = `pollinations/free/${m.name}`;
                        uniqueModels.set(id, {
                            id: id,
                            originalId: m.name,
                            name: `[Free] ${m.description || m.name}`,
                            description: m.description || "Free AI Model",
                            contextWindow: m.context_window || 32000,
                            source: 'free',
                            namespace: 'pollinations/free/'
                        });
                    }
                });
            }
        } catch (e) {
            console.error("[Pollinations] Free discovery error:", e);
        }

        this.cache = Array.from(uniqueModels.values());
        return this.cache;
    }
}
