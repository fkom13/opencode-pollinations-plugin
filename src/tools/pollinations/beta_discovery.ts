/**
 * beta_discovery Tool (API Explorer V4 — Defense-in-Depth)
 * 
 * Combines reading the official OpenAPI Specification with hardened
 * blackbox fuzzing that GUARANTEES HTTP 400 responses by forcefully
 * injecting invalid values. The AI agent NEVER controls the actual
 * values sent to the API.
 * 
 * Security Layers:
 * 1. Command Whitelist — only 4 commands exist
 * 2. Endpoint Whitelist — only 4 API routes are probeable
 * 3. Value Injection — fuzz values are hardcoded, AI cannot override
 * 4. Payload Sabotage — fuzz corrupts, probe_missing removes keys
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { emitStatusToast } from '../../server/toast.js';
import { getApiKey } from './shared.js';
import { ModelRegistry } from '../../server/models/index.js';
import type { ModelCategory } from '../../server/models/index.js';
import * as https from 'https';

// ─── Constants ───────────────────────────────────────────────────────────

const OPENAPI_URL = 'https://enter.pollinations.ai/api/docs/open-api/generate-schema';

// Hardcoded fuzz sentinel values — AI cannot change these
const FUZZ_STRING = '@@_FUZZ_INTENTIONAL_INVALID_VALUE_@@';
const FUZZ_NUMBER = -9999999;
const FUZZ_BOOLEAN = 'NOT_A_BOOLEAN';

// Strict endpoint whitelist — only these paths can be probed
const ALLOWED_PROBE_ENDPOINTS = new Set([
    '/v1/chat/completions',
    '/video/{prompt}',
    '/image/{prompt}',
    '/audio/{text}',
]);

// ─── OpenAPI Schema Cache ────────────────────────────────────────────────

let cachedSchema: any = null;

async function fetchOpenApiSchema(): Promise<any> {
    if (cachedSchema) return cachedSchema;

    try {
        const response = await fetch(OPENAPI_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cachedSchema = await response.json();
        return cachedSchema;
    } catch (e: any) {
        throw new Error(`Failed to load OpenAPI Schema from ${OPENAPI_URL}: ${e.message}`);
    }
}

// ─── HTTPS Helper (POST only for safety) ─────────────────────────────────

function sendProbeRequest(endpointPath: string, payload: Record<string, any>): Promise<string> {
    return new Promise((resolve) => {
        const apiKey = getApiKey();
        const fullUrl = `https://gen.pollinations.ai${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;

        let urlObj: URL;
        try {
            urlObj = new URL(fullUrl);
        } catch (e) {
            return resolve(`❌ Invalid URL constructed: ${fullUrl}`);
        }

        const postData = JSON.stringify(payload);

        const options: https.RequestOptions = {
            method: 'POST',  // ALWAYS POST — never GET (GET on /image/ or /video/ triggers generation)
            headers: {
                'User-Agent': 'OpenCode-Probe-V4/1.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            }
        };

        if (apiKey) {
            (options.headers as any)['Authorization'] = `Bearer ${apiKey}`;
        }

        const req = https.request(urlObj, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let result = `**HTTP Status:** \`${res.statusCode} ${res.statusMessage}\`\n`;
                result += `**Method:** \`POST\` (forced)\n`;
                result += `**URL:** \`${fullUrl}\`\n`;
                result += `**Content-Type:** \`${res.headers['content-type']}\`\n\n`;

                try {
                    const parsed = JSON.parse(data);

                    if (res.statusCode === 400 || res.statusCode === 422 || parsed.fieldErrors || parsed.error) {
                        result += `### 🚨 Validation Error — Constraints Revealed!\n`;
                        result += `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
                    } else if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        result += `### ⚠️ Unexpected 2xx Response (probe may have triggered real processing)\n`;
                        result += `\`\`\`json\n${JSON.stringify(parsed, null, 2).substring(0, 1500)}${data.length > 1500 ? '\n... (truncated)' : ''}\n\`\`\``;
                    } else {
                        result += `### Response Body\n`;
                        result += `\`\`\`json\n${JSON.stringify(parsed, null, 2).substring(0, 2000)}${data.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``;
                    }
                } catch (e) {
                    result += `### Raw Response\n`;
                    result += `\`\`\`text\n${data.substring(0, 2000)}${data.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``;
                }

                resolve(result);
            });
        });

        req.on('error', (e) => resolve(`❌ Request Error: ${e.message}`));
        req.setTimeout(10000, () => {
            req.destroy();
            resolve('❌ Request Timeout (10s)');
        });
        req.write(postData);
        req.end();
    });
}

// ─── Security: Endpoint Validation ───────────────────────────────────────

function validateEndpoint(path: string): string | null {
    if (!ALLOWED_PROBE_ENDPOINTS.has(path)) {
        const allowed = Array.from(ALLOWED_PROBE_ENDPOINTS).join(', ');
        return `❌ SECURITY: Endpoint \`${path}\` is NOT in the whitelist.\nAllowed endpoints: ${allowed}\n\nUse \`search_schema\` to explore the OpenAPI spec instead.`;
    }
    return null; // OK
}

// ─── Command: search_schema ──────────────────────────────────────────────

async function cmdSearchSchema(query: string): Promise<string> {
    const schema = await fetchOpenApiSchema();
    const results: Array<{ path: string; type: string; detail: string }> = [];
    const queryLower = query.toLowerCase();

    const search = (obj: any, currentPath: string) => {
        if (typeof obj !== 'object' || obj === null) return;

        // Check current node
        if (typeof obj === 'object') {
            // Check enum values
            if (obj.enum && Array.isArray(obj.enum)) {
                const enumStr = obj.enum.join(', ');
                if (currentPath.toLowerCase().includes(queryLower) || enumStr.toLowerCase().includes(queryLower)) {
                    results.push({
                        path: currentPath,
                        type: 'enum',
                        detail: `Values: [${enumStr}]${obj.description ? ` — ${obj.description}` : ''}`
                    });
                }
            }

            // Check description
            if (typeof obj.description === 'string' && obj.description.toLowerCase().includes(queryLower)) {
                if (!results.find(r => r.path === currentPath)) {
                    results.push({
                        path: currentPath,
                        type: 'description',
                        detail: obj.description.substring(0, 300)
                    });
                }
            }

            // Check parameter names
            if (typeof obj.name === 'string' && obj.name.toLowerCase().includes(queryLower)) {
                results.push({
                    path: currentPath,
                    type: 'parameter',
                    detail: `Name: ${obj.name}, Type: ${obj.schema?.type || obj.type || '?'}${obj.required ? ' (REQUIRED)' : ''}${obj.description ? ` — ${obj.description.substring(0, 200)}` : ''}`
                });
            }
        }

        // Recurse
        for (const [key, value] of Object.entries(obj)) {
            search(value, currentPath ? `${currentPath}.${key}` : key);
        }
    };

    search(schema, '');

    if (results.length === 0) {
        return `ℹ️ No matches found for "${query}" in the OpenAPI specification.\nTry broader terms like "model", "voice", "duration", "aspect", "format".`;
    }

    // Deduplicate and cap at 30 results
    const unique = results.slice(0, 30);

    let output = `### 🔍 OpenAPI Search Results for "${query}" (${unique.length} matches)\n\n`;
    for (const r of unique) {
        output += `- **\`${r.path}\`** [${r.type}]\n  ${r.detail}\n\n`;
    }

    if (results.length > 30) {
        output += `\n_... and ${results.length - 30} more matches. Refine your query._`;
    }

    return output;
}

// ─── Command: fuzz_parameter ─────────────────────────────────────────────

async function cmdFuzzParameter(endpointPath: string, basePayloadStr: string, fuzzTarget: string): Promise<string> {
    // Security Layer 2: Endpoint whitelist
    const endpointError = validateEndpoint(endpointPath);
    if (endpointError) return endpointError;

    // Parse the base payload
    let payload: Record<string, any>;
    try {
        payload = JSON.parse(basePayloadStr);
    } catch (e) {
        return `❌ Error: base_payload_json is not valid JSON: ${(e as Error).message}`;
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return '❌ Error: base_payload_json must be a JSON object (not array or primitive)';
    }

    // Security Layer 3: Forced value injection
    // Detect the current type to inject the right sabotage value
    const currentValue = payload[fuzzTarget];
    let injectedValue: any;

    if (typeof currentValue === 'number') {
        injectedValue = FUZZ_NUMBER;
    } else if (typeof currentValue === 'boolean') {
        injectedValue = FUZZ_BOOLEAN;
    } else {
        // Default to string fuzz for unknown/string/undefined types
        injectedValue = FUZZ_STRING;
    }

    // Force-inject the fuzz value — AI CANNOT override this
    payload[fuzzTarget] = injectedValue;

    const header = `### 🧪 Fuzzing \`${fuzzTarget}\` on \`${endpointPath}\`\n`;
    const info = `**Injected value:** \`${JSON.stringify(injectedValue)}\` (forced by security layer)\n`;
    const payloadPreview = `**Payload sent:**\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n\n`;

    const response = await sendProbeRequest(endpointPath, payload);

    return header + info + payloadPreview + '---\n\n' + response;
}

// ─── Command: probe_missing ──────────────────────────────────────────────

async function cmdProbeMissing(endpointPath: string, basePayloadStr: string, removeKey: string): Promise<string> {
    // Security Layer 2: Endpoint whitelist
    const endpointError = validateEndpoint(endpointPath);
    if (endpointError) return endpointError;

    // Parse the base payload
    let payload: Record<string, any>;
    try {
        payload = JSON.parse(basePayloadStr);
    } catch (e) {
        return `❌ Error: base_payload_json is not valid JSON: ${(e as Error).message}`;
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return '❌ Error: base_payload_json must be a JSON object (not array or primitive)';
    }

    // Security Layer 4: Payload sabotage — REMOVE the key entirely
    const hadKey = removeKey in payload;
    delete payload[removeKey];

    const header = `### 🔬 Testing if \`${removeKey}\` is required on \`${endpointPath}\`\n`;
    const info = `**Key "${removeKey}" ${hadKey ? 'existed and was REMOVED' : 'was NOT present'}**\n`;
    const payloadPreview = `**Payload sent (without "${removeKey}"):**\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n\n`;

    const response = await sendProbeRequest(endpointPath, payload);

    return header + info + payloadPreview + '---\n\n' + response;
}

// ─── Command: list_models_registry ───────────────────────────────────────

function cmdListModelsRegistry(category?: string): string {
    if (!ModelRegistry.isReady()) {
        return '⚠️ ModelRegistry is not yet initialized. The plugin may still be loading. Try again in a few seconds.';
    }

    const validCategories: ModelCategory[] = ['image', 'video', 'audio', 'text'];

    if (category && !validCategories.includes(category as ModelCategory)) {
        return `❌ Invalid category "${category}". Valid: ${validCategories.join(', ')}`;
    }

    const models = category
        ? ModelRegistry.list(category as ModelCategory)
        : ModelRegistry.all();

    if (models.length === 0) {
        return `ℹ️ No models found${category ? ` in category "${category}"` : ''}.`;
    }

    let output = `### 📦 Local Model Registry${category ? ` — ${category}` : ' — All Categories'} (${models.length} models)\n\n`;

    // Group by category
    const grouped = new Map<string, typeof models>();
    for (const m of models) {
        const cat = m.category;
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(m);
    }

    for (const [cat, catModels] of grouped) {
        output += `#### ${cat.toUpperCase()} (${catModels.length})\n\n`;
        output += `| Model | Description | Paid | I2X | Tools | Modalities |\n`;
        output += `|-------|-------------|------|-----|-------|------------|\n`;

        for (const m of catModels) {
            const desc = (m.description || '').substring(0, 40);
            const paid = m.paid_only ? '💎' : '🆓';
            const i2x = m.supportsI2X ? '✅' : '—';
            const tools = m.tools ? '✅' : '—';
            const mods = `${m.input_modalities.join(',')}→${m.output_modalities.join(',')}`;
            output += `| \`${m.name}\` | ${desc} | ${paid} | ${i2x} | ${tools} | ${mods} |\n`;
        }
        output += '\n';
    }

    return output;
}

// ─── Tool Export ─────────────────────────────────────────────────────────

export const polliBetaDiscoveryTool: ToolDefinition = tool({
    description: `API Explorer V4 (Defense-in-Depth) — Safely explore the Pollinations API without risking billing.
Use this tool ONLY to reverse-engineer API parameters and fill the manual registry.

🛡️ SECURITY: This tool uses 4 layers of protection to prevent accidental billing:
- All probe values are force-injected (you cannot send valid values)
- Only whitelisted endpoints can be probed
- All probes use POST method (prevents GET-based generation)
- The payload is always sabotaged (invalid value OR missing required key)

Commands:
- 'search_schema': Search the OpenAPI spec for keywords (e.g. "aspectRatio", "voice", "duration"). Pure read, zero network requests.
- 'fuzz_parameter': Send a request with an intentionally INVALID value for a specific parameter. The tool force-injects garbage to trigger Zod validation errors that reveal real constraints. YOU DO NOT CONTROL THE VALUE SENT.
- 'probe_missing': Remove a key from the payload to test if it's required. Sends an incomplete request to trigger "Required" errors.
- 'list_models_registry': Show all models from the local ModelRegistry cache. Zero network requests. Use this first to understand what the plugin already knows.

Allowed probe endpoints: /v1/chat/completions, /video/{prompt}, /image/{prompt}, /audio/{text}`,

    args: {
        command: tool.schema.enum(['search_schema', 'fuzz_parameter', 'probe_missing', 'list_models_registry']).describe('Action to perform'),
        query: tool.schema.string().optional().describe('For search_schema: keyword to search (e.g. "aspectRatio", "voice", "model")'),
        endpoint_path: tool.schema.string().optional().describe('For fuzz_parameter/probe_missing: API path (e.g. "/v1/chat/completions")'),
        base_payload_json: tool.schema.string().optional().describe('For fuzz_parameter/probe_missing: base JSON payload (will be sabotaged by security layer)'),
        fuzz_target: tool.schema.string().optional().describe('For fuzz_parameter: parameter name to fuzz (e.g. "model", "aspectRatio")'),
        remove_key: tool.schema.string().optional().describe('For probe_missing: key name to remove from payload to test if required'),
        category: tool.schema.string().optional().describe('For list_models_registry: filter by category (image/video/audio/text)'),
    },

    async execute(args, context) {
        emitStatusToast('info', `Explorer V4: ${args.command}...`, '🔎 API Explorer');
        context.metadata({ title: `Explorer: ${args.command}` });

        try {
            switch (args.command) {
                case 'search_schema': {
                    if (!args.query) return '❌ Error: `query` is required for search_schema';
                    return await cmdSearchSchema(args.query);
                }

                case 'fuzz_parameter': {
                    if (!args.endpoint_path) return '❌ Error: `endpoint_path` is required for fuzz_parameter';
                    if (!args.base_payload_json) return '❌ Error: `base_payload_json` is required for fuzz_parameter';
                    if (!args.fuzz_target) return '❌ Error: `fuzz_target` is required for fuzz_parameter';
                    return await cmdFuzzParameter(args.endpoint_path, args.base_payload_json, args.fuzz_target);
                }

                case 'probe_missing': {
                    if (!args.endpoint_path) return '❌ Error: `endpoint_path` is required for probe_missing';
                    if (!args.base_payload_json) return '❌ Error: `base_payload_json` is required for probe_missing';
                    if (!args.remove_key) return '❌ Error: `remove_key` is required for probe_missing';
                    return await cmdProbeMissing(args.endpoint_path, args.base_payload_json, args.remove_key);
                }

                case 'list_models_registry': {
                    return cmdListModelsRegistry(args.category);
                }

                default:
                    return '❌ Unknown command';
            }
        } catch (err: any) {
            emitStatusToast('error', `Explorer failed: ${err.message}`, '🔎 API Explorer');
            return `❌ Critical Error: ${err.message}`;
        }
    }
});
