
import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig } from './server/config.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToastHooks, setGlobalClient } from './server/toast.js';
import { createStatusHooks } from './server/status.js';
import { createCommandHooks } from './server/commands.js';

const LOG_FILE = '/tmp/opencode_pollinations_v4.log';

function log(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

const TRACKING_PORT = 10001;

// === ANTI-ZOMBIE / PORT MANAGMENT (CROSS-PLATFORM) ===
// Instead of killing specific PIDs (which requires OS-specific commands like fuser/taskkill),
// we use a "Try to Listen" approach. If the port is busy, we assume it's a previous instance
// of ourselves (or another plugin instance) and we try to reuse it or fail gracefully.
// This works on Windows, Linux, and macOS without external dependencies.

const tryListen = (server: http.Server, port: number, retries = 3): Promise<void> => {
    return new Promise((resolve, reject) => {
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                if (retries > 0) {
                    log(`[Init] Port ${port} busy. Retrying in 500ms... (${retries} left)`);
                    setTimeout(() => {
                        server.close();
                        server.listen(port, '127.0.0.1'); // Retry listen
                    }, 500);
                } else {
                    log(`[Init] Port ${port} still busy. Assuming persistent instance.`);
                    resolve(); // Resolve anyway, assuming existing instance will handle requests
                }
            } else {
                reject(err);
            }
        });

        server.once('listening', () => {
            log(`[Init] Proxy successfully bound to port ${port}`);
            resolve();
        });

        server.listen(port, '127.0.0.1');
    });
};

// === GESTION DU CYCLE DE VIE PROXY ===

const startProxy = (): Promise<number> => {
    return new Promise(async (resolve) => {
        const server = http.createServer(async (req, res) => {
            // ... (Request Handling - Unchanged) ...
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
                    version: "v5.3.0",
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

        // Robust Startup Logic
        try {
            await tryListen(server, TRACKING_PORT, 3);
            resolve(TRACKING_PORT);
        } catch (e) {
            log(`[Proxy] Fatal Bind Error: ${e}`);
            resolve(0); // Should handle gracefully upper in stack
        }
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    log("Plugin Initializing V5.2.0 (Stable)...");

    // START PROXY
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    setGlobalClient(ctx.client);
    const toastHooks = createToastHooks(ctx.client);
    const commandHooks = createCommandHooks();

    return {
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

            config.provider['pollinations'] = {
                id: 'pollinations',
                name: 'Pollinations V5.2 (Native)',
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...createStatusHooks(ctx.client),
        ...commandHooks
    };
};

export default PollinationsPlugin;
