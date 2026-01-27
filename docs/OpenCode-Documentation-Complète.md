# Documentation Complète OpenCode.ai

> Documentation officielle complète d'OpenCode - Agent de codage IA open source

**Date de récupération:** 23 janvier 2026  
**Source:** https://opencode.ai/docs/

---

## Table des Matières

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Interface Terminal (TUI)](#interface-terminal-tui)
5. [Interface en Ligne de Commande (CLI)](#interface-en-ligne-de-commande-cli)
6. [Serveur HTTP/API](#serveur-httpapi)
7. [SDK JavaScript/TypeScript](#sdk-javascripttypescript)
8. [Providers & Modèles](#providers--modèles)
9. [OpenCode Zen](#opencode-zen)
10. [Agents](#agents)
11. [Outils (Tools)](#outils-tools)
12. [Outils Personnalisés](#outils-personnalisés)
13. [Plugins](#plugins)
14. [Serveurs MCP](#serveurs-mcp)
15. [Serveurs LSP](#serveurs-lsp)
16. [Compétences (Skills)](#compétences-skills)
17. [Règles & Instructions](#règles--instructions)
18. [Commandes Personnalisées](#commandes-personnalisées)
19. [Formatters](#formatters)
20. [Permissions](#permissions)
21. [Thèmes](#thèmes)
22. [Raccourcis Clavier](#raccourcis-clavier)
23. [Partage](#partage)
24. [Intégration IDE](#intégration-ide)
25. [GitHub Actions](#github-actions)
26. [Enterprise](#enterprise)
27. [Écosystème](#écosystème)

---

## Introduction

**OpenCode** est un agent de codage IA open source. Il est disponible sous forme d'interface terminal, d'application de bureau ou d'extension IDE.

### Prérequis

Pour utiliser OpenCode dans votre terminal, vous aurez besoin de :

1. Un émulateur de terminal moderne comme :
   - [WezTerm](https://wezterm.org/) (multiplateforme)
   - [Alacritty](https://alacritty.org/) (multiplateforme)
   - [Ghostty](https://ghostty.org/) (Linux et macOS)
   - [Kitty](https://sw.kovidgoyal.net/kitty/) (Linux et macOS)

2. Des clés API pour les fournisseurs LLM que vous souhaitez utiliser

---

## Installation

### Installation rapide

La façon la plus simple d'installer OpenCode est via le script d'installation :

```bash
curl -fsSL https://opencode.ai/install | bash
```

### Via Node.js

**npm:**
```bash
npm install -g opencode-ai
```

**Bun:**
```bash
bun install -g opencode-ai
```

**pnpm:**
```bash
pnpm install -g opencode-ai
```

**Yarn:**
```bash
yarn global add opencode-ai
```

### Via Homebrew (macOS et Linux)

```bash
brew install anomalyco/tap/opencode
```

> Nous recommandons d'utiliser le tap OpenCode pour les versions les plus récentes.

### Via Paru (Arch Linux)

```bash
paru -S opencode-bin
```

### Windows

**Chocolatey:**
```bash
choco install opencode
```

**Scoop:**
```bash
scoop install opencode
```

**NPM:**
```bash
npm install -g opencode-ai
```

**Mise:**
```bash
mise use -g github:anomalyco/opencode
```

**Docker:**
```bash
docker run -it --rm ghcr.io/anomalyco/opencode
```

### Depuis les binaires

Vous pouvez également télécharger les binaires depuis [Releases](https://github.com/anomalyco/opencode/releases).

---

## Configuration

### Configurer un Provider

OpenCode peut utiliser n'importe quel fournisseur LLM en configurant leurs clés API.

#### OpenCode Zen (Recommandé pour débutants)

1. Exécutez la commande `/connect` dans le TUI, sélectionnez opencode, et allez sur [opencode.ai/auth](https://opencode.ai/auth).

```bash
/connect
```

2. Connectez-vous, ajoutez vos détails de facturation, et copiez votre clé API.

3. Collez votre clé API.

### Initialiser un Projet

Naviguez vers un projet sur lequel vous voulez travailler :

```bash
cd /path/to/project
```

Lancez OpenCode :

```bash
opencode
```

Initialisez OpenCode pour le projet :

```bash
/init
```

Cela analysera votre projet et créera un fichier `AGENTS.md` à la racine du projet.

---

## Interface Terminal (TUI)

### Démarrage

Lancer OpenCode démarre le TUI pour le répertoire actuel :

```bash
opencode
```

Ou pour un répertoire spécifique :

```bash
opencode /path/to/project
```

### Références de Fichiers

Vous pouvez référencer des fichiers dans vos messages en utilisant `@` :

```
Comment l'authentification est-elle gérée dans @packages/functions/src/api/index.ts?
```

### Commandes Bash

Commencez un message avec `!` pour exécuter une commande shell :

```
!ls -la
```

### Commandes Slash

Tapez `/` suivi d'un nom de commande pour exécuter rapidement des actions.

#### Commandes Disponibles

- `/connect` - Ajouter un provider
- `/compact` ou `/summarize` - Compacter la session actuelle
- `/details` - Basculer les détails d'exécution des outils
- `/editor` - Ouvrir un éditeur externe pour composer des messages
- `/exit`, `/quit`, `/q` - Quitter OpenCode
- `/export` - Exporter la conversation en Markdown
- `/help` - Afficher la boîte de dialogue d'aide
- `/init` - Créer ou mettre à jour le fichier `AGENTS.md`
- `/models` - Lister les modèles disponibles
- `/new`, `/clear` - Démarrer une nouvelle session
- `/redo` - Refaire un message précédemment annulé
- `/sessions`, `/resume`, `/continue` - Lister et basculer entre les sessions
- `/share` - Partager la session actuelle
- `/theme` - Lister les thèmes disponibles
- `/thinking` - Basculer la visibilité des blocs de raisonnement
- `/undo` - Annuler le dernier message
- `/unshare` - Retirer le partage de la session actuelle

### Configuration de l'Éditeur

Les commandes `/editor` et `/export` utilisent l'éditeur spécifié dans votre variable d'environnement `EDITOR`.

**Linux/macOS:**
```bash
export EDITOR="code --wait"
```

**Windows (CMD):**
```cmd
set EDITOR=code --wait
```

**Windows (PowerShell):**
```powershell
$env:EDITOR = "code --wait"
```

Éditeurs populaires :
- `code` - Visual Studio Code
- `cursor` - Cursor
- `windsurf` - Windsurf
- `nvim` - Neovim
- `vim` - Vim
- `nano` - Nano

### Configuration TUI

Vous pouvez personnaliser le comportement du TUI via votre fichier de configuration OpenCode :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": {
      "enabled": true
    },
    "diff_style": "auto"
  }
}
```

Options disponibles :
- `scroll_acceleration.enabled` - Activer l'accélération de défilement style macOS
- `scroll_speed` - Multiplicateur de vitesse de défilement personnalisé (défaut: 3, minimum: 1)
- `diff_style` - Contrôle le rendu des diffs. `"auto"` s'adapte à la largeur du terminal, `"stacked"` affiche toujours une seule colonne

---

## Interface en Ligne de Commande (CLI)

Le CLI OpenCode démarre par défaut le TUI lorsqu'il est exécuté sans arguments, mais accepte également des commandes.

### Commande: tui

Démarrer l'interface utilisateur terminal OpenCode :

```bash
opencode [project]
```

**Flags:**
- `--continue`, `-c` - Continuer la dernière session
- `--session`, `-s` - ID de session à continuer
- `--prompt` - Prompt à utiliser
- `--model`, `-m` - Modèle à utiliser (provider/model)
- `--agent` - Agent à utiliser
- `--port` - Port d'écoute
- `--hostname` - Nom d'hôte d'écoute

### Commande: run

Exécuter opencode en mode non-interactif en passant directement un prompt :

```bash
opencode run [message..]
```

**Exemple:**
```bash
opencode run "Expliquez l'utilisation du contexte en Go"
```

**Flags:**
- `--command` - La commande à exécuter
- `--continue`, `-c` - Continuer la dernière session
- `--session`, `-s` - ID de session à continuer
- `--share` - Partager la session
- `--model`, `-m` - Modèle à utiliser
- `--agent` - Agent à utiliser
- `--file`, `-f` - Fichier(s) à attacher au message
- `--format` - Format: default (formaté) ou json (événements JSON bruts)
- `--title` - Titre de la session
- `--attach` - Se connecter à un serveur opencode en cours d'exécution
- `--port` - Port pour le serveur local

### Commande: serve

Démarrer un serveur OpenCode headless pour l'accès API :

```bash
opencode serve
```

**Flags:**
- `--port` - Port d'écoute
- `--hostname` - Nom d'hôte d'écoute
- `--mdns` - Activer la découverte mDNS
- `--cors` - Origine(s) de navigateur supplémentaires pour autoriser CORS

### Commande: web

Démarrer un serveur OpenCode headless avec interface web :

```bash
opencode web
```

### Commande: attach

Attacher un terminal à un serveur backend OpenCode déjà en cours d'exécution :

```bash
opencode attach [url]
```

**Exemple:**
```bash
# Démarrer le serveur backend
opencode web --port 4096 --hostname 0.0.0.0

# Dans un autre terminal, attacher le TUI
opencode attach http://10.20.30.40:4096
```

### Commande: agent

Gérer les agents pour OpenCode :

```bash
opencode agent [command]
```

**Sous-commandes:**
- `create` - Créer un nouvel agent
- `list` - Lister tous les agents disponibles

### Commande: auth

Gérer les informations d'identification et la connexion pour les providers :

```bash
opencode auth [command]
```

**Sous-commandes:**
- `login` - Configurer les clés API pour les providers
- `list`, `ls` - Lister tous les providers authentifiés
- `logout` - Se déconnecter d'un provider

### Commande: mcp

Gérer les serveurs Model Context Protocol :

```bash
opencode mcp [command]
```

**Sous-commandes:**
- `add` - Ajouter un serveur MCP
- `list`, `ls` - Lister tous les serveurs MCP configurés
- `auth [name]` - S'authentifier avec un serveur MCP OAuth
- `logout [name]` - Supprimer les informations d'identification OAuth
- `debug <name>` - Déboguer les problèmes de connexion OAuth

### Commande: models

Lister tous les modèles disponibles depuis les providers configurés :

```bash
opencode models [provider]
```

**Flags:**
- `--refresh` - Actualiser le cache des modèles depuis models.dev
- `--verbose` - Utiliser une sortie de modèle plus détaillée

### Commande: session

Gérer les sessions OpenCode :

```bash
opencode session [command]
```

**Sous-commandes:**
- `list` - Lister toutes les sessions OpenCode

**Flags pour list:**
- `--max-count`, `-n` - Limiter aux N sessions les plus récentes
- `--format` - Format de sortie: table ou json

### Commande: stats

Afficher les statistiques d'utilisation des tokens et les coûts :

```bash
opencode stats
```

**Flags:**
- `--days` - Afficher les statistiques des N derniers jours
- `--tools` - Nombre d'outils à afficher
- `--models` - Afficher la répartition de l'utilisation des modèles
- `--project` - Filtrer par projet

### Commande: export

Exporter les données de session au format JSON :

```bash
opencode export [sessionID]
```

### Commande: import

Importer les données de session depuis un fichier JSON ou une URL de partage OpenCode :

```bash
opencode import <file>
```

**Exemples:**
```bash
opencode import session.json
opencode import https://opncd.ai/s/abc123
```

### Commande: github

Gérer l'agent GitHub pour l'automatisation des dépôts :

```bash
opencode github [command]
```

**Sous-commandes:**
- `install` - Installer l'agent GitHub dans votre dépôt
- `run` - Exécuter l'agent GitHub (typiquement utilisé dans GitHub Actions)

### Commande: upgrade

Mettre à jour opencode vers la dernière version ou une version spécifique :

```bash
opencode upgrade [target]
```

**Exemples:**
```bash
opencode upgrade           # Dernière version
opencode upgrade v0.1.48   # Version spécifique
```

**Flags:**
- `--method`, `-m` - La méthode d'installation utilisée (curl, npm, pnpm, bun, brew)

### Commande: uninstall

Désinstaller OpenCode et supprimer tous les fichiers associés :

```bash
opencode uninstall
```

**Flags:**
- `--keep-config`, `-c` - Conserver les fichiers de configuration
- `--keep-data`, `-d` - Conserver les données de session et snapshots
- `--dry-run` - Afficher ce qui serait supprimé sans supprimer
- `--force`, `-f` - Ignorer les invites de confirmation

### Flags Globaux

- `--help`, `-h` - Afficher l'aide
- `--version`, `-v` - Afficher le numéro de version
- `--print-logs` - Afficher les logs sur stderr
- `--log-level` - Niveau de log (DEBUG, INFO, WARN, ERROR)

### Variables d'Environnement

Variables principales :
- `OPENCODE_CONFIG` - Chemin vers le fichier de configuration
- `OPENCODE_CONFIG_DIR` - Chemin vers le répertoire de configuration
- `OPENCODE_CONFIG_CONTENT` - Contenu de configuration JSON inline
- `OPENCODE_AUTO_SHARE` - Partager automatiquement les sessions
- `OPENCODE_DISABLE_AUTOUPDATE` - Désactiver les mises à jour automatiques
- `OPENCODE_SERVER_PASSWORD` - Activer l'authentification de base pour serve/web
- `OPENCODE_SERVER_USERNAME` - Remplacer le nom d'utilisateur d'authentification de base

Variables expérimentales :
- `OPENCODE_EXPERIMENTAL` - Activer toutes les fonctionnalités expérimentales
- `OPENCODE_EXPERIMENTAL_FILEWATCHER` - Activer le file watcher
- `OPENCODE_EXPERIMENTAL_LSP_TOOL` - Activer l'outil LSP expérimental

---

## Serveur HTTP/API

La commande `opencode serve` exécute un serveur HTTP headless qui expose un endpoint OpenAPI.

### Utilisation

```bash
opencode serve [--port <number>] [--hostname <string>] [--cors <origin>]
```

**Options:**
- `--port` - Port d'écoute (défaut: 4096)
- `--hostname` - Nom d'hôte d'écoute (défaut: 127.0.0.1)
- `--mdns` - Activer la découverte mDNS (défaut: false)
- `--cors` - Origines de navigateur supplémentaires à autoriser

### Authentification

Définissez `OPENCODE_SERVER_PASSWORD` pour protéger le serveur avec l'authentification HTTP basic :

```bash
OPENCODE_SERVER_PASSWORD=your-password opencode serve
```

Le nom d'utilisateur par défaut est `opencode`, ou définissez `OPENCODE_SERVER_USERNAME` pour le remplacer.

### Spécification OpenAPI

Le serveur publie une spécification OpenAPI 3.1 consultable à :

```
http://<hostname>:<port>/doc
```

Exemple : `http://localhost:4096/doc`

### Endpoints API Principaux

#### Global
- `GET /global/health` - Obtenir l'état de santé et la version du serveur
- `GET /global/event` - Obtenir les événements globaux (flux SSE)

#### Project
- `GET /project` - Lister tous les projets
- `GET /project/current` - Obtenir le projet actuel

#### Config
- `GET /config` - Obtenir les informations de configuration
- `PATCH /config` - Mettre à jour la configuration
- `GET /config/providers` - Lister les providers et modèles par défaut

#### Sessions
- `GET /session` - Lister toutes les sessions
- `POST /session` - Créer une nouvelle session
- `GET /session/:id` - Obtenir les détails de la session
- `DELETE /session/:id` - Supprimer une session
- `PATCH /session/:id` - Mettre à jour les propriétés de la session
- `GET /session/:id/children` - Obtenir les sessions enfants
- `POST /session/:id/abort` - Abandonner une session en cours
- `POST /session/:id/share` - Partager une session
- `DELETE /session/:id/share` - Retirer le partage d'une session

#### Messages
- `GET /session/:id/message` - Lister les messages dans une session
- `POST /session/:id/message` - Envoyer un message et attendre la réponse
- `GET /session/:id/message/:messageID` - Obtenir les détails du message
- `POST /session/:id/prompt_async` - Envoyer un message de manière asynchrone
- `POST /session/:id/command` - Exécuter une commande slash
- `POST /session/:id/shell` - Exécuter une commande shell

#### Files
- `GET /find?pattern=<pat>` - Rechercher du texte dans les fichiers
- `GET /find/file?query=<q>` - Trouver des fichiers et répertoires par nom
- `GET /find/symbol?query=<q>` - Trouver des symboles de l'espace de travail
- `GET /file?path=<path>` - Lister les fichiers et répertoires
- `GET /file/content?path=<p>` - Lire un fichier
- `GET /file/status` - Obtenir le statut des fichiers suivis

#### TUI
- `POST /tui/append-prompt` - Ajouter du texte au prompt
- `POST /tui/submit-prompt` - Soumettre le prompt actuel
- `POST /tui/clear-prompt` - Effacer le prompt
- `POST /tui/execute-command` - Exécuter une commande
- `POST /tui/show-toast` - Afficher une notification toast

#### Events
- `GET /event` - Flux d'événements envoyés par le serveur

---

## SDK JavaScript/TypeScript

Le SDK JS/TS d'opencode fournit un client type-safe pour interagir avec le serveur.

### Installation

```bash
npm install @opencode-ai/sdk
```

### Créer un Client

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()
```

#### Options

- `hostname` - Nom d'hôte du serveur (défaut: 127.0.0.1)
- `port` - Port du serveur (défaut: 4096)
- `signal` - Signal d'annulation AbortSignal
- `timeout` - Timeout en ms pour le démarrage du serveur (défaut: 5000)
- `config` - Objet de configuration

### Client seulement

Si vous avez déjà une instance d'opencode en cours d'exécution :

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})
```

### Configuration

Vous pouvez passer un objet de configuration pour personnaliser le comportement :

```typescript
const opencode = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
})
```

### Types

Le SDK inclut des définitions TypeScript pour tous les types d'API :

```typescript
import type { Session, Message, Part } from "@opencode-ai/sdk"
```

### Exemples d'Utilisation

#### Créer et gérer des sessions

```typescript
// Créer une session
const session = await client.session.create({
  body: { title: "Ma session" },
})

// Lister les sessions
const sessions = await client.session.list()
```

#### Envoyer un prompt

```typescript
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { 
      providerID: "anthropic", 
      modelID: "claude-3-5-sonnet-20241022" 
    },
    parts: [{ type: "text", text: "Bonjour!" }],
  },
})
```

#### Injecter du contexte sans réponse IA

```typescript
await client.session.prompt({
  path: { id: session.id },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "Vous êtes un assistant utile." }],
  },
})
```

#### Rechercher et lire des fichiers

```typescript
// Rechercher du texte
const textResults = await client.find.text({
  query: { pattern: "function.*opencode" },
})

// Trouver des fichiers
const files = await client.find.files({
  query: { query: "*.ts", type: "file" },
})

// Lire un fichier
const content = await client.file.read({
  query: { path: "src/index.ts" },
})
```

#### Écouter les événements en temps réel

```typescript
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```

#### Contrôler l'interface TUI

```typescript
// Ajouter au prompt
await client.tui.appendPrompt({
  body: { text: "Ajouter ceci au prompt" },
})

// Afficher une notification toast
await client.tui.showToast({
  body: { 
    message: "Tâche terminée", 
    variant: "success" 
  },
})
```

---

## Providers & Modèles

OpenCode utilise l'[AI SDK](https://ai-sdk.dev/) et [Models.dev](https://models.dev/) pour supporter **75+ providers LLM** et les modèles locaux.

### Configurer un Provider

La plupart des providers populaires sont préchargés par défaut. Pour ajouter un provider :

```bash
/connect
```

### Sélectionner un Modèle

```bash
/models
```

### Modèles Recommandés

Modèles qui fonctionnent bien avec OpenCode (liste non exhaustive) :
- GPT 5.2
- GPT 5.1 Codex
- Claude Opus 4.5
- Claude Sonnet 4.5
- Minimax M2.1
- Gemini 3 Pro

### Définir un Modèle par Défaut

Dans votre configuration OpenCode :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5"
}
```

Le format complet est `provider_id/model_id`. Pour OpenCode Zen : `opencode/gpt-5.1-codex`.

### Configurer des Modèles

Vous pouvez configurer globalement les options d'un modèle :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openai": {
      "models": {
        "gpt-5": {
          "options": {
            "reasoningEffort": "high",
            "textVerbosity": "low"
          }
        }
      }
    },
    "anthropic": {
      "models": {
        "claude-sonnet-4-5": {
          "options": {
            "thinking": {
              "type": "enabled",
              "budgetTokens": 16000
            }
          }
        }
      }
    }
  }
}
```

### Variantes de Modèles

Vous pouvez définir des variantes personnalisées qui étendent les modèles intégrés :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "opencode": {
      "models": {
        "gpt-5": {
          "variants": {
            "high": {
              "reasoningEffort": "high",
              "textVerbosity": "low"
            },
            "low": {
              "reasoningEffort": "low",
              "textVerbosity": "low"
            }
          }
        }
      }
    }
  }
}
```

### Directory des Providers

OpenCode supporte de nombreux providers. Voici quelques exemples :

#### Anthropic

```bash
/connect  # Sélectionner Anthropic
```

Options:
- Claude Pro/Max (authentification OAuth)
- Créer une clé API
- Entrer manuellement une clé API

#### OpenAI

```bash
/connect  # Sélectionner OpenAI
```

Options:
- ChatGPT Plus/Pro (authentification OAuth)
- Entrer manuellement une clé API

#### Google Vertex AI

Nécessite :
- `GOOGLE_CLOUD_PROJECT` - ID du projet Google Cloud
- `VERTEX_LOCATION` - Région pour Vertex AI (défaut: global)
- Authentification via `GOOGLE_APPLICATION_CREDENTIALS` ou gcloud CLI

#### Amazon Bedrock

Supporte plusieurs méthodes d'authentification :
- Clés d'accès AWS
- Profil AWS nommé
- Token bearer Bedrock
- Web Identity Token (EKS IRSA)

Configuration example :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "my-aws-profile"
      }
    }
  }
}
```

#### Modèles Locaux

##### llama.cpp

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama-server (local)",
      "options": {
        "baseURL": "http://127.0.0.1:8080/v1"
      },
      "models": {
        "qwen3-coder:a3b": {
          "name": "Qwen3-Coder: a3b-30b (local)",
          "limit": {
            "context": 128000,
            "output": 65536
          }
        }
      }
    }
  }
}
```

##### Ollama

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "llama2": {
          "name": "Llama 2"
        }
      }
    }
  }
}
```

##### LM Studio

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lmstudio": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LM Studio (local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      },
      "models": {
        "google/gemma-3n-e4b": {
          "name": "Gemma 3n-e4b (local)"
        }
      }
    }
  }
}
```

### Provider Personnalisé

Pour ajouter n'importe quel provider compatible OpenAI :

1. Exécutez `/connect` et sélectionnez **Other**
2. Entrez un ID unique pour le provider
3. Entrez votre clé API
4. Créez ou mettez à jour votre `opencode.json` :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My AI Provider Display Name",
      "options": {
        "baseURL": "https://api.myprovider.com/v1"
      },
      "models": {
        "my-model-name": {
          "name": "My Model Display Name"
        }
      }
    }
  }
}
```

---

## OpenCode Zen

OpenCode Zen est une liste de modèles testés et vérifiés fournie par l'équipe OpenCode.

### Contexte

Il existe un grand nombre de modèles disponibles, mais seuls quelques-uns fonctionnent bien comme agents de codage. De plus, la plupart des providers sont configurés très différemment, donc vous obtenez des performances et une qualité très différentes.

Pour résoudre ce problème :
1. Nous avons testé un groupe sélectionné de modèles
2. Nous avons travaillé avec des providers pour nous assurer qu'ils sont servis correctement
3. Nous avons benchmarké la combinaison modèle/provider

### Comment ça marche

1. Connectez-vous à [OpenCode Zen](https://opencode.ai/auth)
2. Ajoutez vos détails de facturation et copiez votre clé API
3. Exécutez `/connect`, sélectionnez OpenCode Zen, et collez votre clé API
4. Exécutez `/models` pour voir la liste des modèles recommandés

### Endpoints

Modèles disponibles :

| Modèle | Model ID | Endpoint |
|--------|----------|----------|
| GPT 5.2 | gpt-5.2 | https://opencode.ai/zen/v1/responses |
| GPT 5.2 Codex | gpt-5.2-codex | https://opencode.ai/zen/v1/responses |
| Claude Sonnet 4.5 | claude-sonnet-4-5 | https://opencode.ai/zen/v1/messages |
| Claude Haiku 4.5 | claude-haiku-4-5 | https://opencode.ai/zen/v1/messages |
| Claude Opus 4.5 | claude-opus-4-5 | https://opencode.ai/zen/v1/messages |
| Gemini 3 Pro | gemini-3-pro | https://opencode.ai/zen/v1/models/gemini-3-pro |
| Qwen3 Coder 480B | qwen3-coder | https://opencode.ai/zen/v1/chat/completions |
| Kimi K2 | kimi-k2 | https://opencode.ai/zen/v1/chat/completions |

Et plus encore...

### Tarification

Modèle de paiement à l'usage. Prix **par 1M tokens** :

| Modèle | Input | Output | Cached Read |
|--------|-------|--------|-------------|
| Big Pickle | Gratuit | Gratuit | Gratuit |
| Grok Code Fast 1 | Gratuit | Gratuit | Gratuit |
| Claude Sonnet 4.5 (≤ 200K) | $3.00 | $15.00 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| Gemini 3 Flash | $0.50 | $3.00 | $0.05 |
| GPT 5.2 | $1.75 | $14.00 | $0.175 |

### Auto-reload

Si votre solde descend en dessous de 5$, Zen rechargera automatiquement 20$.

### Limites Mensuelles

Vous pouvez définir une limite d'utilisation mensuelle pour l'ensemble de l'espace de travail et pour chaque membre de votre équipe.

### Confidentialité

Tous nos modèles sont hébergés aux États-Unis. Nos providers suivent une politique de rétention zéro et n'utilisent pas vos données pour l'entraînement des modèles, avec les exceptions suivantes :

- Grok Code Fast 1 : pendant sa période gratuite, les données peuvent être utilisées pour améliorer Grok Code
- OpenAI APIs : les requêtes sont conservées pendant 30 jours
- Anthropic APIs : les requêtes sont conservées pendant 30 jours

### Pour les Équipes

Zen fonctionne également très bien pour les équipes :
- Inviter des coéquipiers
- Attribuer des rôles (Admin, Membre)
- Contrôler l'accès aux modèles
- Définir des limites de dépenses mensuelles
- Apporter vos propres clés (BYOK)

---

## Agents

Les agents sont des assistants IA spécialisés qui peuvent être configurés pour des tâches et flux de travail spécifiques.

### Types d'Agents

#### Agents Primaires

Les agents primaires sont les assistants principaux avec lesquels vous interagissez directement. Vous pouvez basculer entre eux en utilisant la touche **Tab**.

**Agents intégrés :**
- **Build** : Agent par défaut avec tous les outils activés
- **Plan** : Agent restreint pour la planification et l'analyse (pas de modifications de fichiers)

#### Sous-Agents

Les sous-agents sont des assistants spécialisés que les agents primaires peuvent invoquer pour des tâches spécifiques. Vous pouvez également les invoquer manuellement en les **@ mentionnant**.

**Sous-agents intégrés :**
- **General** : Agent polyvalent pour la recherche et l'exécution de tâches multi-étapes
- **Explore** : Agent rapide en lecture seule pour explorer les bases de code

### Utilisation

1. **Agents primaires** : Utilisez la touche **Tab** pour basculer entre eux
2. **Sous-agents** : @ mentionnez-les dans vos messages :
   ```
   @general aidez-moi à rechercher cette fonction
   ```
3. **Navigation** : Utilisez `<Leader>+Right/Left` pour naviguer entre parent et enfants

### Configuration

#### Via JSON

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "build": {
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "{file:./prompts/build.txt}",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      }
    },
    "code-reviewer": {
      "description": "Examine le code pour les bonnes pratiques",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "Vous êtes un réviseur de code...",
      "tools": {
        "write": false,
        "edit": false
      }
    }
  }
}
```

#### Via Markdown

Placez les fichiers dans `~/.config/opencode/agents/` ou `.opencode/agents/` :

```markdown
---
description: Examine le code pour la qualité
mode: subagent
model: anthropic/claude-sonnet-4-5
temperature: 0.1
tools:
  write: false
  edit: false
  bash: false
---

Vous êtes en mode révision de code. Concentrez-vous sur :
- La qualité du code et les bonnes pratiques
- Les bugs potentiels et les cas limites
- Les implications en termes de performances
- Les considérations de sécurité
```

### Options de Configuration

#### description
Description de ce que fait l'agent et quand l'utiliser.

```json
{
  "agent": {
    "review": {
      "description": "Examine le code pour les bonnes pratiques"
    }
  }
}
```

#### temperature
Contrôle l'aléatoire et la créativité des réponses du LLM.

```json
{
  "agent": {
    "plan": {
      "temperature": 0.1
    },
    "creative": {
      "temperature": 0.8
    }
  }
}
```

Valeurs typiques :
- **0.0-0.2** : Très ciblé et déterministe
- **0.3-0.5** : Équilibré
- **0.6-1.0** : Plus créatif

#### maxSteps
Limite le nombre maximum d'itérations agentiques.

```json
{
  "agent": {
    "quick-thinker": {
      "maxSteps": 5
    }
  }
}
```

#### disable
Désactiver l'agent.

```json
{
  "agent": {
    "review": {
      "disable": true
    }
  }
}
```

#### prompt
Fichier de prompt système personnalisé.

```json
{
  "agent": {
    "review": {
      "prompt": "{file:./prompts/code-review.txt}"
    }
  }
}
```

#### model
Remplacer le modèle pour cet agent.

```json
{
  "agent": {
    "plan": {
      "model": "anthropic/claude-haiku-4-5"
    }
  }
}
```

#### tools
Contrôler quels outils sont disponibles.

```json
{
  "agent": {
    "plan": {
      "tools": {
        "write": false,
        "bash": false,
        "mymcp_*": false
      }
    }
  }
}
```

#### permission
Configurer les permissions pour gérer les actions.

```json
{
  "agent": {
    "build": {
      "permission": {
        "edit": "ask",
        "bash": {
          "*": "ask",
          "git status": "allow"
        }
      }
    }
  }
}
```

#### mode
Contrôler le mode de l'agent : `primary`, `subagent`, ou `all`.

```json
{
  "agent": {
    "review": {
      "mode": "subagent"
    }
  }
}
```

#### hidden
Masquer un sous-agent du menu d'autocomplétion `@`.

```json
{
  "agent": {
    "internal-helper": {
      "mode": "subagent",
      "hidden": true
    }
  }
}
```

#### Permissions de Tâches
Contrôler quels sous-agents un agent peut invoquer via l'outil Task.

```json
{
  "agent": {
    "orchestrator": {
      "mode": "primary",
      "permission": {
        "task": {
          "*": "deny",
          "orchestrator-*": "allow",
          "code-reviewer": "ask"
        }
      }
    }
  }
}
```

### Créer des Agents

```bash
opencode agent create
```

Cette commande interactive va :
1. Demander où sauvegarder l'agent (global ou spécifique au projet)
2. Description de ce que l'agent doit faire
3. Générer un prompt système approprié et un identifiant
4. Vous permettre de sélectionner les outils auxquels l'agent peut accéder
5. Créer un fichier markdown avec la configuration de l'agent

### Exemples d'Agents

#### Agent de Documentation

```markdown
---
description: Rédige et maintient la documentation du projet
mode: subagent
tools:
  bash: false
---

Vous êtes un rédacteur technique. Créez une documentation claire et complète.
Concentrez-vous sur :
- Des explications claires
- Une structure appropriée
- Des exemples de code
- Un langage convivial
```

#### Auditeur de Sécurité

```markdown
---
description: Effectue des audits de sécurité
mode: subagent
tools:
  write: false
  edit: false
---

Vous êtes un expert en sécurité. Concentrez-vous sur l'identification des problèmes de sécurité potentiels :
- Vulnérabilités de validation des entrées
- Failles d'authentification et d'autorisation
- Risques d'exposition des données
- Vulnérabilités des dépendances
```

---

## Outils (Tools)

Les outils permettent au LLM d'effectuer des actions dans votre base de code.

### Configuration

Utilisez le champ `permission` pour contrôler le comportement des outils :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "edit": "deny",
    "bash": "ask",
    "webfetch": "allow"
  }
}
```

Vous pouvez également utiliser des wildcards :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "mymcp_*": "ask"
  }
}
```

### Outils Intégrés

#### bash
Exécuter des commandes shell dans votre environnement de projet.

```json
{
  "permission": {
    "bash": "allow"
  }
}
```

#### edit
Modifier des fichiers existants en utilisant des remplacements de chaînes exacts.

```json
{
  "permission": {
    "edit": "allow"
  }
}
```

#### write
Créer de nouveaux fichiers ou écraser des fichiers existants.

```json
{
  "permission": {
    "write": "allow"
  }
}
```

#### read
Lire le contenu des fichiers depuis votre base de code.

```json
{
  "permission": {
    "read": "allow"
  }
}
```

#### grep
Rechercher le contenu des fichiers en utilisant des expressions régulières.

```json
{
  "permission": {
    "grep": "allow"
  }
}
```

#### glob
Trouver des fichiers par correspondance de motifs.

```json
{
  "permission": {
    "glob": "allow"
  }
}
```

#### list
Lister les fichiers et répertoires dans un chemin donné.

```json
{
  "permission": {
    "list": "allow"
  }
}
```

#### lsp (expérimental)
Interagir avec vos serveurs LSP configurés.

```json
{
  "permission": {
    "lsp": "allow"
  }
}
```

Opérations supportées : `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol`, etc.

#### patch
Appliquer des patches aux fichiers.

```json
{
  "permission": {
    "patch": "allow"
  }
}
```

#### skill
Charger une compétence (fichier `SKILL.md`).

```json
{
  "permission": {
    "skill": "allow"
  }
}
```

#### todowrite / todoread
Gérer les listes de tâches pendant les sessions de codage.

```json
{
  "permission": {
    "todowrite": "allow",
    "todoread": "allow"
  }
}
```

#### webfetch
Récupérer du contenu web.

```json
{
  "permission": {
    "webfetch": "allow"
  }
}
```

#### question
Poser des questions à l'utilisateur pendant l'exécution.

```json
{
  "permission": {
    "question": "allow"
  }
}
```

### Patterns d'Ignore

Internement, les outils comme `grep`, `glob` et `list` utilisent [ripgrep](https://github.com/BurntSushi/ripgrep). Par défaut, ripgrep respecte les patterns `.gitignore`.

Pour inclure des fichiers normalement ignorés, créez un fichier `.ignore` à la racine du projet :

```
!node_modules/
!dist/
!build/
```

---

## Outils Personnalisés

Les outils personnalisés sont des fonctions que vous créez et que le LLM peut appeler.

### Créer un Outil

Les outils sont définis comme des fichiers **TypeScript** ou **JavaScript**.

#### Emplacement

- Localement : `.opencode/tools/`
- Globalement : `~/.config/opencode/tools/`

#### Structure

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Interroger la base de données du projet",
  args: {
    query: tool.schema.string().describe("Requête SQL à exécuter"),
  },
  async execute(args) {
    // Votre logique de base de données ici
    return `Requête exécutée : ${args.query}`
  },
})
```

Le **nom de fichier** devient le **nom de l'outil**. L'exemple ci-dessus crée un outil `database`.

#### Outils Multiples par Fichier

```typescript
import { tool } from "@opencode-ai/plugin"

export const add = tool({
  description: "Additionner deux nombres",
  args: {
    a: tool.schema.number().describe("Premier nombre"),
    b: tool.schema.number().describe("Deuxième nombre"),
  },
  async execute(args) {
    return args.a + args.b
  },
})

export const multiply = tool({
  description: "Multiplier deux nombres",
  args: {
    a: tool.schema.number().describe("Premier nombre"),
    b: tool.schema.number().describe("Deuxième nombre"),
  },
  async execute(args) {
    return args.a * args.b
  },
})
```

Cela crée deux outils : `math_add` et `math_multiply`.

### Arguments

Utilisez `tool.schema` (qui est [Zod](https://zod.dev/)) pour définir les types d'arguments :

```typescript
args: {
  query: tool.schema.string().describe("Requête SQL à exécuter")
}
```

### Contexte

Les outils reçoivent un contexte sur la session actuelle :

```typescript
async execute(args, context) {
  const { agent, sessionID, messageID } = context
  return `Agent: ${agent}, Session: ${sessionID}`
}
```

### Exemples

#### Outil en Python

Créez le script Python (`add.py`) :

```python
import sys
a = int(sys.argv[1])
b = int(sys.argv[2])
print(a + b)
```

Créez la définition de l'outil :

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Additionner deux nombres en utilisant Python",
  args: {
    a: tool.schema.number().describe("Premier nombre"),
    b: tool.schema.number().describe("Deuxième nombre"),
  },
  async execute(args) {
    const result = await Bun.$`python3 .opencode/tools/add.py ${args.a} ${args.b}`.text()
    return result.trim()
  },
})
```

---

## Plugins

Les plugins vous permettent d'étendre OpenCode en vous connectant à divers événements et en personnalisant le comportement.

### Utiliser un Plugin

#### Depuis des fichiers locaux

Placez des fichiers JavaScript ou TypeScript dans :
- `.opencode/plugins/` - Plugins au niveau du projet
- `~/.config/opencode/plugins/` - Plugins globaux

#### Depuis npm

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-helicone-session",
    "opencode-wakatime",
    "@my-org/custom-plugin"
  ]
}
```

### Créer un Plugin

Un plugin est un **module JavaScript/TypeScript** qui exporte une ou plusieurs fonctions de plugin.

#### Structure de Base

```typescript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  console.log("Plugin initialisé!")
  
  return {
    // Implémentations des hooks ici
  }
}
```

Le plugin reçoit :
- `project` - Informations sur le projet actuel
- `directory` - Répertoire de travail actuel
- `worktree` - Chemin du worktree git
- `client` - Client SDK opencode
- `$` - [API shell de Bun](https://bun.com/docs/runtime/shell)

#### Support TypeScript

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // Implémentations des hooks type-safe
  }
}
```

### Dépendances

Les plugins locaux peuvent utiliser des packages npm externes. Ajoutez un `package.json` à votre répertoire de configuration :

```json
{
  "dependencies": {
    "shescape": "^2.1.0"
  }
}
```

OpenCode exécute `bun install` au démarrage. Vos plugins peuvent alors les importer :

```typescript
import { escape } from "shescape"

export const MyPlugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        output.args.command = escape(output.args.command)
      }
    },
  }
}
```

### Événements

#### Événements de Commande
- `command.executed`

#### Événements de Fichiers
- `file.edited`
- `file.watcher.updated`

#### Événements LSP
- `lsp.client.diagnostics`
- `lsp.updated`

#### Événements de Messages
- `message.part.removed`
- `message.part.updated`
- `message.removed`
- `message.updated`

#### Événements de Permission
- `permission.replied`
- `permission.updated`

#### Événements de Session
- `session.created`
- `session.compacted`
- `session.deleted`
- `session.diff`
- `session.error`
- `session.idle`
- `session.status`
- `session.updated`

#### Événements d'Outils
- `tool.execute.after`
- `tool.execute.before`

#### Événements TUI
- `tui.prompt.append`
- `tui.command.execute`
- `tui.toast.show`

### Exemples

#### Envoyer des Notifications

```typescript
export const NotificationPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`osascript -e 'display notification "Session terminée!" with title "opencode"'`
      }
    },
  }
}
```

#### Protection .env

```typescript
export const EnvProtection = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read" && output.args.filePath.includes(".env")) {
        throw new Error("Ne pas lire les fichiers .env")
      }
    },
  }
}
```

#### Outils Personnalisés

```typescript
import { type Plugin, tool } from "@opencode-ai/plugin"

export const CustomToolsPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      mytool: tool({
        description: "Ceci est un outil personnalisé",
        args: {
          foo: tool.schema.string(),
        },
        async execute(args, ctx) {
          return `Bonjour ${args.foo}!`
        },
      }),
    },
  }
}
```

#### Logging

Utilisez `client.app.log()` au lieu de `console.log` :

```typescript
export const MyPlugin = async ({ client }) => {
  await client.app.log({
    service: "my-plugin",
    level: "info",
    message: "Plugin initialisé",
    extra: { foo: "bar" },
  })
}
```

Niveaux : `debug`, `info`, `warn`, `error`.

#### Hooks de Compaction

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const CompactionPlugin: Plugin = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      output.context.push(`## Contexte Personnalisé
Inclure tout état qui doit persister à travers la compaction :
- Statut de la tâche actuelle
- Décisions importantes prises
- Fichiers en cours de travail`)
    },
  }
}
```

---

## Serveurs MCP

Vous pouvez ajouter des outils externes à OpenCode en utilisant le _Model Context Protocol_ (MCP).

### Activer

Définissez les serveurs MCP dans votre config OpenCode sous `mcp` :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "nom-du-serveur-mcp": {
      "enabled": true
    }
  }
}
```

### Local

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-local-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-command"],
      "enabled": true,
      "environment": {
        "MY_ENV_VAR": "my_env_var_value"
      }
    }
  }
}
```

#### Options

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| `type` | String | Oui | `"local"` |
| `command` | Array | Oui | Commande et arguments |
| `environment` | Object | Non | Variables d'environnement |
| `enabled` | Boolean | Non | Activer ou désactiver |
| `timeout` | Number | Non | Timeout en ms (défaut: 5000) |

### Remote

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-remote-mcp": {
      "type": "remote",
      "url": "https://my-mcp-server.com",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer MY_API_KEY"
      }
    }
  }
}
```

#### Options

| Option | Type | Requis | Description |
|--------|------|--------|-------------|
| `type` | String | Oui | `"remote"` |
| `url` | String | Oui | URL du serveur MCP |
| `enabled` | Boolean | Non | Activer ou désactiver |
| `headers` | Object | Non | En-têtes à envoyer |
| `oauth` | Object | Non | Configuration OAuth |
| `timeout` | Number | Non | Timeout en ms (défaut: 5000) |

### OAuth

OpenCode gère automatiquement l'authentification OAuth pour les serveurs MCP distants.

#### Automatique

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-oauth-server": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

#### Pré-enregistré

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-oauth-server": {
      "type": "remote",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "clientId": "{env:MY_MCP_CLIENT_ID}",
        "clientSecret": "{env:MY_MCP_CLIENT_SECRET}",
        "scope": "tools:read tools:execute"
      }
    }
  }
}
```

#### Authentification

```bash
# S'authentifier avec un serveur
opencode mcp auth my-oauth-server

# Lister tous les serveurs et leur statut d'authentification
opencode mcp list

# Supprimer les credentials
opencode mcp logout my-oauth-server

# Déboguer les problèmes de connexion
opencode mcp debug my-oauth-server
```

### Gérer

#### Global

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-mcp-foo": {
      "type": "local",
      "command": ["bun", "x", "my-mcp-command-foo"]
    }
  },
  "tools": {
    "my-mcp-foo": false
  }
}
```

Ou avec un pattern glob :

```json
{
  "tools": {
    "my-mcp*": false
  }
}
```

#### Par Agent

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-mcp": {
      "type": "local",
      "command": ["bun", "x", "my-mcp-command"],
      "enabled": true
    }
  },
  "tools": {
    "my-mcp*": false
  },
  "agent": {
    "my-agent": {
      "tools": {
        "my-mcp*": true
      }
    }
  }
}
```

### Exemples

#### Sentry

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sentry": {
      "type": "remote",
      "url": "https://mcp.sentry.dev/mcp",
      "oauth": {}
    }
  }
}
```

Authentification :

```bash
opencode mcp auth sentry
```

Utilisation :

```
Montrez-moi les derniers problèmes non résolus dans mon projet. utiliser sentry
```

#### Context7

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

Avec clé API :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

#### Grep by Vercel

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gh_grep": {
      "type": "remote",
      "url": "https://mcp.grep.app"
    }
  }
}
```

---

## Serveurs LSP

OpenCode s'intègre avec vos serveurs LSP (Language Server Protocol).

### Intégrés

OpenCode inclut plusieurs serveurs LSP intégrés pour les langages populaires :

| Serveur LSP | Extensions | Prérequis |
|-------------|------------|-----------|
| astro | .astro | Auto-installation pour projets Astro |
| bash | .sh, .bash, .zsh | Auto-installation bash-language-server |
| typescript | .ts, .tsx, .js, .jsx | Dépendance `typescript` dans le projet |
| rust | .rs | `rust-analyzer` disponible |
| python (pyright) | .py, .pyi | Dépendance `pyright` installée |
| go (gopls) | .go | Commande `go` disponible |
| java (jdtls) | .java | Java SDK (version 21+) installé |
| php (intelephense) | .php | Auto-installation |
| vue | .vue | Auto-installation pour projets Vue |
| svelte | .svelte | Auto-installation pour projets Svelte |
| yaml | .yaml, .yml | Auto-installation Red Hat yaml-language-server |

Et plus encore...

### Fonctionnement

Quand opencode ouvre un fichier :
1. Vérifie l'extension du fichier contre tous les serveurs LSP activés
2. Démarre le serveur LSP approprié s'il n'est pas déjà en cours d'exécution

### Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": {}
}
```

Chaque serveur LSP supporte :

| Propriété | Type | Description |
|-----------|------|-------------|
| `disabled` | boolean | Désactiver le serveur LSP |
| `command` | string[] | Commande pour démarrer le serveur |
| `extensions` | string[] | Extensions de fichiers |
| `env` | object | Variables d'environnement |
| `initialization` | object | Options d'initialisation |

### Désactiver les Serveurs LSP

Désactiver **tous** les serveurs LSP :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": false
}
```

Désactiver un **serveur spécifique** :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": {
    "typescript": {
      "disabled": true
    }
  }
}
```

### Serveurs LSP Personnalisés

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": {
    "custom-lsp": {
      "command": ["custom-lsp-server", "--stdio"],
      "extensions": [".custom"]
    }
  }
}
```

### Informations Supplémentaires

#### PHP Intelephense

Vous pouvez fournir une clé de licence en plaçant (uniquement) la clé dans un fichier texte à :
- macOS/Linux : `$HOME/intelephense/licence.txt`
- Windows : `%USERPROFILE%/intelephense/licence.txt`

---

## Compétences (Skills)

Les compétences d'agent permettent à OpenCode de découvrir des instructions réutilisables.

### Placer les Fichiers

Créez un dossier par nom de compétence avec un `SKILL.md` à l'intérieur :

- Config projet : `.opencode/skills/<name>/SKILL.md`
- Config global : `~/.config/opencode/skills/<name>/SKILL.md`
- Claude-compatible projet : `.claude/skills/<name>/SKILL.md`
- Claude-compatible global : `~/.claude/skills/<name>/SKILL.md`

### Frontmatter

Chaque `SKILL.md` doit commencer par du frontmatter YAML :

```markdown
---
name: git-release
description: Créer des releases et changelogs cohérents
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github
---

## Ce que je fais
- Rédiger les notes de release à partir des PRs mergés
- Proposer un bump de version
- Fournir une commande `gh release create` copiable-collable

## Quand m'utiliser
Utilisez-moi lors de la préparation d'une release taguée.
```

Champs reconnus :
- `name` (requis)
- `description` (requis)
- `license` (optionnel)
- `compatibility` (optionnel)
- `metadata` (optionnel)

### Règles de Nommage

Le `name` doit :
- Être de 1-64 caractères
- Être en minuscules alphanumériques avec des séparateurs de tirets simples
- Ne pas commencer ou finir par `-`
- Ne pas contenir `--` consécutifs
- Correspondre au nom du répertoire

Regex équivalent : `^[a-z0-9]+(-[a-z0-9]+)*$`

### Description de l'Outil

OpenCode liste les compétences disponibles dans la description de l'outil `skill` :

```xml
<available_skills>
  <skill>
    <name>git-release</name>
    <description>Créer des releases et changelogs cohérents</description>
  </skill>
</available_skills>
```

L'agent charge une compétence en appelant l'outil :

```typescript
skill({ name: "git-release" })
```

### Configurer les Permissions

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "pr-review": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

| Permission | Comportement |
|------------|--------------|
| `allow` | Compétence se charge immédiatement |
| `deny` | Compétence masquée de l'agent |
| `ask` | Utilisateur invité à approuver |

### Remplacer par Agent

**Pour les agents personnalisés** (dans le frontmatter de l'agent) :

```markdown
---
permission:
  skill:
    "documents-*": "allow"
---
```

**Pour les agents intégrés** (dans `opencode.json`) :

```json
{
  "agent": {
    "plan": {
      "permission": {
        "skill": {
          "internal-*": "allow"
        }
      }
    }
  }
}
```

### Désactiver l'Outil Skill

**Pour les agents personnalisés** :

```markdown
---
tools:
  skill: false
---
```

**Pour les agents intégrés** :

```json
{
  "agent": {
    "plan": {
      "tools": {
        "skill": false
      }
    }
  }
}
```

---

## Règles & Instructions

Vous pouvez fournir des instructions personnalisées à opencode en créant un fichier `AGENTS.md`.

### Initialiser

Pour créer un nouveau fichier `AGENTS.md` :

```bash
/init
```

Cela scannera votre projet et générera un fichier `AGENTS.md`.

### Exemple

```markdown
# Projet Monorepo SST v3

Ceci est un monorepo SST v3 avec TypeScript.

## Structure du Projet
- `packages/` - Contient tous les packages de l'espace de travail
- `infra/` - Définitions d'infrastructure divisées par service
- `sst.config.ts` - Configuration SST principale

## Standards de Code
- Utiliser TypeScript avec mode strict activé
- Le code partagé va dans `packages/core/`
- Les fonctions vont dans `packages/functions/`

## Conventions Monorepo
- Importer les modules partagés : `@my-app/core/example`
```

### Types

#### Projet

Placez un `AGENTS.md` à la racine de votre projet pour les règles spécifiques au projet.

#### Global

Règles globales dans `~/.config/opencode/AGENTS.md`.

#### Compatibilité Claude Code

Pour les utilisateurs migrant depuis Claude Code :
- **Règles projet** : `CLAUDE.md` (utilisé si pas d'`AGENTS.md`)
- **Règles globales** : `~/.claude/CLAUDE.md` (utilisé si pas de `~/.config/opencode/AGENTS.md`)
- **Compétences** : `~/.claude/skills/`

Désactiver la compatibilité :

```bash
export OPENCODE_DISABLE_CLAUDE_CODE=1
export OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1
export OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1
```

### Précédence

1. **Fichiers locaux** (en remontant depuis le répertoire actuel)
2. **Fichier global** à `~/.config/opencode/AGENTS.md`
3. **Fichier Claude Code** à `~/.claude/CLAUDE.md` (sauf si désactivé)

### Instructions Personnalisées

Dans `opencode.json` ou `~/.config/opencode/opencode.json` :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md"
  ]
}
```

Vous pouvez également utiliser des URLs distantes :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "https://raw.githubusercontent.com/my-org/shared-rules/main/style.md"
  ]
}
```

### Référencer des Fichiers Externes

#### Via opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "docs/development-standards.md",
    "test/testing-guidelines.md",
    "packages/*/AGENTS.md"
  ]
}
```

#### Instructions Manuelles dans AGENTS.md

```markdown
# Règles de Projet TypeScript

## Chargement de Fichiers Externes

CRITIQUE : Quand vous rencontrez une référence de fichier (ex: @rules/general.md), 
utilisez votre outil Read pour le charger au besoin.

Instructions :
- Ne PAS charger toutes les références de manière préventive
- Quand chargé, traiter le contenu comme instructions obligatoires
- Suivre les références récursivement si nécessaire

## Directives de Développement
Pour le style de code TypeScript : @docs/typescript-guidelines.md
Pour l'architecture des composants React : @docs/react-patterns.md
```

---

## Commandes Personnalisées

Les commandes personnalisées vous permettent de spécifier un prompt à exécuter.

```bash
/my-command
```

### Créer des Fichiers de Commande

Créez `.opencode/commands/test.md` :

```markdown
---
description: Exécuter les tests avec couverture
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---

Exécutez la suite de tests complète avec rapport de couverture.
Concentrez-vous sur les tests échouant et suggérez des corrections.
```

Utilisez la commande :

```bash
/test
```

### Configuration

#### JSON

```json
{
  "$schema": "https://opencode.ai/config.json",
  "command": {
    "test": {
      "template": "Exécuter la suite de tests...",
      "description": "Exécuter les tests avec couverture",
      "agent": "build",
      "model": "anthropic/claude-3-5-sonnet-20241022"
    }
  }
}
```

#### Markdown

Placez dans `~/.config/opencode/commands/` ou `.opencode/commands/` :

```markdown
---
description: Exécuter les tests avec couverture
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---

Exécutez la suite de tests complète avec rapport de couverture.
```

### Configuration du Prompt

#### Arguments

Passer des arguments avec le placeholder `$ARGUMENTS` :

```markdown
---
description: Créer un nouveau composant
---

Créez un nouveau composant React nommé $ARGUMENTS avec support TypeScript.
```

Exécution :

```bash
/component Button
```

Arguments positionnels :
- `$1` - Premier argument
- `$2` - Deuxième argument
- `$3` - Troisième argument

#### Sortie Shell

Utiliser _!`command`_ pour injecter la sortie de commande bash :

```markdown
---
description: Analyser la couverture de test
---

Voici les résultats de test actuels :
!`npm test`

Suggérez des améliorations pour augmenter la couverture.
```

#### Références de Fichiers

Inclure des fichiers avec `@` :

```markdown
---
description: Examiner le composant
---

Examinez le composant dans @src/components/Button.tsx.
Vérifiez les problèmes de performance et suggérez des améliorations.
```

### Options

#### template
Le prompt envoyé au LLM (requis).

```json
{
  "command": {
    "test": {
      "template": "Exécutez la suite de tests..."
    }
  }
}
```

#### description
Brève description de ce que fait la commande.

```json
{
  "command": {
    "test": {
      "description": "Exécuter les tests avec couverture"
    }
  }
}
```

#### agent
Spécifier quel agent doit exécuter cette commande.

```json
{
  "command": {
    "review": {
      "agent": "plan"
    }
  }
}
```

#### subtask
Forcer la commande à déclencher une invocation de sous-agent.

```json
{
  "command": {
    "analyze": {
      "subtask": true
    }
  }
}
```

#### model
Remplacer le modèle par défaut pour cette commande.

```json
{
  "command": {
    "analyze": {
      "model": "anthropic/claude-3-5-sonnet-20241022"
    }
  }
}
```

---

## Formatters

OpenCode utilise des formatters spécifiques aux langages.

### Intégrés

| Formatter | Extensions | Prérequis |
|-----------|------------|-----------|
| gofmt | .go | `gofmt` disponible |
| prettier | .js, .jsx, .ts, .tsx, .html, .css, .md, .json | Dépendance `prettier` dans package.json |
| biome | .js, .jsx, .ts, .tsx, .html, .css | Fichier config `biome.json(c)` |
| ruff | .py, .pyi | `ruff` disponible avec config |
| rustfmt | .rs | `rustfmt` disponible |
| rubocop | .rb, .rake, .gemspec | `rubocop` disponible |
| dart | .dart | `dart` disponible |
| terraform | .tf, .tfvars | `terraform` disponible |
| shfmt | .sh, .bash | `shfmt` disponible |
| nixfmt | .nix | `nixfmt` disponible |

### Fonctionnement

Quand OpenCode écrit ou modifie un fichier :
1. Vérifie l'extension du fichier contre tous les formatters activés
2. Exécute la commande du formatter approprié
3. Applique automatiquement les modifications de formatage

### Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "formatter": {}
}
```

Chaque formatter supporte :

| Propriété | Type | Description |
|-----------|------|-------------|
| `disabled` | boolean | Désactiver le formatter |
| `command` | string[] | Commande à exécuter |
| `environment` | object | Variables d'environnement |
| `extensions` | string[] | Extensions de fichiers |

### Désactiver les Formatters

Désactiver **tous** les formatters :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "formatter": false
}
```

Désactiver un **formatter spécifique** :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "formatter": {
    "prettier": {
      "disabled": true
    }
  }
}
```

### Formatters Personnalisés

```json
{
  "$schema": "https://opencode.ai/config.json",
  "formatter": {
    "prettier": {
      "command": ["npx", "prettier", "--write", "$FILE"],
      "environment": {
        "NODE_ENV": "development"
      },
      "extensions": [".js", ".ts", ".jsx", ".tsx"]
    },
    "custom-markdown-formatter": {
      "command": ["deno", "fmt", "$FILE"],
      "extensions": [".md"]
    }
  }
}
```

Le placeholder **`$FILE`** sera remplacé par le chemin du fichier à formater.

---

## Permissions

Contrôlez quelles actions nécessitent une approbation pour s'exécuter.

### Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "*": "ask",
    "bash": "allow",
    "edit": "deny"
  }
}
```

Ou définir toutes les permissions en une fois :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": "allow"
}
```

### Règles Granulaires (Syntaxe Objet)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": {
      "*": "ask",
      "git *": "allow",
      "npm *": "allow",
      "rm *": "deny",
      "grep *": "allow"
    },
    "edit": {
      "*": "deny",
      "packages/web/src/content/docs/*.mdx": "allow"
    }
  }
}
```

Les règles sont évaluées par correspondance de motif, la **dernière règle correspondante gagne**.

### Wildcards

Les patterns de permissions utilisent des wildcards simples :
- `*` correspond à zéro ou plusieurs caractères
- `?` correspond exactement à un caractère
- Tous les autres caractères correspondent littéralement

### Expansion du Répertoire Home

Vous pouvez utiliser `~` ou `$HOME` au début d'un pattern :
- `~/projects/*` → `/Users/username/projects/*`
- `$HOME/projects/*` → `/Users/username/projects/*`

### Permissions Disponibles

- `read` - Lecture d'un fichier (correspond au chemin du fichier)
- `edit` - Toutes les modifications de fichiers
- `glob` - Globbing de fichiers (correspond au pattern glob)
- `grep` - Recherche de contenu (correspond au pattern regex)
- `list` - Listage des fichiers dans un répertoire
- `bash` - Exécution de commandes shell
- `task` - Lancement de sous-agents
- `skill` - Chargement d'une compétence
- `lsp` - Exécution de requêtes LSP
- `todoread`, `todowrite` - Lecture/mise à jour de la liste de tâches
- `webfetch` - Récupération d'une URL
- `websearch`, `codesearch` - Recherche web/code
- `external_directory` - Déclenché quand un outil touche des chemins hors du répertoire de travail
- `doom_loop` - Déclenché quand le même appel d'outil se répète 3 fois avec une entrée identique

### Valeurs par Défaut

Si vous ne spécifiez rien :
- La plupart des permissions sont en `"allow"`
- `doom_loop` et `external_directory` sont en `"ask"`
- `read` est `"allow"`, mais les fichiers `.env` sont refusés par défaut :

```json
{
  "permission": {
    "read": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny",
      "*.env.example": "allow"
    }
  }
}
```

### Fonctionnement de Ask

Quand OpenCode demande l'approbation, l'interface propose trois résultats :
- `once` - Approuver juste cette requête
- `always` - Approuver les futures requêtes correspondant aux patterns suggérés
- `reject` - Refuser la requête

### Agents

Vous pouvez remplacer les permissions par agent :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": {
      "*": "ask",
      "git *": "allow",
      "git commit *": "deny",
      "git push *": "deny"
    }
  },
  "agent": {
    "build": {
      "permission": {
        "bash": {
          "*": "ask",
          "git *": "allow",
          "git commit *": "ask",
          "git push *": "deny"
        }
      }
    }
  }
}
```

En Markdown :

```markdown
---
description: Révision de code sans modifications
mode: subagent
permission:
  edit: deny
  bash: ask
  webfetch: deny
---

Analysez uniquement le code et suggérez des modifications.
```

---

## Thèmes

OpenCode propose plusieurs thèmes intégrés et prend en charge les thèmes personnalisés.

### Prérequis du Terminal

Pour que les thèmes s'affichent correctement, votre terminal doit supporter **truecolor** (couleur 24-bit) :

- **Vérifier le support** : Exécutez `echo $COLORTERM` - devrait afficher `truecolor` ou `24bit`
- **Activer truecolor** : Définissez `COLORTERM=truecolor` dans votre profil shell
- **Compatibilité du terminal** : La plupart des terminaux modernes supportent la couleur 24-bit

### Thèmes Intégrés

| Nom | Description |
|-----|-------------|
| `system` | S'adapte à la couleur d'arrière-plan de votre terminal |
| `tokyonight` | Basé sur le thème Tokyonight |
| `everforest` | Basé sur le thème Everforest |
| `ayu` | Basé sur le thème Ayu dark |
| `catppuccin` | Basé sur le thème Catppuccin |
| `gruvbox` | Basé sur le thème Gruvbox |
| `kanagawa` | Basé sur le thème Kanagawa |
| `nord` | Basé sur le thème Nord |
| `matrix` | Style hacker vert sur noir |
| `one-dark` | Basé sur le thème Atom One Dark |

### Thème System

Le thème `system` est conçu pour s'adapter automatiquement au schéma de couleurs de votre terminal :
- **Génère une échelle de gris** basée sur la couleur d'arrière-plan
- **Utilise les couleurs ANSI** (0-15) pour la coloration syntaxique
- **Préserve les valeurs par défaut du terminal**

### Utiliser un Thème

Sélectionnez un thème avec la commande `/theme` ou spécifiez-le dans votre config :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "tokyonight"
}
```

### Thèmes Personnalisés

#### Hiérarchie

Les thèmes sont chargés depuis plusieurs répertoires :
1. **Thèmes intégrés** - Embarqués dans le binaire
2. **Répertoire de config utilisateur** - `~/.config/opencode/themes/*.json`
3. **Répertoire racine du projet** - `<project-root>/.opencode/themes/*.json`
4. **Répertoire de travail actuel** - `./.opencode/themes/*.json`

#### Créer un Thème

Pour les thèmes au niveau utilisateur :

```bash
mkdir -p ~/.config/opencode/themes
vim ~/.config/opencode/themes/my-theme.json
```

Pour les thèmes spécifiques au projet :

```bash
mkdir -p .opencode/themes
vim .opencode/themes/my-theme.json
```

#### Format JSON

Les thèmes utilisent un format JSON flexible avec support pour :
- **Couleurs hex** : `"#ffffff"`
- **Couleurs ANSI** : `3` (0-255)
- **Références de couleur** : `"primary"` ou définitions personnalisées
- **Variantes dark/light** : `{"dark": "#000", "light": "#fff"}`
- **Pas de couleur** : `"none"` - Utilise la couleur par défaut du terminal

#### Définitions de Couleurs

La section `defs` est optionnelle et permet de définir des couleurs réutilisables :

```json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "nord0": "#2E3440",
    "nord1": "#3B4252",
    "nord4": "#D8DEE9"
  },
  "theme": {
    "primary": {
      "dark": "nord4",
      "light": "nord0"
    }
  }
}
```

#### Valeurs par Défaut du Terminal

La valeur spéciale `"none"` hérite de la couleur par défaut du terminal :
- `"text": "none"` - Utilise la couleur de premier plan par défaut
- `"background": "none"` - Utilise la couleur d'arrière-plan par défaut

#### Exemple

Voici un exemple de thème personnalisé basé sur Nord :

```json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "nord0": "#2E3440",
    "nord1": "#3B4252",
    "nord2": "#434C5E",
    "nord3": "#4C566A",
    "nord4": "#D8DEE9",
    "nord7": "#8FBCBB",
    "nord8": "#88C0D0",
    "nord9": "#81A1C1",
    "nord10": "#5E81AC",
    "nord11": "#BF616A",
    "nord14": "#A3BE8C"
  },
  "theme": {
    "primary": {
      "dark": "nord8",
      "light": "nord10"
    },
    "text": {
      "dark": "nord4",
      "light": "nord0"
    },
    "background": {
      "dark": "nord0",
      "light": "nord6"
    },
    "error": {
      "dark": "nord11",
      "light": "nord11"
    },
    "success": {
      "dark": "nord14",
      "light": "nord14"
    }
  }
}
```

---

## Raccourcis Clavier

OpenCode utilise `ctrl+x` comme touche leader par défaut.

### Configuration

Personnalisez les raccourcis via votre config OpenCode :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "keybinds": {
    "leader": "ctrl+x",
    "app_exit": "ctrl+c,ctrl+d,<leader>q",
    "editor_open": "<leader>e",
    "theme_list": "<leader>t",
    "session_new": "<leader>n",
    "session_list": "<leader>l"
  }
}
```

### Raccourcis Par Défaut

| Action | Raccourci | Description |
|--------|-----------|-------------|
| `app_exit` | ctrl+c, ctrl+d, `<leader>q` | Quitter OpenCode |
| `editor_open` | `<leader>e` | Ouvrir l'éditeur externe |
| `theme_list` | `<leader>t` | Lister les thèmes |
| `session_new` | `<leader>n` | Nouvelle session |
| `session_list` | `<leader>l` | Lister les sessions |
| `session_compact` | `<leader>c` | Compacter la session |
| `messages_undo` | `<leader>u` | Annuler le dernier message |
| `messages_redo` | `<leader>r` | Refaire le message annulé |
| `model_list` | `<leader>m` | Lister les modèles |
| `model_cycle_recent` | F2 | Cycler entre les modèles récents |
| `agent_cycle` | Tab | Cycler entre les agents |
| `variant_cycle` | ctrl+t | Cycler entre les variantes |
| `input_submit` | Enter | Soumettre l'entrée |
| `input_newline` | Shift+Enter | Nouvelle ligne |
| `input_clear` | ctrl+c | Effacer l'entrée |

### Format de Définition

Les keybinds peuvent être :
- Une seule touche : `"return"`
- Combinaison : `"ctrl+c"`
- Multiple : `"ctrl+c,ctrl+d"` (séparé par des virgules)
- Avec leader : `"<leader>q"` (se développe en `ctrl+x q`)
- Désactivé : `"none"`

### Touches Modificatrices

- `ctrl` - Touche Control
- `alt` - Touche Alt/Option
- `shift` - Touche Shift
- `super` - Touche Windows/Command

---

## Partage

La fonctionnalité de partage d'OpenCode permet de créer des liens publics vers vos conversations.

### Fonctionnement

Quand vous partagez une conversation, OpenCode :
1. Crée une URL publique unique pour votre session
2. Synchronise votre historique de conversation sur nos serveurs
3. Rend la conversation accessible via le lien partageable `opncd.ai/s/<share-id>`

### Modes de Partage

#### Manuel (par défaut)

Par défaut, les sessions ne sont pas partagées automatiquement :

```bash
/share
```

Pour définir explicitement le mode manuel dans votre fichier de config :

```json
{
  "$schema": "https://opncd.ai/config.json",
  "share": "manual"
}
```

#### Automatique

Activer le partage automatique pour toutes les nouvelles conversations :

```json
{
  "$schema": "https://opncd.ai/config.json",
  "share": "auto"
}
```

#### Désactivé

Désactiver complètement le partage :

```json
{
  "$schema": "https://opncd.ai/config.json",
  "share": "disabled"
}
```

Pour appliquer cela à toute votre équipe, ajoutez-le au `opencode.json` du projet et versionez-le dans Git.

### Retirer le Partage

Pour arrêter de partager une conversation :

```bash
/unshare
```

Cela supprimera le lien de partage et les données associées à la conversation.

### Confidentialité

#### Rétention des Données

Les conversations partagées restent accessibles jusqu'à ce que vous les retiriez explicitement :
- Historique complet de la conversation
- Tous les messages et réponses
- Métadonnées de session

#### Recommandations

- Partagez uniquement les conversations sans informations sensibles
- Examinez le contenu avant de partager
- Retirez le partage quand la collaboration est terminée
- Évitez de partager des conversations avec du code propriétaire
- Pour les projets sensibles, désactivez complètement le partage

### Pour les Entreprises

Pour les déploiements d'entreprise, la fonctionnalité de partage peut être :
- **Désactivée** entièrement pour la conformité de sécurité
- **Restreinte** aux utilisateurs authentifiés via SSO uniquement
- **Auto-hébergée** sur votre propre infrastructure

---

## Intégration IDE

OpenCode s'intègre avec VS Code, Cursor, ou tout IDE supportant un terminal.

### Utilisation

- **Lancement Rapide** : `Cmd+Esc` (Mac) ou `Ctrl+Esc` (Windows/Linux) pour ouvrir OpenCode
- **Nouvelle Session** : `Cmd+Shift+Esc` (Mac) ou `Ctrl+Shift+Esc` (Windows/Linux)
- **Conscience du Contexte** : Partage automatique de votre sélection ou onglet actuel
- **Raccourcis de Référence de Fichiers** : `Cmd+Option+K` (Mac) ou `Alt+Ctrl+K` (Linux/Windows)

### Installation

1. Ouvrez VS Code
2. Ouvrez le terminal intégré
3. Exécutez `opencode` - l'extension s'installe automatiquement

### Installation Manuelle

Recherchez **OpenCode** dans le Marketplace d'Extensions et cliquez sur **Install**.

### Dépannage

Si l'extension ne s'installe pas automatiquement :
- Assurez-vous d'exécuter `opencode` dans le terminal intégré
- Confirmez que le CLI de votre IDE est installé :
  - VS Code : commande `code`
  - Cursor : commande `cursor`
  - Windsurf : commande `windsurf`
  - VSCodium : commande `codium`
- Si non, exécutez `Cmd+Shift+P` (Mac) ou `Ctrl+Shift+P` (Windows/Linux) et recherchez "Shell Command: Install code command in PATH"
- Assurez-vous que VS Code a la permission d'installer des extensions

---

## GitHub Actions

OpenCode s'intègre avec votre workflow GitHub.

### Fonctionnalités

- **Trier les issues** : Demandez à OpenCode d'examiner une issue
- **Corriger et implémenter** : OpenCode crée une branche et soumet une PR
- **Sécurisé** : OpenCode s'exécute dans vos runners GitHub

### Installation

```bash
opencode github install
```

Cela vous guidera à travers :
1. Installation de l'application GitHub
2. Création du workflow
3. Configuration des secrets

### Configuration Manuelle

1. **Installer l'application GitHub**  
   Allez sur [github.com/apps/opencode-agent](https://github.com/apps/opencode-agent)

2. **Ajouter le workflow**  
   Créez `.github/workflows/opencode.yml` :

```yaml
name: opencode

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  opencode:
    if: |
      contains(github.event.comment.body, '/oc') ||
      contains(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          fetch-depth: 1
          persist-credentials: false
      
      - name: Run OpenCode
        uses: anomalyco/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-5
```

3. **Stocker les clés API**  
   Dans les **settings** de votre organisation/projet, ajoutez les clés API dans **Secrets and variables** > **Actions**.

### Configuration

- `model` : Le modèle à utiliser (format : `provider/model`) - **requis**
- `agent` : L'agent à utiliser (doit être un agent primaire)
- `share` : Partager ou non la session (défaut : true pour les repos publics)
- `prompt` : Prompt personnalisé optionnel
- `token` : Token d'accès GitHub optionnel

### Événements Supportés

| Type d'Événement | Déclenché par | Détails |
|------------------|---------------|---------|
| `issue_comment` | Commentaire sur une issue ou PR | Mentionnez `/opencode` ou `/oc` |
| `pull_request_review_comment` | Commentaire sur des lignes de code | Mentionnez `/opencode` ou `/oc` |
| `issues` | Issue ouverte ou modifiée | Nécessite l'input `prompt` |
| `pull_request` | PR ouverte ou mise à jour | Utile pour les révisions automatisées |
| `schedule` | Planification basée sur cron | Nécessite l'input `prompt` |
| `workflow_dispatch` | Déclenchement manuel | Nécessite l'input `prompt` |

### Exemple : Schedule

```yaml
name: Scheduled OpenCode Task

on:
  schedule:
    - cron: "0 9 * * 1" # Tous les lundis à 9h UTC

jobs:
  opencode:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      
      - uses: anomalyco/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-5
          prompt: |
            Examinez la base de code pour tout commentaire TODO.
            Si vous trouvez des problèmes à traiter, ouvrez une issue.
```

### Exemple : Pull Request

```yaml
name: opencode-review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      
      - uses: anomalyco/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-5
          prompt: |
            Examinez cette pull request :
            - Vérifiez les problèmes de qualité du code
            - Recherchez les bugs potentiels
            - Suggérez des améliorations
```

### Prompts Personnalisés

Remplacez le prompt par défaut :

```yaml
- uses: anomalyco/opencode/github@latest
  with:
    model: anthropic/claude-sonnet-4-5
    prompt: |
      Examinez cette pull request :
      - Vérifiez les problèmes de qualité du code
      - Recherchez les bugs potentiels
      - Suggérez des améliorations
```

### Exemples

**Expliquer une issue :**
```
/opencode expliquez cette issue
```

**Corriger une issue :**
```
/opencode corrigez ceci
```

**Réviser les PRs :**
```
Supprimez la pièce jointe de S3 quand la note est supprimée /oc
```

**Réviser des lignes de code spécifiques :**
```
[Commentaire sur des lignes spécifiques dans l'onglet Files]
/oc ajoutez la gestion d'erreur ici
```

---

## Enterprise

OpenCode Enterprise est pour les organisations qui veulent s'assurer que leur code et leurs données ne quittent jamais leur infrastructure.

### Essai

OpenCode est open source et ne stocke aucune de vos données de code ou de contexte. Vos développeurs peuvent simplement commencer et effectuer un essai.

#### Gestion des Données

**OpenCode ne stocke pas votre code ou vos données de contexte.** Tout le traitement se fait localement ou via des appels API directs à votre fournisseur IA.

#### Partage de Conversations

Si un utilisateur active la fonctionnalité `/share`, la conversation et les données associées sont envoyées au service que nous utilisons pour héberger ces pages de partage sur opencode.ai.

Nous recommandons de désactiver cela pour votre essai :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "share": "disabled"
}
```

#### Propriété du Code

**Vous possédez tout le code produit par OpenCode.** Il n'y a aucune restriction de licence ou revendication de propriété.

### Tarification

Nous utilisons un modèle par siège pour OpenCode Enterprise. Si vous avez votre propre passerelle LLM, nous ne facturons pas les tokens utilisés. Pour plus de détails, **[contactez-nous](mailto:contact@anoma.ly)**.

### Déploiement

Une fois votre essai terminé et que vous êtes prêt à utiliser OpenCode dans votre organisation, vous pouvez **[nous contacter](mailto:contact@anoma.ly)** pour discuter de la tarification et des options d'implémentation.

#### Config Centrale

Nous pouvons configurer OpenCode pour utiliser une configuration centrale unique pour toute votre organisation.

Cette config centralisée peut s'intégrer avec votre fournisseur SSO et garantit que tous les utilisateurs accèdent uniquement à votre passerelle IA interne.

#### Intégration SSO

Via la config centrale, OpenCode peut s'intégrer avec le fournisseur SSO de votre organisation pour l'authentification.

#### Passerelle IA Interne

Avec la config centrale, OpenCode peut également être configuré pour utiliser uniquement votre passerelle IA interne.

Vous pouvez également désactiver tous les autres fournisseurs IA, garantissant que toutes les requêtes passent par l'infrastructure approuvée de votre organisation.

#### Auto-Hébergement

Bien que nous recommandions de désactiver les pages de partage, nous pouvons également vous aider à les auto-héberger sur votre infrastructure.

### FAQ

**Qu'est-ce qu'OpenCode Enterprise ?**  
OpenCode Enterprise est pour les organisations qui veulent s'assurer que leur code et leurs données ne quittent jamais leur infrastructure.

**Comment commencer avec OpenCode Enterprise ?**  
Commencez simplement par un essai interne avec votre équipe. Puis **[contactez-nous](mailto:contact@anoma.ly)**.

**Comment fonctionne la tarification enterprise ?**  
Nous proposons une tarification par siège. Si vous avez votre propre passerelle LLM, nous ne facturons pas les tokens. **[Contactez-nous](mailto:contact@anoma.ly)** pour un devis personnalisé.

**Mes données sont-elles sécurisées ?**  
Oui. OpenCode ne stocke pas votre code ou vos données de contexte. Avec la config centrale et l'intégration SSO, vos données restent sécurisées dans l'infrastructure de votre organisation.

**Pouvons-nous utiliser notre propre registre npm privé ?**  
OpenCode supporte les registres npm privés via le support natif du fichier `.npmrc` de Bun. Authentifiez-vous avant d'exécuter OpenCode :

```bash
npm login --registry=https://your-company.jfrog.io/api/npm/npm-virtual/
```

---

## Écosystème

### Plugins

| Nom | Description |
|-----|-------------|
| [opencode-helicone-session](https://github.com/H2Shami/opencode-helicone-session) | Injecter automatiquement les en-têtes de session Helicone |
| [opencode-wakatime](https://github.com/angristan/opencode-wakatime) | Suivre l'utilisation d'OpenCode avec Wakatime |
| [opencode-morph-fast-apply](https://github.com/JRedeker/opencode-morph-fast-apply) | Édition de code 10x plus rapide avec l'API Morph Fast Apply |
| [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) | Agents en arrière-plan, outils LSP/AST/MCP pré-construits |
| [opencode-notifier](https://github.com/mohak34/opencode-notifier) | Notifications de bureau et alertes sonores |
| [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) | Mémoire persistante entre les sessions |
| [@openspoon/subtask2](https://github.com/spoons-and-mirrors/subtask2) | Système d'orchestration puissant |
| [opencode-workspace](https://github.com/kdcokenny/opencode-workspace) | Harnais d'orchestration multi-agents groupé |

### Projets

| Nom | Description |
|-----|-------------|
| [kimaki](https://github.com/remorses/kimaki) | Bot Discord pour contrôler les sessions OpenCode |
| [opencode.nvim](https://github.com/NickvanDyke/opencode.nvim) | Plugin Neovim pour prompts conscients de l'éditeur |
| [portal](https://github.com/hosenur/portal) | Interface web mobile-first pour OpenCode |
| [OpenChamber](https://github.com/btriapitsyn/openchamber) | Application Web/Desktop et Extension VS Code |
| [OpenWork](https://github.com/different-ai/openwork) | Alternative open-source à Claude Cowork |
| [ocx](https://github.com/kdcokenny/ocx) | Gestionnaire d'extensions OpenCode avec profils portables |

### Agents

| Nom | Description |
|-----|-------------|
| [Agentic](https://github.com/Cluster444/agentic) | Agents et commandes AI modulaires |
| [opencode-agents](https://github.com/darrenhinde/opencode-agents) | Configs, prompts, agents et plugins |

---

## Ressources Additionnelles

- **Site Web Officiel** : [opencode.ai](https://opencode.ai/)
- **Documentation** : [opencode.ai/docs](https://opencode.ai/docs/)
- **GitHub** : [github.com/anomalyco/opencode](https://github.com/anomalyco/opencode)
- **Discord** : Rejoignez la communauté OpenCode
- **Twitter** : Suivez [@opencode_ai](https://twitter.com/opencode_ai)

---

*Cette documentation a été compilée depuis https://opencode.ai/docs/ le 23 janvier 2026*
