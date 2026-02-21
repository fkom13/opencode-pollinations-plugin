/**
 * Model Registry — Barrel Export
 */

export { ModelRegistry } from './cache.js';
export { fetchAllModels } from './fetcher.js';

// ── Manual Register ──────────────────────────────────────────────────────────
// Exporté pour : /poll models --patches, tests, et le pricing script
export { applyManualPatches, listActiveOverrides, listExtras } from './manual.js';

export type {
    PollinationsModel,
    ModelCategory,
    ModelPricing,
    ModelRegistryInterface,
    ManualOverride,
    ManualExtra,
} from './types.js';
