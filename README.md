# 🌸 Pollinations AI Plugin for OpenCode (v6.4.9)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>The Ultimate Bridge between OpenCode and the Pollinations.ai Ecosystem.</h3>
  <p><em>Access a continuous universe of free basic AI models, or leverage premium enterprise models with our generous <b>Hourly Free Tiers</b> directly from your local terminal.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Philosophy: Open AI for Creators

> **"No closed doors, no corporate hoops — just good tools and good people."**

**Pollinations.ai** is an open-source platform created by and for the community. We offer a unified, direct API for generating **images, text, audio, and video**.

- 🌍 **Transparent**: Our code, roadmap, and discussions are fully public.
- ⚖️ **Fair Economy**: A single currency (**Pollen 🌻**) for all media and models. Predictable and transparent pricing. No vendor lock-in.

---

## ✨ What's new in v6.4.9?

- 🎯 **Quests & Gamification**: `polli_quests` + `/poll quests`. Using this plugin completes several quests **retroactively** — free Pollen may already be waiting.
- 🆓 **Free tools (no key required)** — usable by **any** OpenCode model:
  - `gen_edit_image_free` — generate **and edit** images (~20/day).
  - `gen_video_free` — text-to-video (~5/day), optional first frame & audio.
  - `object_remover` / `image_upscaler` / `image_enhancer` — free image processing.
  - `remove_background` — free AI cutout (rmbg / bgeraser).
- 🔐 **1-Click Device Login**: `/poll login` + `polli_login` (like `gh auth login`). Manual `/poll connect sk_...` still works.
- 🧊 **Full model catalog**: text, image, video, audio, **3D**, **embeddings**, realtime.
- 🧪 **CI + packaging**: Node 18+ only (no VS Code leftovers), `npx opencode-pollinations-plugin` setup CLI restored, unit + i18n tests.
- 🌍 **6 languages**: en, fr, es, de, it, zh — onboarding, commands, and free-tool strings aligned.

---

## 🧰 Tools & Commands

Beyond text discussion, connecting your key gives OpenCode Agents access to our AI Media Tools powered by Pollinations models:

### 💎 Integrated Generative Tools (ENTER ONLY - requires API key)
- 🎨 `polli_gen_image` : State-of-the-art imagery models (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Powerful Text-to-Video and Image-to-Video models (`Wan`, `Veo`, `LTX`, `Reveal`).
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

We have introduced fundamental protections to ensure your workflow never interrupts and your budget (Wallet or Free Tiers) is under your control:

- 🛟 **Safety Net**: If you use premium models and your hourly Pollen quota runs out in the middle of a chat session, the plugin silently and automatically switches to a free model. *No more blocking errors (429).*
- 🚦 **Cost Guard for Tools**: OpenCode Agents can be zealous. If an Agent tries to spend too many Pollens to generate a heavy video or music, the plugin intercepts the request. An asynchronous flow will ask for your manual confirmation before executing costly generations. You stay in control.

---

## 🐝 Understanding Quest Pollen & Hourly Refill

In the past, Pollinations relied on tier grants. Today, you earn free Pollen by completing **Quests** and get **hourly refills** based on your contribution level:

| Level | Hourly Refill ⏱️ | Daily Estimate* | Condition |
| :--- | :--- | :--- | :--- |
| 🍄 **Spore** | **0.01 Pollen / hour** | ~0.24 / day | New account (default) |
| 🌱 **Seed** | **0.15 Pollen / hour** | ~3.6 / day | Active community member |
| 🌸 **Flower** | **0.40 Pollen / hour** | ~9.6 / day | Complete Quests & contribute |
| 🍯 **Nectar** | **0.80 Pollen / hour** | ~19.2 / day | Top contributor |
| 🐝 **Router** | **10 Pollen / hour** | ~240 / day | Special / invite-only |

_*Daily estimates are approximate (~24h × hourly rate). Refill resets automatically at the top of every hour (XX:00). Quest Pollen lasts 12 months since last account activity._

> 🎯 **Earn free Pollen by completing Quests!** Just using this plugin completes several quests retroactively. Run `/poll quests` to see what you can claim.

> 🎁 **Get your Free Personal Key (BYOK) on [Pollinations](https://enter.pollinations.ai) to boost OpenCode!**

**How It Works:**
1. Your Quest Pollen (hourly refill + accumulated quest rewards) is consumed first on all regular models.
2. 💎 Paid-only models always use purchased Pollen.
3. When Quest Pollen is exhausted, the safety net gracefully switches you to free fallback variants.
4. ⏰ Refill resets at the top of the next hour.

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

### 🔑 2. Interactive Onboarding

Once inside OpenCode, connect your Pollinations account with **one** of these:

**Option A — 1-click login (recommended):**
```bash
/poll login
```
Your browser opens automatically. Sign in with GitHub and click **Authorize** — the plugin connects itself, no copy-paste. 💡 On the consent form, keep **Profile + Usage** granted; clear the **Budget** and **Expiry** fields for an unlimited, never-expiring key.

**Option B — manual key:**
```bash
/poll connect sk_your_key_here
```
Create a **Secret** key yourself on [enter.pollinations.ai](https://enter.pollinations.ai) and paste it. *(Restart OpenCode to update the UI models list.)*

---

## 🔗 Links

- **Dashboard**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
