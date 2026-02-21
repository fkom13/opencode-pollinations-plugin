import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function loadKey() {
    const authPath = path.join(os.homedir(), '.pollinations', 'auth.json');
    if (fs.existsSync(authPath)) {
        return JSON.parse(fs.readFileSync(authPath, 'utf8')).apiKey;
    }
    return null;
}

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
    const key = loadKey();
    if (!key) { console.log('No key found!'); return; }
    await testEndpoint('https://gen.pollinations.ai/image/a%20cute%20cat?model=flux&private=true&nologo=true', 'GET', {
        headers: { 'Authorization': `Bearer ${key}` }
    });

    // Test a text generation (chat/completions)
    const jsonBody = JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello' }],
        model: 'openai'
    });
    await testEndpoint('https://gen.pollinations.ai/openai/chat/completions', 'POST', {
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonBody)
        }
    });
}

run();
