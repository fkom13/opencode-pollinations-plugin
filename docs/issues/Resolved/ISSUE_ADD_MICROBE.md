# Plan d'ajout du tier Microbe (0.1 pollen/jour)

## Objectif

Ajouter le tier "Microbe" (0.1 pollen/jour signup) dans le plugin pour aligner le code avec les règles officielles Pollinations.

---

## Compréhension

### Règles officielles (5 Tiers)
1. **Microbe** → 0.1 pollen/jour (signup)
2. **Spore** → 1 pollen/jour (auto-verified)
3. **Seed** → 3 pollen/jour (8+ dev points)
4. **Flower** → 10 pollen/jour (publish app + être Seed)
5. **Nectar** → 20 pollen/jour (coming soon)

### Code actuel
Le plugin gère seulement 4 tiers:
- Spore (1 pollen/jour)
- Seed (3 pollen/jour)
- Flower (10 pollen/jour)
- Nectar (20 pollen/jour)

### Problème
Le tier Microbe est manquant dans le code. Cela peut causer des erreurs si l'utilisateur a ce tier et que le plugin ne peut pas le gérer correctement.

---

## Fichiers à modifier

### 1. src/server/quota.ts

**Ligne 54** - Mettre à jour le commentaire du type:
```typescript
// AVANT:
tier: string; // 'spore', 'seed', 'flower', 'nectar'

// APRES:
tier: string; // 'microbe', 'spore', 'seed', 'flower', 'nectar'
```

**Lignes 67-72** - Ajouter microbe à TIER_LIMITS:
```typescript
// AVANT:
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

// APRES:
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    microbe: { pollen: 0.1, emoji: '🦠' },
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};
```

### 2. src/server/commands.ts

**Lignes 64-69** - Ajouter microbe à TIER_LIMITS:
```typescript
// AVANT:
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};

// APRES:
const TIER_LIMITS: Record<string, { pollen: number; emoji: string }> = {
    microbe: { pollen: 0.1, emoji: '🦠' },
    spore: { pollen: 1, emoji: '🦠' },
    seed: { pollen: 3, emoji: '🌱' },
    flower: { pollen: 10, emoji: '🌸' },
    nectar: { pollen: 20, emoji: '🍯' },
};
```

---

## Conséquences

### Impact positif
- **Alignment** avec les règles officielles Pollinations
- **Gestion complète** de tous les 5 tiers
- **Pas d'erreur** si utilisateur a le tier Microbe

### Impact neutre
- Les autres tiers ne sont pas affectés
- Les calculs de quota restent les mêmes
- Pas de changement visible pour l'utilisateur (sélection par API)

---

## Risques

### Risque nul
- Microbe a une valeur faible (0.1 pollen/jour) → très peu d'impact
- Les autres tiers restent inchangés
- Pas de rétrocompatibilité à préserver

---

## Estimation
- **Temps**: 5 minutes
- **Complexité**: Très basse
- **Tests**: Aucun test nécessaire (simple ajout de valeur)

---

## Validation
Après modification:
1. Vérifier que le type comprend 'microbe'
2. Vérifier que TIER_LIMITS inclut microbe avec pollen: 0.1 et emoji: '🦠'
3. Vérifier que les autres tiers sont inchangés
