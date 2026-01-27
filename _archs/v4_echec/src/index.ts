
import type { Plugin } from "@opencode-ai/plugin";
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { generatePollinationsConfig } from './server/generate-config.js';

const LOG_FILE = '/tmp/opencode_pollinations_debug.log';

// Global cache for signature (simple single-user assumption)
let lastSignature: string | null = null;

function log(msg: string) {
    try {
        const ts = new Date().toISOString();
        fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
    } catch (e) { }
}

const POLLINATIONS_API_URL = "https://gen.pollinations.ai";

// --- PROXY IMPORTS ---
// We need to import the proxy handler function. 
// Ideally we should import from ./server/proxy.js but the file structure is compiled.
// For simplicity in this single-file V1-like structure, we rely on the proxy code being part of the build or imported dynamically.
// Wait, in V3 we split 'proxy.ts' into 'src/server/proxy.ts'.
import { handleChatCompletion } from './server/proxy.js'; // Ensure this matches build output

// Embedded Proxy Server
const startProxy = (): Promise<number> => {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            log(`[Proxy] Incoming Request: ${req.method} ${req.url}`);

            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                });
                res.end();
                return;
            }

            // Collect Body
            const chunks: any[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
                const bodyRaw = Buffer.concat(chunks).toString();
                // Delegate to Proxy Logic (Centralized in proxy.ts)
                await handleChatCompletion(req, res, bodyRaw);
            });
        });

        server.listen(10001, '127.0.0.1', () => { // Fixed port for stability
            const addr = server.address() as any;
            log(`[Proxy] Started on port ${addr.port}`);

            // Lifecycle Management
            const cleanup = () => {
                log(`[Proxy] Shutting down server on port ${addr.port}`);
                server.close();
            };

            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
            process.on('exit', cleanup);

            resolve(addr.port);
        });

        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                log(`[Proxy] Port 10001 in use, assuming existing proxy.`);
                resolve(10001);
            } else {
                console.error("Proxy Start Error:", e);
                resolve(0);
            }
        });
    });
};

export const PollinationsPlugin: Plugin = async ({ client }) => {
    log("Plugin Initializing (V3 Phase 4)...");
    const port = await startProxy();
    const localBaseUrl = `http://127.0.0.1:${port}`;

    return {
        // Intercept '/pollinations' command (V4 Feature)
        "tui.command.execute": async (input: any) => {
            if (input.command === "pollinations") {
                const args = (input.args || "").trim().split(/\s+/);
                const subCmd = args[0]?.toLowerCase();

                if (subCmd === "usage") {
                    try {
                        const { loadConfig } = await import('./server/config.js');
                        const { getUserUsage } = await import('./server/usage-manager.js');
                        const config = loadConfig();

                        if (!config.apiKey) {
                            await client.tui.showToast({
                                body: {
                                    message: "Pollinations: Aucune clé API configurée (Mode Manual)",
                                    variant: "warning"
                                }
                            });
                            return;
                        }

                        const usage = await getUserUsage(config.apiKey);
                        const tierRem = usage.usage.tierRemaining.toFixed(2);
                        const wallet = usage.walletBalance.toFixed(2);
                        const progress = usage.reset ? Math.round(usage.reset.progressPercent) : 0;
                        const timeUntil = usage.reset ? Math.round(usage.reset.timeUntilReset / (1000 * 60 * 60)) : "?";

                        const msg = `📊 Usage:\nFree Tier: $${tierRem} (Reset: ${timeUntil}h / ${progress}%)\nWallet/Pack: $${wallet}\nConso Session: ${usage.usage.totalRequests} reqs`;

                        await client.tui.showToast({
                            body: {
                                message: msg,
                                variant: "info"
                            }
                        });
                        // Also log to app for record
                        await client.app.log({
                            body: {
                                service: "pollinations-plugin",
                                level: "info",
                                message: msg
                            }
                        });

                    } catch (e) {
                        await client.tui.showToast({
                            body: { message: "Erreur lors de la récupération de l'usage", variant: "error" }
                        });
                    }
                    return;
                }

                if (subCmd === "mode") {
                    const newMode = args[1]?.toLowerCase();
                    if (["manual", "alwaysfree", "pro"].includes(newMode)) {
                        const { saveConfig } = await import('./server/config.js');
                        saveConfig({ mode: newMode as any });
                        await client.tui.showToast({
                            body: {
                                message: `Pollinations: Mode passé en '${newMode.toUpperCase()}'`,
                                variant: "success"
                            }
                        });
                    } else {
                        await client.tui.showToast({
                            body: { message: "Mode invalide. Options: manual, alwaysfree, pro", variant: "warning" }
                        });
                    }
                    return;
                }

                if (subCmd === "config" && args[1] === "paid_tools") {
                    const state = args[2]?.toLowerCase();
                    if (state === "on" || state === "off") {
                        const { saveConfig } = await import('./server/config.js');
                        const enabled = state === "on";
                        saveConfig({ enable_paid_tools: enabled });
                        await client.tui.showToast({
                            body: {
                                message: `Pollinations: Outils Payants ${enabled ? "ACTIVÉS (Attention aux coûts)" : "DÉSACTIVÉS"}`,
                                variant: enabled ? "warning" : "success"
                            }
                        });
                    } else {
                        await client.tui.showToast({
                            body: { message: "Usage: /pollinations config paid_tools <on|off>", variant: "warning" }
                        });
                    }
                    return;
                }

                if (subCmd === "help") {
                    await client.tui.showToast({
                        body: {
                            message: "Commandes: /pollinations [usage | mode <val> | config paid_tools <on|off>]",
                            variant: "info"
                        }
                    });
                    return;
                }

                await client.tui.showToast({
                    body: { message: "Commande inconnue. Essayez /pollinations help", variant: "warning" }
                });
            }
        },

        async config(config) {
            log("[Hook] Config hook called");

            // Dynamic Config Generation (Phase 4)
            // Fetch models, map variants (Thinking, MaxTokens), handle Gemini versions
            const modelsArray = await generatePollinationsConfig();

            const modelsObj: any = {};
            if (Array.isArray(modelsArray)) {
                modelsArray.forEach((m: any) => {
                    modelsObj[m.id] = m;
                });
            }

            // Ensure provider structure
            if (!config.provider) config.provider = {};

            if (!config.provider['pollinations_enter']) {
                config.provider['pollinations_enter'] = {
                    id: 'pollinations',
                    name: 'Pollinations V3 (Enterprise)',
                    options: { baseURL: localBaseUrl },
                    models: {}
                } as any;
            }

            const p = config.provider['pollinations_enter'] as any;

            // Inject Models
            p.models = modelsObj;

            // Force Localhost URL (The Proxy)
            p.options = p.options || {};
            p.options.baseURL = localBaseUrl;
        }
    };
};

export default PollinationsPlugin;
