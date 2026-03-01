# 📡 Stratégie de Fetch — Modèles Pollinations - NE CONCERNE QUE LES TOOLS

> Document de référence pour `fetchAllModelsTools()`.  
> Raisonnement par **type de transformation**, pas par endpoint.

---

## 1. Endpoints → à fetcher

| Endpoint | Contenu |
|---|---|
| `GET /text/models` | Tous les modèles text/chat avec métadonnées complètes |
| `GET /models/image` | Tous les modèles image ET vidéo avec métadonnées complètes |
| `GET /models/audio` | Tous les modèles TTS ET musique avec métadonnées complètes |
| *(pas de fetch)* | `transcribe_audio` — endpoint fixe whisper |

---

## 2. Clés de détermination — par type de transformation

### `/text/models`

| Transformation | Clé(s) de détermination | Tool cible |
|---|---|---|
| **sts,tts,stt** (speech-to-speech,texte-to-speech,speech-to-texte) | `input_modalities` `output_modalities` <><> `"audio" "text"` | `gen_audio` |
| **rapid_search** | grounding **Google Search** natif (description contient "Google Search") | `polli_web_search` |
| **medium_search** | grounding web natif (description contient "Web Search") ET `reasoning` absent/false | `polli_web_search` |
| **deep_search** | grounding web natif (description contient "Web Search") ET `reasoning === true` | `polli_web_search` |

***NOUVEAU TOOL FUSION de scrp_search et deepsearch en polli_web_search

---

### `/models/image`

| Transformation | Clé(s) de détermination | Tool cible |
|---|---|---|
| **t2i** (text-to-image) | `input_modalities` ET `output_modalities` ("text","image") | `gen_image` |
| **i2i** (image-to-image) |`input_modalities` ET `output_modalities` ("text"+"imag","image")  | `gen_image` (mode référence) |
| **t2v** (text-to-video) | `input_modalities` ET `output_modalities` ("text","video")  | `gen_video` |
| **i2v** (image-to-video) | `input_modalities` ET `output_modalities` ("text"+"image","video")  | `gen_video` (mode référence) |

> La même clé `duration` distingue image vs vidéo.  
> La présence du param `image` distingue t2x vs i2x au sein de chaque catégorie.

---

### `/models/audio`

| Transformation | Clé(s) de détermination | Tool cible |
|---|---|---|
| **tts** (text-to-speech) | param `instrumental` absent | `gen_audio` |
| **t2music** (text-to-music) | param `instrumental` présent | `gen_music` |

---

### Endpoint fixe (pas de fetch)

| Transformation | Endpoint | Tool cible |
|---|---|---|
| **stt** (speech-to-text) | `POST /v1/audio/transcriptions` — modèle whisper fixe | `transcribe_audio` |

---

## 3. Vue d'ensemble — 8 types de transformation couverts

| # | Type | Tool | Endpoint de génération |
|---|---|---|---|
| 1 | **t2i** | `gen_image` | `GET /image/{prompt}` |
| 2 | **i2i** | `gen_image` | `GET /image/{prompt}?image=...` |
| 3 | **t2v** | `gen_video` | `GET /image/{prompt}` (modèle vidéo) |
| 4 | **i2v** | `gen_video` | `GET /image/{prompt}?image=...` (modèle vidéo) |
| 5 | **tts** | `gen_audio` | `GET /audio/{text}` ou `POST /v1/audio/speech` |
| 6 | **sts** | `gen_audio` | `POST /v1/chat/completions` (openai-audio) |
| 7 | **stt** | `transcribe_audio` | `POST /v1/audio/transcriptions` |
| 8 | **websearch** | `polli_web_search` (rapid / medium / deep) | `POST /v1/chat/completions` | nb: à differentié des agents 

---

## 4. Champs récupérables dynamiquement sur les endpoints pour calcul dans les registres pour classification dans les Tools / LLM 

| Champ | Usage |
|---|---|
| `name` | Valeur de l'enum `model` |
| `aliases` | Alias acceptés |
| `description` | Label human-readable |
| `pricing` | Cost Guard |
| `input_modalities` | Valider ce que l'IA envoie |
| `output_modalities` | Déterminer le type de réponse |
| `tools` | Supporte les function calls ? |
| `reasoning` | Activer `reasoning_effort` |
| `paid_only` | PAYTOOL guard |
| `voices` | Enum `voice` pour gen_audio sts |
| `context_window` | Info pour le LLM |

---

## 6. Notes
- Tous les modeles sont récupérés en fonctions des tools par rapport à leur capacités y compris audio , et recherchee web dans les endpoint texte
- L'API change souvent — tout est dynamique, rien n'est hardcodé.
- **Registre 2** enrichit avec les params empiriques (enums précis de durées, tailles validées…) via le Tool Adaptatif type Skill à créer.
- Nouveau modèle non catégorisable → mode beta, lancer le Tool Adaptatif.


GUIDE:

# Documentation API Pollinations.ai

Cette documentation synthétise les endpoints, paramètres et spécificités de l'API gen.pollinations.ai.

---

## 1. Informations Générales

Base URL :

```
https://gen.pollinations.ai
```

Devise :

- "Pollen" (consommé à chaque requête)

### Authentification

Deux méthodes sont supportées :

Header HTTP (recommandé) :

```
Authorization: Bearer VOTRE_CLE_API
```

Paramètre de requête :

```
?key=VOTRE_CLE_API
```

### Types de clés

Secret Keys (sk_) :

- Usage serveur uniquement
- Pas de limite de rate-limiting

Publishable Keys (pk_) :

- Usage client (beta)
- Limité par IP (1 pollen/IP/heure)
- Ne pas exposer publiquement

---

## 2. Découverte de Modèles

| Endpoint | Méthode | Description |
|---|---|---|
| /v1/models | GET | Liste des modèles de texte (compatible OpenAI) |
| /image/models | GET | Liste des modèles image et vidéo |
| /text/models | GET | Liste des modèles texte avec métadonnées |
| /audio/models | GET | Liste des modèles audio |

---

## 3. Génération de Texte & Chat

### A. Texte Simple

Endpoint :

```
GET /text/{prompt}
```

Paramètre Path :

- prompt : texte à générer

### B. Chat Complet (OpenAI Compatible)

Endpoint :

```
POST /v1/chat/completions
```

Body : JSON (format OpenAI)

### Paramètres Communs

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| model | string | openai | Modèle à utiliser |
| temperature | number | 1 | Créativité |
| seed | integer | 0 | Graine aléatoire |
| stream | boolean | false | Activer streaming |
| max_tokens | integer | - | Limite tokens |
| system | string | - | Texte simple uniquement |
| json | boolean | false | Force réponse JSON |
| messages | array | - | Historique chat |
| modalities | array | ["text"] | Peut inclure audio |

### Spécificités Chat

Vision :

- image_url dans messages

Outils :

- code_execution
- google_search

---

## 4. Génération Image & Vidéo

Endpoint :

```
GET /image/{prompt}
```

| Paramètre | Type | Défaut | Applicable | Description |
|---|---|---|---|---|
| model | string | flux | Tous | Image: flux, turbo, gptimage / Vidéo: veo, seedance |
| width | integer | 1024 | Image | Largeur |
| height | integer | 1024 | Image | Hauteur |
| seed | integer | 0 | Tous | Graine |
| enhance | boolean | false | Tous | Améliore prompt |
| negative_prompt | string | - | Image | Éléments à éviter |
| safe | boolean | false | Tous | Filtre contenu |
| image | string | - | Tous | URL image référence |
| duration | integer | - | Vidéo | Durée secondes |
| aspectRatio | string | - | Vidéo | 16:9 ou 9:16 |
| audio | boolean | false | Vidéo | Audio (veo uniquement) |
| quality | string | medium | Image | low, medium, high, hd |
| transparent | boolean | false | Image | Fond transparent |

### Notes Vidéo

Veo :

- Text-to-Video uniquement

Seedance :

- Text-to-Video et Image-to-Video

Interpolation vidéo :

- image peut accepter plusieurs URLs

---

## 5. Génération & Transcription Audio

### A. Synthèse Vocale (TTS) & Musique

Endpoints :

```
GET /audio/{text}
POST /v1/audio/speech
```

| Paramètre | Type | Défaut | Applicable | Description |
|---|---|---|---|---|
| model | string | elevenlabs | Tous | TTS ou musique |
| voice | string | alloy | TTS | Voix |
| response_format | string | mp3 | TTS | Format sortie |
| speed | number | 1 | TTS | Vitesse lecture |
| duration | integer | - | Musique | Durée secondes |
| instrumental | boolean | false | Musique | Sans paroles |

### B. Transcription Audio

Endpoint :

```
POST /v1/audio/transcriptions
```

Content-Type :

```
multipart/form-data
```

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| file | binary | - | Fichier audio |
| model | string | whisper-large-v3 | Modèle transcription |
| language | string | - | Code ISO-639-1 |
| response_format | string | json | Format sortie |
| prompt | string | - | Guide terminologie |

---

## 6. Gestion de Compte

| Endpoint | Méthode | Description |
|---|---|---|
| /account/profile | GET | Infos utilisateur |
| /account/balance | GET | Solde pollen |
| /account/usage | GET | Historique requêtes |
| /account/usage/daily | GET | Usage journalier |
| /account/key | GET | Statut clé API |

Paramètres /account/usage :

- format : json ou csv
- limit : 1 à 50000
- before : timestamp pagination

---

## 7. Codes d'Erreur

| Code | Description |
|---|---|
| 200 | Succès |
| 400 | Paramètres invalides |
| 401 | Authentification invalide |
| 402 | Solde pollen insuffisant |
| 403 | Permissions insuffisantes |
| 500 | Erreur serveur |
