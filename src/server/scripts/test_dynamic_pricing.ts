import * as https from 'https';

function fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function auditDynamicPricing() {
    console.log("=== AUDIT PRICING DYNAMIQUE (TINYBIRD) ===");
    try {
        console.log("Fetching /api/model-stats...");
        const statsProxy = await fetchJson('https://enter.pollinations.ai/api/model-stats');
        const stats = statsProxy.data || [];

        console.log(`\nReçu ${stats.length} statistiques de prix moyens (average cost) depuis Tinybird:`);
        // On affiche les 10 premiers pour l'exemple
        console.log(stats.slice(0, 10).map((s: any) => `- ${s.model}: ${parseFloat(s.avg_cost_usd).toFixed(6)}$/req (${s.request_count} reqs)`).join('\n'));

        console.log("\nFetching /image/models...");
        const imageModels = await fetchJson('https://gen.pollinations.ai/image/models');

        console.log("\nCroisement Models API vs Tinybird Stats:");
        for (const m of imageModels.slice(0, 5)) {
            const stat = stats.find((s: any) => s.model === m.name);
            console.log(`\nModèle: ${m.name}`);
            console.log(`- API Pricing Base:`, m.pricing);
            if (stat) {
                console.log(`- Tinybird Real Average Cost: ${stat.avg_cost_usd}$ (Basé sur le vrai usage!)`);
            } else {
                console.log(`- Tinybird Stats: Inconnu / Pas d'usage récent`);
            }
        }
    } catch (e: any) {
        console.error("Erreur lors de l'audit:", e.message);
    }
}

auditDynamicPricing();
