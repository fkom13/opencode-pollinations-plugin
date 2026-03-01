const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'locales');
const langs = ['en', 'fr', 'es', 'de', 'it'];

// Text to restore for the 'infos' command
const infosOriginals = {
    fr: {
        title: "## 🍯💚 POLLINATIONS OPENCODE PLUGIN 💚🍯\n\nBienvenue **{name}** sur le plugin Pollinations pour OpenCode !\n\nCe plugin vous permet de générer du code, des images, d'analyser des vidéos et d'interagir avec les meilleurs modèles d'Intelligence Artificielle de manière totalement transparente et intégrée à votre environnement de travail. Accédez aux capacités des LLMs de pointe, que ce soit via des requêtes de chat, la refonte de votre base de code, ou directement dans le terminal.",
        features_title: "**Ce Que ce plugin vous apporte en plus ! :**",
        features_free: "**🛠️ Outils Gratuits Intégrés (Toujours disponibles) :**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Outils visuels et dev.\n- `remove_background` : Détourage d'image natif.\n- `extract_frames` / `extract_audio` : Extraction rapide de contenu média.\n- `file_to_url` : Hébergement instantané de vos fichiers locaux en ligne.",
        features_pro: "**💎 Outils Pollinations (Premium - Automatisés avec votre Clé) :**\n- `polli_gen_image` : Génération d'images (Flux, Seedream, Gemini) + support Image-to-Image.\n- `polli_gen_video` : Génération vidéo text-to-video / image-to-video (Veo, Wan, LTX...).\n- `polli_gen_audio`/`polli_stt` : Transcription Whisper, Text-to-Speech ElevenLabs.\n- `polli_gen_music` : Moteur de musique générative.\n- `polli_web_search` : Recherche connectée pour étendre la base de contexte de l'agent.",
        features_config: "- **Une configuration granulaire**, des modes de gestions de vos tokens et de vos outils, de la sécurisation des coûts des outils consommant du pollen...",
        tiers_title: "> **Your tiers:** {emoji} {tier}",
        about: "## 🌍 Qu'est-ce que pollinations.ai ?\npollinations.ai est une plateforme d'IA open-source construite par et pour la communauté. Nous offrons une API unifiée pour les images, le texte, l'audio et la vidéo. Tout fonctionne de manière ouverte : notre code, notre feuille de route, nos conversations. Des centaines de développeurs construisent déjà des outils, des jeux, des bots et des expériences farfelues avec nous. Vous êtes les bienvenus !\n\nPas de boîtes noires. Pas de dépendance exclusive (vendor lock-in). Juste une API conviviale et un Discord rempli de personnes qui s'entraident réellement.",
        levels_title: "## 📈 Évoluez votre Palier (Tier)",
        levels_list: "Pour les développeurs qui créent avec pollinations.ai. Montez de niveau pour gagner plus de Pollen quotidien.\n\n- 🦠 **Microbe** (0.1 pollen/jour) : Pour débloquer : S'inscrire\n- 🍄 **Spore** (1 pollen/jour) : Pour débloquer : Vérification automatique\n- 🌱 **Seed** (3 pollen/jour) : Pour débloquer : 8+ points dev\n- 🌸 **Flower** (10 pollen/jour) : Pour débloquer : Publier une application\n- 🍯 **Nectar** (20 pollen/jour) : Bientôt disponible 🔮",
        beta_note: "✨ *Nous sommes en bêta ! Nous apprenons ce qui fonctionne le mieux pour notre communauté.*",
        pollen_title: "## 💎 Qu'est-ce que le Pollen ?",
        pollen_get: "Faire tourner des modèles d'IA coûte de l'argent. Le Pollen est notre moyen de faire fonctionner les serveurs sans publicité ni revente de vos données. Un crédit simple et unique pour tous les modèles — prévisible, transparent, sans surprises.\n\n**$1 ≈ 1 Pollen** (les prix peuvent évoluer). Vous le dépensez pour faire des appels API.",
        pollen_spend: "## 🛒 Comment obtenir du Pollen ?\nIl y a plusieurs moyens d'ajouter du Pollen à votre solde : Participer à la communauté, ou l'acheter directement via le dashboard."
    },
    en: {
        title: "## 🍯💚 POLLINATIONS OPENCODE PLUGIN 💚🍯\n\nWelcome **{name}** to the Pollinations OpenCode plugin!\n\nThis plugin empowers you to generate code, images, analyze videos, and interact with top-tier AI models seamlessly within your dev environment. Access state-of-the-art LLMs via chat, refactoring, or terminal.",
        features_title: "**What this plugin brings to you! :**",
        features_free: "**🛠️ Integrated Free Tools (Always Available) :**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuals and dev utilities.\n- `remove_background` : Native background removal.\n- `extract_frames` / `extract_audio` : Fast media extraction.\n- `file_to_url` : Instant online hosting of local files.",
        features_pro: "**💎 Pollinations Tools (Premium - Automated with Key) :**\n- `polli_gen_image` : Image gen (Flux, Seedream, Gemini) + Image-to-Image.\n- `polli_gen_video` : Text-to-video / Image-to-video (Veo, Wan, LTX...).\n- `polli_gen_audio`/`polli_stt` : Whisper STT, ElevenLabs TTS.\n- `polli_gen_music` : Generative music engine.\n- `polli_web_search` : Connected web search.",
        features_config: "- **Granular configuration**, mode and token management, tool cost protections...",
        tiers_title: "> **Your tiers:** {emoji} {tier}",
        about: "## 🌍 What is pollinations.ai ?\npollinations.ai is an open-source AI platform built by and for the community. We provide a unified API for Image, Text, Audio, and Video. Everything is open: our code, roadmap, conversations. Hundreds of devs are already building apps, games, bots, and crazy experiments with us. Join us!\n\nNo black boxes. No vendor lock-in. Just a friendly API and a Discord full of helpful people.",
        levels_title: "## 📈 Upgrade Your Tier",
        levels_list: "For developers creating with pollinations.ai. Level up to earn more daily Pollen.\n\n- 🦠 **Microbe** (0.1 pollen/day) : Sign up\n- 🍄 **Spore** (1 pollen/day) : Automatic verification\n- 🌱 **Seed** (3 pollen/day) : 8+ dev points\n- 🌸 **Flower** (10 pollen/day) : Publish an app\n- 🍯 **Nectar** (20 pollen/day) : Coming soon 🔮",
        beta_note: "✨ *We are in beta! Learning what works best for our community.*",
        pollen_title: "## 💎 What is Pollen ?",
        pollen_get: "Running AI models costs money. Pollen is our way to keep servers running without ads or selling data. A simple, unified credit for all models — predictable, transparent, no surprises.\n\n**$1 ≈ 1 Pollen** (prices subject to change). You spend it on API calls.",
        pollen_spend: "## 🛒 How to get Pollen ?\nYou can add Pollen by participating in the community, or buying it directly on the dashboard."
    }
};

const pricingUnits = {
    fr: { tokens: "~tokens", img: "🌻/img", s: "🌻/s", tok: "🌻/tok" },
    en: { tokens: "~tokens", img: "🌻/img", s: "🌻/s", tok: "🌻/tok" },
    es: { tokens: "~tokens", img: "🌻/img", s: "🌻/s", tok: "🌻/tok" },
    de: { tokens: "~tokens", img: "🌻/Bild", s: "🌻/s", tok: "🌻/tok" },
    it: { tokens: "~tokens", img: "🌻/imm", s: "🌻/s", tok: "🌻/tok" }
};

for (const lang of langs) {
    const file = path.join(srcDir, `${lang}.json`);
    if (!fs.existsSync(file)) continue;

    let data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Fix models \n issues that break markdown tables
    let models = data.commands && data.commands.models;
    if (models) {
        Object.keys(models).forEach(k => {
            if (typeof models[k] === 'string' && models[k].endsWith('\n')) {
                models[k] = models[k].trimEnd();
            }
        });
        if (models.cat_title) {
            models.cat_title = "### {emoji} {label} ({count})";
        }
    }

    // Rewrite infos
    if (!data.commands) data.commands = {};
    const refInfos = infosOriginals[lang] || infosOriginals.en;
    data.commands.infos = { ...refInfos };

    // Set pricing translations
    if (!data.commands.pricing_units) {
        data.commands.pricing_units = pricingUnits[lang] || pricingUnits.en;
    }

    fs.writeFileSync(file, JSON.stringify(data, null, 4));
    console.log(`Rewritten ${lang}.json`);
}
