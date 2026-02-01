# 🛣️ OpenCode Pollinations Plugin Roadmap

> **Current Version**: v5.6.2 (Stable)  
> **Goal**: Enterprise Reliability & Developer Experience

---

## ✅ Done (v5.0 - v5.6)

- [x] **Safety Net V5**: Transparent fallback on quota/auth errors
- [x] **Dynamic Port Allocation**: Cross-platform (no port conflicts)
- [x] **Limited Key Support**: "Generation Only" keys work in manual mode
- [x] **Timestamp Config Priority**: Most recent config file wins
- [x] **Mode System**: Manual / AlwaysFree / Pro with JIT verification
- [x] **Test Suite**: 28 automated tests (`npm test`)
- [x] **Clean Architecture**: Removed legacy code, organized scripts

---

## 🧪 Testing Note (v5.6.2)

> **Architecture**: Decoupled Mode & Timestamp Authority fully implemented.  
> **Limited Keys**: Full support for "Generation Only" keys (Auth Limited).  
> **Safety Nets**: Non-blocking proxy logic ensures generation continuity.  
> **Validation**: 28 tests passing, CI-ready.

---

## 🌟 Short Term (v5.7 - v5.8)

- [ ] **Tools Stability**: Improve reliability of Code Interpreter and Web Search on Enterprise models
- [ ] **Config Refresh Command**: `/pollinations config refresh` to reload models without restart
- [ ] **Better Error Messages**: More descriptive error toasts with suggested actions
- [ ] **CI/CD Integration**: GitHub Actions for automated testing on PRs

---

## 🚀 Medium Term (v6.0 - The "Multimodal" Update)

- [ ] **Image Generation**: Select text → Right Click → "Illustrate with Pollinations" (Flux/SDXL)
- [ ] **Context Awareness**: "Add Current File" to context (native large file handling)
- [ ] **Cost Estimator**: Real-time cost estimation before sending request (Pro Mode)
- [ ] **Model Favorites**: Pin frequently used models at the top of the list

---

## 🔮 Long Term (v7.0+ - Vision 2026)

- **Team Features**:
    - **Team Sync**: Share a common "Team Wallet" config across a workspace
    - **Usage Analytics**: Team-wide usage dashboard
    
- **Advanced Integration**:
    - **MCP Server**: Expose Pollinations features as a registered MCP server for other Agents
    - **Custom Fine-Tuning**: Use Pollinations fine-tuned LoRAs directly from the editor

- **Performance**:
    - **Local Cache**: Smart caching of frequent prompts
    - **Streaming Optimization**: Faster first-token latency

---

## 💡 Backlog Ideas

These are community-requested features under consideration:

- Voice input/output integration
- Multi-model comparison (A/B testing)
- Prompt templates library
- Usage export to CSV/JSON
- Dark/Light theme for dashboard

---

*Maintained by [fkom13](https://github.com/fkom13) - 2026*
