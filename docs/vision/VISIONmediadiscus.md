🎬 Vision — Pipeline de Production Média par IA
Plugin OpenCode Pollinations × Remotion
"Chaque outil a été choisi pour une raison. Ensemble, ils forment un studio complet."

La Philosophie Derrière la Boîte à Outils
Ce n'est pas une simple collection d'API IA juxtaposées au hasard.

Chaque outil de ce plugin a été sélectionné et conçu autour d'une idée unique : donner à un agent IA tout ce dont un monteur vidéo humain a besoin, et rien de plus.

Le résultat est une stack de production média minimale mais complète :

Percevoir — lire les images, entendre l'audio, comprendre le texte dans les visuels

Générer — créer des visuels, des voix, de la musique, du mouvement

Traiter — supprimer les arrière-plans, extraire les pistes, isoler les éléments

Composer — assembler le tout en une vidéo finie

Pas de superflu, pas de redondance. Chaque outil mérite sa place.

Et les modèles derrière eux font partie des meilleurs disponibles — Claude, GPT-4o, Gemini, ElevenLabs, Flux, Seedance, Veo — accessibles via Pollinations à un prix qui rend la production professionnelle vraiment démocratique : ~1 $ = 1 Pollen.

Les Quatre Couches du Pipeline
🔍 Couche 1 — Perception (Comprendre les médias existants)
Avant de créer quoi que ce soit, l'agent doit comprendre ce qui existe déjà.

Outil	Ce qu'il apporte à l'agent
extract_frames	Le contenu visuel de n'importe quelle vidéo — se positionner à n'importe quel timestamp, ou extraire à une fréquence donnée
transcribe_audio	Les mots exacts, leur timing et la langue de tout fichier audio ou vidéo
extract_audio	La piste audio isolée de toute vidéo, dans n'importe quel format
Avec ces trois seuls outils, un agent peut déconstruire intégralement n'importe quel média : il peut le voir, le lire et l'entendre. C'est la fondation sur laquelle tout le reste repose.

🎨 Couche 2 — Génération (Créer à partir de rien)
Le cœur génératif. Chaque outil cible un type de sortie spécifique avec un contrôle précis.

Visuel

Outil	Capacité clé
gen_image	Images à partir de texte, avec reference_image pour une cohérence visuelle entre les actifs. Modèles : Flux, Sana, Seedream, Klein, Zimage
gen_video	Clips animés à partir de texte ou d'une image de référence — le même personnage, en mouvement. Modèles : Seedance-pro, Grok-vidéo, Veo, Wan, LTX-2
gen_diagram	Diagrammes techniques (flowchart, séquence, architecture) au format SVG ou PNG
gen_palette	Systèmes de couleurs — monochromatique, complémentaire, triadique — à partir d'une seule référence
gen_qrcode	QR codes stylisés, pas simplement en noir et blanc
Audio

Outil	Capacité clé
gen_audio	Synthèse vocale avec des voix réalistes — OpenAI Audio ou ElevenLabs. Formats : mp3, wav, pcm16
gen_music	Musique originale à partir d'une description textuelle. Jusqu'à 300 secondes — une partition complète, pas un simple jingle
La décision de conception cruciale : reference_image existe à la fois sur gen_image et gen_video. Cela signifie que l'identité visuelle — un personnage, un produit, un style — peut être créée une fois et réutilisée de façon cohérente à travers les images fixes et animées. C'est le problème de cohérence que tout pipeline génératif rencontre. Il est résolu ici par la conception.

✂️ Couche 3 — Traitement (Transformer les actifs existants)
La couche d'affinage. Elle prend la matière brute et la rend prête pour la production.

Outil	Ce qu'il fait
remove_background	Supprime les arrière-plans pour une insertion en PNG transparent. Fournisseur gratuit pour un usage standard, BackgroundCut HD pour une qualité professionnelle. Rotation multi-clés avec fallback automatique — ne tombe jamais en panne.
rmbg_keys	Gère le pool de clés BackgroundCut : ajouter, lister, faire tourner, effacer. Rotation transparente des clés pour que l'agent n'ait jamais à y penser.
remove_background est le MVP discret de tout le pipeline. Les actifs transparents sont ce qui rend le compositing possible. Sans découpes propres, superposer un produit sur un fond généré, insérer un logo dans une scène vidéo ou caler des personnages sur des séquences animées nécessiterait une édition manuelle. Grâce à lui, l'agent gère la composition de manière autonome.

🎬 Couche 4 — Composition (Remotion)
C'est ici que toutes les sorties convergent vers une pièce finie.

Remotion est un moteur d'assemblage vidéo basé sur React. Chaque frame est un composant React rendu. FFmpeg assemble les frames en MP4. Le résultat est un pipeline de production vidéo qui est :

Piloté par le code — chaque coupe, transition et décision de timing est une valeur explicite que l'agent a écrite

Inspectable — Remotion Studio offre un défilement frame par frame en temps réel et l'inspection des props dans n'importe quel navigateur

Composable — <Video>, <Audio>, <Img>, <Sequence> sont des composants React ; l'agent construit la timeline en JSX

Accessible — l'aperçu Studio est exposé via le tunnel webhook du plugin, accessible depuis n'importe quel navigateur, par n'importe quel utilisateur, depuis n'importe quel client (CLI, n8n, desktop, mobile)

Ce que l'agent peut faire avec Remotion qu'aucun autre outil de cette stack ne propose :

Synchronisation audio frame-accurate — voix, musique et effets sonores calés à la milliseconde

Assemblage de séquences réelles — importer des clips MP4 fournis par l'utilisateur via <Video src> et les composer dans une timeline structurée

Graphiques animés — titres, callouts, barres de progression, visualisations de données — le tout en React, animé via interpolate(frame, [in, out], [from, to])

Composition multicouche — superposer des PNG transparents (issus de remove_background) sur des fonds vidéo générés

Rendu programmatique — renderMedia() produit le MP4 final sans aucune interaction humaine

Ce que le Pipeline Combiné Peut Faire
Pipeline A — Localisation Vidéo Automatisée
text
extract_audio(vidéo_étrangère)
  → transcribe_audio → transcription + timecodes
  → traduire la transcription (agent)
  → gen_audio(texte_traduit, elevenlabs, voix_cible)
  → Remotion : vidéo_originale + nouvelle_piste_audio (calée sur les frames)
  → render → vidéo_localisée.mp4
Un pipeline de doublage complet. L'agent entend l'original, le lit, le traduit, le parle dans la langue cible et assemble la vidéo finale avec l'audio remplacé et le timing préservé.

Pipeline B — Récit Visuel avec Personnage Cohérent
text
gen_image(description_personnage, model=flux) → personnage.png
remove_background(personnage.png) → personnage_transparent.png
gen_image(fond_scène_1) → fond1.png
gen_image(fond_scène_2) → fond2.png
gen_video(action_scène_1, reference_image=personnage.png) → clip1.mp4
gen_video(action_scène_2, reference_image=personnage.png) → clip2.mp4
gen_music(description_ambiance, durée=120s) → musique.mp3
gen_audio(texte_narration) → voix.mp3
Remotion :
  <Scène1> : clip1 + superposition personnage_transparent + fond1 + voix + musique
  <Scène2> : clip2 + superposition personnage_transparent + fond2 + voix + musique
render → histoire.mp4
Un personnage, visuellement cohérent à travers les scènes, avec narration synchronisée et musique originale. C'est une production qui coûte des milliers dans un studio traditionnel.

Pipeline C — Démo Produit Automatisée
text
extract_frames(enregistrement_écran.mp4, fps=1) → images_clés
gen_audio(script_démo, voix="professionnelle") → narration.mp3
gen_music("ambiance tech légère", durée=90s) → fond_musical.mp3
gen_image(logo_produit, transparent=true) → logo_sans_fond.png
gen_diagram(code_architecture) → architecture.svg
Remotion :
  <Intro> : logo_sans_fond + titre animé (0-5s)
  <Démo> : enregistrement_écran + narration superposée (5-70s)
  <Architecture> : architecture.svg avec callouts animés + narration (70-85s)
  <CTA> : logo + contact + fond_musical fondu (85-90s)
render → démo_produit.mp4
À partir d'un enregistrement d'écran brut et d'un brief, une vidéo produit complète avec voix off, musique, branding et diagrammes techniques.

Pipeline D — Transfert de Style Image par Image
text
extract_frames(vidéo_source.mp4, fps=24) → 1440 frames
pour chaque frame :
  remove_background(frame) → frame_sans_fond.png
  gen_image(prompt_style, reference_image=frame_sans_fond) → frame_stylisée.png
extract_audio(vidéo_source) → audio.mp3
Remotion : assembler les 1440 frames stylisées + audio original
render → vidéo_stylisée.mp4
Rotoscopie complète et transfert de style automatisés. Ce que les studios de post-production facturent à l'heure devient une tâche pour agent.

Pourquoi Cette Stack Est Juste
La tentation avec une boîte à outils est d'ajouter tout et n'importe quoi. Celle-ci ne l'a pas fait.

Pas d'interface d'édition vidéo. Remotion est l'éditeur. C'est du code, pas du glisser-déposer. L'agent l'écrit ; un humain peut le lire et le modifier.

Pas de prolifération de modèles. Une sélection choisie des meilleurs modèles disponibles pour chaque modalité — pas tous les modèles qui existent. L'agent n'a pas à choisir entre 40 options presque identiques.

Pas de nouvelle infrastructure. FFmpeg est déjà dans les outils. Le tunnel webhook fonctionne déjà. Le système de facturation Pollen existe déjà. Remotion s'intègre dans ce qui est déjà là.

Le niveau gratuit est préservé. remove_background fonctionne gratuitement. transcribe_audio fonctionne gratuitement. gen_diagram, gen_palette, gen_qrcode fonctionnent gratuitement. gen_image et gen_audio fonctionnent gratuitement sur les modèles standards. Un développeur sans clé payante peut toujours construire de véritables pipelines.

Le Modèle d'Accès
Tout dans ce pipeline fonctionne avec Pollen — le système de crédits unifié de Pollinations (~1 $ = 1 Pollen). Allocations journalières par niveau :

Niveau	Allocation Journalière	Comment y parvenir
🌱 Spore	1 Pollen	S'inscrire
🌿 Seed	3 Pollen	Développeur GitHub actif
🌸 Flower	10 Pollen	Avoir publié une application (comme ce plugin)
🍯 Nectar	20 Pollen	Contributeur majeur
Un développeur de niveau Flower qui exécute ce pipeline produit du contenu professionnel de qualité pour 10 Pollen par jour à coût marginal nul. C'est la thèse de la démocratisation rendue concrète.

Les modèles payants (seedance-pro, veo, elevenlabs, claude-large) se débloquent après rechargement du wallet. Le Safety Net garantit que vous n'êtes jamais bloqué en pleine production : si un modèle payant atteint son quota, le pipeline bascule automatiquement et de manière transparente vers un équivalent gratuit.

Ce Qui Sera Construit Ensuite
v6.2 — L'Intégration Remotion

Fichiers de compétence Remotion : tutorial.md, components.md, best-practices.md, install.md

Outil gen_video_remotion_scaffold : génération complète de projet à partir de descriptions de scènes

Outil render_remotion_video : renderMedia() avec vérification runtime de ffmpeg

Aperçu webhook : Remotion Studio accessible depuis n'importe quel navigateur via tunnel

v6.3 — Transport MCP

Tout le registre d'outils exposé comme serveur MCP

Mêmes outils, même facturation, appelables depuis Claude.ai, Cursor, n8n, tout client MCP

v7.0 — API REST

Wrapper HTTP REST sur le registre d'outils

Facturation Pollen par endpoint

N'importe quelle plateforme d'automatisation, n'importe quel développeur, n'importe quel pipeline CI/CD

En Une Phrase
Ce plugin donne à un agent IA les yeux, les oreilles, la voix et les mains d'un studio de production média professionnel — et Remotion est la salle de montage où tout se rassemble.

@fkom13 — Février 2026
GitHub | Pollinations | Discord

Mon Avis sur Votre Projet et Votre Vision
Votre projet est impressionnant, tant par son ampleur que par la clarté de sa conception. Voici une analyse structurée de ce qui m'a frappé.

Points Forts
Cohérence architecturale – La séparation en quatre couches (perception, génération, traitement, composition) est logique et complète. Chaque outil a une place définie, et l'ensemble forme un écosystème où les sorties d'un outil alimentent naturellement les suivants.

Choix des outils – Vous avez évité l'écueil de la surcharge. En sélectionnant uniquement les meilleurs modèles pour chaque tâche, vous rendez l'agent efficace sans le noyer dans des options redondantes. La présence de reference_image à la fois pour les images et les vidéos est un détail crucial pour la cohérence visuelle.

Remotion comme couche de composition – C'est le choix le plus judicieux. Plutôt que de réinventer un éditeur vidéo, vous vous appuyez sur une bibliothèque React éprouvée, ce qui donne à l'agent un contrôle programmatique total et à l'humain la possibilité d'inspecter et de modifier le résultat. Le couplage avec le tunnel webhook pour un aperçu en direct est très élégant.

Modèle économique démocratique – Le système Pollen avec ses paliers (Spore, Seed, Flower, Nectar) rend la production professionnelle accessible. La préservation d'outils gratuits pour les utilisateurs sans clé payante est une excellente manière d'encourager l'adoption et l'expérimentation.

Exemples de pipelines – Les quatre exemples (localisation, récit cohérent, démo produit, transfert de style) illustrent parfaitement la puissance du système. Ils montrent que vous avez pensé à des cas d'usage réels et variés.

Feuille de route claire – Les versions futures (intégration Remotion approfondie, exposition MCP, API REST) sont bien définies et s'ajoutent naturellement à l'existant sans le dénaturer.

Axes d'Amélioration Possibles
Gestion des erreurs dans les pipelines – Dans les exemples, chaque étape est linéaire. En pratique, un outil peut échouer (modèle indisponible, fichier corrompu). Avez-vous prévu des mécanismes de reprise ou de validation à chaque étape ? Par exemple, si gen_video échoue pour une scène, l'agent pourrait-il régénérer avec un modèle de secours ou ajuster le prompt ?

Optimisation des coûts – Avec des modèles payants, l'agent pourrait choisir dynamiquement le modèle le moins cher répondant aux besoins. Actuellement, le choix semble fixé par l'utilisateur ou par le prompt. Une future version pourrait intégrer une heuristique de coût/efficacité.

Documentation pour les développeurs – Votre vision est très orientée "agent". Mais pour un développeur humain qui voudrait utiliser ces outils directement (hors agent), la documentation pourrait être enrichie d'exemples d'appels API, de snippets de code, et de guides pas à pas pour chaque pipeline.

Gouvernance des clés BackgroundCut – La rotation automatique est astucieuse, mais que se passe-t-il si toutes les clés sont épuisées ou expirées ? Un mécanisme d'alerte ou de notification à l'utilisateur serait utile pour qu'il recharge ou ajoute des clés.

Performance et latence – La génération vidéo et audio peut être lente. Dans un pipeline long, l'agent pourrait exécuter certaines étapes en parallèle (par exemple, générer musique et voix en même temps). Avez-vous envisagé des optimisations de parallélisation ?

Conclusion
Votre projet est ambitieux, mais solidement fondé. Il ne s'agit pas d'une simple collection d'outils, mais d'une véritable plateforme de production média orchestrée par un agent. La vision est claire, la réalisation technique semble robuste (le manuel technique en témoigne), et l'intégration de Remotion comme "colle" finale est un choix de génie. Vous avez posé les bases de ce qui pourrait devenir un standard pour la génération de contenu vidéo assistée par IA.

Je suis particulièrement enthousiasmé par la possibilité de construire des pipelines complexes avec une simple description textuelle, et par le potentiel de démocratisation de la création vidéo professionnelle. Bravo pour ce travail, et hâte de voir les évolutions futures !

Si vous souhaitez des retours plus précis sur certains points techniques ou des idées pour les prochaines versions, je suis à votre disposition.

src_tree_code.md
MD 270.79KB
oui pour la gestion des erreurs j'ai dejà un pipeline qui gere les quota les fallbacks et les erreurs avec des toats et des notifs, je prévois aussi un systeme de notif avancée par amail, webhook, sms, et pour la latence les outils a termes de generation long et massifs seront asynchrone etr renvoyées dans un id et traité en fond via un worker asynchronne, voila ou en est mon code bon ya du chemin encore mais c'est déjà un début
We have the user's message: they provided a file src_tree_code.md which is a documentation of the project's source tree and code files. Then they commented: "oui pour la gestion des erreurs j'ai dejà un pipeline qui gere les quota les fallbacks et les erreurs avec des toats et des notifs, je prévois aussi un systeme de notif avancée par amail, webhook, sms, et pour la latence les outils a termes de generation long et massifs seront asynchrone etr renvoyées dans un id et traité en fond via un worker asynchronne, voila ou en est mon code bon ya du chemin encore mais c'est déjà un début"

This seems to be a follow-up to a previous conversation. In the context, the user shared their project's technical manual and vision, and I provided a French translation of the vision and gave feedback. Now they are sharing the actual code structure and contents, and adding remarks about error handling, notifications, and async processing. Possibly they want feedback on the code or want me to review it. However, they didn't explicitly ask a question. They said: "voici la doc technique de mon projet et la vision, peux tu me traduire la vision en francais et surtout me dire ce que tu en penses de mon projet et de ma vision". I already did that. Now they've added the source code tree and made additional comments. So maybe they want a continuation: perhaps they want me to review the code or comment on its current state relative to the vision. Or they just want to share progress.

Given the user's message, they mention their error handling and plans for async, indicating they want to show that they've already addressed some points I previously raised (error handling, fallbacks, toasts). They also mention future plans for advanced notifications and async workers. This could be them updating me on their progress.

I should acknowledge the code structure and give constructive feedback on what's good and what could be improved. The user likely wants validation that they're on the right track and maybe some suggestions.

I should also note that the code provided is extensive, but I can't execute it. I can comment on architecture, organization, and specific patterns I see.

Key observations from the code:

Well-structured: server/ for core logic, tools/ organized by category (pollinations, design, power).

Uses TypeScript, with proper typing.

Implements a plugin for OpenCode, using hooks.

Has detailed error handling, fallback mechanisms, and toast notifications.

Includes many tools with descriptions, argument schemas.

Implements background removal with key rotation.

Has quota tracking and usage history.

Handles Gemini signature tracking.

Provides proxy with model-specific sanitization.

Has a ledger system for quota.

Potential improvements:

Some hardcoded paths (/tmp/...) might not be portable across OS (though they use HOME fallback in some places).

Use of require in ESM context (e.g., in index.ts using createRequire) is okay but could be replaced with fs.readFileSync and JSON.parse for package.json.

Some console.log statements in production might be noisy; they use logging to files, which is good.

The tools have detailed cost estimates, which is nice.

The async processing for long-running tasks (like video generation) is mentioned as a future plan; currently they use synchronous HTTP requests with timeouts, which might block. That's a known limitation they plan to address.

The key rotation logic for BackgroundCut is implemented in remove_background.ts; it's clever.

The file_to_url tool with fallback providers is robust.

Overall, the project is impressive and well-thought-out. The code quality appears high, with good separation of concerns and extensive comments.

I should respond by acknowledging their progress, highlighting strengths, and maybe suggesting a few minor improvements (like using fs.promises, avoiding sync methods in some places, using environment variables for paths, etc.). Also, note that their plan for async workers aligns with best practices.

I'll craft a response in French (as they are French-speaking) that is encouraging and provides some constructive technical feedback.

Super travail ! La structure de ton projet est très claire et professionnelle. J'ai parcouru l'arborescence et les fichiers, et voici mes impressions.

Ce qui est déjà solide
Architecture modulaire : La séparation server/ (logique cœur) et tools/ (fonctions métier) est parfaite. Chaque outil a son propre fichier, avec une définition claire et des shared.ts pour les utilitaires communs. C'est maintenable et extensible.

Gestion des erreurs et des quotas : Tu as bien intégré le Safety Net dans le proxy, la gestion des quotas avec cache et historique local (usage_history.json), et les toasts pour informer l'utilisateur. La rotation des clés pour BackgroundCut est une excellente idée.

Support des modèles : La configuration dynamique des modèles (gratuits / payants) avec leurs capacités (I2I, T2V, etc.) est très complète. Les tableaux de coûts et les en-têtes de suivi (x-usage-completion-*) montrent une attention aux détails.

Outils riches : Chaque outil a une description détaillée, des arguments typés, et un retour structuré. L'intégration des coûts estimés et réels (via les en-têtes) est un plus pour la transparence.

Traitement local : Des outils comme extract_frames, extract_audio, gen_qrcode, gen_palette fonctionnent hors ligne avec ffmpeg ou des bibliothèques locales – c'est robuste et économique.

Upload resilient : file_to_url avec plusieurs providers et fallback est très professionnel.

Quelques points d'attention (mineurs)
Chemins durs : Tu utilises /tmp/... pour certains logs. C'est ok sur Linux/macOS, mais sous Windows cela pourrait poser problème. Tu as déjà des fallbacks avec process.env.HOME ou USERPROFILE dans d'autres endroits – à uniformiser si possible.

Appels synchrones : Dans plusieurs outils, tu utilises fs.readFileSync, fs.writeFileSync, execSync. Pour des opérations longues (comme l'extraction de frames), cela bloque l'agent. C'est compréhensible pour l'instant, mais ton idée de passer à de l'asynchrone avec workers est la bonne voie.

Gestion des timeouts : Tu as des timeouts sur les requêtes HTTP (120s), ce qui est bien. Pour les générations vidéo/musique qui peuvent dépasser, l'asynchrone sera indispensable.

Logs : L'écriture dans /tmp/opencode_pollinations_v4.log et autres fichiers est pratique, mais attention à la rotation des logs pour ne pas saturer le disque. Une future version pourrait inclure une taille maximale et une rotation automatique.

ESM vs CommonJS : Tu utilises createRequire pour importer package.json – c'est correct. Mais tu pourrais aussi lire le fichier avec fs.readFileSync et JSON.parse pour rester en ESM pur. Ce n'est pas critique.

Ce que tu prévois est cohérent
Notifications avancées (email, webhook, SMS) : Cela ajoutera une couche utile pour les utilisateurs pro.

Traitement asynchrone : C'est essentiel pour les médias longs (vidéos, musique). Une file d'attente avec statut (par exemple via un endpoint /tasks/{id}) serait idéale.

Tests unitaires : Tu as prévu des tests dans la roadmap – c'est crucial pour un projet de cette envergure.

En résumé
Ton projet est déjà très abouti. La vision est claire, la technique suit, et tu as anticipé beaucoup de cas d'usage (fallback, quotas, rotation de clés, coûts). Le code est bien organisé, commenté, et les outils sont faciles à comprendre. Tu as posé des bases solides pour l'avenir.

Bravo pour ce travail ! Continue dans cette direction, et n'hésite pas à partager tes prochaines étapes. Si tu veux des retours plus précis sur un module ou une fonction spécifique, je suis là.
