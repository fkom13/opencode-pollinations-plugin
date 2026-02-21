/**
 * Unified Model Types for ModelRegistry
 *
 * Single source of truth for all Pollinations model metadata.
 * Replaces the fragmented hardcoded constants in shared.ts.
 */

// ─── Core Model Interface ────────────────────────────────────────────────────

export type ModelCategory = 'image' | 'video' | 'audio' | 'text';

export interface ModelPricing {
    currency: string; // Always 'pollen'

    // ── Token costs (pollen / token) ──────────────────────────────────────
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

    // ── Precomputed / override fields ─────────────────────────────────────
    // If the API exposes one of these, it takes priority over all token formulas.
    // The pollinations_pricing.ts script probes them in order.
    avgRequestCost?: number;        // Precomputed average cost for a typical request
    exampleCost?: number;           // Alias used by some API versions
    flatCostPerImage?: number;      // Flat cost per image (flat-rate models like flux)
    standardOutputTokens?: number;  // Expected output tokens for a standard 1024×1024 gen
                                    // Used by token-based image models (gptimage, nanobanana)
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

    // ─── Local patch data (not provided by API, set by ManualRegister) ────
    durationRange?: [number, number];
    aspectRatios?: string[];
    costHeader?: string;
    genTimeEstimate?: string;

    // ─── Discovery metadata (set by BetaDiscovery skill) ─────────────────
    discoveredParams?: Record<string, string[]>; // param → discovered enum values
    discoveredAt?: string;                        // ISO 8601
}

// ─── Manual Override Types ───────────────────────────────────────────────────

export interface ManualOverride {
    /** Target model name (must match PollinationsModel.name) */
    name: string;
    /** Fields to deep-merge into the model */
    patch: Partial<PollinationsModel>;
    /** Why this override exists */
    reason: string;
    /** ISO 8601 expiry date — null means permanent */
    expiresAt: string | null;
}

export interface ManualExtra {
    /** Models that are completely absent from /image/models and /audio/models */
    model: PollinationsModel;
    reason: string;
}

// ─── Registry Interface ──────────────────────────────────────────────────────

export interface ModelRegistryInterface {
    get(category: ModelCategory, name: string): PollinationsModel | undefined;
    getByNameOrAlias(category: ModelCategory, name: string): PollinationsModel | undefined;
    list(category: ModelCategory): PollinationsModel[];
    isReady(): boolean;
    refresh(apiKey?: string): Promise<void>;
    all(): PollinationsModel[];
    stats(): Record<ModelCategory, number>;
}
