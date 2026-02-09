#!/usr/bin/env node
/**
 * 🧪 OpenCode Pollinations Plugin - Test Suite
 * 
 * Run with: npm test
 * Or directly: node scripts/test-suite.js
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    dim: '\x1b[2m'
};

const log = {
    pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.yellow}━━━ ${msg} ━━━${colors.reset}`)
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        passed++;
        log.pass(testName);
    } else {
        failed++;
        log.fail(testName);
    }
}

// ════════════════════════════════════════════════════════════════
// TEST 1: Configuration Module
// ════════════════════════════════════════════════════════════════

async function testConfig() {
    log.section('Configuration Tests');

    const configPath = path.join(__dirname, '../dist/server/config.js');

    // Test 1.1: Config module exists
    assert(fs.existsSync(configPath), 'Config module exists (dist/server/config.js)');

    if (!fs.existsSync(configPath)) {
        log.info('Skipping config tests - module not built');
        return;
    }

    const { loadConfig, saveConfig, DEFAULT_CONFIG } = require(configPath);

    // Test 1.2: loadConfig returns valid object
    const config = loadConfig();
    assert(typeof config === 'object', 'loadConfig() returns an object');

    // Test 1.3: Config has required fields
    assert(typeof config.mode === 'string', 'Config has mode field');
    assert(['manual', 'alwaysfree', 'pro'].includes(config.mode), 'Mode is valid (manual|alwaysfree|pro)');

    // Test 1.4: Config has GUI settings
    assert(typeof config.gui === 'object', 'Config has gui settings object');

    // Test 1.5: Version is present
    assert(typeof config.version === 'string' || typeof config.version === 'number', 'Config has version');
}

// ════════════════════════════════════════════════════════════════
// TEST 2: Generate Config (Model Discovery)
// ════════════════════════════════════════════════════════════════

async function testGenerateConfig() {
    log.section('Model Discovery Tests');

    const genConfigPath = path.join(__dirname, '../dist/server/generate-config.js');

    // Test 2.1: Module exists
    assert(fs.existsSync(genConfigPath), 'Generate-config module exists');

    if (!fs.existsSync(genConfigPath)) {
        log.info('Skipping model discovery tests - module not built');
        return;
    }

    const { generatePollinationsConfig } = require(genConfigPath);

    // Test 2.2: Function is exported
    assert(typeof generatePollinationsConfig === 'function', 'generatePollinationsConfig is a function');

    // Test 2.3: Returns array of models (can fail if no network)
    try {
        log.info('Fetching models from Pollinations API (may take a few seconds)...');
        const models = await generatePollinationsConfig();
        assert(Array.isArray(models), 'generatePollinationsConfig returns an array');
        assert(models.length > 0, `Found ${models.length} models`);

        // Test 2.4: Models have required structure
        if (models.length > 0) {
            const sample = models[0];
            assert(typeof sample.id === 'string', 'Model has id field');
            assert(typeof sample.name === 'string', 'Model has name field');
        }
    } catch (e) {
        log.info(`Model fetch skipped (network error: ${e.message})`);
    }
}

// ════════════════════════════════════════════════════════════════
// TEST 3: Proxy Module Structure
// ════════════════════════════════════════════════════════════════

async function testProxyModule() {
    log.section('Proxy Module Tests');

    const proxyPath = path.join(__dirname, '../dist/server/proxy.js');

    // Test 3.1: Module exists
    assert(fs.existsSync(proxyPath), 'Proxy module exists (dist/server/proxy.js)');

    if (!fs.existsSync(proxyPath)) {
        log.info('Skipping proxy tests - module not built');
        return;
    }

    const proxyModule = require(proxyPath);

    // Test 3.2: handleChatCompletion is exported
    assert(typeof proxyModule.handleChatCompletion === 'function', 'handleChatCompletion is exported');
}

// ════════════════════════════════════════════════════════════════
// TEST 4: Commands Module
// ════════════════════════════════════════════════════════════════

async function testCommandsModule() {
    log.section('Commands Module Tests');

    const commandsPath = path.join(__dirname, '../dist/server/commands.js');

    // Test 4.1: Module exists
    assert(fs.existsSync(commandsPath), 'Commands module exists');

    if (!fs.existsSync(commandsPath)) {
        log.info('Skipping commands tests - module not built');
        return;
    }

    const { handleCommand, createCommandHooks } = require(commandsPath);

    // Test 4.2: handleCommand is exported
    assert(typeof handleCommand === 'function', 'handleCommand is a function');

    // Test 4.3: createCommandHooks is exported  
    assert(typeof createCommandHooks === 'function', 'createCommandHooks is a function');

    // Test 4.4: handleCommand returns result for unknown command
    const result = await handleCommand('unknowncommand');
    assert(result.handled === false, 'Unknown command returns handled=false');

    // Test 4.5: handleCommand recognizes /pollinations
    const polResult = await handleCommand('/pollinations help');
    assert(polResult.handled === true, '/pollinations help is handled');
}

// ════════════════════════════════════════════════════════════════
// TEST 5: Package.json Validation
// ════════════════════════════════════════════════════════════════

async function testPackageJson() {
    log.section('Package Validation Tests');

    const pkgPath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // Test 5.1: Name is correct
    assert(pkg.name === 'opencode-pollinations-plugin', 'Package name is correct');

    // Test 5.2: Version follows semver
    assert(/^\d+\.\d+\.\d+/.test(pkg.version), `Version is semver (${pkg.version})`);

    // Test 5.3: Main entry point exists
    const mainPath = path.join(__dirname, '..', pkg.main);
    assert(fs.existsSync(mainPath), `Main entry point exists (${pkg.main})`);

    // Test 5.4: Has required dependencies
    assert(pkg.dependencies['@opencode-ai/plugin'], 'Has @opencode-ai/plugin dependency');

    // Test 5.5: Files field is restrictive
    assert(Array.isArray(pkg.files), 'Files field is defined');
    assert(pkg.files.includes('dist'), 'Files includes dist/');
}

// ════════════════════════════════════════════════════════════════
// TEST 6: Build Output Validation
// ════════════════════════════════════════════════════════════════

async function testBuildOutput() {
    log.section('Build Output Tests');

    const distPath = path.join(__dirname, '../dist');

    // Test 6.1: dist/ exists
    assert(fs.existsSync(distPath), 'dist/ directory exists');

    // Test 6.2: index.js exists
    assert(fs.existsSync(path.join(distPath, 'index.js')), 'dist/index.js exists');

    // Test 6.3: server/ subdirectory exists
    assert(fs.existsSync(path.join(distPath, 'server')), 'dist/server/ exists');

    // Test 6.4: No source maps in production (optional)
    const hasSourceMaps = fs.readdirSync(distPath).some(f => f.endsWith('.map'));
    log.info(`Source maps present: ${hasSourceMaps ? 'yes' : 'no'}`);
}

// ════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ════════════════════════════════════════════════════════════════

async function main() {
    console.log('\n🌸 OpenCode Pollinations Plugin - Test Suite\n');
    console.log(`${colors.dim}Version: ${require('../package.json').version}${colors.reset}`);

    const startTime = Date.now();

    await testPackageJson();
    await testBuildOutput();
    await testConfig();
    await testGenerateConfig();
    await testProxyModule();
    await testCommandsModule();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(50));
    console.log(`\n📊 Results: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
    console.log(`${colors.dim}Duration: ${duration}s${colors.reset}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Test suite crashed:', e);
    process.exit(1);
});
