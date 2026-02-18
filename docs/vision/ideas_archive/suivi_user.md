🔬 API Discovery Report — 2026-02-12 (FULL REFERENCE)
🟢 Free API — Live Inventory
Image Models (image.pollinations.ai/models) — 3 total
Pollinations Name	Behavior on 2048x2048	File Size	Notes
turbo	Respects Resolution	~4.1 MB	High quality, full size
sana	Compressed/Capped	~60 KB	Likely resized or heavy compression
zimage	Compressed/Capped	~35 KB	Aliased to sana/turbo low qual?
WARNING

flux removed from free! turbo is the best choice for high-res free generation.

🔵 Enter API — Detailed Parameter Reference
📋 Global Parameters (All Image/Video Models)
Parameter	Type	Default	Description
width	integer	1024	Width in pixels (max ~8000)
height	integer	1024	Height in pixels (max ~8000)
seed	integer	0	Random seed (-1 for random)
enhance	boolean	false	AI prompt enhancement
safe	boolean	false	Safety content filter
negative_prompt	string	"worst..."	Negative prompt
🖼️ Image Models — Capabilities (Source: gen.pollinations.ai/image/models)
Pollinations Name	Real/Backend Model (API Desc)	Pricing (Pollen)	T2I	I2I	Dimensions	Specific Parameters	Notes
flux	Flux Schnell	0.0002	✅	❌	width, height	—	Fast high-quality
zimage	Z-Image Turbo (6B Flux 2x)	0.0002	✅	❌	width, height	—	Fast with upscaling
imagen-4	Imagen 4 (alpha)	0.0025	✅	❌	width, height	—	High fidelity
klein	FLUX.2 Klein 4B	0.008	✅	✅	width, height	image (URL)	Fast, Modal-hosted
klein-large	FLUX.2 Klein 9B	0.012	✅	✅	width, height	image (URL)	Higher quality
gptimage	GPT Image 1 Mini (OpenAI)	Tokens	✅	❌	width, height	quality, transparent	DALL-E 3 equivalent
gptimage-large	GPT Image 1.5 (Advanced)	Tokens	✅	❌	width, height	quality, transparent	—
kontext	FLUX.1 Kontext	0.04	✅	✅	width, height	image (URL)	In-Context Editing
seedream	Seedream 4.0 (ByteDance ARK)	0.03	✅	✅	width, height	image (URL)	Better Quality
seedream-pro	Seedream 4.5 Pro (ARK 4K)	0.04	✅	✅	width, height	image (URL)	4K, Multi-Image
nanobanana	NanoBanana (Gemini 2.5 Flash)	Tokens	✅	✅	width, height	image (URL)	Gemini 2.5 Flash
nanobanana-pro	NanoBanana Pro (Gemini 3 Pro)	Tokens	✅	✅	width, height	image (URL)	Thinking Model
🎥 Video Models — Capabilities & Limits
Pollinations Name	Real/Backend Model (API Desc)	Pricing	T2V	I2V (Image)	Audio	Duration	Aspect Ratios
grok-video	Grok Video (alpha)	0.0025	✅	❌	❓	1-15s	16:9, 9:16, 1:1, 4:3
seedance	Seedance Lite (BytePlus)	Tokens	✅	✅	❌	1.2-12s	16:9, 9:16, 1:1, 21:9
seedance-pro	Seedance Pro-Fast (BytePlus)	Tokens	✅	✅	❌	1.2-12s	16:9, 9:16, 1:1, 21:9
veo	Veo 3.1 Fast (Google)	0.15	✅	✅ (Interp)	✅	4, 6, 8s	16:9, 9:16
wan	Wan 2.6 (Alibaba)	0.025	❌	✅	✅ (Native)	5, 10, 15s	16:9, 9:16, 1:1, 4:3
ltx-2	LTX-2 (Lightricks)	0.01	✅	❌	✅	Standard	16:9
🎙️ Audio Models — Capabilities
Pollinations Name	Real/Backend Model	Endpoint	Type	Params	Notes
elevenlabs	ElevenLabs v3	/audio/{text}	TTS	voice (33 voices), response_format	Simple TTS
elevenmusic	ElevenLabs Music	/audio/{text}	Music	duration (3-300s), instrumental (bool)	Text-to-Music
openai-audio	GPT-4o Audio Preview	/v1/chat/completions	Speech	voice, format (wav, mp3, pcm16)	Input: text, Audio.
whisper	OpenAI Whisper v3	/v1/audio/transcriptions	STT	file	POST ONLY (Multipart)
🏗️ Implementation Strategy for V6 (Smart Architecture)
1. Intelligent Dispatcher (Uni-Handler)
Instead of hardcoding, V6 will use a dynamic dispatcher that:

Detects Intent: T2I, I2I (has image), T2V (has duration), V2V (video input).
Auto-Configures: Maps generic params (width/height) to model specifics (aspectRatio strings like "16:9").
Optimizes Cost: Defaults to Minimum Viable Settings (e.g., Veo 4s, Wan 5s) unless user explicitly requests more.
2. Resilience & Recovery (Zero-Loss)
402 (Payment) Handling:
IF model=veo FAILS 402 -> Auto-Fallback to grok-video (Tier) or seedance (Cheap) with a Warning Toast.
"Billing Error: Switched to Grok (Free Tier) to save your wallet."
500 (Server) Handling:
Retry Strategy: 3 retries with exponential backoff (1s, 2s, 4s).
IF wan T2V Fails -> Fallback to grok-video (as Wan is I2V only).
3. Verification Plan (Wallet-Safe)
The test script now uses Minimum Limits to verify capability without waste:

wan: Duration 5s (Verified min) instead of 15s.
veo: Duration 4s (Verified min) instead of 8s.
elevenmusic: Duration 10s instead of 30s.
🧪 Planned Verification (Next Step)
Key: sk_zbtw... (Verified Paid)

Workflow A (High-End Video - Optimized):
wan: duration=5, audio=true, aspect=16:9.
grok-video: duration=5, aspect=16:9.
seedance: duration=4, aspect=21:9.
veo: duration=4, audio=true.
Workflow B (Audio/Music - Optimized):
elevenmusic: duration=10, instrumental=true.
openai-audio: voice=alloy, format=mp3.
Workflow C (Advanced I2I):
nanobanana: In-painting/Edit test.



-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


🔬 Pollinations API — Verified Reference (2026-02-12)
18/18 tests passed across 2 runs. All findings below are verified by real API calls.

🟢 Free API — Live Inventory
Free Image Models (image.pollinations.ai/models) — 3 total
Priorité	Pollinations Name	File Size	Notes
🥇 Défaut	sana	~60 KB	Compressed, mais fonctionne. Défaut free fallback
🥈 2e	zimage	~35 KB	Alias sana/turbo low qual
🥉 3e	turbo	~4.1 MB	⚠️ En panne / déprécié — affiche une image notice au lieu de générer
WARNING

flux retiré du free ! turbo cassé (affiche notice modèle déprécié). sana = seul free fiable.

IMPORTANT

gen_image sera le seul tool exposé en mode free avec ces modèles (sana/zimage), et servira aussi de fallback dans le tool gen_image paid selon le mode choisi par l'utilisateur.

Endpoints — Rôles
Endpoint	Rôle	Key?
image.pollinations.ai	Free image gen (fallback)	❌
gen.pollinations.ai	Paid generation (image/video/audio)	✅
text.pollinations.ai	Free text/tools (déjà intégré, ne pas toucher)	❌
enter.pollinations.ai	Plateforme gestion crédits/clés API (pas de gen)	—
🔵 Paid API — Image Models (gen.pollinations.ai)
Pollinations Name	Real/Backend Model	Pricing	T2I	I2I	Specific Parameters	Notes
flux	Flux Schnell	0.0002 pollen	✅	❌	width, height	Fast high-quality
zimage	Z-Image Turbo (6B Flux 2x)	0.0002 pollen	✅	❌	width, height	Fast with upscaling
imagen-4	Imagen 4 (alpha)	0.0025 pollen	✅	❌	width, height	Google, high fidelity
klein	FLUX.2 Klein 4B	0.008 pollen	✅	✅	width, height, image (URL)	Modal-hosted
klein-large	FLUX.2 Klein 9B	0.012 pollen	✅	✅	width, height, image (URL)	Higher quality
gptimage	GPT Image 1 Mini (OpenAI)	Tokens	✅	❌	width, height, quality (low/med/high), transparent (bool)	DALL-E 3 equiv.
gptimage-large	GPT Image 1.5 (Advanced)	Tokens	✅	❌	width, height, quality (low/med/high), transparent (bool)	—
kontext	FLUX.1 Kontext	0.04 pollen	✅	✅	width, height, image (URL)	In-Context Editing
seedream	Seedream 4.0 (ByteDance ARK)	0.03 pollen	✅	✅	width, height, image (URL)	Better quality
seedream-pro	Seedream 4.5 Pro (ARK 4K)	0.04 pollen	✅	✅	width, height, image (URL)	4K, Multi-Image
nanobanana	NanoBanana (Gemini 2.5 Flash)	Tokens	✅	✅	width, height, image (URL)	Gemini native
nanobanana-pro	NanoBanana Pro (Gemini 3 Pro)	Tokens	✅	✅	width, height, image (URL)	Thinking Model
🎥 Video Models
Model	Real/Backend	Pricing	T2V	I2V	Audio	Duration	AspectRatio	Cost Header	Gen Time
grok-video	Grok Video (alpha)	0.0025	✅	❌	✅ (présent)	1-15s	16:9, 9:16, 1:1, 4:3	x-usage-completion-video-seconds	~10s
ltx-2	LTX-2 (Lightricks)	0.01	✅	❌	✅	5-20s	16:9	x-usage-completion-video-seconds	~35s
wan	Wan 2.6 (Alibaba)	0.025	❌	✅	✅ (Native)	5-15s	16:9, 9:16, 1:1, 4:3	—	~30s
veo	Veo 3.1 Fast (Google)	0.15	✅	✅ (Interp)	✅	4/6/8s	16:9, 9:16, 1:1	x-usage-completion-video-seconds	~45-68s
seedance	Seedance Lite (BytePlus)	Tokens	✅	✅	❌	4-12s	16:9, 9:16, 1:1	x-usage-completion-video-tokens	~30s
seedance-pro	Seedance Pro-Fast (BytePlus)	Tokens	✅	✅	❌	4-12s	16:9, 9:16, 1:1	x-usage-completion-video-tokens	~30s
⚠️ Findings vérifiés
Wan = I2V ONLY — T2V retourne 400
Seedance — Seulement 16:9, 9:16, 1:1 (pas de 21:9)
Veo Interpolation — Images comma-separated : &image=url1,url2
Grok Audio — Présent (désactivation inconnue)
LTX-2 — 520 intermittent (retry OK)
🎙️ Audio — Tool par défaut (openai-audio)
openai-audio = défaut pour tous les tools audio (TTS 🔊 + STT 🎙️). Le moins cher. Les autres modèles sont à spécifier explicitement via paramètre du tool.

Model	Real/Backend	Type	Endpoint	Params	Notes
openai-audio	GPT-4o Audio Preview	TTS + STT 🎙️🔊	gen.pollinations.ai/v1/chat/completions	voice, format (mp3/wav/pcm16)	DÉFAUT — le moins cher
elevenlabs	ElevenLabs v3	TTS	gen.pollinations.ai/audio/{text}	voice (33 voix), response_format	À spécifier explicitement
whisper	OpenAI Whisper v3	STT	/v1/audio/transcriptions	file (multipart)	POST ONLY
OpenAI Audio — Setup
POST https://gen.pollinations.ai/v1/chat/completions
Authorization: Bearer <API_KEY>
{ "model": "openai-audio", "modalities": ["text","audio"], "audio": {"voice":"alloy","format":"mp3"}, "messages": [...] }
Response: choices[0].message.audio.data (base64)

🎵 Music — Tool séparé
elevenmusic = tool dédié (pas dans le stack audio standard).

Model	Real/Backend	Endpoint	Params
elevenmusic	ElevenLabs Music	gen.pollinations.ai/audio/{text}	duration (3-300s), instrumental (bool)
📊 Response Headers (V6 Cost Tracking)
Header	Models	Value
x-usage-completion-image-tokens	Image models	Token count
x-usage-completion-video-seconds	grok, ltx-2, veo	Duration (float)
x-usage-completion-video-tokens	seedance	Token count (108900/5s)
x-model-used	All	Nom du modèle confirmé
x-request-id	All	UUID debug
📁 Fichiers générés
Outputs dans tests/generated_media/complex_workflows/. Rapport JSON dans tests/reports/.


-----------------------------------------------------------------------------------------

Ce qu'on a fait ✅
Phase 1 — Vérification endpoints de découverte : Models lists free + paid (image, audio, text) ✅
Phase 2 — Vérification endpoints de génération : Image free GET ✅, Image paid GET ✅, Audio TTS ✅, Music ✅, Video (tous les modèles) ✅
Phase 3 — Cas limites : partiellement (on a vu les 520 ltx-2, les 400 Wan T2V, les contraintes Seedance)
Doc API_REFERENCE.md créée dans le projet ✅
Ce qu'il reste AVANT de coder (selon le Guide V6)
Lire la doc OpenCode pour comprendre exactement comment les tools, hooks, et commands fonctionnent dans le framework :
La doc locale : 
/home/fkomp/Bureau/oracle/Documentations/opencode.ai/OpenCode-Documentation-Complète.md
Le clone OpenCode : /home/fkomp/Bureau/oracle/utilitaires/_Repo_Clonned/opencode
Et potentiellement le notebook NotebookLM "OPENCODE Documentations complete"
Confronter ROADMAP.md et vision_v5_9_to_v6.md — identifier les incohérences
Revoir le code source existant du plugin (src/server/*, src/index.ts) pour bien comprendre comment greffer sans toucher l'existant
Ajouter les tools search (deepsearch / search_crawl_scrape) avec perplexity-fast, perplexity-reasoning, et nomnom — pas prévus dans le Guide V6 original mais identifiés par notre discovery
Ensuite seulement → plan d'implémentation puis exécution.

On commence par la doc OpenCode et la confrontation ROADMAP/vision ? 🎯



