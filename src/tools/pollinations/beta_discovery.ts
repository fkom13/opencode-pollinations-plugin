/**
 * beta_discovery Tool (API Explorer V3 - Hybrid Probe)
 * 
 * Combines reading the official OpenAPI Specification with active 
 * blackbox probing (triggering HTTP 400/422 ValidationErrors) to 
 * discover hidden or undocumented enums and parameters.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { emitStatusToast } from '../../server/toast.js';
import { getApiKey } from './shared.js';
import * as fs from 'fs';
import * as https from 'https';

// Primary URL for the OpenAPI spec
const OPENAPI_URL = 'https://gen.pollinations.ai/openapi.json';
// Fallback local path
const LOCAL_FALLBACK_PATH = '/home/fkomp/Bureau/oracle/Documentations/API - Severals documentations for multiples api usages/pollinations/pollinations_enter_beta/PolinationsGenBeta_api.json';

let cachedSchema: any = null;

async function fetchOpenApiSchema(): Promise<any> {
    if (cachedSchema) return cachedSchema;

    try {
        if (fs.existsSync(LOCAL_FALLBACK_PATH)) {
            const data = fs.readFileSync(LOCAL_FALLBACK_PATH, 'utf-8');
            cachedSchema = JSON.parse(data);
            return cachedSchema;
        }
    } catch (e) {
        // Fallthrough
    }

    try {
        const response = await fetch(OPENAPI_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cachedSchema = await response.json();
        return cachedSchema;
    } catch (e: any) {
        throw new Error(`Failed to load OpenAPI Schema: ${e.message}`);
    }
}

async function probeEndpoint(method: 'GET' | 'POST', endpointUrl: string, payloadStr?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const apiKey = getApiKey();
        const urlObj = new URL(endpointUrl.startsWith('http') ? endpointUrl : `https://gen.pollinations.ai${endpointUrl.startsWith('/') ? '' : '/'}${endpointUrl}`);

        const options: https.RequestOptions = {
            method: method,
            headers: {
                'User-Agent': 'OpenCode-Probe-Tool/3.0',
                'Accept': 'application/json'
            }
        };

        if (apiKey) {
            (options.headers as any)['Authorization'] = `Bearer ${apiKey}`;
        }

        let postData: string | undefined;
        if (method === 'POST') {
            (options.headers as any)['Content-Type'] = 'application/json';
            if (payloadStr) {
                try {
                    // Try to parse just to validate it's json, but send the string
                    JSON.parse(payloadStr);
                    postData = payloadStr;
                    (options.headers as any)['Content-Length'] = Buffer.byteLength(postData);
                } catch (e) {
                    return resolve(`❌ Error: payload_json must be a valid JSON string. Parse error: ${(e as Error).message}`);
                }
            } else {
                postData = '{}';
                (options.headers as any)['Content-Length'] = Buffer.byteLength(postData);
            }
        } else if (method === 'GET' && payloadStr) {
            try {
                const queryParams = JSON.parse(payloadStr);
                for (const [key, value] of Object.entries(queryParams)) {
                    urlObj.searchParams.append(key, String(value));
                }
            } catch (e) {
                return resolve(`❌ Error: payload_json must be a valid JSON string representing query params. Parse error: ${(e as Error).message}`);
            }
        }

        const req = https.request(urlObj, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let formattedResult = `**HTTP Status:** \`${res.statusCode} ${res.statusMessage}\`\n`;
                formattedResult += `**Content-Type:** \`${res.headers['content-type']}\`\n\n`;

                try {
                    const parsed = JSON.parse(data);

                    // Highlight Validation Errors (The main goal of the probe)
                    if (res.statusCode === 400 || res.statusCode === 422 || parsed.fieldErrors || parsed.error) {
                        formattedResult += `### 🚨 Validation Error Detected (Jackpot!)\n`;
                        formattedResult += `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
                    } else {
                        formattedResult += `### Response Body\n`;
                        formattedResult += `\`\`\`json\n${JSON.stringify(parsed, null, 2).substring(0, 2000)}${data.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``;
                    }
                } catch (e) {
                    // Not JSON
                    formattedResult += `### Raw Response Body\n`;
                    formattedResult += `\`\`\`text\n${data.substring(0, 2000)}${data.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``;
                }
                resolve(formattedResult);
            });
        });

        req.on('error', (e) => resolve(`❌ Request Error: ${e.message}`));
        if (postData) req.write(postData);
        req.end();
    });
}

export const polliBetaDiscoveryTool: ToolDefinition = tool({
    description: `Explore the Pollinations API using Hybrid Discovery (OpenAPI + Active Probing).
Use this to find undocumented parameters, models, voices, and endpoints.

Commands available:
- 'list_endpoints': (Whitebox) Returns all routes from OpenAPI.
- 'get_endpoint': (Whitebox) Returns param schema for a route from OpenAPI.
- 'get_enums': (Whitebox) Recursively searches the OpenAPI spec for a parameter enum (e.g. 'voice', 'model').
- 'probe_endpoint': (Blackbox) Sends a real HTTP request (GET or POST) to trigger API validation errors (HTTP 400). Use this to reverse-engineer undocumented enums by sending invalid values. The tool auto-injects your API key.`,

    args: {
        command: tool.schema.enum(['list_endpoints', 'get_endpoint', 'get_enums', 'probe_endpoint']).describe('The action to perform'),
        endpoint_path: tool.schema.string().optional().describe('OpenAPI path (e.g. "/v1/chat/completions") or full URL for probe_endpoint'),
        parameter_name: tool.schema.string().optional().describe('Required for get_enums (e.g. "voice", "model")'),
        probe_method: tool.schema.enum(['GET', 'POST']).optional().describe('Required for probe_endpoint'),
        probe_payload_json: tool.schema.string().optional().describe('JSON string of query params (GET) or body (POST) to send during probe_endpoint. e.g. "{\\"model\\":\\"fake-model\\"}" to trigger an error showing valid models.'),
    },

    async execute(args, context) {
        emitStatusToast('info', `Discovery: ${args.command}...`, '🔎 API Probe');
        context.metadata({ title: `Probe: ${args.command}` });

        try {
            if (args.command === 'probe_endpoint') {
                if (!args.endpoint_path || !args.probe_method) {
                    return '❌ Error: `endpoint_path` and `probe_method` are required for command `probe_endpoint`';
                }
                return await probeEndpoint(args.probe_method, args.endpoint_path, args.probe_payload_json);
            }

            // Whitebox commands need OpenAPI
            const schema = await fetchOpenApiSchema();

            if (args.command === 'list_endpoints') {
                const paths = Object.keys(schema.paths || {});
                return `**Available API Endpoints (OpenAPI):**\n\n\`\`\`json\n${JSON.stringify(paths, null, 2)}\n\`\`\``;
            }

            if (args.command === 'get_endpoint') {
                if (!args.endpoint_path) return '❌ Error: `endpoint_path` is required';

                const details = schema.paths[args.endpoint_path];
                if (!details) return `❌ Endpoint '${args.endpoint_path}' not found in OpenAPI schema.`;

                return `**Endpoint Details for \`${args.endpoint_path}\`:**\n\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
            }

            if (args.command === 'get_enums') {
                if (!args.parameter_name) return '❌ Error: `parameter_name` is required';

                const results: Array<{ path: string; enum: string[]; description?: string }> = [];

                const findEnums = (obj: any, path = '') => {
                    if (typeof obj !== 'object' || obj === null) return;

                    if (obj.enum && Array.isArray(obj.enum) && path.includes(args.parameter_name!)) {
                        results.push({
                            path: path,
                            enum: obj.enum,
                            description: obj.description
                        });
                    }

                    for (const [key, value] of Object.entries(obj)) {
                        findEnums(value, path ? `${path}.${key}` : key);
                    }
                };

                findEnums(schema.components?.schemas, 'components.schemas');
                findEnums(schema.paths, 'paths');

                if (results.length === 0) {
                    return `ℹ️ No enums found matching parameter '${args.parameter_name}' in OpenAPI. You should use 'probe_endpoint' to test it manually!`;
                }

                let output = `**Discovered Enums for '${args.parameter_name}':**\n\n`;
                results.forEach(res => {
                    output += `- **Found at**: \`${res.path}\`\n`;
                    if (res.description) output += `  - **Desc**: ${res.description}\n`;
                    output += `  - **Values**: ${res.enum.join(', ')}\n\n`;
                });

                return output;
            }

            return '❌ Unknown command';

        } catch (err: any) {
            emitStatusToast('error', `Discovery failed: ${err.message}`, '🔎 API Probe');
            return `❌ Critical Error: ${err.message}`;
        }
    }
});
