/**
 * Shared utilities for Pollinations API tools
 * 
 * Updated: 2026-02-18 - Sprint 2: Dynamic ModelRegistry integration
 * Hardcoded model lists replaced by ModelRegistry lookups with static fallback.
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import type { PollinationsModel } from '../../server/models/types.js';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PollinationsConfig {
    apiKey?: string;
    mode?: string;
}

export interface ModelInfo {
    name: string;
    pricing: {
        currency: string;
        completionImageTokens?: number;
        completionVideoSeconds?: number;
        completionVideoTokens?: number;
        completionAudioTokens?: number;
        completionAudioSeconds?: number;
        promptAudioSeconds?: number;
        promptTextTokens?: number;
        completionTextTokens?: number;
    };
    paid_only?: boolean;
    input_modalities?: string[];
    output_modalities?: string[];
    description?: string;
}

export interface GenerationResult {
    success: boolean;
    url?: string;
    localPath?: string;
    cost: number;
    model: string;
    error?: string;
}

export interface CostTracking {
    imageTokens?: number;
    videoSeconds?: number;
    videoTokens?: number;
    costUsd?: number;
    modelUsed?: string;
    requestId?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────

const API_BASE = 'gen.pollinations.ai';
const FREE_IMAGE_BASE = 'image.pollinations.ai';

export function getApiKey(): string | undefined {
    const config = loadConfig();
    return config.apiKey;
}

export function hasApiKey(): boolean {
    const key = getApiKey();
    return !!(key && key.length > 5 && key !== 'dummy');
}

// ─── Model Data (Dynamic via ModelRegistry) ───────────────────────────────

/**
 * FREE Image Models (DEPRECATED - image.pollinations.ai is dead)
 */
export const FREE_IMAGE_MODELS = {};

/**
 * Dynamic Paid Image Models accessor.
 * Returns data from ModelRegistry if ready, otherwise falls back to static data.
 * 
 * BACKWARD COMPATIBLE: Same shape as the old hardcoded PAID_IMAGE_MODELS
 */
export function getPaidImageModels(): Record<string, {
    desc: string;
    cost: string;
    t2i: boolean;
    i2i: boolean;
    params: string[];
    notes?: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('image');
        const result: Record<string, any> = {};
        for (const m of models) {
            const costStr = formatPricingForDisplay(m);
            result[m.name] = {
                desc: m.description,
                cost: costStr,
                t2i: true, // All image models support T2I
                i2i: m.supportsI2X,
                params: m.supportsI2X
                    ? ['width', 'height', 'image']
                    : ['width', 'height'],
                notes: m.paid_only ? 'Paid Only' : undefined,
            };
        }
        return result;
    }
    // v6.5: offline fallback is served by the Model Registry STATIC_FALLBACK.
    return {};
}

/**
 * Dynamic Video Models accessor.
 * BACKWARD COMPATIBLE: Same shape as old VIDEO_MODELS
 */
export function getVideoModels(): Record<string, {
    desc: string;
    cost: string;
    t2v: boolean;
    i2v: boolean;
    audio: boolean;
    duration: [number, number];
    aspectRatios: string[];
    costHeader: string;
    genTime: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('video');
        const result: Record<string, any> = {};
        for (const m of models) {
            const costStr = formatPricingForDisplay(m);
            result[m.name] = {
                desc: m.description,
                cost: costStr,
                // wan is I2V-only upstream; manual.ts patches [image,text] +
                // a T2V dummy-image hack, so t2v stays enabled for it.
                t2v: !(m.supportsI2X && m.input_modalities.length === 1 && m.input_modalities[0] === 'image'),
                i2v: m.supportsI2X,
                audio: !VIDEO_NO_AUDIO_MODELS.has(m.name),
                duration: m.durationRange || [1, 10],
                aspectRatios: m.aspectRatios || ['16:9'],
                costHeader: m.costHeader || 'x-usage-completion-video-seconds',
                genTime: m.genTimeEstimate || '~30s',
            };
        }
        return result;
    }
    return {};
}

/**
 * Dynamic Audio Models accessor.
 * BACKWARD COMPATIBLE: Same shape as old AUDIO_MODELS
 */
export function getAudioModels(): Record<string, {
    desc: string;
    type: 'tts' | 'stt' | 'both';
    endpoint: string;
    params: string[];
    voices?: string[];
    notes?: string;
}> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.list('audio');
        const result: Record<string, any> = {};
        for (const m of models) {
            const audioType = detectAudioType(m);
            result[m.name] = {
                desc: m.description,
                type: audioType,
                endpoint: _STATIC_AUDIO_ENDPOINTS[m.name] || (audioType === 'stt' ? '/v1/audio/transcriptions' : `/audio/{text}`),
                params: audioType === 'stt' ? ['file'] : ['voice', 'format'],
                voices: m.voices,
                notes: m.paid_only ? 'Paid Only' : undefined,
            };
        }
        return result;
    }
    return {};
}

/**
 * Text Model accessor
 * Returns text models from registry
 */
export function getTextModels(): Record<string, { desc: string; }> {
    if (ModelRegistry.isReady()) {
        const models = ModelRegistry.all().filter((m: any) => m.category === 'text');
        const result: Record<string, { desc: string }> = {};
        for (const m of models) {
            result[m.name] = {
                desc: m.description
            };
        }
        return result;
    }
    return {};
}

/**
 * Music Model accessor (backward compatible)
 */
export function getMusicModel(): Record<string, {
    desc: string;
    endpoint: string;
    params: string[];
    duration: [number, number];
}> {
    // Check registry for elevenmusic
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenmusic');
        if (m) {
            return {
                'elevenmusic': {
                    desc: m.description,
                    endpoint: '/audio/{text}',
                    params: ['duration', 'instrumental'],
                    duration: [3, 300],
                }
            };
        }
    }
    return _STATIC_MUSIC_MODEL;
}

// ─── Backward Compatibility ──────────────────────────────────────────────
// OLD const exports removed (caused TDZ error at module load).
// Consumers must use the function forms:
//   getPaidImageModels(), getVideoModels(), getAudioModels(), getMusicModel()
// For direct model lookup: use ModelRegistry.getByNameOrAlias()

// ─── Private Static Fallback Data ─────────────────────────────────────────
// v6.5: the three big model tables (_STATIC_PAID_IMAGE_MODELS,
// _STATIC_VIDEO_MODELS, _STATIC_AUDIO_MODELS) and the empty
// _STATIC_I2V_ONLY set were removed — the Model Registry serves the
// offline fallback (STATIC_FALLBACK in models/cache.ts) and the live
// catalog provides paid_only/modalities/voices dynamically.
// What remains are transport rules the catalogue does NOT expose.

// Video models without audio output (mirrors manual.ts; the catalogue's
// video_capabilities.audio_output is not yet mapped to PollinationsModel).
const VIDEO_NO_AUDIO_MODELS = new Set(['seedance', 'seedance-pro']);

const _STATIC_AUDIO_ENDPOINTS: Record<string, string> = {
    'openai-audio': '/v1/chat/completions',
    'elevenlabs': '/audio/{text}',
    'whisper': '/v1/audio/transcriptions',
    'scribe': '/v1/audio/transcriptions',
    'elevenmusic': '/audio/{text}',
};

const _STATIC_MUSIC_MODEL = {
    'elevenmusic': {
        desc: 'ElevenLabs Music',
        endpoint: '/audio/{text}',
        params: ['duration', 'instrumental'],
        duration: [3, 300] as [number, number],
    }
};

// ─── Private Helpers ─────────────────────────────────────────────────────

function formatPricingForDisplay(m: PollinationsModel): string {
    const p = m.pricing;
    if (p.completionImageTokens) {
        return p.completionImageTokens < 0.001
            ? 'tokens'
            : `${p.completionImageTokens} 🌻${m.paid_only ? ' 💎' : ''}`;
    }
    if (p.completionVideoSeconds) {
        return `${p.completionVideoSeconds}/sec${m.paid_only ? ' 💎' : ''}`;
    }
    if (p.completionVideoTokens) {
        return 'tokens';
    }
    if (p.completionAudioTokens) {
        return `${p.completionAudioTokens} 🌻/tok`;
    }
    if (p.completionAudioSeconds) {
        return `${p.completionAudioSeconds}/sec`;
    }
    if (p.promptAudioSeconds) {
        return `${p.promptAudioSeconds}/sec`;
    }
    return 'tokens';
}

function detectAudioType(m: PollinationsModel): 'tts' | 'stt' | 'both' {
    const hasAudioInput = m.input_modalities.includes('audio');
    const hasAudioOutput = m.output_modalities.includes('audio');
    if (hasAudioInput && hasAudioOutput) return 'both';
    if (hasAudioInput) return 'stt';
    return 'tts';
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────

export function httpsGet(
    url: string,
    headers: Record<string, string> = {},
    timeoutMs: number = 300000
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            // Handle redirects (propagate the timeout on follow)
            if ([301, 302, 307].includes(res.statusCode || 0) && res.headers.location) {
                httpsGet(res.headers.location, headers, timeoutMs).then(resolve).catch(reject);
                return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    const errorBody = Buffer.concat(chunks).toString();
                    let errMsg = `HTTP ${res.statusCode}`;
                    try {
                        const errJson = JSON.parse(errorBody);
                        if (errJson.error && errJson.error.message) {
                            errMsg += `: ${errJson.error.message}`;
                            if (errJson.error.details?.fieldErrors) {
                                errMsg += ` - Fields: ${JSON.stringify(errJson.error.details.fieldErrors)}`;
                            }
                        } else {
                            errMsg += `: ${errorBody.substring(0, 200)}`;
                        }
                    } catch {
                        errMsg += `: ${errorBody.substring(0, 200)}`;
                    }
                    reject(new Error(errMsg));
                }
            });
        });

        req.on('error', reject);
        // v6.5: per-call timeout (clamped to 1h absolute max), no blind replay.
        const clamped = Math.min(Math.max(timeoutMs, 10000), 3600000);
        req.setTimeout(clamped, () => {
            req.destroy();
            reject(new Error(`Timeout (${Math.round(clamped / 1000)}s)`));
        });
        req.end();
    });
}

export function httpsPost(
    url: string,
    body: any,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const bodyData = typeof body === 'string' ? body : JSON.stringify(body);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData),
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    const errorBody = Buffer.concat(chunks).toString();
                    let errMsg = `HTTP ${res.statusCode}`;
                    try {
                        const errJson = JSON.parse(errorBody);
                        if (errJson.error && errJson.error.message) {
                            errMsg += `: ${errJson.error.message}`;
                            if (errJson.error.details?.fieldErrors) {
                                errMsg += ` - Fields: ${JSON.stringify(errJson.error.details.fieldErrors)}`;
                            }
                        } else {
                            errMsg += `: ${errorBody.substring(0, 200)}`;
                        }
                    } catch {
                        errMsg += `: ${errorBody.substring(0, 200)}`;
                    }
                    reject(new Error(errMsg));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(300000, () => {
            req.destroy();
            reject(new Error('Timeout (300s)'));
        });
        req.write(bodyData);
        req.end();
    });
}

/**
 * Multipart POST for file uploads (STT)
 */
export function httpsPostMultipart(
    url: string,
    fields: Record<string, string | Buffer>,
    headers: Record<string, string> = {}
): Promise<{ data: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const boundary = `----FormBoundary${Date.now()}`;

        const parts: Buffer[] = [];
        for (const [key, value] of Object.entries(fields)) {
            parts.push(Buffer.from(`--${boundary}\r\n`));
            if (Buffer.isBuffer(value)) {
                parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="audio.mp3"\r\n`));
                parts.push(Buffer.from(`Content-Type: audio/mpeg\r\n\r\n`));
                parts.push(value);
                parts.push(Buffer.from('\r\n'));
            } else {
                parts.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
                parts.push(Buffer.from(value));
                parts.push(Buffer.from('\r\n'));
            }
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const bodyData = Buffer.concat(parts);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyData.length,
                'User-Agent': 'OpenCode-Pollinations-Plugin/6.0',
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        data: Buffer.concat(chunks),
                        headers: res.headers as Record<string, string>
                    });
                } else {
                    const errorBody = Buffer.concat(chunks).toString();
                    let errMsg = `HTTP ${res.statusCode}`;
                    try {
                        const errJson = JSON.parse(errorBody);
                        if (errJson.error && errJson.error.message) {
                            errMsg += `: ${errJson.error.message}`;
                            if (errJson.error.details?.fieldErrors) {
                                errMsg += ` - Fields: ${JSON.stringify(errJson.error.details.fieldErrors)}`;
                            }
                        } else {
                            errMsg += `: ${errorBody.substring(0, 200)}`;
                        }
                    } catch {
                        errMsg += `: ${errorBody.substring(0, 200)}`;
                    }
                    reject(new Error(errMsg));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(300000, () => {
            req.destroy();
            reject(new Error('Timeout (300s)'));
        });
        req.write(bodyData);
        req.end();
    });
}

// ─── Model Discovery (delegated to ModelRegistry) ─────────────────────────

/**
 * @deprecated Use ModelRegistry.list() directly
 */
export async function fetchModels(type: 'image' | 'audio' | 'text'): Promise<ModelInfo[]> {
    ModelRegistry.ensureFresh();
    const models = ModelRegistry.list(type as any);
    return models.map(m => ({
        name: m.name,
        pricing: m.pricing,
        paid_only: m.paid_only,
        input_modalities: m.input_modalities,
        output_modalities: m.output_modalities,
        description: m.description,
    }));
}

/**
 * @deprecated Use ModelRegistry.get() directly
 */
export async function getModelInfo(type: 'image' | 'audio' | 'text', name: string): Promise<ModelInfo | undefined> {
    ModelRegistry.ensureFresh();
    const m = ModelRegistry.getByNameOrAlias(type as any, name);
    if (!m) return undefined;
    return {
        name: m.name,
        pricing: m.pricing,
        paid_only: m.paid_only,
        input_modalities: m.input_modalities,
        output_modalities: m.output_modalities,
        description: m.description,
    };
}

// ─── Cost Estimation & Tracking ───────────────────────────────────────────

/**
 * Extract cost tracking from response headers
 */
export function extractCostFromHeaders(headers: Record<string, string>): CostTracking {
    return {
        imageTokens: headers['x-usage-completion-image-tokens']
            ? parseFloat(headers['x-usage-completion-image-tokens'])
            : undefined,
        videoSeconds: headers['x-usage-completion-video-seconds']
            ? parseFloat(headers['x-usage-completion-video-seconds'])
            : undefined,
        videoTokens: headers['x-usage-completion-video-tokens']
            ? parseFloat(headers['x-usage-completion-video-tokens'])
            : undefined,
        costUsd: headers['x-usage-cost-usd']
            ? parseFloat(headers['x-usage-cost-usd'])
            : undefined,
        modelUsed: headers['x-model-used'],
        requestId: headers['x-request-id'],
    };
}

/**
 * Fetch current Enter balance (`/account/balance`) for Real Cost calculation.
 */
export async function fetchEnterBalance(): Promise<number | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const url = 'https://gen.pollinations.ai/account/balance';
        // Using native fetch
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;

        const data = await res.json();
        // The endpoint usually returns just { "balance": 9.9... }
        return data.balance !== undefined ? data.balance : null;
    } catch {
        return null; // Silent catch
    }
}


/**
 * Check if cost estimator is enabled in config
 */
export function isCostEstimatorEnabled(): boolean {
    const config = loadConfig() as any;
    return config.costEstimator !== false; // Default true
}

// ─── COST ESTIMATION BENCHMARKS ──────────────────────────────────────────

export function per1pollen(cost: number | null): string {
    if (!cost || cost <= 0) return "—";
    const x = 1 / cost;
    if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
    if (x >= 100_000) return `${Math.round(x / 1000)}K`;
    if (x >= 10_000) return `${(x / 1000).toFixed(1)}K`.replace(/\.0K$/, "K");
    if (x >= 1_000) return `${Math.round(x / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (x >= 100) return `${Math.round(x)}`;
    if (x >= 10) return `${Math.round(x * 10) / 10}`;
    return `${x.toFixed(1)}`;
}

export function estimateImageCost(model: string): number {
    // Try ModelRegistry first (averageCost or catalogue pricing)
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('image', model);
        if (m) {
            if (m.averageCost !== undefined) return m.averageCost;
            if (m.pricing.completionImageTokens !== undefined) return m.pricing.completionImageTokens;
        }
    }
    return 0.0002;
}

export function estimateVideoCost(model: string, duration: number): number {
    // Try ModelRegistry first (averageCost or catalogue pricing)
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        if (m) {
            if (m.averageCost !== undefined) return m.averageCost;
            if (m.pricing.completionVideoSeconds !== undefined) {
                return duration * m.pricing.completionVideoSeconds;
            }
            if (m.pricing.completionVideoTokens !== undefined) {
                // seedance-style token billing (~21780 tokens/s observed)
                const tokensPerSecond = 21780;
                return (duration * tokensPerSecond) * m.pricing.completionVideoTokens;
            }
        }
    }
    return duration * 0.01;
}

export function estimateTtsCost(textLength: number): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenlabs');
        if (m && m.averageCost !== undefined) {
            return m.averageCost;
        }
    }
    return (textLength / 1000) * 0.00018;
}

export function estimateMusicCost(duration: number): number {
    // Try ModelRegistry first
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('audio', 'elevenmusic');
        if (m && m.averageCost !== undefined) {
            return m.averageCost;
        }
    }
    return duration * 0.005;
}

// ─── Security & Validation Utils ─────────────────────────────────────────

/**
 * Empêche le Path Traversal en s'assurant que le nom de fichier
 * est restreint à son nom de base et ne contient pas de caractères malveillants.
 */
export function sanitizeFilename(filename: string): string {
    if (!filename) return '';
    // Conserve uniquement le basename brut (protège contre ../../ etc)
    const base = path.basename(filename);
    // Optionnel : on peut restreindre les caractères si nécessaire
    return base;
}

/**
 * Valide qu'une URL est bien HTTP ou HTTPS et empêche les schémas dangereux (file://, javascript:).
 */
export function validateHttpUrl(urlStr: string): boolean {
    if (!urlStr) return false;
    try {
        const parsed = new URL(urlStr);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// ─── File Utils ──────────────────────────────────────────────────────────

export function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function generateFilename(type: string, model: string, ext: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${type}_${model}_${timestamp}.${ext}`;
}

export function getDefaultOutputDir(type: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    return path.join(home, 'Downloads', 'pollinations', type);
}

export function formatCost(cost: number): string {
    if (cost < 0.001) return `${(cost * 1000).toFixed(4)} m🌻`;
    if (cost < 1) return `${cost.toFixed(4)} 🌻`;
    return `${cost.toFixed(2)} 🌻`;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Validation Helpers (Dynamic via ModelRegistry) ──────────────────────

/**
 * Check if model supports Image-to-Image
 */
export function supportsI2I(model: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('image', model);
        return m?.supportsI2X === true;
    }
    return false;
}

/**
 * Check if video model supports Image-to-Video
 */
export function supportsI2V(model: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return m?.supportsI2X === true;
    }
    return false;
}

/**
 * Check if video model requires Image-to-Video (no T2V)
 */
export function requiresI2V(model: string): boolean {
    // v6.5: I2V-only = accepts image input and no text input. manual.ts
    // patches wan with [image,text] + T2V dummy-image hack, so no current
    // model is strictly I2V-only.
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        if (m) {
            return m.input_modalities.includes('image') && !m.input_modalities.includes('text');
        }
    }
    return false;
}

/**
 * Validate aspect ratio for video model
 */
export function validateAspectRatio(model: string, ratio: string): boolean {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return m?.aspectRatios?.includes(ratio) ?? false;
    }
    return false;
}

/**
 * Get valid duration range for video model
 */
export function getDurationRange(model: string): [number, number] {
    if (ModelRegistry.isReady()) {
        const m = ModelRegistry.getByNameOrAlias('video', model);
        return (m?.durationRange as [number, number]) ?? [1, 10];
    }
    return [1, 10];
}
