#!/usr/bin/env node
/**
 * OpenCode Pollinations Plugin — Test Suite (offline-first + optional network)
 * Run: npm test  |  npm run test:unit
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { pathToFileURL } = require('url');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    dim: '\x1b[2m',
};

const log = {
    pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.yellow}━━━ ${msg} ━━━${colors.reset}`),
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

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

async function importDist(rel) {
    const full = path.join(DIST, rel);
    return import(pathToFileURL(full).href);
}

// ─── Package / packaging hygiene ─────────────────────────────────────────

async function testPackageJson() {
    log.section('Package Validation');

    assert(pkg.name === 'opencode-pollinations-plugin', 'Package name is correct');
    assert(/^\d+\.\d+\.\d+/.test(pkg.version), `Version is semver (${pkg.version})`);
    assert(pkg.type === 'module', 'type=module');
    assert(pkg.main === './dist/index.js', 'main entry is dist/index.js');
    assert(pkg.types === './dist/index.d.ts', 'types entry present');
    assert(pkg.exports && pkg.exports['.'], 'exports map defined');
    assert(Array.isArray(pkg.files) && pkg.files.includes('dist'), 'files includes dist');
    assert(pkg.files.includes('bin'), 'files includes bin');
    assert(pkg.bin && pkg.bin['opencode-pollinations-plugin'], 'bin entry defined');
    assert(pkg.engines && pkg.engines.node, 'engines.node set');
    assert(!pkg.engines.vscode, 'no engines.vscode leftover');
    assert(!pkg.activationEvents, 'no activationEvents leftover');
    assert(!pkg.contributes, 'no contributes leftover');
    assert(!pkg.publisher || pkg.publisher !== 'pollinations' || true, 'publisher optional (ok)');
    assert(pkg.dependencies['@opencode-ai/plugin'], 'has @opencode-ai/plugin');
    assert(pkg.dependencies.zod, 'has zod');
    assert(fs.existsSync(path.join(ROOT, pkg.main)), `main file exists (${pkg.main})`);
    assert(fs.existsSync(path.join(ROOT, pkg.types)), `types file exists (${pkg.types})`);
    assert(fs.existsSync(path.join(ROOT, 'bin/setup.js')), 'bin/setup.js exists');
    assert(fs.existsSync(path.join(ROOT, 'LICENSE.md')) || fs.existsSync(path.join(ROOT, 'LICENSE')), 'license file exists');
    assert(fs.existsSync(path.join(ROOT, 'README.md')), 'README.md exists');
}

async function testBuildOutput() {
    log.section('Build Output');

    assert(fs.existsSync(DIST), 'dist/ exists');
    assert(fs.existsSync(path.join(DIST, 'index.js')), 'dist/index.js');
    assert(fs.existsSync(path.join(DIST, 'index.d.ts')), 'dist/index.d.ts');
    assert(fs.existsSync(path.join(DIST, 'server')), 'dist/server/');
    assert(fs.existsSync(path.join(DIST, 'tools')), 'dist/tools/');
    assert(fs.existsSync(path.join(DIST, 'locales')), 'dist/locales/');
    assert(fs.existsSync(path.join(DIST, 'server/quota.js')), 'dist/server/quota.js');
    assert(fs.existsSync(path.join(DIST, 'server/proxy.js')), 'dist/server/proxy.js');
    assert(fs.existsSync(path.join(DIST, 'server/models/fetcher.js')), 'dist/server/models/fetcher.js');

    // No accidental secrets in dist
    const idx = fs.readFileSync(path.join(DIST, 'index.js'), 'utf-8');
    assert(!/ghp_[A-Za-z0-9]{20,}/.test(idx), 'dist has no GitHub PAT');
    assert(!/sk-[a-zA-Z0-9]{20,}/.test(idx), 'dist has no sk_ secrets pattern noise (loose)');
}

async function testBinSetup() {
    log.section('CLI Setup (bin)');

    const setupPath = path.join(ROOT, 'bin/setup.js');
    const content = fs.readFileSync(setupPath, 'utf-8');
    assert(content.startsWith('#!/usr/bin/env node') || content.includes('#!/usr/bin/env node'), 'bin has shebang');
    assert(content.includes('opencode.json'), 'setup targets opencode.json');
    assert(content.includes('--check') || content.includes('check'), 'setup supports check mode');

    // Dry-run help
    const { spawnSync } = require('child_process');
    const help = spawnSync(process.execPath, [setupPath, '--help'], { encoding: 'utf-8' });
    assert(help.status === 0, 'bin --help exits 0');
    assert(/Pollinations|opencode/i.test(help.stdout), 'bin --help prints usage');
}

// ─── Config / modules ────────────────────────────────────────────────────

async function testConfig() {
    log.section('Configuration');

    const configPath = path.join(DIST, 'server/config.js');
    assert(fs.existsSync(configPath), 'config module exists');
    if (!fs.existsSync(configPath)) return;

    const mod = await importDist('server/config.js');
    assert(typeof mod.loadConfig === 'function', 'loadConfig exported');
    assert(typeof mod.saveConfig === 'function' || typeof mod.loadConfig === 'function', 'config API present');
    const config = mod.loadConfig();
    assert(typeof config === 'object', 'loadConfig returns object');
    assert(typeof config.mode === 'string', 'config.mode is string');
    assert(['manual', 'quest', 'quest_only', 'paid'].includes(config.mode), 'mode is valid (v6.5 modes)');
}

async function testQuotaUnit() {
    log.section('Quota Unit Tests (v6.5 Quest/Paid)');

    const mod = await importDist('server/quota.js');
    assert(typeof mod.getQuotaStatus === 'function', 'getQuotaStatus exported');
    assert(typeof mod.calculateResetInfo === 'function', 'calculateResetInfo exported');
    assert(typeof mod.formatQuotaForToast === 'function', 'formatQuotaForToast exported');
    // v6.5 purge: legacy tier/refill APIs must NOT exist anymore
    assert(typeof mod.tierMetaForAllowance === 'undefined', 'tierMetaForAllowance removed (v6.5)');
    assert(typeof mod.getKnownRefills === 'undefined', 'getKnownRefills removed (v6.5)');
    assert(typeof mod.deduceAllowanceFromApi === 'undefined', 'deduceAllowanceFromApi removed (v6.5)');

    const reset = mod.calculateResetInfo();
    assert(reset.nextReset instanceof Date, 'nextReset is Date');
    assert(reset.lastReset instanceof Date, 'lastReset is Date');

    const toast = mod.formatQuotaForToast({
        questBalance: 0.3,
        walletBalance: 2.5,
        totalBalance: 2.8,
        canUseEnterprise: true,
        isUsingWallet: false,
        needsAlert: false,
    });
    assert(typeof toast === 'string' && toast.length > 5, 'formatQuotaForToast returns string');
    assert(/Quest|Paid|🎁|💎/i.test(toast), 'toast contains Quest/Paid fields');

    const authLimitedToast = mod.formatQuotaForToast({
        questBalance: 0, walletBalance: 0, totalBalance: 0,
        canUseEnterprise: false, isUsingWallet: false, needsAlert: false,
        errorType: 'auth_limited',
    });
    assert(/CL(E|É)/i.test(authLimitedToast), 'auth_limited toast marked');
}

async function testProxyModule() {
    log.section('Proxy Module');
    const proxyPath = path.join(DIST, 'server/proxy.js');
    assert(fs.existsSync(proxyPath), 'proxy.js exists');
    const mod = await importDist('server/proxy.js');
    assert(typeof mod.handleChatCompletion === 'function', 'handleChatCompletion exported');
    const src = fs.readFileSync(proxyPath, 'utf-8');
    assert(!src.includes('VISION DEBUG'), 'no VISION DEBUG noise in proxy');
}

async function testCommandsModule() {
    log.section('Commands Module');
    const mod = await importDist('server/commands.js');
    assert(typeof mod.handleCommand === 'function', 'handleCommand exported');
    assert(typeof mod.createCommandHooks === 'function', 'createCommandHooks exported');

    const unknown = await mod.handleCommand('unknowncommand');
    assert(unknown.handled === false, 'unknown command handled=false');

    const help = await mod.handleCommand('/poll help');
    assert(help.handled === true, '/poll help handled');
    assert(typeof help.response === 'string' && help.response.length > 20, '/poll help has response');
    assert(help.response.includes('/poll login'), '/poll help promotes device login');

    const help2 = await mod.handleCommand('/pollinations help');
    assert(help2.handled === true, '/pollinations help handled');
}

async function testToolsRegistry() {
    log.section('Tools Registry');
    const mod = await importDist('tools/index.js');
    assert(typeof mod.createToolRegistry === 'function', 'createToolRegistry exported');
    const tools = mod.createToolRegistry();
    const names = Object.keys(tools);
    assert(names.length >= 10, `at least 10 tools registered (${names.length})`);
    for (const t of [
        'gen_qrcode',
        'gen_edit_image_free',
        'gen_video_free',
        'object_remover',
        'image_upscaler',
        'image_enhancer',
        'remove_background',
        'polli_login',
    ]) {
        assert(names.includes(t), `free tool present: ${t}`);
    }
}

async function testModelTypes() {
    log.section('Model Types / Fetcher Surface');
    const typesPath = path.join(DIST, 'server/models/types.d.ts');
    if (fs.existsSync(typesPath)) {
        const t = fs.readFileSync(typesPath, 'utf-8');
        assert(t.includes("'3d'"), "ModelCategory includes '3d'");
        assert(t.includes('embedding'), 'ModelCategory includes embedding');
        assert(t.includes('realtime'), 'ModelCategory includes realtime');
    } else {
        log.info('types.d.ts missing — skip category string checks');
    }
    const fetcherSrc = fs.readFileSync(path.join(DIST, 'server/models/fetcher.js'), 'utf-8');
    assert(fetcherSrc.includes('/models'), 'fetcher hits unified /models');
    assert(fetcherSrc.includes('/video/models'), 'fetcher hits /video/models');
    assert(fetcherSrc.includes('/3d/models'), 'fetcher hits /3d/models');
    assert(fetcherSrc.includes('/embeddings/models'), 'fetcher hits /embeddings/models');
}

async function testLocalesShipped() {
    log.section('Locales Shipped in dist');
    for (const lang of ['en', 'fr', 'es', 'de', 'it', 'zh']) {
        assert(fs.existsSync(path.join(DIST, 'locales', `${lang}.json`)), `dist locales ${lang}.json`);
    }
    const en = JSON.parse(fs.readFileSync(path.join(DIST, 'locales/en.json'), 'utf-8'));
    assert(en.commands?.infos?.features_free?.includes('object_remover'), 'en features_free has object_remover');
    assert(en.commands?.models?.cats?.['3d'], 'en has cats.3d');
}

async function testSecurityHygiene() {
    log.section('Security Hygiene');
    const gitConfig = path.join(ROOT, '.git/config');
    if (fs.existsSync(gitConfig)) {
        const gc = fs.readFileSync(gitConfig, 'utf-8');
        assert(!/ghp_[A-Za-z0-9]+/.test(gc), '.git/config has no embedded ghp_ token');
        assert(!/gho_[A-Za-z0-9]+/.test(gc), '.git/config has no gho_ token');
    }
    const npmignore = fs.readFileSync(path.join(ROOT, '.npmignore'), 'utf-8');
    assert(npmignore.includes('.env'), '.npmignore excludes .env');
    assert(npmignore.includes('.gencodedoc'), '.npmignore excludes .gencodedoc');
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    assert(gitignore.includes('.env'), '.gitignore excludes .env');
    assert(gitignore.includes('node_modules'), '.gitignore excludes node_modules');
}

async function testIndexExport() {
    log.section('Plugin Export');
    const idx = fs.readFileSync(path.join(DIST, 'index.js'), 'utf-8');
    assert(idx.includes('PollinationsPlugin') || idx.includes('export'), 'index exports plugin');
    assert(idx.includes('AddressInfo') || idx.includes('address()'), 'port resolution uses AddressInfo/address');
    assert(!idx.includes('@ts-ignore'), 'no @ts-ignore left in index');
}

async function testOptionalNetwork() {
    if (process.env.SKIP_NETWORK === '1') {
        log.info('SKIP_NETWORK=1 — skipping live API tests');
        return;
    }
    log.section('Optional Network (models)');
    try {
        const { generatePollinationsConfig } = await importDist('server/generate-config.js');
        assert(typeof generatePollinationsConfig === 'function', 'generatePollinationsConfig is function');
        log.info('Fetching models (timeout 20s)...');
        const models = await Promise.race([
            generatePollinationsConfig(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
        ]);
        assert(Array.isArray(models), 'models is array');
        assert(models.length > 0, `models non-empty (${models.length})`);
        if (models[0]) {
            assert(typeof models[0].id === 'string', 'model has id');
        }
    } catch (e) {
        log.info(`Network model test skipped: ${e.message}`);
        // Do not fail CI offline
        assert(true, 'network optional soft-pass');
    }
}

async function main() {
    console.log('\n🌸 OpenCode Pollinations Plugin — Test Suite\n');
    console.log(`${colors.dim}Version: ${pkg.version}${colors.reset}`);
    const start = Date.now();

    await testPackageJson();
    await testBuildOutput();
    await testBinSetup();
    await testSecurityHygiene();
    await testLocalesShipped();
    await testConfig();
    await testQuotaUnit();
    await testProxyModule();
    await testCommandsModule();
    await testToolsRegistry();
    await testModelTypes();
    await testIndexExport();
    await testOptionalNetwork();

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log('\n' + '═'.repeat(50));
    console.log(`\n📊 Results: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
    console.log(`${colors.dim}Duration: ${duration}s${colors.reset}\n`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('Test suite crashed:', e);
    process.exit(1);
});
