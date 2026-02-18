# SPEC — Home Directory & Config Cross-Platform

> Cible : Agents de refactoring / PR review
> Scope : `server/config.ts`, `tools/power/rmbg_keys.ts`, `server/index.ts`

---

## Problème

La résolution du répertoire home de l'utilisateur est faite de 3 manières différentes dans le projet, avec des degrés de fiabilité variables.

| Fichier | Code | Fiabilité |
|--------|------|----------|
| `server/index.ts` | `process.env.HOME \|\| '/tmp'` | ❌ Échoue sur Windows |
| `rmbg_keys.ts` | `process.env.HOME \|\| process.env.USERPROFILE \|\| '/tmp'` | ⚠️ Correct mais verbeux |
| `server/config.ts` | (non visible — à vérifier) | ❓ |

---

## Solution Uniforme : `os.homedir()`

`os.homedir()` est la méthode officielle Node.js pour obtenir le répertoire home. Elle fonctionne sur tous les OS :

| OS | Résultat de `os.homedir()` |
|----|--------------------------|
| Linux | `/home/username` |
| macOS | `/Users/username` |
| Windows | `C:\Users\username` |

**Ne jamais utiliser `process.env.HOME` directement.** Il peut être vide dans certains contextes (services, CI, sandboxes).

---

## Chemins de Config par Convention OS

Les conventions de chaque OS pour les fichiers de config applicatif :

| OS | Convention | Exemple |
|----|-----------|---------|
| Linux | `~/.config/<app>/` (XDG) | `~/.config/pollinations/config.json` |
| macOS | `~/Library/Application Support/<app>/` | `~/Library/Application Support/pollinations/config.json` |
| Windows | `%APPDATA%\<app>\` | `C:\Users\User\AppData\Roaming\pollinations\config.json` |

Pour un plugin CLI, il est acceptable de rester sur `~/.config/<app>/` pour Linux et macOS, et d'utiliser `%APPDATA%` pour Windows.

---

## Pattern Recommandé — `getConfigDir()`

```typescript
import * as os from 'os';
import * as path from 'path';

export function getConfigDir(): string {
    switch (process.platform) {
        case 'win32':
            // APPDATA est toujours défini sur Windows
            return path.join(process.env.APPDATA || os.homedir(), 'pollinations');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'pollinations');
        default:
            // Linux et autres Unix
            return path.join(
                process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
                'pollinations'
            );
    }
}

export const CONFIG_DIR = getConfigDir();
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
```

---

## Pattern Recommandé — Fichiers de Clés (rmbg_keys.ts)

Le fichier `backgroundcut_keys.json` doit suivre la même convention :

```typescript
import { CONFIG_DIR } from './config.js';
import * as path from 'path';

// Utilise le même dossier que la config principale
export const KEYS_FILE = path.join(CONFIG_DIR, 'backgroundcut_keys.json');
```

Cela évite d'avoir des fichiers dans `~/.pollinations/` ET `~/.config/opencode/` — tout est centralisé.

---

## Pattern Recommandé — `loadConfig()` Robuste

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_FILE, CONFIG_DIR } from './config-paths.js';

const DEFAULT_CONFIG: PollinationsConfig = {
    apiKey: '',
    mode: 'manual',
    // ...
};

export function loadConfig(): PollinationsConfig {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        }
    } catch {
        // Config corrompue — repartir de zéro
    }
    return { ...DEFAULT_CONFIG };
}

export function saveConfig(partial: Partial<PollinationsConfig>): void {
    try {
        const current = loadConfig();
        const updated = { ...current, ...partial };
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    } catch (err) {
        // Logger l'erreur mais ne pas crasher
        console.error(`[Config] Failed to save: ${err}`);
    }
}
```

---

## Migration de `rmbg_keys.ts`

```typescript
// ❌ AVANT
const KEYS_FILE = path.join(
    process.env.HOME || process.env.USERPROFILE || '/tmp',
    '.pollinations', 'backgroundcut_keys.json'
);

// ✅ APRÈS
import { CONFIG_DIR } from '../../server/config.js';
const KEYS_FILE = path.join(CONFIG_DIR, 'backgroundcut_keys.json');
```

---

## Migration de `server/index.ts`

```typescript
// ❌ AVANT
const LOG_FILE = path.join(process.env.HOME || '/tmp', '.config/opencode/plugins/pollinations-v6.log');

// ✅ APRÈS — Dans logger.ts (voir SPEC_AGENT_LOGGING_MULTIOS.md)
import * as os from 'os';
const LOG_FILE = path.join(os.tmpdir(), 'pollinations-plugin', 'plugin.log');
```

---

## Tests de Validation

- [ ] `loadConfig()` retourne la config par défaut si aucun fichier n'existe
- [ ] `saveConfig()` crée le dossier parent si inexistant
- [ ] Le fichier de config est créé dans le bon chemin sur Windows (`%APPDATA%`)
- [ ] Le fichier de config est créé dans `~/.config/pollinations/` sur Linux
- [ ] `rmbg_keys.ts` et `config.ts` partagent le même dossier de base
- [ ] La variable `USERPROFILE` n'est plus utilisée directement nulle part
