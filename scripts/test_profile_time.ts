import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function testProfileTime() {
    console.log(`=== Testing Timezone & Reset Info ===`);
    console.log(`Current Local Time (Node.js Date): ${new Date().toString()}`);
    console.log(`Current UTC Time: ${new Date().toISOString()}`);

    const authPath = path.join(process.env.HOME || '', '.config', 'opencode', 'auth.json');
    let apiKey = '';
    try {
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        apiKey = authData.pollinations_api_key;
    } catch (e) { return console.error("Key not found"); }

    try {
        const res = await fetch('https://gen.pollinations.ai/account/profile', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data: any = await res.json();
        console.log(`\nAPI nextResetAt: ${data.nextResetAt}`);

        const resetDate = new Date(data.nextResetAt);
        console.log(`Parsed nextResetAt Local: ${resetDate.toString()}`);
        console.log(`Parsed nextResetAt UTC: ${resetDate.toISOString()}`);

        const timeUntilMs = resetDate.getTime() - Date.now();
        console.log(`Time until reset (ms): ${timeUntilMs}`);
        console.log(`Time until reset (approx): ${(timeUntilMs / 1000 / 60 / 60).toFixed(2)} hours`);

        // Test the calculation done in quota.ts
        const now = new Date();
        const resetHour = resetDate.getUTCHours();
        const todayResetUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, resetDate.getUTCMinutes(), resetDate.getUTCSeconds()));

        console.log(`\nQuota.ts 'todayResetUTC' logic: ${todayResetUTC.toISOString()}`);

    } catch (e) { console.error(e); }
}

testProfileTime();
