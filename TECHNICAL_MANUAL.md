# 📘 Technical Manual — OpenCode Pollinations Plugin v6.4
> **Version**: 6.4.2 | **Status**: Stable | **Last Updated**: 2026-07-14

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Data Flow](#data-flow)
- [Module Reference](#module-reference)
  - [index.ts — Entry Point](#1-indexts--entry-point)
  - [server/config.ts — Configuration](#2-serverconfigts--configuration)
  - [server/proxy.ts — Request Router](#3-serverproxts--request-router)
  - [server/generate-config.ts — Model Discovery](#4-servergenerate-configts--model-discovery)
  - [server/quota.ts — Quota Tracking](#5-serverquotats--quota-tracking)
  - [server/commands.ts — CLI Commands](#6-servercommandsts--cli-commands)
  - [server/toast.ts — Notifications](#7-servertoastts--notifications)
  - [server/status.ts — Status Bar](#8-serverstatsts--status-bar)
  - [server/pollinations-api.ts — API Client](#9-serverpollinations-apits--api-client)
- [Tools System (v6.1)](#tools-system-v61)
  - [Pollinations Generation Tools](#pollinations-generation-tools)
  - [Design Tools](#design-tools)
  - [Power Tools](#power-tools)
- [Configuration Schemas](#configuration-schemas)
- [Internal API Reference](#internal-api-reference)
- [Error Handling](#error-handling)
- [Security & Authentication](#security--authentication)
- [Roadmap](#roadmap)

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENCODE HOST                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Plugin Context (ctx)                            │ │
│  │   • ctx.client.tui.showToast()  — Notifications                        │ │
│  │   • config() hook               — Provider + model injection           │ │
│  │   • tui.command.execute hook    — /pollinations commands                │ │
│  │   • session.idle hook           — Status bar updates                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       POLLINATIONS PLUGIN (v6.1-beta)                        │
│                                                                             │
│  ┌──────────────────────────── Server ────────────────────────────────────┐ │
│  │ index.ts │ config.ts │ proxy.ts │ generate-config.ts │ quota.ts       │ │
│  │ commands.ts │ toast.ts │ status.ts │ pollinations-api.ts               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────── Tools ────────────────────────────────────┐ │
│  │  pollinations/   design/    power/                                     │ │
│  │  gen_image       gen_diagram  remove_background                        │ │
│  │  gen_audio       gen_palette  extract_audio                            │ │
│  │  gen_music       gen_qrcode   extract_frames                           │ │
│  │  gen_video                    file_to_url                              │ │
│  │  transcribe_audio             rmbg_keys                               │ │
│  │  polli_web_search                                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │               HTTP PROXY SERVER (Dynamic Port — system 0)             │ │
│  │   127.0.0.1:<dynamic>/v1/chat/completions → Pollinations APIs         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
┌──────────────────────────────────┐  ┌────────────────────────────────────┐
│       FREE UNIVERSE              │  │       ENTERPRISE UNIVERSE           │
│  text.pollinations.ai            │  │  gen.pollinations.ai                │
│  • /openai/chat/completions      │  │  • /v1/chat/completions             │
│  • /models                       │  │  • /text/models                     │
│  • No authentication             │  │  • /account/profile                 │
│                                  │  │  • /account/balance                 │
│                                  │  │  • /account/usage                   │
│                                  │  │  • Bearer token required            │
└──────────────────────────────────┘  └────────────────────────────────────┘
```

---

## Source Tree Overview & Organization

In v6.1.0-beta.33, to ensure the repository remains a clean distribution, redundant and administrative scripts were strictly isolated from the production source.

```text
/
├── src/
│   ├── index.ts               # Extension Entrypoint
│   ├── locales/               # Native Translation Engine (en, fr, es, de, it)
│   ├── server/                # Core Server Infrastructure (proxy, quota, config...)
│   └── tools/                 # Agentic Capabilities Registry
├── scripts/                   # Development, diagnostic, and admin scripts (Git-Ignored from NPM)
│   ├── i18n/                  # Translation automation and injections
│   └── security/              # HMAC signature checks and token validators
├── tests/                     # Unit and API diagnostics
└── docs/                      # General documentations and archives
```

---

## Data Flow

### Initialization Sequence

```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ OpenCode │     │  Plugin  │     │  Proxy   │     │ Pollin-  │
│   Host   │     │  Entry   │     │  Server  │     │  ations  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  load plugin   │                │                │
     │───────────────>│                │                │
     │                │  listen(0)     │                │
     │                │───────────────>│                │
     │                │  :assignedPort │                │
     │                │<───────────────│                │
     │                │                │                │
     │  config(cfg)   │                │                │
     │───────────────>│                │                │
     │                │  generatePollinationsConfig()   │
     │                │────────────────────────────────>│
     │                │            models[]             │
     │                │<────────────────────────────────│
     │                │                │                │
     │  cfg.provider  │                │                │
     │  ['pollinations']               │                │
     │<───────────────│                │                │
```

### Chat Request Sequence

```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ OpenCode │     │  Proxy   │     │  Config  │     │ Upstream │
│   TUI    │     │  Server  │     │  Module  │     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /v1/chat/ │                │                │
     │ completions    │                │                │
     │───────────────>│                │                │
     │                │ loadConfig()   │                │
     │                │───────────────>│                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ getQuotaStatus()                │
     │                │────────────────────────────────>│
     │                │<────────────────────────────────│
     │                │                │                │
     │                │ [SAFETY NET]   │                │
     │                │ isEnterprise?  │                │
     │                │ Fallback?      │                │
     │                │ sanitizeTools()│                │
     │                │                │                │
     │                │ POST upstream  │                │
     │                │────────────────────────────────>│
     │                │            SSE stream           │
     │                │<────────────────────────────────│
     │   SSE stream   │                │                │
     │<───────────────│                │                │
```

---

## Module Reference

### 1. `index.ts` — Entry Point

**Responsibilities:**
- Plugin export for the OpenCode host
- HTTP proxy server startup (dynamic port)
- Tool registry initialization
- Hook registration (config, toast, status, commands)

**Dynamic Port Allocation:**
```typescript
server.listen(0, '127.0.0.1', () => {
    const assignedPort = server.address().port;
    // Port is communicated to OpenCode via the config hook baseURL
    resolve(assignedPort);
});
```
> ✅ Cross-platform. No port conflicts. No `fuser` dependency. Works on Windows, macOS, Linux.

**Proxy Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{ status, version, mode }` |
| `/v1/chat/completions` | POST | Main proxy to Pollinations |
| `/chat/completions` | POST | Alias (without v1 prefix) |

**Provider Registration:**
```typescript
config.provider['pollinations'] = {
    id: 'pollinations',
    name: `Pollinations AI (v${version})`,
    options: { baseURL: localBaseUrl },
    models: modelsObj   // dynamically populated from API
};
```

---

### 2. `server/config.ts` — Configuration

**Config Schema (V5, still in use):**
```typescript
interface PollinationsConfigV5 {
    version: string | number;
    apiKey?: string;
    
    // === CHAT MODELS & FALLBACKS ===
    mode: 'manual' | 'alwaysfree' | 'pro';
    thresholds: {
        tier: number;       // % Threshold before Free Universe fallback (0-100)
        wallet: number;     // % Threshold before Free Universe fallback (0-100)
    };
    fallbacks: {
        free: { main: string; agent: string; };
        enter: { agent: string; }; // For agent reasoning ONLY, not media generation
    };

    // === TOOLS PROTECTION ===
    enablePaidTools: boolean;            // Allow tools to consume Wallet pollen
    costConfirmationRequired?: boolean;  // Ask user if cost exceeds threshold
    costThreshold?: number;              // The limit triggering confirmation (in pollen/$)
    costEstimator?: boolean;             // Display live calculation in tool output

    // === UI & NOTIFICATIONS ===
    statusBar: boolean;
    lang?: string;        // Language for I18N (en, fr, es, de, it)
    gui: {
        status: 'none' | 'alert' | 'all';
        logs: 'none' | 'error' | 'verbose';
    };
}
```

**Priority Order (highest to lowest):**
1. `~/.pollinations/config.json` — Custom config
2. `~/.local/share/opencode/auth.json` — OpenCode auth store (**priority for apiKey**)
3. `~/.config/opencode/opencode.json` — Legacy OpenCode config

**Temporal Authority (v5.4.14+):** When both `config.json` and `auth.json` contain an API key, the file with the most recent `mtime` wins. `opencode.json` is always last resort.

**Exported Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadConfig()` | `() => PollinationsConfigV5` | Synchronous read, no cache |
| `saveConfig()` | `(updates: Partial<...>) => PollinationsConfigV5` | Merge + write |

---

### 3. `server/proxy.ts` — Request Router

**Responsibilities:**
- Chat request interception and routing
- Safety Net (automatic fallback)
- Model-specific sanitization (Azure, Vertex, Kimi)
- Gemini signature tracking for multi-round tool calls
- SSE stream forwarding
- Loop detection (Guillotine)

**Constants:**
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
```

**Routing Decision Tree:**
```text
model.startsWith('enter/') → isEnterprise = true
model.startsWith('free/')  → isEnterprise = false

MODE: alwaysfree
  IF isEnterprise AND model is paid-only → Block + fallback to free/mistral
  IF isEnterprise AND quota.tier == error → fallback to free/mistral
  IF isEnterprise AND tierRatio ≤ threshold → fallback to free/mistral

MODE: pro
  IF quota.tier == error → fallback to free/mistral
  IF wallet < threshold AND tierRatio ≤ threshold → fallback to free/mistral

MODE: manual
  No automatic switching. User controls everything.
```

**Upstream URLs:**

| Condition | URL |
|-----------|-----|
| isEnterprise = true | `https://gen.pollinations.ai/v1/chat/completions` |
| isEnterprise = false | `https://text.pollinations.ai/openai/chat/completions` |

**Sanitizations Applied Per Model:**

| Model Pattern | Sanitization |
|---------------|-------------|
| `gpt` / `openai` | Truncate tools to 120. Truncate tool_call IDs to 40 chars. |
| `gemini` | Dereference `$ref` schemas. Disable google_search_retrieval. |
| `kimi` / `moonshot` | Set `frequency_penalty: 1.1`, `presence_penalty: 0.4`. Anti-loop stop tokens. |
| `nova` | Limit output to 8000 tokens |

**Gemini Signature Tracking:**
Multi-round tool calls require the `thought_signature` field to be injected back on assistant messages. The proxy tracks signatures by hashing message content and stores them in `~/.config/opencode/pollinations-signature.json`.

**Loop Detection (Guillotine):**
If the response stream contains a line matching `\n\s*(User|user)\s*:`, the stream is immediately terminated to prevent infinite agent loops.

**Stop Reason Normalization:**
```typescript
// Normalizes all non-standard finish_reason values
chunkStr = chunkStr.replace(
    /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g,
    hasToolCalls ? '"finish_reason": "tool_calls"' : '"finish_reason": "stop"'
);
```

---

### 4. `server/generate-config.ts` — Model Discovery

**Endpoints:**

| Universe | URL | Auth |
|----------|-----|------|
| Free | `https://text.pollinations.ai/models` | None |
| Enterprise | `https://gen.pollinations.ai/text/models` | Bearer token |

**Model Format Returned to OpenCode:**
```typescript
interface OpenCodeModel {
    id: string;       // "free/gemini" or "enter/gpt-4o"
    name: string;     // "[Free] Gemini Flash"
    object: string;   // "model"
    variants?: {
        high_reasoning?: { options: { reasoningEffort: "high", budgetTokens: 16000 } };
        safe_tokens?: { options: { maxTokens: 8000 } };
        bedrock_safe?: { options: { maxTokens: 8000 } };
    };
    limit?: {
        context?: number;
        output?: number;
    };
}
```

**Automatic Enrichment:**

| Condition | Enhancement Added |
|-----------|------------------|
| `reasoning === true` or `*thinking*` | `high_reasoning` variant |
| `*claude*`, `*mistral*`, `*llama*` | `safe_tokens: 8000` variant |
| `*nova*` | `limit.output: 8000` |
| `*nomnom*`, `*scrape*` | `limit.output: 2048` |

---

### 5. `server/quota.ts` — Quota Tracking

**QuotaStatus Interface (v6.4.1):**
```typescript
interface QuotaStatus {
    tierRemaining: number;      // Quest Pollen remaining this hour
    tierUsed: number;           // Quest Pollen consumed this hour
    tierLimit: number;          // Hourly refill (deduced: 0.01/0.15/0.4/0.8/10)
    walletBalance: number;      // Paid Pollen balance
    nextResetAt: Date;
    timeUntilReset: number;     // ms until next :00 UTC
    canUseEnterprise: boolean;  // tier > 0 OR wallet > 0
    isUsingWallet: boolean;     // tier === 0 AND wallet > 0
    needsAlert: boolean;        // Below configured threshold
    tier: string;               // 'spore' | 'seed' | 'flower' | 'nectar' (deduced)
    tierEmoji: string;
}
```

**Allowance Deduction (v6.4.1):**
Since Pollinations removed `tier` and `nextResetAt` from `/account/profile` (PR #7618, commit #10255),
the plugin deduces the hourly refill from usage data:
1. Fetch `/account/balance` (format dual: legacy `{balance}` or new PR #12449 `{total, allowance, pack}`)
2. If `allowance` is present (PR #12449 format) → use natively
3. Otherwise, fetch `/account/usage?days=1`, filter `meter_source == 'tier'`, take max `cost_usd`
4. Map to the closest known refill: `[0, 0.01, 0.15, 0.4, 0.8, 10]`
5. `calculateResetInfo()` computes the next :00 UTC locally

**Paid-Only Model Strategy (v5.5+):**
Models tagged `paid_only: true` (e.g., `gemini-large`, `veo`) always deduct from `packBalance`. Quest Pollen cannot be used for these models.

**Limited Key Support (v5.6+):**
Some API keys allow generation but block access to `/account/usage` and `/account/profile`. Detection happens at `/connect` time:
- If profile endpoints return 403/401 but model generation works → `keyHasAccessToProfile = false`
- Mode is forced to `manual` to skip quota checks
- Generation is allowed; proxy ignores quota 403s and passes requests through

**Cache:**
```typescript
const CACHE_TTL = 30000; // 30 seconds
```

**Hourly Refill Rates (deduced):**

| Refill/h | Emoji | Label |
|----------|:-----:|-------|
| 0.01 | 🍄 | spore |
| 0.15 | 🌱 | seed |
| 0.4 | 🌸 | flower |
| 0.8 | 🍯 | nectar |
| 10 | 🐝 | router |

**Smart Fetch Quota (v6.4.1 — updated):**
`fetchUsageForPeriod` uses cursor-based pagination (`before_event_id`) instead of the deprecated `offset` parameter (silently ignored by the API since OpenAPI v0.3.0). Queries `/account/usage?limit=100` iteratively until reaching the hourly reset boundary.

---

### 6. `server/commands.ts` — CLI Commands

**Available Commands:**

| Command | Alias | Arguments | Description |
|---------|-------|-----------|-------------|
| `/pollinations usage` | `/poll usage` | `[full]` | Show quota dashboard |
| `/pollinations mode` | `/poll mode` | `[manual\|alwaysfree\|pro]` | Change routing mode |
| `/pollinations fallback` | `/poll fallback` | `<main> [agent]` | Configure fallback models |
| `/pollinations config` | `/poll config` | `[key] [value]` | Read/write config values |
| `/pollinations status` | `/poll status` | — | Plugin health check |
| `/pollinations help` | `/poll help` | — | Full help |

**OpenCode Hook:**
```typescript
'tui.command.execute': async (input, output) => {
    const result = await handleCommand(input.command);
    if (result.handled) {
        output.handled = true;
        output.response = result.response;
        output.error = result.error;
    }
}
```

---

### 7. `server/toast.ts` — Notifications

**Channels:**

| Channel | Config Key | Used For |
|---------|-----------|----------|
| `status` | `gui.status` | Dashboard, quota warnings, mode changes |
| `log` | `gui.logs` | Technical errors, debug |

**Filtering Logic:**
- `none` → suppress all
- `alert` → show only `error` and `warning` types
- `all` (or `verbose`) → show everything

**Stealth Mode (v6.1):**
Status toasts are suppressed when the active session is not a Pollinations Enterprise (paid) session. This prevents notification noise when users switch between multiple providers.

**Queue:** Max 20 messages. Persisted to `/tmp/pollinations-toasts.log`.

---

### 8. `server/status.ts` — Status Bar

**Responsibilities:**
- Updates the OpenCode status bar via the `session.idle` hook
- Shows current mode, tier, and Pollen balance
- Updates every time a session becomes idle (after a response is delivered)

---

### 9. `server/pollinations-api.ts` — API Client

**Exported Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `fetchFreeModels()` | `() => Promise<OpenAIModel[]>` | List Free Universe models |
| `fetchEnterpriseModels()` | `(apiKey) => Promise<OpenAIModel[]>` | List Enterprise models |
| `getDetailedUsage()` | `(apiKey) => Promise<DetailedUsageResponse>` | Per-model usage history |
| `getAggregatedModels()` | `() => Promise<{data: OpenAIModel[]}>` | Merge Free + Enterprise |

**Standard Request Headers:**
```typescript
const HEADERS = {
    'User-Agent': 'curl/8.5.0',
    'Origin': '',
    'Referer': ''
};
```

---

## Tools System (v6.1)

The plugin exposes a tool registry to OpenCode's agent runtime. Tools are registered conditionally based on API key presence and are organized in three namespaces.

**Tool Registry Initialization:**
```typescript
// index.ts
const toolRegistry = createToolRegistry();
// Registered count logged at startup
log(`[Tools] ${Object.keys(toolRegistry).length} tools registered`);
```

**Tool Pattern (all tools follow this structure):**
```typescript
export const myTool: ToolDefinition = tool({
    description: `...`,
    args: { /* zod schema */ },
    async execute(args, context) {
        context.metadata({ title: "...", metadata: { type: 'success', message: "..." } });
        return `result string`;
    }
});
```

---

### Pollinations Generation Tools

Located in `src/tools/pollinations/`.

| Tool File | Tool Name | Description |
|-----------|-----------|-------------|
| `gen_image.ts` | `gen_image` | Generate images via Pollinations API **(API Key Required)** |
| `gen_audio.ts` | `gen_audio` | Generate speech or sound effects |
| `gen_music.ts` | `gen_music` | Generate music from a text description |
| `gen_video.ts` | `gen_video` | Generate short video clips |
| `transcribe_audio.ts` | `transcribe_audio` | Transcribe a local audio file to text |
| `polli_web_search.ts` | `polli_web_search` | Connected Web Search for sourced context |
| `beta_discovery.ts` | `beta_discovery` | API Explorer V4 (Defense-in-Depth) offering safe exploration of endpoints with built-in parameter fuzzing. |

---

### Design Tools

Located in `src/tools/design/`.

| Tool File | Tool Name | Description |
|-----------|-----------|-------------|
| `gen_diagram.ts` | `gen_diagram` | Generate diagrams (flowchart, sequence, architecture, etc.) |
| `gen_palette.ts` | `gen_palette` | Create a color palette from a description or reference image |
| `gen_qrcode.ts` | `gen_qrcode` | Generate styled QR codes |

---

### Power Tools

Located in `src/tools/power/`.

| Tool File | Tool Name | Description |
|-----------|-----------|-------------|
| `remove_background.ts` | `remove_background` | Remove image background (free or BackgroundCut HD) |
| `rmbg_keys.ts` | `rmbg_keys` | Manage BackgroundCut API keys (`list`, `add`, `remove`, `clear`) |
| `extract_audio.ts` | `extract_audio` | Extract the audio track from a video file |
| `extract_frames.ts` | `extract_frames` | Extract frames from a video at a given interval |
| `file_to_url.ts` | `file_to_url` | Upload a local file and return a public URL |

**Background Removal — Multi-Key Rotation:**

The `remove_background` tool implements key rotation across a pool of BackgroundCut API keys stored in `~/.pollinations/backgroundcut_keys.json`:

1. Try the active key (round-robin index)
2. On `402` (no credits), `429` (rate limit), or `401` (expired) → rotate to next key
3. If all keys fail → fall back to the free provider (`cut`) automatically
4. If `provider=backgroundcut` is explicitly set (not `auto`) → throw error instead of silently falling back

**rmbg_keys Actions:**

| Action | Arguments | Description |
|--------|-----------|-------------|
| `list` | — | Show all stored keys (masked) with active indicator |
| `add` | `key=<apikey>` | Add a new BackgroundCut key |
| `remove` | `key=<apikey>` | Remove a specific key |
| `clear` | — | Remove all keys, revert to free provider |

Key storage format (`~/.pollinations/backgroundcut_keys.json`):
```json
{
    "keys": ["bgcut_xxx...", "bgcut_yyy..."],
    "currentIndex": 0
}
```

---

## Configuration Schemas

### `~/.pollinations/config.json`
```json
{
    "version": "6.1.0",
    "mode": "pro",
    "apiKey": "pk_xxxxxxxxxxxx",
    "gui": {
        "status": "alert",
        "logs": "error"
    },
    "thresholds": {
        "tier": 10,
        "wallet": 5
    },
    "fallbacks": {
        "free": {
            "main": "free/mistral",
            "agent": "free/openai-fast"
        },
        "enter": {
            "agent": "free/gemini"
        }
    },
    "enablePaidTools": false,
    "statusBar": true
}
```

### `~/.local/share/opencode/auth.json`
```json
{
    "pollinations": {
        "key": "pk_xxxxxxxxxxxx"
    }
}
```

### `~/.pollinations/backgroundcut_keys.json`
```json
{
    "keys": ["bgcut_key1...", "bgcut_key2..."],
    "currentIndex": 0
}
```

---

## Internal API Reference

### Proxy Server (Dynamic Port)

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/health` | GET | — | `{ status, version, mode }` |
| `/v1/chat/completions` | POST | OpenAI Chat Format | SSE Stream |
| `/chat/completions` | POST | OpenAI Chat Format | SSE Stream |

**Request Body:**
```typescript
interface ChatRequest {
    model: string;          // "free/gemini" or "enter/gpt-4o"
    messages: Message[];
    stream?: boolean;       // Default: true
    tools?: Tool[];
    temperature?: number;
    max_tokens?: number;
}
```

**SSE Response Format:**
```
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

---

## Error Handling

### Retry Logic
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
```
Retried: `429`, `5xx`, network errors.
Not retried: `400`, `401`, `404`.

### Transparent Fallback Flow
```text
Enterprise API returns 402/429/401/403
    │
    ▼
Switch to Free Universe
    actualModel = fallbacks.free.main
    isEnterprise = false
    Emit Warning Toast
    Retry Request
    │
    ▼
Inject "⚠️ Switched to free model" warning into stream
```

### Known Limitations

| Issue | Severity | Status |
|-------|----------|--------|
| Signature map unbounded growth | Low | Fix scheduled (LRU eviction) |
| 30s quota cache — can be stale | Low | Mitigated by Ledger in v6.1 |
| Model list requires restart to update | Low | Config watcher planned |

---

## Security & Authentication

**API Key Storage — Transmission:**
- Key is only ever sent to `gen.pollinations.ai`
- Header: `Authorization: Bearer <key>`
- Never logged in plaintext (except debug-level logs, which are opt-in)

**Log Files:**

| File | Contents | Sensitivity |
|------|----------|-------------|
| `/tmp/opencode_pollinations_v4.log` | General requests | Low |
| `/tmp/opencode_pollinations_debug.log` | Full request bodies | ⚠️ High |
| `/tmp/pollinations-toasts.log` | Notification queue | Low |
| `/tmp/opencode_pollinations_config_debug.log` | Config reads | Medium |
| `/tmp/pollinations_quota_debug.log` | Quota fetches | Medium |
| `/tmp/POLLI_LIFECYCLE.log` | Process lifecycle | Low |

> ⚠️ Debug log files may contain full request/response bodies. Do not share them publicly.

---

## Roadmap

### ✅ Shipped (Cumulative — up to v6.1-beta)

| Feature | Since | Notes |
|---------|-------|-------|
| Free Universe proxy | v1.0 | text.pollinations.ai |
| Enterprise proxy + API key | v4.0 | gen.pollinations.ai |
| Safety Net (automatic fallback) | v5.0 | Pro and AlwaysFree modes |
| Quota tracking | v5.0 | /account endpoints |
| `/pollinations` commands | v5.0 | mode, usage, fallback, config |
| Dynamic port allocation | v5.4.6 | Cross-platform, no conflicts |
| Cross-platform support | v5.4.6 | Windows + macOS + Linux |
| Gemini tools auto-fallback to OpenAI | v5.4 | On 401 auth error |
| Gemini multi-round signature tracking | v5.5 | thought_signature injection |
| Limited-key support | v5.6 | Generation-only keys |
| Enterprise schema sanitization | v5.9 | Azure, Vertex, Bedrock, Kimi |
| Tool truncation (Azure 120 limit) | v5.9 | gpt/openai models |
| Stop reason normalization | v5.9 | Across all upstream providers |
| Loop detection (Guillotine) | v5.9 | "User:" pattern hard stop |
| Paid-only model enforcement | v5.5 | walletBalance check |
| Smart Fetch quota system | v6.1-b22 | Recursive API fetch replaces local Ledger |
| Stealth notifications | v6.1 | Toasts only in paid sessions |
| Tools system | v6.1 | 15+ tools in tools/ |
| gen_image, gen_audio, gen_music | v6.1 | Pollinations generation |
| gen_video, transcribe_audio | v6.1 | Multimodal |
| polli_web_search | v6.1 | Web research |
| gen_diagram, gen_palette, gen_qrcode | v6.1 | Design tools |
| remove_background + key rotation | v6.1 | BackgroundCut + free fallback |
| extract_audio, extract_frames | v6.1 | Media power tools |
| file_to_url | v6.1 | Local file upload |
| status.ts status bar module | v6.1 | Session idle hook |

---

### 🔜 Short Term (v6.2 – v6.5, Q1–Q2 2026)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Signature map rotation (LRU) | 🟡 Medium | Low | Cap at 1000 entries |
| Config file watcher | 🟡 Medium | Medium | Hot-reload without restart |
| Unit tests — proxy + quota | 🔴 High | High | Currently no test coverage |
| Unit tests — tools/ | 🔴 High | High | Gen tools, power tools |
| `/poll status` one-liner | 🟡 Medium | Low | Faster than full dashboard |
| Structured logging | 🟡 Medium | Medium | JSON logs + log rotation (10MB) |
| Model search `/poll models <q>` | 🟢 Low | Medium | Filter model list |
| Colored command output | 🟢 Low | Low | Markdown rendering |
| Debug mode toggle | 🟡 Medium | Low | `/poll config debug true` |
| Metrics endpoint `/metrics` | 🟢 Low | Medium | Prometheus format |

---

### 🔭 Medium Term (v7.0, Q3–Q4 2026)

**Theme: Smart Routing**

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Cost-aware routing | 🔴 High | High | Choose model by estimated cost |
| Latency-aware routing | 🟡 Medium | High | Track per-model latency history |
| Multi-provider failover | 🔴 High | High | Fallback to OpenRouter if Pollinations unreachable |
| Request queuing | 🟡 Medium | Medium | Local rate-limit before upstream |
| Caching layer | 🟢 Low | High | Cache identical responses |

**Architecture Target:**
```text
┌──────────────────────────────────────────────┐
│                SMART ROUTER v7.0             │
│  Cost Scorer → Latency Tracker → Decision    │
│                    ▼                         │
│         Free API / Enterprise / OpenRouter   │
└──────────────────────────────────────────────┘
```

---

### 🌌 Long Term (v8.0+, 2027)

| Feature | Description |
|---------|-------------|
| Web Dashboard | Browser UI for monitoring, config, analytics |
| Team features | Shared quotas and API keys |
| Persistent memory | Vector DB integration for long-running agents |
| Self-hosted gateway | Deploy your own Pollinations proxy |
| Agent orchestration | Multi-step reasoning with memory |
| Workflow builder | Visual workflow editor |

---

### Community Backlog

| Idea | Votes | Complexity |
|------|:-----:|:----------:|
| API usage alerts (email/Discord on threshold) | 6 | Medium |
| Model comparison mode | 5 | High |
| Conversation export (Markdown/JSON) | 4 | Low |
| Cost calculator | 3 | Low |
| Prompt templates | 2 | Medium |

Open an [issue](https://github.com/fkom13/opencode-pollinations-plugin/issues) to vote or propose ideas.

---

### Release Schedule (Updated)

| Version | Target | Theme |
|---------|--------|-------|
| ~~v5.3~~ | ~~Q1 2026~~ | ~~Stabilization~~ → merged into v5.9 |
| ~~v5.4~~ | ~~Q2 2026~~ | ~~UX~~ → merged into v5.9 |
| **v6.2.7.1** | **Now** | **Media Fallback, Hourly Quotas, API Explorer V4** |
| v6.3 – v6.5 | Q2 2026 | Tests, hot-reload, logging |
| v7.0 | Q4 2026 | Smart Routing |
| v8.0 | 2027 | Platform |

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md).

**Priority areas needing help:**
- 🧪 **Testing** — Unit tests for `proxy.ts`, `quota.ts`, and all `tools/` (Ensure you place them in `tests/api/`)
- 📚 **Documentation** — Tool usage examples and user guides
- 🌍 **i18n** — French/English consistency, German/Spanish/Italian translations
- 🎨 **UX** — Command output formatting
- 🔧 **DevOps** — Internal `scripts/` maintenance and release automation

**Priority labels:**

| Label | Meaning |
|-------|---------|
| 🔴 P0 | Critical, blocks release |
| 🟡 P1 | Important, next minor |
| 🟢 P2 | Nice to have |
| ⚪ P3 | Backlog |

---

## Contact
- **GitHub**: [@fkom13](https://github.com/fkom13)
- **Discord**: [Pollinations Community](https://discord.gg/pollinations-ai-885844321461485618)
- **Issues**: [Plugin Repository](https://github.com/fkom13/opencode-pollinations-plugin/issues)

*Last updated: 2026-02-18*
