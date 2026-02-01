
// Simulate Environment
import { generatePollinationsConfig } from '../dist/server/generate-config.js';

async function run() {
    console.log("Testing generatePollinationsConfig()...");
    try {
        const models = await generatePollinationsConfig();
        console.log(`Result: ${models.length} models.`);
        models.forEach(m => {
            console.log(`- [${m.name}] ID: ${m.id} | Variants: ${Object.keys(m.variants || {}).join(',')}`);
        });
    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    }
}

run();
