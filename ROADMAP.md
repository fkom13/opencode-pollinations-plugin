# 🛣️ OpenCode Pollinations Plugin Roadmap

> This document outlines the future development plan for the OpenCode Pollinations Plugin.
> **Current Version**: v5.4.7 (Stable Cross-Platform)
> **Goal**: Ecosystem Integration & UX

## 🧪 Testing Note (v5.4.7)
> **Stealth Mode**: Implemented notification filtering. Toasts are now restricted to authenticated Pollinations sessions, preventing clutter in multi-provider environments.
> **Dynamic Ports**: Replaced legacy `fuser` with OS-assigned dynamic ports.
> **Windows/Mac**: Support RESTORED and FULLY FUNCTIONAL.
> **Gemini Tools**: Handled via intelligent fallback to OpenAI (Workaround for Auth 401).

## 🌟 Short Term (v5.4 - The "Interactive" Update)

- [ ] **Interactive Onboarding**: A "Welcome" walkthrough that runs on first install to guide users through Mode selection and Key setup.
- [ ] **Model Picker GUI**: Replace slash commands (`/pollinations fallback ...`) with a QuickPick menu (`Ctrl+Shift+P > Pollinations: Select Model`).
- [ ] **Auto-Update Models**: A periodic fetch of available models from `https://text.pollinations.ai/models` to keep the list fresh without plugin updates.
- [ ] **Localization**: Complete French (fr) and Spanish (es) translations for all Toasts and Logs.

## 🚀 Medium Term (v6.0 - The "Multimodal" Update)

- [ ] **Image Generation**:
    - Select text -> Right Click -> "Illustrate with Pollinations" (Flux/SDXL).
    - Insert generated images directly into Markdown/HTML files.
- [ ] **Context Awareness**:
    - "Add Current File" to context (already partially supported via OpenCode, but native optimized handling for large files).
- [ ] **Cost Estimator**:
    - Real-time cost estimation *before* sending the request based on token count (Pro Mode).

## 🔮 Long Term (Vision 2026)

- **Flower/Nectar Exclusive Features**:
    - **Team Sync**: Share a common "Team Wallet" config across a workspace.
    - **Custom Fine-Tuning**: Ability to use Pollinations fine-tuned LoRAs directly from the editor.
- **MCP Integration**: Fully expose Pollinations features as a registered MCP server for other Agents.

---
*Created by [fkom13](https://github.com/fkom13) - 2026*
