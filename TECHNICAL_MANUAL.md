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
│                       POLLINATIONS PLUGIN (v6.5.x)                        │
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
│  │  transcribe_audio             gen_edit_image_free · gen_video_free    │ │
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
    mode: 'manual' | 'quest' | 'quest_only' | 'paid';
    thresholds: {
        quest: number;      // Absolute Quest pollen floor (default 0.05)
        wallet: number;     // Absolute Paid pollen floor (default 0.5)
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
const MAX_RETRIES = 1; // conservative same-request retry: HTTP 429 only
const RETRY_DELAY_MS = 1000;
```

**Routing Decision Tree:**
```text
model.startsWith('enter/') → isEnterprise = true
model.startsWith('free/')  → isEnterprise = false

MODE: quest (QUEST_PREFERRED, default)
  IF isEnterprise AND model is paid-only AND wallet empty → fallback to free
  IF isEnterprise AND quota read failed → fallback to free
  IF isEnterprise AND Quest+Paid both exhausted → fallback to free

MODE: quest_only (QUEST_ELIGIBLE_ONLY, best-effort)
  paid-only models are HARD-BLOCKED locally (no paid route)
  IF isEnterprise AND quota read failed → fallback to free
  IF isEnterprise AND questBalance ≤ floor → fallback to free
  (a Paid pack debit can still occur server-side in a race)

MODE: paid (PAID_ALLOWED)
  IF quota read failed → fallback to free
  IF walletBalance < wallet floor → fallback to free
  IF walletBalance < thresholds.wallet → fallback to free/openai-fast

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
    id: string;       // "free/<model-id>" or "enter/<model-id>"
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

**QuotaStatus Interface (v6.5):**
```typescript
interface QuotaStatus {
    questBalance: number;       // best-effort Quest pollen available
    walletBalance: number;      // Paid pollen (pack) — best-effort when absent
    totalBalance: number;       // raw {balance} total from /account/balance
    canUseEnterprise: boolean;  // quest > 0.05 OR wallet > 0.05
    isUsingWallet: boolean;     // quest exhausted AND wallet > 0
    needsAlert: boolean;        // below configured floors
    errorType?: 'auth_limited' | 'network' | 'unknown';
}
```

**Quest/Paid Balance (v6.5):**
The old hourly-refill model was deleted upstream (cron disabled 2026-06, code
removed 2026-07). The client CANNOT read the server-side Quest/Paid split
(`/account/balance` returns only the total). The plugin therefore:
1. Reads `/account/balance` for the total.
2. Estimates Quest via claimed quest pollen minus tier-metered usage since claim.
3. Estimates Paid as `pack` when exposed, else total − Quest estimate.
4. Reads the authoritative split from `meter_source` in `/account/usage`
   (`tier` = Quest, `pack` = Paid).

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

**Smart Fetch Quota (v6.4.1 — updated):**
`fetchUsageForPeriod` uses cursor-based pagination (`before_event_id`) instead of the deprecated `offset` parameter (silently ignored by the API since OpenAPI v0.3.0). Queries `/account/usage?limit=100` iteratively until reaching the hourly reset boundary.

---

### 6. `server/commands.ts` — CLI Commands

**Available Commands:**

| Command | Alias | Arguments | Description |
|---------|-------|-----------|-------------|
| `/pollinations usage` | `/poll usage` | `[full]` | Show quota dashboard |
| `/pollinations mode` | `/poll mode` | `[manual\|quest\|quest_only\|paid]` | Change routing mode |
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
| `remove_background.ts` | `remove_background` | No-key RMBG: bgeraser reverse primary → ClearBackdrop fallback; magic-byte output validation |
| `extract_audio.ts` | `extract_audio` | Extract the audio track from a video file |
| `extract_frames.ts` | `extract_frames` | Extract frames from a video at a given interval |
| `file_to_url.ts` | `file_to_url` | Upload a local file and return a public URL |

**Background Removal — no-key resilient chain:**

`remove_background` has no paid provider, no key store and no rotation tool. The active chain is intentionally simple:

1. Resolve the input from a local path, HTTP(S) URL or data URI.
2. Validate the real input media type from bytes.
3. Try the bgeraser reverse backend first.
4. If bgeraser fails in `provider=auto`, retry once through ClearBackdrop (`https://api.clearbackdrop.com/v1/remove`).
5. Validate the returned image bytes and persist with the real detected extension (JPEG/PNG/WebP), even when an upstream filename or Content-Type is wrong.
6. `provider=bgeraser` and `provider=clearbackdrop` force one provider; `provider=auto` is the recommended resilient mode.

There is deliberately **no `rmbg_keys` tool and no BackgroundCut path** in the current runtime.

**Free creator media contracts:**

| Tool | Current no-key contract | Resilience |
|------|-------------------------|------------|
| `gen_edit_image_free` | text generation or 1–3 image edit; ratios `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`; `custom` generation 256–1440 (multiple of 16); `match_input_image` edit; seed, prompt upsampling, edit turbo | Live per-IP quota; magic-byte output detection |
| `gen_video_free` | P‑Video 1–10 s verified output; 720p/1080p; 24/48 fps; seven aspect ratios; optional first-frame image/audio; seed, draft, prompt upsampling, save-audio | Live `p-video` quota; same-job polling only; MP4/WebM magic-byte validation |
| `object_remover` | prompt-based object removal | Input/output magic-byte validation; real extension |
| `image_upscaler` | 2× / 4× | Real JPEG/PNG/WebP extension follows bytes |
| `image_enhancer` | target longest side 1K / 2K / 4K | Real JPEG/PNG/WebP extension follows bytes |
| `remove_background` | bgeraser → ClearBackdrop | One free fallback; no keys; real extension |

The free playground quotas are intentionally read at execution time rather than documented as fixed constants. P‑Video accepts a submitted duration greater than 10 seconds but the free backend was verified to return approximately 10 seconds, so the public tool enforces 1–10 seconds.

---

## Configuration Schemas

### Pollinations config (`config.json`)

Platform location is resolved by `getConfigDir()`:
- Linux: `${XDG_CONFIG_HOME:-~/.config}/pollinations/config.json`
- macOS: `~/Library/Application Support/pollinations/config.json`
- Windows: `%APPDATA%\pollinations\config.json`

Representative v6.5.x config:
```json
{
  "version": "6.5.x",
  "mode": "quest",
  "gui": { "status": "alert", "logs": "none" },
  "thresholds": { "quest": 0.05, "wallet": 0.5 },
  "fallbacks": {
    "free": { "main": "free/openai-fast", "agent": "free/openai-fast" },
    "enter": { "agent": "free/openai-fast" }
  },
  "enablePaidTools": false,
  "enableDeveloperTools": false,
  "costThreshold": 0.15,
  "costConfirmationRequired": true,
  "statusBar": true,
  "costEstimator": true,
  "lang": "en"
}
```

`thresholds.quest` and `thresholds.wallet` are absolute Pollen floors. Older configuration names and removed refill fields are migrated/purged on load; see `docs/V65_MIGRATION.md` for the compatibility mapping.

### OpenCode auth (`auth.json`)

The plugin checks platform-specific OpenCode auth locations plus `OPENCODE_AUTH` / `OPENCODE_CONFIG_DIR`. A compatible entry is:
```json
{
  "pollinations": {
    "key": "sk_..."
  }
}
```

`/poll login` is the recommended path; it performs the browser/device flow so the user normally never has to paste the key manually. The most recently updated valid key between plugin config and OpenCode auth wins.

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
    model: string;          // "free/<model-id>" or "enter/<model-id>"
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
const MAX_RETRIES = 1; // one conservative retry, 429 only
```

Blind replay policy for the **same chat request**:
- Retried once: `429` only.
- Never blindly replayed: abort, network error, timeout, `402`, ambiguous `5xx`/`520`, or other `4xx`.

This is deliberately stricter than the Safety Net. After a definitive enterprise failure (`401`, `402`, `403`, `429`, `502`), the router may make one explicit **different-route free fallback** request; that transition is surfaced as a Safety Net event rather than treated as an invisible retry.

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
| Account/quota data can change between checks | Low | Live reads + conservative billing guards; server remains source of truth |
| Upstream catalogs can change during long sessions | Low | Model Registry TTL refresh + offline fallback |

---

## Security & Authentication

**API Key Storage — Transmission:**
- Key is only ever sent to `gen.pollinations.ai`
- Header: `Authorization: Bearer <key>`
- Never intentionally logged in plaintext; user-facing diagnostics mask key material

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

### ✅ Shipped (Cumulative — up to v6.5.x)

| Feature | Since | Notes |
|---------|-------|-------|
| Free Universe proxy | v1.0 | text.pollinations.ai |
| Enterprise proxy + API key | v4.0 | gen.pollinations.ai |
| Safety Net (automatic fallback) | v5.0 | quest / quest_only / paid modes |
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
| Tools system | v6.1 → v6.5.x | 24 runtime tools; capability/artifact contracts |
| gen_image, gen_audio, gen_music | v6.1 | Pollinations generation |
| gen_video, transcribe_audio | v6.1 | Multimodal |
| polli_web_search | v6.1 | Web research |
| gen_diagram, gen_palette, gen_qrcode | v6.1 | Design tools |
| remove_background resilient free chain | v6.5.x | bgeraser reverse → ClearBackdrop; no key store/rotation |
| extract_audio, extract_frames | v6.1 | Media power tools |
| file_to_url | v6.1 | Local file upload |
| status.ts status bar module | v6.1 | Session idle hook |

---

### 🔜 Maintenance / Next after v6.5.x

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
| **v6.5.x** | **Current** | **Quest/Paid convergence, Artifact Core, resilient free media tools, 3D** |
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
