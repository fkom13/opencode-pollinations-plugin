#!/usr/bin/env node
/**
 * UX Legacy Vocabulary Guard (v6.5) — semantic scan over maintained
 * runtime files / locales / docs.
 *
 * Forbidden PRODUCT/UX vocabulary (old tier/refill model):
 *   - hourly refill / refill at :00 / reset at the top of the hour
 *   - Spore/Seed-as-tier/Flower/Nectar/Router tier table names
 *   - "Free Tier" / "Enter Tier" billing language
 *   - daily free Pollen quota
 *   - refillOverride / questStashInFreeMode
 *   - alwaysfree / always-free as current user-facing mode
 *   - threshold_tier as current UI setting
 *
 * Whitelist:
 *   - technical backend schema: meter_source === 'tier', balanceBucket === 'tier'
 *     (bare 'tier' is never forbidden here)
 *   - config.ts legacy migration map (alwaysfree → quest technical mapping)
 *   - historical/migration docs: CHANGELOG.md, docs/V65_MIGRATION.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m' };
const log = {
    pass: (m) => console.log(`${colors.green}✓${colors.reset} ${m}`),
    fail: (m) => console.log(`${colors.red}✗${colors.reset} ${m}`),
    info: (m) => console.log(`${colors.blue}ℹ${colors.reset} ${m}`),
    section: (m) => console.log(`\n${colors.yellow}━━━ ${m} ━━━${colors.reset}`),
};

let passed = 0;
let failed = 0;
function assert(cond, name) { cond ? (passed++, log.pass(name)) : (failed++, log.fail(name)); }

const FORBIDDEN = [
    { id: 'hourly refill', re: /hourly\s+refill/i },
    { id: 'refill at :00', re: /refill\s+(?:at\s+:00|at the top of)/i },
    { id: 'reset at top of hour', re: /resets?\s+(?:automatically\s+)?at\s+(?:the\s+)?(?:top\s+of\s+(?:the\s+)?(?:every\s+)?hour|:00)/i },
    { id: 'tier name Spore', re: /\bSpore\b/ },
    { id: 'tier name Flower', re: /\bFlower\b/ },
    { id: 'tier name Nectar', re: /\bNectar\b/ },
    { id: 'tier name Router (as tier)', re: /\bRouter\b/ },
    { id: 'Free Tier billing language', re: /\bFree\s+Tiers?\b/i },
    { id: 'Enter Tier billing language', re: /\bEnter\s+Tiers?\b/i },
    { id: 'daily free Pollen quota', re: /daily\s+free\s+pollen\s+quota/i },
    { id: 'refillOverride', re: /refillOverride/ },
    { id: 'questStashInFreeMode', re: /questStashInFreeMode/ },
    { id: 'alwaysfree mode name', re: /alwaysfree/i },
    { id: 'always-free mode name', re: /always-free/i },
    { id: 'threshold_tier UI setting', re: /threshold_tier/ },
];

// Rules that are context-sensitive:
// "Router" is a technical term in source code and tech docs (Request Router,
// OpenRouter) — the tier-name check only applies to user-facing copy.
const FORBIDDEN_USER_FACING = FORBIDDEN;
const FORBIDDEN_CODE_DOCS = FORBIDDEN.filter(r => r.id !== 'tier name Router (as tier)');

// ── File whitelists (with justification) ──────────────────────────────────
const WHITELIST_FILES = {
    'CHANGELOG.md': 'historical changelog (legacy entries retained by design)',
    'docs/V65_MIGRATION.md': 'migration doc describing legacy names/aliases explicitly',
    'src/server/config.ts': 'legacy migration map (alwaysfree→quest technical mapping) — see migrateV65Config',
    'src/server/commands.ts': 'legacy mode alias map (alwaysfree/pro accepted for migration compatibility)',
};

function stripComments(ts) {
    // remove block comments and line comments (naive but sufficient for scans)
    return ts
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ');
}

function collectFiles(dir, ext, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (!['node_modules', '.git', 'dist', 'tmp', '.gencodedoc'].includes(e.name)) collectFiles(p, ext, out); }
        else if (ext.some(x => e.name.endsWith(x))) out.push(p);
    }
    return out;
}

function scanFile(rel, content, rules, ctxName) {
    let bad = 0;
    for (const rule of rules) {
        // force global flag so matchAll terminates
        const flags = rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g';
        const re = new RegExp(rule.re.source, flags);
        for (const m of content.matchAll(re)) {
            if (bad < 5) {
                log.fail(`${ctxName}: ${rel} — forbidden "${rule.id}" at char ${m.index}`);
            }
            bad++;
        }
    }
    return bad;
}

async function main() {
    console.log('\n🧹 UX Legacy Vocabulary Guard (v6.5)\n');

    let total = 0;

    // ── Scope A: locales (strict) ──
    log.section('Locales (strict)');
    const localeFiles = fs.readdirSync(path.join(ROOT, 'src', 'locales')).filter(f => f.endsWith('.json'));
    let localeBad = 0;
    for (const f of localeFiles) {
        const content = fs.readFileSync(path.join(ROOT, 'src', 'locales', f), 'utf-8');
        const bad = scanFile(`src/locales/${f}`, content, FORBIDDEN_USER_FACING, 'locales');
        localeBad += bad;
        if (bad === 0) log.pass(`src/locales/${f} clean`);
    }
    total += localeBad;

    // ── Scope B: READMEs (strict) ──
    log.section('READMEs (strict)');
    const readmes = fs.readdirSync(ROOT).filter(f => /^README.*\.md$/.test(f));
    for (const f of readmes) {
        if (WHITELIST_FILES[f]) continue;
        const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
        const bad = scanFile(f, content, FORBIDDEN_USER_FACING, 'readme');
        total += bad;
        if (bad === 0) log.pass(`${f} clean`);
    }

    // ── Scope C: runtime source (comment-stripped) ──
    log.section('Runtime source (comments stripped)');
    const srcFiles = collectFiles(path.join(ROOT, 'src'), ['.ts']);
    let srcBad = 0;
    for (const f of srcFiles) {
        const rel = path.relative(ROOT, f).replace(/\\/g, '/');
        if (WHITELIST_FILES[rel]) continue;
        const raw = fs.readFileSync(f, 'utf-8');
        const stripped = stripComments(raw);
        const bad = scanFile(rel, stripped, FORBIDDEN_CODE_DOCS, 'src');
        srcBad += bad;
    }
    total += srcBad;
    if (srcBad === 0) log.pass('all src/**/*.ts clean (comments stripped)');
    else log.info(`${srcBad} violation(s) in src/ — fix before release`);

    // ── Scope D: maintained technical docs ──
    log.section('Maintained technical docs');
    const techDocs = ['TECHNICAL_MANUAL.md'];
    for (const f of techDocs) {
        if (!fs.existsSync(path.join(ROOT, f))) continue;
        const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
        const bad = scanFile(f, content, FORBIDDEN_CODE_DOCS, 'docs');
        total += bad;
        if (bad === 0) log.pass(`${f} clean`);
    }

    // ── Whitelist sanity: whitelisted files still exist & are the right ones ──
    log.section('Whitelist sanity');
    for (const [f, why] of Object.entries(WHITELIST_FILES)) {
        assert(fs.existsSync(path.join(ROOT, f)), `whitelisted ${f} exists (${why})`);
    }

    console.log('\n' + '═'.repeat(60) + '\n');
    console.log(`📊 UX vocab: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset} (${total} violations)`);
    process.exit(total > 0 || failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Scanner crashed:', e); process.exit(2); });
