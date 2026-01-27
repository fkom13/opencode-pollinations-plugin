
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { getAggregatedModels } from './pollinations-api.js';
import { loadConfig, saveConfig } from './config.js';
import { handleChatCompletion } from './proxy.js';
import { emitStatusToast } from './toast.js';

const LOG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/plugins/pollinations-v3.log');



// Simple file logger
function log(msg: string) {
    const ts = new Date().toISOString();
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) {
            fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) {
        // silent fail
    }
}

// CRASH GUARD
const CRASH_LOG = '/tmp/opencode_pollinations_crash.log';
process.on('uncaughtException', (err) => {
    try {
        const msg = `[CRASH] Uncaught Exception: ${err.message}\n${err.stack}\n`;
        fs.appendFileSync(CRASH_LOG, msg);
        console.error(msg);
    } catch (e) { }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    try {
        const msg = `[CRASH] Unhandled Rejection: ${reason}\n`;
        fs.appendFileSync(CRASH_LOG, msg);
    } catch (e) { }
});

const server = http.createServer(async (req, res) => {
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

    // AUTH ENDPOINT (Kept for compatibility, though Native Auth is preferred)
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
            version: "v3.0.0-phase3",
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
        // Accumulate body for the proxy
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

const PORT = parseInt(process.env.POLLINATIONS_PORT || '10001', 10);

// ANTI-ZOMBIE (Visible Logs Restored)
try {
    const { execSync } = require('child_process');
    try {
        console.log(`[POLLINATIONS] Checking port ${PORT}...`);
        execSync(`fuser -k ${PORT}/tcp || true`);
        console.log(`[POLLINATIONS] Port ${PORT} cleared.`);
    } catch (e) {
        console.log(`[POLLINATIONS] Port check skipped (cmd missing?)`);
    }
} catch (e) { }

// LIFECYCLE DEBUG (Sync Write)
const LIFE_LOG = '/tmp/POLLI_LIFECYCLE.log';
const LOC_LOG = '/tmp/POLLI_LOCATION.log'; // NEW: Track source location

try {
    fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [STARTUP] PID:${process.pid} Initializing...\n`);
    fs.writeFileSync(LOC_LOG, `[${new Date().toISOString()}] RUNNING FROM: ${__filename}\n`);
} catch (e) { }

process.on('exit', (code) => {
    try { fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [EXIT] PID:${process.pid} Exiting with code ${code}\n`); } catch (e) { }
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}`;
    log(`[SERVER] Started V3 Phase 3 (Auth Enabled) on port ${PORT}`);
    try { fs.appendFileSync(LIFE_LOG, `[${new Date().toISOString()}] [LISTEN] PID:${process.pid} Listening on ${PORT}\n`); } catch (e) { }
    console.log(`POLLINATIONS_V3_URL=${url}`);
});
