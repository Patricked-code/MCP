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
