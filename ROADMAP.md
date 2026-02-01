# 🛣️ OpenCode Pollinations Plugin Roadmap

> This document outlines the future development plan for the OpenCode Pollinations Plugin.
> **Current Version**: v5.6.0 (Stable Release)
> **Goal**: Enterprise Reliability & Limited Key Support

## 🧪 Testing Note (v5.6.0)
> **Architecture**: Decoupled Mode (Manual/Pro) & Timestamp Authority (Config) fully implemented.
> **Limited Keys**: Full support for "Generation Only" keys (Auth Limited).
> **Safety Nets**: Non-blocking proxy logic ensures generation continuity even with limited permissions.
> **Validation**: Verified against Quota 403 errors and Mode Switching logic.

## 🌟 Short Term (v5.5 - Stability & Tools)

- [ ] **Tools Stability**:
    - Improve reliability of "Code Interpreter" and "Web Search" on Enterprise models (currently prone to signature issues or 401s).
    - Refine the intelligent fallback to be less aggressive if possible (User Feedback).
- [ ] **Config Refresh**:
    - Expose a manual command `/pollinations configuration refresh` to force a reload of the model list without restarting OpenCode.

## 🚀 Medium Term (v6.0 - The "Multimodal" Update)

- [ ] **Image Generation**:
    - Select text -> Right Click -> "Illustrate with Pollinations" (Flux/SDXL).
    - Insert generated images directly into Markdown/HTML files.
- [ ] **Context Awareness**:
    - "Add Current File" to context (Native large file handling).
- [ ] **Cost Estimator**:
    - Real-time cost estimation *before* sending the request based on token count (Pro Mode).

## 🔮 Long Term (Vision 2026)

- **Flower/Nectar Exclusive Features**:
    - **Team Sync**: Share a common "Team Wallet" config across a workspace.
    - **Custom Fine-Tuning**: Ability to use Pollinations fine-tuned LoRAs directly from the editor.
- **MCP Integration**: Fully expose Pollinations features as a registered MCP server for other Agents.

---
*Created by [fkom13](https://github.com/fkom13) - 2026*
