# SPEC — Logging Multi-OS

> Cible : Agents de refactoring / PR review
> Scope : `src/index.ts`, `tools/index.ts`, `server/pollinations-api.ts`, `server/toast.ts`

---

## Problème

Les fichiers de log sont écrits dans des chemins `/tmp/...` hardcodés. Sur Windows, `/tmp` n'existe pas — les `appendFileSync` échouent silencieusement (le try/catch absorbe l'erreur), résultant en une perte totale des logs de diagnostic.

---

## Inventaire des Loggers Actuels

| Module | Variable | Chemin actuel |
|--------|----------|--------------|
| `src/index.ts` | `LOG_FILE` | `/tmp/opencode_pollinations_v4.log` |
| `tools/index.ts` | `LOG_FILE` | `/tmp/opencode_pollinations_v4.log` |
| `server/pollinations-api.ts` | inline | `/tmp/pollinations-api-debug.log` |
| `server/toast.ts` | inline | `/tmp/pollinations-toasts.log` |

---

## Solution : Module de Logging Partagé

Créer `src/server/logger.ts` — unique source de vérité :

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Centraliser tous les logs dans un seul dossier temporaire
const LOG_DIR = path.join(os.tmpdir(), 'pollinations-plugin');
const LOG_FILE = path.join(LOG_DIR, 'plugin.log');
const API_LOG_FILE = path.join(LOG_DIR, 'api-debug.log');
const TOAST_LOG_FILE = path.join(LOG_DIR, 'toasts.log');

// Initialisation unique
function ensureLogDir() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    } catch { /* Silent fail — logging should never crash the app */ }
}
ensureLogDir();

export function log(msg: string, file = LOG_FILE): void {
    try {
        fs.appendFileSync(file, `[${new Date().toISOString()}] ${msg}\n`);
    } catch { }
}

export function logApi(msg: string): void {
    log(msg, API_LOG_FILE);
}

export function logToast(msg: string): void {
    log(msg, TOAST_LOG_FILE);
}

export const LOG_FILES = {
    main: LOG_FILE,
    api: API_LOG_FILE,
    toast: TOAST_LOG_FILE,
};
```

---

## Migration par Fichier

### `src/index.ts`

```typescript
// ❌ AVANT
const LOG_FILE = '/tmp/opencode_pollinations_v4.log';
function log(msg: string) {
    try { fs.appendFileSync(LOG_FILE, `...`); } catch (e) { }
}

// ✅ APRÈS
import { log } from './server/logger.js';
// Utiliser log() directement
```

### `server/pollinations-api.ts`

```typescript
// ❌ AVANT
function logDebug(msg: string) {
    try { fs.appendFileSync('/tmp/pollinations-api-debug.log', `...`); } catch (e) { }
}

// ✅ APRÈS
import { logApi as logDebug } from './logger.js';
```

### `server/toast.ts`

```typescript
// ❌ AVANT
fs.appendFileSync('/tmp/pollinations-toasts.log', logLine + '\n');

// ✅ APRÈS
import { logToast } from './logger.js';
logToast(logLine);
```

---

## Bonus : Commande `/poll logs` (optionnel)

Exposer le chemin des logs dans une commande pour faciliter le debug :

```typescript
case 'logs':
    return {
        handled: true,
        response: [
            `📋 Fichiers de log:`,
            `  Plugin : ${LOG_FILES.main}`,
            `  API    : ${LOG_FILES.api}`,
            `  Toasts : ${LOG_FILES.toast}`,
        ].join('\n')
    };
```

---

## Tests de Validation

- [ ] Sur Windows : les logs se créent dans `%TEMP%\pollinations-plugin\`
- [ ] Sur Linux/macOS : les logs se créent dans `/tmp/pollinations-plugin/`
- [ ] L'absence de dossier ne crash pas le plugin au démarrage
- [ ] Les 3 fichiers de log sont distincts et lisibles
