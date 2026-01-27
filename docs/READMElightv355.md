Opencode Pollinations Plugin V3.5.5 (Universal Edition)
IMPORTANT

Version Stable & Hardened (V3.5.5+) Ce plugin transforme votre expérience OpenCode en intégrant l'univers Pollinations.ai complet, avec une gestion hybride Gratuit / Enterprise transparente et des correctifs de stabilité critiques pour les modèles avancés (Gemini 2.5/3.0, Azure, NomNom).

🌟 Fonctionnalités Clés
1. Dual Universe Architecture (Ségrégation Stricte)
Le plugin détecte automatiquement votre statut et route les requêtes intelligemment :

Univers Gratuit ([Free]) :
Accès illimité aux modèles Text (mistral, gemini, openai-fast,...).
Endpoint : text.pollinations.ai.
Zéro Config : Fonctionne immédiatement sans clé API.
Univers Enterprise ([Enter]) :
Débloqué si apiKey est présent dans auth.json.
Accès aux modèles Premium (Gemini 3.0, Claude 3.5, GPT-4o, NomNom).
Endpoint : gen.pollinations.ai (Privé & Sécurisé).
2. Hardening & Stabilité (V3.6 Core)
🛡️ Gemini Thinking Fix (Prompt-Keyed Persistence) :
Résolution définitive de l'erreur missing a thought_signature sur Vertex AI.
Utilise une stratégie de Hachage du Prompt Utilisateur pour garantir la persistance des signatures contextuelles, même lors de rechargement d'historique ou de Tool Calls complexes.
⚡ Zero-Error 400 (Gemini Fast/Flash) :
Exclusion automatique et chirurgicale de l'outil google_search pour les modèles incompatibles (Gemini 2.5 Fast, NomNom, Flash) afin d'éviter les conflits Vertex.
Support complet de la recherche pour Gemini 3.0 Pro.
🆔 Azure/OpenAI Compatibility :
Truncation stricte des IDs de Tool Calls (> 40 chars) pour respecter les contraintes rigides des APIs Enterprise.
3. Expérience Utilisateur (UI)
Noms Clairs : Préfixes [Free] et [Enter] pour savoir exactement ce que vous consommez.
Offline Mode : Si Internet ou Auth échoue, le plugin dégrade gracieusement vers une whitelist de sécurité.
🛠️ Installation & Configuration
Pré-requis
OpenCode (Dernière version)
Node.js (v18+)
Mise en Place Rapide
Cloner & Installer :
git clone https://github.com/pollinations/opencode-pollinations-plugin.git
cd opencode-pollinations-plugin
npm install
npm run build
Enregistrer dans OpenCode (~/.config/opencode/opencode.json) :
{
  "plugins": [
    "opencode-pollinations-plugin" // ou chemin absolu
  ]
}
Configurer la Clé (Optionnel pour Enterprise) : Créez ~/.config/opencode/auth.json :
{
  "pollinations": {
    "apiKey": "votre-cle-pollen-ici"
  }
}
🗺️ Roadmap V4 & Futur
Nous préparons la prochaine évolution pour rendre le plugin encore plus interactif et paramétrable.

🚀 Prochainement (V4)
Fonctionnalité	Description	Priorité
Commandes Slash	/pollinations config, /pollinations mode pour changer de réglages à la volée sans redémarrer.	🔥 Haute
Toast Notifications	Feedback visuel (UI Opencode) lors des changements de contexte ou erreurs (via MCP Toast).	🔥 Haute
Verbosité Dynamique	Contrôle du niveau de logs (silent, 
info
, debug) directement depuis le chat.	Moyenne
Paramètres Modèles	Définir temperature, top_k, max_tokens par défaut via un fichier de config utilisateur étendu.	Moyenne
Mode Économique	Option "Force Free" pour ignorer les modèles payants même si une clé est présente (pour économiser les crédits).	Basse
Extensions Prévues
Endpoint Usage : /v1/user/usage pour afficher votre solde de crédits Pollen en temps réel.
Proxy Intelligent V2 : Retry automatique sur les modèles Fallback en cas de surcharge API.
Développé avec ❤️ par l'équipe Antigravity & Franck. Pour toute remontée de bug, merci de fournir les logs situés dans 
/tmp/opencode_pollinations_debug.log
.
