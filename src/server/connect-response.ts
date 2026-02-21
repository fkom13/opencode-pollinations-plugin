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

Ce plugin ne se limite pas à du chat IA avec les meilleurs modèles existants. **Il vous apporte la génération et manipulation multimédia directement dans votre IDE.** 

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

---

**Commandes rapides Terminal :**

| Commande | Description |
|----------|-------------|
| \`/pollinations usage\` | Solde Pollen + quota tier |
| \`/pollinations infos\` | Toutes les infos sur le Tier et l'achat Pollen |
| \`/pollinations models\` | Liste détaillée des modèles multimédia |
| \`/pollinations pricing\` | Tarifs en temps réel par modèle |
| \`/pollinations mode manual\` | Contrôle manuel du mode |

---

**Ressources :**
- Dashboard : https://enter.pollinations.ai
- Discord : https://discord.gg/pollinations-ai-885844321461485618
- GitHub : https://github.com/fkom13/opencode-pollinations-plugin`;
    }

    return `## 🌸 Bienvenue dans le Plugin Pollinations

**Accès gratuit immédiat — aucune clé requise**

Ce plugin offre un environnement complet de chat, de génération de code et de manipulation de médias (Génération Image, Vidéo, Audio, Outils d'extraction...).

Sélectionnez un modèle \`pollinations/*\` dans la liste et discutez pour commencer.
Modèles gratuits disponibles : \`openai-fast\`, \`gemini-fast\`, \`mistral\`, \`qwen-coder\`, \`nova-fast\`

---

## 🔑 Débloquez les modèles premium et les Tools Multimédia

Claude Opus, GPT-5, Gemini 3, Génération Vidéo Veo & Wan, ElevenLabs Music... la puissance complète de l'API Pollinations via votre agent.

**Étape 1 — Créer un compte gratuit**
👉 https://enter.pollinations.ai

**Étape 2 — Générer votre clé API**
Dans la section **API Keys**, créez une clé **Secret** (\`sk_...\`).

**Étape 3 — Connecter la clé**
\`\`\`
/pollinations connect sk_votre_clé_ici
\`\`\`
Puis **redémarrez** pour appliquer.

---

## 💰 Système de Pollen et Tiers
Chaque développeur reçoit une **Subvention quotidienne gratuite (Tier Grant)** pour tester :
| Tier | Pollen/jour | Condition |
|------|:-----------:|-----------|
| 🌱 Spore | 1 | Dès l'inscription ! |
| 🌸 Flower | 10 | Application publiée |

Une fois le quota gratuit épuisé, vous consommez le Pollen de votre portefeuille ($1 ≈ 1 Pollen, pas d'abonnement, pas d'expiration).

**Besoin d'aide ?**
- Tapez \`/pollinations help\`
- Discord : https://discord.gg/pollinations-ai-885844321461485618`;
}
