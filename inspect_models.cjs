const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Read key
const CONFIG_FILE = path.join(os.homedir(), '.pollinations/config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
const apiKey = config.apiKey;

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
    });
}

(async () => {
    console.log('Fetching models...');
    const models = await fetchJson('https://gen.pollinations.ai/text/models');
    
    const paidModels = ['gemini-large', 'claude-large', 'veo', 'seedream-pro', 'nanobanana-pro'];
    
    console.log('\n--- TARGET MODELS ---');
    models.forEach(m => {
        if (paidModels.includes(m.name) || paidModels.includes(m.id)) {
            console.log(JSON.stringify(m, null, 2));
        }
    });

    // Check for specific flags in ALL models
    console.log('\n--- SCANNING FLAGS ---');
    const flags = new Set();
    models.forEach(m => {
        Object.keys(m).forEach(k => flags.add(k));
    });
    console.log('Available keys:', Array.from(flags));
})();
