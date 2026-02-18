import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { getAggregatedModels } from './pollinations-api.js';
import { loadConfig, saveConfig } from './config.js';
import { handleChatCompletion } from './proxy.js';
import { createCommandHooks, setClientForCommands, checkKeyPermissions } from './commands.js';
import type { Plugin } from '@opencode-ai/plugin';
import { fileURLToPath } from 'url';

const LOG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/plugins/pollinations-v6.log');

// Simple file logger
function log(msg: string) {
    const ts = new Date().toISOString();
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) {
            fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) { }
}

const PORT = parseInt(process.env.POLLINATIONS_PORT || '10001', 10);
let serverInstance: http.Server | null = null;

// --- SERVER LOGIC ---
function startServer() {
    if (serverInstance) return;

    serverInstance = http.createServer(async (req, res) => {
        log(`${req.method} ${req.url}`);

        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // AUTH ENDPOINT
        if (req.method === 'POST' && req.url === '/v1/auth') {
            const chunks: any[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    if (body && body.apiKey) {
                        saveConfig({ apiKey: body.apiKey, mode: 'pro' });
                        log(`[AUTH] Key saved via Server Endpoint`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: "ok" }));
                    } else {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: "Missing apiKey" }));
                    }
                } catch (e) {
                    log(`[AUTH] Error: ${e}`);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: String(e) }));
                }
            });
            return;
        }

        if (req.method === 'GET' && req.url === '/health') {
            const config = loadConfig();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: "ok",
                version: "v6.0.0-beta.99",
                mode: config.mode,
                hasKey: !!config.apiKey
            }));
            return;
        }

        if (req.method === 'GET' && req.url === '/v1/models') {
            try {
                const models = await getAggregatedModels();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(models));
            } catch (e) {
                log(`Error fetching models: ${e}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Failed to fetch models" }));
            }
            return;
        }

        if (req.method === 'POST' && req.url === '/v1/chat/completions') {
            const chunks: any[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                try {
                    const bodyRaw = Buffer.concat(chunks).toString();
                    await handleChatCompletion(req, res, bodyRaw);
                } catch (e) {
                    log(`Error in chat handler: ${e}`);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Internal Server Error in Chat Handler" }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end("Not Found");
    });

    // ANTI-ZOMBIE
    try {
        const { execSync } = require('child_process');
        try {
            console.log(`[POLLINATIONS] Checking port ${PORT}...`);
            execSync(`fuser -k ${PORT}/tcp || true`);
            console.log(`[POLLINATIONS] Port ${PORT} cleared.`);
        } catch (e) { }
    } catch (e) { }

    // STARTUP CHECK
    (async () => {
        const config = loadConfig();
        if (config.apiKey) {
            try {
                console.log('Pollinations Plugin: Verifying API Key on startup...');
                const check = await checkKeyPermissions(config.apiKey);
                if (!check.ok) {
                    console.warn(`Pollinations Plugin: Limited Key Detected on Startup (${check.reason}). Enforcing Manual Mode.`);
                    saveConfig({ apiKey: config.apiKey, mode: 'manual', keyHasAccessToProfile: false });
                } else {
                    if (config.keyHasAccessToProfile === false) saveConfig({ apiKey: config.apiKey, keyHasAccessToProfile: true });
                }
            } catch (e) { console.error('Pollinations Plugin: Startup Check Failed:', e); }
        }
    })();

    serverInstance.listen(PORT, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${PORT}`;
        log(`[SERVER] Started V6 (Plugin Mode) on port ${PORT}`);
        console.log(`POLLINATIONS_V6_URL=${url}`);
    });
}

// --- OPENCODE PLUGIN EXPORT ---
export const plugin: Plugin = async ({ client }) => {
    // 1. Inject Client for Command Handling
    setClientForCommands(client);

    // 2. Start Local Proxy Server
    startServer();

    // 3. Register Hooks (Commands, TUI, etc.)
    return createCommandHooks();
};

// --- STANDALONE SUPPORT ---
// If run directly via `node dist/index.js`, start server immediately
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startServer();
}
