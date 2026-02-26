# 🤖 AGENT.MD — Guide de Développement & Maintenance
### OpenCode Pollinations Plugin

> **DESTINATAIRES** : Agents IA et Développeurs.
> Ce document contient les règles implicites, workflows et pièges techniques du projet.

---

## 1. Philosophie du Projet

- **Universalité** : Le plugin doit fonctionner sur Linux, macOS, Windows et en container.
  - ✅ Port dynamique `listen(0)` — l'OS assigne un port libre, jamais de conflit.
  - ✅ Chemins via `os.tmpdir()` / `os.homedir()` — jamais de `/tmp` hardcodé.
  - ✅ Commandes système évitées — pas de `fuser`, `kill`, ou shell Linux-only.

- **Zéro Blocage** : L'utilisateur ne doit JAMAIS être bloqué sans issue de secours.
  - Si le quota échoue (403 auth_limited) → mode manuel, la requête passe quand même.
  - Si un modèle Pro échoue → fallback transparent vers Free.
  - Si ffmpeg est absent → message d'installation adapté à l'OS, pas de crash.

- **Transparence** : L'utilisateur sait ce qui se passe (Toasts, Logs, Status Bar).

- **Zéro Régressions** : Tout fix doit être vérifié par relecture du fichier modifié avant publication. Les outils IA échouent silencieusement sur les gros fichiers.

---

## 2. Architecture des Documents

### Racine du projet — Documents Publics

| Fichier | Audience | Rôle |
|--------|----------|------|
| `README.md` | Utilisateurs finaux | Installation, usage rapide, liste des outils |
| `CHANGELOG.md` | Utilisateurs + Devs | Historique des versions (format Keep-a-Changelog) |
| `CONTRIBUTING.md` | Contributeurs externes | Conventions de code, comment contribuer |
| `LICENSE.md` | Tout le monde | Licence du projet |
| `AGENT.md` | Agents IA + Devs | Ce fichier — règles, pièges, workflows |

### `docs/` — Structure Complète

```
docs/
├── images/                          Captures d'écran pour README/docs publiques
├── issues/
│   ├── Resolved/                    Issues & specs closes (archivées, ne pas modifier)
│   └── ToDo_FixOrEvolution/         ← SPECS ACTIVES : bugs, fixes, évolutions à traiter
│       ├── RAPPORT_ANALYSE_COMPLET.md
│       ├── SPEC_AGENT_COMMANDS.md
│       ├── SPEC_AGENT_CONNECT_MODEL.md
│       ├── SPEC_AGENT_COST_GUARD.md
│       ├── SPEC_AGENT_FFMPEG_MULTIOS.md
│       ├── SPEC_AGENT_FILESYSTEM_MULTIOS.md
│       ├── SPEC_AGENT_HOMEDIR_CONFIG.md
│       ├── SPEC_AGENT_LOGGING_MULTIOS.md
│       └── SPEC_AGENT_TOOL_COST_CONTROL.md
├── studies/                         Recherches, analyses API, règles métier
│   ├── bilan_code.md
│   ├── framework_study.md
│   ├── polapikey_and_instructions.md
│   └── RULES_POLLINATIONS_ENTER_APID.md
├── technical/                       Documentation technique détaillée
│   ├── api_reference.md
│   ├── architecture_tools.md
│   ├── manual.md
│   └── pricing_commands.md
├── vision/                          Roadmap, features futures, plans
│   ├── FEATURE_PRICING_MODELS_COMMANDS.md
│   ├── PROJECT_PLAN.md
│   └── VISIONmediadiscus.md
└── TECHNICAL_MANUAL.md              ← SOURCE DE VÉRITÉ ARCHITECTURALE
```

### Cycle de Vie des Issues/Specs

```
Nouveau problème ou évolution
        ↓
  Créer SPEC_AGENT_*.md dans docs/issues/ToDo_FixOrEvolution/
        ↓
  L'agent traite la spec (snapshot gencodedoc avant)
        ↓
  Validé par l'utilisateur
        ↓
  Déplacer le fichier vers docs/issues/Resolved/
```

> **Règle** : une spec dans `Resolved/` n'est jamais modifiée — elle sert de référence historique.
> Une spec dans `ToDo_FixOrEvolution/` est vivante : un agent peut l'annoter, la compléter, cocher des items.

### Règles de Mise à Jour des Docs

| Document | Quand mettre à jour |
|----------|-------------------|
| `README.md` | À chaque promotion stable (`latest`) |
| `CHANGELOG.md` | Générer via `gencodedoc generate_changelog`, puis ajuster |
| `AGENT.md` section 9 | À chaque début de session de dev |
| `docs/TECHNICAL_MANUAL.md` | Avant toute promotion stable |
| `docs/vision/PROJECT_PLAN.md` | Quand la roadmap évolue |

---

## 3. Architecture du Code — Point d'Entrée

### Fichier actif : `src/index.ts`

C'est **le seul vrai point d'entrée du plugin**. Il exporte `PollinationsPlugin` (et `default`).

```
OpenCode
  └── src/index.ts  (PollinationsPlugin) ← SEUL FICHIER CHARGÉ
        ├── server/config.ts
        ├── server/proxy.ts
        ├── server/commands.ts
        ├── server/toast.ts
        ├── server/generate-config.ts
        ├── server/quota.ts
        └── tools/index.ts
```

> **⚠️ `server/index.ts` a été supprimé** — code V6 legacy jamais importé.
> Ne pas le recréer. Ne pas utiliser de port fixe (10001 est banni).

---

## 4. Subtilités Techniques & Pièges

### A. Le Proxy HTTP (Port Dynamique) — `src/index.ts`

- Le serveur écoute sur **port 0**. L'OS assigne un port libre.
- Ce port est résolu via `startProxy()` puis injecté dans `config.provider['pollinations'].options.baseURL`.
- **Règle absolue** : ne jamais hardcoder de numéro de port.

```typescript
// ✅ BON
server.listen(0, '127.0.0.1', () => {
    const port = (server.address() as net.AddressInfo).port;
    resolve(port);
});
```

### B. Gestion des Quotas & Clés Limitées — `server/quota.ts` + `proxy.ts`

- Certaines clés ("Service Tokens") n'ont pas accès à `/account/profile` → réponse `403`.
- **Solution** : `proxy.ts` intercepte `auth_limited`, force le mode `manual` en mémoire, mais **laisse passer la requête** vers `gen.pollinations.ai`.
- **Règle d'Or** : ne jamais remettre `res.writeHead(403)` dans le bloc `auth_limited`.

### C. Autorité de Configuration — `server/config.ts`

Hiérarchie (priorité décroissante) :

1. **`config.json`** dans le config dir (le plus récent gagne).
2. **`opencode.json`** — configuration statique OpenCode (fallback).

**Chemins cross-platform via `getConfigDir()` :**

| OS | Chemin résolu |
|----|--------------|
| Linux | `~/.config/pollinations/` |
| macOS | `~/Library/Application Support/pollinations/` |
| Windows | `%APPDATA%\pollinations\` |

> Ne jamais hardcoder un chemin absolu. Toujours appeler `getConfigDir()`.

### D. Modèles "Paid Only" — `generate-config.ts`

- Liste dynamique récupérée depuis l'endpoint `/models` enterprise.
- Stockée dans `getConfigDir()/pollinations-paid-models.json`.
- Le proxy bloque ces modèles en mode `alwaysfree`.

### E. Fichiers de Log — `server/logger.ts`

- Tous les logs passent par `logger.ts` centralisé.
- Chemin : `os.tmpdir()/pollinations-plugin/plugin.log`
- Ne jamais écrire `/tmp/...` directement. `os.tmpdir()` est cross-platform.

### F. FFmpeg — `tools/power/extract_audio.ts` + `extract_frames.ts`

- Toujours `spawnSync` avec **tableau d'arguments** — jamais de template string shell.
- Les chemins avec espaces cassent `execSync('cmd string')` sur Windows.

---

## 5. Workflow de Release

### Phase 1 — Beta Dev (`beta.x`)

1. Coder les fixes.
2. **Relire chaque fichier modifié** (`view_file` ou `cat`) — les outils IA échouent silencieusement.
3. Snapshot gencodedoc : `create_snapshot message="avant release beta.x" tag="pre-beta-x"`.
4. `npm version 6.x.x-beta.x`.
5. Mettre à jour `opencode.json` local pour pointer sur la beta.
6. `npm publish --tag beta`.
7. Demander un `clean cache` + `restart` à l'utilisateur pour valider.

### Phase 2 — Promotion Stable (`latest`)

1. Beta validée par l'utilisateur.
2. Générer le changelog : `gencodedoc generate_changelog from_ref="pre-beta-x" to_ref="current"` → copier dans `CHANGELOG.md`.
3. Mettre à jour `README.md` et `docs/TECHNICAL_MANUAL.md`.
4. Snapshot final : `create_snapshot message="stable vX.x.x" tag="vX.x.x"`.
5. `npm version 6.x.x`.
6. `npm publish --tag latest`.
7. Git : commit + push sur `beta/dev` via MCP github_fkom13.

### Mode Dev Manuel (local)

```
Config opencode.json → pointe vers le chemin local du projet
Cycle : modifier → bump dev.x → npm run build → reload OpenCode
```

---

## 6. Guide Gencodedoc (MCP)

Gencodedoc est le système de versioning interne du projet. **Il remplace git pour la sauvegarde des états de code** pendant le dev actif. Il est connecté via MCP (`gencodedoc` — 26 outils disponibles).

### Quand créer un snapshot

| Situation | Action |
|-----------|--------|
| Avant toute modification importante | `create_snapshot tag="pre-<feature>"` |
| Après un fix validé par l'utilisateur | `create_snapshot tag="fix-<description>"` |
| Avant une release beta | `create_snapshot tag="pre-beta-x"` |
| Après une release stable | `create_snapshot tag="vX.x.x"` |
| En cas de doute (refonte, gros fichier) | `create_snapshot message="checkpoint"` |

### Commandes Essentielles

**Créer un snapshot :**
```
create_snapshot
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  message: "Fix ffmpeg spawnSync migration"
  tag: "fix-ffmpeg-crossplatform"
```

**Lister les snapshots récents :**
```
list_snapshots
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  limit: 10
```

**Voir ce qui a changé depuis un snapshot :**
```
diff_versions
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  from_ref: "pre-beta-x"
  to_ref: "current"
  format: "markdown"
```

**Générer le changelog entre deux snapshots :**
```
generate_changelog
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  from_ref: "v6.0.0"
  to_ref: "current"
```

**Retrouver un fichier à une version précise :**
```
get_file_at_version
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  snapshot_ref: "pre-beta-x"
  file_path: "src/index.ts"
```

**Restaurer un fichier spécifique (sans tout écraser) :**
```
restore_files
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  snapshot_ref: "pre-beta-x"
  file_filters: ["src/server/proxy.ts"]
```

**Chercher dans l'historique des snapshots :**
```
search_snapshots
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  query: "fuser"
  file_filter: "*.ts"
```

**Voir l'historique d'un fichier précis :**
```
get_file_history
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  file_path: "src/server/proxy.ts"
```

**Exporter un snapshot (archive ou dossier) :**
```
export_snapshot
  project_path: /home/fkomp/Bureau/oracle/opencode-pollinations-plugin
  snapshot_ref: "v6.0.0"
  output_path: "/home/fkomp/Bureau/exports/v6.0.0"
  archive: true
```

### Règles Gencodedoc

- **Ne jamais travailler sans snapshot récent** sur un fichier critique (`proxy.ts`, `config.ts`, `index.ts`).
- **Toujours taguer** les snapshots de release — les IDs seuls sont difficiles à retrouver.
- **`restore_files`** est préférable à `restore_snapshot` complet — on ne restaure que ce qui est cassé.
- Après un `diff_versions`, relire attentivement avant de décider de restaurer.
- `generate_documentation` peut générer le fichier `src_tree_code.md` pour analyse complète — utile en début de refonte.

---

## 7. Documentation de Référence Externe

### API Pollinations

| Doc | Chemin local |
|-----|-------------|
| Free (legacy) | `Documentations/API/.../pollinations_free_legacy_ex/pollinations_APIDOCS.md` |
| Enter (simplifié) | `Documentations/API/.../pollinations_enter_beta/PollinationEnterDocSimplifie.md` |
| Enter (API JSON) | `Documentations/API/.../pollinations_enter_beta/PolinationsGenBeta_api.json` |

### OpenCode

| Doc | Accès |
|-----|-------|
| Docs officielles | https://opencode.ai/docs/ |
| Doc retravaillée IA | `Documentations/opencode.ai/OpenCode-Documentation-Complète.md` |
| NotebookLM | MCP notebooklm → compte "Etudes" → notebook "OPENCODE Documentations complete" |
| Clone local | `/home/fkomp/Bureau/oracle/utilitaires/_Repo_Clonned/opencode` |

### Scripts utilitaires

Tous dans `scripts/` : `test_keys.sh`, `repro_*.cjs`, etc.

---

## 8. Maintenance Rapide

| Besoin | Action |
|--------|--------|
| Debug logs runtime | `os.tmpdir()/pollinations-plugin/plugin.log` |
| Forcer verbose | `config.gui.logs = 'verbose'` |
| Snapshot avant refonte | `gencodedoc create_snapshot tag="pre-refonte"` |
| Voir diff depuis dernier tag | `gencodedoc diff_versions from_ref="<tag>"` |
| Restaurer un fichier cassé | `gencodedoc restore_files snapshot_ref="<tag>" file_filters=["..."]` |
| Vérifier état git | MCP github_fkom13 |

---

## 9. Objectifs en Cours (Roadmap Active)

> ⚠️ **Mettre à jour cette section à chaque début de session de dev.**

### Sprint actuel (Terminé)

- Sprint 1.5 : Tarification dynamique, Tinybird API, et Cost Guard avancé (x3) (Validé)
- Sprint 2 : Refonte complète du moteur de quota avec suppression du Ledger local au profit du Smart Fetch (Validé)

### Bloquants connus

_Aucun pour l'instant. Les conflits de types TypeScript ont été résolus._

### Prochaine version cible

- `v6.1.0` (Stable / Latest) — En attente de test de déploiement sur VPS Oracle avant la promotion.
