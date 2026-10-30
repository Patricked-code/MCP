# Provenance, qualification et non-régression

## Sources primaires
Dépôt Patricked-code/MCP, issues #235/#177/#349, PR citées dans les fichiers suivants ; dépôt chainsolutions-wealthtech/Regulatory issue #3. Les descriptions des PR et commentaires GitHub sont des **déclarations historiques** ; lorsqu'une CI ou un déploiement est cité, son exécution doit être contrôlée à son URL et à son SHA exact pour certification indépendante.

## Niveaux de preuve
- OBSERVÉ : réponse d'outil ou source primaire consultée.
- DÉCLARÉ : corps de PR/commentaire affirmant un état, sans contre-vérification du run.
- ATTESTÉ DANS CHECKPOINT : observation consignée dans un checkpoint avec identifiant.
- NON VÉRIFIÉ : référence ou événement non encore contrôlé.
- BLOQUÉ : condition d'admission non satisfaite.
- HISTORIQUE : vrai à une date, sans extrapolation au runtime actuel.

## Champs obligatoires de chaque événement
Date UTC, référence source, agent/auteur si attesté, objectif, HEAD/base exacts si connus, autorités Task/Session/Claim/Lock, opération demandée, opération réellement exécutée, test RED/GREEN, CI, revue, merge, deploy, SHA observé S1/S2, résultat, blocage, rollback, next action, lien parent et liens descendants.

## Garanties
Pas de modification de main, pas de runtime/S1/S2, pas de nouveau claim, pas de nouvelle Task Queue, pas de nouveau dispatcher. Toute reconstruction doit conserver les événements remplacés, refusés et échoués. La numérotation des PR n'est pas à elle seule une chronologie : utiliser created_at et les horodatages des runs/commits.
