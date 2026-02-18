# SPEC — Gestion du Port Serveur

> Cible : Agents de refactoring / PR review
> Scope : `src/index.ts`, `server/index.ts`

---

## Problème

Il existe **deux serveurs HTTP** dans le projet avec des stratégies de port incompatibles :

| Fichier | Stratégie | Problème |
|--------|----------|---------|
| `src/index.ts` | Port dynamique (`listen(0)`) | ✅ Correct — aucun conflit possible |
| `server/index.ts` | Port fixe 10001 + `fuser -k` | ❌ Linux-only, dangereux |

La commande `fuser -k ${PORT}/tcp` est **Linux-only** et représente un vrai bloquant :
- Sur macOS : `fuser` n'existe pas (il faut `lsof + kill`)
- Sur Windows : `fuser` n'existe pas du tout

---

## Situation Actuelle

`server/index.ts` est vraisemblablement du **code legacy** (V6) qui n'est plus le point d'entrée principal. Le vrai plugin charge `src/index.ts`. Mais si `server/index.ts` est importé ou exécuté par accident, le `fuser` se déclenche au démarrage.

---

## Recommandation Principale : Supprimer `server/index.ts`

Ce fichier duplique la logique de `src/index.ts` avec une version moins robuste. Il doit être :
- Supprimé, **ou**
- Renommé en `server/_legacy_index.ts` avec un commentaire explicite

---

## Si le Port Fixe est Nécessaire (Fallback)

Si un port fixe est absolument requis (ex : pour compatibilité avec un outil externe), remplacer la logique `fuser` par une vérification cross-platform :

```typescript
import * as net from 'net';
import * as http from 'http';

/**
 * Vérifie si un port est déjà occupé.
 * Cross-platform — pas de shell, pas de fuser.
 */
function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const tester = net.createServer()
            .once('error', (err: NodeJS.ErrnoException) => {
                resolve(err.code === 'EADDRINUSE');
            })
            .once('listening', () => {
                tester.once('close', () => resolve(false)).close();
            })
            .listen(port, '127.0.0.1');
    });
}

/**
 * Trouve un port libre en partant du port demandé.
 */
async function findFreePort(startPort: number): Promise<number> {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
        if (port > startPort + 100) {
            throw new Error(`No free port found between ${startPort} and ${port}`);
        }
    }
    return port;
}
```

---

## Stratégie Recommandée : Port Dynamique (déjà dans `src/index.ts`)

La stratégie `listen(0)` est **la meilleure** — le kernel OS choisit un port libre, jamais de conflit, cross-platform par définition.

```typescript
const startProxy = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const server = http.createServer(requestHandler);

        // Port 0 = port libre aléatoire assigné par l'OS
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Could not determine server port'));
                return;
            }
            resolve(address.port);
        });

        server.on('error', (err) => {
            reject(err);
        });
    });
};
```

Le port assigné est ensuite passé à `generatePollinationsConfig` pour que le provider pointe vers la bonne URL — c'est déjà ce qui est fait dans `src/index.ts`. ✅

---

## Gestion des Erreurs au Démarrage

```typescript
const port = await startProxy().catch((err) => {
    log(`[Proxy] FATAL: Could not start proxy: ${err.message}`);
    // Continuer sans proxy — les outils restent disponibles
    return 0;
});

if (port === 0) {
    console.error('⚠️ Pollinations proxy failed to start. LLM routing unavailable.');
}
```

---

## Tests de Validation

- [ ] Le plugin démarre sur Windows sans erreur liée à `fuser`
- [ ] Le plugin démarre sur macOS sans erreur
- [ ] Deux instances du plugin peuvent coexister (ports différents)
- [ ] La valeur de port retournée par `startProxy` est bien propagée au provider config
- [ ] `server/index.ts` ne peut pas être accidentellement chargé (supprimé ou guard explicite)
