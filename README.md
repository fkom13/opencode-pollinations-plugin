# 🌸 Pollinations AI Plugin for OpenCode (v6.2.7)

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

## ✨ What's new in V6.2.7?

- ⏱️ **Hourly Quotas**: Say goodbye to daily limits! Developer tiers now reset **every single hour** at `:00`, ensuring you always have fresh credits available throughout your coding sessions.
- ⚡ **100% Dynamic Engine**: Hardcoded model lists, default configurations, and fixed prices are gone! In V6.2, OpenCode's AI agent now fetches the latest LLMs (`[💎 Paid]`, `[🌿 Free]`, limits), and cost approximations dynamically from the Pollinations APIs.
- 🛡️ **Robust Security**: Protection against path traversal and strict URL verifications are fully integrated.
- 🔍 **Improved Web Search**: The `polli_web_search` component maps seamlessly to current web-enabled and specialized groundings options like Google Gemini Fast, Perplexity, and Custom assistants.

---

## 🧰 Tools & Commands

Beyond text discussion, connecting your key gives OpenCode Agents access to our AI Media Tools powered by Pollinations models:

### 💎 Integrated Generative Tools (ENTER ONLY - requires API key)
- 🎨 `polli_gen_image` : State-of-the-art imagery models (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Powerful Text-to-Video and Image-to-Video models (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🔊 `polli_gen_audio` & `polli_gen_music` : Voice synthesis (ElevenLabs, OpenAI TTS) and Generative Music.
- 🎙️ `polli_stt` : High-flying voice transcription (Whisper V3).
- 🌐 `polli_web_search` : Connected Web & Specialized Search context (`gemini-search`, `perplexity...`).

### 🧰 Free Creator Bonus Tools (Always available)
- ✂️ `remove_background` : Built-in ultra-fast AI image background removal.
- 🛠️ `gen_qrcode`, `gen_diagram`, `extract_frames`, `extract_audio`, `file_to_url`: Dev utilities.

### 💻 Complete List of Terminal Commands
Use the alias **`/poll`** or **`/pollinations`** anytime inside your conversation terminal:
- `/poll help` : Displays the interactive help table.
- `/poll connect` : Bring Your Own Key configuration tool (Interactive).
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

## 🐝 Understanding Pollens & "Free Tiers"

In the past, Pollinations mainly relied on ad-funded network traffic. Today, running massive models (like Claude 3.5 Sonnet, Flux Pro, Wan Video) costs money. The **Enter Universe** unlocks cutting-edge models through an API key.

**But wait, you don't need a credit card!**

**Pollen 🌻** is our unified credit system ($1 ≈ 1 Pollen). By connecting a simple Free API Key, you unlock **hourly** Pollen reloads according to your Developer Tier:

| Tier | Hourly Reload ⏱️ | Daily Estimate* | Condition |
| :--- | :--- | :--- | :--- |
| 🦠 **Microbe** | **0.01 Pollen / hour** | ~0.24 / day | Just register! |
| 🍄 **Spore** | **0.01 Pollen / hour** | ~0.24 / day | Automatic verification |
| 🌱 **Seed** | **0.15 Pollen / hour** | ~3.6 / day | Active GitHub Developer (8+ points) |
| 🌸 **Flower** | **0.40 Pollen / hour** | ~9.6 / day | **Publish an App** (Like this Plugin!) |
| 🍯 **Nectar** | **0.80 Pollen / hour** | ~19.2 / day | Coming soon 🔮 |

_*Daily estimates are approximate (~24h × hourly rate). Actual reset occurs automatically at the top of every hour (XX:00)._

> 🎁 **Get your Free Personal Key (BYOK) on [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) to boost OpenCode!**

**How It Works:**
1. Your free tier quota (e.g., 0.40 🌻/hour for Flower) is consumed first.
2. When quota is exhausted, the safety net gracefully switches you to free fallback variants.
3. Wallet balance (if purchased) is used for premium models only when the free quota is insufficient.
4. Boom! 💥 Quota resets completely at the start of the next hour.

---

## 🌍 Native Multilingual Support (i18n)

Pollinations for OpenCode natively speaks your language:
- The Engine Interface, Notifications (Toasts), Tool Returns, and Terminal Commands are fully translated into **English**, **French**, **Spanish**, **German**, **Italian**, and **Chinese**.
- Type `/poll config lang <en|fr|es|de|it|zh>` in the terminal to switch instantly.

---

## 🚀 Getting Started & Onboarding

### 🐧 1. Cross-Platform Configuration (NPM Installation)
This plugin is **fully cross-platform** (Windows, macOS, Linux) and detects OpenCode ports dynamically.

1. Global installation:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuration:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Or inject it manually into `~/.config/opencode/opencode.json`)*

### 🔑 2. Interactive Onboarding
Once inside OpenCode, simply type the following command in the Agent Terminal:
```bash
/poll connect
```
An interactive conversational assistant will guide you to inject your Pollinations Key and configure your workspace. *(Restart OpenCode to update the UI models list).*

---

## 🔗 Links

- **Create your Pollen API Key**: [pollinations.ai](https://pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
