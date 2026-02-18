# Spec Agent — Contrôle des Coûts et Modèles Payants dans les Tools

## Contexte

Les tools génératifs (`gen_image`, `gen_video`, `gen_music`, `gen_audio`) sont exposés à toutes les sessions OpenCode, quel que soit le provider actif. Un agent utilisant Claude ou Gemini via un autre provider peut appeler ces tools et déclencher des dépenses Pollen sans que l'utilisateur soit consulté.

Ce mécanisme ajoute deux garde-fous configurables et indépendants du système de modes texte.

---

## Les deux paramètres

### 1. `ask_cost_confirmation` + `cost_limit`

Quand activé, tout tool génératif dont le coût estimé dépasse `cost_limit` (en Pollen) déclenche automatiquement une demande de confirmation à l'utilisateur **avant** d'envoyer la requête à l'API. L'utilisateur voit le coût estimé et choisit de confirmer ou d'annuler. Si le coût est sous le seuil, le tool s'exécute directement sans interruption.

### 2. `enable_paid_models_in_tools`

Quand désactivé (`false`), tout appel à un modèle `paid_only` dans un tool génératif est bloqué immédiatement. Le tool retourne un message structuré à l'agent lui expliquant qu'il ne peut pas utiliser ce modèle et qu'il doit demander à l'utilisateur d'activer l'option.

---

## Partie 1 — Configuration

### Ajout dans `PollinationsConfigV5` (`src/server/config.ts`)

```typescript
interface PollinationsConfigV5 {
    // ... champs existants ...

    tools: {
        ask_cost_confirmation: boolean;  // défaut: false
        cost_limit: number;              // défaut: 0.1 (Pollen)
        enable_paid_models: boolean;     // défaut: true
    };
}
```

### Valeurs par défaut dans `getDefaultConfig()`

```typescript
tools: {
    ask_cost_confirmation: false,
    cost_limit: 0.1,
    enable_paid_models: true,
}
```

---

## Partie 2 — Commandes de configuration

À ajouter dans `handleConfigCommand()` dans `src/server/commands.ts`.

Les clés suivantes sont reconnues par `/poll config <key> <value>` :

| Commande | Valeurs | Description |
|----------|---------|-------------|
| `/poll config tools_ask_cost true` | `true` / `false` | Active la confirmation de coût |
| `/poll config tools_cost_limit 0.05` | nombre décimal | Seuil en Pollen au-dessus duquel confirmation requise |
| `/poll config tools_paid_models true` | `true` / `false` | Autorise les modèles paid_only dans les tools |

Ajout dans le switch de `handleConfigCommand()` :

```typescript
case 'tools_ask_cost':
    saveConfig({ tools: { ...config.tools, ask_cost_confirmation: value === 'true' } });
    return { handled: true, response: `✅ tools.ask_cost_confirmation = ${value}` };

case 'tools_cost_limit':
    const limit = parseFloat(value);
    if (isNaN(limit) || limit < 0) {
        return { handled: true, error: '❌ Valeur invalide. Exemple: /poll config tools_cost_limit 0.05' };
    }
    saveConfig({ tools: { ...config.tools, cost_limit: limit } });
    return { handled: true, response: `✅ tools.cost_limit = ${limit} 🌼` };

case 'tools_paid_models':
    saveConfig({ tools: { ...config.tools, enable_paid_models: value === 'true' } });
    return { handled: true, response: `✅ tools.enable_paid_models = ${value}` };
```

### Fichiers de commande OpenCode à générer (ajouter dans `registerOpenCodeCommands()`)

```typescript
{
    name: 'poll-tools-ask-cost-on',
    description: '💬 Pollinations Tools — Activer confirmation de coût avant génération',
    template: '/poll config tools_ask_cost true',
},
{
    name: 'poll-tools-ask-cost-off',
    description: '💬 Pollinations Tools — Désactiver confirmation de coût',
    template: '/poll config tools_ask_cost false',
},
{
    name: 'poll-tools-paid-on',
    description: '💎 Pollinations Tools — Autoriser les modèles payants dans les tools',
    template: '/poll config tools_paid_models true',
},
{
    name: 'poll-tools-paid-off',
    description: '🔒 Pollinations Tools — Bloquer les modèles payants dans les tools',
    template: '/poll config tools_paid_models false',
},
```

---

## Partie 3 — Utilitaires partagés (`src/tools/shared.ts`)

Ajouter deux fonctions exportées utilisées par tous les tools génératifs.

### `checkPaidModelAllowed(modelId: string): string | null`

Retourne un message d'erreur si le modèle est `paid_only` et que `enable_paid_models = false`.  
Retourne `null` si l'appel est autorisé.

```typescript
export function checkPaidModelAllowed(modelId: string): string | null {
    const config = loadConfig();

    if (config.tools.enable_paid_models) {
        return null; // autorisé
    }

    // Vérifier si le modèle est paid_only
    // La liste est celle déjà définie dans shared.ts (PAID_IMAGE_MODELS, etc.)
    const isPaid = isPaidOnlyModel(modelId); // voir ci-dessous

    if (isPaid) {
        return `⛔ Modèle payant bloqué : \`${modelId}\`

Ce modèle est \`paid_only\` et les modèles payants sont désactivés dans les tools.

**Pour autoriser :** demandez à l'utilisateur d'exécuter \`/poll-tools-paid-on\`
**Alternatives gratuites disponibles :**
${getFreeAlternatives(modelId)}`;
    }

    return null;
}
```

### `isPaidOnlyModel(modelId: string): boolean`

```typescript
// Liste statique des modèles paid_only connus
// À synchroniser avec la liste Pollinations lors des mises à jour
const PAID_ONLY_MODELS = new Set([
    // Image
    'seedream', 'seedream-pro', 'kontext', 'nanobanana', 'nanobanana-pro', 'gptimage-large',
    // Video
    'ltx-2', 'seedance-pro', 'veo',
    // Audio
    'elevenlabs', 'elevenmusic',
    // Text (via tools comme deepsearch)
    'claude', 'claude-legacy', 'claude-large',
    'gemini', 'gemini-large', 'gemini-legacy',
    'grok',
]);

export function isPaidOnlyModel(modelId: string): boolean {
    return PAID_ONLY_MODELS.has(modelId);
}
```

### `getFreeAlternatives(modelId: string): string`

```typescript
const FREE_ALTERNATIVES: Record<string, string> = {
    // Image paid → free
    'seedream': '`flux`, `zimage`, `sana`',
    'seedream-pro': '`flux`, `zimage`',
    'kontext': '`flux` (sans I2I)',
    'nanobanana': '`flux`, `gptimage`',
    'nanobanana-pro': '`flux`, `gptimage`',
    'gptimage-large': '`gptimage`, `flux`',
    // Video paid → free/alpha
    'ltx-2': '`grok-video` (alpha), `wan` (alpha)',
    'seedance-pro': '`seedance`, `grok-video`',
    'veo': '`grok-video` (alpha), `wan` (alpha)',
    // Audio paid → free
    'elevenlabs': '`openai-audio` (6 voix)',
    'elevenmusic': 'aucune alternative gratuite pour la musique',
    // Text
    'claude': '`openai-fast`, `gemini-fast`, `mistral`',
    'claude-large': '`openai`, `deepseek`',
    'gemini': '`gemini-fast` (Gemini 2.5 Flash Lite)',
    'gemini-large': '`gemini-fast`',
    'grok': '`openai-fast`, `nova-fast`',
};

export function getFreeAlternatives(modelId: string): string {
    return FREE_ALTERNATIVES[modelId] || 'voir `/poll-models` pour les options gratuites';
}
```

### `requestCostConfirmation(toolName, modelId, estimatedCost, context): Promise<boolean>`

Déclenche la confirmation utilisateur via l'API de contexte OpenCode si le coût dépasse le seuil.  
Retourne `true` si confirmé ou si la confirmation n'est pas requise, `false` si annulé.

```typescript
export async function requestCostConfirmation(
    toolName: string,
    modelId: string,
    estimatedCost: number,
    context: any // ToolContext d'OpenCode
): Promise<boolean> {
    const config = loadConfig();

    if (!config.tools.ask_cost_confirmation) {
        return true; // désactivé → toujours OK
    }

    if (estimatedCost <= config.tools.cost_limit) {
        return true; // sous le seuil → pas de confirmation
    }

    // Au-dessus du seuil → demande confirmation
    // OpenCode expose context.confirm() ou équivalent
    // Si l'API ne fournit pas de mécanisme de confirmation,
    // utiliser context.metadata() pour afficher l'info et retourner false
    // en laissant l'agent relancer si l'utilisateur confirme via un message

    try {
        const message = buildCostConfirmationMessage(toolName, modelId, estimatedCost, config.tools.cost_limit);

        // Tentative via context.confirm si disponible (API OpenCode future)
        if (typeof context.confirm === 'function') {
            return await context.confirm(message);
        }

        // Fallback : afficher le coût via metadata et bloquer
        // L'agent devra demander confirmation à l'utilisateur manuellement
        context.metadata({
            title: `💰 Confirmation requise — ${toolName}`,
            metadata: {
                type: 'warning',
                message: message,
            }
        });

        // Retourner false : l'outil ne s'exécute pas
        // Le message retourné à l'agent l'invite à redemander confirmation à l'user
        return false;

    } catch (e) {
        // En cas d'erreur du mécanisme de confirmation → laisser passer
        return true;
    }
}

function buildCostConfirmationMessage(
    toolName: string,
    modelId: string,
    estimatedCost: number,
    limit: number
): string {
    return `💰 **Confirmation de coût requise**

**Tool** : \`${toolName}\`
**Modèle** : \`${modelId}\`
**Coût estimé** : ${estimatedCost.toFixed(4)} 🌼 Pollen
**Seuil configuré** : ${limit} 🌼 Pollen

Ce coût dépasse votre seuil de confirmation.
Confirmez-vous l'exécution ?`;
}
```

---

## Partie 4 — Intégration dans les tools

Chaque tool génératif ajoute **deux vérifications au début de `execute()`**, après la validation des arguments et avant tout appel réseau.

### Pattern d'intégration (identique pour tous les tools concernés)

```typescript
async execute(args, context) {
    const apiKey = getApiKey();
    // ... validations existantes ...

    const model = args.model || DEFAULT_MODEL;

    // ── VÉRIFICATION 1 : modèle payant autorisé ? ──────────────────────────
    const paidModelError = checkPaidModelAllowed(model);
    if (paidModelError) {
        return paidModelError;
    }

    // ── VÉRIFICATION 2 : confirmation de coût ──────────────────────────────
    const estimatedCost = estimateXxxCost(args); // fonction déjà existante
    const confirmed = await requestCostConfirmation(
        'gen_image',  // nom du tool
        model,
        estimatedCost,
        context
    );

    if (!confirmed) {
        return `⏸️ Génération annulée.

**Coût estimé** : ${estimatedCost.toFixed(4)} 🌼 Pollen (seuil : ${loadConfig().tools.cost_limit} 🌼)

Pour confirmer, dites à l'utilisateur de répondre "oui, lance la génération" ou augmentez le seuil :
\`/poll config tools_cost_limit ${(estimatedCost * 1.1).toFixed(2)}\``;
    }

    // ── Suite normale du tool ───────────────────────────────────────────────
    // ... code existant ...
}
```

### Tools à modifier

| Tool | Fonction d'estimation existante | Modèles paid_only concernés |
|------|---------------------------------|-----------------------------|
| `gen_image` | `estimateImageCost(model, quality)` | seedream, seedream-pro, kontext, nanobanana, nanobanana-pro, gptimage-large |
| `gen_video` | `estimateVideoCost(model, duration)` | ltx-2, seedance-pro, veo |
| `gen_music` | `estimateMusicCost(duration)` | elevenmusic |
| `gen_audio` | `estimateTtsCost(textLength)` | elevenlabs |

`deepsearch` et `search_crawl_scrape` : uniquement la vérification `checkPaidModelAllowed`, pas de confirmation de coût (coût en tokens difficile à estimer avant envoi).

---

## Partie 5 — Affichage dans `/poll usage` et `/poll status`

Ajouter dans la sortie de `handleUsageCommand()` et `handleStatusCommand()` :

```
**Tools :**
- Confirmation de coût : ✅ activée (seuil : 0.10 🌼)
- Modèles payants : ✅ autorisés
```

---

## Résumé du comportement par cas

| Situation | Comportement |
|-----------|-------------|
| `enable_paid_models=false`, agent appelle `gen_image` avec `seedream` | Bloqué immédiatement, message à l'agent avec alternatives gratuites |
| `ask_cost_confirmation=true`, coût estimé < seuil | Exécution directe, aucune interruption |
| `ask_cost_confirmation=true`, coût estimé > seuil | Confirmation demandée via metadata + message de blocage à l'agent |
| `ask_cost_confirmation=false` | Exécution directe quelle que soit l'estimation |
| `enable_paid_models=true` | Modèles payants autorisés, seule la confirmation de coût s'applique |

---

## Note sur `context.confirm()`

L'API OpenCode ne semble pas encore exposer de mécanisme de confirmation synchrone dans le contexte d'un tool. Le fallback implémenté ici utilise `context.metadata()` pour afficher l'alerte et retourne `false` — ce qui force l'agent à reporter à l'utilisateur et attendre un message de confirmation explicite avant de relancer le tool.

Si OpenCode expose `context.confirm()` dans une version future, remplacer le fallback par l'appel direct — le reste du code n'a pas besoin de changer.
