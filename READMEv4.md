# Technical Analysis: Pollinations Plugin V4 for OpenCode

This document provides a deep-dive technical analysis of the Pollinations.ai plugin (v4.0.0+), detailing its hybrid architecture, complex model alignment strategies, and surgical fixes for LLM compatibility.

## 1. Core Architecture: Atomic Proxy & Lifecycle
The V4 engine transitions from a simple provider to a **Hybrid Proxy/Plugin Architecture**. It operates on a local proxy (port 10001) that intercepts, sanitizes, and routes every request.

- **Anti-Zombie Atomic Cleanup**: Before starting, the plugin executes `fuser -k 10001/tcp`. This "Anti-Zombie" logic ensures that any lingering background processes or failed reloads from previous sessions are killed, guaranteeing port availability.
- **Unified Request Handler**: The proxy handles both standard OpenAI paths (`/v1/chat/completions`) and shorter variants (`/chat/completions`), providing seamless SDK integration while allowing for custom header manipulation.
- **Dual-Routing Logic**:
    - `free/` models: Routed to `https://text.pollinations.ai` (No-Auth, community-driven).
    - `enter/` models: Routed to `https://gen.pollinations.ai` (Enterprise API with strict Bearer Auth).

## 2. Technical Subtleties & Alignment Strategies
Alignment is the core strength of V4. It tackles the inconsistencies of diverse providers to meet OpenCode's strict agentic requirements.

### 2.1 Persistence of Thinking Signatures (Gemini Fix)
Thinking models (like Gemini) often require a `thought_signature` to maintain state across tool calls.
- **Stable Hashing Mechanism**: The plugin computes a hash of the last message content.
- **Signature Map**: It maintains a `pollinations-signature.json` map that links these hashes to signatures. This ensures that even in multi-round agentic loops, the correct signature is injected into the subsequent assistant/tool messages.

### 2.2 Schema Dereferencing & Sanitization
Many providers (especially Vertex AI/Gemini) fail when schemas contain `$ref` or incompatible fields.
- **Surgical Sanitization**: The `dereferenceSchema` function recursively resolves local definitions (`$defs` or `definitions`) and injects them back into the properties.
- **Hygiene**: It strips `optional`, `title`, and `ref` fields which are known to cause 400 Bad Request errors on certain upstream proxies.

### 2.3 Stop Sequence Injection & "The Guillotine"
To prevent "hallucinated turns" (where the model starts writing the user's next message), V4 implements:
- **Explicit Stops**: Injects `User:`, `Model:`, and `\nUser` into the request's `stop` parameter.
- **Server-Side Guillotine**: A regex-based stream detector (`/(\n|^)\s*(User|user)\s*:/`) that kills the response stream immediately if an hallucinated user turn is detected, preventing infinite loops.

## 3. Model-Specific Specificities & Fixes
| Model Group | Known Issues | V4 Surgical Correction |
| :--- | :--- | :--- |
| **Kimi / Moonshot** | Cyclic repetition & "User:" hallucinations | `frequency_penalty: 1.1` + Strong presence penalty + specific stop tokens. |
| **Gemini (Free)** | Loops during grounding/search | Disables `google_search_retrieval` and explicitly filters out the `google_search` tool from the payload. |
| **Azure / OpenAI** | Tool count limits (120) | Implements `truncateTools` to prioritize core agent tools (bash, read, edit) and drops others if count > 120. |
| **Nova (Bedrock)** | Crashes on large outputs | Forces `maxTokens: 8000` directly in the model configuration to respect Bedrock limits. |
| **NomNom** | Missing token parameters | Injects a mandatory `max_tokens: 2048` and uses a customized hach-based signature system. |

## 4. Magical Command Interception
The V4 proxy introduces a "Magical" feature where it intercepts user messages starting with `/pollinations` or `/poll`.
- **Logic**: Instead of forwarding the message to the LLM, the proxy calls `handleCommand()` internally.
- **Mock Stream**: It generates a series of fake SSE (Server-Sent Events) chunks to return the command's result (e.g., usage report) back to the TUI, making internal plugin commands feel like native AI responses.

## 5. Quota & Usage Management
The plugin implements a sophisticated `QuotaStatus` engine:
- **Pollen Tiers**: Dynamically tracks usage against tiers (`spore`, `seed`, `flower`, `nectar`) with specific pollen limits (1, 3, 10, 20).
- **Hybrid Wallet**: Calculates remaining "Free Pollen" before tapping into the paid wallet balance.
- **30s Cache**: Minimizes network overhead by caching quota data with a 30-second TTL.

## 6. Weaknesses & Technical Challenges
- **Legacy Fallbacks**: The code still contains `provider_v1.ts` and legacy logic in `proxy.ts` (`lastSignature`), indicating a transition phase with potential technical debt.
- **Log Management**: Heavy reliance on `/tmp` for various logs (`config.log`, `debug.log`, `quota.log`), which might be volatile or difficult to monitor in production.
- **Platform Dependency**: The `fuser` command is Linux-specific, creating a potential failure point for Windows users unless alternative cleanup logic is implemented.
- **Tool Complexity**: While `dereferenceSchema` is robust, extremely nested JSON schemas may still hit complexity limits or recursive depth errors.

---
*Analysis performed by Antigravity for OpenCode V4 - (c) 2026 DeepMind / Oracle*
