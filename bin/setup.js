#!/usr/bin/env node
/**
 * opencode-pollinations-plugin setup CLI
 * Injects the plugin into ~/.config/opencode/opencode.json (or OPENCODE_CONFIG_DIR).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = require(path.join(__dirname, '..', 'package.json'));

const PLUGIN_SPEC = 'opencode-pollinations-plugin';

function getConfigPaths() {
    const custom = process.env.OPENCODE_CONFIG_DIR;
    const base = custom
        ? path.resolve(custom)
        : path.join(os.homedir(), '.config', 'opencode');
    return {
        dir: base,
        file: path.join(base, 'opencode.json'),
    };
}

function loadJson(file) {
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to parse ${file}: ${e.message}`);
        process.exit(1);
    }
}

function saveJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function ensurePlugin(config) {
    const plugins = Array.isArray(config.plugin)
        ? [...config.plugin]
        : Array.isArray(config.plugins)
            ? [...config.plugins]
            : [];

    const already = plugins.some((p) => {
        if (typeof p === 'string') {
            return p === PLUGIN_SPEC || p.includes('opencode-pollinations-plugin');
        }
        if (p && typeof p === 'object') {
            const id = p.id || p.name || p.package || '';
            return String(id).includes('opencode-pollinations-plugin');
        }
        return false;
    });

    if (!already) {
        plugins.push(PLUGIN_SPEC);
    }

    // Prefer singular "plugin" (OpenCode current) but keep existing key if present
    if (Array.isArray(config.plugins) && !Array.isArray(config.plugin)) {
        config.plugins = plugins;
    } else {
        config.plugin = plugins;
        if (config.plugins) delete config.plugins;
    }

    return { config, already, count: plugins.length };
}

function printHelp() {
    console.log(`
🌸 opencode-pollinations-plugin v${pkg.version}

Usage:
  npx opencode-pollinations-plugin          Inject plugin into OpenCode config
  npx opencode-pollinations-plugin --check  Check if plugin is already configured
  npx opencode-pollinations-plugin --help   Show this help

Config file:
  $OPENCODE_CONFIG_DIR/opencode.json
  or ~/.config/opencode/opencode.json

After install:
  1. Restart OpenCode
  2. Run: /poll login   (or /poll connect sk_...)
  3. Run: /poll help
`);
}

function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        return;
    }

    const { dir, file } = getConfigPaths();
    const checkOnly = args.includes('--check');

    console.log(`🌸 Pollinations OpenCode Plugin v${pkg.version}`);
    console.log(`📁 Config: ${file}`);

    const config = loadJson(file);
    const { config: next, already, count } = ensurePlugin(config);

    if (checkOnly) {
        if (already) {
            console.log(`✅ Plugin already configured (${count} plugin entr${count === 1 ? 'y' : 'ies'})`);
            process.exit(0);
        }
        console.log('❌ Plugin not found in config');
        process.exit(1);
    }

    if (already) {
        console.log('✅ Plugin already present in config — nothing to change.');
    } else {
        saveJson(file, next);
        console.log('✅ Plugin injected into OpenCode config.');
    }

    console.log(`
Next steps:
  1. Restart OpenCode
  2. /poll login          # 1-click device login
     or /poll connect sk_...
  3. /poll help           # commands & free tools
  4. /poll quests         # free Pollen waiting to claim
`);
}

main();
