# 🌸 Pollinations AI Plugin for OpenCode

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <br><br>
  <b>The most complete bridge between OpenCode and the Pollinations.ai ecosystem.</b><br>
  Free AI models, multimodal generation, and smart quota management — directly in your editor.
  <br><br>

![Version](https://img.shields.io/badge/version-6.1.0--beta-blue.svg)
![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?label=downloads&color=brightgreen)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Beta-orange.svg)
![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-purple.svg)

</div>

---

> **"No closed doors, no corporate hoops — just good tools and good people."**
>
> Pollinations.ai is an open-source platform built by and for the creative community. This plugin brings it entirely inside OpenCode: text, image, audio, video, music, diagrams, and more — with a transparent fallback system that means you're *never* blocked.

---

## ✨ What's New in v6.1-beta

The jump from v5.9 to v6.1 is not incremental. The plugin has grown from a smart proxy into a **full multimodal agent toolkit**:

- **15+ native tools** for generation, design, and media processing — usable directly in OpenCode's agent mode
- **Ledger quota system**: local `~/.pollinations/usage_history.json` tracking for 100% accurate usage with zero lag
- **Stealth notifications**: status toasts now only fire in relevant contexts, no more noise
- **Background removal** with multi-key rotation and automatic fallback to free provider
- **Video, music, audio generation** via the Pollinations API
- **Web search + scraping** integrated as agent tools

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g opencode-pollinations-plugin
```

Then in OpenCode:
```
/connect
```
Select **pollinations** → Enter your API key from [enter.pollinations.ai](https://enter.pollinations.ai), or leave blank to use the free tier.

Select any `pollinations/*` text model and start chatting. **No key required for text.**

> ⚠️ **Note:** Image generation (`gen_image`) requires a Pollinations API Key. Text models remain free.

> ⚠️ After connecting a new key, restart OpenCode once for the model list to update.

---

## 🌐 Free Universe — No Key Required

Access a wide range of models with **zero setup**, supported by Pollinations' ad model:

| Model | Speed | Context | Notes |
|-------|:-----:|:-------:|-------|
| `openai` / `openai-large` | Fast | 128k | GPT-4o class |
| `gemini` / `gemini-search` | Fast | 1M | Google Gemini |
| `mistral` / `qwen-coder` | Fast | 32k | Code-focused |
| `nova-fast` / `grok` | Very Fast | 32k | Quick tasks |
| `deepseek` / `kimi` | Medium | 128k | Reasoning |

> 💡 Using Gemini with tool calls? The plugin auto-detects incompatibilities and transparently falls back to OpenAI — your workflow never breaks.

---

## 💎 Pro Mode — Unlock Premium Models

Connect your [Pollinations API key](https://enter.pollinations.ai) to access enterprise-grade models charged in **Pollen** (the unified credit, ~$1 = 1 Pollen):

| Model | Provider | Notes |
|-------|----------|-------|
| `claude` / `claude-large` | Anthropic | Requires wallet credits |
| `gemini-large` | Google | Requires wallet credits |
| `gpt-4o` / `openai-large` | OpenAI | Daily grant available |
| `deepseek-coder` | DeepSeek | Daily grant available |

### 🛡️ Safety Net — You're Never Blocked

If your quota or wallet runs low mid-session, the plugin switches automatically to a free model, injects a visible warning in the response stream, and continues. No errors. No broken sessions.

---

## 🔧 Agent Tools (v6.1 — New)

When OpenCode uses the plugin in agent mode, it gets access to a rich toolbox organized in three categories:

### 🎨 Pollinations Generation Tools

These tools call the Pollinations APIs directly, enabling the AI to generate media as part of its reasoning:

| Tool | Description |
|------|-------------|
| `gen_image` | Generate images from a text prompt (Flux, SDXL, etc.) **[Requires Key]** |
| `gen_audio` | Generate speech or sound effects |
| `gen_music` | Generate music from a description |
| `gen_video` | Generate short video clips |
| `transcribe_audio` | Transcribe an audio file to text |
| `deepsearch` | Multi-step AI-powered research |
| `search_crawl_scrape` | Web search with full page scraping |
| `beta_discovery` | Probe undocumented model parameters (400 validation extraction) |

### 🖌️ Design Tools

| Tool | Description |
|------|-------------|
| `gen_diagram` | Generate diagrams (flowcharts, architecture, etc.) |
| `gen_palette` | Create color palettes from a description or image |
| `gen_qrcode` | Generate styled QR codes |

### ⚡ Power Tools

| Tool | Description |
|------|-------------|
| `remove_background` | Remove image backgrounds (free or BackgroundCut HD) |
| `rmbg_keys` | Manage BackgroundCut API keys with rotation |
| `extract_audio` | Extract the audio track from a video file |
| `extract_frames` | Extract frames from a video at a given interval |
| `file_to_url` | Upload a local file and return a public URL |

> **Background Removal** supports multi-key rotation: if one BackgroundCut key is exhausted or rate-limited, the plugin automatically rotates to the next available key, then falls back to the free provider if all keys fail.

---

## 👁️ Vision Support

Paste images directly into the chat or use an image URL. The plugin handles encoding automatically.

| Model | Vision | Reasoning | Tools |
|-------|:------:|:---------:|:-----:|
| `openai` / `openai-large` | ✅ | — | ✅ |
| `gemini` / `gemini-search` | ✅ | — | ✅ |
| `claude` / `claude-large` | ✅ | — | ✅ |
| `kimi` | ✅ | ✅ | — |
| `openai-audio` | ✅ | — | ✅ |

---

## 💰 Understanding Pollen & Tiers

**Pollen** is Pollinations' unified credit system. **$1 ≈ 1 Pollen.**

Every registered user receives a **daily Pollen grant** based on their tier:

| Tier | Daily Grant | Requirement |
|:-----|:------------|:------------|
| 🦠 **Microbe** | 0.1 Pollen | Flagged accounts |
| 🌱 **Spore** | 1 Pollen | Sign up |
| 🌿 **Seed** | 3 Pollen | Active GitHub dev (8+ points) |
| 🌸 **Flower** | 10 Pollen | Published app |
| 🍯 **Nectar** | 20 Pollen | Major contributor |

> 🌸 Publishing this plugin to the OpenCode ecosystem earned its author **Flower** tier (10 Pollen/day). [Register here to claim yours.](https://enter.pollinations.ai)

Certain models (`claude-large`, `gemini-large`, `veo`, `seedream-pro`) are **Paid-Only**: they require wallet credits on top of (or instead of) daily grants.

---

## 📊 Commands

```
/pollinations usage          # View Pollen balance + tier status
/pollinations usage full     # Detailed per-model breakdown
/pollinations mode [manual|alwaysfree|pro]   # Change routing mode
/pollinations status         # Plugin health check
/pollinations config [key] [value]   # Read or write config values
/pollinations fallback <main> [agent]  # Configure fallback models
/pollinations help           # Full command reference
```

Aliases: `/poll` works as a shorthand for all commands.

### Config Keys

| Key | Values | Description |
|-----|--------|-------------|
| `status_gui` | `none` / `alert` / `all` | Toast verbosity |
| `logs_gui` | `none` / `error` / `verbose` | Technical log verbosity |
| `threshold_tier` | `0-100` | Alert threshold for tier (%) |
| `threshold_wallet` | `0-100` | Safety Net trigger ($) |
| `status_bar` | `true` / `false` | Status bar widget |

---

## 🔑 API Key Types

| Type | Access |
|------|--------|
| **Standard (`pk_...`)** | Full access: models, usage dashboard, quota |
| **Limited** | Generation only. Dashboard shows a restriction alert. The plugin auto-switches to Manual mode to avoid quota errors. |
| **Legacy (`sk_...`)** | Accepted for backward compatibility |

---

## 🛠️ Routing Modes

| Mode | Behavior |
|------|----------|
| `manual` | You choose the model, no automatic switching |
| `alwaysfree` | Only free models, never charges Pollen |
| `pro` | Enterprise models with automatic free fallback when quota/wallet is low |

---

## 🏗️ Architecture (Summary)

The plugin runs a **local HTTP proxy** on a dynamically assigned port (system port 0 — no conflicts, cross-platform). OpenCode points its `pollinations` provider at this proxy. The proxy reads your config, checks quota, applies model-specific sanitizations, and forwards requests to the correct Pollinations endpoint.

```
OpenCode TUI
    │  POST /v1/chat/completions
    ▼
Local Proxy (Dynamic Port)
    ├── Safety Net Logic (quota check, fallback)
    ├── Model Sanitization (Azure/Vertex/Gemini/Kimi)
    └── Route to:
        ├── text.pollinations.ai  (Free Universe)
        └── gen.pollinations.ai   (Enterprise Universe)
```

Config is read from (highest priority first):
1. `~/.pollinations/config.json`
2. `~/.local/share/opencode/auth.json`
3. `~/.config/opencode/opencode.json`

---

## 🗺️ Roadmap

### ✅ Shipped (v5.x → v6.1-beta)
- Free + Enterprise proxy with transparent fallback (Safety Net)
- Dynamic port allocation — cross-platform (no more `fuser`, no port conflicts)
- Pollen/tier quota tracking with local Ledger
- Agent tools: image, audio, music, video generation
- Agent tools: web search, scraping, deep research
- Design tools: diagrams, palettes, QR codes
- Power tools: background removal with key rotation, frame/audio extraction
- Stealth notification mode (toasts only in relevant sessions)
- Limited-key support with automatic mode switching
- Gemini tools auto-fallback to OpenAI
- Enterprise schema sanitization (Azure, Vertex, Bedrock, Kimi)

### 🔜 Next (v6.2 — v6.5, 2026)
- **Config file watcher** — hot-reload without restarting OpenCode
- **Signature map rotation** — LRU eviction to prevent unbounded memory growth
- **Unit tests** — coverage for `proxy.ts`, `quota.ts`, `tools/`
- **`/poll status` one-liner** — faster than opening the dashboard
- **Structured logging** — JSON format, configurable log levels, log rotation
- **Model search** — `/poll models <query>` to filter the model list

### 🔭 Longer Term (v7.0+, 2027)
- **Smart Router** — cost-aware and latency-aware model selection
- **Multi-provider failover** — fallback to OpenRouter if Pollinations is unreachable
- **Web Dashboard** — browser UI for monitoring, config, and analytics
- **Team features** — shared quotas and API keys
- **Persistent memory** — vector DB integration for long-running agents

> Community ideas with the most votes: API usage alerts, conversation export (Markdown/JSON), model comparison mode. Open an issue to vote!

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code guidelines, and priority areas (testing, docs, i18n, DevOps).

### Areas Where Help Is Needed
- 🧪 **Testing** — Unit + integration tests for the proxy and tools
- 📚 **Docs** — User guides, tool examples
- 🌍 **i18n** — French/English consistency, German and Spanish translations
- 🎨 **UX** — Command output formatting improvements

---

## 🔗 Links

| Resource | Link |
|----------|------|
| Sign up for Pollinations (free tiers + paid models) | [enter.pollinations.ai](https://enter.pollinations.ai) |
| Pollinations website | [pollinations.ai](https://pollinations.ai) |
| Pollinations GitHub | [github.com/pollinations/pollinations](https://github.com/pollinations/pollinations) |
| Discord community | [Join us!](https://discord.gg/pollinations-ai-885844321461485618) |
| OpenCode ecosystem | [opencode.ai/docs/ecosystem](https://opencode.ai/docs/ecosystem#plugins) |
| Plugin author | [@fkom13](https://github.com/fkom13) |

---

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
