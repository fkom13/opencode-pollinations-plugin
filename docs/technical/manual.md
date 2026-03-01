# 📘 Documentation Technique - OpenCode Pollinations Plugin v6.1 (Beta)

## Table des Matières
- [Architecture Générale](#architecture-générale)
- [Flux de Données](#flux-de-données)
- [Modules Détaillés](#modules-détaillés)
- [Schémas de Configuration](#schémas-de-configuration)
- [API Internes](#api-internes)
- [Protocoles de Communication](#protocoles-de-communication)
- [Gestion des Erreurs](#gestion-des-erreurs)
- [Sécurité et Authentification](#sécurité-et-authentification)
- [Roadmap](#roadmap)

---

## Architecture Générale

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENCODE HOST                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Plugin Context (ctx)                            │ │
│  │   • ctx.client.tui.showToast() - Notifications                         │ │
│  │   • config() hook - Injection des providers                            │ │
│  │   • session.idle hook - Status bar updates                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POLLINATIONS PLUGIN (v5.9.1)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   index.ts  │──│  config.ts  │──│  proxy.ts   │──│ generate-config.ts  │ │
│  │  (Entry)    │  │ (Settings)  │  │  (Router)   │  │  (Model Discovery)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │               │                │                    │             │
│         ▼               ▼                ▼                    ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  toast.ts   │  │  quota.ts   │  │ commands.ts │  │ pollinations-api.ts │ │
│  │ (Notifs)    │  │ (Tracking)  │  │  (CLI)      │  │   (API Client)      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    HTTP PROXY SERVER (Dynamic Port)                  │  │
│  │   127.0.0.1:<dynamic>/v1/chat/completions → Pollinations APIs        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
┌───────────────────────────────────┐  ┌───────────────────────────────────────┐
│       FREE UNIVERSE               │  │         ENTERPRISE UNIVERSE            │
│  text.pollinations.ai             │  │     gen.pollinations.ai                │
│  • /models                        │  │     • /v1/chat/completions             │
│  • /openai/chat/completions       │  │     • /text/models                     │
│  • Pas d'authentification         │  │     • /account/profile                 │
│                                   │  │     • /account/balance                 │
│                                   │  │     • /account/usage                   │
│                                   │  │     • Bearer Token requis              │
└───────────────────────────────────┘  └───────────────────────────────────────┘
```

---

## Flux de Données

### Séquence d'Initialisation
```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ OpenCode │     │  Plugin  │     │  Proxy   │     │ Pollina- │
│   Host   │     │  Entry   │     │  Server  │     │  tions   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  load plugin   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │                │ listen(0)      │
     │                │                │ (Dynamic Port) │
     │                │<───────────────│                │
     │                │                │                │
     │  config(cfg)   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ generatePollinationsConfig()   │
     │                │────────────────────────────────>│
     │                │                │    models[]   │
     │                │<────────────────────────────────│
     │                │                │                │
     │  cfg.provider  │                │                │
     │  ['pollinations']               │                │
     │<───────────────│                │                │
     │                │                │                │
```

### Séquence de Requête Chat
```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ OpenCode │     │  Proxy   │     │  Config  │     │ Upstream │
│   TUI    │     │  Server  │     │  Module  │     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /v1/chat/ │                │                │
     │ completions    │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ loadConfig()   │                │
     │                │───────────────>│                │
     │                │    config      │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ getQuotaStatus()               │
     │                │────────────────────────────────>│
     │                │      QuotaStatus               │
     │                │<────────────────────────────────│
     │                │                │                │
     │                │ [SAFETY NET LOGIC]             │
     │                │ Determine: isEnterprise?       │
     │                │ Fallback needed?               │
     │                │                │                │
     │                │ sanitizeTools()│                │
     │                │ (Vertex/Azure) │                │
     │                │                │                │
     │                │ POST upstream  │                │
     │                │────────────────────────────────>│
     │                │                │    stream      │
     │                │<────────────────────────────────│
     │                │                │                │
     │   SSE stream   │                │                │
     │<───────────────│                │                │
     │                │                │                │
     │                │ emitStatusToast()              │
     │                │───────────────>│                │
     │                │                │                │
```

---

## Modules Détaillés

### 1. `src/index.ts` - Point d'Entrée

**Responsabilités:**
- Export du plugin OpenCode
- Initialisation du serveur proxy HTTP
- Nettoyage des processus zombies
- Registration des hooks

**Constantes:**
```typescript
const LOG_FILE = '/tmp/opencode_pollinations_v4.log';
// Note: TRACKING_PORT supprimé depuis v5.4.6 (port dynamique)
```

**Dynamic Port Allocation (v5.4.6+):**
```typescript
server.listen(0, '127.0.0.1', () => {
    const assignedPort = server.address().port;
    log(`[Proxy] Started V5.6.0 (Dynamic Port) on port ${assignedPort}`);
    resolve(assignedPort);
});
```
> ✅ **Cross-Platform**. Le plugin demande un port libre au système (0). Plus de conflits de ports, compatible Windows/Mac/Linux. La logique `fuser -k` a été supprimée.

**Server HTTP:**

| Endpoint | Méthode | Description |
|---|---|---|
| `/health` | GET | Status du proxy + mode courant |
| `/v1/chat/completions` | POST | Proxy vers Pollinations |
| `/chat/completions` | POST | Alias sans préfixe v1 |

**Hook config():**
```typescript
config.provider['pollinations'] = {
    id: 'pollinations',
    name: 'Pollinations V5.6.0 (Native)',
    options: { baseURL: localBaseUrl },
    models: modelsObj
};
```

---

### 2. `src/server/config.ts` - Gestion Configuration

**Schéma V5:**
```typescript
interface PollinationsConfigV5 {
    version: string | number;
    mode: 'manual' | 'alwaysfree' | 'pro';
    apiKey?: string;
    
    gui: {
        status: 'none' | 'alert' | 'all';
        logs: 'none' | 'error' | 'verbose';
    };
    
    thresholds: {
        tier: number;      // % (0-100)
        wallet: number;    // $ absolu
    };
    
    fallbacks: {
        free: { main: string; agent: string; };
        enter: { agent: string; };
    };
    
    enablePaidTools: boolean;
    statusBar: boolean;
}
```

**Hiérarchie de Lecture (Priorité Décroissante):**
1. `~/.pollinations/config.json` (Configuration Custom)
2. `~/.local/share/opencode/auth.json` (Auth Store OpenCode - **PRIORITAIRE** pour apiKey)
3. `~/.config/opencode/opencode.json` (Config OpenCode Legacy)

**Fonctions Exportées:**

| Fonction | Signature | Description |
|---|---|---|
| `loadConfig()` | `() => PollinationsConfigV5` | Lecture synchrone (pas de cache) |
| `saveConfig()` | `(updates: Partial<...>) => PollinationsConfigV5` | Merge + écriture |

**Fichiers Créés:**
- `~/.pollinations/config.json`: Configuration persistante
- `/tmp/opencode_pollinations_config_debug.log`: Debug

---

### 3. `src/server/proxy.ts` - Routeur Principal

**Responsabilités:**
- Interception des requêtes chat
- Routing Free/Enterprise
- Safety Net (fallback automatique)
- Sanitization des tools (Azure/Vertex)
- Gestion des signatures Gemini
- Streaming SSE

**Constantes:**
```typescript
const SIG_FILE = '~/.config/opencode/pollinations-signature.json';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
```

**Logique de Routing:**
```text
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTING DECISION TREE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  model.startsWith('enter/') ───> isEnterprise = true           │
│  model.startsWith('free/')  ───> isEnterprise = false          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODE: alwaysfree                      │   │
│  │  IF isEnterprise AND model in paid-list:                 │   │
│  │     → BLOCK (Message: Paid Only requires Pro)            │   │
│  │     → Fallback to free/mistral                           │   │
│  │  IF isEnterprise AND quota.tier == 'error':              │   │
│  │     → Fallback to free/mistral                           │   │
│  │  IF isEnterprise AND tierRatio <= threshold:             │   │
│  │     → Fallback to free/mistral                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODE: pro                             │   │
│  │  IF isEnterprise AND quota.tier == 'error':              │   │
│  │     → Fallback to free/mistral                           │   │
│  │  IF wallet < threshold AND tierRatio <= tierThreshold:   │   │
│  │     → Fallback to free/mistral                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODE: manual                          │   │
│  │  No automatic fallback. User controls everything.        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**URLs Cibles:**

| Condition | URL |
|---|---|
| isEnterprise = true | `https://gen.pollinations.ai/v1/chat/completions` |
| isEnterprise = false | `https://text.pollinations.ai/openai/chat/completions` |

**Sanitization Tools:**
```typescript
// Azure/OpenAI: Limite 120 tools
if (model.includes("gpt") || model.includes("openai")) {
    proxyBody.tools = truncateTools(proxyBody.tools, 120);
    // + Truncate tool_call IDs to 40 chars
}

// Vertex/Gemini: Dereference $ref schemas
if (model.includes("gemini")) {
    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
}

// Kimi/Moonshot: Anti-loop penalties
if (model.includes("kimi") || model.includes("moonshot")) {
    proxyBody.frequency_penalty = 1.1;
    proxyBody.presence_penalty = 0.4;
    proxyBody.stop = ["<|endoftext|>", "User:", "\nUser", "User :"];
}
```

**Gestion Signatures Gemini:**
```typescript
// Hash du message pour tracking multi-round
function hashMessage(content: any): string {
    const normalized = normalizeContent(content);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// Injection thought_signature sur messages assistant/tool
proxyBody.messages.forEach((m, index) => {
    if (m.role === 'assistant' && signature) {
        m.thought_signature = signature;
    }
});
```

**Stop Reason Normalization:**
```typescript
// Fix inconsistent finish_reason values
chunkStr = chunkStr.replace(
    /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g,
    hasToolCalls ? '"finish_reason": "tool_calls"' : '"finish_reason": "stop"'
);
```

---

### 4. `src/server/generate-config.ts` - Découverte Modèles

**Endpoints API:**

| Universe | URL | Auth |
|---|---|---|
| Free | `https://text.pollinations.ai/models` | None |
| Enterprise | `https://gen.pollinations.ai/text/models` | Bearer Token |

**Format Retour:**
```typescript
interface OpenCodeModel {
    id: string;      // "free/gemini" ou "enter/gpt-4o"
    name: string;    // "[Free] Gemini Flash"
    object: string;  // "model"
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

**Enrichissement Automatique:**

| Condition | Variant/Limit Ajouté |
|---|---|
| reasoning === true ou *thinking* | `high_reasoning` |
| *claude*, *mistral*, *llama* | `safe_tokens: 8000` |
| *nova* | `limit.output: 8000` |
| *nomnom*, *scrape* | `limit.output: 2048` |

**Nettoyage Description:**
```typescript
// Truncate at " - "
if (baseName.includes(' - ')) {
    baseName = baseName.split(' - ')[0].trim();
}
```

---

### 5. `src/server/quota.ts` - QuotaManager (Local History v6.1)

**Problème Résolu :**
L'API Pollinations a deux limitations :
1.  `/account/usage/daily` a un lag important (>15min).
2.  `/account/usage` ne retourne que les 100 dernières transactions.

**Solution v6.1 : Le Grand Livre Local**
Le plugin maintient son propre historique de transactions dans `~/.pollinations/usage_history.json`.

**Classe `QuotaManager`:**
-   **Persistence** : Sauvegarde JSON à chaque fetch.
-   **Dédoublonnage** : Signatures uniques basées sur `md5(timestamp + model + cost)`.
-   **Rétention** : Auto-pruning des entrées > 48h.
-   **Calcul** : `tierUsed = SOMME(cost)` de toutes les transactions locales depuis le dernier reset (minuit UTC).

**Interface QuotaStatus:**
```typescript
interface QuotaStatus {
    tierRemaining: number;      // Pollen gratuit restant
    tierUsed: number;           // Pollen gratuit utilisé (Calculé localement)
    tierLimit: number;          // Limite tier (1/3/10/20)
    walletBalance: number;      // Solde wallet payant
    nextResetAt: Date;
    isUsingWallet: boolean;     // tier === 0 ET wallet > 0
    tier: string;               // 'spore', 'seed', 'flower', 'nectar'
}
```

**Cache Strategie :**
-   `usage_history.json` est la source de vérité pour le `tierUsed`.
-   L'API est consultée pour récupérer les nouvelles transactions (`/usage`).
-   Sauvegarde disque asynchrone pour ne pas bloquer l'UI.

---

### 6. `src/server/commands.ts` - Système Commandes

**Commandes Disponibles:**

| Commande | Alias | Arguments | Description |
|---|---|---|---|
| `/pollinations mode` | `/poll mode` | `[manual\|alwaysfree\|pro]` | Change le mode |
| `/pollinations usage` | `/poll usage` | `[full]` | Dashboard quota |
| `/pollinations fallback` | `/poll fallback` | `<main> [agent]` | Configure fallbacks |
| `/pollinations config` | `/poll config` | `[key] [value]` | Lecture/écriture config |
| `/pollinations help` | `/poll help` | - | Aide |

**Config Keys:**

| Clé | Valeurs | Description |
|---|---|---|
| `status_gui` | `none\|alert\|all` | Verbosité status toasts |
| `logs_gui` | `none\|error\|verbose` | Verbosité logs techniques |
| `threshold_tier` | `0-100` | Seuil alerte tier (%) |
| `threshold_wallet` | `0-100` | Seuil Safety Net ($) |
| `status_bar` | `true\|false` | Widget status bar |

**Hook OpenCode:**
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

### 7. `src/server/toast.ts` - Notifications

**Canaux:**

| Canal | Config Key | Usage |
|---|---|---|
| `status` | `gui.status` | Dashboard, quota, mode |
| `log` | `gui.logs` | Erreurs techniques, debug |

**Filtrage:**
```typescript
// Canal status
if (verbosity === 'none') return;
if (verbosity === 'alert' && type !== 'error' && type !== 'warning') return;
// 'all' → tout passe

// Canal log
if (verbosity === 'none') return;
if (verbosity === 'error' && type !== 'error' && type !== 'warning') return;
// 'verbose' → tout passe
```

**Queue:**
- Max 20 messages en queue
- Persistance: `/tmp/pollinations-toasts.log`

---

### 8. `src/server/pollinations-api.ts` - Client API

**Fonctions:**

| Fonction | Signature | Description |
|---|---|---|
| `fetchFreeModels()` | `() => Promise<OpenAIModel[]>` | Liste modèles Free |
| `fetchEnterpriseModels()` | `(apiKey) => Promise<OpenAIModel[]>` | Liste modèles Pro |
| `getDetailedUsage()` | `(apiKey) => Promise<DetailedUsageResponse>` | Historique usage |
| `getAggregatedModels()` | `() => Promise<{data: OpenAIModel[]}>` | Merge Free + Pro |

**Headers Standards:**
```typescript
const HEADERS = {
    'User-Agent': 'curl/8.5.0',
    'Origin': '',
    'Referer': ''
};
```

---

### 9. `src/provider.ts` / `src/provider_v1.ts` - Fetch Interceptor (Legacy)
> ⚠️ Ces fichiers semblent être des versions alternatives/legacy non utilisées par le flux principal.

**Fonction Principale:**
```typescript
export const createPollinationsFetch = (apiKey: string) => async (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response>
```

**Sanitizations Incluses:**
- Normalisation model name (pollinations/enter/ → ``)
- Suppression stream_options
- Filtre tools Azure (120 max)
- Sanitize schemas Vertex

---

## Schémas de Configuration

### Fichier `~/.pollinations/config.json`
```json
{
    "version": "5.2.4",
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

### Fichier `~/.local/share/opencode/auth.json`
```json
{
    "pollinations": {
        "key": "pk_xxxxxxxxxxxx"
    }
}
```

### Fichier `~/.config/opencode/pollinations-signature.json`
```json
{
    "a1b2c3d4": "sig_gemini_xxxxx",
    "e5f6g7h8": "sig_gemini_yyyyy"
}
```

---

## API Internes

### Proxy Server (Port 10001)

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/health` | GET | - | `{ status, version, mode }` |
| `/v1/chat/completions` | POST | OpenAI Chat Format | SSE Stream |
| `/chat/completions` | POST | OpenAI Chat Format | SSE Stream |

**Request Body Format**
```typescript
interface ChatRequest {
    model: string;           // "free/gemini" ou "enter/gpt-4o"
    messages: Message[];
    stream?: boolean;        // Default: true
    tools?: Tool[];
    temperature?: number;
    max_tokens?: number;
    // ... autres params OpenAI
}
```

**Response SSE Format**
```text
data: {"id":"...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"...","object":"chat.completion.chunk","created":...,"model":"...","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

---

## Protocoles de Communication

### Upstream API Headers

**Free Universe:**
```http
POST https://text.pollinations.ai/openai/chat/completions
Content-Type: application/json
Accept: application/json, text/event-stream
User-Agent: curl/8.5.0
```

**Enterprise Universe:**
```http
POST https://gen.pollinations.ai/v1/chat/completions
Content-Type: application/json
Accept: application/json, text/event-stream
User-Agent: curl/8.5.0
Authorization: Bearer pk_xxxxxxxxxxxx
```

---

## Gestion des Erreurs

### Retry Logic
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Retry sur:
// - 429 (Rate Limit)
// - 5xx (Server Errors)
// - Network Errors

// Pas de retry sur:
// - 400 (Bad Request)
// - 401 (Unauthorized)
// - 404 (Not Found)
```

### Transparent Fallback
```text
Upstream 402/429/401/403 (Enterprise)
    │
    ▼
┌────────────────────────────────┐
│  Switch to Free Universe       │
│  actualModel = fallbacks.free.main │
│  isEnterprise = false          │
│  Emit Warning Toast            │
│  Retry Request                 │
└────────────────────────────────┘
    │
    ▼
Inject Warning in Response Stream
```

### Loop Detection (Guillotine)
```typescript
// Dans le stream, si on détecte "User:" ou "\nUser"
if (chunkStr.match(/(\n|^)\s*(User|user)\s*:/)) {
    res.end();
    return; // HARD STOP
}
```

---

## Sécurité et Authentification

### Stockage API Key

### Stockage API Key

**Autorité Temporelle (v5.4.14+)** : Le plugin compare la date de modification (`mtime`) de `config.json` et `auth.json`. Le fichier le plus récent fait autorité pour la Clé API. `opencode.json` reste un fallback de dernier recours.

| Location | Priority | Format |
|---|---|---|
| `config.json` | Timestamp (Winner) | `{ "apiKey": "..." }` |
| `auth.json` | Timestamp (Winner) | `{ "pollinations": { "key": "..." } }` |
| `opencode.json` | Fallback (Last) | `{ "provider": { "pollinations": { "options": { "apiKey": "..." } } } }` |

### Transmission
- API Key transmise uniquement vers `gen.pollinations.ai`
- Header: `Authorization: Bearer <key>`
- Jamais loggée en clair (sauf debug files si logs verbose)

### Fichiers de Log

| Fichier | Contenu | Sensibilité |
|---|---|---|
| `/tmp/opencode_pollinations_v4.log` | Requests générales | Low |
| `/tmp/opencode_pollinations_debug.log` | Bodies complets | ⚠️ High |
| `/tmp/pollinations-toasts.log` | Notifications | Low |
| `/tmp/opencode_pollinations_config_debug.log` | Config reads | Medium |
| `/tmp/pollinations_quota_debug.log` | Quota fetches | Medium |
| `/tmp/POLLI_LIFECYCLE.log` | Process lifecycle | Low |

### Dépendances

**Runtime**
- `@opencode-ai/plugin` (^1.0.85): Plugin interface
- `zod` (^3.22.4): (Non utilisé dans le code visible)

**Node.js Built-ins**
- `http`: Serveur proxy
- `https`: Client API
- `fs`: Fichiers config/logs
- `path`: Chemins fichiers
- `os`: Home directory
- `child_process`: Zombie cleanup

**Variables d'Environnement**

| Variable | Default | Description |
|---|---|---|
| `HOME` | - | Répertoire home |

> **Note**: La variable `POLLINATIONS_PORT` n'est plus utilisée depuis v5.4.6. Le port est désormais dynamique (assigné par l'OS).

### Limitations Connues
- **No Hot Reload Models**: Restart requis pour nouveaux modèles
- **Cache Quota**: 30s stale possible
- **Signature Map**: Peut grandir indéfiniment

> ✅ **Corrigé depuis v5.4.6**: Le plugin est désormais **100% Cross-Platform** (Windows, macOS, Linux). La dépendance `fuser` Linux a été supprimée et le port est dynamique.

---

## 🗺️ ROADMAP - OpenCode Pollinations Plugin

### Table des Matières
- Vision
- Versions Passées
- Version Actuelle (v5.6)
- Court Terme (v6.0)
- Moyen Terme (v6.0)
- Long Terme (v7.0+)
- Backlog Ideas

### Vision
**Rendre l'IA accessible à tous les développeurs, sans friction, sans coûts cachés, sans vendor lock-in.**

Le plugin Pollinations pour OpenCode vise à être:
- 🌍 **Universel**: Un point d'entrée unique vers tous les modèles IA
- 🛡️ **Résilient**: Jamais de blocage, toujours un fallback
- 💡 **Intelligent**: Optimisation automatique des coûts et performances
- 🔓 **Transparent**: Open source, pas de black box

### Versions Passées
**v1.0 - v3.0 (Legacy)**
- ✅ Intégration basique Pollinations
- ✅ Support modèles Free
- ✅ Proxy HTTP initial

**v4.0 (Refactor)**
- ✅ Architecture modulaire
- ✅ Support Enterprise (API Key)
- ✅ Système de toasts

**v5.0 - v5.6 (Safety Net)**
- ✅ Modes: manual, alwaysfree, pro
- ✅ Fallback automatique
- ✅ Quota tracking
- ✅ Commands system (/pollinations)
- ✅ Cross-Platform Support (Dynamic Port)

### Version Actuelle (v5.9.1)
**Statut: ✅ STABLE (Enterprise Sanitization)**

| Feature | Status | Notes |
|---|---|---|
| Enterprise Sanitization | ✅ | Fixes for Bedrock, Vertex, Kimi, Azure |
| Tool Truncation | ✅ | Azure/Grok limited to 128 tools |
| Output Limits | ✅ | Chickytutor/Nova limited to 8192 tokens |
| Dynamic Port Allocation | ✅ | System-assigned ports (No conflict) |
| Cross-Platform Support | ✅ | Windows/Mac/Linux fully supported |
| Gemini Tools Auto-Fallback | ✅ | Fallback to OpenAI on 401 Auth Error |
| Signature tracking Gemini | ✅ | Multi-round support |
| Stop reason normalization | ✅ | tool_calls vs stop |
| Loop detection (Guillotine) | ✅ | Hard stop on "User:" |
| Transparent fallback | ✅ | Switch + inject warning |

**🧪 Note sur la Validation**
> La version v5.9.1 intègre des correctifs critiques pour l'interopérabilité avec les modèles Enterprise (Bedrock, Vertex, Azure) qui imposent des contraintes strictes sur les schémas JSON (descriptions non vides, anyOf exclusifs, etc.).

**🐛 Known Issues**

| Issue | Severity | Workaround |
|---|---|---|
| Signature map unbounded | Low | Restart clears |
| 30s quota cache stale | Low | Force refresh |
| Cache NPM Global | Medium | `npm install -g` requis pour update |

### Court Terme (v6.0 - Next)

**v5.3 - Stabilisation (Q1 2026)**
*(Objectif: Zero-crash, zero-surprise)*

| Feature | Priority | Effort | Description |
|---|---|---|---|
| Signature map rotation | 🟡 Medium | Low | Garder max 1000 entrées, LRU eviction |
| Config file watcher | 🟡 Medium | Medium | Hot reload sans restart |
| Unit tests | 🔴 High | High | Coverage proxy.ts, quota.ts |
| Error codes standardization | 🟡 Medium | Low | Codes erreur documentés |

**v5.4 - UX Improvements (Q2 2026)**
*(Objectif: Expérience fluide, moins de friction)*

| Feature | Priority | Effort | Description |
|---|---|---|---|
| `/poll status` command | 🟡 Medium | Low | One-liner status (vs dashboard) |
| Model search `/poll models <query>` | 🟢 Low | Medium | Filter models by name |
| Colored output in commands | 🟢 Low | Low | Markdown rendering in responses |
| Persistent status bar widget | 🟡 Medium | Medium | Utiliser hook session.idle mieux |
| Auto-mode suggestion | 🟢 Low | Medium | Suggest pro if key detected |

**v5.5 - Observability (Q2 2026)**
*(Objectif: Production-ready observability)*

| Feature | Priority | Effort | Description |
|---|---|---|---|
| Structured logging | 🟡 Medium | Medium | JSON logs, log levels |
| Metrics endpoint `/metrics` | 🟢 Low | Medium | Prometheus format |
| Request tracing | 🟢 Low | High | Correlation IDs |
| Log rotation | 🟡 Medium | Low | Max 10MB par fichier |
| Debug mode toggle | 🟡 Medium | Low | `/poll config debug true` |

### Moyen Terme (v6.0)

**v6.0 - Smart Routing (Q3-Q4 2026)**
*Theme: Intelligence dans le routing, optimisation automatique.*

| Feature | Priority | Effort | Description |
|---|---|---|---|
| Cost-aware routing | 🔴 High | High | Choisir modèle par coût estimé |
| Latency-aware routing | 🟡 Medium | High | Historique latence par modèle |
| Quality scoring | 🟡 Medium | Very High | A/B testing, user feedback |
| Multi-provider failover | 🔴 High | High | Fallback vers OpenRouter si Pollinations down |
| Request queuing | 🟡 Medium | Medium | Rate limit local avant upstream |
| Caching layer | 🟢 Low | High | Cache responses identiques |

**Architecture Cible:**
```text
┌─────────────────────────────────────────────────┐
│              SMART ROUTER v6.0                  │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Cost   │  │ Latency │  │ Quality │        │
│  │ Scorer  │  │ Tracker │  │ Scorer  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │              │
│       └────────────┼────────────┘              │
│                    ▼                           │
│            ┌─────────────┐                     │
│            │  Decision   │                     │
│            │   Engine    │                     │
│            └──────┬──────┘                     │
│                   │                            │
│    ┌──────────────┼──────────────┐            │
│    ▼              ▼              ▼            │
│ ┌──────┐    ┌──────────┐    ┌──────────┐     │
│ │ Free │    │Enterprise│    │OpenRouter│     │
│ │ API  │    │   API    │    │ Fallback │     │
│ └──────┘    └──────────┘    └──────────┘     │
└─────────────────────────────────────────────────┘
```

**v6.1 - Multi-Modal (Q4 2026)**

| Feature | Priority | Effort | Description |
|---|---|---|---|
| Image generation | 🟡 Medium | Medium | `/poll image <prompt>` |
| Image input (Vision) | 🟡 Medium | Medium | Support multimodal messages |
| Audio transcription | 🟢 Low | Medium | Whisper integration |
| Code execution sandbox | 🟢 Low | Very High | Run generated code safely |

### Long Terme (v7.0+)

**v7.0 - Platform (2027+)**
*Theme: De plugin à plateforme.*

| Feature | Description |
|---|---|
| Web Dashboard | UI web pour monitoring, config, analytics |
| Team Features | Partage quotas, API keys team |
| Custom Models | Fine-tuning integration |
| Marketplace | Extensions communautaires |
| Self-hosted Option | Deploy your own Pollinations gateway |

**v7.1 - AI Agents**

| Feature | Description |
|---|---|
| Agent Orchestration | Multi-step reasoning avec memory |
| Tool Marketplace | Tools communautaires |
| Workflow Builder | Visual workflow editor |
| Persistent Memory | Vector DB integration |

### Backlog Ideas

**💡 Community Requests**

| Idea | Votes | Complexity | Notes |
|---|---|---|---|
| Model comparison mode | 5 | High | Same prompt → multiple models |
| Cost calculator | 3 | Low | Estimate before send |
| Prompt templates | 2 | Medium | Snippets réutilisables |
| Conversation export | 4 | Low | Markdown/JSON export |
| API usage alerts | 6 | Medium | Email/Discord when threshold |
| Offline mode | 2 | Very High | Local model fallback |
| Browser extension | 1 | High | Same features in browser |

**🔬 Experimental**

| Idea | Risk | Notes |
|---|---|---|
| P2P model sharing | High | Decentralized inference |
| Blockchain credits | High | Pollen on-chain |
| Edge inference | Medium | WebGPU/WASM models |
| Voice interface | Medium | Speech-to-text input |

---

### Release Schedule

| Version | Target Date | Theme |
|---|---|---|
| v5.3 | Q1 2026 | Stabilisation |
| v5.4 | Q2 2026 | UX |
| v5.5 | Q2 2026 | Observability |
| v6.0 | Q4 2026 | Smart Routing |
| v6.1 | Q4 2026 | Multi-Modal |
| v7.0 | 2027 | Platform |

### Contributing

**Priority Labels**

| Label | Meaning |
|---|---|
| 🔴 P0 | Critical, blocks release |
| 🟡 P1 | Important, should be in next minor |
| 🟢 P2 | Nice to have |
| ⚪ P3 | Backlog |

### How to Contribute
1. Check Issues for open tasks
2. Comment to claim
3. Fork + PR
4. Follow existing code style
5. Add tests if possible

### Areas Needing Help
- 🧪 **Testing**: Unit tests, integration tests
- 📚 **Documentation**: User guides, API docs
- 🌍 **i18n**: French, German, Spanish translations
- 🎨 **UX**: Command output formatting
- 🔧 **DevOps**: CI/CD, release automation

---

## Contact
- **Discord**: Pollinations Community
- **GitHub**: @fkom13
- **Issues**: Plugin Repository

*Last updated: 2026-01-28*
