
import { generatePollinationsConfig } from '../src/server/generate-config.js';

async function main() {
    console.log("--- Verifying Config Generation ---");
    try {
        const models = await generatePollinationsConfig();
        console.log(`Generated ${models.length} models.`);

        const gemini = models.find(m => m.id === 'free/gemini');
        if (gemini) {
            console.log("✅ free/gemini FOUND:", JSON.stringify(gemini, null, 2));
        } else {
            console.log("❌ free/gemini NOT FOUND");
        }

        const fullGemini = models.find(m => m.id === 'pollinations/free/gemini');
        if (fullGemini) {
            console.log("✅ pollinations/free/gemini FOUND:", JSON.stringify(fullGemini, null, 2));
        } else {
            console.log("ℹ️  pollinations/free/gemini NOT FOUND (Expected if we use relative IDs)");
        }

    } catch (e) {
        console.error("Error generating config:", e);
    }
}

main();
