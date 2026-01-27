
import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { sanitizeAzureTools } from './sanitizers/azure.js';
import { sanitizeToolsForVertex, injectGeminiSignatures } from './sanitizers/vertex.js';
import { StreamProcessor } from './sanitizers/stream.js';
import { PollinationsRouter } from './router.js';
import { ModelDiscovery } from './discovery.js';

const LOG_FILE = '/tmp/POLLI_V2_ALIVE.log';

let lastSignature: string | null = null;

function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) { }
}

const POLLINATIONS_API_URL = "https://gen.pollinations.ai";
const router = new PollinationsRouter();

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            log(`[Proxy] Incoming Request: ${req.method} ${req.url}`);

            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end();
                return;
            }

            const chunks: any[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                let bodyStr = Buffer.concat(chunks).toString();
                let body: any = {};

                try {
                    body = JSON.parse(bodyStr);
                    log(`[Proxy] Model: ${body.model}`);

                    // 5. Routing Logic
                    const apiKey = req.headers['authorization']?.replace("Bearer ", "");
                    const modelRequest = body.model || "";
                    const route = router.getClient(modelRequest, apiKey);

                    // 6. Request Transformation
                    const finalBody = route.client.transformRequest(body, route.originalId);

                    const targetModel = route.originalId;

                    if (finalBody.stream_options) delete finalBody.stream_options;

                    sanitizeAzureTools(finalBody, targetModel);

                    if (targetModel.includes("gemini")) {
                        if (finalBody.tools && Array.isArray(finalBody.tools)) {
                            log(`[Proxy] Sanitizing Gemini Tools`);
                            finalBody.tools = sanitizeToolsForVertex(finalBody.tools);
                        }
                        injectGeminiSignatures(finalBody, lastSignature);
                    }

                    log(`[Proxy] Routing to: ${route.isFree ? 'FREE' : 'ENTERPRISE'} (${route.originalId})`);
                    bodyStr = JSON.stringify(finalBody);

                    // 7. Forward Request
                    const targetUrl = router.getTargetUrl(route.client, req.url || "");
                    const targetHeaders = {
                        ...req.headers,
                        ...route.client.getHeaders(),
                        'host': new URL(targetUrl).host,
                        'content-length': Buffer.byteLength(bodyStr),
                        'content-type': 'application/json'
                    };

                    const proxyReq = https.request(targetUrl, {
                        method: req.method,
                        headers: targetHeaders
                    }, (proxyRes) => {
                        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

                        const processor = new StreamProcessor(lastSignature);

                        proxyRes.on('data', (chunk) => {
                            let chunkStr = chunk.toString();
                            chunkStr = processor.processChunk(chunkStr);

                            const newSig = processor.getSignature();
                            if (newSig && newSig !== lastSignature) {
                                lastSignature = newSig;
                                log(`[Proxy] Captured thought_signature: ${lastSignature?.substring(0, 20)}...`);
                            }
                            res.write(chunkStr);
                        });

                        proxyRes.on('end', () => {
                            log(`[Proxy] Response Code: ${proxyRes.statusCode}`);
                            res.end();
                        });
                    });

                    proxyReq.on('error', (err) => {
                        log(`[Proxy] Error: ${err.message}`);
                        res.writeHead(502);
                        res.end(JSON.stringify({ error: "Proxy Error", details: err.message }));
                    });

                    proxyReq.write(bodyStr);
                    proxyReq.end();

                } catch (e) {
                    log(`[Proxy] Error processing request: ${e}`);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: "Proxy Internal Error", details: String(e) }));
                }
            });
        });

        server.listen(0, '127.0.0.1', () => {
            const addr = server.address() as any;
            log(`[Proxy] Started on port ${addr.port}`);

            const cleanup = () => {
                server.close();
            };
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            process.on('exit', cleanup);

            resolve(addr.port);
        });
    });
};

export const PollinationsPlugin: Plugin = async () => {
    log("Plugin Initializing V2 (Modular)...");
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}`;

    return {
        async config(config) {
            log("[Hook] Config hook called");

            if (!config.provider) {
                config.provider = {};
            }

            // Define NEW Provider: 'pollinations_smart'
            config.provider.pollinations_smart = {
                name: "Pollinations Smart Router",
                api: "openai", // OpenAI-compatible API
                options: {
                    baseURL: localBaseUrl,
                    apiKey: "SK-POLLI-SMART-AUTO",
                },
                models: {} // Populated dynamically
            };

            // Inject Models
            try {
                // Try to find a real key from other providers to reuse if possible
                const existingKey = config.provider?.pollinations_enter?.options?.apiKey
                    || config.provider?.pollinations?.options?.apiKey
                    || "";

                const discovery = new ModelDiscovery();
                const models = await discovery.getModels(existingKey as string);

                if (models.length > 0) {
                    log(`[Hook] Injecting ${models.length} models into 'pollinations_smart' provider.`);
                    const modelsMap: any = {};
                    models.forEach(m => {
                        modelsMap[m.id] = {
                            id: m.id,
                            name: m.name,
                            description: m.description,
                            contextWindow: m.contextWindow,
                            // Ensure proper capabilities are set for OpenCode to use them
                            capabilities: {
                                text: true,
                                image: m.id.includes("gemini") || m.id.includes("gpt"), // Basic guess
                                toolcall: m.source === 'enterprise' || m.id.includes("gemini") || m.id.includes("mistral")
                            }
                        };
                    });
                    config.provider.pollinations_smart.models = modelsMap;
                }
            } catch (e) {
                log(`[Hook] Error injecting models: ${e}`);
            }
        }
    };
};

export default PollinationsPlugin;
