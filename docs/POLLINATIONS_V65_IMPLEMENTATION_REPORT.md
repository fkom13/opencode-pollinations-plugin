# POLLINATIONS V6.5 IMPLEMENTATION REPORT

**Projet :** opencode-pollinations-plugin
**Branch :** `v6.5-implementation` (locale, non poussée)
**De :** v6.4.10 (`bf2103b`) **→ Cible :** v6.5.0
**Date :** 2026-08-14

---

## 1. Architecture avant / après

### Avant (v6.4.10)
- Billing basé sur des concepts morts : refill horaire déduit (`KNOWN_REFILLS`,
  `deduceAllowance*`, `TIER_INFO`), modes `alwaysfree`/`pro`.
- `reasoning_content` (DeepSeek/Kimi) et `reasoning`/`reasoning_details` (Qwen)
  passaient **tels quels** dans OpenCode (pollution texte confirmée E2E).
- `fetchWithRetry` rejouait après `AbortError`/timeout/5xx/520 → risque de
  double facturation (streaming texte NON idempotent upstream).
- Execution behavior (endpoints, timeouts, retry) dispersé dans ~9 fichiers,
  avec 3 tables statiques dupliquant le Model Registry.
- Registry avec TTL mais refresh jamais déclenché pendant une session longue.
- Pas de tool 3D (le registry chargeait `/3d/models` sans consommateur).

### Après (v6.5)
```
Pollinations live catalog
          |
          v
Canonical Model Registry (auto-refresh TTL, offline fallback)
          |
     +----+------------------+
     |                       |
     v                       v
OpenCode Projection     Tool Capability Registry (capability-centric)
                              |
                              v
                       Timeout Hierarchy + Execution Policies
                              |
              +---------------+-------------------+
              |               |                   |
              v               v                   v
          Pollinations    Free Services        Local
              |               |                   |
              +---------------+-------------------+
                              v
                         Artifact Core (magic bytes)
```
Invariants : Model Registry = quoi existe · Tool Registry = comment l'utiliser
· Execution Core = comment l'exécuter fiablement · Artifact Core = entrées/sorties.

## 2. Fichiers modifiés / créés

### Modifiés
| Fichier | Changement |
|---|---|
| `src/server/proxy.ts` | Politique retry (`classifyRetry`), normalisation reasoning (M8/M9) via `normalizeChunkLine` + processeur SSE unifié `streamSseUpstream` (fusion des 2 boucles dupliquées), safety nets Quest/Paid (`quest`/`quest_only`/`paid`), blocage paid_only en `quest_only`, `isPaidOnlyModel` centralisé. |
| `src/server/quota.ts` | Purge tier/refill (M1–M4) ; `QuotaStatus` Quest/Paid (questBalance/walletBalance/totalBalance) ; fetchAPI borné (10s). |
| `src/server/config.ts` | Modes `quest`/`quest_only`/`paid`/`manual`, migration `migrateV65Config` (alwaysfree→quest, pro→paid, thresholds.tier→quest, purge refillOverride/questStashInFreeMode), champ `timeouts`. |
| `src/server/commands.ts` | Mode command (alias legacy), usage Quest/Paid, config timeouts.*, purge refillOverride/questStashInFreeMode/threshold_tier, table tiers → page Quest/Paid, dead code retiré. |
| `src/server/tier-info.ts` | **Supprimé** (TIER_INFO + table tiers). |
| `src/server/status.ts`, `toast.ts`, `connect-response.ts` | Affichage Quest/Paid + timeouts sur fetch profile. |
| `src/server/models/cache.ts` | `ModelRegistryImpl` testable (options ttlMs/fetcher/diskCache), auto-refresh sur get/list/all, coalescence par promesse, fallback offline, `lastRefreshAt()`. |
| `src/tools/pollinations/shared.ts` | Purge `_STATIC_PAID_IMAGE_MODELS`/`_STATIC_VIDEO_MODELS`/`_STATIC_AUDIO_MODELS`/`_STATIC_I2V_ONLY` ; estimation des coûts via pricing catalogue ; `httpsGet` avec timeout par appel clampé ; conservés : `_STATIC_AUDIO_ENDPOINTS`, `VIDEO_NO_AUDIO_MODELS` (transport rules non exposées par le catalogue). |
| `src/tools/pollinations/gen_image.ts` | `timeout_seconds`, save magic-bytes (`persistArtifact`), erreurs structurées (`parsePolliErrorFromThrow`). |
| `src/tools/pollinations/gen_video.ts` | Endpoint canonique `/video/{prompt}`, `timeout_seconds`. |
| `src/tools/pollinations/gen_music.ts` | Timeout = durée + 60s (fini le timeout systématique >300s). |
| `src/tools/pollinations/transcribe_audio.ts` | Download URL borné (fetch 60s au lieu de http.get sans timeout). |
| `src/tools/pollinations/beta_discovery.ts` | fetch OpenAPI borné (10s). |
| `src/tools/pollinations/polli_config.ts` | Modes v6.5, thresholdsQuest/Wallet pollen, purge refill args. |
| `src/tools/pollinations/cost-guard.ts` | Catégorie `3d` acceptée. |
| `src/tools/index.ts` | Enregistrement `polli_gen_3d`. |
| 6 × `src/locales/*.json` | Migration complète (parité 108/108), nouvelles clés Quest/Paid/timeouts/3D, purge clés tier/refill. |
| `scripts/tests/test-suite.cjs` | Section quota mise à jour (vérifie l'ABSENCE des APIs legacy). |
| `README.md`, `README.de.md`, `README.zh.md` | Sections Quest/Paid + modes v6.5 (purge refill/tiers). |
| `package.json` | Scripts `test:v65`, chaîne de test étendue. |

### Créés
| Fichier | Rôle |
|---|---|
| `src/tools/pollinations/timeout-policy.ts` | Hiérarchie timeout + clamp + validation per-call. |
| `src/tools/pollinations/tool-capability-registry.ts` | TCR déclaratif capability-centric (modes d'exécution, retry, recovery, backendOverrides). |
| `src/tools/pollinations/artifact-core.ts` | Magic bytes, résolution d'input multi-source, persistance ext=réalité. |
| `src/tools/pollinations/error-parser.ts` | Parsing d'erreurs structuré (enveloppe `{success,code,details}`), sanitisation upstreamHost/Body. |
| `src/tools/pollinations/gen_3d.ts` | `polli_gen_3d` (trellis-2/hyper3d-rodin, GLB, recovery cache). |
| `src/tools/pollinations/polli_gen_confirm.ts` | **Fix regression** : `polli_gen_3d` ajouté au dispatcher de confirmation (gap A). |
| `scripts/tests/test-v65.cjs` | Suite contract v6.5 (166 tests — gaps Phase 3.1 fermés). |
| `scripts/tests/test-ux-vocab.cjs` | Garde sémantique du vocabulaire legacy (tier/refill/alwaysfree) sur locales/READMEs/src/docs. |
| `docs/V65_MIGRATION.md`, `docs/POLLINATIONS_V65_IMPLEMENTATION_REPORT.md`, `docs/POLLINATIONS_V65_TEST_REPORT.md` | Docs livrables Phase 3. |

## 3. Décisions de design

1. **Retry chat = 429 uniquement.** Streaming texte non idempotent upstream
   (exclu de la dédup) → tout replay de body identique peut refacturer.
   AbortError/timeout/réseau/5xx/520/402 → `NO_RETRY`.
2. **Médias = RECOVER_SAME_REQUEST** (re-requête identique → cache hit non
   refacturé), jamais de re-soumission automatique après timeout.
3. **`QUEST_ELIGIBLE_ONLY` renommé UX `quest_only`** — le contrat (blocage
   local paid_only, best-effort, pas de re-route paid) est celui du §10 de
   Phase3 ; la doc dit explicitement qu'un débit pack peut arriver.
4. **Seuils en pollen absolus** (plus de %) : les anciens % portaient sur un
   tier limit mort.
5. **Registry**: refresh coalescé en arrière-plan déclenché par TOUS les
   chemins de lecture (get/list/all) quand stale ; fallback STATIC_FALLBACK
   conservé ; aucun fetch à chaque appel (TTL 1h).
6. **Pas de job local async** (Q12) : pas de persistance de job fiable côté
   OpenCode ; la récupération passe par la re-requête identique.
7. **Statiques supprimés** uniquement quand la source dynamique existe
   (registry) ou que l'override transport n'est pas exposé par le catalogue
   (conservé alors dans le TCR/shared).

## 4. R1–R10 (audit Phase 2.2) — statut

| # | Action | Statut |
|---|---|---|
| R1 | Fix retry double-facture | ✅ `classifyRetry` + tests nommés |
| R2 | ToolCapabilityRegistry | ✅ déclaratif + tests |
| R3 | artifact-core (primitives Free) | ✅ + tests magic bytes |
| R4 | Hiérarchie timeout + per-call | ✅ config + tests precedence/clamp |
| R5 | Purge statiques | ✅ D1–D4/D9 (parser erreurs factorisé, KEYS_FILE/fetchQuota doublons existants hors scope minimal — voir limitations) |
| R6 | Timeouts manquants | ✅ quota/transcribe/beta_discovery/gen_music |
| R7 | AbortSignal propagé + doc | ⚠️ partiel — policy documentée (local abort ≠ upstream cancel) ; propagation explicite non ajoutée aux tools (voir limitations) |
| R8 | polli_gen_3d | ✅ |
| R9 | Politique retry par mode d'exécution | ✅ TCR (NO_AUTOMATIC_RETRY / SAFE_READ_ONLY / RECOVER_SAME_REQUEST / REPOLL_JOB) |
| R10 | Contract tests | ✅ test-v65.cjs (96 tests offline) |

## 5. M1–M22 (scope v6.5) — statut

- M1–M5 ✅ (purge tier/refill + modes billing)
- M6 ⚠️ partiel (estimations vidéo/image/3D lisent le pricing catalogue ; la
  mise à jour manuelle des chiffres seedance/veo reste via registry)
- M7 ✅ (paid_only dynamique + blocage quest_only)
- M8–M11 ✅ (reasoning strip, tokens préservés, pas de reconstruction)
- M12–M13 ✅ (statiques purgés ; liste free connect-response dynamique déjà existante)
- M14 ✅ (BACKEND_SPECIFIC groupés : TCR backendOverrides + VIDEO_NO_AUDIO_MODELS)
- M15 ✅ (manual.ts conservé tel quel)
- M16 ✅ (registry dynamique + refresh)
- M17–M19 ✅ (BYOP conservé, client_id inchangé, pas de pk_ directe)
- M20–M22 ✅ (contract tests reasoning/retry + migration tests)

## 6. Limitations connues

1. **AbortSignal propagation** : la politique est documentée mais les tools
   média n'acceptent pas encore un AbortSignal externe (l'arrêt local coupe
   l'attente, pas l'upstream — inchangé vs v6.4.10). Candidat v6.6.
2. **KEYS_FILE/fetchQuota doublons** (D12/D13 de la matrice) : non refactorisés
   (out of scope minimal — remove_background/clients.ts déjà stables et testés).
3. **`/account/balance` sans split** : Quest/Paid reste une estimation locale ;
   la vérité est `meter_source` (documenté honnêtement).
4. **Community models** : toujours exposés par le registry tel que v6.4.10
   (déféré v6.6).
5. **Live canaries** : non exécutés par cet agent (gate humaine) — voir
   TEST_REPORT pour la procédure et le budget prévu (~0.292 🌻, stop 0.40).
6. **`x-request-id`** : pas traité comme clé d'idempotence (le contrat
   upstream ne le garantit pas).

## 7. Statiques supprimés vs conservés

| Supprimés | Conservés |
|---|---|
| `_STATIC_PAID_IMAGE_MODELS`, `_STATIC_VIDEO_MODELS`, `_STATIC_AUDIO_MODELS`, `_STATIC_I2V_ONLY` (vide), `KNOWN_REFILLS`, `TIER_INFO`, `deduceAllowance*`, `tierMetaForAllowance`, `getKnownRefills`, `refillOverride`, `questStashInFreeMode`, clés i18n tier/refill | `STATIC_FALLBACK` (offline cache.ts), `_STATIC_AUDIO_ENDPOINTS`, `VIDEO_NO_AUDIO_MODELS`, `_STATIC_MUSIC_MODEL`, `manual.ts` patches, voix offline de gen_audio.ts |
