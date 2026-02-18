/**
 * V6 Tools Test — Quick validation of all bonus & power tools
 * Run: node scripts/test_bonus_tools.js
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// We test the compiled JS files directly since they export tool definitions
// The tool definitions have { description, args, execute } shape

const TESTS = [];
let passed = 0;
let failed = 0;

function log(icon, msg) {
    console.log(`${icon} ${msg}`);
}

// === TEST 1: gen_qrcode ===
async function testQRCode() {
    log('🔲', 'Testing gen_qrcode...');
    const { genQrcodeTool } = await import('../dist/tools/design/gen_qrcode.js');

    // Mock context
    const ctx = { metadata: () => { }, ask: async () => { } };

    const result = await genQrcodeTool.execute({ content: 'https://pollinations.ai', size: 256 }, ctx);

    if (result.includes('QR Code Generated') && result.includes('.png')) {
        log('✅', `gen_qrcode PASSED`);
        passed++;
        // Extract file path and verify
        const match = result.match(/File: (.+\.png)/);
        if (match && fs.existsSync(match[1])) {
            log('  📁', `File exists: ${match[1]} (${fs.statSync(match[1]).size} bytes)`);
        }
    } else {
        log('❌', `gen_qrcode FAILED:\n${result}`);
        failed++;
    }
}

// === TEST 2: gen_palette ===
async function testPalette() {
    log('🎨', 'Testing gen_palette...');
    const { genPaletteTool } = await import('../dist/tools/design/gen_palette.js');

    const ctx = { metadata: () => { }, ask: async () => { } };

    const result = await genPaletteTool.execute({ color: '#3B82F6', scheme: 'triadic', count: 5 }, ctx);

    if (result.includes('Palette Generated') && result.includes('#')) {
        log('✅', `gen_palette PASSED`);
        passed++;
        const match = result.match(/File: (.+\.svg)/);
        if (match && fs.existsSync(match[1])) {
            log('  📁', `SVG file: ${match[1]} (${fs.statSync(match[1]).size} bytes)`);
        }
    } else {
        log('❌', `gen_palette FAILED:\n${result}`);
        failed++;
    }
}

// === TEST 3: gen_diagram ===
async function testDiagram() {
    log('📊', 'Testing gen_diagram...');
    const { genDiagramTool } = await import('../dist/tools/design/gen_diagram.js');

    const ctx = { metadata: () => { }, ask: async () => { } };

    const result = await genDiagramTool.execute({
        code: 'graph LR; A-->B; B-->C',
        format: 'svg',
        theme: 'dark'
    }, ctx);

    if (result.includes('Diagram Rendered') && result.includes('mermaid.ink')) {
        log('✅', `gen_diagram PASSED`);
        passed++;
        const match = result.match(/File: (.+\.svg)/);
        if (match && fs.existsSync(match[1])) {
            log('  📁', `SVG file: ${match[1]} (${fs.statSync(match[1]).size} bytes)`);
        }
    } else {
        log('❌', `gen_diagram FAILED:\n${result}`);
        failed++;
    }
}

// === TEST 4: file_to_url ===
async function testFileToUrl() {
    log('📤', 'Testing file_to_url...');
    const { fileToUrlTool } = await import('../dist/tools/power/file_to_url.js');

    const ctx = { metadata: () => { }, ask: async () => { } };

    // Create a small test file
    const testFile = path.join(os.tmpdir(), 'test_pollinations_upload.txt');
    fs.writeFileSync(testFile, 'Hello from Pollinations Plugin V6 test!');

    const result = await fileToUrlTool.execute({ file_path: testFile, expiry: '1h' }, ctx);

    // Cleanup
    try { fs.unlinkSync(testFile); } catch { }

    if (result.includes('File Uploaded') && result.includes('https://')) {
        log('✅', `file_to_url PASSED`);
        passed++;
        const match = result.match(/URL: (https:\/\/.+)/);
        if (match) log('  🔗', `URL: ${match[1]}`);
    } else {
        log('❌', `file_to_url FAILED:\n${result}`);
        failed++;
    }
}

// === TEST 5: Tool Registry ===
async function testRegistry() {
    log('📋', 'Testing tool registry...');
    const { createToolRegistry } = await import('../dist/tools/index.js');

    const tools = createToolRegistry();
    const toolNames = Object.keys(tools);

    const expectedFree = ['gen_qrcode', 'gen_diagram', 'gen_palette', 'file_to_url', 'remove_background', 'extract_frames'];
    const missing = expectedFree.filter(t => !toolNames.includes(t));

    if (missing.length === 0) {
        log('✅', `Tool registry PASSED: ${toolNames.length} tools registered`);
        log('  📋', `Tools: ${toolNames.join(', ')}`);
        passed++;
    } else {
        log('❌', `Tool registry FAILED. Missing: ${missing.join(', ')}`);
        failed++;
    }
}

// === RUN ALL ===
async function run() {
    console.log('\n🧪 V6 Bonus Tools Test Suite\n' + '═'.repeat(40) + '\n');

    await testQRCode();
    await testPalette();
    await testDiagram();
    await testFileToUrl();
    await testRegistry();

    console.log('\n' + '═'.repeat(40));
    console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

    if (failed > 0) process.exit(1);
}

run().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
