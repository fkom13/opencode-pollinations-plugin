
// scripts/test-commands-report.js
import { handleCommand } from '../dist/server/commands.js';
import { loadConfig } from '../dist/server/config.js';

const COMMANDS_TO_TEST = [
    "/pollinations help",
    "/pollinations mode",
    "/pollinations usage compact",
    "/pollinations usage full",
    "/pollinations mode alwaysfree",
    "/pollinations mode pro",
    "/pollinations mode manual",
    "/pollinations config",
    "/pollinations fallback mistral openai-fast"
];

async function runTests() {
    console.log("# RAPPORT DE VALIDATION DES COMMANDES V4");
    console.log(`Date: ${new Date().toLocaleString()}`);
    console.log("----------------------------------------\n");

    for (const cmd of COMMANDS_TO_TEST) {
        console.log(`>>> COMMANDE: ${cmd}`);
        try {
            const result = await handleCommand(cmd);
            if (result.handled) {
                if (result.error) {
                    console.log(`❌ ERREUR: ${result.error}`);
                } else {
                    console.log(`✅ SUCCÈS:`);
                    console.log(result.response);
                }
            } else {
                console.log(`⚠️ NON GÉRÉE`);
            }
        } catch (e) {
            console.log(`💥 EXCEPTION: ${e}`);
        }
        console.log("\n----------------------------------------\n");
    }
}

// Mocking dependencies if necessary (Assuming dist is built and usable)
// The dist/server/config.js relies on fs existsSync, which works in node.
// The commands rely on quota.ts which relies on fetch. Node 18+ has fetch.
// If fetch fails (no network in script?), usage commands might fail.
// But we are in an environment with network access usually.

runTests();
