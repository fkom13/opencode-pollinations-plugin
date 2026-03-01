# 🗺️ Plan Projet — OpenCode Pollinations Plugin
## Studio de Production Média par IA

> **Version du plan** : 1.0 — 18 février 2026  
> **Version courante du plugin** : 6.1.0-beta  
> **Auteur** : @fkom13  
> **Statut** : Actif — 1 500+ téléchargements, tier Flower obtenu

---

## Table des Matières

1. [État Actuel du Projet](#1-état-actuel-du-projet)
2. [Vision](#2-vision)
3. [Revue Technique — Retours du Collaborateur](#3-revue-technique--retours-du-collaborateur)
4. [Architecture Cible](#4-architecture-cible)
5. [Roadmap Détaillée](#5-roadmap-détaillée)
6. [Dette Technique Identifiée](#6-dette-technique-identifiée)
7. [Priorités Immédiates](#7-priorités-immédiates)

---

## 1. État Actuel du Projet

### 1.1 Ce qui est livré et fonctionnel (v6.1-beta)

#### Infrastructure Core (`src/server/`)
| Module | État | Description |
|--------|------|-------------|
| `index.ts` | ✅ Stable | Point d'entrée, proxy HTTP port dynamique, registre tools |
| `proxy.ts` | ✅ Stable | Routeur Free/Enterprise, Safety Net, sanitisation modèles |
| `config.ts` | ✅ Stable | Config V5, priorité temporelle (`mtime`), lecture/écriture |
| `quota.ts` | ✅ Stable | QuotaStatus, cache 30s, logique paid-only, Ledger local |
| `commands.ts` | ✅ Stable | `/poll usage`, `/poll mode`, `/poll connect`, `/poll fallback`, `/poll config` |
| `generate-config.ts` | ✅ Stable | Découverte dynamique modèles Free + Enterprise, enrichissement variants |
| `toast.ts` | ✅ Stable | Canaux `status` / `log`, verbosité configurable, mode stealth |
| `status.ts` | ✅ Stable | Status bar via hook `session.idle` |
| `pollinations-api.ts` | ✅ Stable | Client API, usage détaillé, agrégation modèles |

#### Outils Agent (`src/tools/`)

**Génération — `tools/pollinations/`**
| Outil | État | Clé requise | Notes |
|-------|------|:-----------:|-------|
| `gen_image` | ✅ | Optionnelle | Free: sana, zimage. Paid: flux, kontext, seedream, seedream-pro, klein, gptimage, nanobanana... I2I sur 8 modèles |
| `gen_video` | ✅ | Oui | grok-video, ltx-2, wan, veo, seedance, seedance-pro. Jusqu'à 20s, aspect ratio configurable |
| `gen_audio` | ✅ | Oui | openai-audio (6 voix, défaut) + elevenlabs (34 voix). Formats mp3/wav/pcm16 |
| `gen_music` | ✅ | Oui | Jusqu'à 300s. Instrumental optionnel, seed pour reproductibilité |
| `transcribe_audio` | ✅ | Oui | openai-audio + whisper, multilingue, sauvegarde transcript |
| `deepsearch` | ✅ | Oui | Niveaux quick/standard/thorough, choix du modèle LLM |
| `search_crawl_scrape` | ✅ | Non | Recherche web + scraping page complète |

**Design — `tools/design/`**
| Outil | État | Clé requise | Notes |
|-------|------|:-----------:|-------|
| `gen_diagram` | ✅ | Non | Mermaid → SVG/PNG, thèmes default/dark/forest/neutral |
| `gen_palette` | ✅ | Non | 5 schémas, 3-8 couleurs, référence couleur ou image |
| `gen_qrcode` | ✅ | Non | Stylisé, taille 128-2048px |

**Power/Média — `tools/power/`**
| Outil | État | Clé requise | Notes |
|-------|------|:-----------:|-------|
| `remove_background` | ✅ | Non | Provider cut (gratuit) + BackgroundCut HD. Rotation clés multi-provider avec fallback automatique |
| `rmbg_keys` | ✅ | Non | Gestion pool clés BackgroundCut (add/list/remove/clear) |
| `extract_frames` | ✅ | Non | fps configurable, timestamp précis, metadata_only |
| `extract_audio` | ✅ | Non | mp3/wav/aac/flac, plages start/end |
| `file_to_url` | ✅ | Non | Upload local → URL publique, multi-provider avec fallback |

#### Fonctionnalités Safety Net
- **Transparent Fallback** : sur 402/429/401/403 Enterprise → bascule Free automatique + toast + injection warning dans le stream
- **Modes** : `manual` / `alwaysfree` / `pro`
- **Clés limitées** : détection automatique, bascule en manual, génération autorisée
- **Paid-only enforcement** : modèles premium vérifiés contre `walletBalance > 0`
- **Ledger local** : `~/.pollinations/usage_history.json` — tracking instantané sans lag API
- **Sanitisation enterprise** : Azure (120 tools max), Vertex/Gemini (dereference $ref), Kimi (anti-loop penalties), Nova (output limit)

#### Estimateur de coûts
Chaque outil génératif inclut :
- Estimation avant envoi (via fonction `estimateXxxCost()`)
- Coût réel extrait des headers de réponse (`x-usage-completion-*`)
- Affichage conditionnel (flag `isCostEstimatorEnabled()`)

### 1.2 Qualité du Code — Observations

**Points forts constatés dans le code :**
- TypeScript strict, interfaces bien définies (`QuotaStatus`, `PollinationsConfigV5`, `OpenCodeModel`)
- Séparation claire server/ (logique) / tools/ (fonctions métier)
- Gestion d'erreurs par catégorie dans chaque outil (402, 401, 429, réseau)
- Documentation inline des outils riche (tableaux de modèles, coûts, exemples)
- Rotation de clés BackgroundCut robuste (logique `isFallbackable`)
- Validation des voix par modèle dans `gen_audio`

**Points d'amélioration identifiés :**
- Chemins `/tmp/...` hardcodés dans `index.ts` → problème Windows potentiel
- Appels `fs.writeFileSync` synchrones dans les outils de génération → blocage agent
- `execSync` dans `index.ts` (nettoyage zombies legacy) → à supprimer
- Pas de tests unitaires actuellement
- `createRequire` pour lire `package.json` → peut être remplacé par `fs.readFileSync` ESM pur

---

## 2. Vision

### 2.1 Résumé en une phrase

Ce plugin donne à un agent IA **les yeux, les oreilles, la voix et les mains d'un studio de production média professionnel** — et Remotion est la salle de montage où tout se rassemble.

### 2.2 Les Quatre Couches du Pipeline

```
🔍 PERCEVOIR       extract_frames · transcribe_audio · extract_audio
       ↓
🎨 GÉNÉRER         gen_image · gen_video · gen_audio · gen_music · gen_diagram
       ↓  
✂️ TRAITER         remove_background · file_to_url · rmbg_keys
       ↓
🎬 COMPOSER        Remotion (React → frames → FFmpeg → MP4)
```

Chaque couche alimente la suivante. Les sorties d'un outil sont les entrées du suivant. C'est un pipeline, pas une collection.

### 2.3 Décision de design clé : `reference_image`

Présent sur `gen_image` **et** `gen_video`. Cela résout le problème de cohérence visuelle inter-modal : un personnage créé en image fixe peut être réutilisé en vidéo avec la même apparence. C'est la différence entre une série d'images disparates et une identité visuelle cohérente.

### 2.4 Les Pipelines Phares

**Pipeline A — Localisation vidéo automatique**
```
extract_audio → transcribe_audio → (agent traduit) → gen_audio → Remotion sync → MP4 localisé
```
Un pipeline de doublage complet. Marchés : e-learning, YouTube multilingue, formation corporate.

**Pipeline B — Récit visuel cohérent**
```
gen_image(personnage) → remove_background → gen_video(×N, reference_image=personnage)
→ gen_music(300s) → gen_audio(narration) → Remotion assemble → histoire.mp4
```
Même personnage, toutes les scènes. Production traditionnelle : 2 000-5 000 €. Ici : une conversation.

**Pipeline C — Démo produit automatisée**
```
extract_frames(screen_recording) → gen_audio(voix off) → gen_music(fond) 
→ gen_diagram(archi) → Remotion(intro + démo + archi + CTA) → demo.mp4
```

**Pipeline D — Rotoscopie et style transfer**
```
extract_frames(fps=24) → remove_background(×N) → gen_image(style, reference=frame) 
→ extract_audio → Remotion assemble → vidéo_stylisée.mp4
```

### 2.5 Évolution en Plateforme

```
v6.x  Plugin OpenCode     → agent dans l'éditeur
v6.3  MCP Server          → Claude.ai, Cursor, n8n, tout client MCP
v7.0  REST API Platform   → n'importe quel dev, CI/CD, automatisation
```

Même code, même Pollen, trois transports. Le plugin est le prototype de l'API.

---

## 3. Revue Technique — Retours du Collaborateur

Les points suivants sont issus de la revue externe du projet. Chacun est évalué, et la réponse technique est documentée.

---

### Point 1 — Gestion des erreurs dans les pipelines

**Remarque** : Dans les pipelines multi-étapes, si un outil échoue (modèle indisponible, fichier corrompu), y a-t-il des mécanismes de reprise ?

**Réponse** : ✅ **Déjà traité.**

Le Safety Net dans `proxy.ts` gère les échecs upstream avec fallback automatique sur tous les modèles texte/chat. Chaque outil retourne des messages d'erreur structurés par catégorie (402, 401, 429, réseau). Les toasts informent l'utilisateur en temps réel.

**Ce qui reste à faire :** Pour les pipelines d'outils (génération image, vidéo, audio), le fallback est actuellement géré au niveau du message d'erreur retourné. Un système de retry automatique avec modèle alternatif pour les outils génératifs est prévu en v6.2.

---

### Point 2 — Optimisation des coûts

**Remarque** : L'agent pourrait choisir dynamiquement le modèle le moins cher selon la tâche.

**Réponse** : ⏳ **Prévu en v7.0 — Smart Router.**

Actuellement, les descriptions d'outils incluent les coûts par modèle pour que l'agent choisisse intelligemment. L'estimateur de coûts dans chaque outil donne la visibilité nécessaire. Le routage automatisé coût/latence est la feature centrale de v7.0.

---

### Point 3 — Documentation développeurs

**Remarque** : Pour un développeur voulant utiliser les outils directement (hors agent), la documentation pourrait être enrichie.

**Réponse** : 🔜 **Planifié.**

Les descriptions d'outils dans le code sont déjà très détaillées (tableaux de modèles, coûts, exemples). La documentation externe (README, TECHNICAL_MANUAL) a été refaite. Des guides d'utilisation par pipeline restent à créer. Prévu en v6.2 dans la section "Contributing/Docs".

---

### Point 4 — Gouvernance des clés BackgroundCut

**Remarque** : Si toutes les clés sont épuisées, un mécanisme d'alerte serait utile.

**Réponse** : ✅ **Partiellement traité + plan d'extension.**

La rotation multi-clés avec fallback automatique vers le provider gratuit est en place. L'agent est informé via le message de retour de l'outil (`⚠️ BackgroundCut key may be expired`).

**Extension prévue** : Le système de notifications avancées (email, webhook, SMS) planifié en v6.2 couvrira ce cas d'usage : alerte quand toutes les clés RMBG sont épuisées.

---

### Point 5 — Performance et latence

**Remarque** : La génération vidéo/audio peut être lente. Des optimisations de parallélisation sont-elles prévues ?

**Réponse** : ✅ **Architecture planifiée.**

**Réponse de l'auteur** : Les outils de génération longue et massive seront asynchrones — ils retourneront un `task_id` immédiatement et le traitement se fera en fond via un worker asynchrone. L'utilisateur/agent peut interroger le statut ou recevoir une notification (email, webhook, SMS) quand c'est prêt.

Architecture prévue :
```
Tool call → Worker Queue → task_id retourné immédiatement
                  ↓
         Worker process (background)
                  ↓
         Notification (webhook/email/SMS) + résultat disponible
```

---

## 4. Architecture Cible

### 4.1 Stack Technique Complète

```
─────────────────────────────────────────────────────────────────────────
  CLIENTS (v6.x en production, v6.3+ à venir)
  OpenCode (éditeur)  │  n8n/Zapier/Make  │  Claude.ai  │  Any HTTP
─────────────────────────────────────────────────────────────────────────
  TRANSPORTS
  Plugin OpenCode     │  MCP Server        │  REST API
─────────────────────────────────────────────────────────────────────────
  REGISTRE D'OUTILS  (src/tools/)
  pollinations/       │  design/            │  power/
  gen_image           │  gen_diagram        │  remove_background
  gen_video           │  gen_palette        │  extract_audio
  gen_audio           │  gen_qrcode         │  extract_frames
  gen_music           │                     │  file_to_url
  transcribe_audio    │                     │  rmbg_keys
  deepsearch          │                     │
  search_crawl_scrape │                     │
─────────────────────────────────────────────────────────────────────────
  REMOTION ENGINE  (v6.2)
  gen_video_remotion_scaffold ──► render_remotion_video
  Webhook bridge ──► Remotion Studio live dans n'importe quel navigateur
  FFmpeg (déjà présent) ──► Export MP4/WebM
─────────────────────────────────────────────────────────────────────────
  INFRASTRUCTURE
  Pollinations API (Free Universe + Enterprise)
  Pollen quota system (Ledger + API)
  Webhook tunnel (local → public, via API gratuite existante)
  Worker Queue (async — v6.2)
  Notification System (email/webhook/SMS — v6.2)
─────────────────────────────────────────────────────────────────────────
```

### 4.2 Modèle d'Accès Pollen

| Tier | Pollen/Jour | Accès |
|------|:-----------:|-------|
| 🌱 Spore | 1 | Inscription |
| 🌿 Seed | 3 | Dev GitHub actif (8+ points) |
| 🌸 Flower | 10 | App publiée dans l'écosystème |
| 🍯 Nectar | 20 | Contributeur majeur |

Modèles paid-only (`seedance-pro`, `veo`, `elevenlabs`, `claude-large`, `gptimage-large`) → wallet requis en plus du grant journalier.

---

## 5. Roadmap Détaillée

### Phase 0 — Aujourd'hui (v6.1-beta) ✅

**État** : En production. 1 500+ téléchargements. Tier Flower actif.

Tout ce qui est décrit en section 1 est livré et fonctionnel.

---

### Phase 1 — Solidification (v6.2, Q1-Q2 2026)

**Thème : Rendre le code digne de la vision.**

#### 1A — Intégration Remotion (~2 semaines)

**Skill Remotion** (`~/.pollinations/skills/remotion/`)
- [ ] `tutorial.md` — `useCurrentFrame()`, `useVideoConfig()`, modèle de timing
- [ ] `components.md` — `<Sequence>`, `<Audio>`, `<Video>`, `<Img>`, `<AbsoluteFill>`, `interpolate()`
- [ ] `best-practices.md` — patterns d'animation, sync audio, composition multi-scènes
- [ ] `install.md` — `npm init video`, prérequis ffmpeg, `npm start` pour Studio

**Outil `gen_video_remotion_scaffold`**
- [ ] Input : titre, descriptions de scènes, durée totale, chemins assets (audio, images, clips)
- [ ] Appel `npx create-video` → génération structure projet
- [ ] Écriture `Composition.tsx` (1 composant par scène)
- [ ] Câblage audio (`gen_music` / `gen_audio` output → `<Audio src>`)
- [ ] Retour : chemin projet + commande `npm start`

**Outil `render_remotion_video`**
- [ ] Appel `renderMedia()` depuis `@remotion/renderer`
- [ ] Vérification runtime ffmpeg (check + instructions d'installation si absent)
- [ ] Output : chemin MP4 → pipeable vers `file_to_url`

**Webhook preview**
- [ ] Démarrage serveur dev Remotion en background
- [ ] Ouverture tunnel webhook vers `localhost:3000` (mécanisme existant)
- [ ] Retour URL publique Remotion Studio
- [ ] Compatible CLI, n8n, tout navigateur

#### 1B — Worker Asynchrone (~1 semaine)

- [ ] Interface `AsyncTask` : `{ id, status, result?, error?, created_at, completed_at }`
- [ ] Worker manager : file d'attente en mémoire (v1), Redis optionnel (v2)
- [ ] Outils concernés : `gen_video`, `gen_music`, `render_remotion_video`, `gen_image` (high quality)
- [ ] Endpoint `/tasks/:id` sur le proxy pour interroger le statut
- [ ] Retour immédiat du `task_id` dans l'outil
- [ ] Hook de complétion → notification (voir 1C)

#### 1C — Système de Notifications Avancées (~1 semaine)

- [ ] Module `src/server/notifications.ts`
- [ ] Canal **Webhook** : POST vers URL configurable (`/poll config webhook_url <url>`)
- [ ] Canal **Email** : SMTP configurable ou service tiers (Resend/Mailgun)
- [ ] Canal **SMS** : Twilio ou équivalent, optionnel
- [ ] Événements notifiables :
  - Tâche async terminée (succès / échec)
  - Quota tier sous le seuil configuré
  - Toutes les clés BackgroundCut épuisées
  - Wallet sous le seuil configuré
  - Erreur critique proxy
- [ ] Commande `/poll config notify_webhook <url>`
- [ ] Commande `/poll config notify_email <email>`

#### 1D — Commandes `/pollinations models` et `/pollinations pricing` (~3h)

Spec déjà complète dans `FEATURE_PRICING_MODELS_COMMANDS.md`.

- [ ] `src/server/models/fetcher.ts` — fetch parallèle 4 endpoints
- [ ] `src/server/models/formatter.ts` — rendu CLI tableaux
- [ ] `src/server/models/cache.ts` — cache 1h
- [ ] `src/server/models-command.ts` — orchestrateur
- [ ] Tests unitaires 3 modules (spec déjà écrite)
- [ ] Intégration dans `commands.ts`

#### 1E — Dette Technique (~1 semaine)

- [ ] Remplacer `/tmp/` hardcodé par `os.tmpdir()` dans `index.ts` (compatibilité Windows)
- [ ] Remplacer `fs.writeFileSync` par `fs.promises.writeFile` dans les outils génératifs
- [ ] Supprimer `execSync` legacy dans `index.ts`
- [ ] Config file watcher : `fs.watch()` sur `~/.pollinations/config.json` avec debounce 500ms
- [ ] Signature map LRU : cap à 1 000 entrées dans `proxy.ts`
- [ ] Log rotation : max 10MB par fichier, archive auto

#### 1F — Tests (~1 semaine)

- [ ] `proxy.ts` : routing Free/Enterprise, Safety Net fallback, sanitisation modèles
- [ ] `quota.ts` : calcul tier, cache, paid-only enforcement, clé limitée
- [ ] `tools/pollinations/gen_image.ts` : validation modèle, I2I check, fallback free
- [ ] `tools/power/remove_background.ts` : rotation clés, fallback gratuit
- [ ] `tools/power/file_to_url.ts` : multi-provider, fallback
- [ ] Framework : Jest ou Vitest (à définir selon compatibilité ESM)

---

### Phase 2 — Transport MCP (v6.3, Q2-Q3 2026)

**Thème : Les mêmes outils, accessibles partout.**

- [ ] Serveur MCP (`src/mcp/server.ts`) — exposition du registre `src/tools/`
- [ ] Authentification : passthrough clé Pollinations
- [ ] Test clients : Claude.ai, Cursor, Windsurf, n8n nœud MCP
- [ ] Gestion des transports : stdio (local) + HTTP (remote)
- [ ] Documentation d'intégration pour chaque client MCP testé
- [ ] Commande `/poll config mcp_port <port>`

---

### Phase 3 — REST API Platform (v7.0, Q4 2026)

**Thème : Infrastructure.**

**Endpoints**
```
POST /api/v1/generate/image
POST /api/v1/generate/video/clip         (Pollinations direct)
POST /api/v1/generate/video/compose      (Remotion pipeline)
POST /api/v1/generate/audio
POST /api/v1/generate/music
POST /api/v1/design/diagram
POST /api/v1/design/palette
POST /api/v1/media/remove-bg
POST /api/v1/media/extract-audio
POST /api/v1/research/search
POST /api/v1/research/deep
GET  /api/v1/tasks/:id                   (statut async)
GET  /api/v1/preview/:sessionId          (webhook → Remotion Studio)
```

**Infrastructure**
- [ ] Container Docker avec ffmpeg + Chromium headless (pour Remotion render)
- [ ] Rate limiting par clé API
- [ ] Billing Pollen par endpoint
- [ ] OpenAPI / Swagger documentation
- [ ] SDK TypeScript client (auto-généré depuis OpenAPI)

**Smart Router (v7.0)**
- [ ] Historique de latence par modèle (moving average)
- [ ] Sélection automatique modèle par rapport coût/qualité/latence
- [ ] Fallback multi-provider : Pollinations → OpenRouter → erreur
- [ ] Request queuing local avant upstream

---

### Phase 4 — Plateforme (v8.0, 2027)

- [ ] Dashboard web (monitoring, config, analytics)
- [ ] Team features (quotas partagés, clés d'équipe)
- [ ] Mémoire persistante (intégration vector DB pour agents long-running)
- [ ] Self-hosted gateway : déployer sa propre instance
- [ ] Agent orchestration : raisonnement multi-étapes avec mémoire

---

## 6. Dette Technique Identifiée

| Item | Fichier | Sévérité | Version cible |
|------|---------|:--------:|:-------------:|
| `/tmp/` hardcodé | `index.ts` L64 | 🟡 Medium | v6.2 |
| `fs.writeFileSync` synchrone | tous les outils | 🟡 Medium | v6.2 |
| `execSync` legacy | `index.ts` L53 | 🟢 Low | v6.2 |
| Pas de tests | tous modules | 🔴 High | v6.2 |
| Signature map non bornée | `proxy.ts` | 🟢 Low | v6.2 |
| Log sans rotation | `toast.ts`, `index.ts` | 🟡 Medium | v6.2 |
| Hot-reload modèles impossible | `index.ts` config hook | 🟢 Low | v6.2 |
| `createRequire` pour package.json | `index.ts` | 🟢 Low | v6.2 |

---

## 7. Priorités Immédiates

Dans l'ordre exact à traiter après cette session :

### Semaine 1-2
1. **Remotion Skill** (4 fichiers .md) — effort minimal, valeur maximale
2. **`gen_video_remotion_scaffold`** — la pièce centrale de la vision
3. **Webhook preview Remotion** — l'accès navigateur universel

### Semaine 3-4
4. **Worker asynchrone** — débloque toutes les générations longues
5. **Système de notifications** — email + webhook en premier, SMS optionnel
6. **`render_remotion_video`** — finalise le pipeline Remotion

### Semaine 5-6
7. **Commandes `/poll models` et `/poll pricing`** (spec déjà prête — 3h)
8. **Tests proxy + quota** (priorité haute, risque zéro régression)
9. **Dette technique** : `os.tmpdir()`, async fs, log rotation

### Semaine 7+
10. **Transport MCP** — ouverture vers Claude.ai, Cursor, n8n
11. **Tests tools/** — coverage complète
12. **Documentation pipelines** — guides par use case

---

## Annexe — Références

| Document | Description |
|----------|-------------|
| `README.md` | Documentation utilisateur GitHub |
| `TECHNICAL_MANUAL.md` | Architecture et référence modules |
| `CHANGELOG.md` | Historique de versions |
| `CONTRIBUTING.md` | Guide contributeurs |
| `VISION.md` | Vision plateforme complète |
| `FEATURE_PRICING_MODELS_COMMANDS.md` | Spec commandes models/pricing |
| [Remotion Docs](https://www.remotion.dev/docs) | Framework vidéo React |
| [pollinations.ai](https://pollinations.ai) | Plateforme IA source |
| [enter.pollinations.ai](https://enter.pollinations.ai) | Inscription + clé API |

---

*Généré le 18 février 2026 — [@fkom13](https://github.com/fkom13)*  
*Ce document est vivant. Il est mis à jour à chaque jalon significatif.*
