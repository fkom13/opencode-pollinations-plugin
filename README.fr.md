# 🌸 Plugin Pollinations AI pour OpenCode (v6.4.9)

## ✨ Nouveautés v6.4.9

- 🎯 **Quêtes & Gamification** : `polli_quests` + `/poll quests`. Utiliser le plugin complète des quêtes **rétroactivement**.
- 🆓 **Outils gratuits (sans clé)** — pour **n'importe quel** modèle OpenCode :
  - `gen_edit_image_free` — génération **et** édition (~20/jour)
  - `gen_video_free` — texte→vidéo (~5/jour)
  - `object_remover` / `image_upscaler` / `image_enhancer` — traitement d'image gratuit
  - `remove_background` — détourage IA gratuit (rmbg / bgeraser)
- 🔐 **Connexion 1 clic** : `/poll login` + `polli_login`. `/poll connect sk_...` reste disponible.
- 🧊 **Catalogue modèles complet** : text, image, video, audio, **3D**, **embeddings**, realtime.
- 🧪 **CI + packaging** : Node ≥ 18, CLI `npx opencode-pollinations-plugin`, tests unit + i18n.
- 🌍 **6 langues** : en, fr, es, de, it, zh — onboarding et commandes alignés.


<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>La Passerelle ultime entre OpenCode et l'écosystème Pollinations.ai</h3>
  <p><em>Accédez à un univers continu de modèles IA de base gratuits, ou exploitez des modèles d'entreprise premium grâce à nos généreux <b>Tiers Gratuits Horaires</b>, directement depuis votre terminal local.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Philosophie : L'IA Ouverte pour les Créateurs

> **"Pas de portes fermées, pas de contraintes d'entreprise — juste de bons outils et des gens biens."**

**Pollinations.ai** est une plateforme open-source créée par et pour la communauté. Nous offrons une API unifiée et directe pour générer des images, du texte, de l'audio et des vidéos.

- 🌍 **Transparent** : Notre code, notre roadmap et nos discussions sont publics.
- ⚖️ **Économie Juste** : Une monnaie unique (**Pollen 🌻**) pour tous les médias et modèles. Une tarification prévisible et transparente, sans enfermement propriétaire.

---

## ✨ Nouveautés de la V6.4

- ⏱️ **Quotas Horaires** : Dites adieu aux limites journalières ! Les Tiers Développeurs se réinitialisent désormais **toutes les heures** pile (à `:00`), vous assurant d'avoir toujours des crédits frais disponibles pendant vos longues sessions de code.
- ⚡ **Moteur 100% Dynamique** : Fini les listes de modèles codées en dur, les configurations par défaut et les prix fixes ! L'agent IA récupère dynamiquement les derniers LLMs, paramètres, tags (`[💎 Paid]`, `[🌿 Free]`) et coûts approximatifs depuis les API Pollinations.
- 🛡️ **Sécurité Renforcée** : La protection contre le path traversal et les vérifications strictes d'URL sont totalement intégrées.
- 🔍 **Recherche Web Améliorée** : Le composant `polli_web_search` s'aligne avec les options de pointe comme Google Gemini Fast, Perplexity ou les assistants spécialisés.

---

## 🧰 Outils & Commandes

Au-delà de la discussion textuelle, connecter votre clé donne aux Agents OpenCode accès aux outils multimédias propulsés par les modèles de Pollinations :

### 💎 Outils Génératifs Intégrés (ENTER ONLY - requiert une clé API)
- 🎨 `polli_gen_image` : Modèles d'imagerie de pointe (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Puissants modèles Texte-vers-Vidéo et Image-vers-Vidéo (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🔊 `polli_gen_audio` & `polli_gen_music` : Synthèse vocale magique (ElevenLabs, OpenAI TTS) et Musique Générative.
- 🎙️ `polli_stt` : Transcription vocale de haute volée (Whisper V3).
- 🌐 `polli_web_search` : Outil de recherche web connecté et contextes spécialisés (`gemini-search`, `perplexity...`).

### 🧰 Outils Bonus Créateurs Gratuits (Toujours disponibles)
- ✂️ `remove_background` : Suppression de fond d'image ultra-rapide intégrée.
- 🛠️ `gen_qrcode`, `gen_diagram`, `extract_frames`, `extract_audio`, `file_to_url` : Utilitaires développeurs.

### 💻 Liste Complète des Commandes Terminal
Utilisez l'alias **`/poll`** ou **`/pollinations`** à tout moment dans le terminal de conversation :
- `/poll help` : Affiche le tableau d'aide interactif.
- `/poll connect` : Outil de configuration "Bring Your Own Key" (Interactif).
- `/poll usage full` : Tableau de bord en temps réel (Statistiques), Tiers gratuits actifs et Solde du Portefeuille.
- `/poll config` : Ajustement fin du Cost Guard, des logs, de la langue et de l'affichage.
- `/poll models` : Vérifiez l'état des modèles disponibles.
- `/poll pricing` : Consultez la tarification unifiée en temps réel (Estimation du coût moyen).
- `/poll fallback` : Définissez les modèles de secours (Safety Net).
- `/poll infos` : Découvrez les règles de la communauté et le système de niveaux.

---

## 🛡️ Le "Cost Guard" & le "Filet de Sécurité"

Nous avons introduit des protections fondamentales pour garantir que votre flux de travail ne s'interrompe jamais et que votre budget (Portefeuille ou Tiers Gratuits) reste sous votre contrôle absolu :

- 🛟 **Filet de Sécurité (Safety Net)** : Si vous utilisez des modèles premium et que votre quota horaire s'épuise en pleine session de chat, le plugin bascule silencieusement vers un modèle gratuit de secours. *Plus d'erreurs bloquantes (429).*
- 🚦 **Cost Guard pour les Outils** : Les Agents OpenCode peuvent être trop zélés. Si un Agent tente de dépenser trop de Pollens pour générer une vidéo très lourde, le plugin intercepte la requête. Un flux asynchrone demandera votre confirmation manuelle.

---

## 🐝 Comprendre les Pollens & "Free Tiers"

Par le passé, Pollinations s'appuyait principalement sur le trafic réseau financé par la pub. Aujourd'hui, faire tourner des modèles massifs (comme Claude 3.5 Sonnet, Flux Pro, Wan Video) coûte de l'argent. L'Univers **Enter** nécessite une clé API pour débloquer les modèles de pointe.

**Mais attendez, vous n'avez pas besoin de carte bancaire !**

Le **Pollen 🌻** est notre système de crédit unifié (1$ ≈ 1 Pollen). En connectant une simple clé API gratuite, vous débloquez des recharges **horaires** selon votre niveau Développeur :

| Tier | Recharge Horaire ⏱️ | Estimation Jour* | Condition |
| :--- | :--- | :--- | :--- |
| 🍄 **Spore** | **0.01 Pollen / heure** | ~0.24 / jour | Nouveau compte (par défaut) |
| 🌱 **Seed** | **0.15 Pollen / heure** | ~3.6 / jour | Membre actif de la communauté |
| 🌸 **Flower** | **0.40 Pollen / heure** | ~9.6 / jour | Compléter des Quêtes et contribuer |
| 🍯 **Nectar** | **0.80 Pollen / heure** | ~19.2 / jour | Contributeur de premier plan |
| 🐝 **Router** | **10 Pollen / heure** | ~240 / jour | Spécial / sur invitation |

_*Les estimations quotidiennes sont approximatives (~24h × taux horaire). La réinitialisation réelle s'effectue automatiquement au début de chaque heure (XX:00)._

> 🎁 **Obtenez votre Clé Personnelle Gratuite (BYOK) sur [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) pour booster OpenCode !**

**Comment ça marche :**
1. Votre quota de Tier gratuit (ex: 0.40 🌻/h pour Flower) est consommé en premier.
2. Lorsque le quota est épuisé, le filet de sécurité bascule doucement vers les modèles gratuits.
3. Le solde de votre Portefeuille (Pollen payant) n'est touché que pour les outils premium si le quota gratuit est insuffisant.
4. Boom ! 💥 Le quota se réinitialise complètement dès la prochaine heure.

---

## 🌍 Support Multilingue Natif (i18n)

Pollinations pour OpenCode parle votre langue nativement :
- L'interface, les notifications (Toasts), les retours d'outils et les commandes sont traduits en **Anglais**, **Français**, **Espagnol**, **Allemand**, **Italien** et **Chinois**.
- Tapez `/poll config lang <en|fr|es|de|it|zh>` dans le terminal pour basculer instantanément.

---

## 🚀 Installation & Onboarding

### 🐧 1. Configuration Multi-OS (Installation NPM)
Ce plugin est **totalement multiplateforme** (Windows, macOS, Linux) et détecte dynamiquement les ports OpenCode.

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
Une fois dans OpenCode, tapez simplement cette commande dans le terminal de l'Agent :
```bash
/poll connect
```
Un assistant interactif vous guidera pour configurer votre clé Pollinations. *(Redémarrez OpenCode pour rafraîchir la liste graphique des modèles).*

---

## 🔗 Liens

- **Créez votre Clé API Pollen** : [pollinations.ai](https://pollinations.ai)
- **Communauté Discord** : [Rejoignez-nous !](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosystème OpenCode** : [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licence

Licence MIT. Créé par [fkom13](https://github.com/fkom13) & La Communauté Pollinations.
