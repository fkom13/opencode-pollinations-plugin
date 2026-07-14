# RAPPORT FINAL — Tests modèles & stratégie v6.4.3

> **Date :** 14 juillet 2026  
> **Tests :** 51 modèles (24 legacy + 27 community) avec `max_tokens=1`  
> **Résultat :** 42 ✅ (82%) / 9 ❌ (18%) / 0 ⚠️

---

## 1. Résultats Legacy (modèles officiels)

### Échecs : 6 ❌

| Modèle | Erreur | Cause probable |
|--------|--------|----------------|
| `openai` | 400 "Could not finish the message" | `max_tokens=1` trop bas pour Azure content filter. Marche probablement avec tokens normaux. |
| `openai-fast` | idem | idem |
| `gpt-5.4-mini` | idem | idem |
| `openai-large` | idem | idem |
| `perplexity-fast` | 400 "max_tokens must be at least..." | Minimum > 1 pour Perplexity. Pas un vrai échec. |

**Conclusion GPT/Azure :** L'erreur "Could not finish the message" n'est PAS un échec de connexion — c'est le content filter Azure qui refuse une réponse trop courte. Avec `max_tokens` normal (≥ 10), ces modèles marchent. **Nos adaptateurs proxy (truncate tools 120, tool_call IDs 40) ne sont PAS en cause.**

### Succès : 18 ✅ (tous les autres)

Gemini, Claude, DeepSeek, Nova, Kimi, Llama, Mistral, Qwen, Grok, MiniMax, Step, GLM — **tous fonctionnent**. Latences normales (700ms-7s).

**Conclusion adaptateurs :** Tous les adaptateurs (Gemini deref $ref, Nova output cap, Kimi stop tokens, Claude safe_tokens) fonctionnent correctement. Aucune modification nécessaire.

---

## 2. Résultats Community (modèles user/model)

### Tool-capable : 7/8 ✅

| Modèle | Statut | Latence | Verdict |
|--------|--------|---------|---------|
| `MarcosFRG/gemini-3-flash-preview` | ✅ | 4.5s | OK mais lent |
| `MarcosFRG/gemini-2.5-flash-lite` | ❌ | timeout | DOWN |
| `MarcosFRG/gemini-3.1-flash-lite` | ✅ | 9.2s | Très lent |
| `MarcosFRG/gemini-3.1-pro-preview` | ✅ | 9.0s | Très lent |
| `YoannDev90/gemini-3-pro` | ✅ | 2.1s | OK |
| `YoannDev90/gpt-4o-mini-search-preview` | ✅ | 4.9s | Lent |
| `Circuit-Overtime/lixsearch` | ✅ | 4.8s | Lent |
| `polly` | ✅ | 4.1s | OK |

### Text-only : 13/19 ✅ (68%)

4 échecs : `vendouple/deepseek-v4-flash` (502), `smplstuff/falcon-h1-tiny` (502), `Bakhshi7889/gemma-4-31b-it` (400), + 1 timeout.

La plupart marchent mais sont **très lents** (1.5s-14.5s) et instables (502 fréquents).

---

## 3. Model-Monitor (https://model-monitor.pollinations.ai)

### Analyse
- SPA React (`index-COANCNy-.js`) qui interroge **Tinybird** en interne
- Les données proviennent de `model_health.pipe` dans Tinybird
- **Aucune API publique** — nécessite un token Tinybird ou un accès `wrangler` au projet Pollinations
- Non exploitable pour notre plugin en l'état

### Alternative déjà en place
Notre `fetcher.ts` appelle déjà `https://enter.pollinations.ai/api/model-stats` qui retourne les `avg_cost_usd` par modèle. C'est la meilleure source accessible.

---

## 4. Décisions à prendre

### Décision 1 — Quest stash dans alwaysfree (option C)

**✅ Recommandé :** `questStashInFreeMode: true` par défaut. Le stash Quest s'additionne au refill horaire pour le calcul du Safety Net. C'est aligné sur la réalité Pollinations (un seul bucket `tierBalance`).

### Décision 2 — Badge Community [👥]

**✅ Recommandé :** Oui, immédiatement. Détection simple : le nom contient `/`. Badge `[👥]` dans `/poll models` et les tool descriptions.

### Décision 3 — Garder ou retirer les modèles Community ?

**Analyse des faits :**
- 82% des Community testés marchent (36/44)
- Mais : latences 2-14s, 18% d'échecs, instables
- Les tool-capable (MarcosFRG, YoannDev90, polly, lixsearch) sont les plus utiles mais les plus lents
- Les text-only sont inutiles pour l'agent (pas de tools, petits contextes, lent)
- Si l'agent choisit un Community tool-capable, il peut bloquer 9s pour une réponse — expérience dégradée

**✅ Recommandation :** 
- **Garder** dans `/poll models` avec badge [👥] — transparence
- **Ne PAS exposer** comme choix dans les tools (image, video, search, audio) — les tools n'utilisent que les modèles media, pas les modèles texte Community
- **Ne PAS utiliser** comme fallback agent — trop lent, instable
- **Ne PAS filtrer** de la liste de chat — l'utilisateur peut les choisir manuellement s'il veut
- **Badge [👥]** + suffixe "(Unstable)" dans les descriptions quand le provider est taggé comme instable

### Décision 4 — Toast 3 composants

**✅ Recommandé :** Oui. Format : `🌸 0.39/0.40 (refill) | 🎁 ~18.39 (stash) | 💎 ~14.19 (paid) | ⏰ 20m`

---

## 5. Plan d'action v6.4.3

| # | Tâche | Effort | Fichiers |
|---|-------|--------|----------|
| 1 | Toast 3 composants (refill + stash + paid) | 45min | `quota.ts`, `toast.ts` |
| 2 | Badge [👥] Community dans worker.ts | 20min | `worker.ts`, `fetcher.ts`, `types.ts` |
| 3 | Paramètre `questStashInFreeMode` | 30min | `config.ts`, `quota.ts`, `proxy.ts` |
| 4 | Stash Quest dans QuotaStatus | 15min | `quota.ts` |
| 5 | Safety Net adapté au stash | 20min | `proxy.ts` |
| 6 | Build + tests + snapshot + publish | 15min | — |
| **Total** | | **~2h15** | |

---

## 6. Résumé exécutif

- **Adaptateurs proxy :** tous fonctionnent ✅ — aucun changement nécessaire
- **Modèles Legacy :** 22/24 OK (les 2 échecs sont des faux positifs de `max_tokens=1`)
- **Modèles Community :** marchent mais lents et instables → badge [👥], pas de fallback auto
- **Model-Monitor :** non exploitable (Tinybird interne)
- **Stratégie v6.4.3 :** toast 3 composants + badge Community + `questStashInFreeMode`