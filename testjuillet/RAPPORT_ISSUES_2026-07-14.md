# RAPPORT D'ISSUES — Plugin v6.4.2 — 14 juillet 2026

## 1. Problème : affichage Quest/Paid dans le toast et /poll usage

### Symptôme
Le toast affiche : `🌸 Quest: 0.39/0.40 (98%) | 💎 Paid: $32.60 | ⏰ Reset: 0h20m`

Le `/poll usage` affiche : `Solde : 32.60 🌻 · 🎁 Quêtes ~18.39 · 💎 Payé ~14.19`

**Problème :** Les deux formats sont incohérents entre eux et peu clairs pour l'utilisateur.

### Analyse mathématique

Le toast utilise `quota.tierRemaining` (Quest Pollen de l'heure en cours) et `quota.walletBalance` (Paid Pollen total).

Le `/poll usage` split utilise une reconstruction différente :
```
total = tierRemaining + walletBalance
questPollen = max(0, claimedQuestTier - tierConsumedSinceClaim) + tierRemaining
paidPollen = max(0, total - questPollen)
```

Les deux calculs sont justes, mais ils racontent des choses différentes :
- Le toast montre le **refill horaire restant** + le **wallet total**
- Le split montre une **estimation du stash Quest accumulé** vs le **Paid**

### Solution proposée

**Toast — afficher les 3 composants :**
```
🌸 0.39/0.40 🌻 (refill) | 🎁 ~18.39 🌻 (stash) | 💎 ~14.19 🌻 (paid) | ⏰ Reset: 20m
```

**Modification :** `formatQuotaForToast()` doit appeler la même logique de split que `/poll usage`. Pas de calcul séparé.

### Fichiers à modifier
- `src/server/quota.ts:325-340` — `formatQuotaForToast()` : ajouter le split Quest stash
- `src/server/toast.ts:67-72` — passer les données de split dans le toast

---

## 2. Problème : modèles Community mélangés aux modèles normaux

### Symptôme
Dans `/poll models`, la liste des modèles texte mélange :
- Modèles officiels : `deepseek`, `openai`, `gemini`, `claude`, etc.
- Modèles Community : `YoannDev90/...`, `MarcosFRG/...`, `Catniti/...`, `Spit-fires/...`, `solarnode-developement/...`, `Circuit-Overtime/...`, etc.

Aucune distinction visuelle n'est faite.

### Analyse

Le `fetcher.ts` récupère `/text/models` qui inclut les modèles Community (créés par l'endpoint `/account/my-models`). Ces modèles ont un ID qui contient un `/` (format `user/model-name`), contrairement aux modèles officiels qui ont un ID simple.

**Règle de détection :** un modèle est Community si son ID contient un `/` (ex: `YoannDev90/gemini-3-pro`).

### Solution proposée

**Dans le worker (`worker.ts`) et les tables de modèles :**
- Ajouter un badge `[👥 Community]` pour les modèles dont l'ID contient `/`
- Ou les mettre entre `[...]` pour les distinguer

**Exemple d'affichage :**
```
| `YoannDev90/gemini-3-pro` [👥] | ... |
```

### Fichiers à modifier
- `src/server/models/worker.ts` — détection `/` dans le nom + badge `[👥]` dans les tables
- `src/server/models/types.ts` — ajouter champ `isCommunity?: boolean`
- `src/server/models/fetcher.ts` — détecter `isCommunity` (nom contient `/`)

---

## 3. Problème : validité des Quests (mensuel ou indéterminé ?)

### Source : POLLEN_FAQ.md officielle

```
Balances expire after 12 months of account inactivity.
```

### Analyse
Les quests n'ont **pas de limite mensuelle**. Le Pollen de quête est **indéterminé jusqu'à consommation**, avec une seule condition d'expiration : **12 mois d'inactivité du compte**.

Le Pollen de quête (`balanceBucket: "tier"`) et le Paid Pollen (`balanceBucket: "pack"`) suivent la même règle des 12 mois.

### Impact sur le plugin
- Le split Quest/Paid actuel est correct dans son calcul (pas besoin de reset mensuel)
- Le `claimedQuestTier` dans `commands.ts` cumule correctement toutes les quêtes claimées
- La seule subtilité : si un utilisateur est inactif 12 mois, son Quest Pollen expire — mais le plugin n'a pas à gérer ça (c'est côté Pollinations)

### Aucune modification nécessaire sur ce point.

---

## Plan d'action

| Priorité | Issue | Effort | Fichiers |
|----------|-------|--------|----------|
| 🔴 P0 | Toast : split Quest stash + refill + Paid | 1h | `quota.ts`, `toast.ts` |
| 🟡 P1 | Badge Community `[👥]` sur modèles user | 30min | `worker.ts`, `fetcher.ts`, `types.ts` |
| 🟢 OK | Validité Quests : confirmé 12 mois, pas d'action | 0 | — |