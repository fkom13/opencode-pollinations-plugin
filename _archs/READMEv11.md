# Plugin OpenCode Pollinations

Ce plugin permet une intégration native et optimisée de l'API **Pollinations.ai** dans l'environnement **OpenCode**.
Il remplace les anciennes passerelles (gateway scripts) par une interception directe et intelligente des requêtes, offrant une meilleure performance et stabilité.

## 🚀 Fonctionnalités Clés

1.  **Interception Transparente** : Le plugin intercepte le trafic vers l'URL configurée et applique les transformations nécessaires à la volée.
2.  **Support Multi-Modèles** :
    *   **OpenAI / Azure** : Truncation automatique des IDs d'outils (>40 chars) pour éviter les erreurs Azure.
    *   **Gemini / Vertex AI** :
        *   Gestion avancée de l'historique (injection de signatures).
        *   Correction des schémas d'outils (dereferencing).
        *   Normalisation de la fin de flux (`STOP` -> `stop`), sauf en cas d'appels d'outils.
3.  **Sécurité & Stabilité** :
    *   Plafonnement de la mémoire tampon (50KB) pour éviter les fuites.
    *   Reconnectivité automatique.

## 📂 Architecture

Le plugin est conçu comme un fichier **autonome** (`standalone`) pour simplifier le déploiement.

*   **Emplacement** : `~/.config/opencode/plugins/pollinations.ts`
*   **Technologie** : TypeScript / Node.js (exécuté par le runtime OpenCode).
*   **Logique** : Proxy HTTP embarqué (interne) qui écoute sur un port dynamique (0) et redirige vers `https://gen.pollinations.ai`.

## 🛠 Installation

Le plugin s'installe en déposant simplement le fichier TypeScript dans le dossier de configuration d'OpenCode.

```bash
cp src/index.ts ~/.config/opencode/plugins/pollinations.ts
```

*(Note : Dans cet environnement, le fichier a été restauré pour correspondre à cette structure "plate").*

## ⚙️ Configuration (opencode.json)

Pour que le plugin s'active, il suffit de configurer le provider `pollinations_enter` pour pointer vers l'URL officielle. Le plugin détectera et interceptera automatiquement ce trafic.

```json
"provider": {
  "pollinations_enter": {
    "id": "pollinations",
    "name": "Pollinations Enterprise (Native Plugin)",
    "options": {
      "baseURL": "https://gen.pollinations.ai/v1",
      "apiKey": "sk_zbtwJAMIz5OOOMfFrqKAymcdpgePkxxK"
    }
    // ...
  }
}
```

**Important** : Ne PAS mettre `http://127.0.0.1...` dans le `baseURL`. Laissez l'URL distante. C'est le plugin qui fait la magie en local.

## 🐛 Debugging

En cas de problème, le plugin écrit des logs détaillés dans :
`/tmp/opencode_pollinations_debug.log`

Vous y trouverez :
*   Les requêtes entrantes/sortantes.
*   Les modifications de `finish_reason`.
*   Les erreurs de validation ou de réseau.

## 📝 Historique des Correctifs (v1.0)

*   [x] **Azure ID Fix** : Coupe stricte des IDs > 40 caractères pour Azure/OpenAI.
*   [x] **Gemini Stop** : Ne coupe plus le flux sur "STOP" si des outils sont appelés.
*   [x] **Gemini Signatures** : Injection robuste dans tout l'historique pour éviter le rejet par Vertex AI.
