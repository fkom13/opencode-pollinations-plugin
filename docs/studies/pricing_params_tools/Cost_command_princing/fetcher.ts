/**
 * Model Fetcher — Dynamic model discovery from Pollinations API
 *
 * Fetches /image/models and /audio/models from gen.pollinations.ai,
 * catégorise par output_modalities, puis délègue les patches locaux
 * au ManualRegister (server/models/manual.ts).
 *
 * ⚠️  NE PAS remettre les constantes VIDEO/IMAGE_LOCAL_EXTRAS ici.
 *     Elles vivent désormais dans manual.ts pour séparation des responsabilités.
 */

import * as https from 'https';
import { log } from '../logger.js';
import { applyManualPatches } from './manual.js';   // ← seul ajout réel vs l'original
import type { PollinationsModel, ModelCategory, ModelPricing } from './types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'gen.pollinations.ai';

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    log(`[ModelFetcher] JSON parse error for ${url}: ${e}`);
                    resolve([]);
                }
            });
        });
        req.on('error', (e: Error) => {
            log(`[ModelFetcher] Network error for ${url}: ${e.message}`);
            reject(e);
        });
        req.setTimeout(8000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// ─── Category Detection ───────────────────────────────────────────────────────

function detectCategory(raw: any): ModelCategory {
    const outputs: string[] = raw.output_modalities || [];
    if (outputs.includes('video')) return 'video';
    if (outputs.includes('image')) return 'image';
    if (outputs.includes('audio')) return 'audio';
    return 'text';
}

function detectOutputType(raw: any): ModelCategory {
    return detectCategory(raw);
}

// ─── Model Mapping ────────────────────────────────────────────────────────────

function mapRawToModel(raw: any, fallbackCategory: ModelCategory): PollinationsModel {
    const category = detectCategory(raw);
    const inputMods: string[] = raw.input_modalities || ['text'];
    const outputMods: string[] = raw.output_modalities || ['text'];
    const pricing: ModelPricing = {
        currency: raw.pricing?.currency || 'pollen',
        ...(raw.pricing || {}),
    };

    return {
        name: raw.name || raw.id || 'unknown',
        description: raw.description || raw.name || '',
        category,
        aliases: raw.aliases || [],
        pricing,
        paid_only: raw.paid_only === true,
        supportsI2X: inputMods.includes('image'),
        outputType: detectOutputType(raw),
        input_modalities: inputMods,
        output_modalities: outputMods,
        voices: raw.voices,
        tools: raw.tools,
        reasoning: raw.reasoning,
        is_specialized: raw.is_specialized,
        context_window: raw.context_window,
        // Pas de patches ici — c'est le rôle de applyManualPatches()
    };
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

/**
 * Fetch all models from the Pollinations API, then apply manual patches.
 *
 * - /image/models retourne images ET vidéos (trié par output_modalities)
 * - /audio/models retourne TTS, STT, music
 *
 * @param apiKey  Bearer token pour les endpoints authentifiés
 * @returns       Tableau unifié de PollinationsModel, patchés
 */
export async function fetchAllModels(apiKey?: string): Promise<PollinationsModel[]> {
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.length > 5 && apiKey !== 'dummy') {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const results: PollinationsModel[] = [];
    const seen = new Set<string>();

    const endpoints = [
        { url: `https://${API_BASE}/image/models`, fallbackCategory: 'image' as ModelCategory },
        { url: `https://${API_BASE}/audio/models`, fallbackCategory: 'audio' as ModelCategory },
    ];

    const fetches = endpoints.map(async ({ url, fallbackCategory }) => {
        try {
            const raw = await fetchJson(url, headers);
            const list: any[] = Array.isArray(raw) ? raw : (raw.data || []);

            for (const item of list) {
                const model = mapRawToModel(item, fallbackCategory);
                if (!seen.has(model.name)) {
                    seen.add(model.name);
                    results.push(model);
                }
            }
            log(`[ModelFetcher] Fetched ${list.length} models from ${url}`);
        } catch (e) {
            log(`[ModelFetcher] Failed to fetch ${url}: ${e}`);
        }
    });

    await Promise.all(fetches);

    log(`[ModelFetcher] Raw: ${results.length} models (${results.filter(m => m.category === 'image').length} image, ${results.filter(m => m.category === 'video').length} video, ${results.filter(m => m.category === 'audio').length} audio)`);

    // ── Appliquer les patches du Registre Manuel ──────────────────────────────
    // C'est ici que durationRange, aspectRatios, costHeader, etc. sont ajoutés.
    const patched = applyManualPatches(results);

    return patched;
}
