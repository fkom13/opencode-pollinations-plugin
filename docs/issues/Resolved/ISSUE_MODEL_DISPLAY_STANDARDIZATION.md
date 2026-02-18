# 🔧 ISSUE: Standardisation des Noms de Modèles Pollinations

**Date**: 16 Février 2026  
**Statut**: 🔴 CRITIQUE  
**Composant**: `src/server/generate-config.ts` (mapModel function)  
**Impact**: UI - Affichage redondant des noms de modèles

---

## 📋 Problème Actuel

### Affichage ACTUEL (❌ Problématique)

OpenCode affiche en **2 colonnes** :
```
[Enter] OpenAI GPT-5 Mini      │ Pollinations
[Enter] Google Gemmi           │ Pollinations AI (v6.0.0-dev.6glm)
[Enter] Claude S               │ Pollinations
[Free] Gemini Flas             │ Pollinations (gemini forcé)
[💎 Paid] Claude Sonnet        │ Pollinations
```

**Problèmes identifiés**:
- ❌ Colonne 1 (noms): Texte tronqué/coupé (`OpenAI GPT-5` au lieu de complet)
- ❌ Colonne 1 : Préfixes `[Enter]` / `[Free]` / `[💎 Paid]` générés par `namePrefix`
- ❌ Colonne 1 : Pas de distinction entre modèles payants et FREE universe
- ❌ Colonne 2 : Suffixe "Pollinations AI (v6.0.0-dev.6glm)" **géré par OpenCode** (immutable)
- ✅ Ce qui nous reste à faire: **Nettoyer la Colonne 1 uniquement**

---

## 🎯 Affichage ATTENDU (✅ Correct)

### Colonne 1 PROPRE:
```
GPT-5 Mini 💻                    │ Pollinations
Gemini 3 Flash 👁️🧠              │ Pollinations
Claude Sonnet 4.5 💻             │ Pollinations
💎 Claude Opus 4.6 💻            │ Pollinations
GPT-OSS 20B (free) 🧠💻          │ Pollinations
⚡ Pollinations                  │ Pollinations
```

**Règles appliquées** (Colonne 1 seulement):
1. ✅ **SUPPRIMER** les préfixes `[Enter]` / `[Free]` / `[💎 Paid]`
2. ✅ **AJOUTER** `(free)` uniquement aux modèles de `text.pollinations.ai/models`
3. ✅ **GARDER** les icônes de capacité (💻, 👁️, 🧠, 🔍)
4. ✅ **AJOUTER** `💎` devant les modèles `paid_only: true` (au lieu du préfixe)
5. ✅ **UTILISER** les noms propres de l'API (ex: "GPT-5 Mini" au lieu de "Open Ai Gpt 5 Mini")
6. ✅ **AJOUTER** le modèle spécial `⚡ Pollinations` comme fallback/inscription

---

## 🔍 Analyse du Code Actuel

### Localisation: `src/server/generate-config.ts`

#### Fonction: `mapModel()` (Ligne 219-301)

```typescript
function mapModel(raw: any, prefix: string, namePrefix: string): OpenCodeModel {
    // Ligne 220-221: Construction de l'ID
    const rawId = raw.id || raw.name;
    const fullId = prefix + rawId; // "free/gemini" ou "enter/claude"

    // Ligne 223-226: Extraction du nom de base
    let baseName = raw.description;
    if (!baseName || baseName === rawId) {
        baseName = formatName(rawId, raw.censored !== false);
    }

    // Ligne 230-232: CLEANUP - Tronquer après le tiret ✅ BON
    if (baseName && baseName.includes(' - ')) {
        baseName = baseName.split(' - ')[0].trim();
    }

    // Ligne 234-237: ❌ PROBLEME - Ajoute le préfixe [Enter]/[Free]
    let namePrefixFinal = namePrefix; // "[Enter] " ou "[Free] " ← À SUPPRIMER
    if (raw.paid_only) {
        namePrefixFinal = namePrefix.replace('[Enter]', '[💎 Paid]');
    }

    // Ligne 240-241: Construction du nom final
    const capabilityIcons = getCapabilityIcons(raw);
    const finalName = `${namePrefixFinal}${baseName}${capabilityIcons}`;
    
    // Résultat ACTUEL: "[Enter] OpenAI GPT-5 Mini 💻"
    // Résultat ATTENDU: "GPT-5 Mini 💻"
}
```

### Appel à mapModel():

**Univers FREE** (Ligne 115):
```typescript
const mapped = mapModel(m, 'free/', '[Free] '); // ← À modifier
```

**Univers ENTER** (Ligne 153):
```typescript
const mapped = mapModel(m, 'enter/', '[Enter] '); // ← À modifier
```

---

## 💡 Solution Proposée

### Changement 1: Supprimer les préfixes [Enter]/[Free]/[💎 Paid]

**Avant** (Ligne 115 et 153):
```typescript
const mapped = mapModel(m, 'free/', '[Free] ');  // Passe "[Free] " comme namePrefix
const mapped = mapModel(m, 'enter/', '[Enter] '); // Passe "[Enter] " comme namePrefix
```

**Après**:
```typescript
const mapped = mapModel(m, 'free/', '');  // Passe une chaîne vide
const mapped = mapModel(m, 'enter/', ''); // Passe une chaîne vide
```

### Changement 2: Modifier `mapModel()` pour gérer les cas spéciaux

**Avant** (Ligne 234-241):
```typescript
let namePrefixFinal = namePrefix; // "[Enter] " ou "[Free] "
if (raw.paid_only) {
    namePrefixFinal = namePrefix.replace('[Enter]', '[💎 Paid]');
}

const capabilityIcons = getCapabilityIcons(raw);
const finalName = `${namePrefixFinal}${baseName}${capabilityIcons}`;
```

**Après**:
```typescript
// Gérer les icônes pour paid_only et modèles FREE
let paidPrefix = '';
let freeSuffix = '';

if (raw.paid_only) {
    paidPrefix = '💎 '; // Ajouter icône diamant devant
}

if (prefix === 'free/') {
    freeSuffix = ' (free)'; // Ajouter "(free)" au modèle FREE universe
}

const capabilityIcons = getCapabilityIcons(raw);
const finalName = `${paidPrefix}${baseName}${capabilityIcons}${freeSuffix}`;
```

**Résultat**:
- "GPT-5 Mini 💻" (normal ENTER)
- "💎 Claude Opus 4.6 💻" (paid ENTER)
- "GPT-OSS 20B 🧠💻 (free)" (FREE universe)

---

## 🔴 Problème Secondaire: Modèle Forcé Gemini

### Situation ACTUELLE:

Ligne 129-133 du code:
```typescript
const hasGemini = modelsOutput.find(m => m.id === 'free/gemini');
if (!hasGemini) {
    log(`[ConfigGen] Force-injecting free/gemini.`);
    modelsOutput.push({ id: "free/gemini", name: "[Free] Gemini Flash (Force)", object: "model", variants: {} });
}
```

**Problème**:
- ❌ On injecte TOUJOURS `Gemini Flash` même si l'API FREE est instable
- ❌ Pourquoi? Pour garantir au minimum un modèle disponible
- ⚠️ Mais l'univers FREE est deprecated et instable

### Solution Proposée: Créer un Modèle Spécial `connect-pollinations`

**Objectif**: 
- ✅ Remplace le modèle "gemini forcé"
- ✅ Affiche `⚡ Pollinations` au lieu de Gemini
- ✅ Permet à l'utilisateur de voir qu'il doit se connecter
- ✅ Les modèles FREE disponibles s'affichent normalement quand disponibles

**Implémentation dans `generatePollinationsConfig()`** - Ligne 127:

**Avant**:
```typescript
// 1.5 FORCE ENSURE CRITICAL MODELS
const hasGemini = modelsOutput.find(m => m.id === 'free/gemini');
if (!hasGemini) {
    log(`[ConfigGen] Force-injecting free/gemini.`);
    modelsOutput.push({ id: "free/gemini", name: "[Free] Gemini Flash (Force)", object: "model", variants: {} });
}
```

**Après**:
```typescript
// 1.5 FALLBACK: Si aucun modèle, ajouter le modèle de connexion
if (modelsOutput.length === 0) {
    log(`[ConfigGen] No models available. Adding connect-pollinations fallback.`);
    modelsOutput.unshift({
        id: 'connect-pollinations',
        name: '⚡ Pollinations',
        object: 'model',
        variants: {}
    });
}
```

---

## 📊 Données de l'API Analysées

### Univers ENTER (`/gen.pollinations.ai/text/models`)

30 modèles avec structure:
```json
{
  "name": "openai",
  "description": "OpenAI GPT-5 Mini - Fast & Balanced",
  "input_modalities": ["text", "image"],
  "output_modalities": ["text"],
  "tools": true,
  "paid_only": false
}
```

**Noms extraits (après split par " - ")**:
- ✅ "OpenAI GPT-5 Mini"
- ✅ "Google Gemini 3 Flash"
- ✅ "Anthropic Claude Sonnet 4.5"
- ✅ "Perplexity Sonar"

### Univers FREE (`/text.pollinations.ai/models`)

1 modèle:
```json
{
  "name": "openai-fast",
  "description": "GPT-OSS 20B Reasoning LLM (OVH)",
  "aliases": ["openai", "gpt-oss", "gpt-oss-20b", "ovh-reasoning"]
}
```

**Nom extrait**: "GPT-OSS 20B Reasoning LLM"  
**Affichage final** (Col 1): `GPT-OSS 20B (free) 🧠💻`

---

## ✅ Fichiers à Modifier

### 1. `src/server/generate-config.ts` - Appels à mapModel()

**Ligne 115** (Univers FREE):
```diff
- const mapped = mapModel(m, 'free/', '[Free] ');
+ const mapped = mapModel(m, 'free/', '');
```

**Ligne 153** (Univers ENTER):
```diff
- const mapped = mapModel(m, 'enter/', '[Enter] ');
+ const mapped = mapModel(m, 'enter/', '');
```

### 2. `src/server/generate-config.ts` - Fonction `mapModel()`

**Ligne 234-241** (Ancien code avec préfixes):
```typescript
let namePrefixFinal = namePrefix; // "[Enter] " ou "[Free] "
if (raw.paid_only) {
    namePrefixFinal = namePrefix.replace('[Enter]', '[💎 Paid]');
}

const capabilityIcons = getCapabilityIcons(raw);
const finalName = `${namePrefixFinal}${baseName}${capabilityIcons}`;
```

**Nouveau code** (Ligne 234-245):
```typescript
// Gérer les préfixes et suffixes intelligemment
let paidPrefix = '';
let freeSuffix = '';

// Ajouter 💎 devant les modèles paid_only (au lieu du préfixe)
if (raw.paid_only) {
    paidPrefix = '💎 ';
}

// Ajouter (free) pour les modèles de l'univers FREE
if (prefix === 'free/') {
    freeSuffix = ' (free)';
}

const capabilityIcons = getCapabilityIcons(raw);
const finalName = `${paidPrefix}${baseName}${capabilityIcons}${freeSuffix}`;
```

### 3. `src/server/generate-config.ts` - Fallback modèle

**Ligne 127-134** (Ancien code forçant Gemini):
```typescript
const hasGemini = modelsOutput.find(m => m.id === 'free/gemini');
if (!hasGemini) {
    log(`[ConfigGen] Force-injecting free/gemini.`);
    modelsOutput.push({ id: "free/gemini", name: "[Free] Gemini Flash (Force)", object: "model", variants: {} });
}
```

**Nouveau code**:
```typescript
// Si aucun modèle n'est disponible, ajouter le fallback de connexion
if (modelsOutput.length === 0) {
    log(`[ConfigGen] No models available. Adding connect-pollinations fallback.`);
    modelsOutput.unshift({
        id: 'connect-pollinations',
        name: '⚡ Pollinations',
        object: 'model',
        variants: {}
    });
}
```

### 4. `src/server/proxy.ts` - Gérer le modèle spécial

Ajouter dans `handleChatCompletion()` **avant** de router vers l'API Pollinations:

```typescript
// Gestion du modèle spécial de connexion
if (body.model === 'connect-pollinations') {
    const responseMessage = {
        choices: [{
            message: {
                role: 'assistant',
                content: `🔗 Se connecter à Pollinations\n\nAccédez à 30+ modèles IA de pointe\n\n📍 Étapes:\n1. Visitez https://enter.pollinations.ai\n2. Créez un compte gratuit\n3. Copiez votre API Key\n4. Exécutez: /pollinations config apiKey YOUR_KEY\n5. Redémarrez OpenCode\n\n✅ Bénéfices:\n• 30+ modèles avancés\n• Crédits gratuits\n• Stabilité garantie`
            },
            finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0 }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseMessage));
    return;
}
```

---

## 🎯 Comparaison AVANT/APRÈS

### AVANT (❌ Redondant):
```
Col 1                          │ Col 2
[Enter] OpenAI GPT-5 Mini      │ Pollinations AI (v6.0.0-dev.6glm)
[Enter] Google Gem             │ Pollinations AI (v6.0.0-dev.6glm)
[Free] Gemini Flas             │ Pollinations AI (v6.0.0-dev.6glm)
[💎 Paid] Claude S             │ Pollinations AI (v6.0.0-dev.6glm)
```

### APRÈS (✅ Pertinent):
```
Col 1                          │ Col 2
GPT-5 Mini 💻                  │ Pollinations
Gemini 3 Flash 👁️🧠            │ Pollinations
Claude Sonnet 4.5 💻           │ Pollinations
💎 Claude Opus 4.6 💻          │ Pollinations
GPT-OSS 20B (free) 🧠💻        │ Pollinations
⚡ Pollinations                │ Pollinations
```

---

## 📝 Détails Techniques

### Univers FREE: Toujours ajouter `(free)` en suffixe
- Source: `text.pollinations.ai/models` 
- Instable et deprecated
- Affichage: "GPT-OSS 20B (free) 🧠💻"

### Univers ENTER: Pas de suffixe
- Source: `gen.pollinations.ai/text/models`
- Stable et payant/freemium
- Affichage normal: "GPT-5 Mini 💻"

### Modèles Paid: Ajouter 💎 en préfixe
- Modèles avec `paid_only: true`
- Affichage: "💎 Claude Opus 4.6 💻"

### Modèle de Connexion: Fallback intelligent
- ID: `connect-pollinations`
- Affichage: `⚡ Pollinations`
- Destination: Message d'inscription simple

---

## 🔧 Checklist d'Implémentation

- [ ] Modifier `mapModel()` pour ajouter suffixe `(free)`
- [ ] Remplacer injection forcée Gemini par modèle `connect-pollinations`
- [ ] Ajouter gestion du modèle `connect-pollinations` dans proxy
- [ ] Tester avec API ENTER (avec clé)
- [ ] Tester avec API FREE (sans clé)
- [ ] Tester avec aucun modèle disponible
- [ ] Vérifier que les noms restent lisibles (max ~50 caractères)
- [ ] Vérifier les icones de capacité
- [ ] Build et test en CLI

---

## 💬 Questions de Clarification Résolues

✅ **Q**: "Pourquoi supprimer les préfixes [Enter]/[Free]?"  
**R**: OpenCode affiche en 2 colonnes. Col 2 c'est le provider. Col 1 c'est juste le nom du modèle. Les préfixes pollent l'affichage sans ajouter d'info.

✅ **Q**: "Comment distinguer FREE universe alors?"  
**R**: Ajouter `(free)` en suffixe. C'est lisible et clair: "GPT-OSS 20B (free) 🧠💻"

✅ **Q**: "Et les modèles payants?"  
**R**: Ajouter `💎` en préfixe pour les modèles `paid_only: true`. Exemple: "💎 Claude Opus 4.6 💻"

✅ **Q**: "Pourquoi pas [💎 Paid] à la place?"  
**R**: C'est trop long et pollue l'affichage. `💎` seul suffit et c'est plus épuré.

✅ **Q**: "Qu'est-ce qui remplace Gemini forcé?"  
**R**: Le modèle `connect-pollinations` avec l'affichage `⚡ Pollinations`. C'est plus clair pour l'utilisateur.

---

**État**: 🟡 Prêt pour implémentation  
**Assigné à**: [@opencode-pollinations-plugin](https://github.com/anomalyco/opencode-pollinations-plugin)  
**Labels**: `enhancement`, `ui`, `models`, `naming`

---

## 📺 Résumé Visuel des Changements

### Avant vs Après

| Cas | Avant | Après |
|-----|-------|-------|
| **Normal ENTER** | `[Enter] OpenAI GPT-5 Mini 💻` | `GPT-5 Mini 💻` |
| **Paid ENTER** | `[💎 Paid] Claude Opus 4.6 💻` | `💎 Claude Opus 4.6 💻` |
| **FREE universe** | `[Free] GPT-OSS 20B 🧠💻` | `GPT-OSS 20B (free) 🧠💻` |
| **Fallback** | `[Free] Gemini Flash (Force)` | `⚡ Pollinations` |

### Appels à mapModel()

| Univers | Avant | Après |
|---------|-------|-------|
| FREE | `mapModel(m, 'free/', '[Free] ')` | `mapModel(m, 'free/', '')` |
| ENTER | `mapModel(m, 'enter/', '[Enter] ')` | `mapModel(m, 'enter/', '')` |

### Logique dans mapModel()

**Ancien**:
```
namePrefixFinal = "[Enter] " ou "[Free] " ou "[💎 Paid]"
finalName = namePrefixFinal + baseName + icons
```

**Nouveau**:
```
paidPrefix = "💎 " ou ""
freeSuffix = " (free)" ou ""
finalName = paidPrefix + baseName + icons + freeSuffix
```

---

## ✅ Checklist d'Implémentation

- [ ] Modifier ligne 115: `mapModel(m, 'free/', '')`
- [ ] Modifier ligne 153: `mapModel(m, 'enter/', '')`
- [ ] Remplacer lignes 234-241 par nouvelle logique
- [ ] Remplacer lignes 127-133 par fallback `connect-pollinations`
- [ ] Ajouter gestion `connect-pollinations` dans proxy.ts
- [ ] Tester avec API ENTER + clé valide
- [ ] Tester avec API FREE (sans clé)
- [ ] Tester avec aucun modèle (fallback)
- [ ] Build et test en CLI
- [ ] Vérifier affichage dans OpenCode

---

**État**: ✅ RAPPORT COMPLET ET PRÉCIS  
**Composant**: Plugin Pollinations v6  
**Impact**: UI - Affichage des noms de modèles propre et pertinent
