# README_DEV.md

## Role
Guide developpeur du MCP.

## Procedure minimale
1. Lire README.md, SUIVI.md, GPT.md, CLAUDE.md ou CODEX.md selon l'agent.
2. Verifier git status et la branche.
3. Ne pas toucher aux secrets.
4. Travailler en branche si changement important.
5. Tester avant commit.
6. Mettre a jour documentation et suivi.

## Commandes a verifier
npm install, npm run build, npm run typecheck, docker compose, logs MCP.


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
