# Résumé des tests modèles — 14/07/2026 14:17

| Statut | Count |
|--------|-------|
| ✅ OK | 42 |
| ❌ Échec | 9 |
| ⚠️ Pas de choix | 0 |
| **Total** | **51** |

## Modèles Legacy

| Modèle | Statut | Latence |
|--------|--------|---------|
| openai | HTTP_400 | 2463ms |
| openai-fast | HTTP_400 | 1784ms |
| gpt-5.4-mini | HTTP_400 | 1685ms |
| openai-large | HTTP_400 | 1309ms |
| gemini | OK | 1182ms |
| gemini-fast | OK | 865ms |
| gemini-3-flash | OK | 1225ms |
| gemini-flash-lite-3.1 | OK | 955ms |
| gemini-large | OK | 2499ms |
| claude-fast | OK | 1597ms |
| claude | OK | 1851ms |
| claude-sonnet-5 | OK | 1813ms |
| claude-large | OK | 1741ms |
| deepseek | OK | 968ms |
| nova-fast | OK | 1103ms |
| nova | OK | 1152ms |
| kimi | OK | 2363ms |
| llama-scout | OK | 1017ms |
| mistral | OK | 1125ms |
| qwen-coder | OK | 752ms |
| grok | OK | 1518ms |
| minimax | OK | 7311ms |
| step-flash | OK | 5143ms |
| glm | OK | 811ms |
| perplexity-fast | HTTP_400 | 579ms |

## Modèles Community

| Modèle | Statut | Latence |
|--------|--------|---------|
| MarcosFRG/gemini-3-flash-preview | OK | 4552ms |
| MarcosFRG/gemini-2.5-flash-lite | HTTP_000 | 15059ms |
| MarcosFRG/gemini-3.1-flash-lite | OK | 9239ms |
| MarcosFRG/gemini-3.1-pro-preview | OK | 9047ms |
| YoannDev90/gemini-3-pro | OK | 2065ms |
| YoannDev90/gpt-4o-mini-search-preview | OK | 4890ms |
| Circuit-Overtime/lixsearch | OK | 4786ms |
| polly | OK | 4120ms |
| Catniti/agnes-2.0-flash | OK | 7399ms |
| Catniti/claude-sonnet-4.6 | OK | 1784ms |
| Catniti/gpt-oss-120b | OK | 711ms |
| Spit-fires/step-3.5-flash-free | OK | 1476ms |
| solarnode-developement/hy3 | OK | 1934ms |
| vendouple/deepseek-v4-flash | HTTP_502 | 3537ms |
| sharktide/inferenceport.ai-gpt-oss-20b | OK | 1411ms |
| voodoohop/airforce-grok-4-fast | OK | 3716ms |
| morriszdweck/qwen-3.7-plus-cheap | OK | 14531ms |
| Minor-fun/deepseek-v4-flash | OK | 2006ms |
| smplstuff/falcon-h1-tiny | HTTP_502 | 1007ms |
| Bakhshi7889/gemma-4-31b-it | HTTP_400 | 491ms |
| CloudCompile/gemma-4-e2b | OK | 2469ms |
| tomdacatto/ezra | OK | 7395ms |
| MarcosFRG/deepseek-v4-flash | OK | 7165ms |
| MarcosFRG/gemma-3-27b | OK | 1572ms |
| YoannDev90/llama-4-scout | OK | 2263ms |
| vendouple/kimi-k2.6 | OK | 5298ms |

## Échecs

- ❌ **openai** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request: azure-openai error: Could not finish the messa)
- ❌ **openai-fast** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request: azure-openai error: Could not finish the messa)
- ❌ **gpt-5.4-mini** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request: azure-openai error: Could not finish the messa)
- ❌ **openai-large** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request: azure-openai error: Could not finish the messa)
- ❌ **perplexity-fast** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request: perplexity-ai error: max_tokens must be at lea)
- ❌ **MarcosFRG/gemini-2.5-flash-lite** — HTTP_000 ()
- ❌ **vendouple/deepseek-v4-flash** — HTTP_502 ({"success":false "error":{"message":"502 Bad Gateway" "code":"BAD_GATEWAY" "timestamp":"2026-07-14T1)
- ❌ **smplstuff/falcon-h1-tiny** — HTTP_502 ({"success":false "error":{"message":"502 Bad Gateway" "code":"BAD_GATEWAY" "timestamp":"2026-07-14T1)
- ❌ **Bakhshi7889/gemma-4-31b-it** — HTTP_400 ({"success":false "error":{"message":"400 Bad Request" "code":"BAD_REQUEST" "timestamp":"2026-07-14T1)

## Sans choix


