# TASKS.md

## Role
Plan operationnel executable du MCP.

## Taches immediates
- TASK-20260709-001 : finaliser les fichiers Markdown racine manquants.
- TASK-20260709-002 : comparer racine, docs/ et memory/ sans ecrasement.
- TASK-20260709-003 : preparer docs/projects/<projet>/ pour les projets integres.
- TASK-20260709-004 : auditer les fichiers .mcp/*.json.
- TASK-20260709-005 : produire un rapport final et commit documentaire.

## Regle
Une tache executable doit indiquer objectif, fichiers concernes, risques, preconditions, tests et resultat attendu.


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
