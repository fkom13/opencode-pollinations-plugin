📚 Documentation Technique Complète - OpenCode Pollinations Plugin V3.5.5
Table des Matières
Vue d'ensemble de l'architecture
Analyse détaillée par fichier
Flux de données et séquence d'exécution
Subtilités techniques et difficultés résolues
Points de vigilance pour la V4
Plan d'évolution V4
Tests de non-régression
1. Vue d'ensemble de l'architecture
1.1 Schéma architectural
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPENCODE HOST                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    Plugin Hook     ┌────────────────────────────────────┐ │
│  │   OpenCode   │◄──────────────────►│     PollinationsPlugin             │ │
│  │    Core      │    config()        │     (src/index.ts)                 │ │
│  └──────┬───────┘                    └────────────┬───────────────────────┘ │
│         │                                         │                          │
│         │  HTTP Request                           │ startProxy()             │
│         │  (baseURL: 127.0.0.1:10001)            │                          │
│         ▼                                         ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      LOCAL HTTP PROXY SERVER                           │ │
│  │                      (Port 10001 - Fixed)                              │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    handleChatCompletion()                        │   │ │
│  │  │                    (src/server/proxy.ts)                         │   │ │
│  │  │                                                                   │   │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │   │ │
│  │  │  │   ROUTING   │  │  SANITIZE   │  │   SIGNATURE MANAGEMENT   │  │   │ │
│  │  │  │  Free/Enter │  │   Tools     │  │   (Gemini Thinking Fix)  │  │   │ │
│  │  │  └─────────────┘  └─────────────┘  └──────────────────────────┘  │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTPS
                                     ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │                        POLLINATIONS.AI APIs                             │
    ├────────────────────────────────┬───────────────────────────────────────┤
    │                                │                                        │
    │  ┌──────────────────────────┐  │  ┌──────────────────────────────────┐ │
    │  │   FREE TIER              │  │  │   ENTERPRISE TIER                │ │
    │  │   text.pollinations.ai   │  │  │   gen.pollinations.ai            │ │
    │  │                          │  │  │                                  │ │
    │  │   /openai/chat/completions│  │  │   /v1/chat/completions          │ │
    │  │   /models                │  │  │   /text/models                   │ │
    │  │                          │  │  │                                  │ │
    │  │   • No Auth Required     │  │  │   • Bearer Token Required        │ │
    │  │   • Rate Limited         │  │  │   • Quota Based                  │ │
    │  └──────────────────────────┘  │  └──────────────────────────────────┘ │
    └────────────────────────────────────────────────────────────────────────┘
1.2 Principe fondamental
Le plugin agit comme un proxy intelligent qui:

Intercepte les requêtes OpenCode vers le "provider Pollinations"
Route vers le bon endpoint (Free vs Enterprise) selon le préfixe du modèle
Transforme les requêtes pour corriger les incompatibilités API
Gère les spécificités de chaque backend (Gemini, OpenAI, Claude...)
Capture les signatures pour le multi-turn Gemini Thinking
2. Analyse détaillée par fichier
2.1 src/index.ts - Point d'entrée du plugin
Responsabilités
Export du plugin OpenCode conforme à l'interface Plugin
Démarrage du serveur proxy HTTP local
Injection dynamique de la configuration des modèles
Code critique analysé
TypeScript

export const PollinationsPlugin: Plugin = async () => {
    log("Plugin Initializing (V3 Phase 4)...");
    const port = await startProxy();  // ①
    const localBaseUrl = `http://127.0.0.1:${port}`;

    return {
        async config(config) {  // ②
            // ...
            const modelsArray = await generatePollinationsConfig();  // ③
            // ...
            p.options.baseURL = localBaseUrl;  // ④
        }
    };
};
#	Étape	Description
①	startProxy()	Lance le serveur HTTP sur port 10001 (fixe)
②	Hook config	Appelé par OpenCode au chargement du plugin
③	generatePollinationsConfig()	Récupère dynamiquement la liste des modèles
④	baseURL	Force OpenCode à passer par le proxy local
Gestion des erreurs de port
TypeScript

server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        log(`[Proxy] Port 10001 in use, assuming existing proxy.`);
        resolve(10001);  // Réutilisation du proxy existant
    }
});
Subtilité: Si le port est occupé, le plugin suppose qu'une instance précédente tourne encore et réutilise le port. Cela évite les erreurs de double-démarrage mais peut masquer des conflits.

Points d'attention V4
⚠️ Le port 10001 est hardcodé → Rendre configurable
⚠️ Pas de health-check du proxy existant si port occupé
⚠️ Lifecycle management basique (SIGINT/SIGTERM)
2.2 src/server/proxy.ts - Cœur du système
Ce fichier est le plus critique du plugin. Il contient toute la logique de transformation des requêtes.

2.2.1 Structure globale
TypeScript

// PERSISTENCE: Gestion des signatures Gemini
const SIG_FILE = path.join(process.env.HOME, '.config/opencode/pollinations-signature.json');
let signatureMap: Record<string, string> = {};

// SANITIZATION: Helpers pour nettoyer les schémas
function dereferenceSchema(schema, rootDefs) { ... }
function sanitizeToolsForVertex(tools) { ... }
function truncateTools(tools, limit) { ... }

// HASHING: Identification stable des messages
function hashMessage(content) { ... }

// HANDLER PRINCIPAL
export async function handleChatCompletion(req, res, bodyRaw) { ... }
2.2.2 Système de routing (CRITIQUE)
TypeScript

// 1. STRICT ROUTING LOGIC
let actualModel = body.model || "openai";
let isEnterprise = false;

if (actualModel.startsWith('pollinations/enter/')) {
    // ENTERPRISE -> gen.pollinations.ai/v1
    targetUrl = 'https://gen.pollinations.ai/v1/chat/completions';
    authHeader = `Bearer ${config.apiKey}`;
    actualModel = actualModel.replace('pollinations/enter/', '');
    isEnterprise = true;
} else if (actualModel.startsWith('pollinations/free/')) {
    // FREE -> text.pollinations.ai/openai
    targetUrl = 'https://text.pollinations.ai/openai/chat/completions';
    authHeader = undefined; // STRICT: No Auth
    actualModel = actualModel.replace('pollinations/free/', '');
}
Convention de nommage des modèles:

Préfixe	Endpoint	Auth
pollinations/enter/	gen.pollinations.ai	Bearer Token
pollinations/free/	text.pollinations.ai	Aucune
2.2.3 Système de signature Gemini (COMPLEXE)
Problème résolu: Les modèles Gemini "Thinking" (avec raisonnement) génèrent une thought_signature qui DOIT être renvoyée dans les messages suivants pour maintenir le contexte de réflexion.

TypeScript

// SIGNATURE CAPTURE (dans le stream de réponse)
if (!currentSignature) {
    const match = chunkStr.match(/"thought_signature"\s*:\s*"([^"]+)"/);
    if (match && match[1]) currentSignature = match[1];
}

// SIGNATURE INJECTION (avant envoi)
proxyBody.messages.forEach((m: any, index: number) => {
    if (m.role === 'assistant') {
        // Retrouver la signature via le hash du prompt précédent
        if (index > 0) {
            const prevMsg = proxyBody.messages[index - 1];
            const prevHash = hashMessage(prevMsg);
            sig = signatureMap[prevHash];
        }
        if (sig) m.thought_signature = sig;
    }
});
Mécanisme de hash stable:

TypeScript

function normalizeContent(c: any): string {
    if (!c) return "";
    if (typeof c === 'string') return c.replace(/\s+/g, '');
    if (Array.isArray(c)) return c.map(normalizeContent).join('');
    if (typeof c === 'object') {
        const keys = Object.keys(c).sort();  // Tri pour déterminisme
        return keys.map(k => k + normalizeContent(c[k])).join('');
    }
    return String(c);
}
Pourquoi c'est complexe:

Les tool_calls sont des objets imbriqués
L'ordre des clés JSON peut varier
Le hash doit être IDENTIQUE entre capture et injection
Persistance fichier pour survie entre redémarrages
2.2.4 Sanitization des tools (CRITIQUE)
Problème Azure/OpenAI: Limite de 120 tools maximum

TypeScript

if ((actualModel.includes("gpt") || actualModel.includes("openai")) && body.tools) {
    proxyBody.tools = truncateTools(proxyBody.tools, 120);
    
    // Tronquer les IDs de tool_calls (limite ~40 chars)
    proxyBody.messages.forEach((m: any) => {
        if (m.tool_calls) {
            m.tool_calls.forEach((tc: any) => {
                if (tc.id && tc.id.length > 40) tc.id = tc.id.substring(0, 40);
            });
        }
    });
}
Problème Gemini/Vertex: Incompatibilité $ref et grounding

TypeScript

if (actualModel.includes("gemini") && (actualModel.includes("fast") || !isEnterprise)) {
    // Désactiver le grounding si des functions sont présentes
    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
    
    // Exclure google_search des tools
    proxyBody.tools = proxyBody.tools.filter((t: any) => {
        return t.function?.name !== 'google_search';
    });
    
    // Dé-référencer les $ref dans les schémas
    proxyBody.tools = sanitizeToolsForVertex(proxyBody.tools);
}
Fonction de dé-référencement:

TypeScript

function dereferenceSchema(schema: any, rootDefs: any): any {
    if (schema.$ref || schema.ref) {
        const refKey = (schema.$ref || schema.ref).split('/').pop();
        if (rootDefs && rootDefs[refKey]) {
            // Copie la définition en place
            const def = dereferenceSchema(JSON.parse(JSON.stringify(rootDefs[refKey])), rootDefs);
            delete schema.$ref;
            delete schema.ref;
            Object.assign(schema, def);
        } else {
            // Fallback: convertir en string avec description
            schema.type = "string";
            schema.description = (schema.description || "") + " [Ref Failed]";
        }
    }
    // Récursion dans properties et items
    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = dereferenceSchema(schema.properties[key], rootDefs);
        }
    }
    if (schema.items) {
        schema.items = dereferenceSchema(schema.items, rootDefs);
    }
    return schema;
}
2.2.5 Normalisation des finish_reason
TypeScript

// FIX: STOP REASON NORMALIZATION
if (chunkStr.includes('"finish_reason"')) {
    const stopRegex = /"finish_reason"\s*:\s*"(stop|STOP|did_not_finish|finished|end_turn|MAX_TOKENS)"/g;
    if (stopRegex.test(chunkStr)) {
        if (chunkStr.includes('"tool_calls"')) {
            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "tool_calls"');
        } else {
            chunkStr = chunkStr.replace(stopRegex, '"finish_reason": "stop"');
        }
    }
}
Raison: Chaque provider renvoie des valeurs différentes pour finish_reason. OpenCode attend des valeurs standardisées OpenAI.

2.3 src/server/config.ts - Gestion de la configuration
Hiérarchie de recherche de la clé API
TypeScript

export function loadConfig(): PollinationsConfig {
    // 1. Auth native OpenCode (~/.local/share/opencode/auth.json)
    const entry = authData['pollinations'] || authData['pollinations_enter'];
    
    // 2. Config OpenCode (~/.config/opencode/opencode.json)
    const nativeKey = data?.provider?.pollinations_enter?.options?.apiKey;
    
    // 3. Config custom (~/.config/opencode/pollinations-config.json)
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}
Ordre de priorité (du plus prioritaire au moins):

auth.json - Stockage natif via /connect
opencode.json - Configuration du provider
pollinations-config.json - Configuration legacy/manuelle
Structure de configuration
TypeScript

interface PollinationsConfig {
    apiKey?: string;           // Clé API Pollinations
    mode: 'manual' | 'alwaysfree' | 'pro';  // Mode de fonctionnement
    customModels?: any[];      // Modèles personnalisés (non utilisé V3)
}
2.4 src/server/generate-config.ts - Génération dynamique des modèles
Flux de récupération
TypeScript

export async function generatePollinationsConfig(): Promise<OpenCodeModel[]> {
    const modelsOutput: OpenCodeModel[] = [];
    
    // 1. FREE UNIVERSE
    const freeList = await fetchJson('https://text.pollinations.ai/openai/models');
    list.forEach((m: any) => {
        const mapped = mapModel(m, 'pollinations/free/', '[Free] ');
        modelsOutput.push(mapped);
    });
    
    // 2. ENTERPRISE UNIVERSE (si clé API présente)
    if (config.apiKey) {
        const enterList = await fetchJson('https://gen.pollinations.ai/text/models', {
            'Authorization': `Bearer ${config.apiKey}`
        });
        enterList.forEach((m: any) => {
            // Filtrer si tools === false explicitement
            if (m.tools === false) return;
            const mapped = mapModel(m, 'pollinations/enter/', '[Enter] ');
            modelsOutput.push(mapped);
        });
    }
    
    return modelsOutput;
}
Enrichissement des variantes
TypeScript

function mapModel(raw: any, prefix: string, namePrefix: string): OpenCodeModel {
    const modelObj: OpenCodeModel = {
        id: fullId,
        name: finalName,
        object: 'model',
        variants: {}
    };

    // 1. Thinking Models → high_reasoning variant
    if (raw.reasoning === true || rawId.includes('thinking')) {
        modelObj.variants.high_reasoning = {
            options: { reasoningEffort: "high", budgetTokens: 16000 }
        };
    }

    // 2. Bedrock/Claude/Mistral → safe_tokens variant (max 8k)
    if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama')) {
        modelObj.variants.safe_tokens = {
            options: { maxTokens: 8000 }
        };
    }

    // 3. Fast models → disable thinking (sauf Gemini 3 Flash)
    if ((rawId.includes('fast') || rawId.includes('flash')) && !rawId.includes('gemini')) {
        modelObj.variants.speed = {
            options: { thinking: { disabled: true } }
        };
    }

    return modelObj;
}
2.5 src/server/pollinations-api.ts - Agrégation des modèles
Différences avec generate-config.ts
Fichier	Usage	Format retour
generate-config.ts	Hook config()	OpenCodeModel[]
pollinations-api.ts	Endpoint /v1/models	{ object: "list", data: OpenAIModel[] }
Filtrage des modèles
TypeScript

// FREE: Filtre strict sur tools === true
return models
    .filter((m: any) => m.tools === true)
    .map(/* ... */);

// ENTERPRISE: Filtre sur tools !== false (plus permissif)
return rawModels
    .filter((m: any) => {
        if (typeof m === 'string') return true;  // Strings passent (pas de metadata)
        return m.tools === true;
    })
    .map(/* ... */);
2.6 src/provider.ts & src/provider_v1.ts - Fetch personnalisé (LEGACY)
Ces fichiers contiennent une implémentation alternative du fetch avec sanitization. Ils semblent être du code legacy non utilisé dans le flux principal V3.

À considérer pour V4:

Fusionner la logique utile dans proxy.ts
Supprimer les fichiers si obsolètes
3. Flux de données et séquence d'exécution
3.1 Initialisation du plugin
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SÉQUENCE D'INITIALISATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. OpenCode charge le plugin                                               │
│     └─► import PollinationsPlugin from 'opencode-pollinations-plugin'       │
│                                                                             │
│  2. OpenCode appelle PollinationsPlugin()                                   │
│     └─► async () => { ... }                                                 │
│                                                                             │
│  3. startProxy() démarre le serveur HTTP                                    │
│     ├─► http.createServer(...)                                              │
│     ├─► server.listen(10001, '127.0.0.1')                                   │
│     └─► resolve(10001)                                                      │
│                                                                             │
│  4. Plugin retourne l'objet hooks                                           │
│     └─► { config: async (config) => { ... } }                               │
│                                                                             │
│  5. OpenCode appelle hook config()                                          │
│     ├─► generatePollinationsConfig() [Fetch models]                         │
│     ├─► Injection dans config.provider['pollinations_enter']                │
│     └─► baseURL = http://127.0.0.1:10001                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
3.2 Traitement d'une requête chat
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SÉQUENCE DE TRAITEMENT REQUÊTE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. OpenCode envoie POST /v1/chat/completions                               │
│     └─► body: { model: "pollinations/enter/gemini", messages: [...] }       │
│                                                                             │
│  2. Proxy reçoit la requête                                                 │
│     └─► handleChatCompletion(req, res, bodyRaw)                             │
│                                                                             │
│  3. PARSING & ROUTING                                                       │
│     ├─► Parse JSON body                                                     │
│     ├─► Detect prefix: "pollinations/enter/" → Enterprise                   │
│     ├─► targetUrl = gen.pollinations.ai/v1/chat/completions                 │
│     └─► actualModel = "gemini"                                              │
│                                                                             │
│  4. TRANSFORMATIONS                                                         │
│     ├─► Inject signatures into assistant messages                           │
│     ├─► Fix tool_call_id mismatches                                         │
│     ├─► Sanitize tools (truncate, dereference $ref)                         │
│     ├─► Disable grounding if needed                                         │
│     └─► Remove stream_options                                               │
│                                                                             │
│  5. FORWARD REQUEST                                                         │
│     ├─► fetch(targetUrl, { body: JSON.stringify(proxyBody) })               │
│     └─► Headers: Authorization, Content-Type, User-Agent: curl/8.5.0        │
│                                                                             │
│  6. STREAM RESPONSE                                                         │
│     ├─► for await (chunk of fetchRes.body)                                  │
│     ├─► Normalize finish_reason                                             │
│     ├─► Capture thought_signature                                           │
│     └─► res.write(chunk)                                                    │
│                                                                             │
│  7. FINALIZATION                                                            │
│     ├─► Save signature to signatureMap[promptHash]                          │
│     ├─► Persist to disk (SIG_FILE)                                          │
│     └─► res.end()                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
4. Subtilités techniques et difficultés résolues
4.1 Problème: Gemini Thinking Context Loss
Symptôme: Après un tool call, Gemini perd le contexte de sa "réflexion" interne.

Cause: Les modèles Gemini Thinking génèrent une thought_signature qui identifie leur état de raisonnement. Sans cette signature, le modèle "oublie" ce qu'il pensait.

Solution implémentée:

text

┌──────────────────────────────────────────────────────────────────────────┐
│  PROMPT HASH → SIGNATURE MAPPING                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Request 1: "Quelle est la météo à Paris?"                                │
│  ├─► Hash prompt: "abc123"                                                │
│  ├─► Gemini response + thought_signature: "sig_xyz"                       │
│  └─► signatureMap["abc123"] = "sig_xyz"                                   │
│                                                                           │
│  Request 2: (after tool execution)                                        │
│  ├─► Messages: [user, assistant(tool_calls), tool_result]                 │
│  ├─► For assistant message, find previous user message hash               │
│  ├─► Lookup: signatureMap["abc123"] → "sig_xyz"                           │
│  └─► Inject: assistant.thought_signature = "sig_xyz"                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
4.2 Problème: Tool Call ID Mismatch
Symptôme: Erreur "tool_call_id not found" sur Gemini.

Cause: OpenCode peut générer un ID différent de celui retourné par l'API.

Solution:

TypeScript

if (lastMsg.role === 'tool') {
    // Retrouver le dernier assistant avec tool_calls
    for (let i = proxyBody.messages.length - 2; i >= 0; i--) {
        if (m.role === 'assistant' && m.tool_calls?.length > 0) {
            targetAssistantMsg = m;
            break;
        }
    }
    // Forcer l'ID correct
    lastMsg.tool_call_id = targetAssistantMsg.tool_calls[0].id;
}
4.3 Problème: Grounding vs Function Calling
Symptôme: Erreur 400 quand tools + grounding activé sur Gemini Fast.

Cause: Le "Google Search Grounding" et les function calls sont incompatibles sur certaines versions Gemini.

Solution:

TypeScript

if (actualModel.includes("gemini") && actualModel.includes("fast")) {
    proxyBody.tools_config = { google_search_retrieval: { disable: true } };
    proxyBody.tools = proxyBody.tools.filter(t => t.function?.name !== 'google_search');
}
4.4 Problème: Schémas JSON avec $ref
Symptôme: Erreur de validation sur Vertex/Gemini avec des schémas complexes.

Cause: Vertex AI ne supporte pas les $ref dans les JSON Schema des tools.

Solution: Dé-référencement récursif avant envoi (voir dereferenceSchema).

4.5 Problème: User-Agent Blocking
Symptôme: Requêtes bloquées par WAF/CDN de Pollinations.

Solution:

TypeScript

headers['User-Agent'] = 'curl/8.5.0';  // Fake curl agent
4.6 Problème: Azure Tool Limit
Symptôme: Erreur 400 avec trop de tools sur Azure/OpenAI.

Solution: Truncation à 120 tools avec priorisation:

TypeScript

const priorities = [
    "bash", "read", "write", "edit", "webfetch", "glob", "grep",
    "searxng_remote_search", "deepsearch_deep_search", "google_search"
];
// Garder les prioritaires + remplir jusqu'à 120
5. Points de vigilance pour la V4
5.1 Dettes techniques identifiées
Priorité	Issue	Impact	Recommandation V4
🔴 HIGH	Port 10001 hardcodé	Conflits possibles	Rendre configurable
🔴 HIGH	Pas de gestion du mode dans proxy	Mode ignoré	Implémenter routing par mode
🟠 MED	Fichiers provider.ts/provider_v1.ts inutilisés	Code mort	Supprimer ou intégrer
🟠 MED	Logs dispersés dans /tmp	Debug difficile	Centraliser dans un fichier
🟡 LOW	signatureMap croît indéfiniment	Fuite mémoire lente	Implémenter expiration
🟡 LOW	Pas de health check	Zombie processes	Ping périodique
5.2 Risques de régression V3 → V4
text

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZONES À RISQUE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SIGNATURE MANAGEMENT                                                    │
│     └─► NE PAS toucher à hashMessage() ou normalizeContent()               │
│     └─► Le moindre changement casse le multi-turn Gemini                   │
│                                                                             │
│  2. ROUTING LOGIC                                                           │
│     └─► Les préfixes "pollinations/enter/" et "pollinations/free/"         │
│     └─► Doivent rester EXACTEMENT identiques                               │
│                                                                             │
│  3. TOOL SANITIZATION                                                       │
│     └─► dereferenceSchema() est fragile                                    │
│     └─► Ajouter des tests unitaires avant modification                     │
│                                                                             │
│  4. HEADERS                                                                 │
│     └─► User-Agent: curl/8.5.0 est OBLIGATOIRE                             │
│     └─► Ne pas ajouter Origin/Referer                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
6. Plan d'évolution V4
6.1 Nouvelles fonctionnalités demandées
6.1.1 Système de modes (3 modes)
TypeScript

// Nouvelle interface de configuration
interface PollinationsConfigV4 extends PollinationsConfig {
    mode: 'manual' | 'alwaysfree' | 'pro';
    
    // Nouveaux champs
    fallbackModels: {
        main: string;   // ex: "mistral"
        agent: string;  // ex: "openai-fast"
    };
    
    alertThreshold: number;  // % avant alerte (défaut: 10)
    toastVerbosity: 'alert' | 'always';
}
6.1.2 Implémentation du routing par mode
TypeScript

// Dans proxy.ts - Nouvelle logique de fallback

async function resolveTargetWithMode(
    requestedModel: string, 
    config: PollinationsConfigV4
): Promise<{ targetUrl: string; actualModel: string; authHeader?: string }> {
    
    const isEnterprise = requestedModel.startsWith('pollinations/enter/');
    const baseModel = requestedModel.replace(/^pollinations\/(enter|free)\//, '');
    
    switch (config.mode) {
        case 'manual':
            // FREE ONLY - Pas d'accès Enterprise
            return {
                targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                actualModel: baseModel,
                authHeader: undefined
            };
            
        case 'alwaysfree':
            // Priorité: Free Tier Quota > Pollinations Free
            // JAMAIS de wallet
            if (isEnterprise) {
                const quota = await checkQuota(config.apiKey!);
                if (quota.freeRemaining > 0) {
                    return {
                        targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                        actualModel: baseModel,
                        authHeader: `Bearer ${config.apiKey}`
                    };
                } else {
                    // Fallback sur Free public
                    return {
                        targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                        actualModel: config.fallbackModels.main,
                        authHeader: undefined
                    };
                }
            }
            break;
            
        case 'pro':
            // Priorité: Free Tier > Wallet > Pollinations Free
            if (isEnterprise) {
                const quota = await checkQuota(config.apiKey!);
                if (quota.freeRemaining > 0 || quota.walletBalance > 0) {
                    return {
                        targetUrl: 'https://gen.pollinations.ai/v1/chat/completions',
                        actualModel: baseModel,
                        authHeader: `Bearer ${config.apiKey}`
                    };
                } else {
                    // Fallback avec notification
                    emitToast('warning', 'Wallet épuisé - Fallback sur Free');
                    return {
                        targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
                        actualModel: config.fallbackModels.main,
                        authHeader: undefined
                    };
                }
            }
            break;
    }
    
    // Défaut: Free public
    return {
        targetUrl: 'https://text.pollinations.ai/openai/chat/completions',
        actualModel: baseModel,
        authHeader: undefined
    };
}
6.1.3 Système de Toast UI
TypeScript

// Nouveau fichier: src/server/toast.ts

import type { Plugin } from "@opencode-ai/plugin";

interface ToastMessage {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    duration?: number;
}

// Queue de toasts à émettre via hook
let toastQueue: ToastMessage[] = [];

export function emitToast(type: ToastMessage['type'], message: string, title?: string) {
    toastQueue.push({
        type,
        title: title || getDefaultTitle(type),
        message,
        duration: type === 'error' ? 8000 : 4000
    });
}

function getDefaultTitle(type: ToastMessage['type']): string {
    switch (type) {
        case 'info': return '🌸 Pollinations';
        case 'warning': return '⚠️ Attention';
        case 'error': return '❌ Erreur';
        case 'success': return '✅ Succès';
    }
}

// Hook pour afficher les toasts via l'événement TUI
export function createToastHook() {
    return {
        'tui.toast.show': async (input: any, output: any) => {
            // Ce hook est appelé par OpenCode pour afficher un toast
            // On peut l'utiliser pour injecter nos propres toasts
        },
        
        // Hook personnalisé appelé après chaque requête terminée
        'session.idle': async ({ event }: any) => {
            // Afficher les toasts en queue
            while (toastQueue.length > 0) {
                const toast = toastQueue.shift()!;
                // Utiliser l'API OpenCode pour afficher
                // (à adapter selon l'API réelle)
            }
        }
    };
}
6.1.4 Système de quota et alertes
TypeScript

// Nouveau fichier: src/server/quota.ts

interface QuotaInfo {
    freeRemaining: number;      // Tokens gratuits restants (Spore/Seed)
    freeResetDate: Date;        // Date de reset du quota gratuit
    walletBalance: number;      // Solde wallet en crédits
    walletCurrency: string;     // USD, EUR, etc.
}

let cachedQuota: QuotaInfo | null = null;
let lastQuotaCheck: number = 0;
const QUOTA_CACHE_TTL = 60000; // 1 minute

export async function checkQuota(apiKey: string): Promise<QuotaInfo> {
    const now = Date.now();
    
    // Cache pour éviter trop de requêtes
    if (cachedQuota && (now - lastQuotaCheck) < QUOTA_CACHE_TTL) {
        return cachedQuota;
    }
    
    try {
        // API Pollinations pour le quota (à confirmer l'endpoint exact)
        const response = await fetch('https://gen.pollinations.ai/v1/usage', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (!response.ok) {
            throw new Error(`Quota check failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        cachedQuota = {
            freeRemaining: data.free_tier_remaining || 0,
            freeResetDate: new Date(data.free_tier_reset || Date.now() + 86400000),
            walletBalance: data.wallet_balance || 0,
            walletCurrency: data.currency || 'USD'
        };
        
        lastQuotaCheck = now;
        return cachedQuota;
        
    } catch (e) {
        // En cas d'erreur, retourner des valeurs par défaut
        return {
            freeRemaining: 0,
            freeResetDate: new Date(),
            walletBalance: 0,
            walletCurrency: 'USD'
        };
    }
}

export function shouldShowAlert(quota: QuotaInfo, threshold: number): boolean {
    // Alerte si le quota gratuit est sous le seuil
    const totalFreeCapacity = 100; // À ajuster selon l'API
    const percentRemaining = (quota.freeRemaining / totalFreeCapacity) * 100;
    return percentRemaining <= threshold;
}
6.1.5 Commandes de configuration
TypeScript

// Extension du plugin pour ajouter des commandes

export const PollinationsPluginV4: Plugin = async (ctx) => {
    const { client } = ctx;
    
    return {
        // Hook de configuration existant
        async config(config) {
            // ... code existant ...
        },
        
        // Nouveaux hooks de commandes
        'tui.command.execute': async (input: any, output: any) => {
            const command = input.command;
            
            // Commande: /pollinations mode <mode>
            if (command.startsWith('/pollinations mode')) {
                const mode = command.split(' ')[2];
                if (['manual', 'alwaysfree', 'pro'].includes(mode)) {
                    saveConfig({ mode: mode as any });
                    emitToast('success', `Mode changé: ${mode}`);
                    output.handled = true;
                }
            }
            
            // Commande: /pollinations usage [compact|full]
            if (command.startsWith('/pollinations usage')) {
                const format = command.split(' ')[2] || 'compact';
                const usage = await getUsageReport(format);
                // Afficher le rapport
                output.response = usage;
                output.handled = true;
            }
            
            // Commande: /pollinations fallback <main> <agent>
            if (command.startsWith('/pollinations fallback')) {
                const parts = command.split(' ');
                saveConfig({
                    fallbackModels: {
                        main: parts[2] || 'mistral',
                        agent: parts[3] || 'openai-fast'
                    }
                });
                emitToast('success', `Fallback configuré: ${parts[2]}/${parts[3]}`);
                output.handled = true;
            }
        }
    };
};
6.2 Structure V4 proposée
text

└── opencode-pollinations-plugin
    ├── config.json
    ├── package.json
    ├── src
    │   ├── index.ts              # Point d'entrée (modifié)
    │   ├── types.ts              # Nouvelles interfaces TypeScript
    │   └── server
    │       ├── config.ts         # Configuration (étendue)
    │       ├── generate-config.ts
    │       ├── index.ts
    │       ├── pollinations-api.ts
    │       ├── proxy.ts          # Proxy (modifié pour modes)
    │       ├── quota.ts          # NOUVEAU: Gestion quota
    │       ├── toast.ts          # NOUVEAU: Système toast
    │       └── commands.ts       # NOUVEAU: Commandes CLI
    └── tsconfig.json
7. Tests de non-régression
7.1 Script de test automatisé
Bash

#!/bin/bash
# test-regression.sh - Tests de non-régression V3 → V4

set -e

OPENCODE_DIR="$HOME/Bureau/oracle/opencode"
LOG_FILE="/tmp/pollinations-regression-test.log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Tests de non-régression Pollinations Plugin" | tee "$LOG_FILE"
echo "================================================" | tee -a "$LOG_FILE"

cd "$OPENCODE_DIR" || { echo "❌ Répertoire non trouvé: $OPENCODE_DIR"; exit 1; }

# Fonction de test
test_model() {
    local model="$1"
    local prompt="$2"
    local expected_behavior="$3"
    
    echo -e "\n${YELLOW}Testing: $model${NC}" | tee -a "$LOG_FILE"
    echo "  Prompt: $prompt" | tee -a "$LOG_FILE"
    
    # Exécution avec timeout de 60s
    local output
    local exit_code
    
    output=$(timeout 60s opencode run "$prompt" -m "$model" 2>&1) || exit_code=$?
    
    if [ -z "$exit_code" ]; then
        exit_code=0
    fi
    
    # Analyse du résultat
    if [ $exit_code -eq 0 ] && [ -n "$output" ]; then
        # Vérifier que la réponse n'est pas une erreur
        if echo "$output" | grep -qi "error\|failed\|exception"; then
            echo -e "  ${RED}❌ FAIL - Error in response${NC}" | tee -a "$LOG_FILE"
            echo "  Output: ${output:0:200}..." | tee -a "$LOG_FILE"
            return 1
        else
            echo -e "  ${GREEN}✅ PASS${NC}" | tee -a "$LOG_FILE"
            echo "  Response (truncated): ${output:0:100}..." | tee -a "$LOG_FILE"
            return 0
        fi
    else
        echo -e "  ${RED}❌ FAIL - Exit code: $exit_code${NC}" | tee -a "$LOG_FILE"
        echo "  Output: ${output:0:200}..." | tee -a "$LOG_FILE"
        return 1
    fi
}

# Compteurs
TOTAL=0
PASSED=0
FAILED=0

echo -e "\n📦 ENTERPRISE MODELS (pollinations/enter/)" | tee -a "$LOG_FILE"
echo "--------------------------------------------" | tee -a "$LOG_FILE"

# Gemini Enter - Multi-turn (météo = tool call)
TOTAL=$((TOTAL + 1))
if test_model "pollinations/enter/gemini" "météo à paris" "multi-turn with tool"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# Gemini Fast Enter
TOTAL=$((TOTAL + 1))
if test_model "pollinations/enter/gemini-fast" "météo à paris" "multi-turn with tool"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# OpenAI Enter
TOTAL=$((TOTAL + 1))
if test_model "pollinations/enter/openai" "salut" "simple response"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# GLM Enter
TOTAL=$((TOTAL + 1))
if test_model "pollinations/enter/glm" "salut" "simple response"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# Claude Fast Enter
TOTAL=$((TOTAL + 1))
if test_model "pollinations/enter/claude-fast" "salut" "simple response"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

echo -e "\n📦 FREE MODELS (pollinations/free/)" | tee -a "$LOG_FILE"
echo "------------------------------------" | tee -a "$LOG_FILE"

# Gemini Free - Multi-turn
TOTAL=$((TOTAL + 1))
if test_model "pollinations/free/gemini" "météo à paris" "multi-turn with tool"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# OpenAI Fast Free
TOTAL=$((TOTAL + 1))
if test_model "pollinations/free/openai-fast" "salut" "simple response"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# Résumé
echo -e "\n================================================" | tee -a "$LOG_FILE"
echo -e "📊 RÉSULTATS" | tee -a "$LOG_FILE"
echo -e "Total: $TOTAL | ${GREEN}Passed: $PASSED${NC} | ${RED}Failed: $FAILED${NC}" | tee -a "$LOG_FILE"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Tous les tests passent !${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "\n${RED}⚠️ Certains tests échouent. Voir $LOG_FILE${NC}" | tee -a "$LOG_FILE"
    exit 1
fi
7.2 Commandes de test manuelles
Bash

# Prérequis: être dans le bon répertoire
cd ~/Bureau/oracle/opencode

# ============================================
# TESTS ENTERPRISE (nécessite clé API)
# ============================================

# Test 1: Gemini Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini" --print-logs

# Test 2: Gemini Fast Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini-fast" --print-logs

# Test 3: OpenAI Enter (Simple)
opencode run "salut" -m "pollinations/enter/openai"

# Test 4: GLM Enter (Simple)
opencode run "salut" -m "pollinations/enter/glm"

# Test 5: Claude Fast Enter (Simple)
opencode run "salut" -m "pollinations/enter/claude-fast"

# ============================================
# TESTS FREE (sans clé API)
# ============================================

# Test 6: Gemini Free (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/free/gemini" --print-logs

# Test 7: OpenAI Fast Free (Simple)
opencode run "salut" -m "pollinations/free/openai-fast"

# ============================================
# VÉRIFICATION DES LOGS
# ============================================

# Voir les logs du proxy
tail -f /tmp/opencode_pollinations_debug.log

# Voir les logs de configuration
cat /tmp/pollinations-config-debug.log

# Voir les signatures Gemini sauvegardées
cat ~/.config/opencode/pollinations-signature.json
7.3 Matrice de validation
Modèle	Type	Prompt	Expected	Check
pollinations/enter/gemini	Enter	"météo à paris"	Multi-turn + Tool Call OK	☐
pollinations/enter/gemini-fast	Enter	"météo à paris"	Multi-turn + Tool Call OK	☐
pollinations/enter/openai	Enter	"salut"	Réponse simple	☐
pollinations/enter/glm	Enter	"salut"	Réponse simple	☐
pollinations/enter/claude-fast	Enter	"salut"	Réponse simple	☐
pollinations/free/gemini	Free	"météo à paris"	Multi-turn + Tool Call OK	☐
pollinations/free/openai-fast	Free	"salut"	Réponse simple	☐
7.4 Critères de validation
Pour chaque test, vérifier:

Réponse reçue: Le modèle répond (pas de timeout)
Pas d'erreur HTTP: Status 200
Pas d'erreur API: Pas de message d'erreur dans la réponse
Multi-turn fonctionne (pour météo): L'outil est appelé ET le résultat est utilisé
Signature Gemini (pour gemini): Vérifier dans les logs que la signature est capturée/injectée
Annexe A: Glossaire technique
Terme	Définition
Proxy	Serveur intermédiaire qui intercepte les requêtes
Tool Call	Appel de fonction par le LLM (ex: recherche météo)
Thought Signature	ID interne Gemini pour maintenir le contexte de raisonnement
Grounding	Fonctionnalité Gemini d'accès à Google Search
Dé-référencement	Résolution des $ref dans les JSON Schema
Vertex	Backend Google Cloud pour les modèles Gemini
WAF	Web Application Firewall (protection contre les bots)
Annexe B: Endpoints Pollinations API
Endpoint	Tier	Description
https://text.pollinations.ai/openai/chat/completions	Free	Chat completions
https://text.pollinations.ai/openai/models	Free	Liste des modèles
https://gen.pollinations.ai/v1/chat/completions	Enterprise	Chat completions
https://gen.pollinations.ai/text/models	Enterprise	Liste des modèles
https://gen.pollinations.ai/v1/usage	Enterprise	Quota (à confirmer)
Cette documentation devrait vous permettre de comprendre intégralement le fonctionnement du plugin V3 et d'implémenter les évolutions V4 sans régression. Les points critiques à préserver sont clairement identifiés, et le plan d'évolution propose une architecture modulaire pour les nouvelles fonctionnalités.
