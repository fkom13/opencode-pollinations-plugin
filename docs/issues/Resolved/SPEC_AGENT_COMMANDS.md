# Spec Agent — Système de Commandes OpenCode Pollinations Plugin

## Vue d'ensemble

Le plugin expose deux niveaux de commandes :

1. **Commandes enregistrées dans OpenCode** (autocomplete natif) — fichiers `.md` écrits dans `~/.config/opencode/commands/` au démarrage du plugin
2. **Hook d'interception** `tui.command.execute` dans `src/server/commands.ts` — traite toutes les commandes `/poll*` avant qu'elles n'atteignent le LLM

Le template de chaque fichier `.md` contient une commande `/poll ...` qui est interceptée par le hook et traitée localement. **Le LLM n'est jamais consulté pour ces commandes.**

---

## Partie 1 — Enregistrement des fichiers de commandes

### Localisation

Fonction `registerOpenCodeCommands()` à créer dans `src/index.ts`, appelée une fois au démarrage du plugin juste après `startProxy()`.

### Répertoire cible

```
~/.config/opencode/commands/poll-*.md
```

Utiliser `path.join(os.homedir(), '.config', 'opencode', 'commands')`.  
Créer le répertoire avec `fs.mkdirSync(dir, { recursive: true })` si absent.

### Format d'un fichier de commande

```
---
description: <texte affiché dans l'autocomplete OpenCode>
---

<template envoyé comme message quand la commande est exécutée>
```

Le `template` est intercepté par le hook `tui.command.execute` avant d'atteindre le LLM.

---

### Liste complète des fichiers à générer

#### `poll-usage.md`
```markdown
---
description: 🌸 Pollinations — Solde Pollen et quota tier
---

/poll usage
```

#### `poll-usage-full.md`
```markdown
---
description: 📊 Pollinations — Détail complet par modèle (période courante)
---

/poll usage full
```

#### `poll-status.md`
```markdown
---
description: ⚡ Pollinations — Santé du plugin et du proxy
---

/poll status
```

#### `poll-mode-pro.md`
```markdown
---
description: 🚀 Pollinations — Mode Pro (Enterprise + fallback gratuit automatique)
---

/poll mode pro
```

#### `poll-mode-free.md`
```markdown
---
description: 🆓 Pollinations — Mode Always Free (modèles gratuits uniquement)
---

/poll mode alwaysfree
```

#### `poll-mode-manual.md`
```markdown
---
description: 🎛️ Pollinations — Mode Manuel (aucun fallback, contrôle total)
---

/poll mode manual
```

#### `poll-models.md`
```markdown
---
description: 📋 Pollinations — Liste des modèles disponibles par catégorie
---

/poll models
```

#### `poll-pricing.md`
```markdown
---
description: 💰 Pollinations — Tarifs par modèle (Pollen/token, image, vidéo, audio)
---

/poll pricing
```

#### `poll-connect.md`
```markdown
---
description: 🔑 Pollinations — Connecter une clé API (sk_... ou pk_...)
---

/poll connect $ARGUMENTS
```

#### `poll-help.md`
```markdown
---
description: ❓ Pollinations — Aide complète du plugin et liste des commandes
---

/poll help
```

---

### Code de génération dans `src/index.ts`

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

function registerOpenCodeCommands(): void {
    const commandsDir = path.join(os.homedir(), '.config', 'opencode', 'commands');

    try {
        fs.mkdirSync(commandsDir, { recursive: true });
    } catch (e) {
        log(`[Commands] Cannot create commands dir: ${e}`);
        return;
    }

    const commands: Array<{ name: string; description: string; template: string }> = [
        {
            name: 'poll-usage',
            description: '🌸 Pollinations — Solde Pollen et quota tier',
            template: '/poll usage',
        },
        {
            name: 'poll-usage-full',
            description: '📊 Pollinations — Détail complet par modèle (période courante)',
            template: '/poll usage full',
        },
        {
            name: 'poll-status',
            description: '⚡ Pollinations — Santé du plugin et du proxy',
            template: '/poll status',
        },
        {
            name: 'poll-mode-pro',
            description: '🚀 Pollinations — Mode Pro (Enterprise + fallback gratuit automatique)',
            template: '/poll mode pro',
        },
        {
            name: 'poll-mode-free',
            description: '🆓 Pollinations — Mode Always Free (modèles gratuits uniquement)',
            template: '/poll mode alwaysfree',
        },
        {
            name: 'poll-mode-manual',
            description: '🎛️ Pollinations — Mode Manuel (aucun fallback, contrôle total)',
            template: '/poll mode manual',
        },
        {
            name: 'poll-models',
            description: '📋 Pollinations — Liste des modèles disponibles par catégorie',
            template: '/poll models',
        },
        {
            name: 'poll-pricing',
            description: '💰 Pollinations — Tarifs par modèle (Pollen/token, image, vidéo, audio)',
            template: '/poll pricing',
        },
        {
            name: 'poll-connect',
            description: '🔑 Pollinations — Connecter une clé API (sk_... ou pk_...)',
            template: '/poll connect $ARGUMENTS',
        },
        {
            name: 'poll-help',
            description: '❓ Pollinations — Aide complète du plugin et liste des commandes',
            template: '/poll help',
        },
    ];

    let written = 0;
    for (const cmd of commands) {
        const filePath = path.join(commandsDir, `${cmd.name}.md`);
        const content = `---\ndescription: ${cmd.description}\n---\n\n${cmd.template}\n`;

        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            written++;
        } catch (e) {
            log(`[Commands] Failed to write ${cmd.name}.md: ${e}`);
        }
    }

    log(`[Commands] ${written}/${commands.length} command files registered in ${commandsDir}`);
}
```

**Appel dans `PollinationsPlugin` :**

```typescript
export const PollinationsPlugin: Plugin = async (ctx) => {
    const port = await startProxy();
    registerOpenCodeCommands(); // ← ici, après startProxy
    // ...reste du code
};
```

---

## Partie 2 — Hook d'interception `tui.command.execute`

### Localisation

`src/server/commands.ts` — fonction `handleCommand(command: string)`.

Le hook est enregistré dans `src/index.ts` via `createCommandHooks()` :

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

Quand `output.handled = true`, OpenCode n'envoie pas le message au LLM.

---

### Référence complète des sous-commandes interceptées

Le parser extrait le sous-command à partir du premier mot après `/poll` ou `/pollinations` :

```typescript
export async function handleCommand(command: string): Promise<CommandResult> {
    const parts = command.trim().split(/\s+/);
    if (!parts[0].startsWith('/poll')) return { handled: false };

    const subCommand = parts[1];   // ex: "usage", "mode", "connect"...
    const args = parts.slice(2);   // ex: ["full"], ["pro"], ["sk_xxx"]
    // ...
}
```

---

#### `/poll usage`
- **Alias interceptés** : `/pollinations usage`
- **Args** : aucun, ou `full`
- **Comportement sans args** : affiche dashboard compact (tier, quota, wallet, reset)
- **Comportement avec `full`** : ajoute tableau détaillé par modèle sur la période courante
- **Requiert clé API** : non pour affichage basique, oui pour le détail `full`
- **Fonction** : `handleUsageCommand(args)`

---

#### `/poll mode`
- **Alias interceptés** : `/pollinations mode`
- **Args** : `pro` | `alwaysfree` | `manual`
- **Sans args** : retourne le mode actuel
- **Avec `pro`** : vérifie les permissions de la clé (checkKeyPermissions) avant d'activer. Si clé limitée → refuse et passe en `manual`
- **Avec `alwaysfree`** : vérifie la clé si présente. Accepte même sans clé
- **Avec `manual`** : accepté sans vérification
- **Fonction** : `handleModeCommand(args)`
- **Effets de bord** : écrit dans `~/.pollinations/config.json` via `saveConfig()`

---

#### `/poll connect`
- **Alias interceptés** : `/pollinations connect`
- **Args** : `<apiKey>` (obligatoire)
- **Comportement** :
  1. Appelle `generatePollinationsConfig(key, true)` pour valider la clé fonctionnellement
  2. Vérifie que des modèles Enterprise sont retournés
  3. Appelle `checkKeyPermissions(key)` pour détecter les clés limitées (sans accès `/account/*`)
  4. Si clé limitée : sauvegarde avec `keyHasAccessToProfile: false`, mode forcé en `manual`
  5. Si clé valide complète : sauvegarde, conserve le mode existant
- **Requiert redémarrage OpenCode** : oui, pour que les modèles Enterprise apparaissent
- **Fonction** : `handleConnectCommand(args)`

---

#### `/poll fallback`
- **Alias interceptés** : `/pollinations fallback`
- **Args** : `<main_model> [agent_model]`
- **Sans args** : affiche les fallbacks actuels (free.main, free.agent, enter.agent)
- **Avec args** : configure `fallbacks.free.main` et optionnellement `fallbacks.free.agent`
- **Fonction** : `handleFallbackCommand(args)`

---

#### `/poll config`
- **Alias interceptés** : `/pollinations config`
- **Args** : `<key> [value]`
- **Sans args** : affiche toute la config (apiKey masquée)
- **Clés configurables** :

| Clé | Valeurs | Description |
|-----|---------|-------------|
| `status_gui` | `none` / `alert` / `all` | Verbosité des toasts status |
| `logs_gui` | `none` / `error` / `verbose` | Verbosité des toasts techniques |
| `threshold_tier` | `0`–`100` | Seuil alerte tier (% du quota journalier) |
| `threshold_wallet` | `0`–`100` | Seuil Safety Net wallet ($) |
| `status_bar` | `true` / `false` | Affichage widget status bar |
| `apiKey` | `sk_...` / `pk_...` | Clé API (préférer `/poll connect`) |

- **Fonction** : `handleConfigCommand(args)`

---

#### `/poll status`
- **Alias interceptés** : `/pollinations status`
- **Args** : aucun
- **Comportement** : retourne un résumé de santé du plugin (version, mode, port proxy, état quota)
- **Toujours disponible** : même hors ligne
- **Fonction** : `handleStatusCommand()`

---

#### `/poll models`
- **Alias interceptés** : `/pollinations models`
- **Args** : aucun (filtre optionnel à implémenter en v6.2)
- **Comportement** : fetch `/text/models`, `/image/models`, `/video/models`, `/audio/models` en parallèle, affiche par catégorie avec prix et badges (FREE / PAID)
- **Cache** : 1 heure
- **Requiert clé API** : oui (sinon retourne erreur explicite)
- **Fonction** : `handleModelsCommand('models', options)` — module `src/server/models-command.ts`
- **Statut** : à implémenter en v6.2 (spec dans `FEATURE_PRICING_MODELS_COMMANDS.md`)

---

#### `/poll pricing`
- **Alias interceptés** : `/pollinations pricing`
- **Args** : aucun
- **Comportement** : même fetch que `/poll models`, affichage orienté tarifs (tableau input/output/flat par modèle)
- **Cache** : partagé avec `/poll models` (même fetch)
- **Requiert clé API** : oui
- **Fonction** : `handleModelsCommand('pricing', options)`
- **Statut** : à implémenter en v6.2

---

#### `/poll help`
- **Alias interceptés** : `/pollinations help`
- **Args** : aucun
- **Comportement** : retourne la liste complète des commandes avec descriptions et exemples
- **Toujours disponible** : statique, aucun appel réseau
- **Fonction** : `handleHelpCommand()`

---

## Partie 3 — Comportement attendu de bout en bout

```
Utilisateur tape "/poll" dans OpenCode
    → Autocomplete affiche les 10 fichiers poll-*.md avec leurs descriptions
    → Utilisateur sélectionne "poll-mode-pro"
    → OpenCode envoie le message "/poll mode pro" au hook tui.command.execute
    → handleCommand("/poll mode pro") intercepte
    → handleModeCommand(["pro"]) vérifie la clé, sauvegarde config
    → Retourne { handled: true, response: "✅ Mode changé: pro" }
    → OpenCode affiche la réponse dans le TUI
    → Le LLM n'est jamais appelé
```

---

## Partie 4 — Points de vigilance pour l'implémentation

**Ne pas oublier** : les fichiers `poll-*.md` sont écrits à chaque démarrage du plugin. Si la description change entre versions, le fichier est écrasé — c'est le comportement souhaité.

**Conflit de noms** : OpenCode permet aux commandes personnalisées d'écraser les commandes intégrées. S'assurer qu'aucun fichier `poll-*.md` ne porte le nom d'une commande intégrée (`init`, `undo`, `redo`, `share`, `help`). Les noms `poll-*` sont safe.

**`$ARGUMENTS` dans le hook** : quand `poll-connect` est exécuté avec une clé, OpenCode remplace `$ARGUMENTS` par la valeur saisie avant d'envoyer le message au hook. Le hook reçoit donc `/poll connect sk_xxxxx` et peut parser normalement.

**Nettoyage** : envisager une fonction `cleanupOldCommands()` qui supprime les fichiers `poll-*.md` existants avant de les réécrire, pour éviter des fichiers orphelins si des commandes sont renommées entre versions.
