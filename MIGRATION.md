# MIGRATION.md

## Rôle
Plan de migration MCP et projets intégrés.

## Règles
- Inventaire avant migration.
- Sauvegarde avant action risquée.
- Aucun secret dans Git.
- Mapping serveur obligatoire.
- Rollback documenté.
- SUIVI.md mis à jour avant et après.

## Projets à rattacher progressivement
brvmchain, wealthtech, evote, evaluations, stablecoin, et tout repo ajouté ensuite.

Ces noms sont des candidats historiques à vérifier, pas des intégrations terminées.

## Préconditions obligatoires

- source et destination identifiées sans ambiguïté ;
- repo, branche, SHA, serveur, chemin et domaine confirmés ;
- sauvegarde disponible et restauration testée ;
- services et crons dépendants inventoriés ;
- plan de recette et rollback approuvé ;
- tâche, décision et point de reprise à jour.

## Séquence de migration

1. Auditer en lecture seule et produire le mapping.
2. Classer données, secrets, fichiers générés et éléments protégés.
3. Tester la procédure hors production.
4. Obtenir la validation humaine pour l’exécution.
5. Exécuter avec journalisation et fenêtre définie.
6. Vérifier Git, services, routes, données et logs.
7. Déclencher le rollback si un critère de sortie échoue.

## État actuel

Aucune migration n’est autorisée par cette mise à jour documentaire. Les migrations propres aux projets doivent être décrites dans `docs/projects/<projet>/MIGRATION.md` si ce fichier est ajouté au dossier projet.

## Historique

- 2026-07-13 : clarification des préconditions et du statut non autorisant.
