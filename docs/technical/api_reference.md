# Pollinations API — Dev Reference (V6 Plugin)

> Référence technique vérifiée par tests réels — 2026-02-12
> 18/18 endpoints testés et validés.

---

## Endpoints

| Endpoint | Rôle | Auth |
|----------|------|------|
| `image.pollinations.ai` | Free image gen (fallback) | ❌ | ***>>> ABANDONNE <<<***
| `gen.pollinations.ai` | Paid generation (image/video/audio) | ✅ Bearer |
| `text.pollinations.ai` | Free text/tools (déjà intégré) / Fallback Free universe > Deprecated mais maintenu | ❌ |
| `enter.pollinations.ai` | Plateforme gestion crédits/clés (pas de gen) | — |

### Model Discovery (dynamique — ne PAS hardcoder)

```
FREE
GET text.pollinations.ai/models        → modèles texte détaillés free universe
GET image.pollinations.ai/models       → modèles image FREE > Down on ne s'en sert plus et ne doit plus s'en servir

ENTER
GET gen.pollinations.ai/image/models   → modèles image/video PAID et freetiers>paid
GET gen.pollinations.ai/audio/models   → modèles audio PAID et freetiers>paid
POST gen.pollinations.ai/v1/chat/completions  → gen audio/speech PAID et freetiers>paid

```

Les tools fetch ces endpoints au runtime. Les params communs sont appliqués par défaut, les params spécifiques sont mappés selon le modèle.

---

## Paramètres communs (tous modèles image/video)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | int | 1024 | Largeur px (max ~8000) |
| `height` | int | 1024 | Hauteur px (max ~8000) |
| `seed` | int | 0 | Seed (-1 = random) |
| `enhance` | bool | false | AI prompt enhancement |
| `safe` | bool | false | Safety filter |
| `negative_prompt` | string | — | Negative prompt |

---

## Image Models (résultats des paramettres cachés obtenus par reverse du playground)

### Free (image.pollinations.ai) — Fallback gen_image no auth nologo=true ***>>> ABANDONNE <<<***

| Priorité | Model | Notes |***>>> ABANDONNE <<<***
|----------|-------|-------|
| 🥇 Défaut | `sana` | Compressed mais fiable |
| 🥈 2e | `zimage` | Alias low qual |
| 🥉 3e | `turbo` | ⚠️ EN PANNE — affiche notice au lieu de générer |

> `gen_image` = seul tool exposé en free à été abandonné ***>>> ABANDONNE <<<***

### Paid (gen.pollinations.ai)

| Model | Backend | Prix | T2I | I2I | Params spécifiques |
|-------|---------|------|-----|-----|--------------------|
| `flux` | Flux Schnell | 0.0002 | ✅ | ❌ | `width`, `height` |
| `zimage` | Z-Image Turbo 6B | 0.0002 | ✅ | ❌ | `width`, `height` |
| `imagen-4` | Imagen 4 (Google) | 0.0025 | ✅ | ❌ | `width`, `height` |
| `klein` | FLUX.2 Klein 4B | 0.008 | ✅ | ✅ | `image` (URL) |
| `klein-large` | FLUX.2 Klein 9B | 0.012 | ✅ | ✅ | `image` (URL) |
| `gptimage` | GPT Image 1 Mini | Tokens | ✅ | ❌ | `quality` (low/med/high), `transparent` (bool) |
| `gptimage-large` | GPT Image 1.5 | Tokens | ✅ | ❌ | `quality` (low/med/high), `transparent` (bool) |
| `kontext` | FLUX.1 Kontext | 0.04 | ✅ | ✅ | `image` (URL) — In-Context Editing |
| `seedream` | Seedream 4.0 (ByteDance) | 0.03 | ✅ | ✅ | `image` (URL) |
| `seedream-pro` | Seedream 4.5 Pro 4K | 0.04 | ✅ | ✅ | `image` (URL) — Multi-Image |
| `nanobanana` | Gemini 2.5 Flash | Tokens | ✅ | ✅ | `image` (URL) |
| `nanobanana-pro` | Gemini 3 Pro | Tokens | ✅ | ✅ | `image` (URL) — Thinking Model |

**I2I** : passer `&image=<URL_image_source>` en query param.

---

## Video Models

| Model | Backend | Prix | T2V | I2V | Audio | Duration | AspectRatio |
|-------|---------|------|-----|-----|-------|----------|-------------|
| `grok-video` | Grok Video | 0.0025 | ✅ | ❌ | ✅ (présent) | 1-15s | 16:9, 9:16, 1:1, 4:3 |
| `ltx-2` | LTX-2 (Lightricks) | 0.01 | ✅ | ❌ | ✅ | 5-20s | 16:9 |
| `wan` | Wan 2.6 (Alibaba) | 0.025 | ❌ | ✅ | ✅ (native) | 5-15s | 16:9, 9:16, 1:1, 4:3 |
| `veo` | Veo 3.1 Fast (Google) | 0.15 | ✅ | ✅ (interp) | ✅ | 4/6/8s | 16:9, 9:16, 1:1 |
| `seedance` | Seedance Lite (BytePlus) | Tokens | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 |
| `seedance-pro` | Seedance Pro-Fast | Tokens | ✅ | ✅ | ❌ | 4-12s | 16:9, 9:16, 1:1 |

### Règles critiques (vérifiées par tests)

- **Wan = I2V ONLY** — T2V retourne 400 "requires image"
- **Seedance** — Pas de 21:9 (seulement 16:9, 9:16, 1:1)
- **Veo Interpolation** — Images comma-separated dans un seul `&image=url1,url2`
- **LTX-2** — 520 intermittent côté serveur, retry OK

### Cost Headers

| Header | Models | Value |
|--------|--------|-------|
| `x-usage-completion-video-seconds` | grok, ltx-2, veo | Duration float |
| `x-usage-completion-video-tokens` | seedance | Token count |
| `x-usage-completion-image-tokens` | Image models | Token count |
| `x-model-used` | All | Nom confirmé |
| `x-request-id` | All | UUID debug |

---

## Audio — Tool par défaut : openai-audio

`openai-audio` = **défaut pour tous les tools audio** (TTS 🔊 + STT 🎙️). Le moins cher.
Les autres modèles sont à spécifier explicitement en paramètre.

| Model | Backend | Type | Endpoint |
|-------|---------|------|----------|
| `openai-audio` | GPT-4o Audio | **TTS + STT** | `gen.pollinations.ai/v1/chat/completions` |
| `elevenlabs` | ElevenLabs v3 | TTS | `gen.pollinations.ai/audio/{text}` |
| `whisper` | Whisper v3 | STT | `/v1/audio/transcriptions` (POST multipart) |

### OpenAI Audio — Appel correct

```js
// POST https://gen.pollinations.ai/v1/chat/completions
// Authorization: Bearer <API_KEY>
const payload = {
  model: "openai-audio",
  modalities: ["text", "audio"],
  audio: { voice: "alloy", format: "mp3" },
  messages: [{ role: "user", content: "Hello" }]
};
// Response: choices[0].message.audio.data (base64)
```

> ⚠️ `text.pollinations.ai` → 404 pour paid. `enter.pollinations.ai` → 405. **Seul `gen.pollinations.ai` fonctionne pour audio.**

---

## Music — Tool séparé (gen_music)

| Model | Backend | Endpoint | Params |
|-------|---------|----------|--------|
| `elevenmusic` | ElevenLabs Music | `gen.pollinations.ai/audio/{text}` | `duration` (3-300s), `instrumental` (bool) |

---

## Text Models (gen.pollinations.ai/models)

### Free (anonymous tier)

| Model | Backend | Vision | Tools | Reasoning | Notes |
|-------|---------|--------|-------|-----------|-------|
| `gemini` | Gemini 2.5 Flash Lite | ✅ | ✅ | ❌ | Défaut free |
| `mistral` | Mistral Small 3.2 24B | ❌ | ✅ | ❌ | — |
| `openai-fast` | GPT-OSS 20B (OVH) | ❌ | ✅ | ✅ | — |

### Paid (wallet)

| Model | Backend | Prix (prompt/completion) | Vision | Tools | Reasoning | Notes |
|-------|---------|--------------------------|--------|-------|-----------|-------|
| `claude-fast` | Claude Haiku 4.5 | 1e-6 / 5e-6 | ✅ | ✅ | ❌ | Fast & intelligent |
| `claude` | Claude Sonnet 4.5 | 3e-6 / 1.5e-5 | ✅ | ✅ | ❌ | **paid_only** |
| `claude-large` | Claude Opus 4.6 | 5e-6 / 2.5e-5 | ✅ | ✅ | ❌ | **paid_only** |
| `gemini-large` | Gemini 3 Pro | 2e-6 / 1.2e-5 | ✅ 🎥🔊 | ✅ | ✅ | **paid_only** — 1M ctx, audio+video input |
| `kimi` | Kimi K2.5 (Moonshot) | 6e-7 / 3e-6 | ✅ | ✅ | ✅ | 256K ctx, agentic |
| `glm` | GLM-4.7 (Z.ai) | 6e-7 / 2.2e-6 | ❌ | ✅ | ✅ | 198K ctx, coding |
| `minimax` | MiniMax M2.1 | 3e-7 / 1.2e-6 | ❌ | ✅ | ✅ | 200K ctx |
| `nova-fast` | Amazon Nova Micro | 3.5e-8 / 1.4e-7 | ❌ | ✅ | ❌ | **Ultra cheap** |

### 🔍 Search & Web Research (pour tools deepsearch / search_crawl_scrape)

| Model | Backend | Prix | Capabilities | Aliases | Notes |
|-------|---------|------|-------------|---------|-------|
| `perplexity-fast` | Perplexity Sonar | 1e-6 / 1e-6 | **Web Search** | `sonar` | Rapide, abordable |
| `perplexity-reasoning` | Sonar Reasoning Pro | 2e-6 / 8e-6 | **Deep Web Search + Reasoning** | `sonar-reasoning`, `sonar-reasoning-pro` | Pour recherches complexes |
| `nomnom` | NomNom (Gemini Scrape) | pollen | **Search + Scrape + Crawl** | `gemini-scrape`, `web-research` | Alpha — Web Research complet |

### Modèles spécialisés (community)

| Model | Backend | Notes |
|-------|---------|-------|
| `bidara` | BIDARA (NASA) | Biomimetic Design — Vision |
| `chickytutor` | ChickyTutor | Language Tutor |
| `midijourney` | MIDIjourney | Music Composition |
| `qwen-character` | Qwen Character | Roleplay (ultra cheap) |

---

## Architecture Tools V6

```
gen_image      → Free: sana/zimage (image.pollinations.ai) — seul tool en mode free/alwaysfree
               → Paid: flux/klein/kontext/seedream/nanobanana... (gen.pollinations.ai)
               → I2I: +image param sur modèles compatibles
               → Fallback: paid → free auto

gen_video      → T2V: grok-video, veo, seedance, ltx-2
               → I2V: wan, veo (interp), seedance
               → Params: duration, aspectRatio, audio

gen_audio      → Défaut: openai-audio (TTS+STT) — le moins cher
               → Option: elevenlabs (TTS), whisper (STT)

gen_music      → elevenmusic (tool dédié)

deepsearch     → Défaut: perplexity-fast (sonar — web search rapide)
               → Option: perplexity-reasoning (deep search + raisonnement)
               → Endpoint: gen.pollinations.ai/v1/chat/completions

search_crawl_scrape → nomnom (gemini-scrape / web-research)
                    → Search + Scrape + Crawl en un seul appel
                    → Endpoint: gen.pollinations.ai/v1/chat/completions
```
