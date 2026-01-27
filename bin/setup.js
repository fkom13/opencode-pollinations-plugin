#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🌸 Pollinations Plugin Setup');

// 1. Locate Config
const configDir = path.join(os.homedir(), '.config', 'opencode');
const configFile = path.join(configDir, 'opencode.json');

if (!fs.existsSync(configFile)) {
    console.error(`❌ OpenCode config not found at: ${configFile}`);
    console.log('   Please run OpenCode once to generate it.');
    process.exit(1);
}

// 2. Read Config
let config;
try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
    console.error('❌ Failed to parse opencode.json');
    process.exit(1);
}

// 3. Detect Plugin Path
// We use the absolute path of THIS package installation to be safe
const pluginPath = path.resolve(__dirname, '..');
console.log(`📍 Plugin Path: ${pluginPath}`);

// 4. Update Config
if (!config.plugin) {
    config.plugin = [];
}

const pluginName = 'opencode-pollinations-plugin';
const alreadyExists = config.plugin.some(p => p === pluginName || p.includes('opencode-pollinations-plugin'));

if (!alreadyExists) {
    // We strive to use the CLEAN name if possible, but fallback to absolute path if installed locally
    // For global installs, absolute path is safest across envs
    config.plugin.push(pluginPath);
    console.log('✅ Added plugin to configuration.');

    // Backup
    fs.writeFileSync(configFile + '.bak', fs.readFileSync(configFile));

    // Write
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    console.log(`✨ Configuration saved: ${configFile}`);
} else {
    console.log('✅ Plugin already configured.');
}

console.log('\n🚀 Setup Complete! Restart OpenCode to see models.');
