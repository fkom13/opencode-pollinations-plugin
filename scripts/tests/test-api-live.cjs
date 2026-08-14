#!/usr/bin/env node
/**
 * OpenCode Pollinations Plugin — Live API Integration Tests
 * Probes gen.pollinations.ai directly to validate schema assumptions.
 *
 * Usage:
 *   POLLINATIONS_API_KEY=sk_xxx node scripts/tests/test-api-live.cjs
 *   node scripts/tests/test-api-live.cjs sk_xxx
 *
 * These tests hit the LIVE API. They are read-only (no generation calls).
 */
MANUAL/LIVE ONLY — never run in CI. This suite performs REAL billable Pollinations generation or live-network probing. Run it manually with explicit balance tracking (Phase 3 canary protocol).
const https = require('https');

const API_KEY = process.env.POLLINATIONS_API_KEY || process.argv[2] || '';
const GEN_BASE = 'gen.pollinations.ai';
const TEXT_BASE = 'text.pollinations.ai';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

const log = {
    pass: (msg) => console.log(`${colors.green}\u2713${colors.reset} ${msg}`),
    fail: (msg) => console.log(`${colors.red}\u2717${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}\u2139${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.yellow}\u2501\u2501\u2501 ${msg} \u2501\u2501\u2501${colors.reset}`),
};

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, testName) {
    if (condition) { passed++; log.pass(testName); }
    else { failed++; log.fail(testName); }
}

function skip(testName, reason) {
    skipped++;
    log.info(`SKIP: ${testName} (${reason})`);
}

function fetchJson(hostname, path, headers = {}) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname,
            path,
            method: 'GET',
            headers: {
                'User-Agent': 'opencode-pollinations-plugin/test-api-live',
                ...headers,
            },
            timeout: 15000,
        };
        if (API_KEY) opts.headers['Authorization'] = `Bearer ${API_KEY}`;
        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, json: JSON.parse(data), headers: res.headers }); }
                catch (e) { resolve({ status: res.statusCode, json: null, raw: data, headers: res.headers }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

async function testV1Models() {
    log.section('GET /v1/models (OpenAI-compatible)');
    const { status, json } = await fetchJson(GEN_BASE, '/v1/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(json && json.object === 'list', 'Response has object=list');
    assert(Array.isArray(json.data), 'Response has data array');
    assert(json.data.length >= 200, `Has 200+ models (got ${json.data.length})`);

    const first = json.data[0];
    assert(typeof first.id === 'string', 'Model has id');
    assert(Array.isArray(first.input_modalities), 'Model has input_modalities');
    assert(Array.isArray(first.output_modalities), 'Model has output_modalities');
    assert(Array.isArray(first.supported_endpoints), 'Model has supported_endpoints');

    assert(first.title === undefined, 'v1/models does NOT expose title (minimal schema)');
    assert(first.description === undefined, 'v1/models does NOT expose description');
    assert(first.pricing === undefined, 'v1/models does NOT expose pricing');
    assert(first.paid_only === undefined, 'v1/models does NOT expose paid_only');

    const ids = json.data.map(m => m.id);
    assert(ids.includes('openai'), 'Contains openai');
    assert(ids.includes('openai-fast'), 'Contains openai-fast');
    assert(ids.includes('mistral'), 'Contains mistral (on gen endpoint)');
    assert(ids.includes('flux'), 'Contains flux');
    assert(ids.includes('veo'), 'Contains veo');
    assert(ids.includes('elevenlabs'), 'Contains elevenlabs');
    assert(ids.includes('trellis-2-low'), 'Contains trellis-2-low (3D)');
    assert(ids.includes('openai-3-small'), 'Contains openai-3-small (embeddings)');

    log.info(`Total models: ${json.data.length}`);
}

async function testRichModels() {
    log.section('GET /models (Rich catalog)');
    const { status, json } = await fetchJson(GEN_BASE, '/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length >= 50, `Has 50+ models (got ${json.length})`);

    const openai = json.find(m => m.name === 'openai');
    assert(openai !== undefined, 'Contains openai model');

    if (openai) {
        assert(typeof openai.title === 'string' && openai.title.length > 0, `openai has title: "${openai.title}"`);
        assert(typeof openai.description === 'string', 'openai has description');
        assert(openai.title !== openai.description, 'title != description (distinct fields)');
        assert(typeof openai.brand === 'string', `openai has brand: "${openai.brand}"`);
        assert(openai.pricing && openai.pricing.currency === 'pollen', 'openai has pricing.currency=pollen');
        assert(Array.isArray(openai.capabilities), 'openai has capabilities array');
        assert(Array.isArray(openai.aliases), 'openai has aliases array');
        assert(typeof openai.added_date === 'number', 'openai has added_date (timestamp)');
        assert(typeof openai.context_length === 'number', 'openai has context_length');
        assert(typeof openai.is_specialized === 'boolean', 'openai has is_specialized');
        assert(openai.input_modalities.includes('image'), 'openai supports image input');
    }

    const paidModel = json.find(m => m.paid_only === true);
    assert(paidModel !== undefined, 'At least one paid_only model exists');

    const freeModel = json.find(m => !m.paid_only);
    assert(freeModel !== undefined, 'At least one non-paid model exists');

    log.info(`Rich models: ${json.length} | paid_only: ${json.filter(m => m.paid_only).length}`);
}

async function testTextModels() {
    log.section('GET /text/models');
    const { status, json } = await fetchJson(GEN_BASE, '/text/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');

    const model = json[0];
    if (model) {
        assert(typeof model.title === 'string', 'Text model has title');
        assert(typeof model.description === 'string', 'Text model has description');
        assert(model.category === 'text', 'Category is text');
    }

    const mistral = json.find(m => m.name === 'mistral');
    assert(mistral !== undefined, 'mistral EXISTS on gen.pollinations.ai/text/models');
    if (mistral) {
        log.info(`mistral title: "${mistral.title}" | paid_only: ${mistral.paid_only}`);
    }
}

async function testLegacyFree() {
    log.section('GET text.pollinations.ai/models (LEGACY FREE)');
    const { status, json } = await fetchJson(TEXT_BASE, '/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length === 1, `Only 1 model remains (got ${json.length})`);

    if (json.length > 0) {
        const m = json[0];
        assert(m.name === 'openai-fast', `Only model is openai-fast (got "${m.name}")`);
        assert(m.tier === 'anonymous', 'tier=anonymous');
        assert(m.community === false, 'community=false');
        assert(Array.isArray(m.aliases), 'Has aliases');
    }

    const hasMistral = json.some(m => m.name === 'mistral');
    assert(!hasMistral, 'CONFIRMED: mistral does NOT exist on legacy free endpoint');
}

async function testImageModels() {
    log.section('GET /image/models');
    const { status, json } = await fetchJson(GEN_BASE, '/image/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length >= 20, `Has 20+ image models (got ${json.length})`);

    const model = json[0];
    if (model) {
        assert(typeof model.title === 'string', 'Image model has title');
        assert(typeof model.brand === 'string', 'Image model has brand');
        assert(model.category === 'image', 'Category is image');
    }

    const kontext = json.find(m => m.name === 'kontext');
    if (kontext) {
        assert(typeof kontext.max_reference_images === 'number', 'kontext has max_reference_images');
        assert(kontext.input_modalities.includes('image'), 'kontext accepts image input (I2I)');
    }

    const flux = json.find(m => m.name === 'flux');
    assert(flux !== undefined, 'flux exists');
    if (flux) assert(!flux.paid_only, 'flux is NOT paid_only (free tier)');
}

async function testVideoModels() {
    log.section('GET /video/models');
    const { status, json } = await fetchJson(GEN_BASE, '/video/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length >= 10, `Has 10+ video models (got ${json.length})`);

    const veo = json.find(m => m.name === 'veo');
    if (veo) {
        assert(Array.isArray(veo.video_capabilities), 'veo has video_capabilities');
        assert(veo.video_capabilities.includes('start_frame'), 'veo supports start_frame');
        assert(veo.video_capabilities.includes('audio_output'), 'veo supports audio_output');
        assert(veo.paid_only === true, 'veo is paid_only');
    }

    const novaReel = json.find(m => m.name === 'nova-reel');
    assert(novaReel !== undefined, 'nova-reel exists');
    if (novaReel) assert(!novaReel.paid_only, 'nova-reel is NOT paid_only (only free video)');
}

async function testAudioModels() {
    log.section('GET /audio/models');
    const { status, json } = await fetchJson(GEN_BASE, '/audio/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length >= 15, `Has 15+ audio models (got ${json.length})`);

    const eleven = json.find(m => m.name === 'elevenlabs');
    if (eleven) {
        assert(Array.isArray(eleven.voices), 'elevenlabs has voices array');
        assert(eleven.voices.length >= 30, `elevenlabs has 30+ voices (got ${eleven.voices.length})`);
        assert(Array.isArray(eleven.supported_endpoints), 'elevenlabs has supported_endpoints');
        assert(eleven.paid_only === true, 'elevenlabs is paid_only');
    }

    const whisper = json.find(m => m.name === 'whisper');
    assert(whisper !== undefined, 'whisper exists');
    if (whisper) assert(!whisper.paid_only, 'whisper is NOT paid_only');
}

async function test3dModels() {
    log.section('GET /3d/models');
    const { status, json } = await fetchJson(GEN_BASE, '/3d/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length === 4, `Has 4 3D models (got ${json.length})`);

    const trellis = json.find(m => m.name === 'trellis-2-low');
    if (trellis) {
        assert(trellis.flat_rate === true, 'trellis has flat_rate=true');
        assert(trellis.output_modalities.includes('3d'), 'trellis outputs 3d');
        assert(!trellis.paid_only, 'trellis-2-low is NOT paid_only');
    }
}

async function testEmbeddingModels() {
    log.section('GET /embeddings/models');
    const { status, json } = await fetchJson(GEN_BASE, '/embeddings/models');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(Array.isArray(json), 'Response is array');
    assert(json.length === 5, `Has 5 embedding models (got ${json.length})`);

    const small = json.find(m => m.name === 'openai-3-small');
    if (small) {
        assert(typeof small.context_length === 'number', 'openai-3-small has context_length');
        assert(!small.paid_only, 'openai-3-small is NOT paid_only');
    }
}

async function testAccountBalance() {
    log.section('GET /account/balance');

    if (!API_KEY) { skip('balance requires API key', 'no key'); return; }

    const { status, json } = await fetchJson(GEN_BASE, '/account/balance');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(typeof json.balance === 'number', `balance is a number (${json.balance})`);
    assert(json.tier === undefined, 'NO tier field (split not available)');
    assert(json.pack === undefined, 'NO pack field (split not available)');
    assert(json.allowance === undefined, 'NO allowance field (split not available)');

    log.info(`Balance: ${json.balance} (single number, no split)`);
}

async function testAccountProfile() {
    log.section('GET /account/profile');

    if (!API_KEY) { skip('profile requires API key', 'no key'); return; }

    const { status, json } = await fetchJson(GEN_BASE, '/account/profile');

    assert(status === 200, `Status 200 (got ${status})`);
    assert(typeof json.githubUsername === 'string', `Has githubUsername: ${json.githubUsername}`);
    assert(json.tier === undefined, 'NO tier field in profile');
    assert(json.nextResetAt === undefined, 'NO nextResetAt field in profile');
}

async function testTitleVsDescription() {
    log.section('P0 PROOF: title != description (plugin must use title)');
    const { json } = await fetchJson(GEN_BASE, '/models');

    const samples = json.filter(m => m.title && m.description).slice(0, 10);
    let allDistinct = true;
    for (const m of samples) {
        if (m.title === m.description) { allDistinct = false; break; }
    }
    assert(allDistinct, `title != description for all sampled models (${samples.length} checked)`);

    const gptOss = json.find(m => m.name === 'gpt-oss');
    if (gptOss) {
        log.info(`gpt-oss -> title: "${gptOss.title}" | desc: "${gptOss.description}"`);
        assert(gptOss.title === 'GPT-OSS 20B', `gpt-oss title is "GPT-OSS 20B" (got "${gptOss.title}")`);
        assert(gptOss.description.length > gptOss.title.length, 'description is longer than title');
    }

    const openaiFast = json.find(m => m.name === 'openai-fast');
    if (openaiFast) {
        log.info(`openai-fast -> title: "${openaiFast.title}" | desc: "${openaiFast.description}"`);
    }
}

async function test502Remap() {
    log.section('P1 PROOF: 429->502 remap (PR #12814)');
    log.info('Cannot trigger a real 429/502 without rate limiting.');
    log.info('Verified via PR #12814 merged 2026-07-29: text-provider 429 -> 502 Bad Gateway.');
    log.info('Plugin proxy.ts:757 checks 402|429|401|403 but NOT 502 -> Safety Net gap confirmed.');
    skip('502 live trigger', 'requires rate limit exhaustion');
}

async function main() {
    console.log(`\n${colors.yellow}=== Pollinations Live API Tests ===${colors.reset}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : 'NONE (anonymous)'}\n`);

    const tests = [
        testV1Models,
        testRichModels,
        testTextModels,
        testLegacyFree,
        testImageModels,
        testVideoModels,
        testAudioModels,
        test3dModels,
        testEmbeddingModels,
        testAccountBalance,
        testAccountProfile,
        testTitleVsDescription,
        test502Remap,
    ];

    for (const t of tests) {
        try { await t(); }
        catch (e) {
            failed++;
            log.fail(`${t.name} CRASHED: ${e.message}`);
        }
    }

    console.log(`\n${colors.yellow}=== Results ===${colors.reset}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset} | Skipped: ${skipped}`);
    console.log(`Total: ${passed + failed + skipped}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main();
