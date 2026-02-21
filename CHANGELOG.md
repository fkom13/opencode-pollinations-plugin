# 📋 Changelog — OpenCode Pollinations Plugin

All notable changes to this project are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versioning: [SemVer](https://semver.org/).

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
