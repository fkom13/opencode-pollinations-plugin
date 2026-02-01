# 🤖 AGENT.MD - Guide de Développement & Maintenance (OpenCode Pollinations Plugin)

> **IMPORTANT** : Ce document est destiné aux Agents IA et Développeurs. Il contient les règles implicites, workflows et subtilités techniques du projet.

## 1. Philosophie du Projet
- **Universalité** : Le plugin doit fonctionner partout (Linux, Mac, Windows, Containers).
    - *Exemple* : On n'utilise plus `fuser -k` (Linux only) mais un serveur HTTP Node.js natif sur le port 0 (Dynamique).
- **Zéro Blocage** : L'utilisateur ne doit JAMAIS être bloqué sans issue.
    - *Exemple* : Si le quota échoue (403), on passe en mode manuel mais on laisse passer la requête ("Generation Only Key").
    - *Exemple* : Si le modèle Pro échoue, on fallback sur le Free (Transparent Fallback).
- **Transparence** : L'utilisateur doit savoir ce qui se passe (Toasts, Logs, Status Bar).

## 2. Workflow de Release (Beta -> Stable)

Nous suivons un cycle strict pour garantir la stabilité.

### Phase 1 : Beta Dev Channel (`beta.x`)
1.  **Modifications** : Codez vos fixes.
2.  **Bump Version** : `npm version 5.x.x-beta.x` (Incrémental).
3.  **Config Locale** : Mettez à jour `~/.config/opencode/opencode.json` pour pointer sur la nouvelle beta.
4.  **Publish** : `npm publish --tag zobi` (Tag "zobi" pour éviter de polluer `latest`).
    > **⚠️ CRITIQUE** : Toujours vérifier que le code a bien été appliqué (relire le fichier avec `view_file` ou `cat`) avant de publier. Les outils d'édition IA échouent souvent silencieusement sur les gros fichiers.
5.  **Test Utilisateur** : Demander à l'utilisateur de tester via `clean cache` + `restart`.

### Phase 2 : Promotion en Stable (`latest`)
1.  **Validation** : Une fois la Beta validée par l'utilisateur.
2.  **Documentation** : Mettre à jour `README.md`, `ROADMAP.md` et `docs/TECHNICAL_MANUAL.md`.
    - *Note* : Le `TECHNICAL_MANUAL.md` est la source de vérité pour l'architecture.
3.  **Bump Version** : `npm version 5.x.x` (Retrait du suffixe beta).
4.  **Publish** : `npm publish --tag latest`.
5.  **Snapshot** : Créer un snapshot Gencodedoc (`v5.x.x`).
6.  **Git** : Commit + Push sur `beta/dev`.

## 3. Subtilités Techniques & Pièges

### A. Le Proxy HTTP (Port Dynamique)
- **Fichier** : `src/server/index.ts`
- **Comportement** : Le serveur écoute sur le port 0. L'OS assigne un port libre. Ce port est renvoyé à OpenCode via la promesse `activate`.
- **Piège** : Ne jamais hardcoder `10001` (Legacy V4). Toujours utiliser l'adresse dynamique.

### B. Gestion des Quotas & Clés Limitées (`src/server/quota.ts` & `proxy.ts`)
- **Problème** : Certaines clés ("Service Tokens") n'ont pas accès à `/account/profile` (403 Forbidden).
- **Solution (V5.6.0)** :
    1. `commands.ts` détecte l'erreur lors du `/connect` ou `/poll mode`.
    2. `proxy.ts` intercepte l'erreur `auth_limited`.
    3. Au lieu de bloquer (403), le Proxy :
        - Log un warning.
        - Force le mode `manual` en mémoire.
        - **LAISSE PASSER LA REQUÊTE** vers `gen.pollinations.ai`.
- **Règle d'Or** : Ne jamais remettre le `res.writeHead(403)` dans le bloc `auth_limited` du proxy.

### C. Autorité de Configuration (`src/server/config.ts`)
La configuration est éclatée et hiérarchisée :
1. **Priorité 1 (Runtime/Timestamp)** : `~/.pollinations/config.json` OU `auth.json` (le plus récent gagne).
    - *Pourquoi ?* Pour permettre à d'autres outils (CLI Pollinations, Web UI) de mettre à jour la clé partagée.
2. **Priorité 2 (Fallback)** : `opencode.json` (Configuration statique OpenCode).

### D. Modèles "Paid Only" (`pollinations-paid-models.json`)
- Liste dynamique récupérée par `generate-config.ts`.
- Stockée dans `~/.pollinations/pollinations-paid-models.json`.
- Le Proxy vérifie cette liste pour le mode `alwaysfree`. Si un modèle est dedans, il est bloqué (sauf si mode Pro/Manuel).

## 4. Maintenance
- **Scripts** : Tous les scripts utilitaires (`test_keys.sh`, `repro_*.cjs`) sont dans `scripts/`.
- **Logs** : `/tmp/opencode_pollinations_debug.log` (Seulement si `logs_gui: verbose`).
- **Gencodedoc** : Utiliser avant toute refonte majeure pour sécuriser l'état.

---
*Ce document doit rester dans le repo pour guider les futurs développeurs.*
