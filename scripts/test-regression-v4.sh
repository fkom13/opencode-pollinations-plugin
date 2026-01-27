#!/bin/bash
# test-regression-v4.sh

set -e

OPENCODE_DIR="$HOME/Bureau/oracle/opencode-pollinations-plugin"
LOG_FILE="/tmp/pollinations-regression-v4.log"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "🧪 Tests de non-régression V4" | tee "$LOG_FILE"
echo "==============================" | tee -a "$LOG_FILE"

# cd "$OPENCODE_DIR" || exit 1 # Pas besoin de cd si on teste le endpoint via curl direct

# NOTE: Ce script teste le PROXY LOCAL V4 (port 10001).
# Le plugin doit être lancé (via opencode ou "npm start" simulé)
# Comme on ne peut pas forcer le lancement du plugin via CLI ici sans OpenCode,
# on va tester si le port 10001 répond, sinon on échoue.

PROXY_URL="http://127.0.0.1:10001"

check_server() {
    if curl -s "$PROXY_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Proxy V4 detected at $PROXY_URL${NC}" | tee -a "$LOG_FILE"
        return 0
    else
        echo -e "${RED}❌ Proxy V4 NOT found at $PROXY_URL. Is the plugin running?${NC}" | tee -a "$LOG_FILE"
        return 1
    fi
}

test_endpoint() {
    local model="$1"
    local prompt="$2"
    local description="$3"
    
    echo -e "\n${CYAN}Testing:${NC} $model ($description)" | tee -a "$LOG_FILE"
    
    local payload='{"model": "'"$model"'", "messages": [{"role": "user", "content": "'"$prompt"'"}]}'
    
    local response
    response=$(curl -s -X POST "$PROXY_URL/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d "$payload")
        
    # Analyse basique de la réponse (on cherche du JSON valide ou un stream)
    # Note: Le proxy retourne un event-stream, curl va le dumper.
    
    if echo "$response" | grep -q "data:"; then
        echo -e "  ${GREEN}✅ PASS (Stream received)${NC}" | tee -a "$LOG_FILE"
        return 0
    elif echo "$response" | grep -qi "error"; then
        echo -e "  ${RED}❌ FAIL (Error response)${NC}" | tee -a "$LOG_FILE"
        echo "  Output: ${response:0:200}..." | tee -a "$LOG_FILE"
        return 1
    else
         # Cas un peu flou (réponse vide ou non streamée mais valide ?)
        if [ -n "$response" ]; then
             echo -e "  ${YELLOW}⚠️  WARN (Non-stream response?)${NC}" | tee -a "$LOG_FILE"
             echo "  Output: ${response:0:100}..." | tee -a "$LOG_FILE"
             return 0
        else
             echo -e "  ${RED}❌ FAIL (Empty response)${NC}" | tee -a "$LOG_FILE"
             return 1
        fi
    fi
}

check_server || exit 1

PASSED=0
FAILED=0

echo -e "\n${CYAN}=== FREE MODELS ===${NC}"

# Test Free Direct
test_endpoint "pollinations/free/openai-fast" "hi" "Free Routing" && ((PASSED++)) || ((FAILED++))

echo -e "\n${CYAN}=== ENTERPRISE MODELS ===${NC}"

# Test Enterprise (Dépend de la clé API présente ou non dans config)
test_endpoint "pollinations/enter/gemini" "hi" "Enterprise Routing" && ((PASSED++)) || ((FAILED++))


echo -e "\n=============================="
echo -e "Passed: ${GREEN}$PASSED${NC} | Failed: ${RED}$FAILED${NC}"

[ $FAILED -eq 0 ] && exit 0 || exit 1
