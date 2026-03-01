# SPEC — Système de Fichiers Multi-OS

> Cible : Agents de refactoring / PR review
> Scope : `src/` — tous les outils et modules serveur

---

## Problème

Plusieurs endroits du code utilisent des chemins Unix absolus ou des conventions Linux-only qui cassent sur Windows et créent des comportements inattendus sur macOS.

---

## Règles Universelles à Appliquer

### Règle 1 — Toujours utiliser `path.join()` ou `path.resolve()`

```typescript
// ❌ MAUVAIS
const dir = '/home/user/.pollinations';
const dir = '~/Downloads/pollinations';

// ✅ BON
import * as os from 'os';
import * as path from 'path';
const dir = path.join(os.homedir(), '.pollinations');
const dir = path.join(os.homedir(), 'Downloads', 'pollinations');
```

### Règle 2 — Toujours utiliser `os.tmpdir()` pour les fichiers temporaires

```typescript
// ❌ MAUVAIS (Linux only)
const tempFile = `/tmp/video_${Date.now()}.mp4`;
const logFile = '/tmp/pollinations-toasts.log';

// ✅ BON
import * as os from 'os';
const tempFile = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
const logFile = path.join(os.tmpdir(), 'pollinations-toasts.log');
```

### Règle 3 — Utiliser `os.homedir()` pour le répertoire utilisateur

```typescript
// ❌ MAUVAIS
const home = process.env.HOME || process.env.USERPROFILE || '/tmp';

// ✅ BON
import * as os from 'os';
const home = os.homedir(); // Cross-platform, toujours correct
```

### Règle 4 — Ne jamais utiliser `/` seul comme fallback de chemin

```typescript
// ❌ MAUVAIS
const base = process.env.HOME || '/tmp';  // '/tmp' n'existe pas sur Windows

// ✅ BON
import * as os from 'os';
const base = os.homedir() || os.tmpdir();
```

---

## Inventaire des Occurrences à Corriger

| Fichier | Chemin problématique | Correction |
|--------|---------------------|-----------|
| `src/index.ts:64` | `'/tmp/opencode_pollinations_v4.log'` | `path.join(os.tmpdir(), 'opencode_pollinations_v4.log')` |
| `tools/index.ts:3200` | `'/tmp/opencode_pollinations_v4.log'` | `path.join(os.tmpdir(), 'opencode_pollinations_v4.log')` |
| `server/pollinations-api.ts` | `'/tmp/pollinations-api-debug.log'` | `path.join(os.tmpdir(), 'pollinations-api-debug.log')` |
| `server/toast.ts` | `'/tmp/pollinations-toasts.log'` | `path.join(os.tmpdir(), 'pollinations-toasts.log')` |
| `server/index.ts` | `process.env.HOME \|\| '/tmp'` | `os.homedir()` |
| `rmbg_keys.ts` | `process.env.HOME \|\| process.env.USERPROFILE \|\| '/tmp'` | `os.homedir()` |
| `tools/shared.ts` (TOOL_DIRS) | Vérifier si `~` est utilisé | Remplacer par `os.homedir()` |

---

## Pattern Recommandé pour les Dossiers de Sortie

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Dossier de base des outputs
const POLLINATIONS_BASE = path.join(os.homedir(), 'Downloads', 'pollinations');

// Sous-dossiers par type
export const TOOL_DIRS = {
    images:  path.join(POLLINATIONS_BASE, 'images'),
    audio:   path.join(POLLINATIONS_BASE, 'audio'),
    music:   path.join(POLLINATIONS_BASE, 'music'),
    video:   path.join(POLLINATIONS_BASE, 'video'),
    frames:  path.join(POLLINATIONS_BASE, 'frames'),
    rembg:   path.join(POLLINATIONS_BASE, 'rembg'),
};

export function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Résoudre un dossier de sortie personnalisé ou par défaut
export function resolveOutputDir(defaultDir: string, customDir?: string): string {
    const dir = customDir || defaultDir;
    // Expand ~ manuellement si présent (au cas où l'agent passe "~/...")
    const resolved = dir.startsWith('~')
        ? path.join(os.homedir(), dir.slice(1))
        : dir;
    ensureDir(resolved);
    return resolved;
}
```

---

## Pattern Recommandé pour les Fichiers de Config

```typescript
import * as os from 'os';
import * as path from 'path';

// Windows : %APPDATA%\pollinations\config.json
// Linux/macOS : ~/.config/pollinations/config.json

function getConfigDir(): string {
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'pollinations');
    }
    return path.join(os.homedir(), '.config', 'pollinations');
}

export const CONFIG_FILE = path.join(getConfigDir(), 'config.json');
```

---

## Tests de Validation

Après refactoring, vérifier :

- [ ] Le plugin démarre sans erreur sur Windows (PowerShell / cmd)
- [ ] Les fichiers de log sont créés dans `os.tmpdir()` sur les 3 OS
- [ ] Les fichiers de sortie des outils apparaissent dans `~/Downloads/pollinations/` sur Linux/macOS et `C:\Users\<user>\Downloads\pollinations\` sur Windows
- [ ] La config est sauvegardée dans le bon dossier selon l'OS
