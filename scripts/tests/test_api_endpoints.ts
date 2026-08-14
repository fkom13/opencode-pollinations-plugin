MANUAL/LIVE ONLY — never run in CI. This suite performs REAL billable Pollinations generation or live-network probing. Run it manually with explicit balance tracking (Phase 3 canary protocol).
// Using Native Fetch in Node 22

const DUMMY_KEY = "dummy_anonymous_key_2026";
const REAL_KEY = process.env.POLLINATIONS_API_KEY || "YOUR_API_KEY_HERE";

if (REAL_KEY === "YOUR_API_KEY_HERE") {
    console.warn("⚠️ Warning: POLLINATIONS_API_KEY environment variable is missing. Real-key tests will likely fail.");
}

async function fetchModels(endpoint: string, type: 'text' | 'image') {
    console.log(`\n--- Fetching Free ${type} Models from ${endpoint} ---`);
    try {
        const res = await fetch(endpoint);
        const models: any[] = await res.json();
        const freeModels = models.filter(m => m.paid_only !== true);
        console.log(`Found ${freeModels.length} free ${type} models.`);
        return freeModels.map(m => m.name || m.id); // Image uses name, Text uses id usually
    } catch (e: any) {
        console.error(`Error fetching models: ${e.message}`);
        return [];
    }
}

async function testEndpoint(name: string, url: string, method: string, model: string, key: string, payload?: any) {
    const start = Date.now();
    try {
        const options: any = {
            method,
            headers: { 'Authorization': `Bearer ${key}` }
        };
        if (payload && method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(payload);
        }

        const res = await fetch(url, options);
        let preview = '';

        let isSuccess = false;

        if (res.ok) {
            // For images, we get a buffer. For text, json or plain text.
            if (url.includes('/image/')) {
                const dest = await res.arrayBuffer();
                preview = `[Image Buffer: ${dest.byteLength} bytes]`;
                isSuccess = dest.byteLength > 5000; // a very small image might be a returned error text as image
            } else {
                const text = await res.text();
                preview = text.substring(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '...' : '');

                // if it's chat completion, try to parse
                if (url.includes('/v1/chat/completions')) {
                    try {
                        const json = JSON.parse(text);
                        if (json.choices && json.choices[0] && json.choices[0].message) {
                            preview = json.choices[0].message.content.substring(0, 60).replace(/\n/g, ' ') + '...';
                            isSuccess = true;
                        } else if (json.error) {
                            preview = `Error: ${json.error}`;
                            isSuccess = false;
                        }
                    } catch (e) { }
                } else {
                    // Get /text
                    isSuccess = text.length > 2 && !text.toLowerCase().includes('error');
                }
            }
        } else {
            preview = await res.text();
            preview = preview.substring(0, 60).replace(/\n/g, ' ');
        }

        const duration = Date.now() - start;
        const symbol = res.ok && isSuccess ? '✅' : '❌';

        console.log(`[${symbol}] ${name} | Model: ${model.padEnd(15)} | Status: ${res.status} | Time: ${duration}ms | Resp: ${preview}`);
        return { success: res.ok && isSuccess, status: res.status, model };

    } catch (e: any) {
        console.log(`[❌] ${name} | Model: ${model.padEnd(15)} | Exception: ${e.message}`);
        return { success: false, status: 0, model };
    }
}

async function runTests() {
    console.log("==================================================");
    console.log(" API REALITY CHECK : FREE MODELS vs (DUMMY | REAL) KEY ");
    console.log("==================================================");

    const textModelsInfo = await fetchModels('https://gen.pollinations.ai/text/models', 'text');
    const imageModelsInfo = await fetchModels('https://gen.pollinations.ai/image/models', 'image');

    const promptText = "Hello say 'Test successful'";
    const promptImage = "A simple red apple on a white background";

    // Select a subset to avoid spamming the API (let's say 4 models max per category)
    const textModels = textModelsInfo.slice(0, 4);
    const imageModels = imageModelsInfo.slice(0, 4);

    console.log(`\n\n=== PHASE 1: TESTING WITH DUMMY KEY (${DUMMY_KEY}) ===`);

    console.log("\n--- Testing GET /text/{prompt} ---");
    for (const model of textModels) {
        const url = `https://gen.pollinations.ai/text/${encodeURIComponent(promptText)}?model=${model}`;
        await testEndpoint('GET_TEXT', url, 'GET', model, DUMMY_KEY);
    }

    console.log("\n--- Testing POST /v1/chat/completions ---");
    for (const model of textModels) {
        const url = `https://gen.pollinations.ai/v1/chat/completions`;
        const payload = { model, messages: [{ role: 'user', content: promptText }] };
        await testEndpoint('POST_CHAT', url, 'POST', model, DUMMY_KEY, payload);
    }

    console.log("\n--- Testing GET /image/{prompt} ---");
    for (const model of imageModels) {
        const url = `https://gen.pollinations.ai/image/${encodeURIComponent(promptImage)}?model=${model}`;
        await testEndpoint('GET_IMAGE', url, 'GET', model, DUMMY_KEY);
    }

    console.log(`\n\n=== PHASE 2: TESTING WITH REAL KEY (sk_***) ===`);

    console.log("\n--- Testing GET /text/{prompt} ---");
    for (const model of textModels) {
        const url = `https://gen.pollinations.ai/text/${encodeURIComponent(promptText)}?model=${model}`;
        await testEndpoint('GET_TEXT', url, 'GET', model, REAL_KEY);
    }

    console.log("\n--- Testing POST /v1/chat/completions ---");
    for (const model of textModels) {
        const url = `https://gen.pollinations.ai/v1/chat/completions`;
        const payload = { model, messages: [{ role: 'user', content: promptText }] };
        await testEndpoint('POST_CHAT', url, 'POST', model, REAL_KEY, payload);
    }

    console.log("\n--- Testing GET /image/{prompt} ---");
    for (const model of imageModels) {
        const url = `https://gen.pollinations.ai/image/${encodeURIComponent(promptImage)}?model=${model}&nologo=true`;
        await testEndpoint('GET_IMAGE', url, 'GET', model, REAL_KEY);
    }

}

runTests();
