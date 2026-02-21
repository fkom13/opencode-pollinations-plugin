5 opérations, zéro refactoring massif
1. server/models/types.ts → remplace l'existant
Ajouts : avgRequestCost, flatCostPerImage, standardOutputTokens dans ModelPricing + nouveaux types ManualOverride, ManualExtra
2. server/models/manual.ts → fichier NOUVEAU à créer
C'est l'extraction des VIDEO_LOCAL_EXTRAS / IMAGE_LOCAL_EXTRAS qui étaient dans fetcher.ts, maintenant proprement isolés avec applyManualPatches(), deepMerge(), et la gestion expiresAt
3. server/models/fetcher.ts → remplace l'existant
Seule vraie modification : suppression des deux constantes LOCAL_EXTRAS + ajout de import { applyManualPatches } + appel en fin de fetchAllModels()
4. server/models/index.ts → remplace l'existant
Ajout des exports applyManualPatches, listActiveOverrides, listExtras, ManualOverride, ManualExtra
5. tools/pollinations/beta_discovery.ts → fichier NOUVEAU
Tool OpenCode complet avec les 3 actions : discover (sondage complet avec extraction d'enums depuis les erreurs 400), scan_enums (test de candidats), diff_models (détecte les nouveaux modèles pas encore dans ton registre)
6. tools/index.ts → remplace l'existant
Une seule ligne ajoutée : import { betaDiscoveryTool } + tools['beta_discovery'] = betaDiscoveryTool dans le bloc Enter UniverseManualTS TéléchargerBeta

Files:
discoveryTS TéléchargerFetcherTS TéléchargerTypesTS TéléchargerIndexTS TéléchargerIndexTS 
