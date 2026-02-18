# Spec Agent — Cost Guard & Paid Model Gate pour les Outils Génératifs

## Vue d'ensemble

Deux mécanismes de contrôle indépendants, configurables par commande, appliqués aux outils génératifs coûteux (`gen_image`, `gen_video`, `gen_audio`, `gen_music`).

| Mécanisme | Config key | Défaut | Description |
|-----------|-----------|:------:|-------------|
| Cost Confirmation | `ask_cost_confirmation` | `false` | Demande confirmation si coût estimé > seuil |
| Cost Limit | `cost_limit` | `0.05` | Seuil en Pollen déclenchant la confirmation |
| Paid Model Gate | `enable_paid_models_in_tools` | `true` | Autorise les modèles paid-only dans les tools |

---

## Partie 1 — Cost Confirmation Gate

### Principe

Quand `ask_cost_confirmation = true` ET que le coût estimé de l'appel dépasse `cost_limit` (en Pollen), le tool **ne s'exécute pas**. Il retourne à l'agent le coût estimé et lui demande de rappeler avec `confirmed: true`. L'agent présente cette information à l'utilisateur avant de confirmer.

Aucun appel API. Aucune dépendance sur le `question` tool d'OpenCode. Le mécanisme est entièrement dans le tool lui-même.

---

### Modification 1 : `src/server/config.ts`

Ajouter deux champs à l'interface `PollinationsConfigV5` :

```typescript
interface PollinationsConfigV5 {
    // ... champs existants ...
    askCostConfirmation: boolean;   // Défaut: false
    costLimit: number;              // Défaut: 0.05 (Pollen)
    enablePaidModelsInTools: boolean; // Défaut: true
}
```

Ajouter les valeurs par défaut dans la fonction qui construit la config par défaut :

```typescript
const DEFAULT_CONFIG: PollinationsConfigV5 = {
    // ... existant ...
    askCostConfirmation: false,
    costLimit: 0.05,
    enablePaidModelsInTools: true,
};
```

---

### Modification 2 : `src/tools/pollinations/shared.ts`

Ajouter la fonction utilitaire centrale utilisée par tous les tools concernés :

```typescript
import { loadConfig } from '../../server/config.js';

export interface CostGuardResult {
    blocked: boolean;
    message?: string;
}

/**
 * Cost Confirmation Guard
 * 
 * Vérifie si le coût estimé dépasse le seuil configuré.
 * Si oui et que confirmed=false, retourne un message de confirmation.
 * 
 * @param estimatedCost - Coût estimé en Pollen
 * @param confirmed - true si l'utilisateur a déjà confirmé (paramètre du tool)
 * @param toolName - Nom de l'outil pour le message (ex: "gen_image")
 * @param modelName - Nom du modèle utilisé
 */
export function checkCostGuard(
    estimatedCost: number,
    confirmed: boolean | undefined,
    toolName: string,
    modelName: string
): CostGuardResult {
    const config = loadConfig();

    if (!config.askCostConfirmation) {
        return { blocked: false };
    }

    if (estimatedCost <= config.costLimit) {
        return { blocked: false };
    }

    if (confirmed === true) {
        return { blocked: false };
    }

    // Blocked — demande confirmation
    const message = [
        `⚠️ **Confirmation de coût requise**`,
        ``,
        `| Paramètre | Valeur |`,
        `|-----------|--------|`,
        `| Outil | \`${toolName}\` |`,
        `| Modèle | \`${modelName}\` |`,
        `| Coût estimé | **${estimatedCost.toFixed(4)} 🌼** |`,
        `| Seuil configuré | ${config.costLimit.toFixed(4)} 🌼 |`,
        ``,
        `Pour confirmer et exécuter, rappelle le même outil avec le paramètre \`confirmed: true\`.`,
        `Pour annuler, ne rappelle pas le tool.`,
        ``,
        `> 💡 Pour désactiver cette confirmation : \`/poll-config ask_cost_confirmation false\``,
        `> 💡 Pour ajuster le seuil : \`/poll-config cost_limit 0.1\``,
    ].join('\n');

    return { blocked: true, message };
}
```

---

### Modification 3 : Chaque tool génératif concerné

**Tools à modifier** : `gen_image.ts`, `gen_video.ts`, `gen_audio.ts`, `gen_music.ts`

**Étape A — Ajouter le paramètre `confirmed` dans `args` :**

```typescript
args: {
    // ... args existants ...
    confirmed: tool.schema.boolean()
        .optional()
        .describe('Set to true to confirm execution when cost exceeds the configured limit'),
},
```

**Étape B — Insérer le check APRÈS le calcul du coût estimé, AVANT l'appel API :**

```typescript
async execute(args, context) {
    // ... validation modèle, clé API, etc. (code existant) ...

    // Calcul du coût estimé (code existant)
    const estimatedCost = estimateImageCost(model, width, height); // ou estimateXxxCost()

    // ── COST GUARD ──────────────────────────────────────────────────
    const costGuard = checkCostGuard(estimatedCost, args.confirmed, 'gen_image', model);
    if (costGuard.blocked) {
        return costGuard.message!;
    }
    // ────────────────────────────────────────────────────────────────

    // ... appel API (code existant) ...
}
```

---

### Exemples de comportement

**Cas 1 — Confirmation non requise (coût sous le seuil)**
```
Agent: gen_image(prompt="cat", model="flux")
→ estimatedCost = 0.0002 < costLimit 0.05
→ Exécution immédiate, pas de confirmation
```

**Cas 2 — Confirmation requise (coût au-dessus du seuil)**
```
Agent: gen_image(prompt="portrait 4K", model="seedream-pro")
→ estimatedCost = 0.04 > costLimit 0.01
→ Tool retourne le message de confirmation, NE S'EXÉCUTE PAS

Agent présente à l'user : "Coût estimé : 0.04 🌼. Confirmer ?"
User : "Oui"

Agent: gen_image(prompt="portrait 4K", model="seedream-pro", confirmed=true)
→ confirmed=true → Guard passé → Exécution normale
```

**Cas 3 — Confirmation désactivée**
```
ask_cost_confirmation = false (défaut)
→ Guard jamais déclenché, tous les tools s'exécutent directement
```

---

## Partie 2 — Paid Model Gate

### Principe

Quand `enable_paid_models_in_tools = false`, si l'agent tente d'utiliser un modèle marqué `paid_only: true` dans un tool, le tool retourne un message explicatif **sans appel API**. L'agent est invité à demander à l'utilisateur d'activer les modèles payants.

La liste des modèles paid-only est déjà présente dans `shared.ts` sous `PAID_IMAGE_MODELS`, et les propriétés `paid_only` dans chaque liste de modèles.

---

### Modification 1 : `src/tools/pollinations/shared.ts`

Ajouter la fonction de vérification :

```typescript
/**
 * Paid Model Gate
 * 
 * Vérifie si le modèle demandé est paid-only et si l'accès est autorisé.
 * 
 * @param modelName - Nom du modèle demandé
 * @param isPaidModel - true si le modèle est dans la liste paid-only
 */
export function checkPaidModelGate(
    modelName: string,
    isPaidModel: boolean
): CostGuardResult {
    if (!isPaidModel) {
        return { blocked: false };
    }

    const config = loadConfig();

    if (config.enablePaidModelsInTools !== false) {
        return { blocked: false };
    }

    // Bloqué
    const message = [
        `🔒 **Modèle Paid-Only — Accès refusé**`,
        ``,
        `Le modèle \`${modelName}\` est réservé aux crédits achetés (💎 Paid Only).`,
        `L'utilisation de modèles payants dans les outils est actuellement **désactivée**.`,
        ``,
        `**Pour l'utilisateur** — Pour autoriser ce modèle :`,
        `\`\`\``,
        `/poll-config enable_paid_models_in_tools true`,
        `\`\`\``,
        ``,
        `**Alternatives gratuites disponibles :**`,
        `- Images : \`sana\`, \`zimage\`, \`flux\` (avec clé, tier grant)`,
        `- Vidéo : \`seedance\` (tier grant), \`grok-video\` (alpha)`,
        `- Audio : \`openai-audio\` (tier grant)`,
        `- Musique : modèle par défaut (tier grant)`,
    ].join('\n');

    return { blocked: true, message };
}
```

---

### Modification 2 : Chaque tool génératif concerné

**Étape A — Détecter si le modèle est paid-only**

Dans chaque tool, après la résolution du modèle final, appeler le gate :

**`gen_image.ts`** — après `const model = args.model || DEFAULT_MODEL` :

```typescript
// Détection paid-only (liste déjà présente dans shared.ts)
const isPaid = PAID_IMAGE_MODELS.includes(model) || 
               !!IMAGE_MODEL_CONFIG[model]?.paid_only;

// ── PAID MODEL GATE ──────────────────────────────────────────────
const paidGate = checkPaidModelGate(model, isPaid);
if (paidGate.blocked) {
    return paidGate.message!;
}
// ────────────────────────────────────────────────────────────────
```

**`gen_video.ts`** — même pattern avec `VIDEO_MODELS` paid-only list :

```typescript
const PAID_VIDEO_MODELS = ['ltx-2', 'seedance-pro', 'veo'];
const isPaid = PAID_VIDEO_MODELS.includes(model);

const paidGate = checkPaidModelGate(model, isPaid);
if (paidGate.blocked) return paidGate.message!;
```

**`gen_audio.ts`** — pour elevenlabs (paid) :

```typescript
const PAID_AUDIO_MODELS = ['elevenlabs', 'elevenmusic'];
const isPaid = PAID_AUDIO_MODELS.includes(model);

const paidGate = checkPaidModelGate(model, isPaid);
if (paidGate.blocked) return paidGate.message!;
```

**`gen_music.ts`** — même logique selon le modèle résolu.

---

### Ordre d'application des guards dans chaque tool

L'ordre est important. Voici la séquence exacte au début de chaque `execute()` :

```typescript
async execute(args, context) {
    // 1. Validation de la clé API (si requise)
    const apiKey = getApiKey();
    if (!apiKey) return `❌ Clé API requise...`;

    // 2. Résolution du modèle final
    const model = args.model || DEFAULT_MODEL;

    // 3. PAID MODEL GATE — avant tout calcul
    const isPaid = PAID_XXX_MODELS.includes(model);
    const paidGate = checkPaidModelGate(model, isPaid);
    if (paidGate.blocked) return paidGate.message!;

    // 4. Calcul du coût estimé (code existant)
    const estimatedCost = estimateXxxCost(...);

    // 5. COST GUARD — après estimation, avant appel API
    const costGuard = checkCostGuard(estimatedCost, args.confirmed, 'gen_xxx', model);
    if (costGuard.blocked) return costGuard.message!;

    // 6. Appel API (code existant)
    // ...
}
```

---

## Partie 3 — Commandes de configuration

### Modification de `src/server/commands.ts`

Ajouter la gestion de ces trois clés dans `handleConfigCommand()` :

```typescript
// Dans le switch/if de handleConfigCommand, ajouter :

case 'ask_cost_confirmation':
    if (!value) {
        return { handled: true, response: `ask_cost_confirmation = ${config.askCostConfirmation}` };
    }
    if (!['true', 'false'].includes(value)) {
        return { handled: true, error: `Valeur invalide. Utilisez: true | false` };
    }
    saveConfig({ askCostConfirmation: value === 'true' });
    return { handled: true, response: `✅ ask_cost_confirmation = ${value}` };

case 'cost_limit':
    if (!value) {
        return { handled: true, response: `cost_limit = ${config.costLimit} 🌼` };
    }
    const limit = parseFloat(value);
    if (isNaN(limit) || limit < 0) {
        return { handled: true, error: `Valeur invalide. Exemple: 0.05` };
    }
    saveConfig({ costLimit: limit });
    return { handled: true, response: `✅ cost_limit = ${limit} 🌼` };

case 'enable_paid_models_in_tools':
    if (!value) {
        return { handled: true, response: `enable_paid_models_in_tools = ${config.enablePaidModelsInTools}` };
    }
    if (!['true', 'false'].includes(value)) {
        return { handled: true, error: `Valeur invalide. Utilisez: true | false` };
    }
    saveConfig({ enablePaidModelsInTools: value === 'true' });
    return { handled: true, response: `✅ enable_paid_models_in_tools = ${value}` };
```

---

### Commandes OpenCode à ajouter dans `registerOpenCodeCommands()`

```typescript
// À ajouter dans le tableau commands[] de registerOpenCodeCommands()

{
    name: 'poll-cost-confirm-on',
    description: '💰 Pollinations — Activer la confirmation de coût avant génération',
    template: '/poll config ask_cost_confirmation true',
},
{
    name: 'poll-cost-confirm-off',
    description: '💰 Pollinations — Désactiver la confirmation de coût',
    template: '/poll config ask_cost_confirmation false',
},
{
    name: 'poll-paid-tools-on',
    description: '💎 Pollinations — Autoriser les modèles paid-only dans les outils',
    template: '/poll config enable_paid_models_in_tools true',
},
{
    name: 'poll-paid-tools-off',
    description: '🔒 Pollinations — Bloquer les modèles paid-only dans les outils',
    template: '/poll config enable_paid_models_in_tools false',
},
```

---

## Résumé — Fichiers à toucher

| Fichier | Modification |
|---------|-------------|
| `src/server/config.ts` | +3 champs interface + defaults |
| `src/tools/pollinations/shared.ts` | +2 fonctions : `checkCostGuard()` + `checkPaidModelGate()` |
| `src/tools/pollinations/gen_image.ts` | +param `confirmed`, +2 guard calls |
| `src/tools/pollinations/gen_video.ts` | +param `confirmed`, +2 guard calls |
| `src/tools/pollinations/gen_audio.ts` | +param `confirmed`, +2 guard calls |
| `src/tools/pollinations/gen_music.ts` | +param `confirmed`, +2 guard calls |
| `src/server/commands.ts` | +3 cases dans `handleConfigCommand()` |
| `src/index.ts` | +4 entrées dans `registerOpenCodeCommands()` |

**Aucune dépendance externe. Aucun appel réseau ajouté. Entièrement dans le plugin.**
