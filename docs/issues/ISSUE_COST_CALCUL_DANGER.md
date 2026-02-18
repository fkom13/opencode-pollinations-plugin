# 🚨 URGENT : HOTFIX CRITIQUE - FUITE FINANCIÈRE (WALLET DRAIN)

## 🛑 Contexte & Bug Principal
Le plugin draine actuellement le Wallet payant des utilisateurs à cause d'un calcul erroné du "Tier Gratuit" restant dans `server/quota.ts`.

**La cause :** Le calcul actuel du `tierUsed` se base sur un filtrage de la route `/account/usage`. Or, cette route limite sa réponse aux **100 dernières requêtes**. Une fois les 100 requêtes dépassées dans la journée, les premières dépenses deviennent invisibles, le script croit qu'il reste du Free Tier, et laisse passer les requêtes lourdes (qui vident alors le Wallet).

**La vérité mathématique du système :**
1. L'endpoint `/account/balance` renvoie le TOTAL (Tier + Wallet).
2. L'équation `Wallet = Balance API - Tier Restant` est **CORRECTE**, mais seulement si le "Tier Restant" est calculé sans erreur.
3. Les modèles "Paid Only" tapent de toute façon directement dans le Wallet.
4. **Gestion du temps :** Le cycle de facturation (la date du jour) DOIT être déduit dynamiquement de la variable `nextResetAt` renvoyée par `/account/profile`, et non hardcodé, pour résister aux potentiels changements de fuseaux horaires ou de logique serveur.

## 🎯 Objectif du Fix
Basculer le calcul du `tierUsed` sur la route **`/account/usage/daily`** (qui contient les vrais agrégats du serveur, sans limite de 100 entrées), utiliser `nextResetAt` pour identifier la date en cours, réparer le calcul du Wallet, et activer les alertes de seuil.

---

## 🛠️ Instructions de Modification Strictes

### Étape 1 : `server/pollinations-api.ts` (Nouvelle data source)
Ajoute le typage et l'appel pour la route `daily`.
```typescript
export interface DailyUsageEntry {
    date: string; // Format "YYYY-MM-DD"
    model: string;
    meter_source: 'tier' | 'pack' | 'combined';
    requests: number;
    cost_usd: number;
}
export interface DailyUsageResponse {
    usage: DailyUsageEntry[];
}
// Crée la fonction getDailyUsage(apiKey: string) qui fetch [https://gen.pollinations.ai/account/usage/daily](https://gen.pollinations.ai/account/usage/daily)
Étape 2 : server/quota.ts (Le Cerveau Réparé)
C'est ici qu'il faut appliquer la correction mathématique.

Fetch : Dans getQuotaStatus, appelle getDailyUsage en plus de balance et profile.

Identification de la période (Timezone Safe) :

Utilise profile.nextResetAt (ex: "2026-02-18T00:00:00.000Z") pour déduire le lastReset (nextResetAt - 24 heures).

Convertis ce lastReset en string YYYY-MM-DD (ex: lastReset.toISOString().split('T')[0]). Ce sera notre currentDateString.

Calcul du Vrai Tier Utilisé (tierUsed) :

Filtre le tableau dailyUsage pour ne garder que les entrées où entry.date === currentDateString.

Additionne les cost_usd uniquement pour les meter_source === 'tier' (ou 'combined').

Maintien du calcul Wallet :

Calcule le reste : const tierRemaining = Math.max(0, tierLimit - tierUsed);

Applique la formule validée : const walletBalance = Math.max(0, balance - tierRemaining);

Correction du needsAlert :

Le code actuel ignorait config.thresholds.wallet.

Modifie l'évaluation : needsAlert doit être true SI (le % du tier restant est inférieur à thresholds.tier) OU SI (le walletBalance est inférieur à thresholds.wallet).

Étape 3 : server/commands.ts (Affichage)
Adapte la commande /pollinations usage pour qu'elle ne mente plus à l'utilisateur.

Passe les données dailyUsage (et le currentDateString calculé) à la fonction de génération de stats.

Les totaux globaux ("Total Dépensé", "Requêtes") DOIVENT provenir du calcul daily pour la période identifiée.

Le tableau listant les modèles un par un peut continuer à utiliser la route /usage classique pour le détail granulaire, MAIS il faut ajouter explicitement la mention "(Basé sur les 100 dernières requêtes)" dans l'UI pour que l'utilisateur comprenne pourquoi le tableau détaillé peut différer du total global affiché en haut.

⚠️ Règle de sécurité
Si la requête vers /account/usage/daily échoue, force un fallback pessimiste : considère que tierUsed a atteint sa limite (tierRemaining = 0), afin de protéger le Wallet et d'empêcher les modèles d'être appelés à découvert de manière incontrôlée.

Applique ces modifications immédiatement.
