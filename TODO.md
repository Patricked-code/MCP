# TODO.md

## Role
Liste large des idees, anomalies, points a verifier et besoins non encore ordonnes.

## A traiter
- Verifier tous les fichiers Markdown racine attendus.
- Consolider les doublons utiles entre docs/, memory/ et la racine.
- Verifier la coherence des fichiers .mcp.
- Ajouter les fichiers enfants par projet.
- Creer un rapport d'audit documentaire.
- Ne pas toucher aux secrets ni au code applicatif pendant cette passe.

## Passage vers TASKS.md
Lorsqu'un point devient executable, il doit etre transforme en entree dans TASKS.md.


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
