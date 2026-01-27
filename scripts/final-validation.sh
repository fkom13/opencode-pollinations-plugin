#!/bin/bash
# set -e  <-- DESACTIVÉ pour voir tous les résultats

# Configuration
OPENCODE_BIN="/home/fkomp/.opencode/bin/opencode"
LOG_FILE="/tmp/pollinations-final-validation.log"

run_test() {
    local cmd="$1"
    echo ">>> EXECUTION: $cmd" | tee -a "$LOG_FILE"
    
    # Exécution avec capture stderr
    # On utilise || true pour ne pas planter le script
    if eval "$OPENCODE_BIN $cmd" >> "$LOG_FILE" 2>&1; then
        echo "✅ SUCCÈS" | tee -a "$LOG_FILE"
    else
        echo "❌ ÉCHEC" | tee -a "$LOG_FILE"
        # exit 1  <-- DESACTIVÉ
    fi
}

echo "=== DÉBUT PROTOCOLE STRICT V4 (CONT.) ===" | tee "$LOG_FILE"

cd ~/Bureau/oracle/opencode || exit 1

# TEST 0
echo ">>> TEST 0: MODELS" | tee -a "$LOG_FILE"
$OPENCODE_BIN models pollinations >> "$LOG_FILE" 2>&1 || echo "⚠️ Models Warning"

# ============================================
# TESTS ENTERPRISE
# ============================================

run_test "run 'météo à paris' -m 'pollinations/enter/gemini' --print-logs"
run_test "run 'météo à paris' -m 'pollinations/enter/gemini-fast' --print-logs"
run_test "run 'salut' -m 'pollinations/enter/openai'"
run_test "run 'salut' -m 'pollinations/enter/glm'"
run_test "run 'salut' -m 'pollinations/enter/claude-fast'"

# ============================================
# TESTS FREE
# ============================================

run_test "run 'météo à paris' -m 'pollinations/free/gemini' --print-logs"
run_test "run 'salut' -m 'pollinations/free/openai-fast'"

echo "=== FIN ===" | tee -a "$LOG_FILE"
