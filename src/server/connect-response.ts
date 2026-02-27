import { PollinationsConfigV5 } from './config.js';

export async function buildConnectResponse(config: PollinationsConfigV5): Promise<string> {
    const hasKey = !!config.apiKey;
    const mode = config.mode;

    let name = "Developer";
    let tier = "anonymous";

    if (hasKey) {
        try {
            const res = await fetch('https://gen.pollinations.ai/account/profile', {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
            if (res.ok) {
                const data: any = await res.json();
                if (data.name) name = data.name;
                tier = data.tier || "anonymous";
            }
        } catch (e) {
            // Ignorer l'erreur réseau et garder les valeurs par défaut
        }
    }

    const emojis: Record<string, string> = {
        microbe: '🦠', spore: '🍄', seed: '🌱', flower: '🌸', nectar: '🍯', anonymous: '👤'
    };
    const tierEmoji = emojis[tier] || '❓';

    if (hasKey) {
        return `## 🍯💚 PLUGIN POLLINATIONS CONNECTÉ 💚🍯

Bienvenue **${name}** sur le plugin Pollinations pour l'agent !
**Mode actuel** : \`${mode}\`

> **Your Tiers:** ${tierEmoji} ${tier.toUpperCase()}

---

### 🚀 Des Outils Multimédias Intégrés au Développement

Ce plugin vous permet de générer du code, des images, d'analyser des vidéos et interagir avec les meilleurs modèles d'Intelligence Artificielle de manière totalement transparente et intégrée à votre environnement de travail. Accédez aux capacités des LLMs de pointe, que ce soit via des requêtes de chat, la refonte de votre base de code, ou directement dans le terminal.

**Ce Que ce plugin vous apporte en plus ! :**

**🛠️ Outils Gratuits Intégrés (Toujours disponibles) :**
- \`gen_qrcode\` / \`gen_diagram\` / \`gen_palette\` : Outils visuels et dev.
- \`remove_background\` : Détourage d'image natif.
- \`extract_frames\` / \`extract_audio\` : Extraction rapide de contenu média.
- \`file_to_url\` : Hébergement instantané de vos fichiers locaux en ligne.

**💎 Outils Pollinations (Premium - Automatisés avec votre Clé) :**
- \`polli_gen_image\` : Génération d'images (Flux, Seedream, Gemini) + support Image-to-Image.
- \`polli_gen_video\` : Génération vidéo text-to-video / image-to-video (Veo, Wan, LTX...).
- \`polli_gen_audio\`/\`polli_stt\` : Transcription Whisper, Text-to-Speech ElevenLabs.
- \`polli_gen_music\` : Moteur de musique générative.
- \`polli_web_search\` : Recherche connectée pour étendre la base de contexte de l'agent.

- **Une configuration granulaire**, des modes de gestions de vos tokens et de vos outils, de la sécurisation des coûts des outils consommant du pollen...

---

**Commandes rapides Terminal :**

| Commande | Description |
|----------|-------------|
| \`/pollinations usage\` | Solde Pollen + quota tier |
| \`/pollinations infos\` | Toutes les infos sur le Tier et l'achat Pollen |
| \`/pollinations models\` | Liste détaillée des modèles multimédia |
| \`/pollinations pricing\` | Tarifs en temps réel par modèle |
| \`/pollinations help\` | Lister toutes les commandes pollinations |

*(Note: Ces commandes locales ne sont disponibles que si le modèle courant fait partie de l'univers Pollinations).*

---

**Ressources :**
- Dashboard : https://enter.pollinations.ai
- Discord : https://discord.gg/pollinations-ai-885844321461485618
- GitHub : https://github.com/fkom13/opencode-pollinations-plugin`;
    }

    let freeModelsText = `Modèles gratuits disponibles : \`openai-fast\`, \`gemini-fast\`, \`mistral\`, \`qwen-coder\`, \`nova-fast\``;
    try {
        const freeRes = await fetch('https://text.pollinations.ai/models', { signal: AbortSignal.timeout(4000) });
        if (freeRes.ok) {
            const freeData = await freeRes.json();
            const modelsList = freeData.slice(0, 15).map((m: any) => `\`${m.name}\``).join(', ');
            freeModelsText = `**Modèles gratuits actuellement en ligne** : ${modelsList} ...
            
*(Note : L'univers gratuit \`text.pollinations.ai\` est un bonus communautaire indépendant de l'API principale Enter. Il peut subir de fortes charges. En cas d'erreur 500/520, c'est une indisponibilité temporaire normale !)*`;
        } else {
            freeModelsText = `*(L'API Legacy Free Universe communautaire est temporairement indisponible. Retentez plus tard !)*`;
        }
    } catch (e) {
        freeModelsText = `*(L'API Legacy Free Universe communautaire est temporairement indisponible. Retentez plus tard !)*`;
    }

    return `## 🌸 Bienvenue dans le Plugin Pollinations

**Accès gratuit immédiat — aucune clé requise**

Ce plugin offre un environnement complet de chat, de génération de code et de manipulation de médias (Génération Image, Vidéo, Audio, Outils d'extraction...).

Sélectionnez un modèle \`pollinations/free/*\` dans la liste et discutez pour commencer.
${freeModelsText}

---

## 🚀 Agents et Outils Multimédias Intégrés au Développement

Claude Opus, GPT-5, Gemini 3, Génération Vidéo Veo & Wan, ElevenLabs Music... débloquez la puissance complète de l'API Pollinations !

Ce plugin adopte un modèle **BYOK** (Bring Your Own Key) : en utilisant votre propre clé API, l'Agent OpenCode gagne la capacité d'interagir directement avec des outils Premium en créant vos fichiers multimédias dans votre Espace de Travail.

**Étape 1 — Créer un compte avec 1.00 pollen Gratuit !**
Soutenez le plugin en passant par ce lien :
👉 **https://enter.pollinations.ai/?ref=fkom13**

**Étape 2 — Générer votre clé API**
Dans la section **API Keys** sur \`enter.pollinations.ai\`, créez une clé **Secret** (\`sk_...\`).
⚠️ **IMPORTANT** : Lors de la création de la clé, vous devez impérativement l'autoriser à consulter le compte et les usages pour pouvoir bénéficier de toutes les fonctionnalités avancées (protection Free-Tier/Wallet, Agent Guard).

**Étape 3 — Connecter la clé**
\`\`\`bash
/pollinations connect sk_votre_clé_ici
\`\`\`
*(La clé s'enregistre immédiatement dans votre environnement OpenCode, débloquant les modèles Pro !)*

---

## 💰 Système de Pollen et Tiers
Chaque développeur reçoit une **Subvention quotidienne gratuite (Tier Grant)** pour utiliser ces services Premium :
- 🦠 **Microbe** (0.1 pollen/jour) : Pour débloquer : S'inscrire
- 🍄 **Spore** (1 pollen/jour) : Pour débloquer : Vérification automatique (Vérifié à l'inscription)
- 🌱 **Seed** (3 pollen/jour) : Pour débloquer : 8+ points dev (Mise à niveau automatique hebdomadaire)
- 🌸 **Flower** (10 pollen/jour) : Pour débloquer : Publier une application (🌱 Doit être Seed en premier)
- 🍯 **Nectar** (20 pollen/jour) : Bientôt disponible 🔮

Une fois le quota gratuit épuisé, vous consommez le Pollen de votre portefeuille ($1 ≈ 1 Pollen, pas d'abonnement, pas d'expiration).

**Besoin d'aide ?**
- Tapez \`/pollinations help\` pour la liste des commandes.
- Discord Officiel : https://discord.gg/pollinations-ai-885844321461485618`;
}
