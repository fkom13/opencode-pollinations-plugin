# 📋 Changelog — OpenCode Pollinations Plugin

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning: [SemVer](https://semver.org/).

---

## [6.3.0] — 2026-07-01

### ✨ Nouvelles Fonctionnalités

- **🎯 Quêtes (Gamification Pollinations)** : Nouvel outil `polli_quests` + commande `/poll quests`. Affiche vos quêtes par catégorie et le **Pollen gratuit à réclamer** (lecture `/account/quests`). Utiliser simplement le plugin complète plusieurs quêtes rétroactivement.
- **🆓 `gen_edit_image_free`** : Génération ET édition d'images **toujours gratuites, sans clé** (~20/jour), accessibles à n'importe quel modèle OpenCode. Support 1-3 images en entrée (chemin local, URL ou data URI).
- **🆓 `gen_video_free`** : Génération vidéo **gratuite, sans clé** (~5/jour), avec image de première frame et audio optionnels. Flux asynchrone (poll de job).
- **🔐 Device Login** : Nouvelle commande `/poll login` + outil `polli_login` (connexion en 1 clic type `gh auth login`). Ouverture navigateur automatique, poller de fond, mode `wait` pour l'agent, attribution à l'app via `client_id`. Guide de création de clé intégré (Profile+Usage, budget/expiry).
- **🇨🇳 Chinois (zh)** : Ajout complet de la 6ème langue runtime. L'interface est désormais disponible en `en, fr, es, de, it, zh`.

### 🛠 Fixes & Corrections

- **Tiers alignés sur l'API officielle** : Ajout de `router` (🐝 10/h) et `anonymous`, correction de `microbe` (0/h). Correction du crash sur `nextResetAt: null` (tiers sans refill) et des dates invalides.
- **Suppression de la table `TIER_LIMITS` fantôme** (anciennes valeurs journalières 10/20) source de dérive, et alignement de `calculateResetDate` sur le système horaire.
- **Narration des tiers corrigée** : Remplacement de la mécanique obsolète (dev points / publish app, supprimée par Pollinations) par la logique **Quêtes**. Onboarding refait dans les 6 langues.
- **i18n** : Câblage réel des conditions de tiers par langue (affichaient l'anglais en dur), + audit de parité (389 clés alignées sur les 6 langues).

---

## [6.2.7.1] — 2026-04-02

### ✨ Nouvelles Fonctionnalités & Refontes
- **API Explorer V4 (Defense-in-Depth)** : Refonte complète de `beta_discovery.ts` avec 4 niveaux de sécurité anti-facturation. Introduction de `search_schema` (recherche OpenAPI full-text locale), `list_models_registry` (introspection 100% locale silencieuse), `fuzz_parameter` (whitelist + injection de valeurs corrompues/sabotage) et `probe_missing` (retrait strict de payloads pour discovery d'erreurs d'API contrôlées).
- **Merge V1 OpenAPI Haute Fidélité** : Intégration de l'Endpoint `/v1/models` au sein du `fetcher.ts`, injectant et superposant dynamiquement les métadonnées `input_modalities`, `context_length` et support multimodal réel plutôt que des fallbacks statiques hasardeux.

### 🛠 Fixes & Optimisations
- **Sécurisation de l'Hydratation Asynchrone** : Le chargement `ModelRegistry.refresh()` est désormais unitairement bloquant au startup, garantissant que 100% des modèles médias et textes soient provisionnés avant que OpenCode ne monte la Dropdown de modèles ou exécute les agents.
- **Fallback Universel et Résilience** : Sécurisation absolue sur le endpoint gratuit `text.pollinations.ai` pour les chutes sans quota, et rafraîchissement d'isolation sur `cache.ts` pour une meilleure bascule hors ligne.

---

## [6.2.4] — 2026-03-28

### 🔄 Major Change — Hourly Quota System (Pollinations API Update)

**Breaking Change**: Pollinations.ai has migrated from a **daily** to an **hourly** quota reset system. This update adapts the plugin to the new economic model.

#### 📊 New Tier Limits (Hourly Reset)

| Tier | Old (Daily) | **New (Hourly)** | Factor |
|------|-------------|------------------|--------|
| 🦠 Microbe | 0.1/day | **0.01/hour** | ×0.024 |
| 🍄 Spore | 1/day | **0.01/hour** | ×0.024 |
| 🌱 Seed | 3/day | **0.15/hour** | ×0.075 |
| 🌸 Flower | 10/day | **0.40/hour** | ×0.04 |
| 🍯 Nectar | 20/day | **0.80/hour** | ×0.04 |

#### 🛠 Technical Changes

- **`src/server/quota.ts`**: 
  - Replaced `ONE_DAY_MS` constant with `ONE_HOUR_MS` (60 * 60 * 1000)
  - Updated `TIER_LIMITS` to reflect new hourly quotas
  - `calculateResetInfo()` now computes time since last hour reset instead of daily reset
  
- **`src/server/quota.ts` Line 262**: Progress percentage now calculated against 1-hour window instead of 24-hour window

#### 📈 Impact on Users

- **More Frequent Resets**: Quotas now refresh every hour at :00 (visible via `/poll usage`)
- **Better Distribution**: Prevents quota exhaustion spikes; smoother usage throughout the day
- **SafetyNet Adaptation**: The `alwaysfree` mode automatically switches to free tier when >10% of hourly quota is consumed
- **Wallet Usage**: Free tier quota is consumed first; wallet balance used only when quota is insufficient

#### 📝 Documentation Updates

- Updated README.md with new tier table and hourly reset explanations
- Added warnings about hourly reset system
- Clarified distinction between free tier (hourly) and wallet (persistent)

---

## [6.1.0-beta.31] — 2026-02-27

### 🛠 Fix — Affichage des paramètres Agent (polli_config)
- **Toast Configs (UI)** : Correction du formatage de notification pour les modifications agentiques complexes. Les objets imbriqués transmis par l'IA (comme `thresholds`) sont désormais correctement encodés en texte lors de l'affichage dans la barre de statut *(fini le `[object Object]`)*.

---

## [6.1.0-beta.30] — 2026-02-27

### 🛠 Architecture & Agent — Alignement final des concepts et Nettoyage
- **Suppression du Mock (pollimock)** : Le modèle virtuel `Command Handler (Virtual)` et le hook exclusif sur `pollimock-handler` (dans `index.ts` et `proxy.ts`) ont été définitivement supprimés car obsolètes. L'Agent d'aide utilise exclusivement le handler `pollinations/connect` (🌸 Pollinations — Guide & Connexion).
- **Recadrage Sémantique de `polli_config`** : Suite aux erreurs de compréhension persistantes chez l'Agent Kimi (assimilation du "mode" à un statut "payant/gratuit" sur les tools ou de `enter.agent` à la génération média), la taxonomie a été une nouvelle fois durcie :
  - `enter.agent` et `free.agent` : Explicitée comme étant *uniquement* dédiés au raisonnement logique, JAMAIS pour générer des images ou des vidéos.
  - `enablePaidTools/costConfirmation` : Repositionnée sur l'impact de coût estimé via le Pollen (`costThreshold`) et non sur une distinction "Outil de base" / "Outil payant". S'active **dès qu'un outil engage du wallet ou du tier** au -delà du `costThreshold`.
- **Mise à jour Documents** : Les documentations publiques (`README.md` et `TECHNICAL_MANUAL.md`) ont été mises à jour pour acter la séparation en 3 piliers (Chat, Tools, UI) des paramètres de configuration.

---

## [6.1.0-beta.29] — 2026-02-27

### 🤖 Agent System — Refonte Sémantique Majeure (Chat vs Tools)
- **Séparation Conceptuelle Stricte** : La description du tool `polli_config` a été entièrement réécrite pour forcer l'IA à scinder sa compréhension en 3 catégories indépendantes :
  1. `CHAT MODELS & FALLBACKS` (gère le `mode` et les seuils d'avertissement `thresholdsTier` / `thresholdsWallet` qui déclenchent les fallbacks du chat).
  2. `TOOLS PROTECTION` (gère indépendamment l'activation `enablePaidTools`, les versements `costConfirmationRequired` et l'affichage `costEstimator` pour les tools de génération).
  3. `UI & NOTIFICATIONS` (gère la `statusBar`).
  *L'Agent ne fera plus jamais l'amalgame entre le Mode du Chat et l'activation des Outils Payants.*
- **Toasts Exhaustifs** : La notification système générée lors d'une modification agentique affiche désormais la clé ET sa nouvelle valeur *(ex: Configuration modifiée par l'Agent (mode=manual, enablePaidTools=false))*.

---

## [6.1.0-beta.28] — 2026-02-27

### 🛠 UI & Commandes — Refonte du tableau `/poll config`
- **Version Dynamique** : Le tableau markdown renvoyé par la commande `/poll config` affiche de nouveau la version exacte du plugin.
- **Homogénéisation des Alias** : Toutes les commandes listées dans `/poll config` et `/poll help` utilisent désormais l'alias court `/poll` par défaut (et mentionnent que `/pollinations` reste valide) pour plus de clarté.
- **Correction Clé Configuration** : L'option `costConfirmation` affichée dans le tableau a été corrigée en `costConfirmationRequired` pour correspondre à la véritable clé de l'API.

---

## [6.1.0-beta.27] — 2026-02-27

### 🤖 Agent System — Affinements de `polli_config`
- **Correction Sémantique du 'Mode'** : Mise à jour de la description de l'argument `mode` pour avertir fermement l'IA que sa modification n'impacte ni les droits d'accès ni l'activation des outils payants. La distinction avec les autres paramètres est dorénavant explicite et empêchera les hallucinations logicelles constatées chez certains LLMs (ex: Kimi).
- **Toasts Détaillés** : Lors de la modification silencieuse d'un paramètre, la notification visuelle (`emitStatusToast`) liste maintenant textuellement le(s) paramètre(s) touché(s) entre parenthèses *(ex: Configuration modifiée par l'Agent (costConfirmationRequired))*.

---

## [6.1.0-beta.26] — 2026-02-27

### 🤖 Agent System — Upgrade `polli_config`
- **Seuils en Pourcentage** : L'outil `polli_config` gère désormais `thresholdsTier` et `thresholdsWallet` explicitement en mode pourcentage (0-100%) rendant l'interface compatible avec le système de protection des portefeuilles.
- **Visual Feedback** : Toute modification de la configuration par l'agent déclenche désormais un toast visuel discret s'affichant dans la barre d'état OpenCode (`emitStatusToast`) pour alerter l'utilisateur d'un changement de règle effectué en arrière plan.

---

## [6.1.0-beta.25] — 2026-02-27

### 🤖 Agent System — Outil de Configuration Autonome (`polli_config`)
- **Nouvel Outil `polli_config`** : Ajout d'un outil exclusif aux agents (disponible si clé API renseignée) leur permettant de lire (`action: view`) ou modifier (`action: update`) la configuration du plugin à la volée.
- **Guidage IA Avancé** : L'outil intègre des descriptions systémiques ultra-pédagogiques pour empêcher l'Agent de faire des contresens (ex: séparer le concept de "Mode Manuel" du paramètre `costEstimator` et `costConfirmationRequired`).
- Gestion en direct via l'Agent des paramètres : `mode`, `costEstimator`, `statusBar`, `costConfirmationRequired`, `enablePaidTools`, `costThreshold`.

---

## [6.1.0-beta.24] — 2026-02-27

### 🔐 Sécurité & Optimisation — Rembg API (Sprint 3)
- **Fast-Lane & Anti-Leech HMAC** : Le tool `remove_background` n'embarque plus la clé API statique. Il génère désormais une signature asymétrique HMAC (`Authorization: Bearer community:sha256`) avec un jeton d'expiration de 60 secondes pour les appels communautaires (leech-blocker). 
- **Compatibilité VIP Absolue** : Détection silencieuse du fichier `~/.config/opencode/cut_vip.json`. Les développeurs disposant de leur propre instance et clé récupèrent l'accès immédiat (Header `X-Api-Key` old-school bypassant la file d'attente HMAC côté serveur).
- **Historique GitHub Nettoyé** : Les anciennes versions (`beta.1` à `beta.22`) stockant accidentellement la clé API en clair ont été purgées et écrasées (git filter-branch force-push). Seule la branch `v6-beta` propre subsiste.

---

## [6.1.0-beta.23] — 2026-02-27

### 🔐 Sécurité & Optimisation — Rembg API (Sprint 3)
- **Fast-Lane & Anti-Leech HMAC** : Le tool `remove_background` n'embarque plus la clé API statique. Il génère désormais une signature asymétrique HMAC (`Authorization: Bearer community:sha256`) avec un jeton d'expiration de 60 secondes pour les appels communautaires (leech-blocker). 
- **Compatibilité VIP Absolue** : Détection silencieuse du fichier `~/.config/opencode/cut_vip.json`. Les développeurs disposant de leur propre instance et clé récupèrent l'accès immédiat (Header `X-Api-Key` old-school bypassant la file d'attente HMAC côté serveur).
- **Historique GitHub Nettoyé** : Les anciennes versions (`beta.1` à `beta.22`) stockant accidentellement la clé API en clair ont été purgées et écrasées (git filter-branch force-push). Seule la branch `v6-beta` propre subsiste.

---

## [6.1.0-beta.22] — 2026-02-26

### ✨ Refonte Majeure — Moteur de Quotas et Timezone (Sprint 2)
- **Suppression du Ledger Local** : Le système de cache lourd et capricieux `usage_history.json` a été entièrement supprimé.
- **Smart Fetch API** : Remplacé par une boucle récursive interrogeant l'API `/account/usage?limit=100&offset=x` jusqu'à isoler mathématiquement la consommation unique de la journée. Les commandes `/poll usage full` utilisent désormais ce système paginé sans limite à 100 requêtes.
- **Correction Timezone Absolue** : Le calcul du reset ne bidouille plus l'heure locale, il prend simplement `nextResetAt - 24h` (UTC) en source de vérité API inébranlable.
- **Calcul Strict Wallet/Freetier** : La consommation payante du Wallet est maintenant déduite de la soustraction pure : `Balance Totale Pollinations - Crédits FreeTiers restants`. Sync garantie à 100% avec le compte réel.

### ✨ Refonte — Pricing Dynamique (Sprint 1.5)
- **Statistiques Tinybird** : Le `fetcher.ts` récupère désormais en parallèle les métriques d'usage des modèles via `/api/model-stats` pour injecter un `averageCost` empirique dans le `ModelRegistry`.
- **Cost Guard (Max x3)** : Les modèles facturés aux tokens (texte, audio) bénéficient d'un garde-fou x3 sur l'estimateur de coût. Les rapports d'outils génératifs intègrent désormais dynamiquement le "Max théorique".

---

## [6.1.0-beta.18] — 2026-02-20

### 🐛 Fixed — UX Cleanups
- Removed experimental TUI prompt injection (`client.tui.appendPrompt`) which caused display issues without returning visible tool feedback in the OpenCode chat.
- Restored text-only guidance for `polli_gen_confirm` tool to ensure the agent asks the user directly for validation.

---

## [6.1.0-beta] — 2026-02-18

This release transforms the plugin from a smart proxy into a full multimodal agent toolkit. OpenCode's agent mode now has native access to Pollinations APIs and media processing tools.

**Pollinations Generation Tools** (`src/tools/pollinations/`)
- Added `gen_image` — generate images from a text prompt (Flux, SDXL, etc.)
- Added `gen_audio` — generate speech and sound effects
- Added `gen_music` — generate music from a description
- Added `gen_video` — generate short video clips
- Added `transcribe_audio` — transcribe a local audio file to text
- Added `deepsearch` — multi-step AI-powered deep research
- Added `search_crawl_scrape` — web search with full-page scraping

**Design Tools** (`src/tools/design/`)
- Added `gen_diagram` — generate flowcharts, sequence diagrams, architecture diagrams
- Added `gen_palette` — create color palettes from a description or image
- Added `gen_qrcode` — generate styled QR codes

**Power Tools** (`src/tools/power/`)
- Added `remove_background` — background removal with free and BackgroundCut HD providers
- Added `rmbg_keys` — manage BackgroundCut API keys (`list`, `add`, `remove`, `clear`) with round-robin rotation
- Added `extract_audio` — extract audio track from a video file
- Added `extract_frames` — extract frames from a video at a configurable interval
- Added `file_to_url` — upload a local file and return a public URL

**Background Removal — Key Rotation Logic**
- On `402` / `429` / `401` from BackgroundCut → automatically rotate to the next stored key
- If all keys exhausted and `provider=auto` → silent fallback to free provider
- If `provider=backgroundcut` explicitly set → throw instead of silent fallback
- Keys stored at `~/.pollinations/backgroundcut_keys.json`

### ✨ Added
- **Ledger quota system** — local `~/.pollinations/usage_history.json` tracks usage instantly. Replaces sole reliance on the 30s-cached API for dashboard display.
- **`src/server/status.ts`** — new module managing the OpenCode status bar via the `session.idle` hook. Shows current mode, tier, and Pollen balance after each response.
- **Stealth notification mode** — status toasts are now suppressed when the active session is not a Pollinations Enterprise (paid) session. Eliminates noise when switching between multiple providers.

### 🔧 Changed
- Tool registry now initialized at plugin startup and passed to OpenCode via `tool:` export key
- Tool count logged at startup: `[Tools] N tools registered`
- Provider name in OpenCode now includes version: `Pollinations AI (v6.1.0-beta)`

---

## [5.9.1] — 2026-01-28

### 🐛 Fixed — Enterprise Schema Sanitization

Critical interoperability fixes for enterprise model backends that enforce strict JSON schema constraints.

- **Azure / OpenAI**: Truncate tool list to 120 entries (hard API limit). Truncate `tool_call` IDs to 40 characters.
- **Vertex / Gemini**: Dereference `$ref` schemas inline. Disable `google_search_retrieval` flag.
- **Kimi / Moonshot**: Set `frequency_penalty: 1.1`, `presence_penalty: 0.4`, and anti-loop stop tokens (`["<|endoftext|>", "User:", "\nUser", "User :"]`)
- **Nova**: Cap output to 8000 tokens
- **Stop reason normalization**: Normalize all non-standard `finish_reason` values (`STOP`, `did_not_finish`, `finished`, `end_turn`, `MAX_TOKENS`) to either `stop` or `tool_calls` depending on context

### ✨ Added
- **Loop detection (Guillotine)**: If the response stream contains a line matching `\n\s*(User|user)\s*:`, the stream is immediately hard-stopped to prevent infinite agent loops

---

## [5.6.0] — 2025-12-10

### ✨ Added — Limited Key Support
- Detect API keys that allow generation but block `/account/usage` and `/account/profile` (returns 403/401)
- `keyHasAccessToProfile: false` stored in config when profile endpoints are inaccessible
- Mode is force-switched to `manual` for limited keys to skip quota verification
- Generation allowed: proxy intercepts quota 403s, emits a warning toast, and lets the request through
- Dashboard displays "Limited Key (Generation Only)" alert instead of crashing

### 🔧 Changed
- `/connect` command now performs a strict endpoint permission check before saving key
- Dashboard gracefully degrades when quota endpoints are unavailable

---

## [5.5.0] — 2025-11-20

### ✨ Added — Paid-Only Model Enforcement
- Models tagged `paid_only: true` (e.g. `gemini-large`, `veo`, `seedream-pro`) now require `walletBalance > 0`
- Daily Pollen grant (tier credits) cannot be used for paid-only models
- Proxy checks `paid_only` flag before routing — immediate fallback to free model if wallet is empty

### 🔧 Changed
- `QuotaStatus` interface extended with `isUsingWallet` and `canUseEnterprise` fields
- Quota cache TTL kept at 30 seconds; Ledger introduced in v6.1 for supplemental tracking

---

## [5.4.14] — 2025-11-05

### 🔧 Changed — Temporal Authority for API Key
- Config reader now compares `mtime` of `config.json` and `auth.json`
- The most recently modified file wins for API key resolution
- `opencode.json` remains a last-resort fallback only
- Eliminates key conflicts when both files exist

---

## [5.4.6] — 2025-10-15

### 🚀 Major — Cross-Platform Support + Dynamic Ports

- **Dynamic port allocation**: Proxy now calls `server.listen(0, '127.0.0.1')` and uses the OS-assigned port. No more hardcoded port 10001.
- **Removed `fuser -k`**: Linux-only zombie-killing logic removed entirely. Plugin is now truly cross-platform (Windows, macOS, Linux).
- **Removed `POLLINATIONS_PORT` env variable**: No longer needed; port communicated internally.
- **Gemini tools auto-fallback**: When Gemini returns a 401 on a tool-enabled request, automatically retries with OpenAI instead of failing

---

## [5.0.0] — 2025-09-01

### 🚀 Major — Safety Net System + Mode Architecture

- **Three routing modes**: `manual`, `alwaysfree`, `pro`
  - `manual`: user picks model, no automatic switching
  - `alwaysfree`: strictly free models, blocks paid routing
  - `pro`: enterprise models with automatic free fallback when quota is low
- **Transparent fallback**: on upstream `402`/`429`/`401`/`403` → switch to `fallbacks.free.main`, emit warning toast, inject warning message into stream, retry
- **Quota tracking**: reads `/account/profile`, `/account/balance`, `/account/usage` from `gen.pollinations.ai`
- **Tier system**: Spore (1), Seed (3), Flower (10), Nectar (20) Pollen/day
- **`/pollinations` CLI commands**: `usage`, `mode`, `fallback`, `config`, `help`
- **Configurable thresholds**: `threshold_tier` (%) and `threshold_wallet` ($) trigger Safety Net

### ✨ Added
- `src/server/quota.ts` — `QuotaStatus` interface and 30s-cached quota fetch
- `src/server/commands.ts` — command router + OpenCode `tui.command.execute` hook
- `src/server/toast.ts` — dual notification channels (`status`, `log`) with `none`/`alert`/`all` verbosity
- `src/server/config.ts` — `PollinationsConfigV5` schema, `loadConfig()`, `saveConfig()`
- `~/.pollinations/config.json` — persistent configuration file
- Config file watcher placeholder (not yet implemented — scheduled v6.2)

---

## [4.0.0] — 2025-07-10

### 🚀 Major — Modular Architecture + Enterprise Support

- Full rewrite into modular TypeScript structure (`src/server/`)
- Enterprise Universe support: `gen.pollinations.ai` with Bearer token auth
- Model prefix system: `free/` routes to Free Universe, `enter/` routes to Enterprise
- Toast notification system introduced
- `src/server/generate-config.ts` — dynamic model discovery from API at startup
- Model enrichment: auto-add `high_reasoning` variant for reasoning models, `safe_tokens` for Claude/Mistral/Llama

---

## [3.0.0] — 2025-05-01

### 🔧 Changed
- Architecture refactor: proxy logic extracted into separate module
- Improved error handling for upstream timeouts and malformed responses
- Basic streaming SSE support

---

## [2.0.0] — 2025-03-15

### ✨ Added
- OpenCode plugin API integration (`@opencode-ai/plugin`)
- `config()` hook for dynamic provider + model injection
- Support for `gemini-search` and `mistral` free models

---

## [1.0.0] — 2025-02-01

### 🎉 Initial Release
- Basic HTTP proxy to `text.pollinations.ai`
- Free Universe models: `openai`, `gemini`, `mistral`
- Static port 10001
- No authentication, no quota tracking
- Published to OpenCode ecosystem → earned **Flower tier** (10 Pollen/day)

---

## Planned

### [6.2.0] — Q2 2026
- `/pollinations models` and `/pollinations pricing` commands (spec complete — see `FEATURE_PRICING_MODELS_COMMANDS.md`)
- Config file watcher (hot-reload without restart)
- Signature map LRU eviction (cap at 1000 entries)
- Unit tests for `proxy.ts`, `quota.ts`, and `tools/`
- Structured logging (JSON format, log rotation at 10MB)
- `/poll status` one-liner command

### [7.0.0] — Q4 2026
- Smart Router: cost-aware and latency-aware model selection
- Multi-provider failover (OpenRouter fallback)

### [8.0.0] — 2027
- Web Dashboard
- Team features (shared quotas, API keys)
- Persistent memory (vector DB)

---

*Maintained by [@fkom13](https://github.com/fkom13) & the Pollinations community.*
