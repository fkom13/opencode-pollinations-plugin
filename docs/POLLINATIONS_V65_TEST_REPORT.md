# POLLINATIONS V6.5 TEST REPORT

**Projet :** opencode-pollinations-plugin
**Branch :** `v6.5-implementation`
**Date :** 2026-08-14

---

## 1. Commandes & versions

| Élément | Valeur |
|---|---|
| Node | `node` ≥ 18 (testé sur l'environnement local) |
| TypeScript | 5.x (`npm run build` → tsc strict) |
| Version testée | 6.5.0 (dist buildé) |

Commandes exécutées :
```text
npx tsc --noEmit                → PASS (0 erreur)
npm run build                   → PASS
node scripts/tests/test-suite.cjs    → 101/101 PASS
node scripts/tests/test-v65.cjs      → 166/166 PASS (Phase 3.1 gaps closed)
node scripts/tests/test-i18n.cjs     → 108/108 PASS
node scripts/tests/test-ux-vocab.cjs → PASS (0 violation vocabulaire legacy)
npm pack                        → PASS (133 fichiers, 246.1 kB)
npm publish --dry-run           → PASS (dry-run seulement)
```

## 2. Tests unitaires (test-suite.cjs) — 101 PASS

Couvrent : packaging (package.json/files/bin/engines), sortie build,
structure du registry, quota v6.5 (vérifie que `tierMetaForAllowance`,
`getKnownRefills`, `deduceAllowanceFromApi` sont **absents**),
formatQuotaForToast (Quest/Paid + auth_limited), proxy module, i18n légers,
réseau optionnel.

## 3. Contract tests v6.5 (test-v65.cjs) — 166 PASS (offline, CI-safe)

| Suite | Tests clés |
|---|---|
| Retry policy (R1) | `timeout_after_submission_does_not_retry`, `abort_does_not_retry`, `ambiguous_5xx_does_not_double_submit` (500/502/520), 402 no replay, 429 seule classe retryable |
| Reasoning (M8/M9) | DeepSeek stream strip, Kimi non-stream (`name:null` retiré, `function.name` préservé, `tools:null` retiré), Qwen (`reasoning`+`reasoning_details`), content jamais fusionné, `reasoning_tokens` préservés, passthrough OpenAI propre, `[DONE]` passthrough + **fixtures live réelles** (P24-kimi, T12-qwen) |
| Registry (P0.3) | `registry_serves_cached_value_within_ttl`, `registry_refreshes_after_ttl`, `registry_falls_back_offline`, `registry_concurrent_refresh_is_coalesced_if_possible` |
| TCR (P2) | `missing modelId for generic capability` (remove_background), endpoint vidéo canonique, LONG_BLOCKING, RECOVER_SAME_REQUEST, SERVER_DEDUP 3D, trellis 1200s/hyper3d 1800s, precedence per-call>model>capability>global, clamps 10/3600, validation |
| Artifact core | magic bytes JPEG/PNG/GLB/MP4/MP3/WebM/inconnu, persistance ext=réalité (cas b64 JPEG vs PNG), GLB write |
| 3D | GLB validation (faux buffer rejeté, glTF accepté), timeout capability 1800s, invariant no-resubmit |
| Billing migration | alwaysfree→quest, pro→paid, purge refillOverride/questStashInFreeMode, thresholds.tier→quest |
| Erreurs structurées | enveloppe `{success:false,...}` → kind, upstreamHost jamais dans le message (sanitizé en debug), 402/401/429/500, timeout/HTTP 402/network |
| Vidéo | endpoint `/video/{prompt}` dans TCR + code, `/3d/` dans gen_3d, pas de `if(model===)` dispersé |
| Confirmation 3D (gap A) | Dispatcher réel testé : Cost Guard 0.24>0.15 → suspension → pending request `polli_gen_3d` → `polli_gen_confirm(confirm)` → exécution avec symbole `polli_confirmed` (exec mocké, aucune génération live) |
| Extension stricte (gap B) | `my_image.png`+JPEG → `my_image.jpg`, `model.bin`+GLB → `model.glb`, `output.webm`+MP4 → `output.mp4` — chemin FS et ext retournée TOUJOURS d'accord |
| Config→exécution (gap C) | `capabilities.threeD=2400` → 2400 ; `overrides['trellis-2']=2000` → 2000 ; per-call 500 → 500 ; USER model > USER capability > built-in > global |
| Tentatives 429 (gap D) | fetch mocké : 429 = 1 initiale + 1 retry (MAX_RETRIES=1) ; timeout/réseau/5xx = 1 requête, aucune reprise |
| Vocabulaire legacy (gap E) | `test-ux-vocab.cjs` scanne locales/READMEs/src/docs (whitelists CHANGELOG, V65_MIGRATION, alias maps config/commands) |
| enablePaidTools (gap F) | Wording = blocage local paid_only + « pas de garantie serveur » — aucune promesse Quest-only |
| Retry TCR (gap G) | embed/upload (POST facturables) = NO_AUTOMATIC_RETRY ; médias RECOVER_SAME_REQUEST+SERVER_DEDUP ; async REPOLL_JOB ; local SAFE_READ_ONLY |
| Classification live (gap H) | Suites live marquées MANUAL/LIVE, exclues de npm test/prepublishOnly |

**Aucun test ne déclenche une génération payante.** Mocks et fixtures
runtime capturées uniquement.

## 4. i18n — 108 PASS

Parité de l'arbre de clés sur les 6 locales (en/fr/es/de/it/zh) + contenu
requis (free tools listés). Migration v6.5 appliquée (purge tier/refill,
nouvelles clés Quest/Paid/timeouts/3D).

## 5. OpenCode E2E / Canaries live — NON EXÉCUTÉS (gate humaine)

Réservés à la validation finale (Phase3 §30) :

| Canary | Coût attendu |
|---|---|
| A. Texte/reasoning : DeepSeek reasoning, Kimi tool call, Qwen reasoning, Luna clean | ≈ négligeable |
| B. Image cheap : 1 × flux | ≈ 0.002 |
| C. Vidéo : 1 × wan-fast | ≈ 0.05 |
| D. 3D : 1 × trellis low | ≈ 0.24 |
| **Total** | **≈ 0.292 🌻** (hard stop 0.40) |

Procédure : relever balance + `/account/usage` avant/après chaque canary,
enregistrer model/meter_source/coût/request id sanitizé. Aucun retry auto
d'une génération média ayant timeout.

## 6. Package installable

- `npm pack` → `opencode-pollinations-plugin-6.5.0.tgz` (246.1 kB, 133 fichiers).
- Inspection tarball : aucun `.env`, secret, `tmp/`, artefact d'audit.
- `npm publish --dry-run` → OK (aucun publish réel effectué).
- Tarball supprimé après inspection (hors repo).

## 7. Failures rencontrées et corrigées

1. `resolveCapabilityTimeout` appelé depuis le mauvais module dans le test
   (timeout-policy vs TCR) → corrigé.
2. `test-suite.cjs` attendait les APIs quota legacy supprimées → section
   réécrite pour tester l'absence des APIs + les nouveaux contrats.
3. Références `_STATIC_*` restantes après purge (estimateImageCost/
   estimateVideoCost, deprecated accessors) → réécrites sur le pricing
   catalogue.

## 8. Failures restantes

Aucune (0 failed sur les 3 suites). Les limitations fonctionnelles sont
documentées dans `POLLINATIONS_V65_IMPLEMENTATION_REPORT.md` §6.

## 9. Hashes / artefacts

| Artefact | Détail |
|---|---|
| dist/ | buildé par `tsc` (non commité, ignoré) |
| Tarball | supprimé après inspection (régénérable via `npm pack`) |
| Snapshot gencodedoc | `v6.5-before` (ID 1) / `v6.5-after` (créé en fin de phase) |
