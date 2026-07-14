#!/bin/bash
# Test de tous les modèles texte legacy + community
# Coût minimal : max_tokens=1
# Usage: ./testjuillet/test_models.sh

API_KEY="${POLLINATIONS_KEY:-}"
BASE_URL="https://gen.pollinations.ai/v1/chat/completions"
RESULTS="testjuillet/results.csv"
SUMMARY="testjuillet/results_summary.md"

if [ -z "$API_KEY" ]; then
    echo "❌ POLLINATIONS_KEY non définie. Exporte-la d'abord."
    exit 1
fi

echo "model,category,status,latency_ms,error" > "$RESULTS"

test_model() {
    local model="$1"
    local category="$2"
    local start=$(date +%s%3N)
    
    local resp=$(curl -s -w "\n%{http_code}" --max-time 15 \
        -X POST "$BASE_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}],\"max_tokens\":1}" 2>/dev/null)
    
    local http_code=$(echo "$resp" | tail -1)
    local body=$(echo "$resp" | sed '$d')
    local end=$(date +%s%3N)
    local latency=$((end - start))
    
    if [ "$http_code" = "200" ]; then
        local has_choices=$(echo "$body" | grep -c '"choices"')
        if [ "$has_choices" -gt 0 ]; then
            echo "  ✅ $model (${latency}ms)"
            echo "$model,$category,OK,$latency," >> "$RESULTS"
        else
            echo "  ⚠️  $model — 200 mais pas de choices"
            echo "$model,$category,NO_CHOICES,$latency," >> "$RESULTS"
        fi
    else
        local err=$(echo "$body" | head -c 100 | tr ',' ' ')
        echo "  ❌ $model — HTTP $http_code ($err)"
        echo "$model,$category,HTTP_$http_code,$latency,$err" >> "$RESULTS"
    fi
}

echo "=== MODÈLES LEGACY (officiels) ==="
echo ""

echo "--- GPT/OpenAI ---"
test_model "openai" "official-gpt"
test_model "openai-fast" "official-gpt"
test_model "gpt-5.4-mini" "official-gpt"
test_model "openai-large" "official-gpt"

echo "--- Gemini ---"
test_model "gemini" "official-gemini"
test_model "gemini-fast" "official-gemini"
test_model "gemini-3-flash" "official-gemini"
test_model "gemini-flash-lite-3.1" "official-gemini"
test_model "gemini-large" "official-gemini"

echo "--- Claude ---"
test_model "claude-fast" "official-claude"
test_model "claude" "official-claude"
test_model "claude-sonnet-5" "official-claude"
test_model "claude-large" "official-claude"

echo "--- DeepSeek ---"
test_model "deepseek" "official-deepseek"

echo "--- Nova ---"
test_model "nova-fast" "official-nova"
test_model "nova" "official-nova"

echo "--- Kimi ---"
test_model "kimi" "official-kimi"

echo "--- Autres ---"
test_model "llama-scout" "official-llama"
test_model "mistral" "official-mistral"
test_model "qwen-coder" "official-qwen"
test_model "grok" "official-grok"
test_model "minimax" "official-minimax"
test_model "step-flash" "official-step"
test_model "glm" "official-glm"
test_model "perplexity-fast" "official-search"

echo ""
echo "=== MODÈLES COMMUNITY (user/model) ==="
echo ""

echo "--- Tool-capable ---"
test_model "MarcosFRG/gemini-3-flash-preview" "community-tools"
test_model "MarcosFRG/gemini-2.5-flash-lite" "community-tools"
test_model "MarcosFRG/gemini-3.1-flash-lite" "community-tools"
test_model "MarcosFRG/gemini-3.1-pro-preview" "community-tools"
test_model "YoannDev90/gemini-3-pro" "community-tools"
test_model "YoannDev90/gpt-4o-mini-search-preview" "community-search"
test_model "Circuit-Overtime/lixsearch" "community-search"
test_model "polly" "community-tools"

echo "--- Text-only (échantillon) ---"
test_model "Catniti/agnes-2.0-flash" "community-text"
test_model "Catniti/claude-sonnet-4.6" "community-text"
test_model "Catniti/gpt-oss-120b" "community-text"
test_model "Spit-fires/step-3.5-flash-free" "community-text"
test_model "solarnode-developement/hy3" "community-text"
test_model "vendouple/deepseek-v4-flash" "community-text"
test_model "sharktide/inferenceport.ai-gpt-oss-20b" "community-text"
test_model "voodoohop/airforce-grok-4-fast" "community-text"
test_model "morriszdweck/qwen-3.7-plus-cheap" "community-text"
test_model "Minor-fun/deepseek-v4-flash" "community-text"
test_model "smplstuff/falcon-h1-tiny" "community-text"
test_model "Bakhshi7889/gemma-4-31b-it" "community-text"
test_model "CloudCompile/gemma-4-e2b" "community-text"
test_model "tomdacatto/ezra" "community-text"
test_model "MarcosFRG/deepseek-v4-flash" "community-text"
test_model "MarcosFRG/gemma-3-27b" "community-text"
test_model "YoannDev90/llama-4-scout" "community-text"
test_model "vendouple/kimi-k2.6" "community-text"

echo ""
echo "=== Résultats écrits dans $RESULTS ==="

# Générer le résumé
OK=$(grep -c ",OK," "$RESULTS")
FAIL=$(grep -c ",HTTP_" "$RESULTS")
NC=$(grep -c ",NO_CHOICES," "$RESULTS")
TOTAL=$((OK + FAIL + NC))

cat > "$SUMMARY" << EOF
# Résumé des tests modèles — $(date '+%d/%m/%Y %H:%M')

| Statut | Count |
|--------|-------|
| ✅ OK | $OK |
| ❌ Échec | $FAIL |
| ⚠️ Pas de choix | $NC |
| **Total** | **$TOTAL** |

## Modèles Legacy

| Modèle | Statut | Latence |
|--------|--------|---------|
$(grep "official-" "$RESULTS" | while IFS=, read model cat status lat err; do echo "| $model | $status | ${lat}ms |"; done)

## Modèles Community

| Modèle | Statut | Latence |
|--------|--------|---------|
$(grep "community-" "$RESULTS" | while IFS=, read model cat status lat err; do echo "| $model | $status | ${lat}ms |"; done)

## Échecs

$(grep ",HTTP_" "$RESULTS" | while IFS=, read model cat status lat err; do echo "- ❌ **$model** — $status ($err)"; done)

## Sans choix

$(grep ",NO_CHOICES," "$RESULTS" | while IFS=, read model cat status lat err; do echo "- ⚠️ **$model** — 200 mais pas de choices"; done)
EOF

echo ""
echo "=== Résumé écrit dans $SUMMARY ==="
echo "✅ $OK / ❌ $FAIL / ⚠️ $NC"