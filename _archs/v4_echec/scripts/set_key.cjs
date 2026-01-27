
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = '/home/fkomp/.config/opencode';
const CONFIG_PATH = path.join(CONFIG_DIR, 'pollinations-config.json');

const key = process.argv[2];

if (!key) {
    console.error("Usage: node set_key.cjs <api_key>");
    process.exit(1);
}

if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const current = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {};
current.apiKey = key;
current.mode = 'pro';

fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2));

console.log(`✅ Key saved to ${CONFIG_PATH}`);
console.log("Please restart OpenCode to see Enterprise models.");
