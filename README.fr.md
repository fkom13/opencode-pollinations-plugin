# 🌸 Plugin Pollinations AI pour OpenCode (v6.1.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="200">
  <br>
  <b>La Passerelle entre OpenCode et l'Écosystème Pollinations.ai.</b>
  <br>
  Accédez à un univers continu de modèles IA gratuits de base, ou exploitez des modèles d'entreprise premium grâce à nos généreux paliers gratuits (Free Tiers) depuis votre éditeur.
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-v6.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Philosophie : L'IA Ouverte pour les Créateurs

> **"Pas de portes fermées, pas d'obstacles corporatifs — juste de bons outils et des gens formidables."**

Pollinations.ai est une plateforme open-source créée par et pour la communauté. Nous offrons une API unifiée et directe pour la génération d'images, de textes, d'audio et de vidéos.
- **Transparent** : Notre code, notre roadmap et nos discussions sont publics.
- **Économie Juste** : Une monnaie unique (**Pollen**) pour tous les médias et modèles. Une tarification prévisible et transparente.

---

## ✨ Quoi de neuf dans la V6 ? 
---

## 🧰 Les Outils (Tools) & Commandes V6

Au-delà de la discussion textuelle, connecter votre clé donne aux Agents OpenCode l'accès à nos Outils Médias IA propulsés grace aux modeles par Pollinations :

### 💎 Outils Génératifs Intégrés (aprés avoir entré votre clé API)
- `polli_gen_image` : Modèles d'imagerie de pointe (`Flux`, `Midjourney`, `Gemini`).
- `polli_gen_video` : Puissantes capacités Text-to-Video et Image-to-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- `polli_gen_audio` & `polli_gen_music` : Synthèse vocale magique (ElevenLabs) et Musique Générative.
- `polli_stt` : Transcription vocale de haute voltige (Whisper V3).
- `polli_web_search` : Recherche Web Connectée pour du contexte sourcé.

### 🧰 Outils Bonus créateur
- `remove_background` : Détourage de fond d'image ultra-rapide intégré (Toujours Gratuit).
- `gen_qrcode`, `extract_frames`, `extract_audio` : Utilitaires (Toujours Gratuit).

### 💻 Liste Complète des Commandes du Terminal
Utilisez l'alias **`/poll`** ou **`/pollinations`**.
- `/poll help` : Affiche le tableau d'aide interactif.
- `/poll connect` : Outil de configuration Bring Your Own Key (Interactif).
- `/poll usage full` : Tableau de bord en temps réel (Stats), Freetiers actifs et Portefeuille (Wallet Balance).
- `/poll config` : Paramétrez finement les Cost Guards, les Logs, la Langue et l'Affichage.
- `/poll models` : Vérifiez l'état des Modèles disponibles.
- `/poll pricing` : Affichez la tarification unifiée en temps réel (Estimation du Coût Moyen).
- `/poll fallback` : Définissez le modèle de Chat du Filet de Sécurité ultime.
- `/poll mode` : Changez de mode sans passer par l'API.
- `/poll infos` : Découvrez les règles de la communauté et le système de niveaux.

### 🛡️ Le "Cost Guard" & le "Safety Net"
Nous avons introduit des protections fondamentales pour garantir que votre flux de travail ne s'interrompe jamais et que votre portefeuille (Wallet ou free tiers) soit sous votre controle
- **Filet de sécurité (Safety Net)** : Si vous utilisez des modèles premium et que votre quota quotidien de Pollen s'épuise en plein milieu d'une session de chat, le plugin bascule silencieusement et automatiquement sur un modèle gratuit. *Fini les erreurs de blocage (429).*
- **Cost Guard pour les Outils** : Les Agents d'OpenCode peuvent faire preuve de zèle. Si un Agent tente de dépenser trop de Pollens pour générer une vidéo lourde ou une musique, le plugin intercepte la demande. Nous avons implémenté un flux asynchrone qui vous demande une confirmation manuelle avant d'exécuter des générations coûteuses. Vous gardez le contrôle.

### 🌍 Support Multilingue Natif (i18n)
Pollinations pour OpenCode parle votre langue nativement.
- L'Interface Moteur, les Notifications (Toasts), les Retours d'Outils et les Commandes sont intégralement traduits en **Anglais (Défaut)**, **Français**, **Espagnol**, **Allemand**, et **Italien**.
- Tapez `/poll config lang <fr|es|de|it>` dans le terminal pour changer instantanément.

---

## 🐝 Comprendre les Pollens & les "Paliers Gratuits (Free Tiers)"

Par le passé, Pollinations s'appuyait principalement sur du trafic réseau financé par la publicité. Aujourd'hui, faire tourner des modèles massifs (comme Claude 4.5, Flux Pro, Wan Video) coûte de l'argent. Pollinations introduit donc l'**Enter Universe** qui requiert une clé API et déverrouille des modeles de pointes

**Mais attendez, vous n'avez pas besoin de carte bancaire !**

Le **Pollen** est notre système de crédit unifié ($1 ≈ 1 Pollen). En connectant une simple Clé API Gratuite, vous débloquez des recharges quotidiennes de Pollen selon votre Palier (Tier) Développeur :

| Palier (Tier) | Recharge Quotidienne | Condition |
| :--- | :--- | :--- |
| 🦠 **Microbe** | **0.1 Pollen/jour** | Juste s'inscrire ! |
| 🍄 **Spore** | **1 Pollen/jour** | Vérification automatique |
| 🌱 **Seed** | **3 Pollen/jour** | Développeur GitHub Actif (8+ points) |
| 🌸 **Flower** | **10 Pollen/jour** | **Publier une App** (Comme ce Plugin !) |

> 🎁 **Obtenez votre Clé Personnelle Gratuite (BYOK) sur [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) pour booster OpenCode !**

*(Note : Nous maintenons toujours le fallback "Free Universe" pour le chat de base (`openai-fast`) qui ne nécessite aucune clé, mais sa capacité est très limitée et principalement pensée comme un filet de sécurité).*

Les pollen payant vous permettent d'accéder à des modeles encore plus puissants et premium.

Les crédits pollen free tiers journaliers sont consommés avant de touché au wallet (pollen acheté) sauf pour les modeles payants.

---

## 🚀 Démarrage & Onboarding

### 🐧 1. Configuration Multiplateforme (Installation NPM)
Ce plugin est **totalement cross-platform** (Windows, macOS, Linux) et détecte ses ports dynamiquement.

1. Installation globale :
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuration :
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Ou injectez-le manuellement dans `~/.config/opencode/opencode.json`)*

### 🔑 2. Onboarding Interactif
Une fois dans OpenCode, tapez simplement la commande suivante dans le Terminal de l'Agent :
```bash
/poll connect
```
Un assistant conversationnel interactif vous guidera pour injecter votre Clé Pollinations et configurer votre espace. *Relancez OpenCode pour mettre à jour la liste des modèles dans l'interface UI.*



---

## 🔗 Liens

- **Créez votre Clé API Pollen** : [pollinations.ai](https://pollinations.ai)
- **Communauté Discord** : [Rejoignez-nous !](https://discord.gg/pollinations-ai-885844321461485618)
- **Écosystème OpenCode** : [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licence

Licence MIT. Créé par [fkom13](https://github.com/fkom13) & La Communauté Pollinations.
