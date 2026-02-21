/**
 * Manual Register — Curated patches & extras for Pollinations models
 *
 * Ce fichier remplace les constantes VIDEO_LOCAL_EXTRAS / IMAGE_LOCAL_EXTRAS
 * qui étaient inline dans fetcher.ts. Il expose une fonction applyManualPatches()
 * que le fetcher appelle après mapping.
 *
 * Pourquoi ce fichier existe :
 * - L'API ne fournit pas toutes les métadonnées (durée vidéo, aspect ratios, costHeader…)
 * - Certains prix retournés par l'API peuvent être périmés (bug upstream)
 * - Des modèles utiles n'apparaissent pas dans /image/models ou /audio/models
 *   (ex. endpoints account/* → ils seront dans MANUAL_EXTRAS pour usage futur)
 *
 * Convention d'expiry :
 * - expiresAt: null       → surcharge permanente (metadata structurelle)
 * - expiresAt: "date"     → à re-auditer après cette date (bug fix temporaire)
 */

import { log } from '../logger.js';
import type { PollinationsModel, ManualOverride, ManualExtra } from './types.js';

// ─── Overrides ────────────────────────────────────────────────────────────────
// Deep-merged sur les modèles dynamiques après fetch.

const OVERRIDES: ManualOverride[] = [

    // ── VIDEO : métadonnées structurelles (durée, ratios, costHeader) ────────
    // L'API ne retourne pas ces champs → surcharges permanentes.

    {
        name: 'grok-video',
        patch: {
            durationRange: [1, 15],
            aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~10s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },
    {
        name: 'ltx-2',
        patch: {
            durationRange: [5, 20],
            aspectRatios: ['16:9'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~35s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },
    {
        name: 'wan',
        patch: {
            durationRange: [5, 15],
            aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~30s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },
    {
        name: 'veo',
        patch: {
            durationRange: [4, 8],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-seconds',
            genTimeEstimate: '~45-68s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },
    {
        name: 'seedance',
        patch: {
            durationRange: [4, 12],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-tokens',
            genTimeEstimate: '~30s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },
    {
        name: 'seedance-pro',
        patch: {
            durationRange: [4, 12],
            aspectRatios: ['16:9', '9:16', '1:1'],
            costHeader: 'x-usage-completion-video-tokens',
            genTimeEstimate: '~30s',
        },
        reason: 'Métadonnées vidéo absentes de /image/models',
        expiresAt: null,
    },

    // ── IMAGE : costHeader (token-based models) ───────────────────────────────

    {
        name: 'kontext',
        patch: { costHeader: 'x-usage-completion-image-tokens' },
        reason: 'costHeader absent de /image/models',
        expiresAt: null,
    },
    {
        name: 'klein',
        patch: { costHeader: 'x-usage-completion-image-tokens' },
        reason: 'costHeader absent de /image/models',
        expiresAt: null,
    },
    {
        name: 'klein-large',
        patch: { costHeader: 'x-usage-completion-image-tokens' },
        reason: 'costHeader absent de /image/models',
        expiresAt: null,
    },
    {
        name: 'nanobanana',
        patch: { costHeader: 'x-usage-completion-image-tokens' },
        reason: 'costHeader absent de /image/models',
        expiresAt: null,
    },
    {
        name: 'nanobanana-pro',
        patch: { costHeader: 'x-usage-completion-image-tokens' },
        reason: 'costHeader absent de /image/models',
        expiresAt: null,
    },
    {
        name: 'gptimage',
        patch: {
            costHeader: 'x-usage-completion-image-tokens',
            pricing: {
                currency: 'pollen',
                standardOutputTokens: 1667, // tokens pour 1024×1024 standard
            },
        },
        reason: 'standardOutputTokens nécessaire pour estimation pricing correcte',
        expiresAt: null,
    },
    {
        name: 'gptimage-large',
        patch: {
            costHeader: 'x-usage-completion-image-tokens',
            pricing: {
                currency: 'pollen',
                standardOutputTokens: 1667,
            },
        },
        reason: 'standardOutputTokens nécessaire pour estimation pricing correcte',
        expiresAt: null,
    },

    // ── ALPHA flags (API ne signale pas) ─────────────────────────────────────

    {
        name: 'wan',
        patch: {
            description: 'Wan 2.6 · ⚠️ ALPHA — peut être instable (api.airforce)',
        },
        reason: 'Fournisseur expérimental, non signalé par API',
        expiresAt: null,
    },
    {
        name: 'grok-video',
        patch: {
            description: 'Grok Video · ⚠️ ALPHA — peut être instable (api.airforce)',
        },
        reason: 'Fournisseur expérimental, non signalé par API',
        expiresAt: null,
    },
    {
        name: 'imagen-4',
        patch: {
            description: 'Imagen 4 · ⚠️ ALPHA — peut être instable (api.airforce)',
        },
        reason: 'Fournisseur expérimental, non signalé par API',
        expiresAt: null,
    },
];

// ─── Extras ──────────────────────────────────────────────────────────────────
// Modèles absents des endpoints /image/models et /audio/models.
// Pour l'instant vide — réservé pour usage futur (ex. endpoints account/*
// si on veut les exposer comme PollinationsModel dans le registre).

const EXTRAS: ManualExtra[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isExpired(override: ManualOverride): boolean {
    if (!override.expiresAt) return false;
    return new Date(override.expiresAt) < new Date();
}

/**
 * Deep merge : le patch est appliqué récursivement sur le modèle.
 * Seuls les champs non-undefined du patch écrasent le modèle.
 */
function deepMerge<T extends object>(target: T, patch: Partial<T>): T {
    const result = { ...target };
    for (const key of Object.keys(patch) as (keyof T)[]) {
        const pval = patch[key];
        if (pval === undefined) continue;
        const tval = target[key];
        if (
            tval !== null && typeof tval === 'object' && !Array.isArray(tval) &&
            pval !== null && typeof pval === 'object' && !Array.isArray(pval)
        ) {
            result[key] = deepMerge(tval as object, pval as object) as T[keyof T];
        } else {
            result[key] = pval as T[keyof T];
        }
    }
    return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Applique les surcharges manuelles sur un tableau de modèles dynamiques.
 * Appelé par fetcher.ts → mapRawToModel() ou par cache.ts → refresh().
 *
 * @param models  Liste de modèles issus du fetch dynamique
 * @returns       Liste patchée + extras ajoutés
 */
export function applyManualPatches(models: PollinationsModel[]): PollinationsModel[] {
    const activeOverrides = OVERRIDES.filter(o => !isExpired(o));
    let patched = 0;
    let skipped = 0;

    const result = models.map(model => {
        // Récupère toutes les surcharges actives pour ce modèle
        const matching = activeOverrides.filter(o => o.name === model.name);
        if (matching.length === 0) return model;

        let merged = model;
        for (const override of matching) {
            merged = deepMerge(merged, override.patch as Partial<PollinationsModel>);
            patched++;
        }
        return merged;
    });

    // Ajouter les extras (modèles absents de l'API)
    const existingNames = new Set(result.map(m => m.name));
    for (const extra of EXTRAS) {
        if (!existingNames.has(extra.model.name)) {
            result.push(extra.model);
        }
    }

    // Log les overrides expirés (pour rappel de maintenance)
    const expired = OVERRIDES.filter(o => isExpired(o));
    if (expired.length > 0) {
        log(`[ManualRegister] ⚠️ ${expired.length} override(s) expirés à nettoyer: ${expired.map(o => o.name).join(', ')}`);
    }

    log(`[ManualRegister] ${patched} patch(es) appliqué(s) sur ${result.length} modèles. Extras: ${EXTRAS.length}.`);
    return result;
}

/**
 * Liste toutes les surcharges actives (pour debug / commande /poll models --patches)
 */
export function listActiveOverrides(): ManualOverride[] {
    return OVERRIDES.filter(o => !isExpired(o));
}

/**
 * Liste tous les extras manuels
 */
export function listExtras(): ManualExtra[] {
    return [...EXTRAS];
}
