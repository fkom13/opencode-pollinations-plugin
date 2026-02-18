#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODE = process.argv[2]; // 'local' or 'npm'
const PLUGIN_NAME = 'opencode-pollinations-plugin';
const USER_CONFIG_PATH = path.join(process.env.HOME, '.config/opencode/opencode.json');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');

if (!['local', 'npm'].includes(MODE)) {
    console.error(`Usage: node scripts/switch-mode.js [local|npm]`);
    process.exit(1);
}

function readJson(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

try {
    const userConfig = readJson(USER_CONFIG_PATH);
    const pkg = readJson(PACKAGE_JSON_PATH);

    if (MODE === 'local') {
        console.log('🔄 Switching to LOCAL DEV mode (Absolute Path)...');

        // Use absolute path to the project root
        const projectPath = path.resolve(__dirname, '..');
        console.log(`📍 Local plugin path: ${projectPath}`);

        // 2. Deploy locally first (Build step is critical for path-based loading too)
        console.log('📦 Running deploy-local.sh to build...');
        const deployScript = path.join(__dirname, 'deploy-local.sh');
        execSync(`bash "${deployScript}"`, { stdio: 'inherit' });

        // 3. Update opencode.json to point to local path
        console.log(`🔒 Setting opencode.json to path: ${projectPath}...`);

        let pathSet = false;
        userConfig.plugin = userConfig.plugin.map(p => {
            if (p.includes('opencode-pollinations-plugin') || p === projectPath) {
                pathSet = true;
                return projectPath;
            }
            return p;
        });

        if (!pathSet) {
            userConfig.plugin.push(projectPath);
        }

    } else if (MODE === 'npm') {
        console.log('🔄 Switching to NPM (@latest) mode...');

        // Update opencode.json to use latest
        console.log(`🔓 Setting opencode.json to package: ${PLUGIN_NAME}@latest...`);

        let pkgSet = false;
        userConfig.plugin = userConfig.plugin.map(p => {
            if (p.includes('opencode-pollinations-plugin') || p.includes('/opencode-pollinations-plugin')) {
                pkgSet = true;
                return `${PLUGIN_NAME}@latest`;
            }
            return p;
        });

        if (!pkgSet) {
            userConfig.plugin.push(`${PLUGIN_NAME}@latest`);
        }
    }

    writeJson(USER_CONFIG_PATH, userConfig);
    console.log(`✅ switch-mode to '${MODE}' completed successfully.`);
    console.log(`👉 Please restart/reload OpenCode now.`);

} catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
}
