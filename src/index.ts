
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

// === ANTI-ZOMBIE ATOMIC CLEANUP ===
try {
    log(`[Init] Checking port ${TRACKING_PORT} for zombies...`);
    execSync(`fuser -k ${TRACKING_PORT}/tcp || true`);
    log(`[Init] Port ${TRACKING_PORT} cleaned.`);
} catch (e) {
    log(`[Init] Zombie cleanup warning: ${e}`);
}

// === GESTION DU CYCLE DE VIE PROXY ===

const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
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
                    version: "v4.0.5",
                    mode: config.mode
                }));
                return;
            }

            // SUPPORT FLEXIBLE DES PATHS
            // Le SDK peut envoyer /v1/chat/completions ou juste /chat/completions
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

        server.listen(TRACKING_PORT, '127.0.0.1', () => {
            log(`[Proxy] Started V4 on port ${TRACKING_PORT}`);
            resolve(TRACKING_PORT);
        });

        server.on('error', (e: any) => {
            log(`[Proxy] Fatal Error: ${e}`);
            resolve(0);
        });
    });
};

// === PLUGIN EXPORT ===

export const PollinationsPlugin: Plugin = async (ctx) => {
    log("Plugin Initializing V4.0.5 (Path Fix)...");
    try {
        log(`[DEBUG] CTX Keys: ${Object.keys(ctx).join(', ')}`);
    } catch (e) { log(`[DEBUG] Error inspecting ctx: ${e}`); }

    const port = await startProxy();
    // IMPORTANT: On ajoute /v1 à la base URL pour guider le SDK, 
    // mais le proxy accepte aussi sans.
    const localBaseUrl = `http://127.0.0.1:${port}/v1`;

    setGlobalClient(ctx.client); // REGISTER CLIENT FOR IMMEDIATE TOASTS
    const toastHooks = createToastHooks(ctx.client);
    const commandHooks = createCommandHooks();

    return {
        async config(config) {
            log("[Hook] config() called");

            const modelsArray = await generatePollinationsConfig();
            const modelsObj: any = {};
            for (const m of modelsArray) {
                // Ensure ID is relative for mapping ("free/gemini") 
                // BUT Provider needs full ID ? No, the object key is the relative ID
                // OpenCode: provider.models[id]
                // id comes from generatePollinationsConfig which returns "free/gemini"
                // So modelsObj["free/gemini"] = ... matches.
                modelsObj[m.id] = m;
            }

            if (!config.provider) config.provider = {};

            config.provider['pollinations'] = {
                id: 'pollinations',
                name: 'Pollinations V5.1 (Native)',
                options: { baseURL: localBaseUrl },
                models: modelsObj
            } as any;

            log(`[Hook] Registered ${Object.keys(modelsObj).length} models.`);
        },
        ...toastHooks,
        ...createStatusHooks(ctx.client), // New Status Bar Logic
        ...commandHooks
    };
};

export default PollinationsPlugin;
