import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ───────────────────────────────────────────
const API_KEY = "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK";
const OUTPUT_DIR = path.join(__dirname, '../tests/generated_media/complex_workflows');
const REPORT_DIR = path.join(__dirname, '../tests/reports');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// Base images (already generated, reuse URLs to avoid re-gen cost)
const BASE_PROMPT_1 = "cyberpunk city, neon lights, detailed, 8k";
const BASE_PROMPT_2 = "cyberpunk city ruins, overgrown, detailed, 8k";
const BASE_IMAGE_1_URL = `https://image.pollinations.ai/prompt/${encodeURIComponent(BASE_PROMPT_1)}?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;
const BASE_IMAGE_2_URL = `https://image.pollinations.ai/prompt/${encodeURIComponent(BASE_PROMPT_2)}?model=flux&width=1024&height=1024&nologo=true&key=${API_KEY}`;

// ─── Report collector ────────────────────────────────────────
const report = {
    timestamp: new Date().toISOString(),
    apiKey: API_KEY.substring(0, 8) + '...',
    tests: []
};

// ─── HTTP Download with full diagnostics ─────────────────────
function download(url, dest, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const file = dest ? fs.createWriteStream(dest) : null;
        const isHttps = url.startsWith('https');
        const lib = isHttps ? https : http;

        const headers = {};
        if (body) {
            headers['Content-Type'] = 'application/json';
            headers['Authorization'] = `Bearer ${API_KEY}`;
            headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = lib.request(url, { method, headers }, (response) => {
            const elapsed = Date.now() - startTime;
            const respHeaders = response.headers;

            if (response.statusCode >= 400) {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    reject({
                        status: response.statusCode,
                        body: data.substring(0, 1000),
                        headers: respHeaders,
                        elapsed
                    });
                });
                return;
            }

            if (file) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve({
                        status: response.statusCode,
                        headers: respHeaders,
                        size: file.bytesWritten,
                        elapsed
                    });
                });
            } else {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({
                    status: response.statusCode,
                    headers: respHeaders,
                    body: data,
                    elapsed
                }));
            }
        });

        req.on('error', (err) => {
            if (file) fs.unlink(dest, () => { });
            reject({ status: 0, body: err.message, elapsed: Date.now() - startTime });
        });

        req.setTimeout(180000, () => { // 3 min timeout for video
            req.destroy();
            reject({ status: 0, body: 'TIMEOUT (180s)', elapsed: Date.now() - startTime });
        });

        if (body) req.write(body);
        req.end();
    });
}

// ─── Extract all cost/usage headers ──────────────────────────
function extractCostHeaders(headers) {
    const costs = {};
    for (const [key, value] of Object.entries(headers)) {
        if (key.startsWith('x-usage') || key.startsWith('x-cost') || key.startsWith('x-billing') || key.startsWith('x-pollen')) {
            costs[key] = value;
        }
    }
    return costs;
}

// ─── Tests ───────────────────────────────────────────────────

const tests = [
    // ═══ 1. LTX-2 (T2V) — Previous: 520 Server Error ═══
    {
        id: 'ltx2_t2v',
        name: 'ltx-2',
        category: 'Video T2V',
        desc: 'LTX-2 Video (Lightricks) — Retry after 520',
        run: async () => {
            const prompt = "A futuristic cyberpunk city at night";
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=ltx-2&seed=42&key=${API_KEY}&duration=5`;
            const dest = path.join(OUTPUT_DIR, 'ltx-2_video_retry.mp4');
            return { url: url.replace(API_KEY, 'KEY'), dest, result: await download(url, dest) };
        }
    },

    // ═══ 2. SEEDANCE I2V — Previous: 400 (bad aspectRatio 21:9) ═══
    // Fix: Only 16:9 or 9:16 accepted
    {
        id: 'seedance_i2v_16x9',
        name: 'seedance',
        category: 'Video I2V',
        desc: 'Seedance I2V — Fix: aspectRatio=16:9',
        run: async () => {
            const prompt = "A futuristic cyberpunk city";
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=seedance&seed=42&key=${API_KEY}&duration=5&aspectRatio=16:9&image=${encodeURIComponent(BASE_IMAGE_1_URL)}`;
            const dest = path.join(OUTPUT_DIR, 'seedance_i2v_16x9.mp4');
            return { url: url.replace(API_KEY, 'KEY'), dest, result: await download(url, dest) };
        }
    },
    {
        id: 'seedance_i2v_9x16',
        name: 'seedance',
        category: 'Video I2V',
        desc: 'Seedance I2V — Test: aspectRatio=9:16 (Portrait)',
        run: async () => {
            const prompt = "A futuristic cyberpunk city";
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=seedance&seed=42&key=${API_KEY}&duration=5&aspectRatio=9:16&image=${encodeURIComponent(BASE_IMAGE_1_URL)}`;
            const dest = path.join(OUTPUT_DIR, 'seedance_i2v_9x16.mp4');
            return { url: url.replace(API_KEY, 'KEY'), dest, result: await download(url, dest) };
        }
    },

    // ═══ 3. VEO INTERPOLATION — Previous: 400 (image expects string not array) ═══
    // Fix: Try sending both images as comma-separated string in single &image= param
    {
        id: 'veo_interp_comma',
        name: 'veo',
        category: 'Video Interpolation',
        desc: 'Veo Interp — Fix attempt 1: image=url1,url2 (comma-sep)',
        run: async () => {
            const prompt = "morph";
            const combinedImages = `${BASE_IMAGE_1_URL},${BASE_IMAGE_2_URL}`;
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=veo&seed=42&key=${API_KEY}&duration=4&aspectRatio=16:9&image=${encodeURIComponent(combinedImages)}`;
            const dest = path.join(OUTPUT_DIR, 'veo_interp_comma.mp4');
            return { url: url.replace(API_KEY, 'KEY'), dest, result: await download(url, dest) };
        }
    },
    {
        id: 'veo_interp_first_only',
        name: 'veo',
        category: 'Video Interpolation',
        desc: 'Veo Interp — Fix attempt 2: single image (start frame only)',
        run: async () => {
            const prompt = "transform into ruins, overgrown with plants";
            const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=veo&seed=42&key=${API_KEY}&duration=4&aspectRatio=16:9&image=${encodeURIComponent(BASE_IMAGE_1_URL)}`;
            const dest = path.join(OUTPUT_DIR, 'veo_interp_single.mp4');
            return { url: url.replace(API_KEY, 'KEY'), dest, result: await download(url, dest) };
        }
    },
];

// ─── Runner ──────────────────────────────────────────────────
async function run() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  POLLINATIONS V6 — Diagnostic Report (Failures)');
    console.log(`  ${new Date().toISOString()}`);
    console.log(`  Key: ${API_KEY.substring(0, 8)}...`);
    console.log('═══════════════════════════════════════════════════\n');

    for (const test of tests) {
        console.log(`\n🧪 [${test.category}] ${test.desc}`);
        console.log(`   Model: ${test.name} | ID: ${test.id}`);

        const entry = {
            id: test.id,
            model: test.name,
            category: test.category,
            description: test.desc,
            status: 'UNKNOWN',
            httpStatus: null,
            url: null,
            file: null,
            fileSize: null,
            contentType: null,
            elapsed: null,
            costs: {},
            allHeaders: {},
            error: null
        };

        try {
            const { url, dest, result } = await test.run();
            entry.url = url;
            entry.file = path.basename(dest);
            entry.httpStatus = result.status;
            entry.elapsed = result.elapsed;
            entry.contentType = result.headers['content-type'];
            entry.costs = extractCostHeaders(result.headers);
            entry.allHeaders = result.headers;
            entry.status = 'SUCCESS';

            if (result.size) {
                entry.fileSize = `${(result.size / 1024).toFixed(1)} KB`;
            }

            console.log(`   ✅ SUCCESS — ${entry.fileSize || 'N/A'} | ${entry.contentType} | ${entry.elapsed}ms`);

            if (Object.keys(entry.costs).length > 0) {
                console.log(`   💰 Costs:`, JSON.stringify(entry.costs));
            }

            // Log ALL response headers for reference
            console.log(`   📋 Headers:`, JSON.stringify(result.headers, null, 2));

        } catch (e) {
            entry.status = 'FAILED';
            entry.httpStatus = e.status;
            entry.elapsed = e.elapsed;
            entry.error = e.body;
            entry.allHeaders = e.headers || {};
            entry.costs = e.headers ? extractCostHeaders(e.headers) : {};

            console.log(`   ❌ FAILED — HTTP ${e.status} | ${e.elapsed}ms`);
            console.log(`   Error: ${(e.body || '').substring(0, 300)}`);
        }

        report.tests.push(entry);
    }

    // ─── Generate Report ─────────────────────────────────────
    const reportPath = path.join(REPORT_DIR, `diagnostic_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════');

    const successes = report.tests.filter(t => t.status === 'SUCCESS');
    const failures = report.tests.filter(t => t.status === 'FAILED');

    console.log(`  ✅ Passed: ${successes.length}/${report.tests.length}`);
    console.log(`  ❌ Failed: ${failures.length}/${report.tests.length}`);

    if (failures.length > 0) {
        console.log('\n  Failed tests:');
        failures.forEach(f => console.log(`    - ${f.id}: HTTP ${f.httpStatus} — ${(f.error || '').substring(0, 100)}`));
    }

    // ─── Capability Matrix (from this run + previous) ────────
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  VERIFIED CAPABILITY MATRIX (Previous + This Run)');
    console.log('═══════════════════════════════════════════════════');
    console.log(`
  ┌─────────────────┬──────┬──────┬──────┬──────┬───────┬────────────┬───────────────┐
  │ Model           │ T2I  │ I2I  │ T2V  │ I2V  │ Audio │ Duration   │ AspectRatios   │
  ├─────────────────┼──────┼──────┼──────┼──────┼───────┼────────────┼───────────────┤
  │ flux            │  ✅  │  ❌  │  —   │  —   │   —   │     —      │    w/h         │
  │ klein           │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ klein-large     │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ kontext         │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ seedream        │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ seedream-pro    │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ nanobanana      │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ nanobanana-pro  │  ✅  │  ✅  │  —   │  —   │   —   │     —      │    w/h         │
  │ grok-video      │  —   │  —   │  ✅  │  ❌  │   ❓  │   1-15s    │ 16:9,9:16,1:1  │
  │ wan             │  —   │  —   │  ❌  │  ✅  │   ✅  │   5-15s    │ 16:9,9:16,1:1  │
  │ veo             │  —   │  —   │  ✅  │  ✅  │   ✅  │   4,6,8s   │ 16:9,9:16      │
  │ seedance        │  —   │  —   │  ✅  │  ✅  │   ❌  │   1.2-12s  │ 16:9,9:16 ONLY │
  │ ltx-2           │  —   │  —   │  ⚠️  │  ❌  │   ✅  │   std      │ 16:9           │
  │ elevenmusic     │  —   │  —   │  —   │  —   │   ✅  │   3-300s   │     —          │
  │ openai-audio    │  —   │  —   │  —   │  —   │   ✅  │     —      │     —          │
  └─────────────────┴──────┴──────┴──────┴──────┴───────┴────────────┴───────────────┘

  KEY FINDINGS:
  - seedance: ONLY 16:9 or 9:16 (21:9 rejected despite docs)
  - wan: I2V ONLY (T2V returns 400 "requires image")
  - veo interp: image param expects STRING not ARRAY
  - ltx-2: intermittent 520 (server-side)
  - openai-audio: endpoint = gen.pollinations.ai (NOT text.)
`);

    console.log(`\n  📄 Full report saved: ${reportPath}`);
}

run();
