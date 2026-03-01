# Architecture Cible : Modèles Dynamiques pour Outils OpenCode

**Problématique** : Les modèles multimédia évoluent constamment via l'API, mais l'architecture d'OpenCode exige une déclaration statique (enums et descriptions "en dur") lors de l'initialisation des `tools()` (ex: `gen_image.ts`, `gen_video.ts`). Si on met à jour les descriptions lors de la déclaration statique du module, on n'a pas encore le résultat des `fetch` de l'API.

**Objectif** : Retirer les "enums" statiques et générer la description des outils de manière asynchrone pour que seul ce qui est réellement présent sur l'API s'affiche via le prompt de l'Agent.

## Phase 1 : Cadrage de la solution
Puisqu'on ne peut pas injecter un rendu de modèle asynchrone avant l'initialisation du Plugin host, on doit :
1. Découpler la définition statique (schéma natif de base) de l'enrichissement sémantique (descriptions de la commande).
2. Construire un processus d'initialisation en deux temps (Two-Stage Initialization).
3. Rendre la description des outils mutable.

## Phase 2 : Implémentation du système `ToolRegistryWorker`
Création d'un service interne `ToolRegistryWorker` qui sera responsable de :
- Interroger `ModelRegistry` dès sa disposition pour récupérer le catalogue.
- Retraiter les descriptions et les tableaux de modèles générés via un utilitaire `parseModelDescription`.
- Modifier (patch) le contexte textuel interne du tool (`toolDef.description`) ou générer un message d'instruction prompt supplémentaire.

## Phase 3 : Tests d'alignements Cost Estimator et Real Cost
*La problématique des coûts est indissociable des modèles.*
- Remplacer les estimations actuelles par la vraie méthode définie dans l'alignement du Dashboard (incluant marge + overhead prompt input).
- **Test Indépendant** : Créer un script de test asynchrone (`src/server/scripts/test_parallel_cost.ts`) pour interroger la `/account/balance` avant/après des appels REST asynchrones massifs afin de chiffrer précisément les éventuels décalages liés à la parallélisation et calculer le vrai coût.
