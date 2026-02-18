# 🚧 Roadmap Pollinations Plugin - Prompt System & Variants

## 🔴 PROBLÈME 1: Variants non respectés

### Symptôme
Les `maxTokens` définis dans `variants.safe_tokens` ne sont pas respectés par les modèles.

### Analyse
- Le code définit bien les variants (lignes 264-266 de `generate-config.ts`)
- Mais OpenCode n'injecte pas les limites dans le prompt système par défaut
- Exemple: `modelObj.variants.safe_tokens = { options: { maxTokens: 8000 } }`
- Mais le modèle continue de générer sans limiter le texte

### Solution
Utiliser le hook **experimental.chat.system.transform** pour forcer le prompt:

```typescript
"experimental.chat.system.transform": async (input, output) => {
    const models = await generatePollinationsConfig();
    const modelId = input.model.id;
    const model = models.find(m => m.id === modelId);

    if (model && model.limit) {
        output.system.push(
            `⚠️ MODEL LIMITS:\n` +
            `Context Window: ${model.limit.context || 'Not specified'} tokens\n` +
            `Max Output: ${model.limit.output || 'Not specified'} tokens\n` +
            `Adapt your responses accordingly.`
        );
    }

    if (model && model.variants?.safe_tokens) {
        output.system.push(
            `⚠️ OUTPUT LIMITATION: Max ${model.variants.safe_tokens.options.maxTokens || 'default'} tokens allowed.`
        );
    }
}
```

### Implémentation
Ajouter ce hook dans `src/index.ts` -> `PollinationsPlugin` return object.

---

## 🟡 PROBLÈME 2: Prompt Système Non-surchargeable

### Symptôme
Opencode construit le prompt système en amont, avant que le plugin ne puisse intervenir avec ses limites de modèles spécifiques.

### Analyse
- Hook `config()` (lignes 115-139) injecte les modèles trop tard
- Le prompt système est généré avant cet appel
- Les modèles ne savent pas leurs propres limites (context_window, output)

### Solution: "experimental.chat.system.transform"

**Fonctionnement:**
- Reçoit: `{ sessionID?: string, model: Model }`
- Retourne: `{ system: string[] }`
- Permet d'ajouter ou remplacer le prompt système en temps réel

**Avantages:**
- S'active **avant** chaque requête de chat
- Disponible **pour chaque modèle spécifique**
- Non destructif (peut ajouter context)

### Comparaison des approches

| Approche | Temps d'exécution | Portée | Destructif |
|----------|-------------------|--------|------------|
| `config()` hook | Démarrage | Global | Non |
| `variants` | Initialisation | Par modèle | Non |
| `experimental.chat.system.transform` | Par requête | Par modèle | Non |

### Recommandation
1. **Migrer les limites contextuelles** du format `limit` au prompt système
2. **Supprimer les hacks if spécifiques** (nova-fast, chickytutor, etc.)
3. **Définir un prompt système générique** qui s'adapte à chaque modèle

---

## 📋 Étapes d'implémentation

1. [ ] Ajouter le hook `"experimental.chat.system.transform"` dans index.ts
2. [ ] Tester avec Gemini Flash (maxTokens: 2048)
3. [ ] Tester avec Nova Micro (maxTokens: 8000)
4. [ ] Tester avec Claude 3.5 Sonnet (maxTokens: 8192)
5. [ ] Vérifier que les modèles respectent bien les limites
6. [ ] Nettoyer le code avec les if spécifiques
7. [ ] Documenter dans CHANGELOG.md

---

## 🎯 Objectif Final

**Prompt système propre et générique:**

```typescript
// Pour chaque modèle:
// "⚠️ MODEL: {name}\n" +
// "Context: {context_window} tokens\n" +
// "Max Output: {limit.output} tokens\n" +
// "Use < 50% of context to ensure safety"
```

Ainsi tous les modèles (mêmes les non-Pollinations) respecteront les limites sans hacks spécifiques.
