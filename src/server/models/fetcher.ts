/**
 * Model Fetcher — Dynamic model discovery from Pollinations API
 * 
 * Fetches /image/models and /audio/models from gen.pollinations.ai,
 * categorizes them by output_modalities, and applies local patches
 * for data the API doesn't provide (video duration, aspect ratios, etc.).
 */

import * as https from 'https';
import { log } from '../logger.js';
import type { PollinationsModel, ModelCategory, ModelPricing } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────

const API_BASE = 'gen.pollinations.ai';

import { getManualPatch } from './manual.js';

// ─── HTTP Helper ─────────────────────────────────────────────────────────

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

// ─── Category Detection ──────────────────────────────────────────────────

function detectCategory(raw: any): ModelCategory {
    const outputs: string[] = raw.output_modalities || [];
    if (outputs.includes('video')) return 'video';
    if (outputs.includes('image')) return 'image';
    if (outputs.includes('audio')) return 'audio';

    // Correctif : Forcer les modèles Speech-to-Text en audio même si leur sortie API est 'text'
    const nameStr = (raw.name || raw.id || '').toLowerCase();
    if (nameStr.includes('whisper') || nameStr.includes('scribe')) return 'audio';

    return 'text';
}

function detectOutputType(raw: any): ModelCategory {
    return detectCategory(raw);
}

// ─── Model Mapping ──────────────────────────────────────────────────────

function mapRawToModel(raw: any, fallbackCategory: ModelCategory, averageCost?: number): PollinationsModel {
    const category = detectCategory(raw);
    const inputMods: string[] = raw.input_modalities || ['text'];
    const outputMods: string[] = raw.output_modalities || ['text'];
    const pricing: ModelPricing = {
        currency: raw.pricing?.currency || 'pollen',
        ...(raw.pricing || {}),
    };

    const model: PollinationsModel = {
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
        averageCost: averageCost !== undefined && !isNaN(averageCost) ? averageCost : undefined,
    };

    // Apply local patches from manual.ts
    const patch = getManualPatch(category, model.name);
    if (patch) {
        Object.assign(model, patch);
    }

    return model;
}

// ─── Main Fetch Function ─────────────────────────────────────────────────

/**
 * Fetch all models from the Pollinations API.
 * 
 * - /image/models returns both image AND video models (sorted by output_modalities)
 * - /audio/models returns audio models (TTS, STT, music)
 * 
 * @param apiKey - Bearer token for authenticated endpoints
 * @returns Array of unified PollinationsModel objects
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
        { url: `https://${API_BASE}/text/models`, fallbackCategory: 'text' as ModelCategory },
    ];

    const statsPromise = fetchJson('https://enter.pollinations.ai/api/model-stats', headers).catch(() => ({ data: [] }));

    const fetches = endpoints.map(async ({ url, fallbackCategory }) => {
        try {
            const raw = await fetchJson(url, headers);
            return { url, fallbackCategory, raw };
        } catch (e) {
            log(`[ModelFetcher] Failed to fetch ${url}: ${e}`);
            return { url, fallbackCategory, raw: [] };
        }
    });

    const resultsRaw = await Promise.all([...fetches, statsPromise]);

    // Le dernier élément du Promise.all est model-stats
    const statsRaw: any = resultsRaw.pop();
    const statsList = Array.isArray(statsRaw?.data) ? statsRaw.data : [];
    const statsMap = new Map<string, number>();
    for (const s of statsList) {
        if (s.model && s.avg_cost_usd !== undefined) {
            statsMap.set(s.model, parseFloat(s.avg_cost_usd));
        }
    }

    for (const res of resultsRaw as { url: string, fallbackCategory: ModelCategory, raw: any }[]) {
        const list: any[] = Array.isArray(res.raw) ? res.raw : (res.raw.data || []);
        for (const item of list) {
            const modelId = item.name || item.id;
            const avgCost = statsMap.get(modelId);
            const model = mapRawToModel(item, res.fallbackCategory, avgCost);

            const uniqueId = model.name;
            if (!seen.has(uniqueId)) {
                seen.add(uniqueId);
                results.push(model);
            }
        }
        log(`[ModelFetcher] Parsed ${list.length} models from ${res.url}`);
    }

    log(`[ModelFetcher] Total: ${results.length} models (${results.filter(m => m.category === 'image').length} image, ${results.filter(m => m.category === 'video').length} video, ${results.filter(m => m.category === 'audio').length} audio, ${results.filter(m => m.category === 'text').length} text)`);

    return results;
}
