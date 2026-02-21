# 🎯 FEATURE: Commandes `/pollinations pricing` et `/pollinations models`

**Date**: 17 Février 2026  
**Mis à jour**: 18 Février 2026 — Aligné avec ModelRegistry (Sprint 1+2)  
**Statut**: 📝 ToDo — Sprint 4  
**Prérequis**: `SPEC_AGENT_MODEL_REGISTRY.md` terminé et validé  
**Effort estimé**: ~2h (infrastructure déjà faite par le registry)

---

## Objectif

Ajouter deux nouvelles commandes CLI pour afficher:
1. **`/pollinations models`** — Liste complète des modèles disponibles par catégorie
2. **`/pollinations pricing`** — Tableau des tarifs par modèle et par modalité

Ces commandes répliquent le dashboard web `enter.pollinations.ai` mais en CLI/TUI.  
**Les données viennent directement du ModelRegistry** — zéro nouveau fetch, le cache est déjà chaud depuis l'init du plugin.

---

## ⚠️ Changement par rapport à la spec initiale

### Ce qui a changé

La spec originale prévoyait un module `src/server/models/` autonome avec son propre `fetcher.ts`, `cache.ts` et `models-command.ts`.

**Ce module existe maintenant** — il a été créé dans le Sprint 1+2 (ModelRegistry).  
Sprint 4 **réutilise** ce module, il ne le recrée pas.

### Ce qui disparaît

| Élément de la spec initiale | Statut |
|-----------------------------|--------|
| `src/server/models/fetcher.ts` | ✅ Déjà créé par Sprint 1 |
| `src/server/models/cache.ts` | ✅ Déjà créé par Sprint 1 |
| `src/server/models-command.ts` | 🔄 À créer en Sprint 4, mais simplifié |
| `ModelsFetcher` class | ❌ Supprimé — `ModelRegistry` fait le même travail |
| `ModelsCache` class | ❌ Supprimé — `cache.ts` du registry est utilisé |

### Ce qui reste à créer en Sprint 4

```
src/server/
└── models-command.ts    ← NOUVEAU (simplifié : juste le formatter + intégration commands.ts)
```

---

## Aperçu Visuel (inchangé)

### `/pollinations models`
```
┌─ Pollinations Models ──────────────────────────────────┐
│                                                         │
│ 📝 TEXT MODELS (25)                                    │
│  ├─ openai        GPT-5 Mini             standard      │
│  ├─ openai-fast   GPT-5 Nano    ⭐ FREE  standard      │
│  ├─ claude        Sonnet 4.5    💎 PAID  standard      │
│  ├─ gemini-large  Gemini 3 Pro  💎 PAID  vision+audio  │
│  └─ [+21 more...]                                       │
│                                                         │
│ 🎨 IMAGE MODELS (13)                                   │
│  ├─ flux          Flux Schnell            0.0002 🌻/img │
│  ├─ seedream-pro  Seedream 4.5 💎        0.04 🌻/img   │
│  └─ [+11 more...]                                       │
│                                                         │
│ 🎬 VIDEO MODELS (6)                                    │
│  ├─ grok-video    Grok Video              0.0025 🌻/s  │
│  ├─ veo           Veo 3.1 Fast 💎        0.15 🌻/s    │
│  └─ [+4 more...]                                        │
│                                                         │
│ 🔊 AUDIO MODELS (4)                                    │
│  ├─ openai-audio  GPT-4o Audio            0.022 🌻/ks  │
│  ├─ elevenlabs    ElevenLabs v3           0.18 🌻/ks   │
│  └─ [+2 more...]                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### `/pollinations pricing`
```
┌─ Pollinations Pricing ─────────────────────────────────┐
│                                                         │
│ 📝 TEXT — prix par million de tokens (🌻/Mtok)         │
│ Modèle           │ Input    │ Output   │ Status        │
│ ─────────────────────────────────────────────────────  │
│ openai-fast      │ 0.06 🌻  │ 0.44 🌻  │ ⭐ FREE       │
│ openai           │ 0.15 🌻  │ 0.6 🌻   │ ✅            │
│ claude           │ 3 🌻     │ 15 🌻    │ 💎 PAID       │
│ gemini-large     │ 2 🌻     │ 12 🌻    │ 💎 PAID       │
│                                                         │
│ 🎨 IMAGE — prix par image (🌻/img)                     │
│ Modèle           │ Prix     │ I2I      │ Status        │
│ ─────────────────────────────────────────────────────  │
│ flux             │ 0.0002🌻 │ ❌       │ ✅            │
│ klein            │ 0.008 🌻 │ ✅       │ ✅            │
│ seedream-pro     │ 0.04 🌻  │ ✅       │ 💎 PAID       │
│                                                         │
│ 🎬 VIDEO — prix par seconde (🌻/s)                     │
│ Modèle           │ Prix     │ I2V      │ Durée         │
│ ─────────────────────────────────────────────────────  │
│ grok-video       │ 0.0025🌻 │ ❌       │ 1-15s         │
│ veo              │ 0.15 🌻  │ ✅       │ 4-8s 💎       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture — Sprint 4

### Ce qui existe déjà (Sprint 1+2)

```
src/server/models/
  types.ts      ✅ PollinationsModel interface
  fetcher.ts    ✅ fetch + normalize + VIDEO_LOCAL_EXTRAS
  cache.ts      ✅ TTL 1h
  index.ts      ✅ ModelRegistry singleton
```

### Ce qui reste à créer

```
src/server/
└── models-command.ts    ← SEUL nouveau fichier Sprint 4
```

---

## Code Sprint 4

### `src/server/models-command.ts` (simplifié)

```typescript
import { ModelRegistry } from './models/index.js';
import type { PollinationsModel } from './models/types.js';

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatPrice(model: PollinationsModel): string {
    const p = model.pricing;
    if (p.completionImageTokens) return `${p.completionImageTokens} 🌻/img`;
    if (p.completionVideoSeconds) return `${p.completionVideoSeconds} 🌻/s`;
    if (p.completionVideoTokens)  return `tokens/s`;
    if (p.completionAudioSeconds) return `${p.completionAudioSeconds} 🌻/s`;
    if (p.completionAudioTokens)  return `${(p.completionAudioTokens * 1000).toFixed(3)} 🌻/ks`;
    if (p.completionTextTokens && p.promptTextTokens) {
        return `${(p.promptTextTokens * 1e6).toFixed(2)}/${(p.completionTextTokens * 1e6).toFixed(2)} 🌻/Mtok`;
    }
    return '—';
}

function badge(model: PollinationsModel): string {
    return model.paid_only ? '💎 PAID' : '✅';
}

function formatModelsSection(
    category: 'image' | 'video' | 'audio' | 'text',
    emoji: string,
    label: string
): string[] {
    const models = ModelRegistry.list(category);
    if (!models.length) return [];

    const lines: string[] = [`${emoji} ${label} (${models.length})`];
    const shown = models.slice(0, 5);
    for (const m of shown) {
        const desc = m.description?.split(' - ')[0] ?? m.name;
        const extra = m.supportsI2X ? ' I2X' : '';
        lines.push(`  ├─ ${m.name.padEnd(16)} ${desc.substring(0, 22).padEnd(23)} ${formatPrice(m)}${extra}`);
    }
    if (models.length > 5) {
        lines.push(`  └─ [+${models.length - 5} more...]`);
    }
    return lines;
}

export function formatModels(): string {
    const lines = [
        '┌─ Pollinations Models ─────────────────────────────┐',
        '│                                                    │',
        ...formatModelsSection('text', '📝', 'TEXT MODELS'),
        '',
        ...formatModelsSection('image', '🎨', 'IMAGE MODELS'),
        '',
        ...formatModelsSection('video', '🎬', 'VIDEO MODELS'),
        '',
        ...formatModelsSection('audio', '🔊', 'AUDIO MODELS'),
        '',
        '└────────────────────────────────────────────────────┘',
    ];
    return lines.join('\n');
}

export function formatPricing(filterCategory?: string): string {
    const categories: Array<{ cat: 'image'|'video'|'audio'|'text'; emoji: string; label: string; headers: string[] }> = [
        { cat: 'text',  emoji: '📝', label: 'TEXT — 🌻/Mtok (input/output)',  headers: ['Modèle', 'Input', 'Output', 'Status'] },
        { cat: 'image', emoji: '🎨', label: 'IMAGE — 🌻/img',                  headers: ['Modèle', 'Prix', 'I2I', 'Status'] },
        { cat: 'video', emoji: '🎬', label: 'VIDEO — 🌻/s',                    headers: ['Modèle', 'Prix', 'I2V', 'Durée'] },
        { cat: 'audio', emoji: '🔊', label: 'AUDIO',                           headers: ['Modèle', 'Prix', 'Type', 'Status'] },
    ];

    const lines = ['┌─ Pollinations Pricing ────────────────────────────┐'];

    for (const { cat, emoji, label, headers } of categories) {
        if (filterCategory && filterCategory !== cat) continue;
        const models = ModelRegistry.list(cat);
        if (!models.length) continue;

        lines.push(`│ ${emoji} ${label}`);
        lines.push(`│ ${'─'.repeat(50)}`);

        for (const m of models) {
            const p = m.pricing;
            let row = '';

            if (cat === 'text') {
                const inp = p.promptTextTokens ? (p.promptTextTokens * 1e6).toFixed(2) + ' 🌻' : '—';
                const out = p.completionTextTokens ? (p.completionTextTokens * 1e6).toFixed(2) + ' 🌻' : '—';
                row = `${m.name.padEnd(18)}│ ${inp.padEnd(9)}│ ${out.padEnd(9)}│ ${badge(m)}`;
            } else if (cat === 'image') {
                const price = p.completionImageTokens ? `${p.completionImageTokens} 🌻` : 'tokens';
                const i2i = m.supportsI2X ? '✅' : '❌';
                row = `${m.name.padEnd(18)}│ ${price.padEnd(9)}│ ${i2i.padEnd(9)}│ ${badge(m)}`;
            } else if (cat === 'video') {
                const price = p.completionVideoSeconds ? `${p.completionVideoSeconds} 🌻` : 'tokens';
                const i2v = m.supportsI2X ? '✅' : '❌';
                const dur = m.durationRange ? `${m.durationRange[0]}-${m.durationRange[1]}s` : '—';
                row = `${m.name.padEnd(18)}│ ${price.padEnd(9)}│ ${i2v.padEnd(9)}│ ${dur} ${m.paid_only ? '💎' : ''}`;
            } else if (cat === 'audio') {
                const price = formatPrice(m);
                const type = (m.outputType === 'audio' && m.supportsI2X) ? 'STT' : 'TTS';
                row = `${m.name.padEnd(18)}│ ${price.padEnd(9)}│ ${type.padEnd(9)}│ ${badge(m)}`;
            }

            if (row) lines.push(`│  ${row}`);
        }
        lines.push('│');
    }

    lines.push('└────────────────────────────────────────────────────┘');
    return lines.join('\n');
}
```

### Intégration dans `src/server/commands.ts`

```typescript
import { formatModels, formatPricing } from './models-command.js';

// Dans le gestionnaire de commandes :

if (cmd === 'models') {
    const filter = args[0]; // optionnel : "text", "image", "video", "audio"
    const output = formatModels();
    emitLogToast('info', output);
    return;
}

if (cmd === 'pricing') {
    const filter = args[0]; // optionnel : filtrer par catégorie
    const output = formatPricing(filter);
    emitLogToast('info', output);
    return;
}
```

---

## Commandes disponibles

```bash
/pollinations models              # Toutes les catégories
/pollinations pricing             # Tous les tarifs
/pollinations pricing text        # Texte uniquement
/pollinations pricing image       # Images uniquement
/pollinations pricing video       # Vidéos uniquement
/pollinations pricing audio       # Audio uniquement
```

---

## Notes d'Implémentation

1. **Zéro fetch en Sprint 4** — le registry est déjà initialisé et chaud depuis le démarrage du plugin.
2. **Si le cache est vide** (registry pas encore initialisé) → afficher `"⏳ Chargement des modèles en cours..."` et suggérer de réessayer dans 5s.
3. **Pas de TTL propre** — la commande utilise le TTL du registry (1h). Pas de cache séparé.
4. **Invalidation manuelle possible** — `/pollinations models refresh` appelle `invalidate()` + refetch.

---

## Tests

- `formatter.test.ts` — mock `ModelRegistry.list()`, vérifier le format texte
- Cas limites : registry vide, modèle sans pricing, catégorie inconnue

---

## Checklist

- [ ] Vérifier que ModelRegistry est opérationnel (Sprint 1+2 validés)
- [ ] Créer `src/server/models-command.ts`
- [ ] Ajouter `models` et `pricing` dans `commands.ts`
- [ ] Tester `/pollinations models` et `/pollinations pricing`
- [ ] Tester `/pollinations pricing text`, `image`, `video`, `audio`
- [ ] Tester comportement si registry pas encore chaud (message d'attente)
- [ ] Snapshot gencodedoc : `models-pricing-commands-done`
- [ ] Documenter dans `README.md` (section Commandes)
- [ ] Déplacer cette spec dans `docs/issues/Resolved/`
