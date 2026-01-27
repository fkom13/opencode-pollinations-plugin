
const https = require('https');

async function testPost(url, payload, headers = {}) {
    return new Promise((resolve) => {
        console.log(`Testing POST ${url} with model=${payload.model}...`);
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'curl/8.5.0',
                ...headers
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode !== 200) console.log(`Response: ${data.slice(0, 100)}...`);
                resolve(res.statusCode === 200);
            });
        });
        req.on('error', e => {
            console.log(`Error: ${e.message}`);
            resolve(false);
        });
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function run() {
    const payload = {
        model: "gemini", // Testing the Problematic Model
        messages: [{ role: "user", content: "Hello" }]
    };

    console.log("--- Endpoint 1: /openai/chat/completions (V4 Current) ---");
    await testPost('https://text.pollinations.ai/openai/chat/completions', payload);

    console.log("\n--- Endpoint 2: / (Root - Likely V3) ---");
    await testPost('https://text.pollinations.ai/', payload);
}

run();
