#!/usr/bin/env node
/**
 * v6.5 Contract Test Suite — Phase 3
 * Covers: retry policy (double-billing), reasoning normalization,
 * Model Registry freshness, Tool Capability Registry, artifact core
 * (magic bytes), timeout hierarchy, billing mode migration, error parsing.
 *
 * Purely offline (unit + mock). NO live generation — CI safe.
 * Run: npm run test:v65  (requires a build: npm run build)
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
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
    if (condition) { passed++; log.pass(testName); }
    else { failed++; log.fail(testName); }
}

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const FIXTURES = path.join(ROOT, 'docs', 'evidence', 'live-audit');

async function importDist(rel) {
    const full = path.join(DIST, rel);
    return import(pathToFileURL(full).href);
}

// ─── 1. RETRY POLICY — double-billing invariants ─────────────────────────

async function testRetryPolicy() {
    log.section('Retry Policy (R1) — no double submit');

    const { classifyRetry } = await importDist('server/proxy.js');

    // timeout_after_submission_does_not_retry
    assert(classifyRetry('abort') === 'NO_RETRY', 'timeout_after_submission_does_not_retry (abort → NO_RETRY)');
    // abort_does_not_retry
    assert(classifyRetry('network') === 'NO_RETRY', 'abort_does_not_retry (network error → NO_RETRY)');
    // ambiguous_5xx_does_not_double_submit
    assert(classifyRetry(500) === 'NO_RETRY', 'ambiguous_5xx_does_not_double_submit (500 → NO_RETRY)');
    assert(classifyRetry(502) === 'NO_RETRY', 'ambiguous 502 → NO_RETRY');
    assert(classifyRetry(520) === 'NO_RETRY', 'ambiguous 520 → NO_RETRY');
    // 402 must never be retried as a paid replay
    assert(classifyRetry(402) === 'NO_RETRY', '402 → NO_RETRY (no paid replay)');
    // 429 is the only conservative retry class
    assert(classifyRetry(429) === 'RETRY', '429 → RETRY (conservative single retry)');
}

// ─── 2. REASONING NORMALIZATION (M8/M9) ─────────────────────────────────

async function testReasoningNormalization() {
    log.section('Reasoning Normalization (M8/M9)');

    const { normalizeChunkLine } = await importDist('server/proxy.js');

    // DeepSeek stream chunk: delta.reasoning_content must be stripped
    const deepseekChunk = JSON.stringify({
        id: 'c1', object: 'chat.completion.chunk',
        choices: [{ index: 0, delta: { role: 'assistant', reasoning_content: 'hidden thinking', content: '' }, finish_reason: null }],
    });
    const dsOut = JSON.parse(normalizeChunkLine(deepseekChunk));
    assert(dsOut.choices[0].delta.reasoning_content === undefined, 'DeepSeek stream: reasoning_content stripped');
    assert(dsOut.choices[0].delta.role === 'assistant', 'DeepSeek stream: role preserved');

    // reasoning not merged into content
    const mixedChunk = JSON.stringify({
        choices: [{ delta: { content: 'real answer', reasoning_content: 'NOT ANSWER' } }],
    });
    const mixedOut = JSON.parse(normalizeChunkLine(mixedChunk));
    assert(mixedOut.choices[0].delta.content === 'real answer', 'content preserved (never merged with reasoning)');
    assert(mixedOut.choices[0].delta.reasoning_content === undefined, 'reasoning not merged into content');

    // Kimi non-stream with tool call: name:null parasite removed, function.name kept, reasoning_content stripped
    const kimiMsg = JSON.stringify({
        object: 'chat.completion',
        choices: [{
            finish_reason: 'tool_calls',
            message: {
                role: 'assistant',
                content: '',
                reasoning_content: 'thinking...',
                tools: null,
                tool_calls: [{ index: 0, id: 'calc_0', type: 'function', function: { name: 'calc', arguments: '{"a":7,"b":8}' }, name: null }],
            },
        }],
    });
    const kimiOut = JSON.parse(normalizeChunkLine(kimiMsg));
    const km = kimiOut.choices[0].message;
    assert(km.reasoning_content === undefined, 'Kimi: reasoning_content stripped');
    assert(km.tools === undefined, 'Kimi: message.tools === null removed');
    assert(km.tool_calls[0].name === undefined, 'Kimi: top-level name:null removed');
    assert(km.tool_calls[0].function.name === 'calc', 'Kimi: function.name preserved (canonical)');
    assert(kimiOut.choices[0].finish_reason === 'tool_calls', 'Kimi: finish_reason preserved');

    // Qwen non-stream: reasoning + reasoning_details stripped
    const qwenMsg = JSON.stringify({
        choices: [{
            message: {
                role: 'assistant',
                content: 'OK',
                reasoning: 'hidden',
                reasoning_details: [{ type: 'reasoning.text', text: 'hidden', format: 'text', index: 0 }],
            },
        }],
        usage: { completion_tokens_details: { reasoning_tokens: 42 } },
    });
    const qwenOut = JSON.parse(normalizeChunkLine(qwenMsg));
    const qm = qwenOut.choices[0].message;
    assert(qm.reasoning === undefined, 'Qwen: reasoning stripped');
    assert(qm.reasoning_details === undefined, 'Qwen: reasoning_details stripped');
    assert(qm.content === 'OK', 'Qwen: content preserved');
    assert(qwenOut.usage.completion_tokens_details.reasoning_tokens === 42, 'usage reasoning_tokens preserved');

    // Luna/OpenAI clean shape: passthrough untouched
    const lunaChunk = JSON.stringify({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'hi' }, finish_reason: null }],
        usage: { completion_tokens_details: { reasoning_tokens: 0 } },
    });
    const lunaOut = JSON.parse(normalizeChunkLine(lunaChunk));
    assert(lunaOut.choices[0].delta.content === 'hi', 'OpenAI clean passthrough: content preserved');
    assert(lunaOut.usage.completion_tokens_details.reasoning_tokens === 0, 'OpenAI clean passthrough: usage preserved');

    // [DONE] sentinel passes through
    assert(normalizeChunkLine('[DONE]') === '[DONE]', '[DONE] sentinel passthrough');

    // ── Live fixture normalization (Phase 2 captured proofs) ──
    const kimiFixturePath = path.join(FIXTURES, 'P24-kimi-tools-nostream.json');
    if (fs.existsSync(kimiFixturePath)) {
        const fixture = fs.readFileSync(kimiFixturePath, 'utf-8').trim();
        const out = JSON.parse(normalizeChunkLine(fixture));
        const m = out.choices[0].message;
        assert(!('reasoning_content' in m), 'LIVE fixture Kimi: reasoning_content stripped');
        const tc = m.tool_calls && m.tool_calls[0];
        if (tc) {
            assert(!('name' in tc) || tc.name !== null, 'LIVE fixture Kimi: name:null parasite removed');
            assert(tc.function && typeof tc.function.name === 'string', 'LIVE fixture Kimi: function.name canonical');
        }
    } else {
        log.info('Kimia fixture P24 not found — skipped');
    }

    const qwenFixturePath = path.join(FIXTURES, 'T12-qwen-max.json');
    if (fs.existsSync(qwenFixturePath)) {
        const fixture = fs.readFileSync(qwenFixturePath, 'utf-8').trim();
        const out = JSON.parse(normalizeChunkLine(fixture));
        const m = out.choices[0].message;
        assert(!('reasoning' in m), 'LIVE fixture Qwen: reasoning stripped');
        assert(!('reasoning_details' in m), 'LIVE fixture Qwen: reasoning_details stripped');
    } else {
        log.info('Qwen fixture T12 not found — skipped');
    }
}

// ─── 3. MODEL REGISTRY FRESHNESS ─────────────────────────────────────────

async function testRegistryFreshness() {
    log.section('Model Registry refresh (P0.3)');

    const { ModelRegistryImpl } = await importDist('server/models/cache.js');

    let fetchCount = 0;
    const fakeModels = () => [
        { name: 'flux', description: 'Flux', category: 'image', aliases: [], pricing: { currency: 'pollen' }, paid_only: false, supportsI2X: false, outputType: 'image', input_modalities: ['text'], output_modalities: ['image'] },
    ];
    const fetcher = async () => { fetchCount++; return fakeModels(); };

    // registry_serves_cached_value_within_ttl
    const reg = new ModelRegistryImpl({ ttlMs: 60 * 1000, fetcher, diskCache: false });
    await reg.refresh();
    assert(reg.isReady() && reg.list('image').length === 1, 'registry_serves_cached_value_within_ttl (populated)');
    assert(fetchCount === 1, 'registry: single fetch after refresh');
    reg.list('image');
    reg.get('image', 'flux');
    reg.all();
    assert(fetchCount === 1, 'registry: reads within TTL do NOT refetch');

    // registry_refreshes_after_ttl
    const reg2 = new ModelRegistryImpl({ ttlMs: 30, fetcher, diskCache: false });
    await reg2.refresh();
    assert(fetchCount === 2, 'registry: refresh fetched');
    await new Promise(r => setTimeout(r, 60));
    await reg2.list('image'); // triggers ensureFresh (fire-and-forget)
    await new Promise(r => setTimeout(r, 30));
    assert(fetchCount >= 3, 'registry_refreshes_after_ttl (stale read triggered refresh)');

    // registry_falls_back_offline
    const reg3 = new ModelRegistryImpl({ ttlMs: 60 * 1000, fetcher: async () => { throw new Error('offline'); }, diskCache: false });
    await reg3.refresh();
    assert(reg3.isReady(), 'registry_falls_back_offline (ready with fallback)');
    assert(reg3.list('image').length >= 1, 'registry_falls_back_offline (static fallback served)');

    // registry_concurrent_refresh_is_coalesced_if_possible
    let slowFetches = 0;
    const slowFetcher = async () => { slowFetches++; await new Promise(r => setTimeout(r, 80)); return fakeModels(); };
    const reg4 = new ModelRegistryImpl({ ttlMs: 60 * 1000, fetcher: slowFetcher, diskCache: false });
    await Promise.all([reg4.refresh(), reg4.refresh(), reg4.refresh()]);
    assert(slowFetches === 1, 'registry_concurrent_refresh_is_coalesced_if_possible (1 fetch for 3 concurrent refreshes)');
}

// ─── 4. TOOL CAPABILITY REGISTRY ─────────────────────────────────────────

async function testToolCapabilityRegistry() {
    log.section('Tool Capability Registry (P2)');

    const tcr = await importDist('tools/pollinations/tool-capability-registry.js');
    const timeout = await importDist('tools/pollinations/timeout-policy.js');

    // missing modelId for generic capability
    const rmbg = tcr.resolveCapability('remove_background');
    assert(rmbg && rmbg.modelId === undefined, 'TCR: missing modelId for generic capability (remove_background)');

    const video = tcr.resolveCapability('gen_video');
    assert(video && video.transport.endpoint.includes('/video/'), 'TCR: video canonical endpoint /video/{prompt}');
    assert(video.transport.mode === 'LONG_BLOCKING', 'TCR: video is LONG_BLOCKING');
    assert(video.execution.retryPolicy === 'RECOVER_SAME_REQUEST', 'TCR: video retry = same-request recovery');

    const threeD = tcr.resolveCapability('gen_3d');
    assert(threeD && threeD.execution.idempotency === 'SERVER_DEDUP', 'TCR: 3D SERVER_DEDUP');
    assert(threeD.outputs.artifactFormat === 'glb', 'TCR: 3D artifact format glb');
    assert(threeD.backendOverrides['trellis-2'].timeoutSeconds === 1200, 'TCR: trellis-2 backend override 1200s');

    const embed = tcr.resolveCapability('embed');
    assert(embed && embed.transport.mode === 'SHORT_REQUEST', 'TCR: embed SHORT_REQUEST');

    const qrcode = tcr.resolveCapability('qrcode');
    assert(qrcode && qrcode.transport.mode === 'LOCAL', 'TCR: qrcode LOCAL');

    // timeout precedence: per-call > model override > capability > global
    const capTimeout = tcr.resolveCapabilityTimeout('gen_3d', 'trellis-2');
    assert(capTimeout === 1200, 'timeout precedence: model override wins for trellis-2');
    const capTimeout2 = tcr.resolveCapabilityTimeout('gen_3d', 'hyper3d-rodin');
    assert(capTimeout2 === 1800, 'timeout precedence: hyper3d-rodin override 1800s');
    const capTimeout3 = tcr.resolveCapabilityTimeout('gen_3d', 'other-3d');
    assert(capTimeout3 === 1800, 'timeout precedence: capability threeD (1800) when no override');
    const perCall = tcr.resolveCapabilityTimeout('gen_3d', 'trellis-2', 500);
    assert(perCall === 500, 'timeout precedence: per-call wins over model override');

    // clamp
    assert(timeout.resolveTimeoutSeconds({ perCall: 5 }) === 10, 'clamp: per-call below min clamps to 10s');
    assert(timeout.resolveTimeoutSeconds({ perCall: 99999 }) === 3600, 'clamp: per-call above max clamps to 3600s');
    assert(timeout.validateTimeoutSeconds(5).ok === false, 'validate: 5s rejected');
    assert(timeout.validateTimeoutSeconds(4000).ok === false, 'validate: 4000s rejected');
    assert(timeout.validateTimeoutSeconds(120).ok === true, 'validate: 120s accepted');
}

// ─── 5. ARTIFACT CORE (magic bytes, extension, persistence) ──────────────

async function testArtifactCore() {
    log.section('Artifact Core (magic bytes)');

    const core = await importDist('tools/pollinations/artifact-core.js');

    // magic bytes
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    assert(core.detectArtifactType(jpeg)?.format === 'jpeg', 'magic bytes: JPEG detected');
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    assert(core.detectArtifactType(png)?.format === 'png', 'magic bytes: PNG detected');
    const glb = Buffer.concat([Buffer.from('glTF', 'ascii'), Buffer.alloc(20, 0)]);
    assert(core.detectArtifactType(glb)?.format === 'glb', 'magic bytes: GLB (glTF) detected');
    assert(core.detectArtifactType(glb)?.ext === 'glb', 'magic bytes: GLB extension');
    const mp4 = Buffer.concat([Buffer.alloc(4, 0), Buffer.from('ftypisom', 'ascii'), Buffer.alloc(16, 0)]);
    assert(core.detectArtifactType(mp4)?.format === 'mp4', 'magic bytes: MP4 detected');
    const mp3 = Buffer.concat([Buffer.from('ID3', 'ascii'), Buffer.alloc(8, 0)]);
    assert(core.detectArtifactType(mp3)?.format === 'mp3', 'magic bytes: MP3 (ID3) detected');
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
    assert(core.detectArtifactType(webm)?.format === 'webm', 'magic bytes: WebM (EBML) detected');
    assert(core.detectArtifactType(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])) === null, 'magic bytes: unknown → null');

    // case confirmed Phase 2: b64 edit response is JPEG even if caller thinks PNG
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v65-artifact-'));
    const persisted = core.persistArtifact(jpeg, { outputDir: tmpDir, filename: 'my_image.png', preferredExt: 'png', detectExt: true });
    assert(path.extname(persisted.filePath) === '.png' || persisted.ext === 'jpg', 'persist: filename kept but detected ext reported');
    assert(persisted.detected.format === 'jpeg', 'persist: detected format = jpeg (not PNG assumption)');

    const persistedAuto = core.persistArtifact(jpeg, { outputDir: tmpDir, preferredExt: 'png', detectExt: true });
    assert(persistedAuto.ext === 'jpg' && path.extname(persistedAuto.filePath) === '.jpg', 'persist: auto filename follows REAL bytes (.jpg)');
    assert(fs.existsSync(persistedAuto.filePath), 'persist: file written');
    assert(fs.statSync(persistedAuto.filePath).size === jpeg.length, 'persist: size matches');

    // GLB persistence validates real format
    const persistedGlb = core.persistArtifact(glb, { outputDir: tmpDir, preferredExt: 'bin', detectExt: true });
    assert(persistedGlb.ext === 'glb', 'persist: GLB written with .glb');
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ─── 6. 3D — validation, timeouts, no-resubmit ───────────────────────────

async function test3D() {
    log.section('3D (P3)');

    const core = await importDist('tools/pollinations/artifact-core.js');
    const timeout = await importDist('tools/pollinations/timeout-policy.js');
    const { classifyRetry } = await importDist('server/proxy.js');

    // GLB validation: fake buffer rejected
    const fake = Buffer.from('this is not a glb file');
    assert(core.detectArtifactType(fake)?.format !== 'glb', '3D artifact validation: fake buffer rejected');

    // real glTF header accepted
    const realGlb = Buffer.concat([Buffer.from('glTF', 'ascii'), Buffer.from([2, 0, 0, 0]), Buffer.alloc(32, 0)]);
    assert(core.detectArtifactType(realGlb)?.format === 'glb', '3D artifact validation: glTF header accepted');

    // timeout: trellis recommended 1200s, hyper3d 1800s via TCR (already tested above)
    assert(timeout.resolveTimeoutSeconds({ capability: 'threeD' }) === 1800, '3D: capability default 1800s');

    // 3D retry invariant: timeout → NO_RETRY (never resubmit automatically)
    assert(classifyRetry('abort') === 'NO_RETRY', '3D retry invariant: timeout does not auto-resubmit');
    assert(classifyRetry('network') === 'NO_RETRY', '3D retry invariant: network error does not auto-resubmit');
}

// ─── 7. BILLING MODE MIGRATION ───────────────────────────────────────────

async function testBillingMigration() {
    log.section('Billing Mode Migration (M5)');

    const config = await importDist('server/config.js');

    // legacy modes migrate
    const m1 = config.migrateV65Config({ mode: 'alwaysfree' });
    assert(m1.mode === 'quest', 'migration: alwaysfree → quest');
    const m2 = config.migrateV65Config({ mode: 'pro' });
    assert(m2.mode === 'paid', 'migration: pro → paid');
    const m3 = config.migrateV65Config({ mode: 'manual' });
    assert(m3.mode === 'manual', 'migration: manual stays');
    const m4 = config.migrateV65Config({ mode: 'quest_only' });
    assert(m4.mode === 'quest_only', 'migration: new modes passthrough');

    // dead refill concepts removed from persisted config
    const m5 = config.migrateV65Config({ mode: 'quest', refillOverride: 0.4, questStashInFreeMode: true });
    assert(!('refillOverride' in m5), 'migration: refillOverride removed');
    assert(!('questStashInFreeMode' in m5), 'migration: questStashInFreeMode removed');

    // legacy tier percentage threshold → absolute quest floor
    const m6 = config.migrateV65Config({ thresholds: { tier: 10, wallet: 5 } });
    assert(m6.thresholds.tier === undefined, 'migration: thresholds.tier removed');
    assert(m6.thresholds.quest !== undefined, 'migration: thresholds.quest default present');
    assert(m6.thresholds.wallet === 5, 'migration: thresholds.wallet kept');
}

// ─── 8. ERROR PARSER ─────────────────────────────────────────────────────

async function testErrorParser() {
    log.section('Structured Errors (P4)');

    const ep = await importDist('tools/pollinations/error-parser.js');

    // envelope sanitization: upstreamHost never exposed in message
    const envelope = JSON.stringify({
        success: false, code: 'BAD_REQUEST',
        details: { name: 'UpstreamError', upstreamStatus: 400, upstreamHost: 'myceli-prod-eastus.openai.azure.com', upstreamBody: 'secret-ish' },
    });
    const parsed = ep.parsePolliError(envelope, 400);
    assert(parsed.kind === 'bad_request', 'parser: 400 → bad_request');
    assert(!parsed.message.includes('azure.com'), 'parser: upstreamHost NOT in user message');
    assert(parsed.debug && parsed.debug.upstreamHost && parsed.debug.upstreamHost.includes('azure.com'), 'parser: upstreamHost kept in sanitized debug');

    assert(ep.kindForStatus(402) === 'payment', 'parser: 402 → payment');
    assert(ep.kindForStatus(401) === 'auth', 'parser: 401 → auth');
    assert(ep.kindForStatus(429) === 'rate_limit', 'parser: 429 → rate_limit');
    assert(ep.kindForStatus(500) === 'upstream', 'parser: 500 → upstream');

    const timeoutErr = ep.parsePolliErrorFromThrow(new Error('Timeout (1200s)'));
    assert(timeoutErr.kind === 'timeout', 'parser: timeout classified');
    const httpErr = ep.parsePolliErrorFromThrow(new Error('HTTP 402: {"success":false,"code":"INSUFFICIENT_BALANCE"}'));
    assert(httpErr.kind === 'payment', 'parser: "HTTP 402" classified as payment');
    const netErr = ep.parsePolliErrorFromThrow(new Error('Network Error: ECONNRESET'));
    assert(netErr.kind === 'network', 'parser: network classified');
}

// ─── 9. VIDEO ENDPOINT ───────────────────────────────────────────────────

async function testVideoEndpoint() {
    log.section('Video Canonical Endpoint (P1)');

    const tcr = await importDist('tools/pollinations/tool-capability-registry.js');
    const genVideoSrc = fs.readFileSync(path.join(ROOT, 'src', 'tools', 'pollinations', 'gen_video.ts'), 'utf-8');
    const gen3dSrc = fs.readFileSync(path.join(ROOT, 'src', 'tools', 'pollinations', 'gen_3d.ts'), 'utf-8');

    const video = tcr.resolveCapability('gen_video');
    assert(video.transport.endpoint === 'https://gen.pollinations.ai/video/{prompt}', 'video endpoint canonical: /video/{prompt}');
    assert(genVideoSrc.includes('/video/') && !genVideoSrc.includes('gen.pollinations.ai/image/${promptEncoded}'), 'gen_video builds /video/ URL (not /image/)');
    assert(gen3dSrc.includes('/3d/${promptEncoded}'), 'gen_3d builds /3d/ URL');

    // no new scattered if(model===...) in the 3d tool
    assert(!/if\s*\(\s*model\s*===/.test(gen3dSrc), 'gen_3d: no scattered if(model===) branches');
}

// ─── MAIN ────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🧪 v6.5 Contract Test Suite (Phase 3)\n');

    await testRetryPolicy();
    await testReasoningNormalization();
    await testRegistryFreshness();
    await testToolCapabilityRegistry();
    await testArtifactCore();
    await test3D();
    await testBillingMigration();
    await testErrorParser();
    await testVideoEndpoint();

    console.log('\n' + '═'.repeat(60) + '\n');
    console.log(`📊 v6.5 Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`);
    console.log('');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('Test suite crashed:', e);
    process.exit(2);
});
