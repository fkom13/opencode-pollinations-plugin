/**
 * Beta Discovery Tool — Sonde les endpoints Pollinations pour découvrir
 * les paramètres et valeurs d'enum non documentés.
 *
 * Registre : Enter Universe (clé API requise)
 * Fichier  : tools/pollinations/beta_discovery.ts
 *
 * Ce tool expose trois actions :
 *
 *  discover    — Sonde un endpoint complet et retourne un rapport
 *  scan_enums  — Teste des valeurs candidates pour un paramètre donné
 *  diff_models — Compare le registre courant avec l'API live
 *
 * Stratégie de sondage :
 *  1. OPTIONS → lire le header Allow
 *  2. GET ?__schema=1 (spéculatif, 404 probable)
 *  3. Probe boundary values → parser les ValidationErrorDetails 400
 *  4. Extraire les listes d'enums depuis les messages "must be one of: [...]"
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin/tool';
import * as https from 'https';
import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import { log } from '../../server/logger.js';

// ─── Types internes ───────────────────────────────────────────────────────────

interface ProbeResult {
    status: number;
    body: string;
    headers: Record<string, string>;
    ok: boolean;
    error?: string;
}

interface DiscoveredEnum {
    param: string;
    validValues: string[];
    source: 'validation_error' | 'schema_endpoint' | 'successful_probe';
    confidence: 'high' | 'medium' | 'low';
    rawEvidence: string;
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

function probeEndpoint(
    method: string,
    url: string,
    apiKey?: string,
    body?: string
): Promise<ProbeResult> {
    return new Promise((resolve) => {
        const parsed = new URL(url);
        const options: https.RequestOptions = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Pollinations-BetaDiscovery/1.0',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
                ...(body ? { 'Content-Length': Buffer.byteLength(body).toString() } : {}),
            },
        };

        const req = https.request(options, (res) => {
            const headers: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) {
                if (typeof v === 'string') headers[k] = v;
            }
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => resolve({
                status: res.statusCode ?? 0,
                body: data,
                headers,
                ok: (res.statusCode ?? 0) < 300,
            }));
        });

        req.on('error', (e: Error) => resolve({
            status: 0,
            body: '',
            headers: {},
            ok: false,
            error: e.message,
        }));

        req.setTimeout(8000, () => {
            req.destroy();
            resolve({ status: 0, body: '', headers: {}, ok: false, error: 'Timeout' });
        });

        if (body) req.write(body);
        req.end();
    });
}

// ─── Parseur d'erreurs de validation ─────────────────────────────────────────

/**
 * Extrait les valeurs d'enum depuis un corps d'erreur 400 Pollinations.
 * Patterns reconnus :
 *  - "must be one of: [a, b, c]"
 *  - "Invalid enum value. Expected 'a' | 'b' | 'c'"
 *  - "enum": ["a","b","c"] (JSON schema inline)
 */
function extractEnumsFromError(body: string, paramHint?: string): DiscoveredEnum[] {
    const results: DiscoveredEnum[] = [];

    try {
        const json = JSON.parse(body);

        // 1. Pollinations ValidationErrorDetails → fieldErrors
        const fieldErrors = json?.error?.details?.fieldErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
            for (const [field, messages] of Object.entries(fieldErrors)) {
                const msgs: string[] = Array.isArray(messages) ? messages as string[] : [];
                for (const msg of msgs) {
                    const enumMatch = msg.match(/(?:must be one of|expected)[\s:]+\[?([^\]]+)\]?/i);
                    if (enumMatch) {
                        const values = enumMatch[1]
                            .split(/[,|]/)
                            .map(s => s.trim().replace(/['"]/g, ''))
                            .filter(Boolean);
                        if (values.length > 0) {
                            results.push({
                                param: field,
                                validValues: values,
                                source: 'validation_error',
                                confidence: 'high',
                                rawEvidence: msg,
                            });
                        }
                    }
                }
            }
        }

        // 2. formErrors globaux
        const formErrors: string[] = json?.error?.details?.formErrors || [];
        for (const msg of formErrors) {
            const enumMatch = msg.match(/(?:model|param|field)\s+['"]?(\w+)['"]?.*?(?:must be one of|expected)[\s:]+\[?([^\]]+)\]?/i);
            if (enumMatch && paramHint) {
                const values = enumMatch[2]
                    .split(/[,|]/)
                    .map(s => s.trim().replace(/['"]/g, ''))
                    .filter(Boolean);
                if (values.length > 0) {
                    results.push({
                        param: paramHint,
                        validValues: values,
                        source: 'validation_error',
                        confidence: 'medium',
                        rawEvidence: msg,
                    });
                }
            }
        }
    } catch {
        // Corps non-JSON → chercher les patterns en texte brut
        const enumMatch = body.match(/(?:must be one of|expected)[\s:]+\[?([^\]\n]+)\]?/i);
        if (enumMatch && paramHint) {
            const values = enumMatch[1]
                .split(/[,|]/)
                .map(s => s.trim().replace(/['"]/g, ''))
                .filter(Boolean);
            if (values.length > 0) {
                results.push({
                    param: paramHint,
                    validValues: values,
                    source: 'validation_error',
                    confidence: 'low',
                    rawEvidence: enumMatch[0],
                });
            }
        }
    }

    return results;
}

// ─── Actions principales ──────────────────────────────────────────────────────

/**
 * discover : sonde un endpoint et retourne un rapport de découverte complet.
 */
async function discoverEndpoint(
    endpoint: string,
    candidates: Record<string, string[]>,
    maxProbes: number,
    apiKey: string
): Promise<string> {
    const lines: string[] = [
        `## 🔬 Rapport de découverte`,
        `**Endpoint**: \`${endpoint}\``,
        `**Date**: ${new Date().toISOString()}`,
        '',
    ];

    let probesUsed = 0;
    const allDiscovered: DiscoveredEnum[] = [];

    // 1. OPTIONS
    if (probesUsed < maxProbes) {
        const r = await probeEndpoint('OPTIONS', `https://gen.pollinations.ai${endpoint}`, apiKey);
        probesUsed++;
        const allow = r.headers['allow'] || r.headers['Access-Control-Allow-Methods'] || '?';
        lines.push(`### OPTIONS`, `- Allow: \`${allow}\``);
    }

    // 2. Spéculatif : ?__schema=1
    if (probesUsed < maxProbes) {
        const schemaUrl = `https://gen.pollinations.ai${endpoint}?__schema=1`;
        const r = await probeEndpoint('GET', schemaUrl, apiKey);
        probesUsed++;
        if (r.ok) {
            lines.push(``, `### Schéma inline détecté (GET ?__schema=1)`, '```json', r.body.slice(0, 500), '```');
        } else {
            lines.push(``, `### ?__schema=1 → ${r.status} (attendu)`);
        }
    }

    // 3. Sondage des enums candidats
    lines.push(``, `### Sondage des paramètres candidats`);

    for (const [param, values] of Object.entries(candidates)) {
        if (probesUsed >= maxProbes) {
            lines.push(`⚠️ Limite de ${maxProbes} sondes atteinte. Restants non testés.`);
            break;
        }

        // Envoyer une valeur invalide délibérée pour déclencher le message d'erreur complet
        const invalidUrl = `https://gen.pollinations.ai${endpoint}?${param}=__invalid_discovery_probe__`;
        const r = await probeEndpoint('GET', invalidUrl, apiKey);
        probesUsed++;

        if (r.status === 400) {
            const discovered = extractEnumsFromError(r.body, param);
            allDiscovered.push(...discovered);

            if (discovered.length > 0) {
                for (const d of discovered) {
                    lines.push(`- **${d.param}**: \`${d.validValues.join('`, `')}\` (${d.confidence} confiance)`);
                    log(`[BetaDiscovery] ${endpoint} → ${d.param}: [${d.validValues.join(', ')}]`);
                }
            } else {
                lines.push(`- **${param}**: 400 reçu mais aucun enum extrait`);
            }
        } else {
            lines.push(`- **${param}**: probe → ${r.status}`);
        }

        // Test des valeurs candidates une par une (confiance haute si 200)
        for (const candidate of values) {
            if (probesUsed >= maxProbes) break;
            const testUrl = `https://gen.pollinations.ai${endpoint}?${param}=${encodeURIComponent(candidate)}&seed=42&width=64&height=64`;
            // On teste avec un prompt minimal pour les endpoints image
            const testUrlWithPrompt = endpoint.includes('{prompt}')
                ? testUrl.replace('{prompt}', 'test')
                : `https://gen.pollinations.ai${endpoint.replace('{text}', 'test')}?${param}=${encodeURIComponent(candidate)}`;

            const rTest = await probeEndpoint('GET', testUrlWithPrompt, apiKey);
            probesUsed++;

            if (rTest.ok) {
                // Valeur confirmée valide
                const existing = allDiscovered.find(d => d.param === param);
                if (existing) {
                    if (!existing.validValues.includes(candidate)) {
                        existing.validValues.push(candidate);
                    }
                } else {
                    allDiscovered.push({
                        param,
                        validValues: [candidate],
                        source: 'successful_probe',
                        confidence: 'high',
                        rawEvidence: `HTTP ${rTest.status} avec ${param}=${candidate}`,
                    });
                }
            }
        }
    }

    // ── Résumé ──────────────────────────────────────────────────────────────
    lines.push(``, `### Résumé`, `- Sondes émises : ${probesUsed}`, `- Paramètres découverts : ${allDiscovered.length}`);

    if (allDiscovered.length > 0) {
        lines.push(``, `### Fragment de schéma suggéré`, '```json');
        const schema: Record<string, any> = { type: 'object', properties: {} };
        for (const d of allDiscovered) {
            schema.properties[d.param] = {
                type: 'string',
                enum: d.validValues,
                description: `Découvert via ${d.source} (confiance: ${d.confidence})`,
            };
        }
        lines.push(JSON.stringify(schema, null, 2), '```');
    }

    return lines.join('\n');
}

/**
 * scan_enums : teste une liste de candidats pour un paramètre donné.
 * Plus ciblé que discover — utile quand on sait quel param explorer.
 */
async function scanEnums(
    endpoint: string,
    param: string,
    candidates: string[],
    apiKey: string
): Promise<string> {
    const valid: string[] = [];
    const invalid: string[] = [];

    const baseUrl = `https://gen.pollinations.ai${endpoint
        .replace('{prompt}', 'test')
        .replace('{text}', 'test')}`;

    for (const candidate of candidates) {
        const url = `${baseUrl}?${param}=${encodeURIComponent(candidate)}&seed=42&width=64&height=64`;
        const r = await probeEndpoint('GET', url, apiKey);

        if (r.ok) valid.push(candidate);
        else if (r.status === 400 || r.status === 422) invalid.push(candidate);
        // Autres statuts (401, 402, 403) → on ignore (pas une erreur de valeur)
    }

    const lines = [
        `## 🔍 Scan Enums — \`${endpoint}\` · param: \`${param}\``,
        ``,
        `✅ **Valides** (${valid.length}): ${valid.length > 0 ? valid.map(v => `\`${v}\``).join(', ') : '_aucun_'}`,
        `❌ **Invalides** (${invalid.length}): ${invalid.length > 0 ? invalid.map(v => `\`${v}\``).join(', ') : '_aucun_'}`,
    ];

    return lines.join('\n');
}

/**
 * diff_models : compare le registre local vs l'API live.
 */
async function diffModels(
    modelType: 'image' | 'audio',
    apiKey: string
): Promise<string> {
    const urlMap = {
        image: `https://gen.pollinations.ai/image/models`,
        audio: `https://gen.pollinations.ai/audio/models`,
    };

    const r = await probeEndpoint('GET', urlMap[modelType], apiKey);
    if (!r.ok) return `❌ Impossible de fetcher /\${modelType}/models : HTTP ${r.status}`;

    let liveModels: any[] = [];
    try {
        const data = JSON.parse(r.body);
        liveModels = Array.isArray(data) ? data : (data.data || []);
    } catch {
        return `❌ Réponse non-JSON de /\${modelType}/models`;
    }

    const liveNames = new Set(liveModels.map((m: any) => m.name || m.id));
    const category = modelType === 'image' ? ['image', 'video'] : ['audio'];
    const cachedNames = new Set(
        ModelRegistry.all()
            .filter(m => category.includes(m.category))
            .map(m => m.name)
    );

    const added = [...liveNames].filter(n => !cachedNames.has(n));
    const removed = [...cachedNames].filter(n => !liveNames.has(n));

    const lines = [
        `## 🔄 Diff Modèles — /\${modelType}/models`,
        `- Registre local : ${cachedNames.size} modèles`,
        `- API live       : ${liveNames.size} modèles`,
        ``,
        `### ➕ Nouveaux dans l'API (${added.length})`,
        added.length > 0 ? added.map(n => `- \`${n}\``).join('\n') : '_Aucun_',
        ``,
        `### ➖ Supprimés de l'API (${removed.length})`,
        removed.length > 0 ? removed.map(n => `- \`${n}\``).join('\n') : '_Aucun_',
    ];

    if (added.length > 0) {
        lines.push('', '> 💡 Lancez `/poll models --refresh` pour mettre à jour le registre.');
    }

    return lines.join('\n');
}

// ─── Tool Definition ──────────────────────────────────────────────────────────

export const betaDiscoveryTool: ToolDefinition = tool({
    description: `🔬 Beta Discovery — Sonde les endpoints Pollinations pour découvrir
les paramètres et valeurs d'enum non documentés.

Actions disponibles :
- **discover**   : sonde complète d'un endpoint (OPTIONS + boundary probing + extraction enum)
- **scan_enums** : teste une liste de candidats pour un paramètre précis
- **diff_models**: compare le registre local vs l'API live (détecte nouveaux modèles)

Utile pour : détecter de nouveaux modèles, trouver des valeurs d'enum manquantes,
explorer des paramètres non documentés avant de les ajouter au ManualRegister.`,

    args: {
        action: tool.schema
            .string()
            .describe('Action: "discover" | "scan_enums" | "diff_models"'),

        endpoint: tool.schema
            .string()
            .optional()
            .describe('Endpoint à sonder. Ex: "/image/{prompt}", "/audio/{text}". Requis pour discover et scan_enums.'),

        param: tool.schema
            .string()
            .optional()
            .describe('Nom du paramètre à scanner. Requis pour scan_enums.'),

        candidates: tool.schema
            .string()
            .optional()
            .describe('Valeurs candidates séparées par virgule. Ex: "flux,zimage,kontext". Requis pour scan_enums. Optionnel pour discover.'),

        model_type: tool.schema
            .string()
            .optional()
            .describe('Type de modèle pour diff_models: "image" | "audio". Défaut: "image".'),

        max_probes: tool.schema
            .number()
            .optional()
            .describe('Nombre max de requêtes HTTP pour discover. Défaut: 20.'),
    },

    async execute(args, context) {
        const config = loadConfig();
        const apiKey = config.apiKey || '';

        if (!apiKey) {
            return `❌ Clé API requise pour Beta Discovery. Utilisez \`/poll connect sk_...\``;
        }

        context.metadata({
            title: '🔬 Beta Discovery',
            metadata: { type: 'info', message: `Action: ${args.action}` },
        });

        const action = (args.action || '').toLowerCase();

        // ── discover ────────────────────────────────────────────────────────
        if (action === 'discover') {
            if (!args.endpoint) return `❌ "endpoint" requis pour l'action discover.`;

            const candidateMap: Record<string, string[]> = {};
            if (args.param && args.candidates) {
                const values = args.candidates.split(',').map(s => s.trim()).filter(Boolean);
                candidateMap[args.param] = values;
            } else if (args.candidates) {
                // Pas de param précisé → on teste le param "model" par défaut
                candidateMap['model'] = args.candidates.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                // Paramètres standard à toujours sonder
                candidateMap['model'] = [];
            }

            const maxProbes = Math.min(Number(args.max_probes) || 20, 50);

            log(`[BetaDiscovery] discover: ${args.endpoint}, maxProbes=${maxProbes}`);
            return await discoverEndpoint(args.endpoint, candidateMap, maxProbes, apiKey);
        }

        // ── scan_enums ──────────────────────────────────────────────────────
        if (action === 'scan_enums') {
            if (!args.endpoint) return `❌ "endpoint" requis pour scan_enums.`;
            if (!args.param) return `❌ "param" requis pour scan_enums.`;
            if (!args.candidates) return `❌ "candidates" requis pour scan_enums. Ex: "flux,zimage,kontext"`;

            const values = args.candidates.split(',').map(s => s.trim()).filter(Boolean);
            log(`[BetaDiscovery] scan_enums: ${args.endpoint} → ${args.param}: [${values.join(', ')}]`);
            return await scanEnums(args.endpoint, args.param, values, apiKey);
        }

        // ── diff_models ─────────────────────────────────────────────────────
        if (action === 'diff_models') {
            const modelType = (args.model_type || 'image') as 'image' | 'audio';
            if (!['image', 'audio'].includes(modelType)) {
                return `❌ model_type doit être "image" ou "audio".`;
            }
            log(`[BetaDiscovery] diff_models: ${modelType}`);
            return await diffModels(modelType, apiKey);
        }

        return `❌ Action inconnue: "${args.action}". Valeurs: discover, scan_enums, diff_models`;
    },
});
