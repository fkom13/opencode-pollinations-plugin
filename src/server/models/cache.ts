/**
 * ModelRegistry — Singleton cache for Pollinations models
 * 
 * Central access point for all model metadata. Backed by the fetcher
 * with a configurable TTL. Falls back to static data if fetch fails.
 * 
 * v6.5: every read path (get/list/all) triggers a coalesced, non-blocking
 * freshness check, so long sessions always converge to the live catalog.
 */

import * as fs from 'fs';
import * as path from 'path';
import { log } from '../logger.js';
import { loadConfig, getConfigDir } from '../config.js';
import { fetchAllModels } from './fetcher.js';
import type { PollinationsModel, ModelCategory, ModelRegistryInterface } from './types.js';

// ─── Static Fallback Data ────────────────────────────────────────────────
// Minimal fallback used ONLY when API is unreachable at startup.
// Keeps the plugin functional offline.

const STATIC_FALLBACK: PollinationsModel[] = [
    // Image — most common
    { name: 'flux', description: 'Flux Schnell', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.0002 }, paid_only: false, supportsI2X: false, outputType: 'image', input_modalities: ['text'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'zimage', description: 'Z-Image Turbo', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.0002 }, paid_only: false, supportsI2X: false, outputType: 'image', input_modalities: ['text'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'klein', description: 'FLUX.2 Klein 4B', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.008 }, paid_only: false, supportsI2X: true, outputType: 'image', input_modalities: ['text', 'image'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    { name: 'kontext', description: 'FLUX.1 Kontext', category: 'image', aliases: [], pricing: { currency: 'pollen', completionImageTokens: 0.04 }, paid_only: true, supportsI2X: true, outputType: 'image', input_modalities: ['text', 'image'], output_modalities: ['image'], costHeader: 'x-usage-completion-image-tokens' },
    // Video — essential
    { name: 'grok-video-pro', description: 'Grok Video Pro', category: 'video', aliases: [], pricing: { currency: 'pollen', completionVideoSeconds: 0.0025 }, paid_only: false, supportsI2X: true, outputType: 'video', input_modalities: ['text', 'image'], output_modalities: ['video'], durationRange: [1, 15], aspectRatios: ['16:9', '9:16', '1:1', '4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~10s' },
    { name: 'veo', description: 'Veo 3.1 Fast', category: 'video', aliases: [], pricing: { currency: 'pollen', completionVideoSeconds: 0.15 }, paid_only: true, supportsI2X: true, outputType: 'video', input_modalities: ['text', 'image'], output_modalities: ['video'], durationRange: [4, 8], aspectRatios: ['16:9', '9:16', '1:1'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~45-68s' },
    // Audio — essential
    { name: 'elevenlabs', description: 'ElevenLabs v3 TTS', category: 'audio', aliases: [], pricing: { currency: 'pollen', completionAudioTokens: 0.00018 }, paid_only: false, supportsI2X: false, outputType: 'audio', input_modalities: ['text'], output_modalities: ['audio'] },
    { name: 'whisper', description: 'Whisper v3 STT', category: 'audio', aliases: [], pricing: { currency: 'pollen', promptAudioSeconds: 0.0000445 }, paid_only: false, supportsI2X: false, outputType: 'audio', input_modalities: ['audio'], output_modalities: ['text'] },
];

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

export type RegistryFetcher = (apiKey?: string) => Promise<PollinationsModel[]>;

export interface RegistryOptions {
    ttlMs?: number;
    fetcher?: RegistryFetcher;
    diskCache?: boolean;
}

function getCacheFilePath(): string {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
    }
    return path.join(dir, 'pollinations_models_cache.json');
}

interface CacheData {
    timestamp: number;
    models: PollinationsModel[];
}

function loadCacheFromDisk(): CacheData | null {
    try {
        const filePath = getCacheFilePath();
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as CacheData;
        }
    } catch (e) {
        log(`[ModelRegistry] Failed to load cache from disk: ${e}`);
    }
    return null;
}

function saveCacheToDisk(models: PollinationsModel[], timestamp: number): void {
    try {
        const filePath = getCacheFilePath();
        const data: CacheData = { timestamp, models };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        log(`[ModelRegistry] Failed to save cache to disk: ${e}`);
    }
}

// ─── Registry Implementation ─────────────────────────────────────────────

export class ModelRegistryImpl implements ModelRegistryInterface {
    private models: PollinationsModel[] = [];
    private lastRefresh: number = 0;
    private ttl: number = DEFAULT_TTL;
    private ready: boolean = false;
    private refreshing: Promise<void> | null = null;
    private fetcher: RegistryFetcher;
    private useDiskCache: boolean;

    constructor(options: RegistryOptions = {}) {
        this.ttl = options.ttlMs ?? DEFAULT_TTL;
        this.fetcher = options.fetcher ?? ((apiKey?: string) => fetchAllModels(apiKey));
        this.useDiskCache = options.diskCache ?? true;

        if (this.useDiskCache) {
            const diskCache = loadCacheFromDisk();
            if (diskCache && (Date.now() - diskCache.timestamp) < this.ttl) {
                this.models = diskCache.models;
                this.lastRefresh = diskCache.timestamp;
                this.ready = true;
                log(`[ModelRegistry] Loaded ${this.models.length} models from disk cache.`);
            }
        }
    }

    /** Get a single model by category and name. Triggers lazy freshness check. */
    get(category: ModelCategory, name: string): PollinationsModel | undefined {
        this.ensureFresh().catch(() => { });
        return this.models.find(m => m.category === category && m.name === name);
    }

    /** Also search by alias. Triggers lazy freshness check. */
    getByNameOrAlias(category: ModelCategory, name: string): PollinationsModel | undefined {
        this.ensureFresh().catch(() => { });
        return this.models.find(m =>
            m.category === category && (m.name === name || m.aliases.includes(name))
        );
    }

    /** List all models in a category. Triggers lazy freshness check. */
    list(category: ModelCategory): PollinationsModel[] {
        this.ensureFresh().catch(() => { });
        return this.models.filter(m => m.category === category);
    }

    /** Check if registry has been populated */
    isReady(): boolean {
        return this.ready;
    }

    /** Check if cache is stale */
    isStale(): boolean {
        return Date.now() - this.lastRefresh > this.ttl;
    }

    /** Timestamp of last successful refresh (for tests/diagnostics). */
    lastRefreshAt(): number {
        return this.lastRefresh;
    }

    /** Force refresh from API. Concurrent calls are coalesced on one fetch. */
    refresh(apiKey?: string): Promise<void> {
        if (this.refreshing) return this.refreshing; // coalesce concurrent refreshes
        this.refreshing = this.performRefresh(apiKey).finally(() => {
            this.refreshing = null;
        });
        return this.refreshing;
    }

    private async performRefresh(apiKey?: string): Promise<void> {
        try {
            const key = apiKey || loadConfig().apiKey;
            const fetched = await this.fetcher(key);

            if (fetched.length > 0) {
                this.models = fetched;
                this.lastRefresh = Date.now();
                this.ready = true;
                if (this.useDiskCache) saveCacheToDisk(this.models, this.lastRefresh);
                log(`[ModelRegistry] Refreshed: ${this.models.length} models cached to disk.`);
            } else {
                // API returned empty — keep existing data or use fallback
                if (!this.ready) {
                    this.models = [...STATIC_FALLBACK];
                    this.ready = true;
                    log(`[ModelRegistry] API empty. Using static fallback (${STATIC_FALLBACK.length} models).`);
                } else {
                    log(`[ModelRegistry] API returned empty, keeping existing ${this.models.length} models.`);
                }
            }
        } catch (e) {
            if (!this.ready) {
                this.models = [...STATIC_FALLBACK];
                this.ready = true;
                log(`[ModelRegistry] Fetch failed, using static fallback: ${e}`);
            } else {
                log(`[ModelRegistry] Refresh failed, keeping cache: ${e}`);
            }
        }
    }

    /** Get all models across all categories. Triggers lazy freshness check. */
    all(): PollinationsModel[] {
        this.ensureFresh().catch(() => { });
        return [...this.models];
    }

    /** Auto-refresh if stale (non-blocking). Returns the refresh promise for tests. */
    ensureFresh(): Promise<void> {
        if (this.isStale()) {
            return this.refresh(); // coalesced; refresh() never rejects (handles offline)
        }
        return Promise.resolve();
    }

    /** Get count per category (for logging) */
    stats(): Record<ModelCategory, number> {
        return {
            image: this.list('image').length,
            video: this.list('video').length,
            audio: this.list('audio').length,
            text: this.list('text').length,
            '3d': this.list('3d').length,
            embedding: this.list('embedding').length,
            realtime: this.list('realtime').length,
        };
    }
}

// ─── Singleton Export ────────────────────────────────────────────────────

export const ModelRegistry = new ModelRegistryImpl();
