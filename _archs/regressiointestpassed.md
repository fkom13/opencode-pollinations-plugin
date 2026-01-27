fkomp@fkomp-2189:~/.config/opencode$ # ============================================
# TESTS FREE (sans clé API)
# ============================================

# Test 6: Gemini Free (Multi-turn avec tool call)
opencode run "météo à paris cherche avec searxng_remote_searche et fait un rapport court" -m "pollinations/free/gemini"
echo "test 5.5 au dessus"

# Test 7: OpenAI Fast Free (Simple)
opencode run "météo à paris cherche avec searxng_remote_searche et fait un rapport court" -m "pollinations/free/openai-fast"
echo "test 7 au dessus"

# Test 7.1: Mistral Free (Simple)
opencode run "météo à paris cherche avec searxng_remote_searche et fait un rapport court" -m "pollinations/free/mistral"
echo "test 7.1 au dessus"
INFO  2026-01-26T04:47:02 +97ms service=models.dev file={} refreshing
|  searxng_remote_search  {"q":"météo à paris"}

Bonjour ! Voici un résumé de la météo à Paris :

Les prévisions météorologiques pour Paris indiquent une météo variable, avec des températures comprises entre 6 et 7°C aujourd'hui. Les prévisions s'étendent sur 15 jours, avec des informations heure par heure sur la température, l'humidité, le vent et la pression atmosphérique. Des sites comme Météo-France, meteo-paris.com, et La Chaîne Météo fournissent des informations détaillées.

test 5.5 au dessus
INFO  2026-01-26T04:47:44 +101ms service=models.dev file={} refreshing
|  searxng_remote_search  {"q":"météo à paris","language":"fr","pageno":1}

Paris : aujourd’hui vienne une mer de nuageux avec des températures oscillant entre 6 °C et 7 °C. L’humidité reste moyenne et les vents sont faibles. Probabilité de pluie faible, risque de précipitations très réduit.📌

test 7 au dessus
INFO  2026-01-26T04:49:16 +101ms service=models.dev file={} refreshing
|  searxng_remote_search  {"q":"météo à paris"}

### Rapport sur la météo à Paris

#### Sources principales :
1. **Météo-France** ([Lien](https://meteofrance.com/previsions-meteo-france/paris/75000))
   - Prévisions météo gratuites pour aujourd'hui, demain et jusqu'à 15 jours.
   - Couvre Paris et ses arrondissements.

2. **Météo Paris** ([Lien](https://www.meteo-paris.com/))
   - Site professionnel et gratuit avec des prévisions météo expertisées par un météorologiste.
   - Surveillance quasi-permanente et réactivité élevée.

3. **MétéoCity** ([Lien](https://www.meteocity.com/france/paris-v2988507/meteo-15-jours))
   - Bulletin météo pour Paris sur 15 jours.
   - Aperçu des tendances météorologiques pour les jours à venir.

4. **Météo & Radar** ([Lien](https://www.meteoetradar.com/meteo/paris/11702777))
   - Prévisions météo pour aujourd'hui, demain et les jours à venir.
   - Radar de pluie inclus.

5. **Franceinfo Météo** ([Lien](https://meteo.franceinfo.fr/previsions-meteo-france/paris/75000))
   - Prévisions météo pour Paris avec des détails sur les températures et la pluie heure par heure.

#### Résumé des prévisions :
- **Aujourd'hui** : Ciel variable avec des températures oscillant entre 6°C et 7°C. Pluie faible possible.
- **Demain** : Pluie faible, ciel variable avec des températures autour de 9°C.
- **Prochains jours** : Alternance de larges éclaircies et de passages nuageux. Pas de précipitations significatives attendues.

#### Autres sources utiles :
- **La Chaîne Météo** ([Lien](https://www.lachainemeteo.com/meteo-france/ville-33/previsions-meteo-paris-aujourdhui))
  - Prévisions météo gratuites à 15 jours avec des détails sur les températures et les conditions météorologiques.

- **Tameteo** ([Lien](https://www.tameteo.com/meteo_Paris-Europe-France-Paris-LFPB-1-26048.html))
  - Prévisions météo pour les 14 prochains jours avec des détails sur les températures et les conditions météorologiques.

- **Météo Consult** ([Lien](https://www.meteoconsult.fr/previsions-meteo/bulletin-detaille/ville-33/previsions-meteo-paris-aujourdhui))
  - Bulletin détaillé avec des prévisions météo pour les 15 prochains jours.

#### Conclusion :
Pour obtenir des prévisions météo précises et à jour pour Paris, il est recommandé de consulter les sites mentionnés ci-dessus. Ces sources offrent des informations détaillées et fiables pour planifier vos activités et déplacements.

test 7.1 au dessus
fkomp@fkomp-2189:~/.config/opencode$  ============================================
# TESTS ENTERPRISE (nécessite clé API)
# ============================================

# Test 1: Gemini Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini"
echo "test 1 au dessus"

# Test 2: Gemini Fast Enter (Multi-turn avec tool call)
opencode run "météo à paris" -m "pollinations/enter/gemini-fast"
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

# Test 5.2: nomnom (soorte de gemini scrap search crawl integrée direct dans pollinations)
opencode run "salut" -m "pollinations/enter/nomnom"
echo "test 5.2 au dessus"
============================================ : commande introuvable
INFO  2026-01-26T04:50:49 +97ms service=models.dev file={} refreshing
|  searxng_remote_search  {"q":"météo à paris"}

Aujourd'hui à Paris, le ciel est variable avec des éclaircies et des passages nuageux. Les températures sont comprises entre 2°C et 7°C.

test 1 au dessus
INFO  2026-01-26T04:51:09 +101ms service=models.dev file={} refreshing
|  searxng_remote_search  {"language":"fr","time_range":"day","q":"météo à paris"}

Here's the weather in Paris:

**Meteo-paris.com:** Professional and free, this site is one of the most reactive weather sites on the web, with near-constant monitoring and expert forecasts by a meteorologist. It offers 15-day reliable forecasts.

**Meteofrance.com:** Provides free weather forecasts for Ile-de-France, Paris, and its surroundings.

**La Chaîne Météo:** Reports "Today in Paris, the weather will be unsettled all day. Temperatures will range between 6 and 7°C. The sky will be cloudy."

**Meteocity.com:** Offers a 15-day forecast for Paris, with details on temperature, precipitation, wind, and humidity.

**Ouest-France:** Mentions that "This Monday, January 26, 2026 in Paris, the day will begin under cloudy skies with cool temperatures around 4°C. In the afternoon, temperatures will remain stable at 6°C, with..."

test 2 au dessus
INFO  2026-01-26T04:51:26 +87ms service=models.dev file={} refreshing

Salut — comment puis-je t'aider ?

test 3 au dessus
INFO  2026-01-26T04:51:40 +95ms service=models.dev file={} refreshing

Salut ! Comment puis-je vous aider aujourd'hui ?

test 4 au dessus
INFO  2026-01-26T04:51:54 +99ms service=models.dev file={} refreshing

Salut ! 👋

Bienvenue dans OpenCode ! Je suis là pour t'aider avec tes tâches de développement logiciel.

Voici ce que je peux faire pour toi :
- **Écrire et modifier du code**
- **Debugger et corriger des bugs**
- **Refactoriser du code**
- **Explorer et analyser des codebases**
- **Créer des commits git**
- **Et bien d'autres choses...**

Qu'est-ce que tu aimerais faire ?

**Astuce :** Appuie sur `ctrl+p` pour voir les actions disponibles, ou consulte la documentation à https://opencode.ai/docs

test 5 au dessus
INFO  2026-01-26T04:52:08 +98ms service=models.dev file={} refreshing

Bonjour! Comment puis-je vous aider aujourd'hui avec vos projets de développement ou toute autre question technique que vous pourriez avoir?

test 5.1 au dessus
INFO  2026-01-26T04:52:20 +95ms service=models.dev file={} refreshing

Salut ! Comment puis-je t'aider aujourd'hui ?

test 5.2 au dessus
fkomp@fkomp-2189:~/.config/opencode$ ################################################
## TEST EN REGRESSION OU PAS ENCORE REGLES

# test 5.4.2: kimi (limit 10000 bedrock) with tooling - model: Moonshot Kimi K2 Thinking - Deep Reasoning & Tool Orchestration
opencode run "météo à paris" -m "pollinations/enter/qwen-coder"
echo "test 5.4.2 au dessus"


# test 5.3: qwen-coder (limit 10000 bedrock)
opencode run "salut" -m "pollinations/enter/qwen-coder"
echo "test 5.3 au dessus"

# Test 5.2.2: nomnom (soorte de gemini scrap search crawl integrée direct dans pollinations )avec demande tooling
opencode run "salut" -m "pollinations/enter/nomnom"
echo "test 5.2.2 au dessus"

# test 5.4: kimi (limit 10000 bedrock) - model: Moonshot Kimi K2 Thinking - Deep Reasoning & Tool Orchestration
opencode run "salut" -m "pollinations/enter/qwen-coder"
echo "test 5.4 au dessus"
INFO  2026-01-26T04:53:46 +96ms service=models.dev file={} refreshing
|  google_search  {"query":"météo à paris","thinking":true}

Voici les prévisions météo pour Paris :

**Aujourd'hui :** Tempo instable avec alternance d'éclaircies et d'averses parfois orageuses. Températures entre 11°C (matin) et 18°C (après-midi).

**Demain (Jeudi) :** Amélioration avec ciel plus dégagé. Température atteignant environ 20°C.

**Fin de semaine :** Temps variable, passages nuageux, températures douces autour de 19-21°C.

**Résumé actuel :**
*   🌡️ Température : ~17°C
*   🌦️ Ciel : Risque d'averses localisées
*   💨 Vent : Faible à modéré

Conseil : Gardez un parapluie à portée de main pour la fin de journée.

test 5.4.2 au dessus
INFO  2026-01-26T04:54:14 +96ms service=models.dev file={} refreshing

Salut ! Comment puis-je vous aider aujourd'hui ? 🙌

test 5.3 au dessus
INFO  2026-01-26T04:54:28 +101ms service=models.dev file={} refreshing

Salut ! Comment puis-je t'aider aujourd'hui ?

test 5.2.2 au dessus
INFO  2026-01-26T04:54:45 +105ms service=models.dev file={} refreshing

Salut ! Comment puis-je vous aider aujourd'hui ?

test 5.4 au dessus
