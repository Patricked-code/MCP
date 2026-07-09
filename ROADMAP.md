# ROADMAP.md

## Role
Feuille de route du MCP WealthTech.

## Phases
1. Inventaire read-only du depot et du serveur.
2. Creation des fichiers de memoire racine manquants.
3. Consolidation avec docs/ et memory/.
4. Verification de la couche .mcp.
5. Creation des memoires enfants par projet.
6. Audit des droits agents et GitHub.
7. Tests de non-regression.
8. Commit documentaire et synchronisation GitHub.
9. Extension progressive aux projets integres.

## Regle
Chaque phase doit avoir un statut, un risque, une condition de validation et une prochaine action.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.
