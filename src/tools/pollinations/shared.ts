/**
 * Shared utilities for Pollinations API tools
 * 
 * Updated: 2026-02-12 - Verified API Reference
 * Tests: 18/18 passed
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../../server/config.js';

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

// ─── Verified Model Data (2026-02-12) ─────────────────────────────────────

/**
 * FREE Image Models (image.pollinations.ai/models)
 * WARNING: flux removed from free, turbo broken (shows notice)
 */
export const FREE_IMAGE_MODELS = {
    sana: { desc: 'Default free model', fileSize: '~60KB', reliable: true },
    zimage: { desc: 'Alias sana/turbo low qual', fileSize: '~35KB', reliable: true },
    turbo: { desc: 'DEPRECATED - shows notice', fileSize: '~4.1MB', reliable: false },
};

/**
 * Paid Image Models (gen.pollinations.ai)
 * I2I = Image-to-Image support
 */
export const PAID_IMAGE_MODELS: Record<string, {
    desc: string;
    cost: string;
    t2i: boolean;
    i2i: boolean;
    params: string[];
    notes?: string;
}> = {
    'flux': { desc: 'Flux Schnell', cost: '0.0002 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'zimage': { desc: 'Z-Image Turbo (6B Flux 2x)', cost: '0.0002 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'imagen-4': { desc: 'Imagen 4 (alpha)', cost: '0.0025 🌻', t2i: true, i2i: false, params: ['width', 'height'] },
    'klein': { desc: 'FLUX.2 Klein 4B', cost: '0.008 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'klein-large': { desc: 'FLUX.2 Klein 9B', cost: '0.012 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'gptimage': { desc: 'GPT Image 1 Mini (OpenAI)', cost: 'tokens', t2i: true, i2i: false, params: ['width', 'height', 'quality', 'transparent'] },
    'gptimage-large': { desc: 'GPT Image 1.5 (Advanced)', cost: 'tokens', t2i: true, i2i: false, params: ['width', 'height', 'quality', 'transparent'] },
    'kontext': { desc: 'FLUX.1 Kontext', cost: '0.04 🌻 💎', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: 'In-Context Editing' },
    'seedream': { desc: 'Seedream 4.0 (ByteDance ARK)', cost: '0.03 🌻', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'seedream-pro': { desc: 'Seedream 4.5 Pro (ARK 4K)', cost: '0.04 🌻 💎', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: '4K, Multi-Image' },
    'nanobanana': { desc: 'NanoBanana (Gemini 2.5 Flash)', cost: 'tokens', t2i: true, i2i: true, params: ['width', 'height', 'image'] },
    'nanobanana-pro': { desc: 'NanoBanana Pro (Gemini 3 Pro)', cost: 'tokens', t2i: true, i2i: true, params: ['width', 'height', 'image'], notes: 'Thinking Model' },
};

/**
 * Video Models (gen.pollinations.ai)
 * T2V = Text-to-Video, I2V = Image-to-Video
 */
export const VIDEO_MODELS: Record<string, {
    desc: string;
    cost: string;
    t2v: boolean;
    i2v: boolean;
    audio: boolean;
    duration: [number, number]; // [min, max]
    aspectRatios: string[];
    costHeader: string;
    genTime: string;
}> = {
    'grok-video': { 
        desc: 'Grok Video (alpha)', 
        cost: '0.0025/sec', 
        t2v: true, 
        i2v: false, 
        audio: true, 
        duration: [1, 15], 
        aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~10s'
    },
    'ltx-2': { 
        desc: 'LTX-2 (Lightricks)', 
        cost: '0.01/sec', 
        t2v: true, 
        i2v: false, 
        audio: true, 
        duration: [5, 20], 
        aspectRatios: ['16:9'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~35s'
    },
    'wan': { 
        desc: 'Wan 2.6 (Alibaba)', 
        cost: '0.025/sec', 
        t2v: false, // I2V ONLY!
        i2v: true, 
        audio: true, 
        duration: [5, 15], 
        aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~30s'
    },
    'veo': { 
        desc: 'Veo 3.1 Fast (Google)', 
        cost: '0.15/sec 💎', 
        t2v: true, 
        i2v: true, 
        audio: true, 
        duration: [4, 8], // 4, 6, or 8 seconds
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-seconds',
        genTime: '~45-68s',
    },
    'seedance': { 
        desc: 'Seedance Lite (BytePlus)', 
        cost: 'tokens', 
        t2v: true, 
        i2v: true, 
        audio: false, 
        duration: [4, 12], 
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-tokens',
        genTime: '~30s'
    },
    'seedance-pro': { 
        desc: 'Seedance Pro-Fast (BytePlus)', 
        cost: 'tokens', 
        t2v: true, 
        i2v: true, 
        audio: false, 
        duration: [4, 12], 
        aspectRatios: ['16:9', '9:16', '1:1'],
        costHeader: 'x-usage-completion-video-tokens',
        genTime: '~30s'
    },
};

/**
 * Audio Models
 * TTS = Text-to-Speech, STT = Speech-to-Text
 */
export const AUDIO_MODELS: Record<string, {
    desc: string;
    type: 'tts' | 'stt' | 'both';
    endpoint: string;
    params: string[];
    voices?: string[];
    notes?: string;
}> = {
    'openai-audio': { 
        desc: 'GPT-4o Audio Preview', 
        type: 'both', 
        endpoint: '/v1/chat/completions',
        params: ['voice', 'format'],
        voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        notes: 'DEFAULT - least expensive'
    },
    'elevenlabs': { 
        desc: 'ElevenLabs v3', 
        type: 'tts', 
        endpoint: '/audio/{text}',
        params: ['voice', 'response_format'],
        voices: ['rachel', 'domi', 'bella', 'elli', 'charlotte', 'dorothy', 'sarah', 'emily', 'lily', 'matilda', 'adam', 'antoni', 'arnold', 'josh', 'sam', 'daniel', 'charlie', 'james', 'fin', 'callum', 'liam', 'george', 'brian', 'bill', 'ash', 'ballad', 'coral', 'sage', 'verse'],
    },
    'whisper': { 
        desc: 'OpenAI Whisper v3', 
        type: 'stt', 
        endpoint: '/v1/audio/transcriptions',
        params: ['file'],
        notes: 'POST ONLY (multipart)'
    },
};

/**
 * Music Model (separate tool)
 */
export const MUSIC_MODEL = {
    'elevenmusic': {
        desc: 'ElevenLabs Music',
        endpoint: '/audio/{text}',
        params: ['duration', 'instrumental'],
        duration: [3, 300], // 3-300 seconds
    }
};

// ─── HTTP Helpers ─────────────────────────────────────────────────────────

export function httpsGet(
    url: string, 
    headers: Record<string, string> = {}
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
            // Handle redirects
            if ([301, 302, 307].includes(res.statusCode || 0) && res.headers.location) {
                httpsGet(res.headers.location, headers).then(resolve).catch(reject);
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
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
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
                    reject(new Error(`HTTP ${res.statusCode}: ${errorBody.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
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
                    reject(new Error(`HTTP ${res.statusCode}: ${errorBody.substring(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.write(bodyData);
        req.end();
    });
}

// ─── Model Discovery ─────────────────────────────────────────────────────

const MODEL_CACHE: Record<string, ModelInfo[]> = {
    image: [],
    audio: [],
    text: [],
};
let CACHE_TIME = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchModels(type: 'image' | 'audio' | 'text'): Promise<ModelInfo[]> {
    const now = Date.now();
    if (MODEL_CACHE[type].length > 0 && now - CACHE_TIME < CACHE_TTL) {
        return MODEL_CACHE[type];
    }

    const apiKey = getApiKey();
    const headers: Record<string, string> = {};
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
        const { data } = await httpsGet(
            `https://${API_BASE}/${type}/models`,
            headers
        );
        MODEL_CACHE[type] = JSON.parse(data.toString());
        CACHE_TIME = now;
        return MODEL_CACHE[type];
    } catch (err) {
        console.error(`Failed to fetch ${type} models:`, err);
        return [];
    }
}

export async function getModelInfo(type: 'image' | 'audio' | 'text', name: string): Promise<ModelInfo | undefined> {
    const models = await fetchModels(type);
    return models.find(m => m.name === name);
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
        modelUsed: headers['x-model-used'],
        requestId: headers['x-request-id'],
    };
}

/**
 * Check if cost estimator is enabled in config
 */
export function isCostEstimatorEnabled(): boolean {
    const config = loadConfig() as any;
    return config.costEstimator !== false; // Default true
}

export function estimateImageCost(model: string): number {
    const info = PAID_IMAGE_MODELS[model];
    if (!info) return 0.0002;
    const costMatch = info.cost.match(/[\d.]+/);
    return costMatch ? parseFloat(costMatch[0]) : 0.0002;
}

export function estimateVideoCost(model: string, duration: number): number {
    const info = VIDEO_MODELS[model];
    if (!info) return duration * 0.01;
    
    if (info.costHeader === 'x-usage-completion-video-tokens') {
        // Token-based: 108900 tokens for 5s video
        const tokensPerSecond = 21780;
        return (duration * tokensPerSecond) * 0.00001; // Approximate
    }
    
    // Second-based
    const costMatch = info.cost.match(/[\d.]+/);
    const perSecond = costMatch ? parseFloat(costMatch[0]) : 0.01;
    return duration * perSecond;
}

export function estimateTtsCost(textLength: number): number {
    // Approximate: 1 char ≈ 1 token
    return (textLength / 1000) * 0.00018;
}

export function estimateMusicCost(duration: number): number {
    return duration * 0.005; // ~0.005/sec
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

// ─── Validation Helpers ──────────────────────────────────────────────────

/**
 * Check if model supports Image-to-Image
 */
export function supportsI2I(model: string): boolean {
    const info = PAID_IMAGE_MODELS[model];
    return info?.i2i === true;
}

/**
 * Check if video model supports Image-to-Video
 */
export function supportsI2V(model: string): boolean {
    const info = VIDEO_MODELS[model];
    return info?.i2v === true;
}

/**
 * Check if video model requires Image-to-Video (no T2V)
 */
export function requiresI2V(model: string): boolean {
    const info = VIDEO_MODELS[model];
    return info?.t2v === false && info?.i2v === true;
}

/**
 * Validate aspect ratio for video model
 */
export function validateAspectRatio(model: string, ratio: string): boolean {
    const info = VIDEO_MODELS[model];
    return info?.aspectRatios.includes(ratio) ?? false;
}

/**
 * Get valid duration range for video model
 */
export function getDurationRange(model: string): [number, number] {
    const info = VIDEO_MODELS[model];
    return info?.duration ?? [1, 10];
}
