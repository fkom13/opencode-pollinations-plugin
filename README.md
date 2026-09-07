# 🌸 Pollinations AI Plugin for OpenCode (v6.5.0)

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

## ✨ What's new in v6.5.0?

- 🧊 **3D Generation (`polli_gen_3d`)**: High-fidelity 3D model generation (`trellis-2`, `hyper3d-rodin`) as standard `.glb` assets with Cost Guard protection and cache recovery.
- 🛡️ **Zero Double-Billing**: Chat retries strictly constrained to 429; client timeouts and network interruptions never re-submit or duplicate token debits.
- 🧠 **Clean Reasoning Normalization**: Normalizes DeepSeek, Kimi, and Qwen reasoning streams — no internal thinking text leaks into the conversation.
- 💰 **Transparent Quest & Paid Semantics**: Modern billing modes (`quest`, `quest_only`, `paid`, `manual`) with absolute Pollen threshold safeguards.
- 📦 **Artifact Core (Magic Bytes)**: True binary file verification ensures image, video, audio, and 3D files are saved with their real file extension.
- ⏱️ **Configurable Timeout Hierarchy**: Fine-grained per-call, per-model, and per-capability timeout control via `/poll config timeouts.*`.
- 🎯 **Quests & 1-Click Device Login**: Automatic quest tracking (`/poll quests`) and instant browser login (`/poll login`).
- 🆓 **6 Free Creator Tools (No API key needed)**: `gen_edit_image_free`, `gen_video_free`, `object_remover`, `image_upscaler`, `image_enhancer`, `remove_background`.

---

## 🧰 Tools & Commands

Beyond text discussion, connecting your key gives OpenCode Agents access to our AI Media Tools powered by Pollinations models:

### 💎 Integrated Generative Tools (ENTER ONLY - requires API key)
- 🎨 `polli_gen_image` : State-of-the-art imagery models (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Powerful Text-to-Video and Image-to-Video models (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : High-quality 3D asset generation (`trellis-2`, `hyper3d-rodin`) with GLB output.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Voice synthesis (ElevenLabs, OpenAI TTS) and Generative Music.
- 🎙️ `polli_stt` : High-flying voice transcription (Whisper V3).
- 🌐 `polli_web_search` : Connected Web & Specialized Search context (`gemini-search`, `perplexity...`).

### 🧰 Free Creator Bonus Tools (Always available — no API key needed)
- 🆓 `gen_edit_image_free` : Generate **and edit** images for free (~20/day, any model, no key).
- 🆓 `gen_video_free` : Free text-to-video with optional first-frame image & audio (~5/day, no key).
- 🧹 `object_remover` : Remove objects by prompt for free (30-120s, no key).
- 📐 `image_upscaler` : Upscale images 2x/4x for free (30-120s, no key).
- ✨ `image_enhancer` : AI image enhancement — denoise, sharpen, restore (30-120s, no key).
- ✂️ `remove_background` : AI background removal via rmbg (bgeraser.com) — free.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url`: Dev utilities.

### 💻 Complete List of Terminal Commands
Use the alias **`/poll`** or **`/pollinations`** anytime inside your conversation terminal:
- `/poll help` : Displays the interactive help table.
- `/poll login` : **1-click browser login** (device flow) — creates & connects a key automatically.
- `/poll connect <key>` : Bring Your Own Key (manual `sk_...`, permanent key).
- `/poll quests` : See your quests & free Pollen ready to claim. 🎯
- `/poll usage full` : Real-time dashboard (Stats), active Freetiers, and Wallet Balance.
- `/poll config` : Finely adjust Cost Guards, Logs, Language, and Display.
- `/poll models` : Check the status of available Models.
- `/poll pricing` : View real-time unified pricing (Average Cost Estimate).
- `/poll fallback` : Define the ultimate Safety Net Chat model.
- `/poll infos` : Discover community rules and the leveling system.

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

---

## 🔗 Links

- **Dashboard**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
