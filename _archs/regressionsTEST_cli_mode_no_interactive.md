# Prérequis: être dans le bon répertoire IMMPERATIF
cd ~/Bureau/oracle/opencode

opencode models pollinations

# doit renvoyer la liste complete des modeles enter+free puisque clefs api déjà renseigée depuis version 3.5.5 on est en v4

# ============================================
# TESTS ENTERPRISE (nécessite clé API)
# ============================================

# Test 1: Gemini Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini" --print-logs

# Test 2: Gemini Fast Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini-fast" --print-logs

# Test 3: OpenAI Enter (Simple)
opencode run "salut" -m "pollinations/enter/openai"

# Test 4: GLM Enter (Simple)
opencode run "salut" -m "pollinations/enter/glm"

# Test 5: Claude Fast Enter (Simple)
opencode run "salut" -m "pollinations/enter/claude-fast"

# ============================================
# TESTS FREE (sans clé API)
# ============================================

# Test 6: Gemini Free (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/free/gemini" --print-logs

# Test 7: OpenAI Fast Free (Simple)
opencode run "salut" -m "pollinations/free/openai-fast"

# VERSION COURTE

# Prérequis: être dans le bon répertoire IMMPERATIF
cd ~/Bureau/oracle/opencode
# test 0 base
opencode models pollinations

# doit renvoyer la liste complete des modeles enter+free puisque clefs api déjà renseigée depuis version 1.0.1 on est en v4

# ============================================
# TESTS FREE (sans clé API)
# ============================================

# Test 6: Gemini Free (Multi-turn avec tool call)
opencode run "météo à paris cherche avec searxng_remote_search et fait un rapport court" -m "pollinations/free/gemini" --print-logs
echo "test 5.5 au dessus"

# Test 7: OpenAI Fast Free (Simple)
opencode run "météo à paris cherche avec searxng_remote_search et fait un rapport court" -m "pollinations/free/openai-fast"
echo "test 7 au dessus"

# Test 7.1: Mistral Free (Simple)
opencode run "météo à paris cherche avec searxng_remote_search et fait un rapport court" -m "pollinations/free/mistral"
echo "test 7.1 au dessus"

# ============================================
# TESTS ENTERPRISE (nécessite clé API)
# ============================================

# Test 1: Gemini Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini"
echo "test 1 au dessus"

# Test 2: Gemini Fast Enter (Multi-turn avec tool call)
opencode run "météo à paris cherche avec searxng_remote_search et fait un rapport court" -m "pollinations/enter/gemini-fast"
echo "test 2 au dessus"

# Test 3: OpenAI Enter (Simple)
opencode run "salut" -m "pollinations/enter/openai"
echo "test 3 au dessus"

# Test 4: GLM Enter (Simple)
opencode run "salut" -m "pollinations/enter/glm"
echo "test 4 au dessus"

# Test 5: Claude Fast Enter (Simple)
opencode run "salut" -m "pollinations/enter/claude-fast"
echo "test 5 au dessus"

# test 5.1: nova-fast (limit 10000 bedrock)
opencode run "salut" -m "pollinations/enter/nova-fast"
echo "test 5.1 au dessus"

# Test 5.2: nomnom (sorte de gemini-scrap, scrap search crawl integrée direct dans pollinations)
opencode run "salut" -m "pollinations/enter/nomnom"
echo "test 5.2 au dessus"

################################################
## TEST EN REGRESSION OU PAS ENCORE REGLES

# test 5.4.2: kimi (limit 10000 bedrock) with tooling - model: Moonshot Kimi K2 Thinking - Deep Reasoning & Tool Orchestration
opencode run "météo à paris" -m "pollinations/enter/kimi"
echo "test 5.4.2 au dessus"


# test 5.3: qwen-coder (limit 10000 bedrock)
opencode run "salut" -m "pollinations/enter/qwen-coder"
echo "test 5.3 au dessus"



# test 5.4: kimi (limit 10000 bedrock) - model: Moonshot Kimi K2 Thinking - Deep Reasoning & Tool Orchestration
opencode run "salut" -m "pollinations/enter/kimi"
echo "test 5.4 au dessus"




# Test 5.2.2: nomnom (soorte de gemini scrap search crawl integrée direct dans pollinations )avec demande tooling
opencode run "météo à paris" -m "pollinations/enter/nomnom"
echo "test 5.2.2 au dessus"


# tests 1 à 7 doit renvoyer des vrais final réponses des models
# aucuns echecs tolérés des 8 test, aucunnes simulation, code dynamique et conforme v3.5.5 sur toiut les points, abvec implantations demandes v4
# test commandes interceptions
opencode run "/pollinations usage" -m "pollinations/free/mistral" && echo " \n Commande intercéptée et affichée !"
opencode run "/pollinations usage" -m "pollinations/enter/glm" && echo " \n Commande intercéptée et affichée !"
