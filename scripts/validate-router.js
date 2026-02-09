
import { PollinationsPlugin } from '../dist/index.js';
import { ModelDiscovery } from '../dist/discovery.js';
import * as fs from 'fs';
import * as http from 'http';

const LOG_FILE = '/tmp/opencode_pollinations_debug.log';
const API_KEY = "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK";
const PROMPT = "Salut qui es tu ? (Réponds en 1 phrase courte)";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getProxyPort() {
    // Clear log file first to avoid reading old ports
    try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { }

    // Start Plugin
    console.log("🚀 Starting PollinationsPlugin...");
    PollinationsPlugin();

    // Poll log file for port
    let start = Date.now();
    while (Date.now() - start < 5000) {
        if (fs.existsSync(LOG_FILE)) {
            const content = fs.readFileSync(LOG_FILE, 'utf8');
            const match = content.match(/Started on port (\d+)/);
            if (match) {
                return parseInt(match[1]);
            }
        }
        await sleep(100);
    }
    throw new Error("Timeout waiting for proxy port");
}

async function chat(port, modelId, isEnter) {
    const url = `http://127.0.0.1:${port}/v1/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (isEnter) headers['Authorization'] = `Bearer ${API_KEY}`;

    // NOTE: OpenCode sends the namespaced ID in the body
    const body = {
        model: modelId,
        messages: [{ role: "user", content: PROMPT }],
        stream: false
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            return { ok: false, status: res.status, content: `[JSON PARSE ERROR] ${text.substring(0, 100)}` };
        }

        if (!res.ok) return { ok: false, status: res.status, content: JSON.stringify(json) };
        return { ok: true, status: res.status, content: json.choices?.[0]?.message?.content || "[NO CONTENT]" };

    } catch (e) {
        return { ok: false, status: 0, content: e.message };
    }
}

async function run() {
    console.log("=== ROUTER INTEGRATION TEST (VIA PROXY) ===");

    try {
        const port = await getProxyPort();
        console.log(`✅ Proxy running on port ${port}`);

        const discovery = new ModelDiscovery();
        const models = await discovery.getModels(API_KEY);

        // 1. SELECT MODELS
        const enterTargets = ['pollinations/enter/gemini', 'pollinations/enter/openai', 'pollinations/enter/glm'];
        // Filter available Free models
        const freeTargets = models.filter(m => m.source === 'free').map(m => m.id);

        console.log(`\n📋 Test Plan:`);
        console.log(`   - Enterprise: ${enterTargets.join(', ')}`);
        console.log(`   - Free: ${freeTargets.length} models (${freeTargets.join(', ')})`);

        // 2. RUN TESTS
        console.log("\n--- ENTERPRISE TESTS ---");
        for (const model of enterTargets) {
            process.stdout.write(`   > ${model}: `);
            const res = await chat(port, model, true);
            if (res.ok) console.log(`✅ 200 OK | "${res.content.substring(0, 40)}..."`);
            else console.log(`❌ ${res.status} | ${res.content}`);
        }

        console.log("\n--- FREE TESTS ---");
        for (const model of freeTargets) {
            process.stdout.write(`   > ${model}: `);
            const res = await chat(port, model, false);
            if (res.ok) console.log(`✅ 200 OK | "${res.content.substring(0, 40)}..."`);
            else console.log(`❌ ${res.status} | ${res.content}`);
        }

        console.log("\n✅ All Tests Completed. Exit 0.");
        process.exit(0);

    } catch (e) {
        console.error("❌ FATAL TEST ERROR:", e);
        process.exit(1);
    }
}

run();
