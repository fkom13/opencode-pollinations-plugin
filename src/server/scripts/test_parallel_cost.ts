import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../config.js';

function getApiKey(): string | null {
    const config = loadConfig();
    return config.apiKey || null;
}

interface Balance {
    tierCostUsd: number;
    totalRequests: number;
    rawBody: any;
}

async function getBalance(apiKey: string): Promise<Balance | null> {
    try {
        const resUsage = await fetch('https://gen.pollinations.ai/account/usage/daily', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!resUsage.ok) return null;

        const data = await resUsage.json();

        // On somme l'usage Freetier de ce jour précis (dernière date de l'API)
        let sumTierCost = 0;
        let sumRequests = 0;

        if (data.usage && data.usage.length > 0) {
            // Prendre uniquement les requêtes de la dernière journée (today)
            const latestDate = data.usage[0].date;

            for (const entry of data.usage) {
                if (entry.date === latestDate) {
                    sumRequests += entry.requests;
                    if (entry.meter_source !== 'pack') {
                        sumTierCost += entry.cost_usd;
                    }
                }
            }
        }

        return {
            tierCostUsd: sumTierCost,
            totalRequests: sumRequests,
            rawBody: data
        };
    } catch (e) {
        console.error("Erreur de fetch balance", e);
        return null;
    }
}

async function runTest() {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("Clé API introuvable !");
        return;
    }

    console.log("=== POLLINATIONS PARALLEL COST TEST (FREETIER) ===");
    console.log("Fetching daily usage footprint...");

    let initialBalance = await getBalance(apiKey);
    console.log("INITIAL:", {
        tierCostUsd: initialBalance?.tierCostUsd,
        totalRequests: initialBalance?.totalRequests
    });

    const NB_REQUESTS = 5;
    console.log(`\nLaunching ${NB_REQUESTS} parallel requests to 'mistral' (FreeTier)...`);

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < NB_REQUESTS; i++) {
        promises.push(
            fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistral',
                    messages: [{ role: 'user', content: `Test parallel FREETIER count request #${i}. Reponds 'OK'.` }],
                    max_tokens: 10
                })
            }).then(res => res.text()).catch(e => "Error")
        );
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`✅ ${NB_REQUESTS} free requests completed in ${duration}ms!`);

    console.log("\nFetching Daily Stats immediately after completions...");
    let quickBalance = await getBalance(apiKey);
    console.log("IMMEDIATE STATS:", {
        tierCostUsd: quickBalance?.tierCostUsd,
        totalRequests: quickBalance?.totalRequests
    });

    console.log("\nWaiting 10 seconds for eventual API indexation...");
    await new Promise(r => setTimeout(r, 10000));

    let delayedBalance = await getBalance(apiKey);
    console.log("DELAYED STATS (10s):", {
        tierCostUsd: delayedBalance?.tierCostUsd,
        totalRequests: delayedBalance?.totalRequests
    });

    if (initialBalance && quickBalance && delayedBalance) {
        const deltaReqQuick = quickBalance.totalRequests - initialBalance.totalRequests;
        const deltaReqDelayed = delayedBalance.totalRequests - initialBalance.totalRequests;

        console.log("\n=== CONCLUSIONS ===");
        console.log(`Requests indexed Immediately: +${deltaReqQuick}`);
        console.log(`Requests indexed 10s later: +${deltaReqDelayed}`);

        if (deltaReqQuick !== NB_REQUESTS && deltaReqDelayed === NB_REQUESTS) {
            console.warn("⚠️ USAGE API IS EVENTUALLY CONSISTENT! Delay is required to see real quota drop.");
        } else if (deltaReqDelayed !== NB_REQUESTS) {
            console.error(`❌ API did not index all ${NB_REQUESTS} requests. Only saw ${deltaReqDelayed}. Parallel drop bug!`);
        } else {
            console.log("✅ Usage API is strongly consistent over parallel streams.");
        }
    }
}

runTest();
