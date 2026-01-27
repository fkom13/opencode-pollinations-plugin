# 🌸 Pollinations AI Plugin for OpenCode (v5.1)

<div align="center">
  <img src="https://raw.githubusercontent.com/pollinations/pollinations/main/assets/logo-text.svg" alt="Pollinations.ai Logo" width="400">
  <br>
  <b>The Bridge between OpenCode and the Pollinations.ai Ecosystem.</b>
  <br>
  Access unlimited free AI models or premium enterprise models directly within your editor.
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-5.1.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Philosophy: Open AI for Creators

> **"No closed doors, no corporate hoops — just good tools and good people."**

Pollinations.ai is an open-source platform built by and for the community. We provide a unified API for image, text, audio, and video generation.
- **Transparent**: Our code, roadmap, and discussions are open.
- **Community Driven**: Features are prioritized based on what *you* need.
- **Fair**: One single currency (**Pollen**) for all models. No complex subscriptions.

## 📸 Gallery

<p align="center">
  <img src="https://github.com/fkom13/opencode-pollinations-plugin/raw/main/docs/images/connect.png" alt="Connect Command" width="800">
  <br>
  <em>Easy Connection with /connect or /pollinations config apiKey</em>
</p>

<p align="center">
  <img src="https://github.com/fkom13/opencode-pollinations-plugin/raw/main/docs/images/usage_dashboard.png" alt="Usage Dashboard" width="800">
  <br>
  <em>Integrated Usage Dashboard (/pollinations usage)</em>
</p>

<p align="center">
  <img src="https://github.com/fkom13/opencode-pollinations-plugin/raw/main/docs/images/models.png" alt="Models" width="800">
  <br>
  <em>Wide Range of Models (Mistral, OpenAI, Gemini, Claude)</em>
</p>

## ✨ Features

- **🌍 Free Universe**: Access generic models (`openai`, `mistral`, `gemini`) for **FREE**, unlimited time, no API key required.
- **🚀 Pro Mode**: Connect your Pollinations API Key to access Premium Models (`claude-3-opus`, `gpt-4o`, `deepseek-coder`).
- **🛡️ Safety Net V5**: never get blocked.
    - **Transparent Fallback**: If your Pro quota runs out mid-chat, the plugin automatically switches to a free model instantly. No errors, just a seamless experience.
- **📊 Real-time Dashboard**: Track your **Pollen** usage, Tier Status, and Wallet Balance inside OpenCode.

## 🐝 Understanding Pollen & Tiers

**Pollen** is our unified credit system. $1 ≈ 1 Pollen.
You spend it to verify API calls on premium models.

### Tiers (Free Daily Grants during Beta)

| Tier | Grant | Requirement |
| :--- | :--- | :--- |
| **🦠 Spore** | **1 Pollen/day** | Just Sign Up! |
| **🌱 Seed** | **3 Pollen/day** | Active GitHub Developer (8+ points) |
| **🌸 Flower** | **10 Pollen/day** | **Publish an App** (Like this Plugin!) |
| **🍯 Nectar** | **20 Pollen/day** | Major Contributors (Coming Soon) |

> 🎁 **Beta Bonus**: Buy one Pollen pack, get one free!

## 📦 Installation & Ecology

This plugin is part of the **OpenCode Ecosystem**.

### Option A: OpenCode Registry (Recommended)
1. Open **OpenCode**.
2. Go to **Extensions**.
3. Search for `opencode-pollinations-plugin`.
4. Click **Install**.

### Option B: Manual VSIX
1. Download the latest `.vsix` release from GitHub.
2. Drag and drop into OpenCode Extension view.

### Option C: NPM (For Devs)
```bash
npm install -g opencode-pollinations-plugin
```

## 🚀 Getting Started

### 1. The Basics (Free Mode)
Just type in the chat. You are in **Manual Mode** by default.
- Model: `openai` (GPT-4o Mini equivalent)
- Model: `mistral` (Mistral Nemo)

### 2. Going Pro
1. Get your API Key from [pollinations.ai](https://pollinations.ai).
2. Run command:
   ```bash
   /pollinations config apiKey sk_YourSecretKey
   ```
3. Set mode to Pro:
   ```bash
   /pollinations mode pro
   ```
4. **Reload Window**.

## 🔗 Links

- **Pollinations Website**: [pollinations.ai](https://pollinations.ai)
- **Discord Community**: [Join us!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ecosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
