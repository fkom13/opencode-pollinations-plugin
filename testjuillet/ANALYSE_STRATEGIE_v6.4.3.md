# ANALYSE & STRATÉGIE — Questions ouvertes v6.4.3

> Ne rien modifier avant validation de Franck.

---

## 1. Quest Pollen et mode alwaysfree

### État actuel

Le `getQuotaStatus()` retourne :
- `tierRemaining` : refill horaire restant (ex: 0.39/0.40 pour Flower)
- `walletBalance` : Paid Pollen total (~32.60)

Le **stash Quest accumulé** (~18.39) n'est PAS dans `getQuotaStatus()`. Il est calculé UNIQUEMENT dans `/poll usage` via `claimedQuestTier - tierConsumedSinceClaim`.

### Comment Pollinations facture (source : deduction.ts)

```
Modèles normaux (non paid_only) :
  1. tierBalance >= coût → utilise tierBalance (Quest Pollen)
  2. packBalance > 0    → utilise packBalance (Paid Pollen)
  3. Aucun              → passe tierBalance en négatif

Modèles paid_only :
  Toujours → packBalance
```

Le `tierBalance` côté Pollinations = **refill horaire accumulé + stash Quest non consommé**. C'est un seul bucket. La distinction "refill vs stash" est une invention du plugin pour le split visuel.

### Question à trancher

**Faut-il compter le stash Quest comme "free" dans le mode alwaysfree ?**

Option A — Considérer tout le `tierBalance` comme free :
- Le Safety Net `alwaysfree` bloque dès que `tierBalance` (refill + stash) < seuil
- Avantage : simple, aligné sur la réalité Pollinations (un seul bucket)
- Inconvénient : le stash peut être gros (18+) et masquer le fait que le refill est épuisé

Option B — Considérer uniquement le refill horaire comme free :
- Le Safety Net `alwaysfree` bloque dès que `tierRemaining` (refill) < seuil
- Le stash Quest est ignoré pour le alwaysfree
- Avantage : protège le refill horaire
- Inconvénient : l'utilisateur ne comprend pas pourquoi il est bloqué alors qu'il a 18+ de stash

Option C — Rendre configurable (recommandé) :
- Nouveau paramètre `questStashInFreeMode: true/false`
- Si true → le alwaysfree compte refill + stash comme "free"
- Si false → seul le refill horaire compte
- Défaut : true (comportement le plus intuitif)

### Recommandation
**Option C** — configurable, défaut true. Ajouter le stash Quest dans `QuotaStatus` pour que le Safety Net puisse le lire.

---

## 2. Modèles Community : analyse des capacités

### Détection

Règle simple : un modèle est Community si son nom contient `/` (ex: `YoannDev90/gemini-3-pro`). Les modèles officiels ont un nom simple (ex: `deepseek`, `openai`).

### Capacités actuelles (depuis l'API)

| Modèle | tools | vision | reasoning | Contexte |
|--------|-------|--------|-----------|----------|
| `MarcosFRG/gemini-3-flash-preview` | Oui | Oui | Non | ? |
| `MarcosFRG/gemini-2.5-flash-lite` | Oui | Oui | Non | ? |
| `YoannDev90/gemini-3-pro` | Oui | Non | Non | ? |
| `Circuit-Overtime/lixsearch` | Oui | Non | Non | ? |
| `YoannDev90/gpt-4o-mini-search-preview` | Oui | Non | Non | ? |
| `polly` | Oui | Oui | Oui | ? |
| `Catniti/*` | Non | Non | Non | Variable |
| `Spit-fires/*` | Non | Non | Non | Très petit |

### Nos adaptateurs proxy — fonctionnent-ils ?

Les adaptateurs appliqués dans `proxy.ts` :
- **Azure/GPT :** truncate tools à 120, truncate tool_call IDs à 40 → **OK pour tous** (règles génériques)
- **Gemini :** dereference $ref, disable google_search_retrieval → appliqué si le modèle contient "gemini" dans son nom → **OK pour MarcosFRG/gemini-*, YoannDev90/gemini-***
- **Kimi :** frequency_penalty, stop tokens → appliqué si "kimi" ou "moonshot" → **OK**
- **Nova :** output cap 8000 → appliqué si "nova" → **OK**

Les adaptateurs sont basés sur des patterns dans le nom du modèle, donc ils s'appliquent aussi aux modèles Community qui contiennent ces patterns. **Pas de risque identifié.**

### Les modèles Community tool-capable marchent-ils ?

Les modèles avec `tools: true` (MarcosFRG, YoannDev90, Circuit-Overtime, polly) passent par le même proxy que les officiels. S'ils sont OpenAI-compatibles et supportent le format `tools[]`, ils devraient fonctionner.

**Risque :** Ces modèles sont taggés "Unstable" dans leurs descriptions. Ils peuvent être down, lent, ou avoir des comportements erratiques. Les adaptateurs (Gemini signature tracking, etc.) peuvent ne pas marcher si le provider a changé son format de réponse.

### Question à trancher

**Faut-il exposer les modèles Community comme utilisables par l'agent/les tools/le chat ?**

Option A — Les cacher complètement :
- On filtre les modèles avec `/` dans le nom
- L'agent ne les voit pas, ne peut pas les utiliser
- Avantage : zéro risque, zéro support
- Inconvénient : on perd des modèles potentiellement utiles (polly, lixsearch)

Option B — Les afficher mais avec badge [👥] :
- Visibles dans `/poll models` avec badge
- Utilisables par le chat si l'utilisateur les choisit
- **Pas** proposés comme fallback agent automatique
- **Pas** dans les listes de modèles recommandés par les tools
- Avantage : transparence, l'utilisateur choisit
- Inconvénient : risque que l'agent les choisisse si on ne filtre pas

Option C — Configurable (recommandé) :
- Nouveau paramètre `communityModelsEnabled: true/false` (défaut false)
- Si true → badge [👥], utilisables partout
- Si false → filtrés des listes, jamais proposés
- Avantage : contrôle total
- Inconvénient : un paramètre de plus

### Recommandation
**Option B immédiate** (badge, pas de fallback auto) + **Option C à terme** (configurable). Le badge est trivial à implémenter et résout le problème de visibilité.

---

## 3. État des modèles — à tester

### Modèles à vérifier (spot-check)

| Modèle | Type | À tester |
|--------|------|----------|
| `flux` | Image Free | Génération simple |
| `deepseek` | Texte | Chat basique |
| `perplexity-fast` | Search | Recherche web |
| `MarcosFRG/gemini-3-flash-preview` | Community | Chat + tools |
| `polly` | Community | Chat + tools |
| `openai-audio` | Audio Free | TTS |

### Providers forké — changements ?

Les providers comme `Catniti/*`, `Spit-fires/*`, `vendouple/*`, `sharktide/*` sont des proxy communautaires. Leur stabilité est inconnue. Le ModelRegistry les liste mais ne garantit pas leur fonctionnement.

---

## 4. Résumé des décisions à prendre

| # | Question | Recommandation |
|---|----------|----------------|
| 1 | Quest stash dans alwaysfree ? | Option C — paramètre `questStashInFreeMode` (défaut true) |
| 2 | Modèles Community dans les listes ? | Badge [👥], pas de fallback auto |
| 3 | Modèles Community configurables ? | Plus tard (v6.5), pas maintenant |
| 4 | Toast affichage 3 composants | Oui — refill + stash + paid |

---

## 5. Ordre des opérations proposé

1. **P0.5** — Tester spot-check modèles (vérifier que les principaux marchent)
2. **P0** — Toast 3 composants + stash Quest dans QuotaStatus
3. **P1** — Badge [👥] Community dans les tables
4. **P1** — Paramètre `questStashInFreeMode` + Safety Net adapté
5. **Build + tests + snapshot + publish v6.4.3**