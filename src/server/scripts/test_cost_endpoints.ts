import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.POLLINATIONS_API_KEY || 'sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H';

async function logBalance(label: string) {
    try {
        const res = await fetch('https://gen.pollinations.ai/account/balance', {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const bal = await res.json();
        console.log(`\n[${label}] /account/balance :`);
        console.log(JSON.stringify(bal, null, 2));

        const resUsage = await fetch('https://gen.pollinations.ai/account/usage/daily', {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const usg = await resUsage.json();

        // Sum today stats
        let costTier = 0; let costPack = 0; let req = 0;
        if (usg.usage && usg.usage.length > 0) {
            const todayDate = usg.usage[0].date;
            for (const x of usg.usage) {
                if (x.date === todayDate) {
                    req += x.requests;
                    if (x.meter_source === 'tier') costTier += x.cost_usd;
                    else costPack += x.cost_usd;
                }
            }
        }
        console.log(`[${label}] /account/usage/daily (Today sum) : Requests = ${req}, TierCost = ${costTier}, PackCost = ${costPack}`);

        return { bal, usage: { costTier, costPack, req } };
    } catch (e: any) {
        console.error("Error fetching balance/usage:", e.message);
        return null;
    }
}

async function run() {
    console.log("=== COST ENDPOINTS PROBE ===");

    // 1. Avant
    const stateBefore = await logBalance("BEFORE GENERATION");

    // 2. Générer Fake Image (Flux : censé être free tier ou cheap)
    console.log("\n🎬 Génération d'une image (modèle 'flux')...");
    const url = 'https://gen.pollinations.ai/image/a_beautiful_red_square_cost_test?model=flux&width=512&height=512&nologo=true';
    const start = Date.now();
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
    const buffer = await res.arrayBuffer();

    console.log(`✅ Image reçue en ${Date.now() - start}ms, taille: ${buffer.byteLength}B`);
    console.log(`Headers Cost:`, {
        'x-usage-cost-usd': res.headers.get('x-usage-cost-usd'),
        'x-usage-completion-image-tokens': res.headers.get('x-usage-completion-image-tokens')
    });

    // 3. Immediatement Apres
    await logBalance("IMMEDIATELY AFTER");

    // 4. Attente 5 secondes
    console.log("\n⏳ Attente 5 secondes pour propagation /usage...");
    await new Promise(r => setTimeout(r, 5000));
    await logBalance("5 SECONDS AFTER");
}

run();
