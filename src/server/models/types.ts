/**
 * Unified Model Types for ModelRegistry
 * 
 * Single source of truth for all Pollinations model metadata.
 * Replaces the fragmented hardcoded constants in shared.ts.
 */

// ─── Core Model Interface ────────────────────────────────────────────────

export type ModelCategory = 'image' | 'video' | 'audio' | 'text';

export interface ModelPricing {
    currency: string;  // Always 'pollen'
    completionImageTokens?: number;
    completionVideoSeconds?: number;
    completionVideoTokens?: number;
    completionAudioTokens?: number;
    completionAudioSeconds?: number;
    promptAudioTokens?: number;
    promptAudioSeconds?: number;
    promptTextTokens?: number;
    promptCachedTokens?: number;
    promptImageTokens?: number;
    completionTextTokens?: number;
}

export interface PollinationsModel {
    name: string;
    description: string;
    category: ModelCategory;
    aliases: string[];
    pricing: ModelPricing;
    paid_only: boolean;
    supportsI2X: boolean;       // input_modalities includes "image"
    outputType: ModelCategory;  // Derived from output_modalities[0]
    voices?: string[];
    tools?: boolean;
    reasoning?: boolean;
    is_specialized?: boolean;
    context_window?: number;

    // Input/Output modalities (raw from API)
    input_modalities: string[];
    output_modalities: string[];

    // ─── Local patch data (not provided by API) ──────────────
    durationRange?: [number, number];
    aspectRatios?: string[];
    costHeader?: string;
    genTimeEstimate?: string;
    averageCost?: number; // Fetched from model-stats API (Tinybird)
}

// ─── Registry Interface ──────────────────────────────────────────────────

export interface ModelRegistryInterface {
    /** Get a single model by category and name */
    get(category: ModelCategory, name: string): PollinationsModel | undefined;
    /** List all models in a category */
    list(category: ModelCategory): PollinationsModel[];
    /** Check if registry has been populated */
    isReady(): boolean;
    /** Force refresh from API */
    refresh(apiKey?: string): Promise<void>;
    /** Get all models across all categories */
    all(): PollinationsModel[];
}
