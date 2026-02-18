# 🛣️ OpenCode Pollinations Plugin Roadmap

> **Current Version**: v5.7.0 (Stable)  
> **Goal**: Enterprise Reliability & Multimodal Tools Ecosystem

---

## ✅ Done (v5.0 - v5.7)

- [x] **Safety Net V5**: Transparent fallback on quota/auth errors
- [x] **Dynamic Port Allocation**: Cross-platform (no port conflicts)
- [x] **Limited Key Support**: "Generation Only" keys work in manual mode
- [x] **Timestamp Config Priority**: Most recent config file wins
- [x] **Mode System**: Manual / AlwaysFree / Pro with JIT verification
- [x] **Test Suite**: 28 automated tests (`npm test`)
- [x] **Clean Architecture**: Removed legacy code, organized scripts
- [x] **Usage Dashboard**: `/pollinations usage [full]` with model breakdown

---

## 🧪 Current (v5.8) - CI/CD & Polish

- [ ] **GitHub Actions**: Automated tests on PRs
- [ ] **Error Messages**: More descriptive toasts with suggested actions
- [ ] **Pollen Info in README**: Document the credit system

---

## 🌟 Short Term (v6.0) - Cost Awareness

- [ ] **Cost Estimator**: Show estimated Pollen cost before sending request
  - Based on model pricing from `/image/models` and `/v1/models`
  - Toast: "Est. cost: 0.002 🌼" before confirming
- [ ] **Model Favorites**: Pin frequently used models at the top
- [ ] **Quota Alerts**: Warning when tier balance < 20%

---

## 🚀 Medium Term (v6.0) - **Pollinations Tools Ecosystem** 🎨

> **Flagship Feature**: OpenCode Custom Tools powered by Pollinations APIs

### Concept
Enable a suite of multimodal tools that integrate natively with OpenCode's agent system:

```
/pollinations tools enable
```

### Tools Architecture

#### 🎨 Image Tools
| Tool | API | Models | Capabilities |
|------|-----|--------|--------------|
| `pol_generate_image` | `/image/{prompt}` | flux, zimage, turbo | Text → Image |
| `pol_edit_image` | `/image/{prompt}?image=URL` | kontext, klein, gptimage, nanobanana | Image + Text → Image |
| `pol_generate_image_pro` | `/image/{prompt}` | seedream-pro, gptimage-large, nanobanana-pro | 4K, Multi-Image (💎 Paid) |

#### 🎬 Video Tools
| Tool | API | Models | Capabilities |
|------|-----|--------|--------------|
| `pol_generate_video` | `/image/{prompt}?model=seedance` | seedance, seedance-pro | Text/Image → Video (2-10s) |
| `pol_generate_video_pro` | `/image/{prompt}?model=veo` | veo | Text → Video + Audio (💎 Paid) |
| `pol_image_to_video` | `/image/{prompt}?model=wan&image=URL` | wan | Image → Video + Audio (15s, 1080p) |

#### 🔍 Search & Research Tools
| Tool | API | Models | Capabilities |
|------|-----|--------|--------------|
| `pol_web_search` | `/v1/chat/completions` | perplexity-fast, gemini-search | Quick web search with sources |
| `pol_deep_research` | `/v1/chat/completions` | perplexity-reasoning | Reasoning + search (in-depth) |
| `pol_code_search` | `/v1/chat/completions` | qwen-coder | Code-specific search & analysis |

#### 🎵 Audio Tools
| Tool | API | Models | Capabilities |
|------|-----|--------|--------------|
| `pol_text_to_speech` | `/v1/chat/completions` | openai-audio | Text → Audio (alloy, echo, shimmer...) |

### Safety Net Integration
Each tool:
1. **Pre-check**: Verify quota before execution
2. **Estimate**: Show cost before confirming
3. **Fallback**: Degrade gracefully if quota exceeded
4. **Report**: Log usage in `/pollinations usage full`

### Enable/Disable
```
/pollinations tools enable        # Activate all tools
/pollinations tools enable image  # Only image tools
/pollinations tools disable       # Remove tools
/pollinations tools status        # List active tools
```

---

## 🔮 Long Term (v8.0+) - Advanced Integration

- [ ] **Tool Presets**: Save tool configurations (model + params)
- [ ] **Batch Generation**: Generate multiple images/videos in one call
- [ ] **History Gallery**: View generated media in a gallery command
- [ ] **BYOP Mode**: For public apps using the plugin (users pay their own Pollen)
- [ ] **Streaming Audio**: Real-time TTS with `openai-audio`

---

## 📊 Model Reference (Auto-updated)

### Text Models (25)
| ID | Capabilities | Notes |
|----|--------------|-------|
| `openai` | 👁️ Vision | GPT-5 Mini |
| `openai-fast` | 👁️ Vision | GPT-5 Nano (cheapest) |
| `openai-large` | 👁️🧠 Reasoning | GPT-5.2 |
| `gemini-fast` | 👁️🔍💻 | Gemini 2.5 Flash Lite |
| `gemini-search` | 👁️🔍💻 | Gemini 3 Flash + Google Search |
| `gemini-large` | 👁️🧠🔍 | Gemini 3 Pro (💎 Paid) |
| `claude-fast` | 👁️ | Claude Haiku 4.5 |
| `claude` | 👁️ | Claude Sonnet 4.5 |
| `claude-large` | 👁️ | Claude Opus 4.5 (💎 Paid) |
| `perplexity-fast` | 🔍 Search | Quick web search |
| `perplexity-reasoning` | 🧠🔍 | Deep research |
| `deepseek` | 🧠 Reasoning | DeepSeek V3.2 |
| `kimi` | 👁️🧠 | Kimi K2.5 Thinking |
| `qwen-coder` | 💻 Code | Qwen3 Coder 30B |
| `openai-audio` | 👁️🎙️🔊 | GPT-4o Mini Audio |
| `glm` | 🧠 | Z.ai GLM-4.7 |
| `minimax` | 🧠 | MiniMax M2.1 |
| `nova-fast` | - | Amazon Nova Micro (cheapest) |
| `mistral` | - | Mistral Small 3.2 |
| `grok` | - | xAI Grok 4 Fast |

### Image Models (12)
| ID | Input | Price/Image | Notes |
|----|-------|-------------|-------|
| `flux` | Text | 0.0002 | Default, fast |
| `zimage` | Text | 0.0002 | 2x upscaling |
| `turbo` | Text | 0.0003 | SDXL, real-time |
| `gptimage` | Text+Image | 0.000008 | OpenAI, editing |
| `kontext` | Text+Image | 0.04 | FLUX.1, context editing |
| `klein` | Text+Image | 0.008 | FLUX.2 4B |
| `klein-large` | Text+Image | 0.012 | FLUX.2 9B |
| `nanobanana` | Text+Image | 0.00003 | Gemini Flash |
| `seedream` | Text+Image | 0.03 | ByteDance |
| `gptimage-large` | Text+Image | 0.000032 | 💎 Paid |
| `nanobanana-pro` | Text+Image | 0.00012 | 💎 Paid, 4K |
| `seedream-pro` | Text+Image | 0.04 | 💎 Paid, 4K |

### Video Models (4)
| ID | Input | Price | Notes |
|----|-------|-------|-------|
| `seedance` | Text+Image | ~0.000002/token | 2-10s |
| `seedance-pro` | Text+Image | ~0.000001/token | Better adherence |
| `wan` | Text+Image | 0.025/sec | 15s, 1080p, audio |
| `veo` | Text+Image | 0.15/sec | 💎 Paid, 4-8s, audio |

---

*Maintained by [fkom13](https://github.com/fkom13) - 2026*
