
import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig, migrateLegacyConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks, createToolHooks, setGlobalClient } from './server/toast.js';
import { createStatusHooks } from './server/status.js';
import { createCommandHooks, setClientForCommands } from './server/commands.js';
import { createToolRegistry } from './tools/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import * as os from 'os';
import * as path from 'path';
import { log } from './server/logger.js';
import { ModelRegistry } from './server/models/index.js';

const sessionModels = new Map<string, string>();

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            // ... (Request Handling) ...
            // We reuse the existing logic structure but simplified startup
            log(`[Proxy] Request: ${req.method} ${req.url}`);

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.method === 'GET' && req.url === '/health') {
                const config = loadConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: "ok",
                    version: require('../package.json').version,
                    mode: config.mode
                }));
                return;
            }

            if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
                const chunks: any[] = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', async () => {
                    try {
                        const bodyRaw = Buffer.concat(chunks).toString();
                        await handleChatCompletion(req, res, bodyRaw);
                    } catch (e) {
                        log(`Error: ${e}`);
                        if (!res.headersSent) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: String(e) }));
                        }
                    }
                });
                return;
            }

            log(`[Proxy] 404 Not Found for ${req.url}`);
            res.writeHead(404);
            res.end("Not Found");
        });

        // Listen on random port (0) to avoid conflicts (CLI/IDE)
        server.listen(0, '127.0.0.1', () => {
            // @ts-ignore
            const assignedPort = (server.address() as net.AddressInfo).port;
            log(`[Proxy] Started v${require('../package.json').version} (Dynamic Port) on port ${assignedPort}`);
            resolve(assignedPort);
        });

        server.on('error', (e) => {
            log(`[Proxy] Fatal Error: ${e}`);
            resolve(0);
        });
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    const v = require('../package.json').version;
    log(`Plugin Initializing v${v}...`);
    log(`[ENV] Keys: ${Object.keys(process.env).filter(k => k.includes('OPENCODE') || k.includes('APP') || k.includes('DATA')).join(', ')}`);

    // MIGRATE CONFIG
    migrateLegacyConfig();

    // START PROXY
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    // INIT MODEL REGISTRY (non-blocking, fire-and-forget)
    ModelRegistry.refresh().then(() => {
        const stats = ModelRegistry.stats();
        log(`[ModelRegistry] Ready: ${stats.image} image, ${stats.video} video, ${stats.audio} audio, ${stats.text} text`);

        // Démarrage du patcher asynchrone des descriptions des Outils (Phase 1.5)
        import('./server/models/worker.js').then(module => {
            module.ToolRegistryWorker.start();
        }).catch(e => log(`[ToolWorker] Failed to load worker: ${e}`));

    }).catch(e => log(`[ModelRegistry] Init failed (will use fallback): ${e}`));

    setGlobalClient(ctx.client);
    setClientForCommands(ctx.client);
    const toastHooks = createToastHooks(ctx.client);
    const commandHooks = createCommandHooks();

    // Build tool registry (conditional on API key presence)
    const toolRegistry = createToolRegistry();
    log(`[Tools] ${Object.keys(toolRegistry).length} tools registered`);

    return {
        "chat.message": async (input: any) => {
            const m = input.model;
            if (m && m.modelID) {
                sessionModels.set(input.sessionID, `${m.providerID}/${m.modelID}`);
                log(`[Hook] Saved active model ${m.providerID}/${m.modelID} for session ${input.sessionID}`);
            }
        },
        tool: toolRegistry,
        async config(config) {
            log("[Hook] config() called");

            // STARTUP only - No complex hot reload logic
            // The user must restart OpenCode to refresh this list if they change keys.
            const modelsArray = await generatePollinationsConfig();

            const modelsObj: any = {};
            for (const m of modelsArray) {
                modelsObj[m.id] = m;
            }

            if (!config.provider) config.provider = {};

            // Dynamic Provider Name
            const version = require('../package.json').version;


            config.provider['pollinations'] = {
                id: 'pollinations',
                name: `Pollinations AI (v${version})`,
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...createToolHooks(ctx.client),
        ...createStatusHooks(ctx.client),
        ...commandHooks
    };
};

export default PollinationsPlugin;
