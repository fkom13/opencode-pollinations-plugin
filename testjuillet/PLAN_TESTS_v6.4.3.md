# PLAN DE TEST & ANALYSE — Modèles Legacy + Community + Model-Monitor

> v6.4.3 préparation — ne rien modifier avant validation

---

## Phase 1 : Investiguer model-monitor.pollinations.ai

- [ ] Accéder à la page, chercher les appels API (XHR/fetch)
- [ ] Chercher un endpoint `/api/*` ou des données Tinybird
- [ ] Vérifier si les données sont accessibles sans auth
- [ ] Déterminer si exploitable pour le plugin (pricing live, uptime modèles, stats)

## Phase 2 : Tester les modèles texte legacy (représentatifs)

Objectif : vérifier que nos adaptateurs proxy fonctionnent encore.

Stratégie : 1 modèle par famille, max_tokens=1 pour coût minimal.

### GPT/OpenAI family (adaptateur Azure: truncate tools 120, tool_call IDs 40)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `openai` (GPT-5.4 Nano) | openai-fast, openai-large, gpt-5.4, gpt-5.4-mini, gpt-5.6-* |
| Résultat attendu : ✅ ou ❌ | |

### Gemini family (adaptateur: deref $ref, disable google_search_retrieval)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `gemini` (Gemini 3.5 Flash) | gemini-fast, gemini-large, gemini-3-flash, gemini-flash-lite-3.1 |
| Résultat attendu : ✅ ou ❌ | |

### Claude family (adaptateur: safe_tokens variant)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `claude-fast` (Haiku 4.5) | claude, claude-large, claude-sonnet-5, claude-opus-* |
| Résultat attendu : ✅ ou ❌ | |

### DeepSeek family (pas d'adaptateur spécifique)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `deepseek` (V4 Flash) | deepseek-pro |
| Résultat attendu : ✅ ou ❌ | |

### Nova family (adaptateur: output cap 8000)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `nova-fast` (Nova Micro) | nova |
| Résultat attendu : ✅ ou ❌ | |

### Kimi/Moonshot family (adaptateur: frequency_penalty, stop tokens)
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `kimi` (Kimi K2.6) | kimi-code |
| Résultat attendu : ✅ ou ❌ | |

### Autres providers
| Modèle à tester | Couvre aussi |
|-----------------|--------------|
| `llama-scout` | llama, llama-maverick |
| `mistral` (Small 4) | mistral-large, mistral-small-3.2 |
| `qwen-coder` | qwen-large, qwen-vision, qwen-vision-pro |
| `grok` (4.20) | grok-large, grok-4-20-reasoning |
| `minimax` (M3) | minimax-m2.7 |
| Résultats attendus : ✅ ou ❌ | |

## Phase 3 : Tester les modèles Community

Objectif : déterminer si on les garde ou non.

### Catégories Community

#### Community tool-capable (ceux qui intéressent l'agent)
| Modèle | Provider | Tools | Vision | À tester |
|--------|----------|-------|--------|----------|
| `MarcosFRG/gemini-3-flash-preview` | JankRouter | ✅ | ✅ | Chat + tool_call |
| `MarcosFRG/gemini-2.5-flash-lite` | JankRouter | ✅ | ✅ | Chat + tool_call |
| `MarcosFRG/gemini-3.1-pro-preview` | JankRouter | ✅ | ✅ | Chat |
| `MarcosFRG/gemini-3.1-flash-lite` | JankRouter | ✅ | ✅ | Chat |
| `YoannDev90/gemini-3-pro` | ? | ✅ | ✅ | Chat + tool_call |
| `YoannDev90/gpt-4o-mini-search-preview` | ? | ✅ | ❌ | Search |
| `Circuit-Overtime/lixsearch` | elixpo | ✅ | ❌ | Search + tool_call |
| `polly` | @Itachi-1824 | ✅ | ✅ | Chat + tool_call |

#### Community text-only (pas d'intérêt pour l'agent)
| Modèle | Provider | Stable ? |
|--------|----------|----------|
| `Catniti/*` (11 modèles) | Multi | ❓ |
| `Spit-fires/*` (4 modèles) | Multi | Free mais lent |
| `solarnode-developement/*` (3 modèles) | Multi | ❓ |
| `vendouple/*` (5 modèles) | Multi | ❓ |
| `sharktide/*` (4 modèles) | inferenceport.ai | ❓ |
| `voodoohop/*` (4 modèles) | Airforce/AnyVM | ❓ |
| `morriszdweck/*` (2 modèles) | Multi | ❓ |
| `mikl-shortcuts/*` (1 modèle) | ? | ❓ |
| `Minor-fun/*` (2 modèles) | ? | ❓ |
| `smplstuff/*` (1 modèle) | ? | ❓ |
| `Bakhshi7889/*` (1 modèle) | ? | ❓ |
| `CloudCompile/*` (1 modèle) | ? | ❓ |
| `tomdacatto/ezra` | ? | ❓ |

**Total Community : ~47 modèles texte sur 134**

## Phase 4 : Analyse model-monitor.pollinations.ai

- [ ] Explorer la page et les APIs sous-jacentes
- [ ] Vérifier si les données sont accessibles via notre clé API
- [ ] Déterminer la valeur ajoutée pour le plugin

---

## Script de test (testjuillet/test_models.sh)

Le script doit :
1. Tester chaque modèle avec curl + clé API
2. max_tokens=1 pour coût minimal
3. Vérifier que la réponse est valide (200, JSON parseable, choices non vide)
4. Logger les résultats dans un fichier CSV