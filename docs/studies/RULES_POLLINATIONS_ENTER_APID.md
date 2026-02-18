


🚨 RÈGLES POLLINATIONS — SOURCE OFFICIELLE
Comment le pollen est dépensé (citation de pollinations.ai) :
"Daily grants — Used first for most models"
"Purchased pollen — Used after daily is depleted"
"Exception: Some premium models are marked with a 💎 Paid Only badge. These require purchased pollen and cannot use daily tier grants."

Deux sources de pollen :
Daily tier grants = pollen gratuit quotidien, se renouvelle à 00:00 UTC, ne se cumule pas
Purchased pollen (wallet) = pollen acheté, ne expire jamais
Deux types de modèles :
Modèles normaux → daily pollen d'abord, puis wallet si daily épuisé
Modèles 💎 PAID ONLY → wallet UNIQUEMENT, daily pollen JAMAIS
5 tiers (pas 3) :
text

🦠 Microbe  → 0.1 pollen/jour  (signup)
🍄 Spore   → 1 pollen/jour    (auto-verified)
🌱 Seed    → 3 pollen/jour    (8+ dev points)
🌸 Flower  → 10 pollen/jour   (publish app + être Seed)
🍯 Nectar  → 20 pollen/jour   (coming soon)
Modèles 💎 PAID ONLY (liste complète) :
Image :
seedream (Seedream 4.0)
kontext (FLUX.1 Kontext)
nanobanana (NanoBanana)
seedream-pro (Seedream 4.5 Pro)
gptimage-large (GPT Image 1.5)
nanobanana-pro (NanoBanana Pro)
Video :
ltx-2 (LTX-2)
seedance-pro (Seedance Pro-Fast)
veo (Veo 3.1 Fast)
Text :
grok (xAI Grok 4 Fast)
gemini (Google Gemini 3 Flash)
gemini-large (Google Gemini 3 Pro)
gemini-legacy (Google Gemini 2.5 Pro)
claude (Anthropic Claude Sonnet 4.5)
claude-legacy (Anthropic Claude Opus 4.5)
claude-large (Anthropic Claude Opus 4.6)
Rôle de enablePaidTools dans le plugin :
C'est un verrou côté plugin qui empêche toute consommation du wallet.

Table de décision (4 cas) :
Modèle	enablePaidTools	Daily pollen	Action plugin
normal	false	reste du pollen	✅ ENVOYER
normal	false	épuisé	❌ BLOQUER → "daily pollen épuisé, activez enablePaidTools sinon le wallet sera débité"
💎 PAID ONLY	false	peu importe	❌ BLOQUER → "modèle paid only, nécessite le wallet, activez enablePaidTools"
tout	true	peu importe	✅ ENVOYER (Pollinations gère le reste)
Pourquoi bloquer "normal + daily épuisé + enablePaidTools false" ?
Parce que Pollinations débite automatiquement le wallet quand le daily est épuisé. C'est son fonctionnement normal. Le plugin protège l'utilisateur qui ne veut PAS que son wallet soit touché.

Pourquoi ne PAS vérifier le solde wallet ?
Parce que si enablePaidTools: true, l'utilisateur accepte d'utiliser son wallet. Si le wallet est vide, Pollinations retournera une erreur API. Le plugin n'a pas besoin de dupliquer cette vérification.
