# 🌸 Pollinations AI Plugin for OpenCode (v5.1)

> **The Bridge between OpenCode and the Pollinations.ai Ecosystem.**
> Access unlimited free AI models or premium enterprise models directly within your editor.

![Version](https://img.shields.io/badge/version-5.1.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

## ✨ Features

- **🌍 Free Universe**: Access generic models (`openai`, `mistral`, `gemini`) for **FREE**, unlimited time, no API key required.
- **🚀 Pro Mode**: Connect your Pollinations API Key (`sk_...`) to access Premium Models (`claude-3-opus`, `gpt-4o`, `deepseek-coder`).
- **🛡️ Safety Net V5**: Never get blocked.
    - If your Pro Quota/Wallet runs out mid-chat -> **Auto-Switch** to Free Mistral instantly.
    - Transparent Fallback: No errors, just a seamless switch with a notification.
- **📊 Usage Dashboard**: Track your Pollen usage, Tier status (Spore/Seed/Flower), and Next Reset directly in the editor (`/pollinations usage`).
- **🔧 Zero Config Start**: Install and chat. It works out of the box in "Manual" mode.

## 📦 Installation

1. Open **OpenCode** (or compatible VS Code fork).
2. Go to **Extensions**.
3. Search for `opencode-pollinations-plugin` (or load from `.vsix`).
4. Click **Install**.

## 🚀 Getting Started

### 1. The Basics
Just type in the chat. By default, you are in **Manual Mode** (Free).
- Model: `openai` (Mapped to `gpt-4o-mini` equivalent)
- Model: `mistral` (Mistral Nemo)
- Model: `gemini` (Gemini Flash)

### 2. Going Pro (Optional)
To use Enterprise models like `claude-3.5-sonnet` or `gpt-4`:
1. Get your API Key from [pollinations.ai](https://pollinations.ai).
2. Run command: 
   ```bash
   /pollinations config apiKey sk_YourSecretKey
   ```
3. Set mode to Pro:
   ```bash
   /pollinations mode pro
   ```
4. **Reload Window** (Command Palette > `Developer: Reload Window`).

## 🛠️ Commands

| Command | Description |
| :--- | :--- |
| `/pollinations usage` | Show your current Quota, Tier, and Wallet balance. |
| `/pollinations mode [mode]` | Switch between `manual`, `alwaysfree`, `pro`. |
| `/pollinations config [key] [value]` | Advanced configuration (GUI, thresholds). |
| `/pollinations help` | Show all available commands. |

## ⚙️ Configuration (`config.json`)

Stored in `~/.pollinations/config.json`.

```json
{
  "mode": "pro",
  "gui": { "status": "all", "logs": "error" },
  "thresholds": { "tier": 10, "wallet": 5 }
}
```

## 🐛 Troubleshooting

**"Tier: ⚠️ ERROR" in Usage?**
- Check your internet connection.
- Ensure you are using a **Secret Key** (`sk_...`), not a Public Key (`pk_...`). Public keys cannot read quotas.

**"Safety Net Active"?**
- Your daily free tier or wallet ran out. The plugin automatically switched you to a free backup model to ensure you get a response.

## 📜 License

MIT License. Created by [fkom13](https://github.com/fkom13) & The Pollinations Community.
