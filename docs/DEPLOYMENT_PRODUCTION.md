# DEPLOYMENT_PRODUCTION.md — Déploiement production

## Cible recommandée

- Serveur : S1 `root@212.227.212.33`
- Dossier : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Domaine : `mcp.wealthtechinnovations.com`
- Port local : `127.0.0.1:8787`
- HTTPS : obligatoire

## Étapes

1. Cloner le dépôt sur S1.
2. Installer les dépendances Node.js.
3. Copier `.env.example` vers `.env`.
4. Créer un token MCP long et aléatoire.
5. Créer les clés SSH dédiées dans le dossier local non versionné.
6. Compiler TypeScript.
7. Démarrer avec PM2 ou Docker Compose.
8. Configurer le reverse proxy HTTPS.
9. Tester la route `/health`.
10. Tester `/mcp` depuis ChatGPT.

## PM2

Nom conseillé : `wealthtech-mcp-ssh-bridge`.

## Docker

Le fichier `docker-compose.yml` expose le service uniquement sur l’interface locale.

## Rollback

Arrêter le service MCP, restaurer la version précédente du dépôt ou désactiver temporairement le vhost `mcp.wealthtechinnovations.com`.

## Tests post-déploiement

- Healthcheck HTTP.
- Authentification par bearer token.
- Outil `ping`.
- Outil `check_disk_s1`.
- Outil `check_disk_s2`.
