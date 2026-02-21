# 📊 Rapport d'Analyse — Pollinations Plugin (Version Outils)

> Généré le 18/02/2026 — Analyse complète de la codebase `src/`

---

## ✅ Vue d'ensemble

Le plugin est bien structuré, avec une séparation propre entre la couche serveur (`server/`) et les outils (`tools/`). La logique de proxy HTTP, la gestion des quotas et la rotation des clés API sont bien pensées. Cependant, plusieurs points critiques existent — notamment pour la compatibilité multi-OS — qui doivent être résolus avant une publication plus large.

---

## 🔴 Points Critiques (bloquants sur Windows)

### 1. Chemins `/tmp` hardcodés

| Fichier | Ligne | Code problématique |
|--------|-------|-------------------|
| `src/index.ts` | 64 | `const LOG_FILE = '/tmp/opencode_pollinations_v4.log'` |
| `tools/index.ts` | 3200 | `const LOG_FILE = '/tmp/opencode_pollinations_v4.log'` |
| `server/pollinations-api.ts` | ~1520 | `fs.appendFileSync('/tmp/pollinations-api-debug.log', ...)` |
| `server/toast.ts` | ~3128 | `fs.appendFileSync('/tmp/pollinations-toasts.log', ...)` |

**Impact :** Crash silencieux sur Windows (pas de `/tmp` natif). Les logs disparaissent.  
**Fix :** Remplacer par `os.tmpdir()` ou `path.join(os.tmpdir(), ...)`.

---

### 2. Commande `fuser -k` dans `server/index.ts`

```typescript
execSync(`fuser -k ${PORT}/tcp || true`); // Linux ONLY
```

`fuser` n'existe ni sur Windows ni sur macOS. C'est le point le plus dangereux car il est dans le chemin de démarrage du serveur.

**Fix :** Utiliser une logique de port dynamique (déjà présente dans `index.ts` root avec le port `0`). Le `server/index.ts` semble être du code legacy — voir point 6.

---

### 3. Expansion du tilde `~` dans les chemins de sortie

Les descriptions des outils (`extract_frames`, `remove_background`, etc.) référencent `~/Downloads/pollinations/...`. Node.js n'expand pas `~` automatiquement.

```typescript
// Dans shared.ts — si resolveOutputDir reçoit "~/..." ça ne marche pas sur Windows
```

**Fix :** Utiliser `os.homedir()` et `path.join(os.homedir(), 'Downloads', ...)`.

---

### 4. Résolution du home directory incohérente

| Fichier | Code | Problème |
|--------|------|---------|
| `server/index.ts` | `process.env.HOME \|\| '/tmp'` | Manque `USERPROFILE` (Windows) |
| `rmbg_keys.ts` | `process.env.HOME \|\| process.env.USERPROFILE \|\| '/tmp'` | ✅ Correct |

**Fix :** Uniformiser avec `os.homedir()` partout — c'est la méthode officielle Node.js, cross-platform.

---

## 🟠 Points Importants (dégradation sur Windows/macOS)

### 5. Commandes ffmpeg dans des template strings shell

Les outils `extract_audio` et `extract_frames` construisent des commandes ffmpeg avec `execSync` :

```typescript
let cmd = `ffmpeg -y -i "${videoPath}"`;
// ...
execSync(cmd, { stdio: 'ignore', timeout: 120000 });
```

Sur Windows avec `cmd.exe`, les double-quotes dans les chemins avec espaces peuvent poser problème. De plus, le shell invoqué par `execSync` diffère selon l'OS (`/bin/sh` vs `cmd.exe`).

**Fix :** Passer les arguments en tableau via `spawnSync` pour éviter l'interprétation shell, ou utiliser `cross-spawn`.

---

### 6. Code mort — `server/index.ts` (V6 legacy)

Le fichier `server/index.ts` est un serveur complet avec port fixe (10001) et sa propre logique de démarrage. Or, le vrai point d'entrée est `src/index.ts` qui crée son propre serveur HTTP avec port dynamique.

**Risque :** Si ce fichier est importé ou exécuté par erreur, il déclenche la commande `fuser -k` et entre en conflit de port.

**Fix :** Supprimer `server/index.ts` ou le renommer clairement en `_legacy_server.ts`.

---

### 7. Versions hardcodées incohérentes

```typescript
// server/index.ts — MAUVAIS
version: "v6.0.0-beta.99"

// src/index.ts — BON
version: require('../package.json').version
```

**Fix :** Toujours lire depuis `package.json`, jamais hardcoder.

---

### 8. Double `globalClient` et état partagé

`globalClient` est déclaré dans `toast.ts` ET réexposé via `setGlobalClient`. `commands.ts` a son propre `globalClient` via `setClientForCommands`. C'est le même client injecté deux fois dans deux modules différents.

**Risque :** Si l'ordre d'initialisation change, un des deux modules peut appeler un client `null`.

**Fix :** Créer un module `client-registry.ts` singleton exposant `setClient` / `getClient`.

---

### 9. `require()` mélangé avec ESM

Dans `src/index.ts` :
```typescript
const require = createRequire(import.meta.url);
// ...
const v = require('../package.json').version;
```

C'est un workaround acceptable mais fragile. Dans `server/index.ts` :
```typescript
const { execSync } = require('child_process'); // à l'intérieur d'une fonction!
```

Cela contourne les imports TypeScript statiques et peut causer des problèmes avec bundlers.

---

## 🟡 Points Mineurs (qualité de code)

### 10. Filtrage des modèles trop strict

```typescript
.filter((m: any) => m.tools === true) // FREE MODELS
```

Si Pollinations ajoute un modèle sans le flag `tools` ou avec `tools: undefined`, il sera silencieusement écarté. Un warning de log serait utile.

---

### 11. Timestamp UTC dans `parseUsageTimestamp`

```typescript
const timestamp = entry.timestamp.replace(' ', 'T') + 'Z';
```

Ce hack d'ajout de `Z` suppose que le serveur renvoie toujours des timestamps UTC sans suffixe. Fragile si l'API change.

---

### 12. `session.idle` hook gardé vide

Dans `toast.ts` :
```typescript
'session.idle': async ({ event }: any) => {
    // Deprecated...
}
```

Un hook vide exposé dans l'objet de retour. À supprimer pour ne pas polluer le registre OpenCode.

---

### 13. Messages utilisateur en français dans le code anglophone

Certains messages sont en français (ex. `"Clé API invalide ou non autorisée"`) d'autres en anglais (`"File not found"`). L'expérience utilisateur est incohérente selon l'outil utilisé.

---

## 📁 Fichiers de Spécifications Associés

| Spec | Fichier |
|------|---------|
| Système de fichiers multi-OS | `SPEC_AGENT_FILESYSTEM_MULTIOS.md` |
| Logging multi-OS | `SPEC_AGENT_LOGGING_MULTIOS.md` |
| FFmpeg cross-platform | `SPEC_AGENT_FFMPEG_MULTIOS.md` |
| Gestion du port serveur | `SPEC_AGENT_PORT_SERVEUR.md` |
| Home directory & config | `SPEC_AGENT_HOMEDIR_CONFIG.md` |

---

## 🎯 Priorités de Correction

| Priorité | Action |
|----------|--------|
| 🔴 P0 | Remplacer tous les `/tmp` hardcodés par `os.tmpdir()` |
| 🔴 P0 | Supprimer ou isoler `server/index.ts` et sa commande `fuser` |
| 🔴 P0 | Uniformiser la résolution du home dir avec `os.homedir()` |
| 🟠 P1 | Migrer les commandes ffmpeg vers `spawnSync` avec tableau d'args |
| 🟠 P1 | Créer un singleton `client-registry.ts` |
| 🟡 P2 | Supprimer le hook `session.idle` vide |
| 🟡 P2 | Uniformiser la langue des messages utilisateur |
| 🟡 P2 | Lire la version depuis `package.json` partout |
