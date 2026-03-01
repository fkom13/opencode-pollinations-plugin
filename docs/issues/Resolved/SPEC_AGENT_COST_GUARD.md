# SPEC_AGENT_COST_GUARD.md
## Sprint 3 : Contrôle des Coûts des Outils (Tool Cost Guard)

**Statut :** 📝 ToDo  
**Priorité :** P1 — Après ModelRegistry (Sprint 1+2)  
**Prérequis :** `SPEC_AGENT_MODEL_REGISTRY.md` terminé et validé  
**Effort :** ~2h  

---

## Contexte & Clarifications

### Périmètre exact : protection wallet, pas protection tools

Les outils Pollinations (gen_image, gen_video, etc.) sont déjà **invisibles sans clé API** — ils ne s'affichent pas dans OpenCode si l'utilisateur n'est pas connecté. Ce n'est donc pas le rôle du Cost Guard.

Le Cost Guard protège le **wallet Pollinations** (crédits pollen) contre les dépenses non désirées via des modèles payants.

Deux niveaux de coût existent :
- **Consommation pollen standard** : tous les modèles consomment des pollens
- **Consommation wallet direct** : les modèles `paid_only: true` débitent le wallet directement, pas le quota mensuel

Le Cost Guard adresse le second niveau en priorité, mais peut aussi appliquer un seuil global sur tous les modèles.

---

## 1. Configuration — `src/server/config.ts`

Ajouter dans la config persistante :

```typescript
tools?: {
    enable_paid_models: boolean;      // défaut: true
    // Si false : bloque les modèles paid_only:true dans tous les outils
    // Message affiché : demande à l'utilisateur d'activer l'option dans les settings
    
    ask_cost_confirmation: boolean;   // défaut: false
    // Si true : l'agent doit demander validation explicite avant toute génération
    // dont le coût estimé dépasse cost_limit
    
    cost_limit: number;               // défaut: 0.1 (pollens)
    // Seuil de coût estimé déclenchant la demande de confirmation
    // Toujours affiché dans le retour du tool, quelle que soit la valeur
}
```

**Commandes /pollinations pour piloter ces settings :**
```
/pollinations tools paid off     → enable_paid_models: false
/pollinations tools paid on      → enable_paid_models: true
/pollinations tools confirm on   → ask_cost_confirmation: true
/pollinations tools limit 0.05   → cost_limit: 0.05
```

---

## 2. Logique Centrale — `src/tools/pollinations/cost-guard.ts`

```typescript
import { loadConfig } from '../../server/config.js';
import { ModelRegistry } from '../../server/models/index.js';
import type { ModelCategory } from '../../server/models/types.js';

export interface CostCheckResult {
    allowed: boolean;               // false = bloquer l'appel
    requiresConfirmation: boolean;  // true = l'agent doit demander avant de continuer
    estimatedCost: number;          // en pollens
    currency: 'pollen';
    agentMessage?: string;          // instruction pour l'IA (dans le retour tool)
    displayBlock: string;           // bloc affiché dans le chat (toujours présent)
}

/**
 * À appeler au début de chaque outil payant, avant toute génération.
 *
 * @param modelName   nom du modèle utilisé
 * @param category    'image' | 'video' | 'audio' | 'text'
 * @param callContext description courte de l'objectif de l'appel (pour le message de confirmation)
 *                    ex: "Générer une image flux 1024x1024"
 * @param params      paramètres d'estimation (duration pour vidéo/musique, tokens pour texte/search)
 */
export function checkCostControl(
    modelName: string,
    category: ModelCategory,
    callContext: string,
    params: { duration?: number; estimatedTokens?: number; }
): CostCheckResult {

    const config = loadConfig();
    const toolConfig = config.tools ?? { enable_paid_models: true, ask_cost_confirmation: false, cost_limit: 0.1 };
    const model = ModelRegistry.get(category, modelName);

    // ── Estimer le coût ──────────────────────────────────────────────────
    let estimatedCost = 0;

    if (model?.pricing) {
        const p = model.pricing;
        if (p.completionImageTokens) {
            estimatedCost = p.completionImageTokens;                          // par image
        } else if (p.completionVideoSeconds && params.duration) {
            estimatedCost = p.completionVideoSeconds * params.duration;
        } else if (p.completionVideoTokens && params.duration) {
            // Estimation tokens vidéo : approximation 50k tokens/s
            estimatedCost = p.completionVideoTokens * (params.duration * 50000);
        } else if (p.completionAudioSeconds && params.duration) {
            estimatedCost = p.completionAudioSeconds * params.duration;
        } else if (p.completionAudioTokens && params.estimatedTokens) {
            estimatedCost = p.completionAudioTokens * params.estimatedTokens;
        } else if (p.completionTextTokens && params.estimatedTokens) {
            estimatedCost = p.completionTextTokens * params.estimatedTokens;
        }
    }

    const costFormatted = estimatedCost.toFixed(4);
    const isPaidOnly = model?.paid_only ?? false;

    // ── Règle 1 : modèle paid_only bloqué ────────────────────────────────
    if (isPaidOnly && !toolConfig.enable_paid_models) {
        return {
            allowed: false,
            requiresConfirmation: false,
            estimatedCost,
            currency: 'pollen',
            agentMessage: `Le modèle "${modelName}" est réservé aux comptes payants (paid_only). L'utilisateur doit activer l'option "enable_paid_models" dans les paramètres tools pour l'utiliser. Informez-le.`,
            displayBlock: [
                `🔒 **Modèle Payant Bloqué**`,
                `Modèle : ${modelName} (paid_only)`,
                ``,
                `Pour activer : \`/pollinations tools paid on\``,
                `Ou dans la config : \`tools.enable_paid_models: true\``,
            ].join('\n'),
        };
    }

    // ── Règle 2 : seuil de confirmation atteint ───────────────────────────
    if (toolConfig.ask_cost_confirmation && estimatedCost > toolConfig.cost_limit) {
        return {
            allowed: false,
            requiresConfirmation: true,
            estimatedCost,
            currency: 'pollen',
            agentMessage: `Le coût estimé (${costFormatted} 🌻) dépasse le seuil configuré (${toolConfig.cost_limit} 🌻). Vous DEVEZ demander confirmation explicite à l'utilisateur avant de lancer cette génération. Présentez-lui le coût et l'objectif de l'appel, et attendez sa réponse.`,
            displayBlock: [
                `⚠️ **Confirmation Requise**`,
                `Objectif : ${callContext}`,
                `Modèle : ${modelName}${isPaidOnly ? ' 💎' : ''}`,
                `Coût estimé : **${costFormatted} 🌻**`,
                `Seuil configuré : ${toolConfig.cost_limit} 🌻`,
                ``,
                `Répondez OUI pour confirmer, ou choisissez un modèle moins cher.`,
            ].join('\n'),
        };
    }

    // ── Autorisé — afficher le coût estimé dans tous les cas ─────────────
    return {
        allowed: true,
        requiresConfirmation: false,
        estimatedCost,
        currency: 'pollen',
        displayBlock: `💰 Coût estimé : ${costFormatted} 🌻 (${modelName})`,
    };
}
```

---

## 3. Intégration dans les Outils

### Pattern d'injection (identique pour tous les outils concernés)

```typescript
// En début de execute(), après la vérification de la clé API
import { checkCostControl } from './cost-guard.js';

const costCheck = checkCostControl(
    model,              // ex: "veo"
    'video',            // catégorie
    `Générer une vidéo ${model} ${duration}s`,  // contexte lisible
    { duration }
);

if (!costCheck.allowed) {
    return costCheck.displayBlock;  // bloque et retourne le message approprié
}

// Insérer le displayBlock dans le résultat final
const lines: string[] = [
    `🎬 Vidéo Générée`,
    `━━━━━━━━━━━━━━━━━━`,
    costCheck.displayBlock,   // ← ligne de coût toujours présente
    `Modèle: ${usedModel}`,
    // ...
];
```

### Outils concernés et paramètres

| Outil | Catégorie | Paramètre d'estimation |
|-------|-----------|----------------------|
| `gen_image` | `image` | aucun (coût par image) |
| `gen_video` | `video` | `{ duration: args.duration }` |
| `gen_audio` | `audio` | `{ duration: estimatedDuration }` |
| `gen_music` | `audio` | `{ duration: args.duration }` |
| `deepsearch` | `text` | `{ estimatedTokens: max_tokens }` |
| `search_crawl_scrape` | `text` | `{ estimatedTokens: 2000 }` |
| `transcribe_audio` | `audio` | `{ duration: audioDurationSeconds }` |

---

## 4. Affichage du Coût dans les Retours Tools

Le coût estimé doit **toujours** apparaître dans le retour du tool, même quand `ask_cost_confirmation: false` et même quand le modèle n'est pas `paid_only`. C'est de la transparence, pas du blocage.

**Format standard dans le retour :**
```
💰 Coût estimé : 0.0025 🌻 (grok-video)
```

**Quand le coût réel est connu via les headers de réponse**, le remplacer par :
```
💰 Coût réel : 0.0075 🌻 (3s × 0.0025) [grok-video]
```

Les headers à lire (déjà extraits par `extractCostFromHeaders()` dans `shared.ts`) :
- `x-usage-completion-video-seconds` → coût réel vidéo /s
- `x-usage-completion-video-tokens` → coût réel vidéo tokens
- `x-usage-completion-image-tokens` → coût réel image
- `x-usage-completion-audio-tokens` → coût réel audio

---

## 5. Commandes /pollinations pour la Config

À ajouter dans `src/server/commands.ts` :

```typescript
// /pollinations tools paid on|off
if (cmd === 'tools' && args[0] === 'paid') {
    const val = args[1] === 'on';
    saveConfig({ tools: { ...config.tools, enable_paid_models: val } });
    emitToast('info', `Modèles payants ${val ? 'activés ✅' : 'désactivés 🔒'}`);
    return;
}

// /pollinations tools confirm on|off
if (cmd === 'tools' && args[0] === 'confirm') {
    const val = args[1] === 'on';
    saveConfig({ tools: { ...config.tools, ask_cost_confirmation: val } });
    emitToast('info', `Confirmation coût ${val ? 'activée ⚠️' : 'désactivée'}`);
    return;
}

// /pollinations tools limit <valeur>
if (cmd === 'tools' && args[0] === 'limit') {
    const val = parseFloat(args[1]);
    if (!isNaN(val) && val > 0) {
        saveConfig({ tools: { ...config.tools, cost_limit: val } });
        emitToast('info', `Seuil de confirmation : ${val} 🌻`);
    }
    return;
}
```

---

## 6. Checklist

- [ ] Snapshot gencodedoc : `pre-cost-guard`
- [ ] Vérifier que ModelRegistry est opérationnel (Sprint 1+2 validés)
- [ ] Ajouter `tools` dans l'interface `Config` de `server/config.ts`
- [ ] Créer `src/tools/pollinations/cost-guard.ts`
- [ ] Injecter `checkCostControl()` dans `gen_image.ts`
- [ ] Injecter `checkCostControl()` dans `gen_video.ts`
- [ ] Injecter `checkCostControl()` dans `gen_audio.ts`
- [ ] Injecter `checkCostControl()` dans `gen_music.ts`
- [ ] Injecter `checkCostControl()` dans `deepsearch.ts`
- [ ] Injecter `checkCostControl()` dans `search_crawl_scrape.ts`
- [ ] Injecter `checkCostControl()` dans `transcribe_audio.ts`
- [ ] Ajouter les commandes `/pollinations tools` dans `commands.ts`
- [ ] Tester : blocage paid_only, confirmation dépassement seuil, affichage coût normal
- [ ] Snapshot gencodedoc : `cost-guard-done`
- [ ] Déplacer cette spec dans `docs/issues/Resolved/`
