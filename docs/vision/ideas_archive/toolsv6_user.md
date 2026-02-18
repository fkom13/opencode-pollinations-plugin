V6 Implementation Plan — Final (12 Tools + Tier System)
Status: Ready for user review
Date: 2026-02-12

User Review Required
IMPORTANT

Validated decisions to confirm:

12 tools total — see table below
Upload via litterbox.catbox.moe (0x0.st blocks curl)
extract_image_from_video requires gen_video → linked to Enter universe
New Microbe tier 🦠 to add in README and /pollinations usage
1. Architecture Overview — Deux Univers
┌─────────────────────────────────────────────────┐
│              Sans clé API (Free Universe)        │
│                                                  │
│  Text Provider: text.pollinations.ai (inchangé)  │
│                                                  │
│  Tools injectés (7):                             │
│    gen_image (free models only: sana,turbo,zimg)  │
│    gen_qrcode          ← npm qrcode (local)      │
│    gen_diagram         ← mermaid.ink (free API)   │
│    gen_palette         ← calcul HSL (local)       │
│    file_to_url         ← litterbox.catbox.moe     │
│    remove_background   ← cut.esprit-artificiel    │
│    extract_frames      ← @ffmpeg/ffmpeg (wasm)    │
│                                                  │
├─────────────────────────────────────────────────┤
│              Avec clé API (Enter Universe)       │
│                                                  │
│  Text Provider: gen.pollinations.ai (inchangé)   │
│                                                  │
│  Tools additionnels (+5):                        │
│    gen_image (+ paid models: flux,imagen,gptimg)  │
│    gen_video (seedance, veo, ltx-2, wan, grok)   │
│    gen_audio (openai-audio, elevenlabs, whisper)  │
│    gen_music (elevenmusic)                        │
│    deepsearch (perplexity-reasoning)              │
│    search_crawl_scrape (perplexity, nomnom)       │
│                                                  │
└─────────────────────────────────────────────────┘
WARNING

tool: {} est injecté une seule fois au return du plugin. Après /poll connect, l'utilisateur doit redémarrer OpenCode pour que les tools Enter apparaissent. Un toast d'avertissement le guidera.

2. Les 12 Tools
Catégorie A — Pollinations (6 tools)
Tool	Univers	Description	Endpoint
gen_image	Free + Enter	Image generation	GET image.pollinations.ai (free) / POST gen.pollinations.ai (enter)
gen_video	Enter only	Video generation	gen.pollinations.ai/video/models
gen_audio	Enter only	TTS + STT	gen.pollinations.ai/openai/v1/audio/*
gen_music	Enter only	Music generation	elevenmusic via gen.pollinations.ai
deepsearch	Enter only	Deep research	perplexity-reasoning via chat completions
search_crawl_scrape	Enter only	Web search + scrape	perplexity-fast + nomnom via chat completions
Catégorie B — Utilitaires Design (3 tools, FREE)
Tool	Dépendance	Description
gen_qrcode	npm qrcode (~50 lignes)	QR codes PNG depuis texte/URL/WiFi
gen_diagram	API mermaid.ink (gratuit, no auth)	Mermaid → SVG/PNG
gen_palette	Calcul local HSL (~80 lignes)	Palettes couleurs harmonieuses + SVG
Catégorie C — Power Tools (3 tools, FREE)
Tool	Service	Détail testé
file_to_url	litterbox.catbox.moe ✅	Upload anonyme, expiry 1h-72h, URL directe, testé OK
remove_background	cut.esprit-artificiel.com ✅	Ton rembg-api (POST /remove), queue+rate-limit côté tool
extract_frames	@ffmpeg/ffmpeg (wasm) ✅	Zéro dépendance système, ~8MB wasm, extraction at_time/range
3. Mode & Comportement par Tool
Logique interne à chaque tool au moment de execute() :

typescript
// Pseudo-code commun à tous les tools Pollinations payants
async execute(args, context) {
    const config = loadConfig();
    const modelInfo = await discoverModel(args.model);
    
    // GATE 1: Mode check
    if (config.mode === 'alwaysfree' && modelInfo.paid_only) {
        return `❌ Modèle "${args.model}" est 💎 Paid Only. Mode: alwaysfree.\n` +
               `💡 Utilisez /pollinations mode pro ou manual`;
    }
    
    // GATE 2: Cost confirmation (manual mode)
    if (config.mode === 'manual' || modelInfo.paid_only) {
        const cost = estimateCost(modelInfo, args);
        await context.ask({
            permission: `pollinations.generate`,
            patterns: [],
            always: [`pollinations.${args.model}`],
            metadata: { model: args.model, cost: `${cost} 🌻`, action: "Generate" }
        });
    }
    
    // GATE 3: Execute
    // ...
}
Mode	Free models	Free-tier models	💎 Paid Only
alwaysfree	✅ direct	✅ direct	❌ bloqué
manual	✅ direct	✅ + confirm cost	✅ + confirm cost
pro
✅ direct	✅ direct	✅ direct
4. Tier System Update
Nouveau tier Microbe à ajouter
diff
| Tier | Grant | Requirement |
 | :--- | :--- | :--- |
+| **🦠 Microbe** | **0.1 Pollen/day** | Sign Up |
 | **🍄 Spore** | **1 Pollen/day** | Auto-verified |
 | **🌱 Seed** | **3 Pollen/day** | Active GitHub (8+ points) |
 | **🌸 Flower** | **10 Pollen/day** | Publish an App |
 | **🍯 Nectar** | **20 Pollen/day** | Major Contributors |
Fichiers impactés : 
README.md
, 
commands.ts
 (affichage /pollinations usage), 
toast.ts
 (icône tier)

5. Proposed Changes
New npm dependencies
json
{
  "dependencies": {
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
@ffmpeg/ffmpeg et @ffmpeg/core seront en optional peer dependency car ~8MB. Le tool extract_frames détecte la présence et propose npm install si absent.

New files (17)
src/
├── tools/
│   ├── index.ts              ← [NEW] Tool registry + conditional injection
│   ├── discovery.ts           ← [NEW] Dynamic model fetcher per modality
│   ├── estimator.ts           ← [NEW] Cost calculation from pricing API
│   ├── storage.ts             ← [NEW] File save + auto-naming + directory
│   ├── mode-guard.ts          ← [NEW] Mode checks (alwaysfree/manual/pro)
│   │
│   ├── pollinations/
│   │   ├── gen_image.ts       ← [NEW] Free GET + Paid POST image
│   │   ├── gen_video.ts       ← [NEW] Video (seedance, veo, ltx-2, wan)
│   │   ├── gen_audio.ts       ← [NEW] TTS/STT (openai-audio, elevenlabs)
│   │   ├── gen_music.ts       ← [NEW] Music (elevenmusic)
│   │   ├── deepsearch.ts      ← [NEW] Deep research (perplexity-reasoning)
│   │   └── search_crawl_scrape.ts ← [NEW] Web search (perplexity, nomnom)
│   │
│   ├── design/
│   │   ├── gen_qrcode.ts      ← [NEW] QR Code (npm qrcode)
│   │   ├── gen_diagram.ts     ← [NEW] Mermaid → SVG (mermaid.ink)
│   │   └── gen_palette.ts     ← [NEW] Color palette (local HSL)
│   │
│   └── power/
│       ├── file_to_url.ts     ← [NEW] Upload → URL (litterbox.catbox.moe)
│       ├── remove_background.ts ← [NEW] Rembg (cut.esprit-artificiel.com)
│       └── extract_frames.ts  ← [NEW] Video frame extraction (ffmpeg.wasm)
Modified files
[MODIFY] 
index.ts
Import createToolRegistry() from ./tools/index.js
Add tool: createToolRegistry(config, hasKey) to returned Hooks
[MODIFY] 
commands.ts
Update /pollinations usage display with 🦠 Microbe tier
Add tier icon mapping
[MODIFY] 
README.md
Add Microbe tier
Add V6 Tools section with all 12 tools
Update version to 6.0.0-beta.1
[MODIFY] 
package.json
Add qrcode dependency
Add @ffmpeg/ffmpeg and @ffmpeg/core as optional peer deps
6. Services Testés
Service	Test	Résultat	Notes
litterbox.catbox.moe	curl upload	✅ https://litter.catbox.moe/df6sxc.txt	Expiry: 1h, 12h, 24h, 72h
0x0.st	curl upload	❌ 403 "User agent not allowed"	Bloqué même avec custom UA
cut.esprit-artificiel.com	curl /remove	✅ 405 (méthode GET, attend POST)	API alive, needs POST + image
mermaid.ink	N/A	✅ Connu, public, no auth	GET avec base64 du diagramme
@ffmpeg/ffmpeg	npm search	✅ Viable en Node.js via wasm	~8MB core, pas de install système
7. Verification Plan
Phase 1 — Bonus Tools (standalone, testable immédiatement)
bash
# Test unitaire pour chaque bonus tool
node scripts/test_bonus_tools.js
# 1. gen_qrcode → vérifie PNG généré avec checksum
# 2. gen_diagram → vérifie SVG retourné par mermaid.ink
# 3. gen_palette → vérifie codes hex corrects
# 4. file_to_url → vérifie URL retournée par litterbox
# 5. remove_background → vérifie réponse de cut.esprit-artificiel.com
# 6. extract_frames → vérifie extraction d'un frame (petit MP4 test)
Phase 2 — Pollinations Tools (avec tests API)
bash
# Réutilise les scripts de test de la Phase 1 (API Discovery)
node scripts/test_gen_image_free.js   # Free universe, pas de clé
node scripts/test_gen_image_enter.js  # Enter, avec clé
node scripts/test_gen_video.js        # Video models
Phase 3 — Injection et Modes
bash
node scripts/test_tool_injection.js
# Sans clé → 7 tools
# Avec clé → 12 tools
# Mode alwaysfree → paid models bloqués
# Mode manual → cost confirmation triggered
Manual TUI Verification
Franck teste dans OpenCode TUI après chaque phase :

/tools → compte le nombre de tools
Utilise gen_qrcode et gen_diagram (free, sans risque)
/poll connect → restart → vérifie les tools Enter
