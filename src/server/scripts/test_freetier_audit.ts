/**
 * TEST FREETIER AUDIT — Quick & Dirty
 * Objectif: Tester les modèles freetier Enter pour vérifier:
 * - Latence de réponse
 * - Headers de coût (x-usage-*)
 * - Real cost via /account/balance diff
 * - Erreurs et paramètres
 * 
 * Usage: npx tsx src/server/scripts/test_freetier_audit.ts
 */

const API_KEY = 'sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H';
const BASE = 'https://gen.pollinations.ai';

// ─── HELPERS ────────────────────────────────────────────────────────

async function getBalance(): Promise<number> {
    const res = await fetch(`${BASE}/account/balance`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await res.json() as any;
    return data.balance;
}

async function getProfile(): Promise<any> {
    const res = await fetch(`${BASE}/account/profile`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    return await res.json();
}

function extractCostHeaders(headers: Headers): Record<string, string> {
    const cost: Record<string, string> = {};
    headers.forEach((v, k) => {
        if (k.startsWith('x-usage') || k.startsWith('x-cost') || k.startsWith('x-pollen') || k.startsWith('x-meter')) {
            cost[k] = v;
        }
    });
    return cost;
}

// ─── TEST FUNCTIONS ─────────────────────────────────────────────────

interface TestResult {
    name: string;
    model: string;
    type: string;
    latencyMs: number;
    status: number;
    costHeaders: Record<string, string>;
    balanceBefore: number;
    balanceAfter: number;
    realCost: number;
    error?: string;
    extraInfo?: string;
}

async function testText(model: string, prompt: string = 'Say hi in 5 words'): Promise<TestResult> {
    const balBefore = await getBalance();
    const start = Date.now();

    const res = await fetch(`${BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 30,
            stream: false
        }),
        signal: AbortSignal.timeout(20000)
    });

    const latency = Date.now() - start;
    const costHeaders = extractCostHeaders(res.headers);
    let error: string | undefined;
    let extraInfo: string | undefined;

    if (!res.ok) {
        const errBody = await res.text();
        error = `${res.status}: ${errBody.substring(0, 200)}`;
    } else {
        const body = await res.json() as any;
        const usage = body.usage;
        if (usage) {
            extraInfo = `prompt=${usage.prompt_tokens} comp=${usage.completion_tokens} total=${usage.total_tokens}`;
        }
    }

    // Wait 1s for balance to propagate
    await new Promise(r => setTimeout(r, 1000));
    const balAfter = await getBalance();

    return {
        name: `Text: ${model}`,
        model, type: 'text', latencyMs: latency, status: res.status,
        costHeaders, balanceBefore: balBefore, balanceAfter: balAfter,
        realCost: Math.round((balBefore - balAfter) * 10000) / 10000,
        error, extraInfo
    };
}

async function testImage(model: string): Promise<TestResult> {
    const balBefore = await getBalance();
    const start = Date.now();
    const prompt = encodeURIComponent('a small red square test');

    const res = await fetch(`${BASE}/image/${prompt}?model=${model}&width=256&height=256&nologo=true`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        redirect: 'follow',
        signal: AbortSignal.timeout(40000)
    });

    const latency = Date.now() - start;
    const costHeaders = extractCostHeaders(res.headers);
    let error: string | undefined;
    let extraInfo: string | undefined;

    if (!res.ok) {
        error = `${res.status}: ${(await res.text()).substring(0, 200)}`;
    } else {
        const ct = res.headers.get('content-type') || 'unknown';
        const buf = await res.arrayBuffer();
        extraInfo = `content-type=${ct}, size=${buf.byteLength}B`;
    }

    await new Promise(r => setTimeout(r, 1000));
    const balAfter = await getBalance();

    return {
        name: `Image: ${model}`,
        model, type: 'image', latencyMs: latency, status: res.status,
        costHeaders, balanceBefore: balBefore, balanceAfter: balAfter,
        realCost: Math.round((balBefore - balAfter) * 10000) / 10000,
        error, extraInfo
    };
}

async function testAudio(model: string, input: string = 'Hello test'): Promise<TestResult> {
    const balBefore = await getBalance();
    const start = Date.now();

    const res = await fetch(`${BASE}/v1/audio/speech`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            input,
            voice: 'alloy',
            response_format: 'mp3'
        }),
        signal: AbortSignal.timeout(30000)
    });

    const latency = Date.now() - start;
    const costHeaders = extractCostHeaders(res.headers);
    let error: string | undefined;
    let extraInfo: string | undefined;

    if (!res.ok) {
        error = `${res.status}: ${(await res.text()).substring(0, 200)}`;
    } else {
        const buf = await res.arrayBuffer();
        extraInfo = `audio size=${buf.byteLength}B`;
    }

    await new Promise(r => setTimeout(r, 1000));
    const balAfter = await getBalance();

    return {
        name: `Audio: ${model}`,
        model, type: 'audio', latencyMs: latency, status: res.status,
        costHeaders, balanceBefore: balBefore, balanceAfter: balAfter,
        realCost: Math.round((balBefore - balAfter) * 10000) / 10000,
        error, extraInfo
    };
}

// ─── MAIN ───────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  FREETIER AUDIT — Enter Universe Tests');
    console.log('═══════════════════════════════════════════\n');

    // Profile
    const profile = await getProfile();
    console.log(`👤 User: ${profile.name} | Tier: ${profile.tier} | Reset: ${profile.nextResetAt}`);

    const startBalance = await getBalance();
    console.log(`💰 Starting Balance: ${startBalance} pollen\n`);

    const results: TestResult[] = [];

    // === TEXT FREETIER MODELS ===
    console.log('── TEXT MODELS (FreeTier) ──');

    const textModels = ['openai', 'mistral', 'gemini', 'qwen'];
    for (const m of textModels) {
        try {
            console.log(`  ⏳ Testing ${m}...`);
            const r = await testText(m);
            results.push(r);
            console.log(`  ${r.status === 200 ? '✅' : '❌'} ${r.name} | ${r.latencyMs}ms | cost=${r.realCost} | headers=${JSON.stringify(r.costHeaders)} | ${r.extraInfo || r.error || ''}`);
        } catch (e: any) {
            console.log(`  💥 ${m}: CRASH - ${e.message}`);
        }
    }

    // === IMAGE FREETIER MODELS ===
    console.log('\n── IMAGE MODELS (FreeTier) ──');

    const imageModels = ['flux', 'turbo'];
    for (const m of imageModels) {
        try {
            console.log(`  ⏳ Testing ${m}...`);
            const r = await testImage(m);
            results.push(r);
            console.log(`  ${r.status === 200 ? '✅' : '❌'} ${r.name} | ${r.latencyMs}ms | cost=${r.realCost} | headers=${JSON.stringify(r.costHeaders)} | ${r.extraInfo || r.error || ''}`);
        } catch (e: any) {
            console.log(`  💥 ${m}: CRASH - ${e.message}`);
        }
    }

    // === AUDIO TTS FREETIER ===
    console.log('\n── AUDIO TTS (FreeTier) ──');

    try {
        console.log(`  ⏳ Testing openai-audio (TTS)...`);
        const r = await testAudio('openai-audio', 'This is a short test');
        results.push(r);
        console.log(`  ${r.status === 200 ? '✅' : '❌'} ${r.name} | ${r.latencyMs}ms | cost=${r.realCost} | headers=${JSON.stringify(r.costHeaders)} | ${r.extraInfo || r.error || ''}`);
    } catch (e: any) {
        console.log(`  💥 audio: CRASH - ${e.message}`);
    }

    // === SUMMARY ===
    const endBalance = await getBalance();
    console.log('\n═══════════════════════════════════════════');
    console.log('  RÉSUMÉ');
    console.log('═══════════════════════════════════════════');
    console.log(`💰 Balance: ${startBalance} → ${endBalance} (dépensé: ${Math.round((startBalance - endBalance) * 10000) / 10000})`);
    console.log(`📊 Tests réussis: ${results.filter(r => r.status === 200).length}/${results.length}`);
    console.log(`⏱️  Latence moyenne: ${Math.round(results.filter(r => r.status === 200).reduce((a, r) => a + r.latencyMs, 0) / Math.max(1, results.filter(r => r.status === 200).length))}ms`);

    console.log('\n── TABLEAU DÉTAILLÉ ──');
    console.log('| Type | Model | Status | Latency | RealCost | Headers Cost | Info |');
    console.log('|------|-------|--------|---------|----------|-------------|------|');
    for (const r of results) {
        const hStr = Object.entries(r.costHeaders).map(([k, v]) => `${k.replace('x-usage-', '').replace('x-', '')}=${v}`).join(', ') || 'none';
        console.log(`| ${r.type} | ${r.model} | ${r.status} | ${r.latencyMs}ms | ${r.realCost} | ${hStr} | ${(r.extraInfo || r.error || '').substring(0, 50)} |`);
    }
}

main().catch(e => console.error('FATAL:', e));
