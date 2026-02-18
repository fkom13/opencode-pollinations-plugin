# Étude Framework d'Intégration pour OpenCode Pollinations V6

## 🎯 Objectif
Choisir l'architecture technique pour les outils avancés de la V6 (Pollinations.ai "Enter" Universe), permettant :
1. Le chainage d'outils (ex: Génération Image → Détourage → Animation Vidéo).
2. La robustesse des appels API complexes.
3. La légèreté du plugin VSCode.

## 🔍 Comparatif

| Feature | **Vercel AI SDK Core** | **LangChain.js** | **Architecture Custom (Actuelle)** |
| :--- | :--- | :--- | :--- |
| **Poids (Bundle)** | Super Léger (~15KB) | Lourd (>100KB) | Nul (0KB extra) |
| **Philosophie** | Abstraction fine, Standardisée | "Batteries included", Complexe | Code "proche du métal", Direct |
| **Gestion Outils** | Native (`zod` schemas) | Abstraction "Tool" | Custom Wrapper (déjà implémenté) |
| **Chainage** | Via `generateText` / `stream` | `Chain` / `Graph` | Promesses manuelles (`.then()`) |
| **DX (Dev Exp)** | ⭐⭐⭐⭐⭐ (Excellent) | ⭐⭐ (Verbeux) | ⭐⭐⭐⭐ (Simple mais à maintenir) |

## 💡 Analyse Détaillée

### 1. Vercel AI SDK (Core)
Un standard émergent. Très modulaire.
- **Pour**: Standardise les interfaces `tool`. Gestion native du streaming. Typage Zod first-class.
- **Contre**: Conçu pour les LLM (OpenAI/Anthropic). Pollinations est une API REST "classique" (Génération Média), pas un Chatbot. L'utiliser nécessiterait d'écrire un "Provider" custom, ce qui est peut-être overkill juste pour appeler des endpoints REST.

### 2. LangChain.js
Trop lourd et complexe pour notre besoin spécifique. À écarter pour un plugin VSCode qui se veut rapide.

### 3. Architecture Custom "Agent-Like" (Recommandée)
Nous avons déjà une base solide avec notre `tool()` wrapper et le registre conditionnel.
Pour la V6, nous pouvons créer une classe utilitaire légère `PollinationsClient` qui centralise la logique.

**Concept "Micro-Agent":**
```typescript
// src/client/pollinations.ts
export class PollinationsClient {
  constructor(private apiKey?: string) {}

  async imagine(prompt: string, options: GenOptions): Promise<string> { ... }
  async animate(imageUrl: string): Promise<string> { ... }
  
  // Chainage facile
  async createVideoClip(prompt: string) {
     const img = await this.imagine(prompt);
     return this.animate(img);
  }
}
```

## 🚀 Recommandation Finale
**Option 3 : Architecture Custom améliorée + Emprunts à Vercel AI SDK.**

1.  **Ne pas installer de gros framework.** Garder le plugin léger.
2.  **Standardiser nos interfaces** en s'inspirant de Vercel AI SDK (pour une compatibilité future éventuelle), mais sans dépendance.
3.  Créer un **Client Unifié** (`src/pollinations-client.ts`) dans la phase 4C/4D pour orchestrer les appels API payants, plutôt que d'avoir du code dispersé dans chaque fichier tool.

**Conclusion :** On reste sur du TypeScript pur et dur. C'est le plus performant et le plus maintenable pour ce projet spécifique.
