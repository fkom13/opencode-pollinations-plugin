🏗️ Guide de Développement — Pollinations Multimedia Tools (V6)
PARTIE 1/2 : Architecture, Analyse & Stratégie
1. PHILOSOPHIE FONDAMENTALE
Règle d'or : Le code existant (proxy, config, quota, toast, commands) ne doit PAS être modifié pour ajouter les nouvelles features. On s'y branche, on ne le réécrit pas.

Principes directeurs
Principe	Signification concrète
Greffe, pas chirurgie	Les nouveaux modules importent depuis l'existant (config.ts, quota.ts, toast.ts) mais n'y ajoutent rien
Dynamique d'abord	Zéro modèle hardcodé — tout vient des endpoints /image/models, /audio/models, /text/models
Fail graceful	Chaque appel réseau a un fallback explicite. L'utilisateur ne voit JAMAIS un crash, il voit un message
Coût avant action	Aucune génération payante ne part sans estimation + confirmation (sauf opt-out explicite)
Provider-agnostic pour TTS/STT	Les commandes /tts et /stt fonctionnent quel que soit le provider LLM actif
2. ANALYSE PRÉ-DÉVELOPPEMENT
2.1 Cartographie des endpoints à consommer
Avant d'écrire une seule ligne, l'agent doit vérifier et documenter chaque endpoint :

Endpoints Image
Test	Commande	Ce qu'on vérifie
Liste modèles free	curl https://image.pollinations.ai/models	Retourne ["sana","zimage","turbo"] — tableau de strings
Liste modèles enter	curl -H "Authorization: Bearer $KEY" https://gen.pollinations.ai/image/models	Retourne tableau d'objets avec pricing, paid_only, input_modalities
Génération free GET	curl -o test.jpg "https://image.pollinations.ai/prompt/blue%20bird?model=turbo&nologo=true&private=true&seed=42"	Retourne un fichier image binaire directement
Génération enter POST	Tester l'endpoint POST enter pour images (vérifier si c'est /v1/image/generate ou autre)	CRITIQUE : documenter le format de requête et réponse exact
Endpoints Audio
Test	Commande	Ce qu'on vérifie
Liste modèles audio	curl -H "Authorization: Bearer $KEY" https://gen.pollinations.ai/audio/models	3 modèles : elevenlabs, elevenmusic, whisper
TTS elevenlabs	Tester l'endpoint de génération TTS — format requête/réponse	Retourne audio binaire ou URL ?
STT whisper	Tester l'endpoint transcription — accepte quels formats audio ?	Multipart form-data ou base64 ?
Music elevenmusic	Tester la génération musicale	Durée max ? Format retour ?
Points critiques à valider AVANT de coder
text

□ Est-ce que la génération image enter utilise le même /v1/chat/completions
  avec un model "gptimage" ou un endpoint dédié ?
  → Réponse probable : Les modèles comme gptimage/nanobanana passent
    par /v1/chat/completions avec output_modalities: ["image"]
  → MAIS flux/seedream/kontext utilisent probablement un endpoint dédié image
  → TESTER LES DEUX

□ Format de retour image enter :
  - Base64 dans le JSON de réponse ?
  - URL vers un CDN ?
  - Stream binaire ?
  → Ça détermine toute l'architecture du media pipeline

□ Format de retour audio TTS :
  - Audio binaire direct ?
  - URL ?
  - Stream ?
  → Même impact

□ Whisper (STT) — format d'envoi :
  - Multipart form-data avec fichier audio ?
  - Base64 dans JSON ?
  - URL vers le fichier audio ?

□ Limites par modèle image :
  - Résolutions supportées par modèle
  - Formats de sortie (PNG, JPEG, WebP)
  - Taille max du prompt
  - Est-ce que "seed" est supporté sur tous ?

□ Voices elevenlabs :
  - Les 34 voix listées sont-elles toutes disponibles ?
  - Y a-t-il un endpoint pour lister dynamiquement ?
  - Paramètres supplémentaires (speed, emotion, language) ?
2.2 Analyse du format de retour des modèles
L'agent doit comprendre que 3 familles distinctes existent dans l'API :

text

FAMILLE 1 — Image via GET (Free)
  Entrée : URL avec query params
  Sortie : Binaire image direct
  Auth   : Aucune
  Modèles: sana, turbo, zimage (dynamique via /models)

FAMILLE 2 — Image/Video via POST (Enter)
  Entrée : JSON body avec prompt, model, params
  Sortie : À DÉTERMINER (URL CDN? Base64? Binary?)
  Auth   : Bearer token
  Modèles: flux, kontext, seedream, gptimage, veo, seedance, etc.

FAMILLE 3 — Audio via POST (Enter)
  Entrée : JSON (TTS) ou Multipart (STT)
  Sortie : À DÉTERMINER
  Auth   : Bearer token
  Modèles: elevenlabs, elevenmusic, whisper
L'agent DOIT tester chaque famille avant de designer les interfaces.

3. ARCHITECTURE MODULAIRE
3.1 Structure de fichiers cible
text

src/
├── index.ts                          # EXISTANT — Ajouter seulement l'import du registry
├── server/                           # EXISTANT — NE PAS TOUCHER
│   ├── proxy.ts                      # Inchangé (gère text LLM)
│   ├── config.ts                     # Inchangé (on le consomme)
│   ├── quota.ts                      # Inchangé (on le consomme)
│   ├── toast.ts                      # Inchangé (on le consomme)
│   ├── commands.ts                   # Inchangé (on étend via le registry)
│   ├── generate-config.ts            # Inchangé
│   ├── pollinations-api.ts           # Inchangé
│   └── status.ts                     # Inchangé
│
├── tools/                            # ═══ NOUVEAU MODULE ═══
│   ├── registry.ts                   # Registre central des tools
│   ├── discovery.ts                  # Fetch dynamique des modèles disponibles
│   ├── schemas.ts                    # Schémas JSON des tools pour l'agent LLM
│   ├── image-tool.ts                 # Implémentation generate_image
│   ├── video-tool.ts                 # Implémentation generate_video
│   ├── audio-tool.ts                 # Implémentation TTS + Music
│   ├── transcribe-tool.ts           # Implémentation STT (whisper)
│   └── types.ts                      # Interfaces TypeScript partagées
│
├── media/                            # ═══ NOUVEAU MODULE ═══
│   ├── estimator.ts                  # Moteur d'estimation de coût
│   ├── storage.ts                    # Save to disk + génération liens
│   ├── viewer.ts                     # Ouverture fichier (xdg-open/open)
│   └── formats.ts                    # Validation formats, résolutions, durées
│
├── commands/                         # ═══ NOUVEAU MODULE ═══
│   ├── media-commands.ts             # /tts, /stt, /music, /image
│   ├── estimator-commands.ts         # /cost, /estimate
│   └── index.ts                      # Agrégateur + branchement sur commands.ts
│
└── __tests__/                        # ═══ TESTS ═══
    ├── discovery.test.ts
    ├── estimator.test.ts
    ├── schemas.test.ts
    ├── storage.test.ts
    └── integration.test.ts
3.2 Frontières de responsabilité
text

┌─────────────────────────────────────────────────────┐
│                    index.ts                          │
│  Point d'entrée unique. Enregistre les hooks.       │
│  SEULE MODIFICATION : importer tools/registry       │
│  et commands/index, les merger dans les hooks        │
└───────────┬────────────────────┬────────────────────┘
            │                    │
    ┌───────▼───────┐    ┌──────▼──────────────┐
    │  server/*     │    │  tools/ + media/    │
    │  EXISTANT     │    │  + commands/        │
    │  NE PAS       │    │  NOUVEAU            │
    │  MODIFIER     │    │                     │
    └───────┬───────┘    └──────┬──────────────┘
            │                    │
            │  IMPORTS ──────────┘
            │  (config, quota, toast)
            │
            │  Le nouveau code CONSOMME
            │  l'existant en lecture seule
3.3 Contrat d'interface entre ancien et nouveau
Le nouveau code a le droit de :

Importer : loadConfig(), getQuotaStatus(), emitStatusToast(), emitLogToast(), formatQuotaForToast()
Lire : config.apiKey, config.mode, config.thresholds, config.gui
Appeler : saveConfig() uniquement pour les nouvelles clés de config (ex: mediaDefaults)
Le nouveau code n'a PAS le droit de :

Modifier le flow de handleChatCompletion dans proxy.ts
Ajouter des routes au serveur HTTP existant
Modifier le format de PollinationsConfigV5
Toucher à la logique de signature Gemini
4. STRATÉGIE D'ERREUR — LE BOUCLIER
4.1 Taxonomie des erreurs
Chaque appel réseau dans les nouveaux modules doit gérer exactement ces catégories :

Catégorie	HTTP Status	Comportement
AUTH_MISSING	—	Pas de clé API → Proposer uniquement les modèles free
AUTH_INVALID	401	Clé rejetée → Toast error + refuser la génération
AUTH_FORBIDDEN	403	Clé valide mais modèle interdit → Toast warning + suggérer alternative
QUOTA_EXCEEDED	402	Plus de pollen → Toast + proposer modèle free équivalent
RATE_LIMITED	429	Trop de requêtes → Retry avec backoff (3 tentatives, délai exponentiel)
MODEL_UNAVAILABLE	404 / 503	Modèle en maintenance → Toast + fallback au modèle le plus proche
NETWORK_ERROR	—	Timeout / DNS / Connection refused → Retry puis fallback offline
CONTENT_POLICY	400 + body	Prompt rejeté (NSFW, etc.) → Remonter le message exact de l'API
GENERATION_FAILED	500 / 520	Erreur serveur → Retry avec backoff
INVALID_FORMAT	400	Mauvais paramètres (résolution, durée, etc.) → Message explicite avec les valeurs valides
4.2 Pattern d'erreur unifié
Chaque tool doit retourner un objet normalisé :

text

ToolResult {
  success: boolean
  type: 'image' | 'video' | 'audio' | 'text'
  
  // Si succès
  url?: string          // Lien CDN/S3
  localPath?: string    // Si sauvegardé en local
  metadata?: {
    model: string
    cost: number        // Coût réel en pollen
    duration?: number   // Pour audio/vidéo
    resolution?: string // Pour image/vidéo
  }
  
  // Si échec
  error?: {
    category: ErrorCategory   // Une des 10 catégories ci-dessus
    message: string           // Message user-friendly
    suggestion?: string       // "Essayez avec le modèle flux (gratuit)"
    retryable: boolean
  }
}
4.3 Cascade de fallback par type de média
text

IMAGE (Enter) → échec ?
  ├─ Si AUTH/QUOTA → Fallback vers FREE (turbo/sana/zimage)
  ├─ Si MODEL_UNAVAILABLE → Essayer modèle suivant dans la même gamme
  └─ Si tout échoue → Message clair avec explication

VIDEO → échec ?
  ├─ Si QUOTA → Message "Pas de fallback gratuit pour la vidéo"
  ├─ Si MODEL_UNAVAILABLE → Essayer modèle alternatif
  └─ Si tout échoue → Suggérer image à la place

AUDIO TTS → échec ?
  ├─ Si QUOTA → Message clair (pas de fallback free TTS)
  ├─ Si voix indisponible → Fallback vers "alloy" (voix par défaut)
  └─ Si tout échoue → Retourner le texte brut

AUDIO STT → échec ?
  ├─ Si format non supporté → Lister les formats valides
  └─ Si tout échoue → Message avec suggestion de format
5. TESTS À FAIRE AVANT DE CODER
5.1 Tests de découverte API (manuels, avec curl)
text

PHASE 1 — VÉRIFICATION DES ENDPOINTS DE DÉCOUVERTE

□ GET https://image.pollinations.ai/models
  → Vérifier : tableau de strings, pas d'auth requise
  → Noter : les modèles exacts retournés

□ GET https://gen.pollinations.ai/image/models (avec Bearer)
  → Vérifier : tableau d'objets avec pricing, paid_only, modalities
  → Noter : différences avec le free endpoint

□ GET https://gen.pollinations.ai/audio/models (avec Bearer)
  → Vérifier : 3 modèles, les voix de elevenlabs, les formats

□ GET https://gen.pollinations.ai/text/models (avec Bearer)
  → Vérifier : cohérence avec la doc fournie
  → Identifier les modèles avec tools: false (perplexity, gemini-search, qwen-character)


PHASE 2 — VÉRIFICATION DES ENDPOINTS DE GÉNÉRATION

□ Image Free GET — Tester CHAQUE modèle free :
  curl -o sana.jpg "https://image.pollinations.ai/prompt/test?model=sana&nologo=true&private=true"
  curl -o turbo.jpg "https://image.pollinations.ai/prompt/test?model=turbo&nologo=true&private=true"
  curl -o zimage.jpg "https://image.pollinations.ai/prompt/test?model=zimage&nologo=true&private=true"
  → Vérifier : fichier valide, temps de réponse, Content-Type

□ Image Enter POST — Identifier le bon endpoint :
  HYPOTHÈSE A : POST https://gen.pollinations.ai/v1/image/generate
  HYPOTHÈSE B : POST https://gen.pollinations.ai/image/generate  
  HYPOTHÈSE C : via /v1/chat/completions avec model="gptimage"
  → TESTER LES 3, documenter celui qui marche
  → Pour chaque : noter le format de réponse (URL? Base64? Stream?)

□ TTS — Tester :
  POST https://gen.pollinations.ai/audio/generate  (hypothèse)
  POST https://gen.pollinations.ai/v1/audio/speech  (hypothèse OpenAI-compat)
  → Body : { model: "elevenlabs", input: "Hello", voice: "alloy" }
  → Réponse : audio binaire ? URL ? JSON avec base64 ?

□ STT — Tester :
  POST https://gen.pollinations.ai/v1/audio/transcriptions  (hypothèse)
  → Format : multipart/form-data avec file + model
  → Réponse : { text: "..." } ?

□ Music — Tester :
  POST avec model: "elevenmusic", prompt: "upbeat jazz"
  → Réponse : audio URL ? stream ?


PHASE 3 — VÉRIFICATION DES CAS LIMITES

□ Image free avec modèle invalide
  curl "https://image.pollinations.ai/prompt/test?model=INVALID"
  → Retourne quoi ? Erreur 400 ? Image par défaut ?

□ Image enter sans auth
  → Doit retourner 401

□ Image enter avec modèle paid_only et wallet vide
  → Doit retourner 402

□ TTS avec voix invalide
  → Retourne quoi ?

□ STT avec fichier non-audio
  → Retourne quoi ?

□ Génération image avec prompt vide
  → Retourne quoi ?

□ Génération image avec prompt > 1000 caractères
  → Retourne quoi ? Troncature ? Erreur ?
5.2 Tests de l'existant (non-régression)
text

□ Vérifier que loadConfig() retourne bien apiKey quand elle existe
□ Vérifier que getQuotaStatus() fonctionne avec et sans clé
□ Vérifier que emitStatusToast/emitLogToast respectent les niveaux gui
□ Vérifier que les commandes /pollinations existantes ne cassent pas
□ Vérifier que le proxy text continue de fonctionner normalement
□ Vérifier la construction dynamique des modèles text (generate-config.ts)
6. CONFIG EXTENSION
6.1 Nouvelles clés de configuration
La config PollinationsConfigV5 doit être étendue (pas modifiée) via un type séparé :

text

PollinationsMediaConfig {
  // Confirmations
  costConfirmation: 'always' | 'paid_only' | 'never'
  // → 'always' : confirmer avant chaque génération
  // → 'paid_only' : confirmer seulement si ça coûte du wallet
  // → 'never' : jamais (power user)

  // Defaults image
  imageDefaults: {
    model: string        // ex: 'turbo' (dynamique, vérifié au runtime)
    nologo: boolean      // true par défaut
    private: boolean     // true par défaut
    width?: number
    height?: number
  }

  // Defaults audio
  audioDefaults: {
    voice: string        // 'alloy' par défaut
    ttsModel: string     // 'elevenlabs'
    sttModel: string     // 'whisper'
    outputFormat: string // 'mp3'
  }

  // Storage
  mediaStorage: {
    defaultDir: string   // './generated' ou chemin absolu
    autoSave: boolean    // true = sauvegarder automatiquement
    namingPattern: string // '{type}_{model}_{timestamp}' 
  }
}
6.2 Stockage
Ces nouvelles clés vivent dans le même fichier (~/.pollinations/config.json) mais sous une clé media :

JSON

{
  "version": "6.0.0",
  "mode": "pro",
  "apiKey": "sk_...",
  "media": {
    "costConfirmation": "paid_only",
    "imageDefaults": { "model": "turbo", "nologo": true, "private": true },
    "audioDefaults": { "voice": "alloy" },
    "mediaStorage": { "defaultDir": "./generated", "autoSave": true }
  }
}
L'accès se fait via une nouvelle fonction loadMediaConfig() dans un fichier séparé, qui appelle loadConfig() en interne et merge les defaults.

Fin de la Partie 1. La Partie 2 couvre : le Tool Registry dynamique, le Cost Estimator, les commandes TTS/STT/Image, le Media Pipeline, les spécificités par modèle, et la matrice de tests complète.

PARTIE 2/2 : Tools, Estimateur, Commandes & Intégration
7. TOOL REGISTRY — LE CŒUR DYNAMIQUE
7.1 Principe
Le registry est le cerveau qui :

Fetch les modèles disponibles depuis les 3 endpoints (/text/models, /image/models, /audio/models)
Construit les schémas de tools OpenAI-compatible pour l'agent LLM
Gère le cache et le refresh
Expose une API interne simple pour les autres modules
7.2 Cycle de vie du registry
text

DÉMARRAGE DU PLUGIN
       │
       ▼
  discovery.ts : fetchAllModels()
       │
       ├─ GET /image/models (free) ──→ string[]
       ├─ GET /image/models (enter) ──→ ImageModel[]  
       ├─ GET /audio/models (enter) ──→ AudioModel[]
       │
       ▼
  registry.ts : buildToolDefinitions()
       │
       ├─ Pour chaque modèle image → construire le schéma generate_image
       ├─ Pour chaque modèle audio → construire le schéma tts/stt/music
       ├─ Pour chaque modèle vidéo → construire le schéma generate_video
       │
       ▼
  Schémas injectés dans le hook config() de index.ts
  comme tools disponibles pour l'agent
       │
       ▼
  REFRESH toutes les 5 minutes (ou sur /pollinations refresh)
7.3 Discovery — Ce qu'il faut stocker par modèle
Pour chaque modèle découvert, le registry stocke :

text

DiscoveredModel {
  // Identité
  id: string               // "flux", "elevenlabs", "veo"
  category: 'image' | 'video' | 'audio'
  subcategory?: 'tts' | 'stt' | 'music'  // Pour audio uniquement
  
  // Disponibilité
  available: boolean        // Le fetch a réussi
  paidOnly: boolean         // Nécessite wallet
  requiresAuth: boolean     // Nécessite API key
  isFree: boolean           // Dispo sur image.pollinations.ai sans auth
  isAlpha: boolean          // ⚠️ Flag alpha
  
  // Capacités (depuis input/output_modalities)
  acceptsImageInput: boolean   // kontext, klein, nanobanana, seedream...
  acceptsTextInput: boolean    // Tous
  acceptsAudioInput: boolean   // whisper
  outputsImage: boolean
  outputsVideo: boolean
  outputsAudio: boolean
  
  // Pricing (normalisé en pollen)
  pricing: {
    perImage?: number          // Coût fixe par image
    perVideoSecond?: number    // Par seconde de vidéo
    perAudioSecond?: number    // Par seconde d'audio (TTS)
    per1KChars?: number        // Par 1000 caractères (TTS alternatif)
    perInputAudioSecond?: number // STT coût
    promptTextTokens?: number  // Pour gptimage-style
    completionTokens?: number
  }
  
  // Paramètres spécifiques
  voices?: string[]            // Pour TTS
  maxDuration?: number         // Pour vidéo/music
  supportedResolutions?: string[]  // Pour image
  aliases: string[]            // Noms alternatifs
  description: string          // Description officielle
}
7.4 Classification automatique des modèles
L'agent dev doit implémenter cette logique de classification basée sur les données API :

text

RÈGLE : Un modèle est classifié selon ses output_modalities

Si output_modalities contient "image"  → catégorie IMAGE
Si output_modalities contient "video"  → catégorie VIDEO
Si output_modalities contient "audio"  → catégorie AUDIO
  └─ Si input_modalities contient "audio" → sous-catégorie STT
  └─ Si nom contient "music"              → sous-catégorie MUSIC
  └─ Sinon                                → sous-catégorie TTS

RÈGLE : isFree est déterminé DYNAMIQUEMENT
  Pour image : le modèle apparaît dans GET /image/models (free endpoint)
  Pour audio/video : jamais free (actuellement)

RÈGLE : paidOnly vient du champ "paid_only" de l'API enter
  MAIS aussi du croisement : si absent du free ET absent du enter sans paid_only
  → c'est un modèle tier (consomme le daily pollen d'abord)
7.5 Construction des schémas de tools — Spécificités par modèle
C'est le point le plus critique. Chaque tool doit avoir un schéma JSON précis que l'agent LLM comprend.

Tool generate_image
text

Paramètres COMMUNS (tous modèles image) :
  - prompt: string (required) — Description de l'image
  - model: enum (required) — Valeurs = IDs découverts dynamiquement
  - save_to: string (optional) — Chemin de sauvegarde

Paramètres CONDITIONNELS (selon le modèle) :
  
  Si modèle est FREE (sana/turbo/zimage) :
    - seed: number (optional) — Pour reproductibilité
    - nologo: boolean (default true)
    - private: boolean (default true)
    PAS de width/height (le free ne le supporte pas forcément)
  
  Si modèle accepte image input (kontext/klein/nanobanana/seedream/gptimage) :
    - reference_image: string (optional) — URL ou chemin local de l'image source
    - edit_instruction: string (optional) — Pour kontext et les modèles d'édition
  
  Si modèle est gptimage ou gptimage-large :
    - quality: enum ['standard', 'hd'] (optional)
    - style: enum ['natural', 'vivid'] (optional)
  
  Si modèle est seedream ou seedream-pro :
    → Pas de paramètres spéciaux identifiés, mais TESTER
  
  Si modèle est imagen-4 :
    → ALPHA : ajouter un warning dans la description du tool
IMPORTANT : Le schéma doit être reconstruit dynamiquement à chaque refresh du registry. Si un nouveau modèle apparaît dans l'API avec input_modalities: ["image"], le paramètre reference_image doit automatiquement être ajouté.

Tool generate_video
text

Paramètres :
  - prompt: string (required)
  - model: enum (required) — veo, seedance, seedance-pro, grok-video, wan, ltx-2
  - duration: number (optional) — Durée en secondes
  - save_to: string (optional)
  
  Si modèle accepte image input (veo/seedance/wan) :
    - reference_image: string (optional) — Image de départ (image-to-video)
  
  Contraintes par modèle :
    - wan : 2-15s, up to 1080P (documenter dans la description)
    - veo : paid_only, très cher (0.15/sec)
    - grok-video : alpha, le moins cher (0.003/sec)
    - ltx-2 : paid_only, avec audio
Tool text_to_speech
text

Paramètres :
  - text: string (required) — Texte à synthétiser
  - voice: enum (required) — Valeurs = voix découvertes dynamiquement
  - model: string (default "elevenlabs")
  - save_to: string (optional)
  - language: string (optional) — Code langue
  
  Les voix DOIVENT être injectées dynamiquement depuis
  le champ "voices" du modèle elevenlabs retourné par l'API
  
  Description du tool doit LISTER les voix disponibles
  pour que l'agent LLM puisse choisir intelligemment
Tool speech_to_text
text

Paramètres :
  - audio_file: string (required) — Chemin vers le fichier audio
  - model: string (default "whisper")
  - language: string (optional) — Hint de langue
  
  Formats acceptés : À DÉTERMINER PAR TEST
  (probablement wav, mp3, m4a, ogg, flac — formats whisper standard)
Tool generate_music
text

Paramètres :
  - prompt: string (required) — Description du morceau
  - duration: number (optional) — Durée en secondes
  - model: string (default "elevenmusic")
  - save_to: string (optional)
8. COST ESTIMATOR — LA CONFIANCE
8.1 Moteur de calcul
L'estimateur utilise les données pricing de chaque modèle pour calculer le coût avant exécution :

text

POUR IMAGE :
  Si pricing.completionImageTokens existe :
    coût = pricing.completionImageTokens (c'est un flat rate par image)
  Si pricing basé sur tokens (gptimage-style) :
    coût = (prompt_tokens × promptTextTokens) + completionImageTokens
    prompt_tokens ≈ longueur_prompt / 4 (estimation)

POUR VIDEO :
  Si pricing.completionVideoSeconds existe :
    coût = duration_seconds × completionVideoSeconds
  Si pricing.completionVideoTokens existe :
    coût = estimated_tokens × completionVideoTokens

POUR AUDIO TTS :
  Si pricing.completionAudioTokens existe (elevenlabs) :
    coût = (text_length / 1000) × completionAudioTokens × 1000
    (completionAudioTokens est par token, 1 char ≈ 1 token pour TTS)

POUR AUDIO STT :
  Si pricing.promptAudioSeconds existe (whisper) :
    coût = audio_duration_seconds × promptAudioSeconds

POUR MUSIC :
  Si pricing.completionAudioSeconds existe :
    coût = duration_seconds × completionAudioSeconds
8.2 Flow de confirmation
text

Agent appelle generate_image(prompt="blue bird", model="seedream")
       │
       ▼
  estimator.ts calcule : ~0.03 pollen
       │
       ▼
  Vérifie config.media.costConfirmation
       │
       ├─ 'never' → Exécuter directement
       │
       ├─ 'paid_only' → Le modèle est-il paid_only ?
       │     ├─ Oui → CONFIRMER
       │     └─ Non → Le tier a-t-il assez ?
       │           ├─ Oui → Exécuter (consomme tier)
       │           └─ Non → CONFIRMER (va taper dans le wallet)
       │
       └─ 'always' → CONFIRMER
              │
              ▼
        Retour à l'agent LLM avec un message :
        "🌸 Estimation: seedream → ~0.03 🌼
         Tier restant: 2.47/3.00
         Wallet: $5.20
         [Ce coût sera prélevé sur votre tier quotidien]
         Proceed? Répondez 'oui' pour confirmer."
              │
              ▼
        L'agent attend la réponse user
        Si "oui" / "yes" / "ok" → Exécuter
        Si autre chose → Annuler, proposer alternative
8.3 Intégration avec le quota existant
text

AVANT chaque génération :
  1. getQuotaStatus(true)  // Force refresh
  2. Comparer coût estimé vs tierRemaining
  3. Si coût > tierRemaining :
     a. Si walletBalance > coût → Avertir "Ceci consommera du wallet"
     b. Si walletBalance < coût → BLOQUER "Solde insuffisant"
  4. Si mode === 'alwaysfree' ET coût > tierRemaining → BLOQUER
  5. Si mode === 'manual' → Pas de vérification auto, juste l'estimation
9. COMMANDES PROVIDER-AGNOSTIC
9.1 Design des commandes
Ces commandes ne passent PAS par le proxy. Elles sont interceptées par le hook tui.command.execute directement, comme les commandes /pollinations existantes.

text

/tts <texte> [--voice <voix>] [--save <chemin>] [--model <modele>]
  Exemples :
    /tts "Bonjour le monde"
    /tts "Hello world" --voice nova --save ./hello.mp3
    /tts "Ceci est un test" --voice rachel --model elevenlabs

/stt <fichier_audio> [--lang <code>] [--model whisper]
  Exemples :
    /stt ./recording.wav
    /stt ./meeting.mp3 --lang fr

/music <description> [--duration <secondes>] [--save <chemin>]
  Exemples :
    /music "upbeat jazz with saxophone"
    /music "ambient electronic" --duration 30 --save ./ambiance.mp3

/image <prompt> [--model <modele>] [--save <chemin>] [--ref <image>]
  Exemples :
    /image "a blue bird on a branch"
    /image "futuristic city" --model seedream --save ./city.png
    /image "edit the sky to sunset" --model kontext --ref ./photo.jpg

/video <prompt> [--model <modele>] [--duration <sec>] [--save <chemin>]
  Exemples :
    /video "a cat playing piano" --model grok-video
    /video "ocean waves" --model seedance --duration 5

/cost <type> <model> [params...]
  Exemples :
    /cost image seedream
    /cost video veo --duration 10
    /cost tts elevenlabs --text "Hello world"
    → Affiche l'estimation SANS exécuter
9.2 Pourquoi provider-agnostic ?
text

Scénario :  L'utilisateur utilise Claude (via Anthropic direct, pas Pollinations)
            comme LLM principal, mais veut générer des images Pollinations.

Flow :
  1. User tape /image "blue bird" dans OpenCode
  2. Le hook commands/ intercepte (PAS le proxy)
  3. Appel direct vers image.pollinations.ai
  4. Toast quota mis à jour
  5. Résultat affiché dans le chat
  
  → Le provider LLM actif n'a AUCUNE importance
  → Les quotas Pollinations sont toujours trackés
9.3 Intégration avec les tools LLM
Les commandes et les tools sont deux faces de la même pièce :

text

Même fonction sous-jacente :
  generateImage(params) ← Appelé par le tool OU par la commande

La COMMANDE :
  - Interceptée par tui.command.execute
  - Parse les arguments CLI
  - Appelle generateImage()
  - Formate le résultat en markdown pour le chat

Le TOOL :
  - Appelé par l'agent LLM via tool_call
  - Reçoit les params structurés (JSON)
  - Appelle generateImage()
  - Retourne le résultat structuré à l'agent

MÊME LOGIQUE DE CONFIRMATION :
  - En commande : prompt interactif dans le chat
  - En tool : l'agent renvoie l'estimation au user et attend
10. MEDIA PIPELINE — LE FLUX DES FICHIERS
10.1 Storage Strategy
text

GÉNÉRATION RÉUSSIE
       │
       ▼
  Résultat brut (binaire ou URL)
       │
       ├─ Si URL CDN/S3 (ex: enter retourne une URL) :
       │    → Stocker l'URL dans le résultat
       │    → Si autoSave=true → Télécharger et sauvegarder localement
       │
       ├─ Si binaire (ex: free image GET retourne des bytes) :
       │    → Sauvegarder localement
       │    → Pas d'URL CDN disponible
       │
       └─ Dans tous les cas :
            → Générer le nom de fichier selon namingPattern
            → Créer le dossier si nécessaire
            → Retourner { url, localPath, metadata }
10.2 Naming Pattern
text

Pattern par défaut : {type}_{model}_{timestamp}.{ext}

Exemples :
  image_turbo_20260212_051400.jpg
  video_veo_20260212_051500.mp4
  audio_elevenlabs_20260212_051600.mp3
  transcription_whisper_20260212_051700.txt
10.3 Viewer (Phase 1 — Minimaliste)
text

Pas de rendu terminal en Phase 1.

Comportement :
  1. Sauvegarder le fichier
  2. Afficher dans le chat :
     - Le lien CDN (si disponible) — cliquable dans le terminal
     - Le chemin local
     - Les métadonnées (modèle, coût, résolution/durée)
  3. Si config.media.autoOpen === true :
     - Linux : xdg-open <path>
     - macOS : open <path>
     - Windows : start <path>
  4. Toast de succès avec le résumé
11. SPÉCIFICITÉS MODÈLES — TABLE DE RÉFÉRENCE POUR L'AGENT DEV
L'agent doit construire un mapping interne de contraintes. Voici la table complète :

11.1 Image
Modèle	Free?	Edit?	Résolution	Coût/img	Notes
sana	✅	❌	standard	0 (free)	Via GET, pas de contrôle résolution
turbo	✅	❌	standard	0 (free)	Via GET, rapide
zimage	✅	❌	standard + 2x upscale	0 (free)	Via GET, meilleure qualité free
flux	❌	❌	standard	0.0002	Le moins cher enter
imagen-4	❌	❌	?	0.0025	ALPHA — peut être instable
klein	❌	✅	?	0.008	Accepte image input
klein-large	❌	✅	?	0.012	9B, meilleure qualité
gptimage	❌	✅	?	variable (tokens)	OpenAI-style, pricing complexe
gptimage-large	💎	✅	?	variable (cher)	paid_only
seedream	💎	✅	?	0.03	paid_only, ByteDance
kontext	💎	✅	?	0.04	paid_only, spécialisé édition
nanobanana	💎	✅	?	0.03	paid_only, Gemini-based
nanobanana-pro	💎	✅	4K	0.12	paid_only, très cher, thinking
seedream-pro	💎	✅	4K, multi-image	0.04	paid_only
11.2 Vidéo
Modèle	Free?	Image→Video?	Audio?	Coût/sec	Max durée	Notes
grok-video	❌	❌	❌	0.003	?	ALPHA, le moins cher
seedance	❌	✅	❌	token-based	?	Tier accessible
seedance-pro	💎	✅	❌	token-based	?	paid_only
wan	❌	✅	✅	0.025	2-15s	ALPHA, avec audio
ltx-2	💎	❌	✅	0.01	?	paid_only, avec audio
veo	💎	✅	❌	0.15	?	LE PLUS CHER
11.3 Audio
Modèle	Type	Free?	Coût	Voix	Notes
elevenlabs	TTS	❌	0.18/1K chars	34 voix	Émotions, audio tags
elevenmusic	Music	❌	0.005/sec	—	Studio-grade
whisper	STT	❌	0.0000445/sec	—	ALPHA
11.4 Modèles text avec audio I/O (cas spécial)
Modèle	Audio In	Audio Out	Notes
openai-audio	✅	✅	GPT-4o Mini Audio, 13 voix, via chat completions
gemini	✅	❌	Accepte audio en input pour analyse
gemini-large	✅	❌	Accepte audio + vidéo en input
ATTENTION : openai-audio est un cas hybride — c'est un modèle TEXT qui peut aussi faire du TTS inline. Il passe par /v1/chat/completions avec modalities: ["text", "audio"]. Ce n'est PAS le même flow que elevenlabs. L'agent dev doit décider s'il l'expose comme un tool TTS séparé ou s'il le laisse dans le flow text normal.

12. MATRICE DE TESTS FINALE
12.1 Tests unitaires (chaque module isolé)
Module	Test	Assertion
discovery.ts	Fetch image free models	Retourne string[] non vide
discovery.ts	Fetch image enter models	Retourne DiscoveredModel[] avec pricing
discovery.ts	Fetch audio models	Retourne 3 modèles avec bonnes catégories
discovery.ts	Fetch sans réseau	Retourne cache ou liste vide, pas de crash
discovery.ts	Fetch avec clé invalide	Retourne modèles free uniquement
schemas.ts	Build image tool schema	Enum model contient les modèles découverts
schemas.ts	Build schema avec modèle edit	Paramètre reference_image présent
schemas.ts	Build TTS schema	Enum voice contient les voix de l'API
schemas.ts	Build schema sans audio models	Tool TTS absent, pas de crash
estimator.ts	Coût image flat rate	seedream → 0.03
estimator.ts	Coût image token-based	gptimage avec prompt 100 chars → estimation cohérente
estimator.ts	Coût vidéo par seconde	veo 10s → 1.5 pollen
estimator.ts	Coût TTS	500 chars → estimation cohérente
estimator.ts	Coût modèle inconnu	Retourne erreur explicite, pas 0
storage.ts	Save binaire	Fichier créé, taille > 0
storage.ts	Save avec dossier inexistant	Dossier créé automatiquement
storage.ts	Naming pattern	Format correct selon pattern
formats.ts	Validation format audio	mp3/wav/ogg → ok, exe → rejeté
12.2 Tests d'intégration
Scénario	Flow complet	Assertion
Image free	/image "blue bird" --model turbo	Image sauvegardée, toast OK
Image enter	/image "blue bird" --model flux	Image + coût affiché
Image paid sans wallet	/image "..." --model seedream avec wallet=0	BLOQUÉ avec message clair
Image avec confirmation	costConfirmation='always' + /image "..."	Estimation affichée, attend réponse
TTS basique	/tts "Hello" --voice alloy	Audio sauvegardé, toast OK
TTS voix invalide	/tts "Hello" --voice INVALID	Erreur + liste des voix valides
STT	/stt ./test.wav	Transcription affichée dans le chat
STT fichier inexistant	/stt ./nope.wav	Erreur "fichier introuvable"
Video	/video "cat" --model grok-video	Vidéo + lien + coût
Tool image via agent	Agent appelle generate_image	Estimation → confirmation → résultat
Fallback image enter→free	Image enter échoue (402)	Retry automatique avec turbo (free)
Mode alwaysfree + image paid	/image "..." --model seedream	BLOQUÉ + suggestion free
Réseau coupé	Toute commande média	Erreur propre "service indisponible"
Refresh registry	/pollinations refresh	Modèles reconstruits, toast confirme
12.3 Tests de non-régression
Test	Ce qu'on vérifie
Chat text normal	Le proxy text fonctionne identiquement
Commandes /pollinations existantes	mode, usage, connect, fallback — tous OK
Toast system	Les niveaux gui.status et gui.logs sont respectés
Config existante	Pas de corruption du config.json existant
Startup sans clé	Le plugin démarre, seuls les tools free sont disponibles
Startup avec clé	Tous les tools sont disponibles selon le tier
13. CHECKLIST DE LIVRAISON
text

AVANT PR / MERGE :

□ Aucun fichier dans server/ modifié (sauf import dans index.ts)
□ Tous les tests unitaires passent
□ Tous les tests d'intégration passent
□ La config existante n'est pas cassée (migration transparente)
□ Les modèles sont 100% dynamiques (aucun ID hardcodé dans les tools)
□ Le cost estimator utilise les prix de l'API, pas des constantes
□ Les voix TTS viennent de l'API, pas d'une liste hardcodée
□ Chaque erreur réseau a un message user-friendly
□ Le mode alwaysfree bloque correctement les tools payants
□ Le mode manual montre l'estimation sans bloquer
□ Le mode pro applique les thresholds wallet/tier
□ Les commandes /tts /stt fonctionnent avec un provider non-pollinations
□ autoSave crée le dossier s'il n'existe pas
□ Le registry se refresh sans redémarrer OpenCode
□ Le CHANGELOG est à jour
□ Le README documente les nouvelles commandes
