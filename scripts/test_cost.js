import * as https from 'https';
import * as fs from 'fs';

const KEY = 'sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H'; // Extracted from test_wan_t2v.js

function testEndpoint(url, method = 'GET', options = {}) {
    console.log(`\nTesting ${method} ${url}...`);
    return new Promise((resolve, reject) => {
        const req = https.request(url, { method, ...options }, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log('--- Headers ---');
            const costHeaders = Object.keys(res.headers).filter(k => k.startsWith('x-usage') || k === 'x-model-used' || k === 'x-request-id' || k === 'x-cache');
            if (costHeaders.length === 0) {
                console.log('❌ NO x-usage HEADERS FOUND!');
            } else {
                costHeaders.forEach(k => console.log(`${k}: ${res.headers[k]}`));
            }
            res.on('data', () => { });
            res.on('end', resolve);
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log("=== IMAGE MODEL (GET, Paid Flux) ===");
    await testEndpoint('https://gen.pollinations.ai/image/a%20cute%20cat?model=flux&private=true&nologo=true', 'GET', {
        headers: { 'Authorization': `Bearer ${KEY}` }
    });

    console.log("\n=== TEXT MODEL (POST, OpenAI) ===");
    const jsonBody = JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello' }],
        model: 'openai'
    });
    await testEndpoint('https://gen.pollinations.ai/openai/chat/completions', 'POST', {
        headers: {
            'Authorization': `Bearer ${KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonBody)
        }
    });
}

run();
