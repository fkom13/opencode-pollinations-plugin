# 🌸 OpenCode Pollinations Plugin v6.1-beta Release Notes

> **Urgent Update**: Image Generation Changes
> **Date**: 2026-02-18

## 🚨 Critical Change: Image Generation
The free image generation endpoint (`image.pollinations.ai`) has been deprecated by the provider.
Consequently:
- **`gen_image` now requires a Pollinations API Key.**
- Free models (`sana`, `turbo`) are no longer available without a key.
- All image generation requests are routed to the Pro endpoint.

**Action Required:**
Users must obtain a free API key from [enter.pollinations.ai](https://enter.pollinations.ai) and connect it using:
```
/pollinations connect <your-api-key>
```

---

## ✨ Features & Fixes (v6.1-beta.14)

### 🛡️ Multi-OS Robustness
- **Auth Paths**: Now supports Windows (`%APPDATA%`), macOS (`Library`), and Linux (`XDG`) standards strictly.
- **Config**: Prioritizes `OPENCODE_CONFIG` environment variable for portable setups.
- **Logging**: Centralized logs in `%TEMP%/pollinations-plugin/` to avoid permission issues.
- **FFmpeg**: Safer execution using `spawnSync` (no shell injection).

### 📊 Quota & Ledger
- **Local History**: `~/.pollinations/usage_history.json` tracks usage instantly (zero lag).
- **Accurate Tiers**: Tier calculation now relies on local history + API verification.

### 🛠️ Tools
- **Gen_Image**: Updated to use Pro endpoint only (Stability & Quality improved).
- **Gen_Video**: Added `grok-video`, `wan` (Alibaba), and `ltx-2` models.
- **Design Tools**: Added `gen_diagram`, `gen_palette`, `gen_qrcode`.

---

## 📦 Upgrade Instructions
```bash
npm install -g opencode-pollinations-plugin@latest
```
Restart OpenCode after installation.
