
import { ModelDiscovery } from '../dist/discovery.js';
import { EnterpriseClient, FreeClient } from '../dist/clients.js';

const API_KEY = "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK";
const PROMPT = "Salut qui es tu ? (Réponds en 1 phrase courte)";

async function test() {
    console.log("=== PHAS 1 VALIDATION (JS MODE) ===");

    // 1. DISCOVERY
    console.log("\n🔍 Testing Model Discovery...");
    const discovery = new ModelDiscovery();
    const models = await discovery.getModels(API_KEY);
    console.log(`✅ Found ${models.length} models with tools capability.`);

    const enterModels = models.filter(m => m.source === 'enterprise');
    const freeModels = models.filter(m => m.source === 'free');

    console.log(`   - Enterprise: ${enterModels.length}`);
    console.log(`   - Free Legacy: ${freeModels.length}`);

    // 2. ENTERPRISE
    const enterClient = new EnterpriseClient(API_KEY);
    const enterTargets = ['gemini', 'openai', 'glm'];

    console.log("\n🏢 Testing ENTERPRISE Client...");
    for (const modelId of enterTargets) {
        process.stdout.write(`   > Testing ${modelId}... `);
        try {
            const body = enterClient.transformRequest({
                model: modelId,
                messages: [{ role: "user", content: PROMPT }],
                stream: false
            }, modelId);

            const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
                method: "POST",
                headers: enterClient.getHeaders(),
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const json = await res.json();
                console.log(`✅ OK (${json.choices[0].message.content.substring(0, 30)}...)`);
            } else {
                console.log(`❌ HTTP ${res.status}`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    // 3. FREE
    console.log("\n🆓 Testing FREE Client...");
    const freeClient = new FreeClient();
    const testFreeModels = freeModels.slice(0, 5);

    for (const model of testFreeModels) {
        process.stdout.write(`   > Testing ${model.originalId}... `);
        try {
            const body = freeClient.transformRequest({
                model: model.originalId,
                messages: [{ role: "user", content: PROMPT }],
                stream: false
            }, model.originalId);

            const res = await fetch("https://text.pollinations.ai/openai/chat/completions", {
                method: "POST",
                headers: freeClient.getHeaders(),
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const json = await res.json();
                console.log(`✅ OK (${json.choices[0].message.content.substring(0, 30)}...)`);
            } else {
                console.log(`❌ HTTP ${res.status}`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }
}

test();
