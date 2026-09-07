# 🌸 Plugin Pollinations AI pour OpenCode (v6.5.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>La Passerelle ultime entre OpenCode et l'écosystème Pollinations.ai</h3>
  <p><em>Accédez à un univers continu de modèles IA de base gratuits, ou exploitez des modèles d'entreprise premium grâce à notre système <b>Quest & Paid Pollen</b>, directement depuis votre terminal local.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Philosophie : L'IA Ouverte pour les Créateurs

> **"Pas de portes fermées, pas de contraintes d'entreprise — juste de bons outils et des gens biens."**

**Pollinations.ai** est une plateforme open-source créée par et pour la communauté. Nous offrons une API unifiée et directe pour générer des images, du texte, de l'audio, de la vidéo et de la 3D.

- 🌍 **Transparent** : Notre code, notre roadmap et nos discussions sont publics.
- ⚖️ **Économie Juste** : Une monnaie unique (**Pollen 🌻**) pour tous les médias et modèles. Une tarification prévisible et transparente, sans enfermement propriétaire.

---

## ✨ Nouveautés v6.5.0

- 🧊 **Génération 3D (`polli_gen_3d`)** : Génération de modèles 3D (`trellis-2`, `hyper3d-rodin`) au format standard `.glb` avec protection Cost Guard et reprise sur cache.
- 🛡️ **Protection Anti-Double Facturation** : Retries chat strictement limités au code 429 ; les timeouts et coupures réseau ne rejouent jamais de requêtes payantes.
- 🧠 **Normalisation du Raisonnement** : Nettoyage automatique des flux SSE de DeepSeek, Kimi et Qwen pour éviter toute fuite de texte de pensée dans le chat.
- 💰 **Sémantique Quest & Paid Transparente** : Nouveaux modes de facturation (`quest`, `quest_only`, `paid`, `manual`) avec planchers d'alerte en Pollen absolu.
- 📦 **Artifact Core (Magic Bytes)** : Vérification réelle des octets binaires (JPEG, PNG, GLB, MP4, MP3, WebM) garantissant la bonne extension de fichier sur le disque.
- ⏱️ **Hiérarchie de Timeouts Configurable** : Contrôle fin des timeouts par appel, par modèle et par capacité via `/poll config timeouts.*`.
- 🎯 **Quêtes & Connexion 1-Clic** : Suivi rétroactif des quêtes (`/poll quests`) et connexion automatique dans le navigateur (`/poll login`).
- 🆓 **6 Outils Créateurs Gratuits (sans clé)** : `gen_edit_image_free`, `gen_video_free`, `object_remover`, `image_upscaler`, `image_enhancer`, `remove_background`.

---

## 🧰 Outils & Commandes

Au-delà de la discussion textuelle, connecter votre clé donne aux Agents OpenCode accès aux outils multimédias propulsés par les modèles de Pollinations :

### 💎 Outils Génératifs Intégrés (ENTER ONLY - requiert une clé API)
- 🎨 `polli_gen_image` : Modèles d'imagerie de pointe (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Puissants modèles Texte-vers-Vidéo et Image-vers-Vidéo (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : Génération d'actifs 3D haute qualité (`trellis-2`, `hyper3d-rodin`) au format GLB.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Synthèse vocale (ElevenLabs, OpenAI TTS) et Musique Générative.
- 🎙️ `polli_stt` : Transcription vocale de haute volée (Whisper V3).
- 🌐 `polli_web_search` : Outil de recherche web connecté et contextes spécialisés (`gemini-search`, `perplexity...`).

### 🧰 Outils Bonus Créateurs Gratuits (Toujours disponibles — sans clé API)
- 🆓 `gen_edit_image_free` : Génération et édition d'images gratuite (~20/jour, tout modèle, sans clé).
- 🆓 `gen_video_free` : Texte-vers-vidéo gratuit avec image et audio d'entrée optionnels (~5/jour, sans clé).
- 🧹 `object_remover` : Suppression d'objets par prompt en direct (30-120s, sans clé).
- 📐 `image_upscaler` : Agrandissement 2x/4x gratuit (30-120s, sans clé).
- ✨ `image_enhancer` : Amélioration IA — débruitage, netteté, restauration (30-120s, sans clé).
- ✂️ `remove_background` : Suppression de fond d'image IA via rmbg (bgeraser.com) — gratuit.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url` : Utilitaires développeurs.

### 💻 Liste Complète des Commandes Terminal
Utilisez l'alias **`/poll`** ou **`/pollinations`** à tout moment dans le terminal de conversation :
- `/poll help` : Affiche le tableau d'aide interactif.
- `/poll login` : **Connexion navigateur en 1 clic** (device flow) — crée et connecte une clé automatiquement.
- `/poll connect <clé>` : Configuration manuelle "Bring Your Own Key" (`sk_...`).
- `/poll quests` : Consultez vos quêtes et le Pollen gratuit à réclamer. 🎯
- `/poll usage full` : Tableau de bord en temps réel (Statistiques), Quêtes actives et Solde du Portefeuille.
- `/poll config` : Ajustement fin du Cost Guard, des timeouts, des logs, de la langue et de l'affichage.
- `/poll models` : Vérifiez l'état des modèles disponibles.
- `/poll pricing` : Consultez la tarification unifiée en temps réel (Estimation du coût moyen).
- `/poll mode <mode>` : Basculez entre les modes de facturation (`quest`, `quest_only`, `paid`, `manual`).
- `/poll fallback` : Définissez le modèle de secours ultime pour le chat.
- `/poll infos` : Découvrez les fonctionnalités et le guide d'utilisation.

---

## 🛡️ Le "Cost Guard" & le "Filet de Sécurité"

Nous avons introduit des protections fondamentales pour garantir que votre flux de travail ne s'interrompe jamais et que votre budget (Pollen Quest & Paid) reste sous votre contrôle absolu :

- 🛟 **Filet de Sécurité (Safety Net)** : Si vous utilisez des modèles premium et que votre solde Quest/Paid s'épuise en pleine session de chat, le plugin bascule silencieusement vers un modèle gratuit de secours. *Plus d'erreurs bloquantes (429).*
- 🚦 **Cost Guard pour les Outils** : Les Agents OpenCode peuvent être zélés. Si un Agent tente de dépenser trop de Pollen pour générer une vidéo ou un rendu 3D lourd, le plugin intercepte la requête. Un flux asynchrone demandera votre confirmation manuelle (`polli_gen_confirm`).

---

## 🐝 Comprendre le Quest Pollen & le Paid Pollen

Le pollen Pollinations est réparti en deux colonnes :

- **🎁 Quest Pollen** — gagné gratuitement en complétant des **Quêtes**. Consommé en premier par le serveur sur les modèles réguliers.
- **💎 Paid Pollen** — acheté (carte bancaire). Utilisé quand le Quest est insuffisant, ou pour les modèles `paid_only`.

> ⚠️ Le plugin ne peut pas lire la répartition côté serveur ; il estime Quest/Paid localement et lit la répartition réelle (`meter_source`) via `/account/usage`.

### Modes de facturation (v6.5) :

| Mode | Comportement |
| :--- | :--- |
| `quest` (QUEST_PREFERRED, **défaut**) | Quest d'abord, bascule Paid autorisée. Retombe sur l'univers gratuit quand les deux semblent épuisés. |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | Bloque les modèles `paid_only` localement ; envoie uniquement les appels éligibles Quest. **Best-effort** — un débit Paid peut survenir. |
| `paid` (PAID_ALLOWED) | Paid autorisé, `paid_only` selon le Cost Guard. Retombe sur le gratuit quand le wallet est bas. |
| `manual` | Aucune politique automatique — contrôle total. |

Changez avec `/poll mode <mode>` ou `/poll config mode <mode>`.

> 🎯 **Gagnez du pollen gratuit en complétant des Quêtes !** Utiliser simplement ce plugin en complète plusieurs rétroactivement. Lancez `/poll quests`.

> 🎁 **Obtenez votre Clé Personnelle Gratuite (BYOK) sur [enter.pollinations.ai](https://enter.pollinations.ai) pour booster OpenCode !**

**Comment ça marche :**
1. Votre Quest Pollen est consommé en premier sur les modèles réguliers.
2. Les modèles `paid_only` 💎 consomment toujours du Pollen acheté.
3. Quand les soldes sont épuisés, le filet de sécurité bascule doucement vers les modèles gratuits de secours.

---

## 🌍 Support Multilingue Natif (i18n)

Pollinations pour OpenCode parle votre langue nativement :
- L'interface, les notifications (Toasts), les retours d'outils et les commandes sont traduits en **Anglais**, **Français**, **Espagnol**, **Allemand**, **Italien** et **Chinois**.
- Tapez `/poll config lang <en|fr|es|de|it|zh>` dans le terminal pour basculer instantanément.

---

## 🚀 Installation & Onboarding

### 🐧 1. Configuration Multi-OS (Installation NPM)
Ce plugin est **totalement multiplateforme** (Windows, macOS, Linux ; Node **≥ 18**) et démarre un proxy local sur un port dynamique.

1. Installation globale ou locale :
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuration :
   ```bash
   npx opencode-pollinations-plugin
   # ou: npx opencode-pollinations-plugin --check
   ```
   *(Injecte automatiquement `opencode-pollinations-plugin` dans votre fichier `~/.config/opencode/opencode.json`)*

### 🔐 2. Connectez votre compte Pollinations — recommandé

Le parcours normal tient en **une commande** :

```bash
/poll login
```

Le navigateur s’ouvre automatiquement. Connectez-vous avec GitHub puis cliquez sur **Authorize** ; le plugin se connecte tout seul. **Aucune clé API à créer, copier ou coller.** C’est le chemin recommandé pour le compte, les Quêtes, le wallet, les modèles premium et les outils payants.

> 🤖 **Agents :** si l’utilisateur demande à connecter son compte Pollinations, appelez automatiquement l’outil `polli_login`. Ne lui demandez pas de créer/coller une clé sauf s’il veut explicitement le BYOK manuel.

**BYOK manuel — optionnel, uniquement si vous avez déjà une clé Secret :**
```bash
/poll connect sk_votre_cle_ici
```

---

## 🔗 Liens

- **Dashboard & Clés API** : [enter.pollinations.ai](https://enter.pollinations.ai)
- **Communauté Discord** : [Rejoignez-nous !](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosystème OpenCode** : [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licence

Licence MIT. Créé par [fkom13](https://github.com/fkom13) & La Communauté Pollinations.
