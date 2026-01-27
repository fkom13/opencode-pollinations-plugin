
const fs = require('fs');
const path = require('path');
const { getAggregatedModels } = require('../dist/server/pollinations-api.js');

const CONFIG_PATH = path.join(process.env.HOME, '.config/opencode/opencode.json');

async function updateConfig() {
    console.log("🔍 Fetching Live Models from Pollinations API...");

    try {
        // Fetch raw list
        const response = await getAggregatedModels();
        const modelsList = response.data;

        console.log(`✅ Fetched ${modelsList.length} models.`);

        // Convert to Object Map for OpenCode
        const modelsObj = {};
        modelsList.forEach(m => {
            modelsObj[m.id] = {
                id: m.id,
                name: m.name,
                // Add sensible defaults if missing from API
                limit: { context: m.context_window || 32000, output: 4096 },
                modalities: { input: ['text'], output: ['text'] } // Basic assumption
            };

            // Refine modalities based on name
            if (m.id.includes('gemini') || m.id.includes('gpt-4o')) {
                modelsObj[m.id].modalities.input.push('image');
            }
        });

        // Read Config
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

            if (config.provider && config.provider.pollinations_enter) {
                console.log("💾 Updating opencode.json...");
                config.provider.pollinations_enter.models = modelsObj;

                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
                console.log("✅ opencode.json updated with Live Models!");
            } else {
                console.error("❌ 'pollinations_enter' provider not found in config.");
            }
        } else {
            console.error(`❌ Config file not found at ${CONFIG_PATH}`);
        }

    } catch (e) {
        console.error("❌ Error updating models:", e);
    }
}

updateConfig();
