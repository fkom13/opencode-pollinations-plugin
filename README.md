# 🌸 Pollinations AI Plugin for OpenCode (v7.0.1)

> ⚠️ **Service update, November 2026.** The retired personal Pruna P-Video Playground is no longer available. `gen_video_free` may remain in published v6.5.5 but does not work and is removed in v7. `gen_edit_image_free` remains available; `polli_gen_video` requires Pollinations authentication and may cost Pollen.

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>The Ultimate Bridge between OpenCode and the Pollinations.ai Ecosystem.</h3>
  <p><em>Access a continuous universe of free basic AI models, or leverage premium enterprise models with our <b>Quest & Paid Pollen</b> system directly from your local terminal.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Philosophy: Open AI for Creators

> **"No closed doors, no corporate hoops — just good tools and good people."**

**Pollinations.ai** is an open-source platform created by and for the community. We offer a unified, direct API for generating **images, text, audio, video, and 3D**.

- 🌍 **Transparent**: Our code, roadmap, and discussions are fully public.
- ⚖️ **Fair Economy**: A single currency (**Pollen 🌻**) for all media and models. Predictable and transparent pricing. No vendor lock-in.

---

## 🚀 What's new in v7.0.0?

- 🔁 **OpenCode v1 + v2 dual-stack**: this independent community plugin, listed in the official Pollinations README, now supports both OpenCode generations. The installer preserves v1 `plugin` and v2 `plugins` conventions, while the runtime keeps one shared provider/tool core.
- **Real QA:** Cross-platform QA: five GitHub CI jobs passed (Ubuntu Node 18/20/22, Windows Node 22, macOS Node 22). Real OpenCode v2.2.5 loaded the plugin and its native /poll command on Windows/macOS. Without a Pollinations API key, gen_palette, gen_qrcode and gen_diagram generated real files on all three systems. Authenticated model-to-tool calls were separately verified on Linux, not claimed as fully tested on Windows/macOS.
- 🧠 **NEW polli_decision:** structured choice, score and noul decisions using compatible live decision models; billed calls require Cost Guard confirmation and a Pollinations key.
- ⚙️ **Agent-controlled polli_config:** inspect redacted settings or update chat mode, tool spending guards, v7 community/agent controls, agent budget, UI and timeouts.
- 🤖 **Hosted community agents remain selectable**: `agent:true` models stay in OpenCode’s model picker for backwards compatibility and are also available via `polli_agent` and `/poll agents [search]`. ⚠️ Direct chat calls can incur variable downstream Pollen; the dedicated Agent budget applies only to `polli_agent`.
- 💰 **Dedicated Agent budget**: `/poll config agent_budget <pollen>` controls a separate logical per-run safety envelope (default **0.60 🌻**). Hosted Prompt Agents are estimated conservatively against Pollinations' 8-model-step / 16-tool-call runtime bounds; unknown runtimes force confirmation. This is a local guard, **not** a server-side hard spending cap.
- 🌐 **Community models are first-class but controlled**: reliable community text models are exposed dynamically only when they advertise tool calling; `/poll config community on|off` controls their chat exposure.
- 🛡️ **Generalized Cost Guard**: confirmation tickets are registry-driven instead of hard-coded, STT/transcription is now protected, text-model costs use the correct category, and pending confirmations respect isolated XDG config roots.
- 🔐 **Clean v2 auth + free routing**: device login is isolated from v1 credentials, `/poll` is a native v2 command, and `free/*` calls no longer touch account/quota APIs before routing to the anonymous free universe.

---

## ✨ What's new in v6.5.5?

- ✂️ **Resilient no-key RMBG**: `remove_background` now uses **BGNinja (10/day/IP, max 2 simultaneous) → legacy BGEraser fallback → optional ClearBackdrop (own free key)**. BackgroundCut, key storage and `rmbg_keys` have been removed from the active plugin.
- 🖼️ **Free image gen/edit expanded**: 1–3 image editing, full ratios, custom 256–1440 dimensions, seed, prompt upsampling and edit turbo with live per-IP quota.
- 🧬 **Real media bytes win everywhere**: reverse image tools now persist JPEG/PNG/WebP according to magic bytes, fixing JPEG responses previously saved with `.png` names.
- 🌍 **Six-language convergence**: runtime strings, onboarding, README files and the maintained technical manual are aligned with the current free-tool behavior.

- 🧊 **3D Generation (`polli_gen_3d`)**: High-fidelity 3D model generation (`trellis-2`, `hyper3d-rodin`) as authentic provider-returned GLB/PLY assets with Cost Guard protection and cache recovery.
- 🛡️ **Zero Double-Billing**: Chat retries strictly constrained to 429; client timeouts and network interruptions never re-submit or duplicate token debits.
- 🧠 **Clean Reasoning Normalization**: Normalizes DeepSeek, Kimi, and Qwen reasoning streams — no internal thinking text leaks into the conversation.
- 💰 **Transparent Quest & Paid Semantics**: Modern billing modes (`quest`, `quest_only`, `paid`, `manual`) with absolute Pollen threshold safeguards.
- 📦 **Artifact Core (Magic Bytes)**: True binary file verification ensures image, video, audio, and 3D files are saved with their real file extension.
- ⏱️ **Configurable Timeout Hierarchy**: Fine-grained per-call, per-model, and per-capability timeout control via `/poll config timeouts.*`.
- 🎯 **Quests & 1-Click Device Login**: Automatic quest tracking (`/poll quests`) and instant browser login (`/poll login`).

---

## 🧰 Tools & Commands

Beyond text discussion, connecting your key gives OpenCode Agents access to our AI Media Tools powered by Pollinations models:

### 💎 Integrated Generative Tools (ENTER ONLY - requires API key)
- 🎨 `polli_gen_image` : State-of-the-art imagery models (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Powerful Text-to-Video and Image-to-Video models (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : High-quality 3D asset generation (`trellis-2`, `hyper3d-rodin`) with native GLB/PLY output.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Voice synthesis (ElevenLabs, OpenAI TTS) and Generative Music.
- 🎙️ `polli_stt` : High-flying voice transcription (Whisper V3).
- 🌐 `polli_web_search` : Connected Web & Specialized Search context (`gemini-search`, `perplexity...`).
- 🤖 `polli_agent` : Explicit delegation to Pollinations Managed Agents with a dedicated per-run Agent budget and conservative Cost Guard estimation.
- 🧠 `polli_decision`: structured `choice`, `score`, `noul` results from the live Pollinations decision-model catalog; requires a connected key and uses Cost Guard for billed decisions.
- ⚙️ `polli_config`: agent-facing `action=view|update` management for chat mode, paid-tool protections, community/Managed Agents, budget, timeouts, language and display. Requires a connected key.

### 🧰 Free Creator Bonus Tools (Always available — no API key needed)
- 🆓 `gen_edit_image_free` : Free image generation **and 1–3 image editing**, with live per-IP quota, full aspect ratios, custom 256–1440 dimensions, seed, prompt upsampling and edit turbo. No key.
- 🧹 `object_remover` : Remove objects by prompt for free; returned media is validated by magic bytes and saved with its real extension.
- 📐 `image_upscaler` : Free 2x/4x upscale; JPEG/PNG/WebP output is detected from real bytes, never assumed from the filename.
- ✨ `image_enhancer` : Free 1K/2K/4K enhancement (denoise, sharpen, restore), with real output-format detection.
- ✂️ `remove_background` : No-key background removal with resilient auto chain **BGNinja (10/day/IP, max 2 simultaneous) → legacy BGEraser fallback → optional ClearBackdrop (own free key)**. No paid provider, no key rotation; real output format/extension is auto-detected.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url`: Dev utilities.

### 💻 Complete List of Terminal Commands
Use the alias **`/poll`** or **`/pollinations`** anytime inside your conversation terminal:
- `/poll help` : Displays the interactive help table.
- `/poll login` : **1-click browser login** (device flow) — creates & connects a key automatically.
- `/poll connect <key>` : Bring Your Own Key (manual `sk_...`, permanent key).
- `/poll quests` : See your quests & free Pollen ready to claim. 🎯
- `/poll usage full` : Real-time dashboard (Stats), active Freetiers, and Wallet Balance.
- `/poll status` : Account status and balances (alias of /poll usage).
- `/poll config` : Finely adjust Cost Guards, Logs, Language, and Display.
- `/poll models` : Check the status of available Models.
- `/poll pricing` : View real-time unified pricing (Average Cost Estimate).
- `/poll fallback` : Define the ultimate Safety Net Chat model.
- `/poll infos` : Discover community rules and the leveling system.

---


### 🧠 v7 structured decisions and agent-controlled configuration

`polli_decision` calls the Pollinations decision endpoint, not an arbitrary chat/image/video model. Required: `state` (1–50,000 characters) and `questions_json` (JSON string containing 1–20 named questions, max 30,000 characters). Each question needs `type` and `instructions`. Supported types: `choice` (requires a `criteria` object), `score` and `noul` (probability of a yes/no proposition). Optional: `model` (decision-catalog ID or alias) and `allow_paid` (default false). Special case: `respan/span-01-lite` supports only `noul` with plain instructions.

The tool checks live model health and explicit zero-price metadata, never assumes unknown pricing means free. When a paid model is selected, set `allow_paid=true`; a separate approval through `polli_gen_confirm` remains mandatory. Cost Guard is a local estimate, not a server-side hard cap. A Pollinations API key with decision permission is required.

**polli_decision — JSON example:**

```json
{
  "state": "A customer support ticket reports that payments are failing.",
  "questions_json": "{\"urgent\": {\"type\": \"noul\", \"instructions\": \"Should the issue be escalated immediately?\"}}"
}
```

`polli_config` has two actions: `view` returns a redacted configuration; `update` applies only the provided fields. Supported parameters: `mode`, `costEstimator`, `statusBar`, `costConfirmationRequired`, `enablePaidTools`, `enableDeveloperTools`, `costThreshold`, `thresholdsQuest`, `thresholdsWallet`, `lang`; new v7 fields `communityModelsEnabled`, `managedAgentsEnabled`, `agentBudget` (0–1000 Pollen, excluding 0), `timeouts_json` (validated JSON) and `resetTimeouts`. Tool visibility or model selection may require a reload.

**polli_config — JSON update example:**

```json
{
  "action": "update",
  "communityModelsEnabled": true,
  "managedAgentsEnabled": true,
  "agentBudget": 0.6,
  "enablePaidTools": false,
  "costConfirmationRequired": true,
  "timeouts_json": "{\"default\": 300, \"capabilities\": {\"video\": 1800}}"
}
```

**New/important terminal commands** (available in v1/v2 as `/poll`):

- `/poll agents [search]` — List available hosted agents, with optional search
- `/poll config community on|off` — Expose or hide compatible community chat models
- `/poll config agents on|off` — Enable/disable Managed Agent tool exposure
- `/poll config agent_budget 0.60` — Set a separate logical per-delegation Agent budget in Pollen
- `/poll config enablePaidTools false` — Locally disable paid tools (not a guaranteed server spending cap)
- `/poll config costConfirmationRequired true` — Ask for explicit confirmation above the cost threshold
- `/poll config costThreshold 0.15` — Set the estimated tool confirmation threshold in Pollen
- `/poll config timeouts.default 300` — Set global timeout in seconds
- `/poll config timeouts.video 1800` — Set video timeout; also image, audio, threeD, realtime, embed
- `/poll config timeouts.model.MODEL_ID 900` — Set a model-specific timeout (MODEL_ID without dots)
- `/poll config timeouts.reset` — Reset timeout overrides to defaults
- `/poll mode quest|quest_only|paid|manual` — Set chat routing/billing policy; separate from tool Cost Guard

The production deployment is separate from chat routing: `quest_only` is only best-effort and may still incur upstream Paid debits; an Agent budget applies only to `polli_agent`, not direct agent chat.

---

## 🛡️ The "Cost Guard" & the "Safety Net"

We have introduced fundamental protections to ensure your workflow never interrupts and your budget (Quest & Paid Pollen) is under your control:

- 🛟 **Safety Net**: If you use premium models and your Quest/Paid balance runs out in the middle of a chat session, the plugin silently and automatically switches to a free model. *No more blocking errors (429).*
- 🚦 **Cost Guard for Tools**: OpenCode Agents can be zealous. If an Agent tries to spend too many Pollens to generate a heavy video or music, the plugin intercepts the request. An asynchronous flow will ask for your manual confirmation before executing costly generations. You stay in control.

---

## 🐝 Understanding Quest Pollen & Paid Pollen

Pollinations pollen is split into two columns:

- **🎁 Quest Pollen** — earned free by completing **Quests**. Consumed first by the server on regular models.
- **💎 Paid Pollen** — purchased (credit card). Used when Quest is insufficient, or for `paid_only` models.

> ⚠️ The plugin cannot read the split server-side; it estimates Quest/Paid locally and reads the real split (`meter_source`) from `/account/usage`.

### Billing modes (v6.5)

| Mode | Behavior |
| :--- | :--- |
| `quest` (QUEST_PREFERRED, **default**) | Quest first, Paid fallback allowed (server default). Falls back to the Free Universe when both look exhausted. |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | Blocks `paid_only` models locally; only sends Quest-eligible calls. **Best-effort** — a Paid debit can still occur in a race. |
| `paid` (PAID_ALLOWED) | Paid allowed, `paid_only` allowed per Cost Guard. Falls back to Free when the wallet is low. |
| `manual` | No automatic policy — full manual control. |

Change with `/poll mode <mode>` or `/poll config mode <mode>`.

> 🎯 **Earn free Pollen by completing Quests!** Just using this plugin completes several quests retroactively. Run `/poll quests` to see what you can claim.

> 🎁 **Get your Free Personal Key (BYOK) on [Pollinations](https://enter.pollinations.ai) to boost OpenCode!**

**How It Works:**
1. Your Quest Pollen is consumed first on all regular models.
2. 💎 Paid-only models always use purchased Pollen.
3. When both balances are exhausted, the safety net gracefully switches you to free fallback variants.

---

## 🌍 Native Multilingual Support (i18n)

Pollinations for OpenCode natively speaks your language:
- The Engine Interface, Notifications (Toasts), Tool Returns, and Terminal Commands are fully translated into **English**, **French**, **Spanish**, **German**, **Italian**, and **Chinese**.
- Type `/poll config lang <en|fr|es|de|it|zh>` in the terminal to switch instantly.

---

## 🧪 Local development: OpenCode V1 + V2

One source repository and one hybrid package support both generations: v1 loads dist/index.js and v2 uses its native setup() contract. The dev/opencode-v2-local adapter is for source-only development. Native versions 1.19.5 and 2.2.5 were tested.

Detailed architecture and compatibility: [TECHNICAL_MANUAL.md](TECHNICAL_MANUAL.md).

## 🚀 Getting Started & Onboarding

### 🐧 1. Cross-Platform Configuration (NPM Installation)
This plugin is **fully cross-platform** (Windows, macOS, Linux; Node **≥ 18**) and starts a local proxy on a dynamic port.

1. Install (global or project-local):
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-inject into OpenCode config:
   ```bash
   npx opencode-pollinations-plugin
   # or: npx opencode-pollinations-plugin --check
   ```
   *(Writes `opencode-pollinations-plugin` into `~/.config/opencode/opencode.json` — or `$OPENCODE_CONFIG_DIR/opencode.json`.)*

### 🔐 2. Connect your Pollinations account — recommended

The normal path is **one command**:

```bash
/poll login
```

Your browser opens automatically. Sign in with GitHub and click **Authorize**; the plugin connects itself. **No API key to create, copy, or paste.** This is the recommended path for account features, Quests, wallet, premium models, and paid tools.

> 🤖 **Agents:** if the user asks to connect/sign in to Pollinations, call the `polli_login` tool automatically. Do not ask the user to create/paste a key unless they explicitly want manual BYOK.

**Manual BYOK — optional, only if you already have a Secret key:**
```bash
/poll connect sk_your_key_here
```

> **Same connection on v1/v2:** `/poll login` uses Pollinations Connect. The public `pk_` identifies the app; after approval the user receives a scoped private `sk_` with model permissions, budget and expiry. Before consent, the guide/free fallbacks can appear; after consent OpenCode v2 refreshes its model catalog without restart. `Keys` admin access is unnecessary. Prefer device login to avoid putting a private key in command history; `/poll connect sk_...` is for trusted local terminals.

---

## 🔗 Links

- **Dashboard**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
