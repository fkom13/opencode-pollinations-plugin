# 🌸 Pollinations AI Plugin for OpenCode (v6.2.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="200">
  <br>
  <b>The Bridge between OpenCode and the Pollinations.ai Ecosystem.</b>
  <br>
  Access a continuous universe of free basic AI models, or leverage premium enterprise models with our generous Daily Free Tiers directly from your editor.
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-v6.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Philosophy: Open AI for Creators

> **"No closed doors, no corporate hoops — just good tools and good people."**

Pollinations.ai is an open-source platform created by and for the community. We offer a unified, direct API for generating images, text, audio, and video.
- **Transparent**: Our code, roadmap, and discussions are public.
- **Fair Economy**: A single currency (**Pollen**) for all media and models. Predictable and transparent pricing.

---

## ✨ What's new in V6.2? (The Anti-Hallucination Update)
- **100% Dynamic Engine**: Hardcoded model lists, default configurations, and fixed prices are gone! In V6.2, OpenCode's AI agent now fetches the latest LLM models, parameters, tags (`[💎 Paid]`, `[🌿 Free]`, limits), and cost approximations dynamically from the Pollinations APIs.
- **Robust Security**: Protection against path traversal and strict URL verifications are fully integrated.
- **Improved Web Search**: The `polli_web_search` component maps seamlessly to current web-enabled and specialized groundings options like Google Gemini Fast, Perplexity, and Custom specialized assistants.

---

## 🧰 Tools & Commands V6.2

Beyond text discussion, connecting your key gives OpenCode Agents access to our AI Media Tools powered by Pollinations models:

### 💎 Integrated Generative Tools (ENTER ONLY - requires API key)
- `polli_gen_image` : State-of-the-art imagery models (`Flux`, `Sana`, `Gemini`).
- `polli_gen_video` : Powerful Text-to-Video and Image-to-Video capabilities (`Wan`, `Veo`, `LTX`, `Reveal`).
- `polli_gen_audio` & `polli_gen_music` : Magical voice synthesis (ElevenLabs, TTS) and Generative Music.
- `polli_stt` : High-flying voice transcription (Whisper V3).
- `polli_web_search` : Connected Web & Specialized Search context (`gemini-search`, `perplexity...`).

### 🧰 Free Creator Bonus Tools (Always available)
- `remove_background` : Built-in ultra-fast image background removal.
- `gen_qrcode(diagram and palettes)`, `extract_frames`, `extract_audio`, `file_to_url`: Utilities.

### 💻 Complete List of Terminal Commands
Use the alias **`/poll`** or **`/pollinations`**.
- `/poll help` : Displays the interactive help table.
- `/poll connect` : Bring Your Own Key configuration tool (Interactive).
- `/poll usage full` : Real-time dashboard (Stats), active Freetiers, and Wallet Balance.
- `/poll config` : Finely adjust Cost Guards, Logs, Language, and Display.
- `/poll models` : Check the status of available Models.
- `/poll pricing` : View real-time unified pricing (Average Cost Estimate).
- `/poll fallback` : Define the ultimate Safety Net Chat model.
- `/poll mode` : Change mode without going through the API.
- `/poll infos` : Discover community rules and the leveling system.

### 🛡️ The "Cost Guard" & the "Safety Net"
We have introduced fundamental protections to ensure your workflow never interrupts and your wallet (Wallet or free tiers) is under your control.
- **Safety Net**: If you use premium models and your daily Pollen quota runs out in the middle of a chat session, the plugin silently and automatically switches to a free model. *No more blocking errors (429).*
- **Cost Guard for Tools**: OpenCode Agents can be zealous. If an Agent tries to spend too many Pollens to generate a heavy video or music, the plugin intercepts the request. We have implemented an asynchronous flow that asks for your manual confirmation before executing costly generations. You stay in control.

### 🌍 Native Multilingual Support (i18n)
Pollinations for OpenCode natively speaks your language.
- The Engine Interface, Notifications (Toasts), Tool Returns, and Commands are fully translated into **English (Default)**, **French**, **Spanish**, **German**, and **Italian**.
- Type `/poll config lang <fr|es|de|it>` in the terminal to switch instantly.

---

## 🐝 Understanding Pollens & "Free Tiers"

In the past, Pollinations mainly relied on ad-funded network traffic. Today, running massive models (like Claude 4.5, Flux Pro, Wan Video) costs money. Pollinations therefore introduces the **Enter Universe** which requires an API key and unlocks cutting-edge models.

**But wait, you don't need a credit card!**

**Pollen** is our unified credit system ($1 ≈ 1 Pollen). By connecting a simple Free API Key, you unlock daily Pollen reloads according to your Developer Tier:

| Tier | Daily Reload | Condition |
| :--- | :--- | :--- |
| 🦠 **Microbe** | **0.1 Pollen/day** | Just register! |
| 🍄 **Spore** | **1 Pollen/day** | Automatic verification |
| 🌱 **Seed** | **3 Pollen/day** | Active GitHub Developer (8+ points) |
| 🌸 **Flower** | **10 Pollen/day** | **Publish an App** (Like this Plugin!) |

> 🎁 **Get your Free Personal Key (BYOK) on [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) to boost OpenCode!**

*(Note: We still maintain the "Free Universe" fallback for basic chat (`openai-fast`) which requires no key, but its capacity is very limited and mainly designed as a safety net).*

Paid pollens allow you to access even more powerful and premium models.

Daily free tier pollen credits are consumed before touching the wallet (purchased pollen) except for paid models.

---

## 🚀 Getting Started & Onboarding

### 🐧 1. Cross-Platform Configuration (NPM Installation)
This plugin is **fully cross-platform** (Windows, macOS, Linux) and detects its ports dynamically.

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
Once in OpenCode, simply type the following command in the Agent Terminal:
```bash
/poll connect
```
An interactive conversational assistant will guide you to inject your Pollinations Key and configure your space. *Restart OpenCode to update the list of models in the UI interface.*



---

## 🔗 Links

- **Create your Pollen API Key**: [pollinations.ai](https://pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
