
import { loadConfig } from './config.js';
import * as fs from 'fs';

// Internal Types
interface OpenAIModel {
    id: string;
    name: string;
    object: "model";
    created: number;
    owned_by: string;
    permission: any[];
    capabilities: { failure?: boolean; completion?: boolean; chat: boolean; tools?: boolean };
    context_window?: number;
    description?: string;
    modalities?: { input: string[], output: string[] };
}

// Debug Helper
function logDebug(msg: string) {
    try {
        fs.appendFileSync('/tmp/pollinations-api-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

const HEADERS = {
    'User-Agent': 'curl/8.5.0',
    'Origin': '',
    'Referer': ''
};

function formatName(name: string, censored: boolean): string {
    let clean = name.replace(/^pollinations\//, '').replace(/-/g, ' ');
    clean = clean.replace(/\b\w/g, l => l.toUpperCase());
    if (!censored) clean += " (Uncensored)";
    return clean;
}

// Helper to guess context window if not provided by API
function getContextWindow(id: string): number {
    const n = id.toLowerCase();
    if (n.includes('128k') || n.includes('gpt-4') || n.includes('turbo')) return 128000;
    if (n.includes('gemini') || n.includes('flash') || n.includes('pro')) return 1048576;
    return 32768; // Default
}

// Fetch Free Models (Public API)
export async function fetchFreeModels(): Promise<OpenAIModel[]> {
    try {
        logDebug("Fetching Free Models (Dynamic Inspection)...");
        const response = await fetch('https://text.pollinations.ai/models', { headers: HEADERS });
        if (!response.ok) throw new Error(`${response.status}`);

        const data: any = await response.json();
        const models: any[] = Array.isArray(data) ? data : (data.data || []);

        // Log sample for verification
        if (models.length > 0) logDebug(`Sample Free: ${JSON.stringify(models[0])}`);

        return models
            .filter((m: any) => m.tools === true) // FILTER: Tools Only
            .map((m: any) => {
                const id = m.name || m.id;
                // Use Description if available, else generated name
                const desc = m.description ? m.description : formatName(id, m.censored);
                const displayName = `[Free] ${desc}`; // TAG RESTORED PROPERLY

                return {
                    id: `pollinations/free/${id}`,
                    name: displayName,
                    object: "model",
                    created: 1700000000,
                    owned_by: "pollinations-free",
                    permission: [],
                    capabilities: { chat: true, completion: true, tools: true },
                    context_window: m.context_window || getContextWindow(id),
                    description: desc, // Ensure Description is populated
                    modalities: { input: ['text'], output: ['text'] } // Improve if 'vision' flag exists in API
                };
            });
    } catch (e) {
        logDebug(`Error Free: ${e}`);
        return [];
    }
}

// Fetch Enterprise Models
export async function fetchEnterpriseModels(apiKey: string): Promise<OpenAIModel[]> {
    if (!apiKey || apiKey === 'dummy' || apiKey.length < 5) return [];

    try {
        logDebug(`Fetching Enter Models...`);
        const response = await fetch('https://gen.pollinations.ai/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            logDebug(`Enter API Error: ${response.status}`);
            return [];
        }

        const rawData: any = await response.json();
        const rawModels = Array.isArray(rawData) ? rawData : (rawData.data || []);
        logDebug(`Fetched ${rawModels.length} Enter models.`);

        if (rawModels.length > 0) logDebug(`Sample Enter: ${JSON.stringify(rawModels[0])}`);

        return rawModels
            .filter((m: any) => {
                if (typeof m === 'string') return true; // Strings = pass (cant check tools)
                return m.tools === true; // Objects = check tools
            })
            .map((m: any) => {
                // Enter models might be strings or objects. 
                // If string, we can't extract description dynamically -> Fallback formatted name
                const isObj = typeof m === 'object';
                const id = isObj ? (m.id || m.name) : m;
                const desc = (isObj && m.description) ? m.description : formatName(id, true);

                // TAG SWITCH: [Pro] -> [Enter] per User Request
                const displayName = `[Enter] ${desc}`;

                return {
                    id: `pollinations/enter/${id}`,
                    name: displayName,
                    object: "model",
                    created: 1700000000,
                    owned_by: "pollinations-enter",
                    permission: [],
                    capabilities: { chat: true, completion: true, tools: true },
                    context_window: (isObj && m.context_window) ? m.context_window : getContextWindow(id),
                    description: desc,
                    modalities: { input: ['text'], output: ['text'] }
                };
            });
    } catch (e) {
        logDebug(`Error Enter: ${e}`);
        return [];
    }
}

export async function getAggregatedModels(): Promise<{ object: string, data: OpenAIModel[] }> {
    const config = loadConfig();
    const [free, enter] = await Promise.all([
        fetchFreeModels(),
        fetchEnterpriseModels(config.apiKey || '')
    ]);
    // Merge: Enter first
    return { object: "list", data: [...enter, ...free] };
}
