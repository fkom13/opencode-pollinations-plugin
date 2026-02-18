# 🎯 FEATURE: Commandes `/pollinations pricing` et `/pollinations models`

**Date**: 17 Février 2026  
**Statut**: 📝 Design & Spec  
**Type**: Feature Enhancement  
**Branche**: À implémenter après refactoring

---

## 📋 Objectif

Ajouter deux nouvelles commandes CLI pour afficher:
1. **`/pollinations models`** - Liste complète des modèles disponibles par catégorie
2. **`/pollinations pricing`** - Tableau des tarifs par modèle et par modalité

Ces commandes répliquent le dashboard web de pollinations.ai mais en CLI/TUI.

---

## 🎨 Aperçu Visuel

### `/pollinations models`
```
┌─ Pollinations Models ──────────────────────────────────┐
│                                                         │
│ 📝 TEXT MODELS (15)                                    │
│  ├─ openai (GPT-5 Mini)                               │
│  ├─ openai-fast (GPT-5 Nano) ⭐ FREE TIER            │
│  ├─ openai-large (GPT-5.2 Reasoning)                  │
│  ├─ claude (Claude Sonnet 4.5) 💎 PAID               │
│  ├─ claude-fast (Claude Haiku 4.5)                    │
│  └─ [+10 more...]                                      │
│                                                         │
│ 🎨 IMAGE MODELS (8)                                   │
│  ├─ flux (Flux) - 0.2 🌻/img                          │
│  ├─ flux-realism (Flux Realism) - 0.2 🌻/img          │
│  └─ [+6 more...]                                       │
│                                                         │
│ 🎬 VIDEO MODELS (6)                                   │
│  ├─ grok-video (Grok Video) - 0.0125 🌻/s             │
│  ├─ ltx-2 (LTX-2) - 0.01 🌻/s                         │
│  └─ [+4 more...]                                       │
│                                                         │
│ 🔊 AUDIO MODELS (2)                                   │
│  ├─ openai-audio (GPT-4o Audio) - 0.0026 🌻/s         │
│  └─ elevenlabs (ElevenLabs) - 0.005 🌻/s              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### `/pollinations pricing`
```
┌─ Pollinations Pricing ─────────────────────────────────┐
│                                                         │
│ 📝 TEXT MODELS                                         │
│ Model              │ Input    │ Output   │ Status      │
│ ─────────────────────────────────────────────────────│
│ openai             │ 0.15 🌻  │ 0.6 🌻   │ ✅          │
│ openai-fast        │ 0.06 🌻  │ 0.44 🌻  │ ✅ FREE    │
│ openai-large       │ 1.75 🌻  │ 14 🌻    │ 💎 PAID    │
│ claude             │ 3 🌻     │ 15 🌻    │ 💎 PAID    │
│ claude-fast        │ 1 🌻     │ 5 🌻     │ ✅          │
│                                                         │
│ 🎨 IMAGE MODELS                                        │
│ Model              │ Price    │ Output   │ Status      │
│ ─────────────────────────────────────────────────────│
│ flux               │ 0.2 🌻   │ per img  │ ✅          │
│ flux-realism       │ 0.2 🌻   │ per img  │ 💎 PAID    │
│                                                         │
│ 🎬 VIDEO MODELS                                        │
│ Model              │ Price    │ Output   │ Status      │
│ ─────────────────────────────────────────────────────│
│ grok-video         │ 0.0125🌻 │ per sec  │ ✅          │
│ ltx-2              │ 0.01 🌻  │ per sec  │ ✅          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 Endpoints Utilisés

### 1. List Général (IDs + Timestamps)
```bash
GET /v1/models
Authorization: Bearer {apiKey}
```

### 2. Text Models (Détails complets)
```bash
GET /text/models
Authorization: Bearer {apiKey}
Response: Array<TextModel>
```

### 3. Image Models
```bash
GET /image/models
Authorization: Bearer {apiKey}
Response: Array<ImageModel>
```

### 4. Video Models
```bash
GET /video/models
Authorization: Bearer {apiKey}
Response: Array<VideoModel>
```

### 5. Audio Models
```bash
GET /audio/models
Authorization: Bearer {apiKey}
Response: Array<AudioModel>
```

---

## 📊 Structure des Données

### Text Model
```typescript
interface TextModel {
  name: string;
  description: string;
  input_modalities: string[];
  output_modalities: string[];
  tools: boolean;
  reasoning?: boolean;
  pricing: {
    promptTextTokens: number;
    completionTextTokens: number;
    promptCachedTokens?: number;
  };
  paid_only?: boolean;
  context_window?: number;
}
```

### Image Model
```typescript
interface ImageModel {
  name: string;
  description: string;
  pricing: {
    perImage?: number;  // pollen cost
  };
  paid_only?: boolean;
  max_resolution?: number;
}
```

### Video Model
```typescript
interface VideoModel {
  name: string;
  description: string;
  pricing: {
    perSecond?: number;  // pollen cost
    min_duration?: number;
    max_duration?: number;
  };
  paid_only?: boolean;
}
```

### Audio Model
```typescript
interface AudioModel {
  name: string;
  description: string;
  pricing: {
    perSecond?: number;  // pollen cost
  };
  paid_only?: boolean;
  voices?: string[];
}
```

---

## 🏗️ Architecture Proposée

### Nouveau Module: `src/server/models-command.ts`

```
src/server/
├── commands.ts (existant - appelle models-command.ts)
├── models-command.ts (NOUVEAU)
└── models/
    ├── fetcher.ts (récupère les données)
    ├── formatter.ts (formate pour affichage)
    ├── cache.ts (cache les résultats)
    └── __tests__/
        ├── fetcher.test.ts
        ├── formatter.test.ts
        └── cache.test.ts
```

### Fichier Principal: `src/server/models-command.ts`

```typescript
/**
 * Handle /pollinations models and /pollinations pricing commands
 */

import { ModelsFetcher } from './models/fetcher.js';
import { ModelsFormatter } from './models/formatter.js';
import { ModelsCache } from './models/cache.js';
import { loadConfig } from './config.js';

export async function handleModelsCommand(type: 'models' | 'pricing', options: any = {}) {
  try {
    const config = loadConfig();
    if (!config.apiKey) {
      return { error: 'API Key required. Run: /pollinations config apiKey YOUR_KEY' };
    }

    const cache = new ModelsCache();
    let data = cache.get(type);

    if (!data) {
      const fetcher = new ModelsFetcher(config.apiKey);
      data = await fetcher.fetchAll(); // Récupère toutes les catégories
      cache.set(type, data, 3600); // Cache 1 heure
    }

    const formatter = new ModelsFormatter();
    const output = type === 'models' 
      ? formatter.formatModels(data, options)
      : formatter.formatPricing(data, options);

    return { success: true, output };
  } catch (e) {
    return { error: `Failed to fetch models: ${e.message}` };
  }
}

export { ModelsFetcher, ModelsFormatter, ModelsCache };
```

### Sous-module: `src/server/models/fetcher.ts`

```typescript
/**
 * Fetch models from all Pollinations endpoints
 */

import * as https from 'https';

export class ModelsFetcher {
  private apiKey: string;
  private baseUrl = 'https://gen.pollinations.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchAll() {
    const [text, image, video, audio] = await Promise.all([
      this.fetch('/text/models'),
      this.fetch('/image/models'),
      this.fetch('/video/models'),
      this.fetch('/audio/models'),
    ]);

    return { text, image, video, audio };
  }

  private fetch(endpoint: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const req = https.get(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) || []);
          } catch (e) {
            reject(new Error(`Invalid JSON from ${endpoint}: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error(`Timeout on ${endpoint}`));
      });
    });
  }
}
```

### Sous-module: `src/server/models/formatter.ts`

```typescript
/**
 * Format models data for CLI display
 */

export class ModelsFormatter {
  formatModels(data: any, options: any = {}) {
    const lines: string[] = [];
    lines.push('┌─ Pollinations Models ─────────────────────────────┐');
    lines.push('│                                                   │');

    if (data.text?.length) {
      lines.push(`│ 📝 TEXT MODELS (${data.text.length})                      │`);
      data.text.slice(0, 5).forEach((m: any) => {
        const status = m.paid_only ? '💎 PAID' : m.name === 'openai-fast' ? '⭐ FREE' : '';
        lines.push(`│  ├─ ${m.name.padEnd(20)} ${status}              │`);
      });
      if (data.text.length > 5) {
        lines.push(`│  └─ [+${data.text.length - 5} more...]                  │`);
      }
      lines.push('│                                                   │');
    }

    if (data.image?.length) {
      lines.push(`│ 🎨 IMAGE MODELS (${data.image.length})                     │`);
      data.image.slice(0, 3).forEach((m: any) => {
        const price = m.pricing?.perImage ? `- ${m.pricing.perImage} 🌻` : '';
        lines.push(`│  ├─ ${m.name.padEnd(15)} ${price}           │`);
      });
      if (data.image.length > 3) {
        lines.push(`│  └─ [+${data.image.length - 3} more...]                 │`);
      }
      lines.push('│                                                   │');
    }

    if (data.video?.length) {
      lines.push(`│ 🎬 VIDEO MODELS (${data.video.length})                    │`);
      data.video.slice(0, 3).forEach((m: any) => {
        const price = m.pricing?.perSecond ? `- ${m.pricing.perSecond} 🌻/s` : '';
        lines.push(`│  ├─ ${m.name.padEnd(15)} ${price}        │`);
      });
      if (data.video.length > 3) {
        lines.push(`│  └─ [+${data.video.length - 3} more...]                 │`);
      }
      lines.push('│                                                   │');
    }

    if (data.audio?.length) {
      lines.push(`│ 🔊 AUDIO MODELS (${data.audio.length})                    │`);
      data.audio.slice(0, 2).forEach((m: any) => {
        const price = m.pricing?.perSecond ? `- ${m.pricing.perSecond} 🌻/s` : '';
        lines.push(`│  ├─ ${m.name.padEnd(15)} ${price}        │`);
      });
      lines.push('│                                                   │');
    }

    lines.push('└─────────────────────────────────────────────────┘');
    return lines.join('\n');
  }

  formatPricing(data: any, options: any = {}) {
    const lines: string[] = [];
    lines.push('┌─ Pollinations Pricing ────────────────────────────┐');
    lines.push('│                                                   │');

    if (data.text?.length) {
      lines.push('│ 📝 TEXT MODELS                                    │');
      lines.push('│ Model            │ Input   │ Output  │ Status    │');
      lines.push('│ ─────────────────────────────────────────────── │');
      
      data.text.slice(0, 5).forEach((m: any) => {
        const input = m.pricing?.promptTextTokens 
          ? `${(m.pricing.promptTextTokens * 1000000).toFixed(2)} 🌻`
          : '-';
        const output = m.pricing?.completionTextTokens
          ? `${(m.pricing.completionTextTokens * 1000000).toFixed(2)} 🌻`
          : '-';
        const status = m.paid_only ? '💎 PAID' : '✅';
        
        lines.push(`│ ${m.name.padEnd(16)} │ ${input.padEnd(7)} │ ${output.padEnd(7)} │ ${status.padEnd(9)} │`);
      });
      
      lines.push('│                                                   │');
    }

    lines.push('└─────────────────────────────────────────────────┘');
    return lines.join('\n');
  }
}
```

### Sous-module: `src/server/models/cache.ts`

```typescript
/**
 * Simple in-memory cache for models data
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export class ModelsCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number = 3600) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}
```

---

## 🧪 Tests Unitaires

### `src/server/models/__tests__/fetcher.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as nock from 'nock';
import { ModelsFetcher } from '../fetcher';

describe('ModelsFetcher', () => {
  let fetcher: ModelsFetcher;

  beforeEach(() => {
    fetcher = new ModelsFetcher('sk_test_key');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch text models', async () => {
    nock('https://gen.pollinations.ai')
      .get('/text/models')
      .matchHeader('authorization', 'Bearer sk_test_key')
      .reply(200, [
        { name: 'openai', paid_only: false },
        { name: 'claude', paid_only: true }
      ]);

    const result = await fetcher.fetch('/text/models');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('openai');
  });

  it('should fetch all models', async () => {
    nock('https://gen.pollinations.ai')
      .get('/text/models').reply(200, [{ name: 'openai' }])
      .get('/image/models').reply(200, [{ name: 'flux' }])
      .get('/video/models').reply(200, [{ name: 'grok-video' }])
      .get('/audio/models').reply(200, [{ name: 'openai-audio' }]);

    const result = await fetcher.fetchAll();
    expect(result.text).toHaveLength(1);
    expect(result.image).toHaveLength(1);
    expect(result.video).toHaveLength(1);
    expect(result.audio).toHaveLength(1);
  });

  it('should handle fetch errors', async () => {
    nock('https://gen.pollinations.ai')
      .get('/text/models')
      .reply(500);

    await expect(fetcher.fetchAll()).rejects.toThrow();
  });
});
```

### `src/server/models/__tests__/formatter.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { ModelsFormatter } from '../formatter';

describe('ModelsFormatter', () => {
  let formatter: ModelsFormatter;

  beforeEach(() => {
    formatter = new ModelsFormatter();
  });

  it('should format models with correct categories', () => {
    const data = {
      text: [
        { name: 'openai', paid_only: false },
        { name: 'claude', paid_only: true }
      ],
      image: [{ name: 'flux' }],
      video: [{ name: 'grok-video' }],
      audio: [{ name: 'openai-audio' }]
    };

    const output = formatter.formatModels(data);
    expect(output).toContain('TEXT MODELS (2)');
    expect(output).toContain('IMAGE MODELS (1)');
    expect(output).toContain('VIDEO MODELS (1)');
    expect(output).toContain('AUDIO MODELS (1)');
  });

  it('should show paid status correctly', () => {
    const data = {
      text: [{ name: 'claude', paid_only: true }],
      image: [],
      video: [],
      audio: []
    };

    const output = formatter.formatModels(data);
    expect(output).toContain('💎 PAID');
  });

  it('should format pricing table', () => {
    const data = {
      text: [
        {
          name: 'openai',
          pricing: {
            promptTextTokens: 1.5e-7,
            completionTextTokens: 6e-7
          },
          paid_only: false
        }
      ],
      image: [],
      video: [],
      audio: []
    };

    const output = formatter.formatPricing(data);
    expect(output).toContain('TEXT MODELS');
    expect(output).toContain('openai');
  });
});
```

### `src/server/models/__tests__/cache.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ModelsCache } from '../cache';

describe('ModelsCache', () => {
  let cache: ModelsCache;

  beforeEach(() => {
    cache = new ModelsCache();
  });

  it('should store and retrieve data', () => {
    const data = { test: 'data' };
    cache.set('key', data, 3600);
    expect(cache.get('key')).toEqual(data);
  });

  it('should return null for expired entries', () => {
    const data = { test: 'data' };
    cache.set('key', data, -1); // Expired
    expect(cache.get('key')).toBeNull();
  });

  it('should clear all cache', () => {
    cache.set('key1', { data: 1 }, 3600);
    cache.set('key2', { data: 2 }, 3600);
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });
});
```

---

## 🔌 Intégration dans `commands.ts`

### Modification de `src/server/commands.ts`

```typescript
import { handleModelsCommand } from './models-command.js';

// Ajouter dans le gestionnaire de commandes:

if (cmd === 'models') {
  const result = await handleModelsCommand('models', options);
  if (result.error) {
    emitLogToast('error', result.error);
  } else {
    emitLogToast('info', result.output);
  }
  return;
}

if (cmd === 'pricing') {
  const result = await handleModelsCommand('pricing', options);
  if (result.error) {
    emitLogToast('error', result.error);
  } else {
    emitLogToast('info', result.output);
  }
  return;
}
```

---

## 📁 Arborescence Finale

```
src/server/
├── commands.ts (modifié - ajoute les routes models/pricing)
├── models-command.ts (NOUVEAU - orchestrateur)
├── models/
│   ├── fetcher.ts (NOUVEAU - récupère les données)
│   ├── formatter.ts (NOUVEAU - formate l'affichage)
│   ├── cache.ts (NOUVEAU - cache les données)
│   └── __tests__/
│       ├── fetcher.test.ts (NOUVEAU)
│       ├── formatter.test.ts (NOUVEAU)
│       └── cache.test.ts (NOUVEAU)
└── ... (autres fichiers existants)
```

---

## 🔍 Commandes de Test

### Développement
```bash
npm test -- models/

# Tous les tests du module
npm test src/server/models/__tests__/
```

### Build
```bash
npm run build
```

### Utilisation en CLI
```bash
/pollinations models
/pollinations pricing

# Avec options (futur)
/pollinations models --filter text
/pollinations pricing --sort price
```

---

## 📝 Documentation

### Usage
```markdown
## /pollinations models

Affiche la liste complète des modèles disponibles groupés par catégorie:
- 📝 Text (LLMs)
- 🎨 Image (T2I, I2I)
- 🎬 Video (T2V, I2V)
- 🔊 Audio (TTS, STT, Music)

### Exemple
\`\`\`
/pollinations models
\`\`\`

## /pollinations pricing

Affiche le tableau des tarifs pour tous les modèles.
Les prix sont en pollen (🌻).

### Exemple
\`\`\`
/pollinations pricing
\`\`\`
```

---

## ⚠️ Notes d'Implémentation

1. **Cache**: Les données sont cachées 1h pour éviter de surcharger l'API
2. **Erreurs**: Si l'API retourne une erreur, afficher un message clair
3. **API Key**: Requis - afficher erreur si absent
4. **Performance**: Fetch parallèle pour les 4 endpoints
5. **Timeout**: 5s par endpoint
6. **Tests**: 100% de couverture sur les 3 modules

---

## 🎯 Checklist d'Implémentation

- [ ] Créer `src/server/models/fetcher.ts`
- [ ] Créer `src/server/models/formatter.ts`
- [ ] Créer `src/server/models/cache.ts`
- [ ] Créer `src/server/models-command.ts`
- [ ] Créer tests unitaires (3 fichiers)
- [ ] Modifier `src/server/commands.ts`
- [ ] Build et test en local
- [ ] Documenter dans README.md
- [ ] Prêt pour merge dans branche refactoring

---

**État**: 🟢 Spec Complète  
**Localisation**: À créer dans `src/server/models/`  
**Merge**: Manuel après refactoring (pas de conflit attendu)  
**Effort Estimé**: 2-3 heures dev + tests
