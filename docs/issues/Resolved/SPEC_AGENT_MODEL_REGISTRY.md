# SPEC_AGENT_MODEL_REGISTRY.md
## Sprint 1 + 2 : ModelRegistry Dynamique

**Statut :** 📝 ToDo  
**Priorité :** P0 — Prérequis de Cost Guard et des commandes pricing/models  
**Effort :** ~4h (Sprint 1 + Sprint 2 combinés)

---

## Contexte

Les trois registres de modèles dans `tools/pollinations/shared.ts` sont hardcodés :
- `PAID_IMAGE_MODELS` — prix, capacités I2I
- `VIDEO_MODELS` — prix, durée, aspect ratios, I2V
- `AUDIO_MODELS` — prix, voix, type TTS/STT

L'API `gen.pollinations.ai` retourne déjà toutes ces données dynamiquement (prix, `paid_only`, modalities). La synchronisation est donc aujourd'hui manuelle.

**Référence :** `docs/studies/detailled_endpoint_models_example_for_dynamic_adaptation_poll_enter.md`

---

## Sprint 1 — Créer le ModelRegistry

### Fichiers à créer

```
src/server/models/
  types.ts      ← interface PollinationsModel unifiée
  fetcher.ts    ← GET image/models + audio/models + text/models
  cache.ts      ← TTL 1h, invalidation manuelle
  index.ts      ← export ModelRegistry singleton
```

### types.ts

```typescript
export interface PollinationsModel {
  name: string;
  description: string;
  category: 'image' | 'video' | 'audio' | 'text';
  pricing: {
    completionImageTokens?: number;
    completionVideoSeconds?: number;
    completionVideoTokens?: number;
    completionAudioTokens?: number;
    completionAudioSeconds?: number;
    promptAudioTokens?: number;
    promptAudioSeconds?: number;
    promptTextTokens?: number;
    completionTextTokens?: number;
    promptCachedTokens?: number;
  };
  paid_only: boolean;
  supportsI2X: boolean;       // input_modalities includes "image" → I2I ou I2V
  outputType: 'image' | 'video' | 'audio' | 'text';
  voices?: string[];
  aliases?: string[];
  // Données locales (non fournies par l'API — patch appliqué après fetch)
  durationRange?: [number, number];
  aspectRatios?: string[];
  costHeader?: string;
  genTimeEstimate?: string;
}

export type ModelCategory = 'image' | 'video' | 'audio' | 'text';
```

### fetcher.ts

```typescript
import * as https from 'https';
import { PollinationsModel } from './types.js';

const BASE = 'gen.pollinations.ai';

// Données locales stables non fournies par l'API (durées, aspect ratios, etc.)
const VIDEO_LOCAL_EXTRAS: Record<string, Partial<PollinationsModel>> = {
    'grok-video':   { durationRange: [1,15],  aspectRatios: ['16:9','9:16','1:1','4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~10s' },
    'ltx-2':        { durationRange: [5,20],  aspectRatios: ['16:9'],                    costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~35s' },
    'wan':          { durationRange: [5,15],  aspectRatios: ['16:9','9:16','1:1','4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~30s' },
    'veo':          { durationRange: [4,8],   aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~45-68s' },
    'seedance':     { durationRange: [4,12],  aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-tokens',  genTimeEstimate: '~30s' },
    'seedance-pro': { durationRange: [4,12],  aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-tokens',  genTimeEstimate: '~30s' },
};

function getEndpoint(path: string, apiKey: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const req = https.get({ hostname: BASE, path, headers: { 'Authorization': `Bearer ${apiKey}` } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data) || []); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error(`Timeout ${path}`)); });
    });
}

function normalize(raw: any[], category: 'image' | 'video' | 'audio' | 'text'): PollinationsModel[] {
    return raw.map(m => {
        const outputMods: string[] = m.output_modalities || [];
        const outputType = outputMods.includes('video') ? 'video'
            : outputMods.includes('audio') ? 'audio'
            : outputMods.includes('image') ? 'image'
            : 'text';

        const base: PollinationsModel = {
            name: m.name,
            description: m.description || '',
            category,
            pricing: m.pricing || {},
            paid_only: m.paid_only ?? false,
            supportsI2X: (m.input_modalities || []).includes('image'),
            outputType: outputType as any,
            voices: m.voices,
            aliases: m.aliases,
        };

        // Apply local extras for video
        if (outputType === 'video' && VIDEO_LOCAL_EXTRAS[m.name]) {
            return { ...base, ...VIDEO_LOCAL_EXTRAS[m.name] };
        }

        return base;
    });
}

export async function fetchAllModels(apiKey: string): Promise<PollinationsModel[]> {
    const [imageRaw, audioRaw, textRaw] = await Promise.all([
        getEndpoint('/image/models', apiKey),
        getEndpoint('/audio/models', apiKey),
        getEndpoint('/text/models', apiKey),
    ]);

    return [
        ...normalize(imageRaw, 'image'),   // contient aussi les modèles vidéo (output_modalities = ["video"])
        ...normalize(audioRaw, 'audio'),
        ...normalize(textRaw, 'text'),
    ];
}
```

### cache.ts + index.ts

```typescript
// cache.ts
let _models: PollinationsModel[] = [];
let _fetchedAt = 0;
const TTL_MS = 60 * 60 * 1000; // 1h

export function setCache(models: PollinationsModel[]) { _models = models; _fetchedAt = Date.now(); }
export function isFresh() { return _models.length > 0 && Date.now() - _fetchedAt < TTL_MS; }
export function getCache() { return _models; }
export function invalidate() { _fetchedAt = 0; }

// index.ts — singleton ModelRegistry
export const ModelRegistry = {
    get(category: ModelCategory, name: string): PollinationsModel | undefined {
        return getCache().find(m => m.category === category && (m.name === name || m.aliases?.includes(name)));
    },
    list(category: ModelCategory): PollinationsModel[] {
        return getCache().filter(m => m.category === category);
    },
    all(): PollinationsModel[] { return getCache(); },
};
```

### Intégration dans src/index.ts

```typescript
// Après startProxy()
import { fetchAllModels } from './server/models/fetcher.js';
import { setCache, isFresh } from './server/models/cache.js';

// Init registry (best-effort, non bloquant)
const config = loadConfig();
if (config.apiKey) {
    fetchAllModels(config.apiKey)
        .then(models => { setCache(models); log(`[Registry] ${models.length} models loaded`); })
        .catch(e => { log(`[Registry] Fetch failed (fallback mode): ${e}`); });
}
```

---

## Sprint 2 — Remplacer les constantes hardcodées dans shared.ts

### Fonctions à remplacer/adapter

| Fonction actuelle | Comportement après Sprint 2 |
|-------------------|----------------------------|
| `PAID_IMAGE_MODELS[model]` | `ModelRegistry.get('image', model)` |
| `VIDEO_MODELS[model]` | `ModelRegistry.get('image', model)` (outputType=video) |
| `AUDIO_MODELS[model]` | `ModelRegistry.get('audio', model)` |
| `supportsI2I(model)` | `ModelRegistry.get('image', model)?.supportsI2X ?? false` |
| `supportsI2V(model)` | `ModelRegistry.get('image', model)?.supportsI2X ?? false` (outputType=video) |
| `requiresI2V(model)` | `model === 'wan'` (seul cas connu, rester explicite) |
| `getDurationRange(model)` | `ModelRegistry.get('image', model)?.durationRange ?? [1, 20]` |
| `validateAspectRatio(model, ar)` | `ModelRegistry.get('image', model)?.aspectRatios?.includes(ar) ?? true` |
| `estimateImageCost(model)` | `ModelRegistry.get('image', model)?.pricing.completionImageTokens ?? 0` |
| `estimateVideoCost(model, dur)` | `pricing.completionVideoSeconds * dur` ou `pricing.completionVideoTokens * tokens` |
| `estimateMusicCost(dur)` | `ModelRegistry.get('audio', 'elevenmusic')?.pricing.completionAudioSeconds * dur` |
| `estimateTtsCost(chars)` | Basé sur `completionAudioTokens` de openai-audio |

### Comportement de fallback si registry vide (startup ou fetch raté)

```typescript
function getModelOrFallback(category: ModelCategory, name: string): PollinationsModel {
    return ModelRegistry.get(category, name) ?? STATIC_FALLBACK[name] ?? DEFAULT_MODEL;
}
```
`STATIC_FALLBACK` est l'ancien contenu hardcodé — il reste dans le fichier mais n'est utilisé qu'en fallback. On ne supprime pas, on dégrade gracieusement.

---

## Tests à écrire

- `fetcher.test.ts` — mock HTTPS, vérifier normalize() avec paid_only, supportsI2X, VIDEO_LOCAL_EXTRAS
- `cache.test.ts` — TTL, invalidation, set/get
- `registry.test.ts` — get par nom, get par alias, list par category

---

## Checklist

- [ ] Créer `src/server/models/types.ts`
- [ ] Créer `src/server/models/fetcher.ts`
- [ ] Créer `src/server/models/cache.ts`
- [ ] Créer `src/server/models/index.ts`
- [ ] Intégrer init dans `src/index.ts`
- [ ] Mettre à jour `tools/pollinations/shared.ts` (remplacer constantes par fonctions registry)
- [ ] Vérifier gen_image, gen_video, gen_audio, gen_music → comportement identique
- [ ] Snapshot gencodedoc avant (`pre-model-registry`) + après (`model-registry-done`)
