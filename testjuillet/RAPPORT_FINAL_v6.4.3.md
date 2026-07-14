# RAPPORT FINAL — Analyse v6.4.3

> **14 juillet 2026**  
> **Tests :** 51 modèles testés live, 197 modèles listés via API  
> **Objectif :** Préparer v6.4.3 (Toast 3 composants + Community badge + questStashInFreeMode)

---

## 1. Modèles Community — verdict définitif

### 1.1 Ils n'existent qu'en texte

`/image/models` → 0 Community / 38 modèles  
`/audio/models` → 0 Community / 14 modèles  
`/video/models` → 0 Community / 12 modèles  
`/text/models` → **74 Community / 135 modèles texte**

Aucun modèle Community en image, vidéo, audio, 3D, embedding, ou realtime.

### 1.2 Aucun n'a de capacités agent

**100% des 74 modèles Community :**
| Champ | Valeur |
|-------|--------|
| `tools` | `false` ou absent |
| `reasoning` | `false` ou absent |
| `context_length` | **Absent** (0/74) |
| `capabilities` | `[]` (vide) |

C'est plus grave que ce que je pensais. Ces modèles ne supportent **ni tools, ni reasoning, ni vision**. Ils sont strictement texte-in/texte-out, sans contexte connu. Leur seul intérêt est de faire du chat basique.

### 1.3 Stabilité : 82% OK mais lents et fragiles

Tests live : 36/44 OK (82%), mais :
- Latences 700ms-14.5s (vs 700ms-7s pour les officiels)
- 502 Bad Gateway fréquents (4/44)
- Timeouts (1/44)
- Aucune garantie de disponibilité

### 1.4 Peuvent-ils servir à l'agent ?

**Non.** Sans `tools: true`, l'agent ne peut pas les utiliser pour des tool calls. Sans `context_length`, OpenCode ne peut pas calculer la fenêtre de contexte. Sans `reasoning`, pas de chain-of-thought.

### 1.5 Recommandation finale

- **Afficher** dans `/poll models` avec badge `[👥]` — transparence
- **Jamais** en fallback auto (Safety Net) — trop instable
- **Jamais** dans les recommandations de tools (polli_web_search, etc.) — pas de tools
- **Pas de filtre** du chat — l'utilisateur peut les choisir manuellement s'il veut
- **Pas de paramètre configurable** pour l'instant — ils sont trop limités pour justifier un toggle

---

## 2. Nouveaux endpoints API — le plugin est en retard

### 2.1 État actuel du fetcher.ts

```typescript
// fetcher.ts — ce qu'il appelle
/image/models   ✅ (contient image + video)
/audio/models   ✅
/text/models    ✅
/v1/models      ✅ (merge structuraux)

// CE QUI MANQUE
/video/models   ❌ Nouvel endpoint ! 12 modèles
/3d/models      ❌ Nouvelle catégorie ! 4 modèles
/embeddings/models ❌ Nouvelle catégorie ! 5 modèles
/models         ❌ Endpoint unifié (197 modèles, 7 catégories)
```

### 2.2 Nouvelles catégories non gérées

| Catégorie | Modèles | Endpoint | Supporté ? |
|-----------|---------|----------|------------|
| `text` | 135 | `/text/models` | ✅ |
| `image` | 26 | `/image/models` | ✅ |
| `video` | 12 | `/video/models` | ⚠️ via /image/models |
| `audio` | 14 | `/audio/models` | ✅ |
| `3d` | 4 | `/3d/models` | ❌ |
| `realtime` | 1 | — | ❌ |
| `embedding` | 5 | `/embeddings/models` | ❌ |

### 2.3 Impact

Le `ModelRegistry` ne connaît pas les modèles 3D, realtime et embedding. Les outils `gen_edit_image_free` et `gen_video_free` utilisent d'autres APIs, donc pas d'impact sur les tools existants. Mais le `/poll models` est incomplet.

**Action :** Ajouter `/video/models`, `/3d/models`, `/embeddings/models`, `/models` au fetcher.

---

## 3. Détection du reasoning et variants

### 3.1 Comment l'API expose le reasoning aujourd'hui

L'API `/text/models` a DEUX indicateurs :
```json
{
  "capabilities": ["tool_calling", "reasoning"],  // array
  "reasoning": true,                                 // bool dédié
  "tools": true                                      // bool dédié
}
```

### 3.2 Notre détection (generate-config.ts)

```typescript
// Ligne 270 — correct
modelObj.reasoning = raw.reasoning === true;

// Ligne 284 — raisonnable mais pourrait utiliser capabilities
if (raw.reasoning === true || rawId.includes('thinking') || rawId.includes('reasoning'))

// Lignes 303-305 — safe_tokens variant
if (rawId.includes('claude') || rawId.includes('mistral') || rawId.includes('llama'))
```

**Verdict :** La détection est correcte. Les champs `reasoning`/`tools` de l'API sont fiables. Les variants `low`/`high` sont bien appliqués.

**Amélioration possible :** utiliser `capabilities.includes('reasoning')` au lieu de `rawId.includes('reasoning')` — plus robuste si un modèle change de nom.

### 3.3 Community models et variants

Les modèles Community n'ont ni `reasoning`, ni `tools`. Aucun variant n'est généré pour eux (sauf `safe_tokens` pour ceux qui contiennent "claude", "mistral" ou "llama" dans leur nom — ex: `Catniti/claude-sonnet-4.6`). C'est correct.

---

## 4. Toast 3 composants — conception

### Format cible

```
🌸 0.39/0.40 (refill) | 🎁 ~18.39 (stash) | 💎 ~14.19 (paid) | ⏰ 20m
```

### Ce qu'il faut modifier

1. `QuotaStatus` — ajouter `questStash: number`
2. `getQuotaStatus()` — calculer le stash Quest comme `/poll usage` le fait
3. `formatQuotaForToast()` — afficher les 3 composants
4. `toast.ts` — inchangé (il appelle déjà `formatQuotaForToast`)

### Calcul du stash Quest

Déplacer la logique de `commands.ts:318-357` dans `quota.ts` pour qu'elle soit accessible partout.

---

## 5. `questStashInFreeMode` — conception

### Paramètre

```typescript
// config.ts
questStashInFreeMode: boolean; // default true
// Le stash Quest accumulé est compté comme "free" pour le Safety Net alwaysfree
```

### Impact sur proxy.ts (Safety Net)

Actuellement :
```typescript
if (mode === 'alwaysfree' && quota.tierRemaining <= threshold)
    → fallback to free
```

Avec le paramètre :
```typescript
const effectiveFree = quota.tierRemaining + 
    (config.questStashInFreeMode ? quota.questStash : 0);
if (mode === 'alwaysfree' && effectiveFree <= threshold)
    → fallback to free
```

---

## 6. Plan d'action v6.4.3 — version finale

| # | Tâche | Fichiers | Effort |
|---|-------|----------|--------|
| **P0** | Toast 3 composants (refill + stash + paid) | `quota.ts`, `toast.ts` | 30min |
| **P0** | Stash Quest dans QuotaStatus | `quota.ts` | 15min |
| **P0** | `questStashInFreeMode` param + Safety Net | `config.ts`, `proxy.ts` | 30min |
| **P1** | Badge `[👥]` Community | `worker.ts`, `fetcher.ts` | 20min |
| **P1** | Nouveaux endpoints API | `fetcher.ts` | 30min |
| **P2** | Config tool + /poll config pour questStashInFreeMode | `commands.ts`, `polli_config.ts` | 15min |
| **P2** | Capabilities-based reasoning detection | `generate-config.ts` | 10min |
| — | Build + tests + snapshot + publish | — | 15min |
| **Total** | | | **~2h45** |

---

## 7. Ce qui NE change PAS

- **Adaptateurs proxy** : tous fonctionnent ✅
- **Modèles Community en chat** : restent listés, pas de filtre
- **Community en tools** : ne sont pas utilisés (ils n'ont pas `tools: true` de toute façon)
- **Model-Monitor** : ignoré, `api/model-stats` suffit

---

## 8. Résumé exécutif

- **Community models = texte uniquement, 0 capacités agent, instables** → badge [👥], jamais en fallback
- **7 nouvelles catégories API** (3d, realtime, embedding, + /video/models séparé) → à intégrer
- **Reasoning detection OK** → amélioration mineure (capabilities-based)
- **Toast 3 composants + questStashInFreeMode** → le cœur de v6.4.3