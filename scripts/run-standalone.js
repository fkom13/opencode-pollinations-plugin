
// scripts/run-standalone.js
import * as http from 'http';
import * as fs from 'fs';
import { handleChatCompletion } from '../dist/server/proxy.js';
import { loadConfig } from '../dist/server/config.js';

// Configuration minimale pour le standalone
const PORT = 10001;

console.log("Starting Standalone V4 Proxy...");

const server = http.createServer(async (req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url}`);

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
        res.end(JSON.stringify({ status: "ok", mode: "standalone", hasKey: !!config.apiKey }));
        return;
    }

    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const bodyRaw = Buffer.concat(chunks).toString();
                // Simulation response object
                await handleChatCompletion(req, res, bodyRaw);
            } catch (e) {
                console.error(e);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: String(e) }));
                }
            }
        });
        return;
    }

    res.writeHead(404);
    res.end("Not Found");
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Standalone] Listening on ${PORT}`);
});
