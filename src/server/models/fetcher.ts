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
    // Prefer explicit type/category from unified /models endpoint
    const explicit = String(raw.type || raw.category || raw.output_modality || '').toLowerCase();
    if (explicit === 'video' || explicit === 'image' || explicit === 'audio' || explicit === 'text'
        || explicit === '3d' || explicit === 'embedding' || explicit === 'realtime') {
        return explicit as ModelCategory;
    }

    const outputs: string[] = raw.output_modalities || [];
    if (outputs.includes('video')) return 'video';
    if (outputs.includes('3d') || outputs.includes('mesh')) return '3d';
    if (outputs.includes('embedding') || outputs.includes('embeddings')) return 'embedding';
    if (outputs.includes('image')) return 'image';
    if (outputs.includes('audio')) return 'audio';
    if (outputs.includes('realtime')) return 'realtime';

    // Force STT models into audio even when output is text
    const nameStr = (raw.name || raw.id || '').toLowerCase();
    if (nameStr.includes('whisper') || nameStr.includes('scribe')) return 'audio';
    if (nameStr.includes('embed')) return 'embedding';

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
        context_window: raw.context_window || raw.context_length,
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
 * Primary: unified /models (all categories including 3d / embedding / realtime).
 * Fallback per-modality endpoints if unified is empty/unavailable.
 * Enriched with /v1/models structural fields + model-stats averages.
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

    const endpoints: { url: string; fallbackCategory: ModelCategory }[] = [
        { url: `https://${API_BASE}/models`, fallbackCategory: 'text' },
        { url: `https://${API_BASE}/image/models`, fallbackCategory: 'image' },
        { url: `https://${API_BASE}/video/models`, fallbackCategory: 'video' },
        { url: `https://${API_BASE}/audio/models`, fallbackCategory: 'audio' },
        { url: `https://${API_BASE}/text/models`, fallbackCategory: 'text' },
        { url: `https://${API_BASE}/3d/models`, fallbackCategory: '3d' },
        { url: `https://${API_BASE}/embeddings/models`, fallbackCategory: 'embedding' },
    ];

    const statsPromise = fetchJson('https://enter.pollinations.ai/api/model-stats', headers).catch(() => ({ data: [] }));
    const openapiPromise = fetchJson('https://enter.pollinations.ai/api/docs/open-api/generate-schema', headers).catch(() => ({}));
    const v1ModelsPromise = fetchJson('https://gen.pollinations.ai/v1/models', headers).catch(() => ({ data: [] }));

    const fetches = endpoints.map(async ({ url, fallbackCategory }) => {
        try {
            const raw = await fetchJson(url, headers);
            return { url, fallbackCategory, raw };
        } catch (e) {
            log(`[ModelFetcher] Failed to fetch ${url}: ${e}`);
            return { url, fallbackCategory, raw: [] };
        }
    });

    const resultsRaw = await Promise.all([...fetches, statsPromise, openapiPromise, v1ModelsPromise]);

    const v1ModelsRaw: any = resultsRaw.pop();
    const openapiRaw: any = resultsRaw.pop();
    const statsRaw: any = resultsRaw.pop();
    
    // Index V1 endpoints to extract structural modalities and properties
    const v1List = Array.isArray(v1ModelsRaw) ? v1ModelsRaw : (v1ModelsRaw?.data || []);
    const v1Map = new Map<string, any>();
    for (const v of v1List) {
        v1Map.set(v.id || v.name, v);
    }

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
            const v1Item = v1Map.get(modelId);

            // Merge structuraux de la V1 vers l'Item
            if (v1Item) {
                if (v1Item.input_modalities) item.input_modalities = v1Item.input_modalities;
                if (v1Item.output_modalities) item.output_modalities = v1Item.output_modalities;
                if (v1Item.context_length) item.context_length = v1Item.context_length;
                if (v1Item.tools !== undefined) item.tools = v1Item.tools;
                if (v1Item.reasoning !== undefined) item.reasoning = v1Item.reasoning;
            }

            const model = mapRawToModel(item, res.fallbackCategory, avgCost);

            const uniqueId = model.name;
            if (!seen.has(uniqueId)) {
                seen.add(uniqueId);
                results.push(model);
            }
        }
        log(`[ModelFetcher] Parsed ${list.length} models from ${res.url}`);
    }

    const count = (c: ModelCategory) => results.filter(m => m.category === c).length;
    log(`[ModelFetcher] Total: ${results.length} models (image=${count('image')} video=${count('video')} audio=${count('audio')} text=${count('text')} 3d=${count('3d')} emb=${count('embedding')} rt=${count('realtime')})`);

    // --- ENRICH MODELS WITH OPENAPI CONSTRAINTS ---
    try {
        const videoParams = openapiRaw?.paths?.['/video/{prompt}']?.get?.parameters || [];
        const durationParam = videoParams.find((p: any) => p.name === 'duration');
        const durationDesc = durationParam?.description || '';

        const audioParams = openapiRaw?.paths?.['/audio/{text}']?.get?.parameters || [];
        const musicParam = audioParams.find((p: any) => p.name === 'duration');
        const musicDesc = musicParam?.description || '';

        for (const model of results) {
            if (model.category === 'video' && durationDesc) {
                const regex = new RegExp(`${model.name}:\\s*([^.]+)s`, 'i');
                const match = durationDesc.match(regex);
                if (match) {
                    const constraint = match[1].toLowerCase();
                    if (constraint.includes('or')) {
                        const numbers = constraint.match(/\d+/g)?.map(Number) || [];
                        if (numbers.length > 0) model.durationRange = [Math.min(...numbers), Math.max(...numbers)];
                    } else if (constraint.match(/(\d+)\s*(?:-|to)\s*(\d+)/)) {
                        const m = constraint.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
                        if (m) model.durationRange = [Number(m[1]), Number(m[2])];
                    } else if (constraint.match(/(?:up to\s*~?|max\s*)\s*(\d+)/)) {
                        const m = constraint.match(/(?:up to\s*~?|max\s*)\s*(\d+)/);
                        if (m) model.durationRange = [1, Number(m[1])];
                    }
                }
            }
            if (model.name === 'elevenmusic' && musicDesc) {
                const boundsMatch = musicDesc.match(/(\d+)\s*-\s*(\d+)/);
                if (boundsMatch) {
                    model.durationRange = [Number(boundsMatch[1]), Number(boundsMatch[2])];
                }
            }
        }
    } catch (e) {
        log(`[ModelFetcher] Failed to parse OpenAPI constraints: ${e}`);
    }
    // ----------------------------------------------

    return results;
}
