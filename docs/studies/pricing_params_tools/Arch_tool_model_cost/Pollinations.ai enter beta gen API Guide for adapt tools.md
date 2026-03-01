

### ASSISTANT
# Documentation API Pollinations.ai

Cette documentation synthétise les endpoints, paramètres et spécificités de l'API `gen.pollinations.ai`. Elle est structurée par type de génération (Texte, Image/Vidéo, Audio) et inclut les informations d'authentification et de gestion de compte.

---

## 1. Informations Générales

*   **Base URL :** `https://gen.pollinations.ai`
*   **Authentification :** Requise pour la plupart des endpoints de génération et de compte.
*   **Devise :** "Pollen" (consommé à chaque requête).

### Authentification
Deux méthodes sont supportées :
1.  **Header HTTP (Recommandé) :** `Authorization: Bearer VOTRE_CLE_API`
2.  **Paramètre de requête :** `?key=VOTRE_CLE_API`

**Types de clés :**
*   **Secret Keys (`sk_`) :** Usage serveur uniquement. Pas de limite de rate-limiting.
*   **Publishable Keys (`pk_`) :** Usage client (beta). Limité par IP (1 pollen/IP/heure). Ne pas exposer publiquement.

---

## 2. Découverte de Modèles
Avant de générer, il est recommandé de vérifier les modèles disponibles.

| Endpoint | Méthode | Description |
| :--- | :--- | :--- |
| `/v1/models` | `GET` | Liste des modèles de texte (compatible OpenAI). |
| `/image/models` | `GET` | Liste des modèles d'image et vidéo avec capacités. |
| `/text/models` | `GET` | Liste des modèles de texte avec métadonnées. |
| `/audio/models` | `GET` | Liste des modèles audio (TTS et Musique). |

---

## 3. Génération de Texte & Chat

### A. Texte Simple
Génération rapide sans historique de conversation.
*   **Endpoint :** `GET /text/{prompt}`
*   **Paramètre Path :** `prompt` (Le texte à générer).

### B. Chat Complet (OpenAI Compatible)
Supporte l'historique, la vision, les outils et le streaming.
*   **Endpoint :** `POST /v1/chat/completions`
*   **Body :** JSON (Format OpenAI).

### Paramètres Communs (Texte & Chat)

| Paramètre | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `model` | string | `openai` | Modèle à utiliser (ex: `openai`, `mistral`, `qwen-coder`). |
| `temperature` | number | `1` | Créativité (0.0 = strict, 2.0 = créatif). |
| `seed` | integer | `0` | Graine aléatoire (`-1` pour aléatoire). |
| `stream` | boolean | `false` | Activer le streaming de la réponse. |
| `max_tokens` | integer | - | Limite de tokens en sortie. |
| `system` | string | - | *Texte Simple uniquement.* Prompt système pour le contexte. |
| `json` | boolean | `false` | *Texte Simple uniquement.* Force une réponse JSON. |
| `messages` | array | - | *Chat uniquement.* Historique `[{"role": "user", "content": "..."}]`. |
| `modalities` | array | `["text"]` | *Chat uniquement.* Peut inclure `audio` pour réponse vocale. |

**Spécificités Chat :**
*   **Vision :** Supporte l'entrée image via `image_url` dans les messages.
*   **Outils :** Certains modèles (ex: `gemini`) supportent `code_execution` ou `google_search`.

---

## 4. Génération d'Image & Vidéo

Les images et vidéos partagent le même endpoint. Le comportement dépend du **modèle** sélectionné.
*   **Endpoint :** `GET /image/{prompt}`
*   **Paramètre Path :** `prompt` (Description textuelle).

### Paramètres de Génération (Image & Vidéo)

| Paramètre | Type | Défaut | Applicable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `model` | string | `flux` | Tous | **Image:** `flux`, `seedream`, `gptimage`... <br> **Vidéo:** `veo`, `seedance`,.... |
| `width` | integer | `1024` | Image | Largeur en pixels. |
| `height` | integer | `1024` | Image | Hauteur en pixels. |
| `seed` | integer | `0` | Tous | Graine pour reproductibilité (`-1` = aléatoire). |
| `enhance` | boolean | `false` | Tous | L'IA améliore le prompt automatiquement. |
| `negative_prompt`| string | - | Image | Éléments à éviter (ex: "blurry"). |
| `safe` | boolean | `false` | Tous | Active les filtres de contenu sûr. |
| `image` | string | - | Tous | URL image de référence (Img2Img ou Img2Vid). |
| `duration` | integer | - | Vidéo | Durée en secondes. (`veo`: 4-8s, `seedance`: 2-10s). |
| `aspectRatio` | string | - | Vidéo | `16:9` ou `9:16`. |
| `audio` | boolean | `false` | Vidéo | Générer de l'audio avec la vidéo (`veo` uniquement). |
| `quality` | string | `medium`| Image | `low`, `medium`, `high`, `hd` (modèles `gptimage`). |
| `transparent` | boolean | `false` | Image | Fond transparent (`gptimage` uniquement). |
| `prompt` | boolean | `false` | Tous | Fond transparent (`gptimage` uniquement). |

**Notes Vidéo :**
*   **Veo :** Pour l'interpolation vidéo (`veo`), le paramètre `image` peut accepter plusieurs URLs (début/fin).
*   **Veo :** 
*   **Seedance :** Text-to-Video et Image-to-Video.
*   
**Notes images :**
*   **gptimage :** seul modele acceptant les parametres quality et transparent.

---

## 5. Génération & Transcription Audio

### A. Synthèse Vocale (TTS) & Musique
Deux endpoints disponibles (GET simple et POST OpenAI compatible).
*   **Endpoints :** `GET /audio/{text}` ou `POST /v1/audio/speech`
*   **Paramètre Path (GET) :** `text` (Texte à lire ou description musique).

### Paramètres Audio (TTS & Musique)

| Paramètre | Type | Défaut | Applicable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `model` | string | `elevenlabs`| Tous | **TTS:** `elevenlabs`, `tts-1`... <br> **Musique:** `elevenmusic`. |
| `voice` | string | `alloy` | TTS | Voix (ex: `alloy`, `echo`, `rachel`, `onyx`...). |
| `response_format`| string | `mp3` | TTS | Format de sortie (`mp3`, `wav`, `opus`, `flac`...). |
| `speed` | number | `1` | TTS | Vitesse de lecture (0.25 à 4.0). |
| `duration` | integer | - | Musique | Durée en secondes (3 à 300). |
| `instrumental` | boolean | `false` | Musique | Force une sortie sans paroles. |

### B. Transcription Audio (Speech-to-Text)
Compatible API Whisper OpenAI.
*   **Endpoint :** `POST /v1/audio/transcriptions`
*   **Content-Type :** `multipart/form-data`

### Paramètres Transcription

| Paramètre | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `file` | binary | - | Fichier audio (mp3, wav, webm, mp4...). |
| `model` | string | `whisper-large-v3` | Modèle (`whisper-large-v3`, `whisper-1`, `scribe`). |
| `language` | string | - | Code ISO-639-1 (ex: `fr`, `en`) pour améliorer la précision. |
| `response_format`| string | `json` | Format de sortie (`json`, `text`, `srt`, `vtt`). |
| `prompt` | string | - | Texte optionnel pour guider le style ou la terminologie. |

---

## 6. Gestion de Compte

Ces endpoints nécessitent une clé API avec les permissions appropriées (`account:profile`, `account:balance`, etc.).

| Endpoint | Méthode | Description |
| :--- | :--- | :--- |
| `/account/profile` | `GET` | Infos utilisateur (nom, tier, dates). |
| `/account/balance` | `GET` | Solde restant en "Pollen". |
| `/account/usage` | `GET` | Historique des requêtes (supporte `?format=csv`). |
| `/account/usage/daily`| `GET` | Usage agrégé par jour (90 derniers jours). |
| `/account/key` | `GET` | Statut de la clé API (validité, permissions, budget). |

**Paramètres de requête pour `/account/usage` :**
*   `format` : `json` ou `csv`.
*   `limit` : Nombre d'enregistrements (1 à 50000).
*   `before` : Timestamp pour la pagination.

---

## 7. Codes d'Erreur Courants

*   **200 :** Succès.
*   **400 :** Erreur dans les données d'entrée (paramètres invalides).
*   **401 :** Authentification manquante ou invalide.
*   **402 :** Solde "Pollen" insuffisant.
*   **403 :** Permissions insuffisantes pour ce modèle ou cette ressource.
*   **500 :** Erreur interne du serveur.


# Documentation Technique API Pollinations.ai
## Architecture pour Création de Tools & Flows de Génération

---

## 📋 Table des Matières

1. [Vue d'Ensemble Architecture](#1-vue-densemble-architecture)
2. [Authentification & Gestion des Clés](#2-authentification--gestion-des-clés)
3. [Endpoint Chat Completions (Multi-Modal)](#3-endpoint-chat-completions-multi-modal)
4. [Endpoint Image & Vidéo](#4-endpoint-image--vidéo)
5. [Endpoint Audio (TTS & Musique)](#5-endpoint-audio-tts--musique)
6. [Endpoint Transcription](#6-endpoint-transcription)
7. [Matrice des Modèles & Spécifications](#7-matrice-des-modèles--spécifications)
8. [Patterns de Flow Recommandés](#8-patterns-de-flow-recommandés)

---

## 1. Vue d'Ensemble Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pollinations.ai Gateway                       │
│                    gen.pollinations.ai                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Texte   │  │  Image   │  │  Vidéo   │  │  Audio   │        │
│  │  /chat   │  │  /image  │  │  /image  │  │  /audio  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│         │            │            │            │                │
│         └────────────┴────────────┴────────────┘                │
│                          │                                      │
│                  ┌───────▼───────┐                              │
│                  │  Account API  │                              │
│                  │  /account/*   │                              │
│                  └───────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Base URL :** `https://gen.pollinations.ai`

---

## 2. Authentification & Gestion des Clés

### Types de Clés

| Type | Préfixe | Usage | Rate Limit | Sécurité |
|------|---------|-------|------------|----------|
| **Secret Key** | `sk_` | Serveur | Aucun | ⚠️ Jamais côté client |
| **Publishable Key** | `pk_` | Client | 1 pollen/IP/heure | ⚠️ Beta - Production non recommandée |

### Méthodes d'Authentification

```bash
# Méthode 1: Header (Recommandé)
Authorization: Bearer sk_xxxxxxxxxxxxx

# Méthode 2: Query Parameter
?key=sk_xxxxxxxxxxxxx
```

### Validation de Clé (Avant Flow)

```bash
GET /account/key
```

**Réponse:**
```json
{
  "valid": true,
  "type": "secret",
  "permissions": {
    "models": ["flux", "openai", "elevenlabs"],
    "account": ["profile", "balance", "usage"]
  },
  "pollenBudget": 1000,
  "rateLimitEnabled": false
}
```

---

## 3. Endpoint Chat Completions (Multi-Modal)

### 🎯 Endpoint Principal

```
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

### Body Request - Structure Complète

```json
{
  "model": "openai",
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant utile"
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Décris cette image"},
        {"type": "image_url", "image_url": {"url": "https://example.com/img.jpg"}}
      ]
    }
  ],
  "modalities": ["text", "audio"],
  "audio": {
    "voice": "alloy",
    "format": "mp3"
  },
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false,
  "tools": [],
  "tool_choice": "auto"
}
```

### Paramètres Détaillés

| Paramètre | Type | Défaut | Min | Max | Description |
|-----------|------|--------|-----|-----|-------------|
| `model` | string | `openai` | - | - | Modèle de langage |
| `messages` | array | - | 1 | - | Historique conversation |
| `modalities` | array | `["text"]` | - | - | `["text"]`, `["audio"]`, `["text", "audio"]` |
| `audio.voice` | string | `alloy` | - | - | Voix TTS (voir section Audio) |
| `audio.format` | string | `mp3` | - | - | `mp3`, `wav`, `opus`, `flac` |
| `temperature` | number | `1.0` | 0 | 2 | Créativité |
| `max_tokens` | integer | - | 1 | 9007199254740991 | Limite sortie |
| `stream` | boolean | `false` | - | - | Streaming SSE |
| `seed` | integer | `-1` | -1 | 2147483647 | Reproductibilité |
| `frequency_penalty` | number | `0` | -2 | 2 | Pénalité répétition |
| `presence_penalty` | number | `0` | -2 | 2 | Pénalité présence |
| `top_p` | number | `1` | 0 | 1 | Nucleus sampling |
| `stop` | array/string | `null` | - | - | Tokens d'arrêt |
| `tools` | array | `[]` | 0 | 128 | Fonctions disponibles |
| `tool_choice` | string | `auto` | - | - | `none`, `auto`, `required` |

### Réponse Chat Completions

```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1708362737,
  "model": "openai",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Réponse texte...",
        "audio": {
          "id": "audio-xxxxx",
          "transcript": "Transcription audio...",
          "data": "base64_encoded_audio_data",
          "expires_at": 1708449137
        },
        "content_blocks": [
          {"type": "text", "text": "..."},
          {"type": "image_url", "image_url": {"url": "https://..."}}
        ],
        "reasoning_content": "Chaîne de pensée (si activée)"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 100,
    "total_tokens": 150,
    "completion_tokens_details": {
      "audio_tokens": 0,
      "reasoning_tokens": 0
    }
  }
}
```

### Spécificités Modèles Chat

| Modèle | Vision | Audio Output | Tools | Code Exec | Search |
|--------|--------|--------------|-------|-----------|--------|
| `openai` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `gemini` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `gemini-large` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `gemini-search` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `mistral` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `qwen-coder` | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 4. Endpoint Image & Vidéo

### 🎯 Endpoint Unique

```
GET /image/{prompt}
Authorization: Bearer YOUR_API_KEY
```

### Paramètres Query - Image

| Paramètre | Type | Défaut | Min | Max | Modèles Concernés |
|-----------|------|--------|-----|-----|-------------------|
| `model` | string | `flux` | - | - | Tous |
| `width` | integer | `1024` | 64 | 2048 | Image uniquement |
| `height` | integer | `1024` | 64 | 2048 | Image uniquement |
| `seed` | integer | `0` | -1 | 2147483647 | Tous |
| `enhance` | boolean | `false` | - | - | Tous |
| `negative_prompt` | string | `"worst quality, blurry"` | - | - | Image |
| `safe` | boolean | `false` | - | - | Tous |
| `image` | string | `null` | - | - | Img2Img, Vid2Vid |
| `quality` | string | `medium` | - | - | `gptimage` uniquement |
| `transparent` | boolean | `false` | - | - | `gptimage` uniquement |

### Paramètres Query - Vidéo

| Paramètre | Type | Défaut | Min | Max | Modèles Concernés |
|-----------|------|--------|-----|-----|-------------------|
| `model` | string | `veo` | - | - | `veo`, `seedance` |
| `duration` | integer | `5` | Voir ci-dessous | Voir ci-dessous | Vidéo uniquement |
| `aspectRatio` | string | `16:9` | - | - | `16:9`, `9:16` |
| `audio` | boolean | `false` | - | - | `veo` uniquement |
| `image` | string | `null` | 1-2 URLs | - | Interpolation |

### ⚠️ Spécifications Vidéo Précises

#### Modèle VEO

| Paramètre | Valeurs Acceptées | Détails |
|-----------|-------------------|---------|
| `duration` | `4`, `6`, `8` | Secondes exactes uniquement |
| `aspectRatio` | `16:9`, `9:16` | Paysage ou Portrait |
| `audio` | `true`, `false` | Génération audio synchronisée |
| `image` (interpolation) | 1 ou 2 URLs | `image[0]` = frame début, `image[1]` = frame fin |
| `image` (single) | 1 URL | Image-to-Video (première frame) |

**Exemple Interpolation VEO:**
```bash
GET /image/a%20smooth%20transition?model=veo&duration=6&aspectRatio=16:9&image=https://start.jpg|https://end.jpg&audio=true
```

#### Modèle SEEDANCE

| Paramètre | Valeurs Acceptées | Détails |
|-----------|-------------------|---------|
| `duration` | `2` à `10` | Secondes (incrément 1) |
| `aspectRatio` | `16:9`, `9:16` | Paysage ou Portrait |
| `image` | 1 ou 2 URLs | Text-to-Video ou Image-to-Video |
| `audio` | Non supporté | - |

**Exemple Seedance:**
```bash
GET /image/dancing%20character?model=seedance&duration=5&aspectRatio=9:16&image=https://reference.jpg
```

### Modèles Image Disponibles

| Modèle | Type | Résolution Max | Transparent | Quality Param | Temps Moyen |
|--------|------|----------------|-------------|---------------|-------------|
| `flux` | Image | 2048x2048 | ❌ | ❌ | 5-10s |
| `flux-turbo` | Image | 1024x1024 | ❌ | ❌ | 2-5s |
| `gptimage` | Image | 2048x2048 | ✅ | ✅ | 10-15s |
| `kontext` | Image | 1024x1024 | ❌ | ❌ | 5-10s |
| `seedream` | Image | 2048x2048 | ❌ | ❌ | 8-12s |
| `seedream-pro` | Image | 4096x4096 | ❌ | ✅ | 15-20s |
| `nanobanana` | Image | 1024x1024 | ❌ | ❌ | 3-7s |
| `nanobanana-pro` | Image | 2048x2048 | ❌ | ❌ | 8-12s |
| `veo` | Vidéo | 1080p | ❌ | ❌ | 30-60s |
| `seedance` | Vidéo | 1080p | ❌ | ❌ | 20-45s |

---

## 5. Endpoint Audio (TTS & Musique)

### 🎯 Endpoints Disponibles

```
GET  /audio/{text}
POST /v1/audio/speech  (OpenAI Compatible)
```

### Paramètres TTS (Text-to-Speech)

| Paramètre | Type | Défaut | Min | Max | Description |
|-----------|------|--------|-----|-----|-------------|
| `model` | string | `elevenlabs` | - | - | `elevenlabs`, `tts-1`, `tts-1-hd` |
| `voice` | string | `alloy` | - | - | Voir liste voix ci-dessous |
| `response_format` | string | `mp3` | - | - | `mp3`, `wav`, `opus`, `flac`, `aac`, `pcm` |
| `speed` | number | `1.0` | 0.25 | 4.0 | Vitesse de lecture |
| `input` | string | - | 1 | 4096 | Texte max 4096 caractères |

### Voix Disponibles

```
alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse,
rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda,
adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum,
liam, george, brian, bill
```

### Paramètres Musique (ElevenMusic)

| Paramètre | Type | Défaut | Min | Max | Description |
|-----------|------|--------|-----|-----|-------------|
| `model` | string | `elevenmusic` | - | - | `elevenmusic` ou `music` |
| `duration` | integer | `30` | 3 | 300 | Durée en secondes |
| `instrumental` | boolean | `false` | - | - | Sans paroles |
| `input` | string | - | 1 | - | Description du style musical |

### Exemple Request TTS

```bash
POST /v1/audio/speech
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "elevenlabs",
  "input": "Bonjour, bienvenue sur notre plateforme",
  "voice": "rachel",
  "response_format": "mp3",
  "speed": 1.0
}
```

### Exemple Request Musique

```bash
POST /v1/audio/speech
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "elevenmusic",
  "input": "Ambient electronic music with piano and soft drums",
  "duration": 60,
  "instrumental": true,
  "response_format": "mp3"
}
```

---

## 6. Endpoint Transcription

### 🎯 Endpoint

```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY
```

### Paramètres

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `file` | binary | - | Fichier audio (requis) |
| `model` | string | `whisper-large-v3` | `whisper-large-v3`, `whisper-1`, `scribe` |
| `language` | string | `auto` | Code ISO-639-1 (`fr`, `en`, `es`...) |
| `response_format` | string | `json` | `json`, `text`, `srt`, `vtt`, `verbose_json` |
| `prompt` | string | `null` | Guide de style/terminologie |
| `temperature` | number | `0` | 0 à 1 (déterministe à créatif) |

### Formats Audio Supportés

```
mp3, mp4, mpeg, mpga, m4a, wav, webm
```

### Exemple Request

```bash
curl -X POST https://gen.pollinations.ai/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@recording.mp3" \
  -F "model=whisper-large-v3" \
  -F "language=fr" \
  -F "response_format=json"
```

---

## 7. Matrice des Modèles & Spécifications

### Résumé par Type de Génération

| Type | Endpoint | Modèles Principaux | Auth Requise | Streaming |
|------|----------|-------------------|--------------|-----------|
| Texte Simple | `GET /text/{prompt}` | `openai`, `mistral`, `qwen-coder` | ✅ | ✅ |
| Chat | `POST /v1/chat/completions` | `openai`, `gemini`, `mistral` | ✅ | ✅ |
| Image | `GET /image/{prompt}` | `flux`, `gptimage`, `seedream` | ✅ | ❌ |
| Vidéo | `GET /image/{prompt}` | `veo`, `seedance` | ✅ | ❌ |
| Audio TTS | `POST /v1/audio/speech` | `elevenlabs`, `tts-1` | ✅ | ❌ |
| Audio Musique | `POST /v1/audio/speech` | `elevenmusic` | ✅ | ❌ |
| Transcription | `POST /v1/audio/transcriptions` | `whisper-large-v3`, `scribe` | ✅ | ❌ |

### Coûts & Limites (Pollen)

| Type | Unité | Coût Estimé | Limite/Requête |
|------|-------|-------------|----------------|
| Texte | 1000 tokens | ~1 pollen | 128K tokens |
| Image | 1 génération | ~5-20 pollen | 2048x2048 max |
| Vidéo | 1 seconde | ~10-50 pollen | 10s max |
| Audio TTS | 1000 caractères | ~2-5 pollen | 4096 chars |
| Audio Musique | 1 seconde | ~5-15 pollen | 300s max |
| Transcription | 1 minute audio | ~3-10 pollen | 25MB max |

---

## 8. Patterns de Flow Recommandés

### Flow 1: Chat avec Réponse Audio

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Utilisateur│ ──► │ /v1/chat/completions│ ──► │   Texte     │
│   (Texte)    │     │ modalities: audio │     │   + Audio   │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                    audio.data (base64)
                           │
                           ▼
                    Player Audio UI
```

**Request:**
```json
{
  "model": "openai",
  "messages": [{"role": "user", "content": "Explique ce concept"}],
  "modalities": ["text", "audio"],
  "audio": {"voice": "alloy", "format": "mp3"}
}
```

### Flow 2: Interpolation Vidéo (VEO)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Image A    │ ──► │  Image B    │ ──► │ /image/{prompt}  │ ──► │   Vidéo     │
│  (Start)    │     │  (End)      │     │ model=veo        │     │  4-8s       │
└─────────────┘     └─────────────┘     │ image=A|B        │     └─────────────┘
                                        │ duration=6       │
                                        │ aspectRatio=16:9 │
                                        │ audio=true       │
                                        └──────────────────┘
```

**Request:**
```bash
GET /image/smooth%20morphing%20transition?model=veo&duration=6&aspectRatio=16:9&image=https://start.jpg|https://end.jpg&audio=true
```

### Flow 3: Génération Multi-Modale Complète

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Flow Complet                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. /v1/chat/completions  →  Script & Prompt Image                 │
│  2. /image/{prompt}       →  Génération Image (flux)               │
│  3. /image/{prompt}       →  Génération Vidéo (veo, interpolation) │
│  4. /v1/audio/speech      →  Narration Audio (elevenlabs)          │
│  5. /v1/audio/speech      →  Musique Fond (elevenmusic)            │
│  6. Assemblage externe    →  Vidéo finale avec audio               │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 4: Transcription + Résumé Chat

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Fichier    │ ──► │ /v1/audio/           │ ──► │  Texte           │
│  Audio      │     │ transcriptions       │     │  Transcrit       │
└─────────────┘     └──────────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │ /v1/chat/        │
                                                 │ completions      │
                                                 │ (résumé)         │
                                                 └──────────────────┘
```

---

## 9. Gestion d'Erreurs & Retry 

**à verifier dans la doc et dans le code mis a jour depuis et à améliorer eventuellement**

### Codes HTTP & Actions

| Code | Signification | Action Recommandée |
|------|---------------|-------------------|
| 200 | Succès | Traiter la réponse |
| 400 | Bad Request | Vérifier paramètres, retry avec correction |
| 401 | Unauthorized | Vérifier clé API |
| 402 | Payment Required | Vérifier solde pollen |
| 403 | Forbidden | Vérifier permissions modèle |
| 429 | Rate Limited | Attendre + exponential backoff |
| 500 | Server Error | Retry avec backoff (3x max) |

### Pattern Retry Recommandé

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status >= 500 && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

---

## 10. Checklist Pré-Production

- [ ] Clé API `sk_` générée et sécurisée (variables d'environnement)
- [ ] Endpoint `/account/key` testé pour validation
- [ ] Endpoint `/account/balance` monitoré avant gros flows
- [ ] Timeouts configurés (vidéo: 10mn, image: 10mn, texte: 10mn)
- [ ] Gestion erreurs 402 (solde insuffisant) implémentée
- [ ] Retry logic pour erreurs 5xx
- [ ] Logging des requêtes pour `/account/usage`
- [ ] Validation des URLs images avant interpolation vidéo
- [ ] Tests de durée vidéo selon modèle (veo: 4/6/8s, seedance: 2-10s)

---

## 11. Références Rapides

### URLs Clés

| Service | URL |
|---------|-----|
| Dashboard | https://enter.pollinations.ai |
| API Gateway | https://gen.pollinations.ai |
| Docs OpenAPI | https://gen.pollinations.ai/openapi.json |

### Endpoints Découverte

```bash
# Modèles disponibles
GET /v1/models        # Texte
GET /image/models     # Image/Vidéo
GET /text/models      # Texte détaillé
GET /audio/models     # Audio

# Compte et indications pour calcul des couts
GET /account/profile
GET /account/balance >>> real time
GET /account/usage?format=json&limit=100   >>> real time mais limite de 100 résultats
GET /account/usage/daily?format=json      >>> Latence importante de mise à jour entre 10 à 30 mminutes
GET /account/key
```

---



**IMPORTANT: Les listes de modeles cités et d'énumérations de paramètres sont à titre indicatif. Il faut toujours utiliser les endpoints de découverte pour obtenir les listes les plus récentes.**

* Liens officilels et documentations Pollinations.ai
-lien vers la doc: https://enter.pollinations.ai/api/doc
-lien vers le dashboard: https://enter.pollinations.ai
-lien vers le playground: https://gen.pollinations.ai/playground
-lien vers le monitoring des modeles: https://model-monitor.pollinations.ai/

* Repositories Clonné localement pour études, compréhension et reverse engineering:
- https://github.com/pollinations/pollinations >>> /mnt/windows/App_Wubuntu/_Repo_Clonned/pollinations/

*Document version: 1.0 | Dernière mise à jour: 21/02/2026*
