import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function testUsageApi() {
    console.log("=== Testing Pollinations API Usage Limits & Balance ===");

    // Read API key from auth.json
    const authPath = path.join(process.env.HOME || '', '.config', 'opencode', 'auth.json');
    let apiKey = '';
    try {
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        apiKey = authData.pollinations_api_key;
        if (!apiKey) throw new Error("Key not found in json");
    } catch (e: any) {
        console.error("Failed to read API key:", e.message);
        process.exit(1);
    }

    // 1. Test /account/balance
    console.log("\n1. Fetching /account/balance...");
    try {
        const start = Date.now();
        const res = await fetch('https://gen.pollinations.ai/account/balance', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status} (Time: ${duration}ms)`);
        const data = await res.json();
        console.log("Balance Data:", data);
    } catch (e) { console.error(e); }

    // 2. Test /account/usage without limit (default)
    console.log("\n2. Fetching /account/usage (Default Limit)...");
    try {
        const start = Date.now();
        const res = await fetch('https://gen.pollinations.ai/account/usage', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status} (Time: ${duration}ms)`);
        const data: any = await res.json();
        const count = data.usage ? data.usage.length : 0;
        console.log(`Returned entries: ${count} (Count property: ${data.count})`);
    } catch (e) { console.error(e); }

    // 3. Test /account/usage with limit=5000
    console.log("\n3. Fetching /account/usage?limit=5000...");
    try {
        const start = Date.now();
        const res = await fetch('https://gen.pollinations.ai/account/usage?limit=5000', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status} (Time: ${duration}ms)`);
        const data: any = await res.json();
        const count = data.usage ? data.usage.length : 0;
        console.log(`Returned entries: ${count} (Count property: ${data.count})`);

        if (count > 0) {
            console.log(`Oldest entry: ${data.usage[data.usage.length - 1].timestamp}`);
            console.log(`Newest entry: ${data.usage[0].timestamp}`);
        }
    } catch (e) { console.error(e); }

}

testUsageApi();
