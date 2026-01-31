# 🛣️ OpenCode Pollinations Plugin Roadmap

> This document outlines the future development plan for the OpenCode Pollinations Plugin.
> **Current Version**: v5.4.16 (Stable Architecture)
> **Goal**: Performance, Tools Stability & Enterprise Features

## 🧪 Testing Note (v5.4.16)
> **Architecture**: Decoupled Mode (Manual/Pro) & Timestamp Authority (Config) fully implemented.
> **Safety Nets**: Paid-Only blocks in AlwaysFree mode active.
> **Tools**: Native support for Gemini/Vertex (Free) and OpenAI (Pro). Intelligent Fallback exists *only* on Auth Failure (401).

## 🌟 Next Steps (v6.0 - The "Multimodal" Update)

> The v5.x cycle is considered feature-complete (Stability + Cross-Platform + Enterprise).
> Focus shifts to functional expansions.

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
