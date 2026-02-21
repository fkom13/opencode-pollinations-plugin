# Spec Agent — Modèle Synthétique `pollinations/connect`

## Contexte

Le provider `pollinations` dans OpenCode est enregistré dynamiquement au démarrage du plugin via le hook `config()` dans `src/index.ts`. Si la Free Universe (`text.pollinations.ai`) est inaccessible au moment de l'init, ou si aucune clé n'est configurée et que le fetch des modèles échoue, le provider peut ne pas s'enregistrer du tout — rendant la commande `/connect` native d'OpenCode incapable d'afficher Pollinations comme option.

Le modèle synthétique `pollinations/connect` résout ce problème : il est injecté **en dur** dans la liste des modèles avant tout fetch réseau, garantissant qu'au moins un modèle Pollinations est toujours visible dans OpenCode.

---

## Ce qu'il faut implémenter

### Fichier 1 : `src/server/generate-config.ts`

Localiser la fonction `generatePollinationsConfig()`. Au tout début du tableau de modèles retourné, avant le fetch des modèles Free et Enterprise, injecter :

```typescript
const CONNECT_MODEL = {
    id: 'pollinations/connect',
    name: '🌸 Pollinations — Guide & Connexion',
    object: 'model',
};
```

Ce modèle doit être **le premier élément** du tableau final retourné, quelle que soit l'issue du fetch réseau. Même si tous les fetch échouent et que le tableau est vide, ce modèle doit être présent.

Exemple de structure cible :

```typescript
export async function generatePollinationsConfig(apiKey?: string, forceEnterprise = false): Promise<OpenCodeModel[]> {
    const models: OpenCodeModel[] = [];

    // TOUJOURS présent en premier — indépendant du réseau
    models.push({
        id: 'pollinations/connect',
        name: '🌸 Pollinations — Guide & Connexion',
        object: 'model',
    });

    // ... reste du code existant (fetch free, fetch enterprise, etc.)

    return models;
}
```

---

### Fichier 2 : `src/server/proxy.ts`

Localiser la fonction `handleChatCompletion()`. Ajouter l'interception **en tout premier**, avant toute logique de routing, de quota, ou de config :

```typescript
// Liste des IDs possibles selon comment OpenCode préfixe le modèle
const CONNECT_MODEL_IDS = [
    'pollinations/connect',
    'free/pollinations/connect',
    'enter/pollinations/connect',
];

if (CONNECT_MODEL_IDS.includes(body.model)) {
    const config = loadConfig();
    const content = buildConnectResponse(config);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const chunk = JSON.stringify({
        id: 'connect-' + Date.now(),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'pollinations/connect',
        choices: [{
            index: 0,
            delta: { role: 'assistant', content },
            finish_reason: 'stop',
        }],
    });

    res.write(`data: ${chunk}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
    return; // Ne pas continuer vers le routing normal
}
```

---

### Fichier 3 : `src/server/proxy.ts` — Fonction `buildConnectResponse()`

Ajouter cette fonction dans `proxy.ts` (ou dans un fichier `src/server/connect-response.ts` importé) :

```typescript
function buildConnectResponse(config: PollinationsConfigV5): string {
    const hasKey = !!config.apiKey;
    const mode = config.mode;

    if (hasKey) {
        return `## ✅ Plugin Pollinations connecté

**Mode actuel** : \`${mode}\`

Sélectionnez n'importe quel modèle \`pollinations/*\` dans la liste pour commencer.

---

**Commandes rapides :**

| Commande | Description |
|----------|-------------|
| \`/poll-usage\` | Solde Pollen + quota tier |
| \`/poll-usage-full\` | Détail par modèle |
| \`/poll-mode-pro\` | Activer le mode Pro |
| \`/poll-mode-free\` | Forcer les modèles gratuits |
| \`/poll-mode-manual\` | Contrôle manuel |
| \`/poll-models\` | Liste des modèles |
| \`/poll-pricing\` | Tarifs par modèle |
| \`/poll-status\` | Santé du plugin |

---

**Ressources :**
- Dashboard : https://enter.pollinations.ai
- Discord : https://discord.gg/pollinations-ai-885844321461485618
- GitHub : https://github.com/fkom13/opencode-pollinations-plugin`;
    }

    return `## 🌸 Bienvenue dans le Plugin Pollinations

**Accès gratuit immédiat — aucune clé requise**

Sélectionnez un modèle \`pollinations/*\` dans la liste et discutez directement.

Modèles gratuits disponibles : \`openai-fast\`, \`gemini-fast\`, \`mistral\`, \`qwen-coder\`, \`nova-fast\`

---

## 🔑 Débloquer les modèles premium

Claude, GPT-5, Gemini 3, Seedance Pro, Veo, ElevenLabs...

**Étape 1 — Créer un compte gratuit**
👉 https://enter.pollinations.ai

**Étape 2 — Créer une clé API**
Dans votre dashboard, section **API Keys**, créez une clé **Secret** (\`sk_...\`).

**Étape 3 — Connecter la clé**
\`\`\`
/poll-connect sk_votre_clé_ici
\`\`\`
Puis **redémarrez OpenCode** pour voir les modèles premium.

---

## 🌱 Tiers — Pollen gratuit par jour

| Tier | Pollen/jour | Condition |
|------|:-----------:|-----------|
| 🌱 Spore | 1 | Inscription |
| 🌿 Seed | 3 | Dev GitHub actif (8+ points) |
| 🌸 Flower | 10 | App publiée dans l'écosystème |
| 🍯 Nectar | 20 | Contributeur majeur |

> 🎁 **Beta** : tout achat de Pollen est **doublé** ($5 → 10 Pollen, etc.)

---

## 💰 Exemples de prix (1 Pollen ≈ 1$)

| Modèle | Coût | Quantité par Pollen |
|--------|------|:-----------------:|
| \`openai-fast\` (GPT-5 Nano) | 0.06/M input | ~700 réponses |
| \`claude-fast\` (Haiku 4.5) | 1.0/M input | ~100 réponses |
| \`flux\` (image) | 0.0002/img | ~5 000 images |
| \`gen_music\` (ElevenLabs Music) | 0.005/sec | 200s de musique |
| \`veo\` (vidéo) | 0.15/sec | ~6s de vidéo HD |

---

**Besoin d'aide ?**
- \`/poll-help\` — Aide complète du plugin
- Discord : https://discord.gg/pollinations-ai-885844321461485618`;
}
```

---

## Comportement attendu

| Situation | Résultat |
|-----------|----------|
| Free Universe en rade, pas de clé | `pollinations/connect` visible, contenu onboarding retourné |
| Free Universe en rade, clé présente | `pollinations/connect` visible, contenu statut connecté retourné |
| Free Universe OK, pas de clé | `pollinations/connect` en tête de liste + tous les modèles free |
| Free Universe OK, clé présente | `pollinations/connect` en tête de liste + free + enterprise |

**Aucun appel réseau. Aucune dépendance. Toujours disponible.**
