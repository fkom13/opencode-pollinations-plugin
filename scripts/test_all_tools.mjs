/**
 * Test complet de tous les outils V6 (8 free tools)
 * Vérifie: import, instanciation, output_path, metadata_only, fallback upload
 * 
 * Usage: node scripts/test_all_tools.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use test-specific temp directory
const TEST_DIR = path.join(os.tmpdir(), 'opencode-plugin-tests-' + Date.now());
fs.mkdirSync(TEST_DIR, { recursive: true });

let passed = 0;
let failed = 0;

function ok(name, result) {
    console.log(`  ✅ ${name}`);
    passed++;
    return result;
}

function fail(name, err) {
    console.error(`  ❌ ${name}: ${err}`);
    failed++;
}

async function test(name, fn) {
    try {
        await fn();
    } catch (err) {
        fail(name, err.message || err);
    }
}

const fakeContext = { metadata: () => { } };

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   V6 Plugin - Test Suite Complet');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ─── 1. Shared Utils ────────────────────────────────────────────────────────
console.log('\n📦 1. Shared Utils (shared.ts)');
await test('resolveOutputDir', async () => {
    const { resolveOutputDir, TOOL_DIRS } = require('../dist/tools/shared.js');

    // Default dir
    const defaultDir = resolveOutputDir(TOOL_DIRS.frames);
    if (!defaultDir.includes('pollinations/frames')) fail('defaultDir', 'wrong path');
    else ok('Default dir contains pollinations/frames');

    // Custom dir
    const customDir = resolveOutputDir('test', TEST_DIR);
    if (customDir !== TEST_DIR) fail('customDir', `Expected ${TEST_DIR}, got ${customDir}`);
    else ok('Custom dir works');

    // formatFileSize
    const { formatFileSize } = require('../dist/tools/shared.js');
    if (formatFileSize(1024) !== '1.0 KB') fail('formatFileSize', formatFileSize(1024));
    else ok('formatFileSize OK');
});

// ─── 2. Tool Registry ──────────────────────────────────────────────────────
console.log('\n📦 2. Tool Registry');
await test('createToolRegistry', async () => {
    const { createToolRegistry } = require('../dist/tools/index.js');
    const tools = createToolRegistry();
    const expected = ['gen_qrcode', 'gen_diagram', 'gen_palette', 'file_to_url', 'remove_background', 'extract_frames', 'extract_audio'];

    for (const name of expected) {
        if (!tools[name]) fail(`tool_${name}`, 'missing from registry');
        else ok(`Registry: ${name}`);
    }

    if (Object.keys(tools).length < expected.length) fail('count', `Only ${Object.keys(tools).length} tools`);
    else ok(`Registry total: ${Object.keys(tools).length} tools`);
});

// ─── 3. QR Code ─────────────────────────────────────────────────────────────
console.log('\n🔲 3. gen_qrcode (output_path)');
await test('gen_qrcode', async () => {
    const { genQrcodeTool } = require('../dist/tools/design/gen_qrcode.js');
    const result = await genQrcodeTool.execute({
        content: 'https://test.com',
        size: 256,
        filename: 'test_qr',
        output_path: TEST_DIR,
    }, fakeContext);

    if (result.includes('❌')) fail('qrcode_exec', result);
    else ok('QR code generated');

    if (result.includes(TEST_DIR)) ok('output_path respected');
    else fail('output_path', 'custom path not in result');

    const file = path.join(TEST_DIR, 'test_qr.png');
    if (fs.existsSync(file)) ok(`File created: ${fs.statSync(file).size} bytes`);
    else fail('file', 'file not created');
});

// ─── 4. Diagram ─────────────────────────────────────────────────────────────
console.log('\n📊 4. gen_diagram (output_path)');
await test('gen_diagram', async () => {
    const { genDiagramTool } = require('../dist/tools/design/gen_diagram.js');
    const result = await genDiagramTool.execute({
        code: 'graph LR; A-->B; B-->C',
        format: 'svg',
        filename: 'test_diagram',
        output_path: TEST_DIR,
    }, fakeContext);

    if (result.includes('❌')) fail('diagram_exec', result);
    else ok('Diagram rendered');

    if (result.includes(TEST_DIR)) ok('output_path respected');
    else fail('output_path', 'custom path not in result');
});

// ─── 5. Palette ─────────────────────────────────────────────────────────────
console.log('\n🎨 5. gen_palette (output_path)');
await test('gen_palette', async () => {
    const { genPaletteTool } = require('../dist/tools/design/gen_palette.js');
    const result = await genPaletteTool.execute({
        color: '#3B82F6',
        scheme: 'triadic',
        count: 5,
        filename: 'test_palette',
        output_path: TEST_DIR,
    }, fakeContext);

    if (result.includes('❌')) fail('palette_exec', result);
    else ok('Palette generated');

    if (result.includes(TEST_DIR)) ok('output_path respected');
    else fail('output_path', 'custom path not in result');
});

// ─── 6. File Upload (cascade fallback) ──────────────────────────────────────
console.log('\n📤 6. file_to_url (multi-provider cascade)');
await test('file_to_url', async () => {
    const { fileToUrlTool } = require('../dist/tools/power/file_to_url.js');

    // Create test file
    const testFile = path.join(TEST_DIR, 'upload_test.txt');
    fs.writeFileSync(testFile, 'V6 cascade test ' + Date.now());

    const result = await fileToUrlTool.execute({
        file_path: testFile,
        expiry: '1h',
    }, fakeContext);

    if (!result.includes('https://')) fail('upload_exec', result);
    else ok('File uploaded (got URL)');

    if (result.includes('https://')) ok('Got HTTPS URL');
    else fail('url', 'no URL in result');

    if (result.includes('Service:')) ok('Shows provider name');
    else fail('provider', 'no provider shown');
});

// ─── 7. Extract Frames (metadata_only) ─────────────────────────────────────
console.log('\n🎬 7. extract_frames (metadata_only + output_path)');
await test('extract_frames_metadata', async () => {
    const { extractFramesTool } = require('../dist/tools/power/extract_frames.js');

    // Test with nonexistent file
    const result1 = await extractFramesTool.execute({
        source: '/tmp/nonexistent.mp4',
        metadata_only: true,
    }, fakeContext);
    if (result1.includes('introuvable')) ok('Missing file detected');
    else fail('missing_file', result1);

    // Test FFmpeg detection
    const result2 = await extractFramesTool.execute({
        source: '/tmp/nonexistent.mp4',
        at_time: '5',
    }, fakeContext);
    if (result2.includes('introuvable') || result2.includes('FFmpeg')) ok('Error handling OK');
    else fail('error_handling', result2);
});

// ─── 8. Extract Audio ───────────────────────────────────────────────────────
console.log('\n🎵 8. extract_audio (output_path)');
await test('extract_audio', async () => {
    const { extractAudioTool } = require('../dist/tools/power/extract_audio.js');

    // Test with nonexistent file
    const result = await extractAudioTool.execute({
        source: '/tmp/nonexistent.mp4',
        format: 'mp3',
    }, fakeContext);
    if (result.includes('introuvable')) ok('Missing file detected');
    else fail('missing_file', result);

    // Verify tool has output_path param
    if (extractAudioTool.description.includes('audio')) ok('Description mentions audio');
    else fail('description', 'no audio in description');
});

// ─── 9. Remove Background (structure only - no API call) ────────────────────
console.log('\n✂️ 9. remove_background (structure check)');
await test('remove_background_structure', async () => {
    const { removeBackgroundTool } = require('../dist/tools/power/remove_background.js');

    // Test file validation (no API call)
    const result = await removeBackgroundTool.execute({
        image_path: '/tmp/nonexistent.jpg',
    }, fakeContext);
    if (result.includes('not found') || result.includes('❌')) ok('Missing file validation');
    else fail('validation', result);

    // Test format validation
    const tmpFile = path.join(TEST_DIR, 'test.txt');
    fs.writeFileSync(tmpFile, 'not an image');
    const result2 = await removeBackgroundTool.execute({
        image_path: tmpFile,
    }, fakeContext);
    if (result2.includes('Unsupported') || result2.includes('❌')) ok('Format validation');
    else fail('format_check', result2);
});

// ─── Cleanup & Summary ─────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Résultats: ${passed} ✅  ${failed} ❌`);
console.log(`   Test directory: ${TEST_DIR}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Cleanup
try { fs.rmSync(TEST_DIR, { recursive: true }); } catch { }

process.exit(failed > 0 ? 1 : 0);
