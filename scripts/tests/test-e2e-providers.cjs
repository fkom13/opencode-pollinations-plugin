#!/usr/bin/env node
/**
 * E2E Provider Test — Minimal chat completion probes per model family.
 * Tests: baseline (no tools), with tools, with tools+reasoningEffort.
 *
 * Usage:
 *   POLLINATIONS_API_KEY=sk_xxx node scripts/tests/test-e2e-providers.cjs
 *   node scripts/tests/test-e2e-providers.cjs sk_xxx
 *
 * Cost: ~0.3-0.5 pollen total (short prompts, cheap models).
 */
const https = require('https');

const API_KEY = process.env.POLLINATIONS_API_KEY || process.argv[2] || '';
const HOST = 'gen.pollinations.ai';
const PATH = '/v1/chat/completions';

const colors = {
    reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
    yellow: '\x1b[33m', blue: '\x1b[34m', dim: '\x1b[2m',
};

let passed = 0, failed = 0, warned = 0;

function log(status, msg) {
    const icon = status === 'PASS' ? `${colors.green}✓${colors.reset}`
        : status === 'FAIL' ? `${colors.red}✗${colors.reset}`
        : `${colors.yellow}⚠${colors.reset}`;
    console.log(`  ${icon} ${msg}`);
    if (status === 'PASS') passed++;
    else if (status === 'FAIL') failed++;
    else warned++;
}

function chatCompletion(body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname: HOST, path: PATH, method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'opencode-pollinations-plugin/e2e-test',
                ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
            },
            timeout: 30000,
        };
        const req = https.request(opts, (res) => {
            let chunks = '';
            res.on('data', c => chunks += c);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(chunks); } catch {}
                resolve({ status: res.statusCode, json, raw: chunks.substring(0, 300) });
            });
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
        req.end(data);
    });
}

const SIMPLE_MSG = [{ role: 'user', content: 'Say hello in exactly 5 words.' }];
const TOOL_DEF = [{ type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } } }];
const TOOL_MSG = [{ role: 'user', content: 'What is the weather in Paris? Use the tool.' }];

async function testModel(name, model, opts = {}) {
    const { tools, reasoningEffort } = opts;
    const label = `${model}${tools ? ' +tools' : ''}${reasoningEffort ? ' +reasoning' : ''}`;

    const body = {
        model,
        messages: tools ? TOOL_MSG : SIMPLE_MSG,
        max_tokens: 100,
        private: true,
    };
    if (tools) body.tools = TOOL_DEF;
    if (reasoningEffort) body.reasoning_effort = reasoningEffort;

    const { status, json, raw, error } = await chatCompletion(body);

    if (status === 200 && json?.choices?.[0]?.message?.content) {
        log('PASS', `${label} → "${json.choices[0].message.content.substring(0, 50)}"`);
    } else if (status === 200 && json?.choices?.[0]?.message?.tool_calls) {
        log('PASS', `${label} → tool_call: ${json.choices[0].message.tool_calls[0]?.function?.name}`);
    } else if (status === 429 || status === 502) {
        log('WARN', `${label} → ${status} (rate limit / upstream, not adapter bug)`);
    } else if (status === 400) {
        const errMsg = json?.error?.message || raw || '';
        log('FAIL', `${label} → 400: ${errMsg.substring(0, 120)}`);
    } else if (status === 0) {
        log('WARN', `${label} → ${error}`);
    } else {
        const errMsg = json?.error?.message || raw || `HTTP ${status}`;
        log('FAIL', `${label} → ${status}: ${errMsg.substring(0, 120)}`);
    }
}

async function main() {
    console.log(`\n${colors.yellow}=== E2E Provider Tests ===${colors.reset}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : 'NONE'}\n`);

    if (!API_KEY) {
        console.log(`${colors.red}ERROR: API key required for E2E tests.${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.blue}── Azure/OpenAI Family ──${colors.reset}`);
    await testModel('azure-simple', 'openai');
    await testModel('azure-tools', 'openai', { tools: true });
    await testModel('azure-tools-reasoning', 'openai', { tools: true, reasoningEffort: 'low' });
    await testModel('gpt54-tools-reasoning', 'gpt-5.4', { tools: true, reasoningEffort: 'low' });
    await testModel('gpt-oss-tools', 'gpt-oss', { tools: true });

    console.log(`\n${colors.blue}── Anthropic/Bedrock ──${colors.reset}`);
    await testModel('claude-tools', 'claude-fast', { tools: true });

    console.log(`\n${colors.blue}── Google Vertex ──${colors.reset}`);
    await testModel('gemini-tools', 'gemini-3-flash', { tools: true });
    await testModel('gemini-reasoning', 'gemini', { tools: true, reasoningEffort: 'high' });

    console.log(`\n${colors.blue}── Moonshot ──${colors.reset}`);
    await testModel('kimi-tools', 'kimi', { tools: true });

    console.log(`\n${colors.blue}── DeepSeek ──${colors.reset}`);
    await testModel('deepseek', 'deepseek');

    console.log(`\n${colors.blue}── xAI ──${colors.reset}`);
    await testModel('grok-tools', 'grok', { tools: true });

    console.log(`\n${colors.blue}── Mistral ──${colors.reset}`);
    await testModel('mistral-tools', 'mistral', { tools: true });

    console.log(`\n${colors.blue}── Amazon Bedrock ──${colors.reset}`);
    await testModel('nova', 'nova-fast');

    console.log(`\n${colors.blue}── Alibaba ──${colors.reset}`);
    await testModel('qwen-tools', 'qwen-coder', { tools: true });

    console.log(`\n${colors.blue}── Zhipu / Meta / Others ──${colors.reset}`);
    await testModel('glm', 'glm');
    await testModel('llama', 'llama');
    await testModel('perplexity', 'perplexity-fast');
    await testModel('minimax', 'minimax');

    console.log(`\n${colors.yellow}=== Results ===${colors.reset}`);
    console.log(`${colors.green}PASS: ${passed}${colors.reset} | ${colors.red}FAIL: ${failed}${colors.reset} | ${colors.yellow}WARN: ${warned}${colors.reset}`);
    console.log(`Total: ${passed + failed + warned}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main();
