# 🧭 CONSEIL_ORDRE_EXECUTION.md
## Analyse & Recommandation : Model Registry → Cost Guard → Commandes

> Analyse du code réel `src/` (18/02/2026) + endpoints vérifiés

---

## 1. Diagnostic : Ce qui est hardcodé vs ce que l'API fournit déjà

### `tools/pollinations/shared.ts` — Trois registres hardcodés

```
PAID_IMAGE_MODELS   ← structure maison avec cost string ("0.0002 🌻"), t2i/i2i bool
VIDEO_MODELS        ← idem avec duration range, aspectRatios, genTime, costHeader
AUDIO_MODELS        ← idem avec type (tts/stt/both), endpoint, voices
```

### Ce que `GET gen.pollinations.ai/image/models` (Bearer) retourne déjà :

```json
{
  "name": "flux",
  "pricing": { "currency": "pollen", "completionImageTokens": 0.0002 },
  "input_modalities": ["text"],
  "output_modalities": ["image"],
  "paid_only": false
}
```
```json
{
  "name": "klein",
  "pricing": { "currency": "pollen", "completionImageTokens": 0.008 },
  "input_modalities": ["text", "image"],
  "output_modalities": ["image"]
}
```
```json
{
  "name": "veo",
  "pricing": { "currency": "pollen", "completionVideoSeconds": 0.15 },
  "input_modalities": ["text", "image"],
  "output_modalities": ["video"],
  "paid_only": true
}
```

### Table de correspondance : hardcodé → API

| Donnée hardcodée dans shared.ts | Disponible via API | Champ API |
|---------------------------------|--------------------|-----------|
| coût image (ex: 0.0002) | ✅ | `pricing.completionImageTokens` |
| coût vidéo /s (ex: 0.15) | ✅ | `pricing.completionVideoSeconds` |
| coût vidéo tokens | ✅ | `pricing.completionVideoTokens` |
| coût audio /token | ✅ | `pricing.completionAudioTokens` |
| coût audio /s | ✅ | `pricing.completionAudioSeconds` |
| `paid_only` | ✅ | `paid_only` |
| supporte I2I (image en input) | ✅ | `input_modalities` contient `"image"` |
| supporte I2V | ✅ | idem |
| output type (image/video/audio) | ✅ | `output_modalities[0]` |
| voix disponibles | ✅ | `voices[]` (sur audio models) |

### Ce que l'API ne fournit PAS (à conserver localement)

- `duration` min/max par modèle vidéo
- `aspectRatios` supportés par modèle vidéo
- `genTimeEstimate` estimé
- `costHeader` (quel header HTTP pour tracker le coût réel : `x-usage-completion-video-seconds` vs tokens)

→ Ces 4 données forment un **patch local minimal** appliqué après fetch.

---

## 2. Graphe de Dépendances

```
[A] ModelRegistry (fetcher + cache + types)
      │
      ├─→ [B] shared.ts dynamique
      │         → remplace PAID_IMAGE_MODELS, VIDEO_MODELS, AUDIO_MODELS
      │         → utilisé par gen_image, gen_video, gen_audio, gen_music, deepsearch, search_crawl_scrape
      │
      ├─→ [C] Cost Guard
      │         → utilise les vrais prix du registry
      │         → injecté dans gen_image, gen_video, gen_audio, gen_music, deepsearch, search_crawl_scrape
      │
      └─→ [D] Commandes /pollinations models + /pollinations pricing
                → réutilise le cache déjà chaud du registry
                → zero nouveau fetcher
```

**[A] est le prérequis de [B], [C] et [D].**
**[B] doit précéder [C]** : un cost guard calculant depuis des données hardcodées est invalide dès la prochaine mise à jour de l'API.
**[D] peut s'exécuter en parallèle de [C]** : même infrastructure, surface différente.

---

## 3. Ordre d'Exécution Recommandé

### Sprint 1 — ModelRegistry 🏗️
**Fichiers à créer :** `src/server/models/fetcher.ts`, `cache.ts`, `types.ts`

**Interface unifiée (types.ts) :**
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
    promptTextTokens?: number;
    completionTextTokens?: number;
  };
  paid_only: boolean;
  supportsI2X: boolean;      // input_modalities includes "image"
  outputType: 'image' | 'video' | 'audio' | 'text';
  voices?: string[];
  // Données locales (patch) :
  durationRange?: [number, number];
  aspectRatios?: string[];
  costHeader?: string;
  genTimeEstimate?: string;
}
```

**Comportement :**
- Fetcher appelé à l'init plugin dans `src/index.ts` juste après `startProxy()`
- `Promise.all` sur `/image/models`, `/audio/models`, `/text/models`
- TTL cache : 1h
- **Fallback silencieux** : si fetch échoue → on garde les données statiques locales (filet de sécurité, zéro blocage au démarrage)

**Patch local vidéo (non fourni par l'API, stable dans le temps) :**
```typescript
const VIDEO_LOCAL_EXTRAS: Record<string, Partial<PollinationsModel>> = {
    'grok-video':   { durationRange: [1,15],  aspectRatios: ['16:9','9:16','1:1','4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~10s' },
    'ltx-2':        { durationRange: [5,20],  aspectRatios: ['16:9'],                    costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~35s' },
    'wan':          { durationRange: [5,15],  aspectRatios: ['16:9','9:16','1:1','4:3'], costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~30s' },
    'veo':          { durationRange: [4,8],   aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-seconds', genTimeEstimate: '~45-68s' },
    'seedance':     { durationRange: [4,12],  aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-tokens',  genTimeEstimate: '~30s' },
    'seedance-pro': { durationRange: [4,12],  aspectRatios: ['16:9','9:16','1:1'],        costHeader: 'x-usage-completion-video-tokens',  genTimeEstimate: '~30s' },
};
```

---

### Sprint 2 — shared.ts dynamique 🔄
**Objectif :** remplacer les trois constantes hardcodées par des lookups dans le registry.

```typescript
// AVANT
export const PAID_IMAGE_MODELS = { 'flux': { cost: '0.0002 🌻', ... } };

// APRÈS
export function getImageModel(name: string): PollinationsModel | undefined {
    return ModelRegistry.get('image', name);
}
export function getAllImageModels(): PollinationsModel[] {
    return ModelRegistry.list('image');
}
export function supportsI2I(modelName: string): boolean {
    return ModelRegistry.get('image', modelName)?.supportsI2X ?? false;
}
```

Les fonctions helpers (`estimateImageCost`, `estimateVideoCost`, `estimateMusicCost`, `supportsI2V`, `requiresI2V`, `validateAspectRatio`, `getDurationRange`) sont **réécrites** pour lire depuis le registry au lieu des constantes. L'interface des outils (`gen_image.ts` etc.) **ne change pas**.

---

### Sprint 3 — Cost Guard 🛡️
**Fichier :** `src/tools/pollinations/cost-guard.ts`

**Config (dans `server/config.ts`) :**
```typescript
tools?: {
  enable_paid_models: boolean;      // défaut: true — interrupteur wallet
  ask_cost_confirmation: boolean;   // défaut: false — demande validation si coût > seuil
  cost_limit: number;               // défaut: 0.1 — seuil en pollens
}
```

**Logique `checkCostControl()` :**
```typescript
// 1. paid_only + enable_paid_models=false → BLOQUÉ
//    message IA : "Demandez à l'utilisateur d'activer enable_paid_models pour ce modèle."

// 2. coût estimé > cost_limit + ask_cost_confirmation=true → CONFIRMATION REQUISE
//    retour tool : "⚠️ Coût estimé : X 🌻 pour [objectif de l'appel]. Confirmez ?"
//    message IA : "Vous devez demander confirmation à l'utilisateur avant de continuer."

// 3. Toujours : afficher le coût estimé dans le retour du tool (même si autorisé)
```

**Outils concernés :** `gen_image`, `gen_video`, `gen_audio`, `gen_music`, `deepsearch`, `search_crawl_scrape`

---

### Sprint 4 — Commandes /pollinations models + pricing 📊
Réutilise le cache ModelRegistry. Zéro nouveau fetch.

**Format de sortie (données réelles API) :**
```
📝 TEXT (25 modèles)
  openai          GPT-5 Mini            0.15 / 0.6 🌻/Mtok
  openai-fast     GPT-5 Nano    ⭐FREE  0.06 / 0.44 🌻/Mtok
  claude          Sonnet 4.5    💎PAID  3 / 15 🌻/Mtok

🎨 IMAGE (13 modèles)
  flux            Flux Schnell           0.0002 🌻/img
  seedream-pro    Seedream 4.5 💎       0.04 🌻/img

🎬 VIDEO (6 modèles)
  grok-video      Grok Video             0.0025 🌻/s
  veo             Veo 3.1 Fast 💎       0.15 🌻/s

🔊 AUDIO (4 modèles)
  openai-audio    GPT-4o Audio           0.022 🌻/ks
  elevenlabs      ElevenLabs v3          0.18 🌻/ks
```

---

## 4. Récapitulatif

| Sprint | Livrable | Valeur | Effort |
|--------|----------|--------|--------|
| 1 | ModelRegistry (fetcher + cache + types) | Fondation partagée | ~2h |
| 2 | shared.ts dynamique | Maintenance ÷10, auto-sync API | ~2h |
| 3 | Cost Guard | Protection wallet utilisateur | ~2h |
| 4 | /pollinations models + pricing | UX, visibilité complète | ~2h |

**Total : ~8h — 4 sprints séquentiels propres.**

---

## 5. Actions sur les Specs existantes éffectuées par l'user

| Action | Fichier |Effectué par utilisateur |
|--------|---------|
| ✅ Déplacer en `Resolved/` | `SPEC_AGENT_HOMEDIR_CONFIG.md` | ✅ |
| ✅ Déplacer en `Resolved/` | `SPEC_AGENT_FFMPEG_MULTIOS.md` | ✅ |
| ✅ Déplacer en `Resolved/` | `SPEC_AGENT_LOGGING_MULTIOS.md` | ✅ |
| ✅ Déplacer en `Resolved/` | `SPEC_AGENT_FILESYSTEM_MULTIOS.md` | ✅ |
| ✅ Déplacer en `Resolved/` | `SPEC_AGENT_CONNECT_MODEL.md` | ✅ |
| 🆕 Créer | `SPEC_AGENT_MODEL_REGISTRY.md` (Sprint 1+2) | ✅ |
| 🔄 Mettre à jour | `SPEC_AGENT_COST_GUARD.md` (Sprint 3) | ✅ |
| 🔄 Mettre à jour | `FEATURE_PRICING_MODELS_COMMANDS.md` (Sprint 4 — réutilise registry) | ✅ |
