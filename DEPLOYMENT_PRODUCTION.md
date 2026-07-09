# DEPLOYMENT_PRODUCTION.md

## Rôle
Procédure de production MCP.

## Règles
- Ne jamais déployer sans lecture de SUIVI.md.
- Ne jamais redémarrer sans connaître l’impact.
- Ne jamais exposer de secrets.
- Vérifier build, typecheck, logs et rollback.
- Documenter toute action dans CHANGELOG.md.

## À vérifier
Commande build, commande restart, conteneur, ports, domaine, reverse proxy, logs et smoke tests.


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
