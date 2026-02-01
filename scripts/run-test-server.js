
import * as http from 'http';
import { handleChatCompletion } from '../dist/server/proxy.js';

const PORT = 10001;

const server = http.createServer(async (req, res) => {
    // console.log(`[TestProxy compiled] ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        });
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "ok", version: "test-runner-compiled" }));
        return;
    }

    if (req.method === 'POST') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const bodyRaw = Buffer.concat(chunks).toString();
                await handleChatCompletion(req, res, bodyRaw);
            } catch (e) {
                console.error(e);
                res.writeHead(500);
                res.end(JSON.stringify({ error: String(e) }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Test Proxy (Compiled) running on port ${PORT}`);
});
