# 📊 Bilan du Code - Pollinations Plugin v6 Beta

## 🏗️ Architecture du Projet

```
v6beta-updated/
├── src/
│   ├── index.ts                    # Point d'entrée principal
│   ├── tools/
│   │   ├── index.ts               # Registry des tools (injection conditionnelle)
│   │   ├── shared.ts              # Utilitaires communs
│   │   │
│   │   ├── pollinations/          # 🔷 ENTER TOOLS (7 tools - clé requise)
│   │   │   ├── shared.ts          # Modèles, coûts, HTTP helpers
│   │   │   ├── gen_image.ts       # Génération d'images (T2I + I2I)
│   │   │   ├── gen_video.ts       # Génération de vidéos (T2V + I2V)
│   │   │   ├── gen_audio.ts       # Text-to-Speech (TTS)
│   │   │   ├── transcribe_audio.ts # Speech-to-Text (STT)
│   │   │   ├── gen_music.ts       # Génération musicale
│   │   │   ├── deepsearch.ts      # Recherche profonde (perplexity-reasoning)
│   │   │   └── search_crawl_scrape.ts # Recherche web (perplexity-fast)
│   │   │
│   │   ├── design/                # 🟢 FREE TOOLS (3 tools)
│   │   │   ├── gen_qrcode.ts      # Génération QR codes
│   │   │   ├── gen_diagram.ts     # Génération diagrammes
│   │   │   └── gen_palette.ts     # Génération palettes couleurs
│   │   │
│   │   └── power/                  # 🟢 FREE TOOLS (5 tools)
│   │       ├── file_to_url.ts     # Upload fichiers
│   │       ├── remove_background.ts # Suppression arrière-plan
│   │       ├── extract_frames.ts  # Extraction frames vidéo
│   │       ├── extract_audio.ts   # Extraction audio
│   │       └── rmbg_keys.ts       # Gestion clés API
│   │
│   └── server/
│       ├── index.ts               # Serveur proxy + hooks
│       ├── config.ts              # Configuration (V5 schema)
│       ├── commands.ts            # Commandes /pollinations
│       ├── quota.ts               # Gestion quota/tier
│       ├── toast.ts               # Notifications UI
│       ├── status.ts              # Barre de statut
│       ├── proxy.ts               # Proxy pour models
│       ├── pollinations-api.ts    # Appels API Pollinations
│       └── generate-config.ts     # Génération config OpenCode
│
├── tests/
│   ├── unit/
│   │   ├── test_tools.test.ts     # 30+ tests outils
│   │   └── test_commands.test.ts  # 25+ tests commandes
│   └── run_tests.sh               # Script exécution tests
│
├── scripts/                        # Scripts divers
├── docs/                          # Documentation
└── dist/                          # Build compilé
```

---

## 📦 Inventaire des Tools

### 🟢 FREE TOOLS (8 - Toujours disponibles)

| Tool | Description | Entrée | Sortie |
|------|-------------|--------|--------|
| `gen_qrcode` | Génère QR codes | Texte/URL | PNG |
| `gen_diagram` | Génère diagrammes | Description | PNG/SVG |
| `gen_palette` | Génère palettes | Description | JSON + Preview |
| `file_to_url` | Upload fichier → URL | Fichier local | URL publique |
| `remove_background` | Supprime arrière-plan | Image | PNG transparent |
| `extract_frames` | Extrait frames vidéo | Vidéo | Images |
| `extract_audio` | Extrait audio vidéo | Vidéo | Audio |
| `rmbg_keys` | Gestion clés API | Action + Clé | Confirmation |

### 🔷 ENTER TOOLS (7 - Clé API requise)

| Tool | Description | Modèles | Coût |
|------|-------------|---------|------|
| `gen_image` | Génération images | flux, kontext, seedream... | 0.0002-0.04 🌻 |
| `gen_video` | Génération vidéos | grok-video, veo, seedance... | 0.0025-0.15 🌻/s |
| `gen_audio` | Text-to-Speech | openai-audio, elevenlabs | Tokens |
| `transcribe_audio` | Speech-to-Text | openai-audio, whisper | Tokens |
| `gen_music` | Génération musique | elevenmusic | ~0.005 🌻/s |
| `deepsearch` | Recherche profonde | perplexity-reasoning | Tokens |
| `search_crawl_scrape` | Recherche web | perplexity-fast | Tokens |

---

## 🎨 gen_image - Détails

### FREE Models (image.pollinations.ai)
| Model | Status | Notes |
|-------|--------|-------|
| `sana` | ✅ Fiable | Défaut FREE (~60KB) |
| `zimage` | ✅ Fiable | Alias low qual (~35KB) |
| `turbo` | ❌ BROKEN | Affiche notice dépréciation |
| `flux` | ❌ REMOVED | Retiré du FREE |

### PAID Models (gen.pollinations.ai)
| Model | T2I | I2I | Prix | Params spéciaux |
|-------|-----|-----|------|-----------------|
| `flux` | ✅ | ❌ | 0.0002 🌻 | - |
| `zimage` | ✅ | ❌ | 0.0002 🌻 | - |
| `imagen-4` | ✅ | ❌ | 0.0025 🌻 | - |
| `klein` | ✅ | ✅ | 0.008 🌻 | `image` URL |
| `klein-large` | ✅ | ✅ | 0.012 🌻 | `image` URL |
| `gptimage` | ✅ | ❌ | tokens | `quality`, `transparent` |
| `gptimage-large` | ✅ | ❌ | tokens | `quality`, `transparent` |
| `kontext` | ✅ | ✅ | 0.04 🌻💎 | `image` URL (In-Context Editing) |
| `seedream` | ✅ | ✅ | 0.03 🌻 | `image` URL |
| `seedream-pro` | ✅ | ✅ | 0.04 🌻💎 | `image` URL (Multi-Image) |
| `nanobanana` | ✅ | ✅ | tokens | `image` URL |
| `nanobanana-pro` | ✅ | ✅ | tokens | `image` URL (Thinking) |

### Paramètres supportés
- `prompt` (requis) - Description
- `model` - Modèle à utiliser
- `width` / `height` - Dimensions (256-4096)
- `reference_image` - URL pour I2I (comma-separated pour seedream-pro)
- `seed` - Reproductibilité
- `quality` - gptimage only (low/med/high)
- `transparent` - gptimage only (bool)

---

## 🎬 gen_video - Détails

### Models
| Model | T2V | I2V | Audio | Duration | Aspect Ratios | Prix |
|-------|-----|-----|-------|----------|---------------|------|
| `grok-video` | ✅ | ❌ | ✅ | 1-15s | 16:9, 9:16, 1:1, 4:3 | 0.0025/s |
| `ltx-2` | ✅ | ❌ | ✅ | 5-20s | 16:9 only | 0.01/s |
| `wan` | ❌ | ✅ | ✅ | 5-15s | 16:9, 9:16, 1:1, 4:3 | 0.025/s |
| `veo` | ✅ | ✅ | ✅ | 4-8s | 16:9, 9:16, 1:1 | 0.15/s 💎 |
| `seedance` | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens |
| `seedance-pro` | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 | tokens |

### Règles critiques
- **wan** = I2V ONLY (T2V retourne 400)
- **seedance** = Pas de 21:9
- **veo interpolation** = `image=url1,url2` (comma-separated)

### Paramètres supportés
- `prompt` (requis)
- `model` - Modèle vidéo
- `duration` - Durée en secondes
- `aspect_ratio` - Ratio (converti en width/height)
- `reference_image` - URL pour I2V
- `seed` - Reproductibilité

---

## 🔊 gen_audio / transcribe_audio - Détails

### TTS (gen_audio)
| Model | Type | Voices | Format | Endpoint |
|-------|------|--------|--------|----------|
| `openai-audio` | TTS+STT | 6 | mp3/wav/pcm16 | /v1/chat/completions |
| `elevenlabs` | TTS | 34 | mp3 | /v1/audio/speech |

### STT (transcribe_audio)
| Model | Type | Formats | Endpoint |
|-------|------|---------|----------|
| `openai-audio` | TTS+STT | mp3/wav/m4a/... | /v1/chat/completions |
| `whisper` | STT | mp3/wav/m4a/... | /v1/audio/transcriptions |

### Voices OpenAI
`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

---

## 🎵 gen_music - Détails

| Model | Duration | Params |
|-------|----------|--------|
| `elevenmusic` | 3-300s | `duration`, `instrumental`, `seed` |

---

## 💰 Cost Tracking

### Headers de réponse
| Header | Value |
|--------|-------|
| `x-usage-completion-image-tokens` | Token count (images) |
| `x-usage-completion-video-seconds` | Durée float (vidéo sec-based) |
| `x-usage-completion-video-tokens` | Token count (vidéo token-based) |
| `x-model-used` | Modèle confirmé |
| `x-request-id` | UUID debug |

### Config Toggle
```
/pollinations config cost_estimator true/false
```
Par défaut: `true`

---

## ⚙️ Configuration

### Schema (V5)
```typescript
interface PollinationsConfigV5 {
    version: string;
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;
    keyHasAccessToProfile?: boolean;
    gui: {
        status: 'none' | 'alert' | 'all';
        logs: 'none' | 'error' | 'verbose';
    };
    thresholds: {
        tier: number;
        wallet: number;
    };
    fallbacks: {
        free: { main: string; agent: string; };
        enter: { agent: string; };
    };
    enablePaidTools: boolean;
    statusBar: boolean;
    costEstimator: boolean;
}
```

### Commandes
```
/pollinations mode [manual|alwaysfree|pro]
/pollinations usage [full]
/pollinations connect <api_key>
/pollinations config [key] [value]
/pollinations fallback <main> [agent]
/pollinations help
```

---

## 🧪 Tests

### Couverture
- **test_tools.test.ts**: 30+ tests
  - Modèles FREE/PAID
  - Support I2I/I2V
  - Validation duration/aspect ratio
  - Fonctions de coût
  - Headers de tracking
  - Tests de régression

- **test_commands.test.ts**: 25+ tests
  - Parsing commandes
  - Validation modes
  - Config toggles
  - Fallbacks
  - Tier limits
  - Formatting

### Exécution
```bash
npx ts-node tests/unit/test_tools.test.ts
npx ts-node tests/unit/test_commands.test.ts
```

---

## 🔧 Corrections Apportes (Session Actuelle)

| Fichier | Problème | Correction |
|---------|----------|------------|
| `gen_video.ts` | `duration` non envoyé | Ajouté `duration` dans URL params |
| `gen_video.ts` | `aspect_ratio` non envoyé | Converti en `width`/`height` |
| `gen_video.ts` | Pas de `seed` | Ajouté paramètre `seed` |
| `gen_music.ts` | `duration` non envoyé | Ajouté `duration` dans URL params |
| `gen_music.ts` | Pas de `seed` | Ajouté paramètre `seed` |
| Tests | Absents | Créé 55+ tests unitaires |

---

## 📊 Status Final

| Composant | Status |
|-----------|--------|
| FREE Tools (8) | ✅ Opérationnel |
| ENTER Tools (7) | ✅ Opérationnel |
| I2I Support | ✅ Implémenté |
| I2V Support | ✅ Implémenté |
| VEO Interpolation | ✅ Implémenté |
| Cost Tracking | ✅ Implémenté |
| Config Toggle | ✅ Implémenté |
| Tests Unitaires | ✅ Créé (55+) |
| Documentation | ⚠️ À mettre à jour |

---

*Dernière mise à jour: 2026-02-16*
