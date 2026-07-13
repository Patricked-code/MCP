# DOCKER.md

## Rôle
Documentation Docker du MCP.

## À documenter
- docker-compose.yml.
- Dockerfile.
- Conteneur MCP.
- Image Node utilisée.
- Volumes.
- Ports.
- Logs.
- Build.
- Restart.
- Healthcheck.

## Règles
Ne jamais lancer de prune, restart ou build de production sans contexte, test et point de reprise dans SUIVI.md.

## État vérifié au 2026-07-13

- image de base : Node.js 20 Alpine ;
- service Compose : `wealthtech-mcp-ssh-bridge` ;
- conteneur nommé : `wealthtech_mcp_ssh_bridge` ;
- port publié : boucle locale `8787` vers le port `8787` du conteneur ;
- volumes : clés en lecture seule, données, secrets et logs persistants ;
- politique de redémarrage : `unless-stopped`.

La configuration utilise un fichier `.env` non versionné. Sa valeur et le contenu des volumes sensibles ne doivent jamais être lus ou publiés dans une passe documentaire.

## Procédure contrôlée

Avant build ou restart : confirmer branche/SHA, dépôt propre, sauvegarde si nécessaire, `typecheck`, build, état du conteneur et endpoint `/health`. Après action : vérifier logs masqués, endpoint public et protection de `/mcp`.

## Rollback et risques

Conserver l’image ou le commit précédent et documenter la commande de retour avant l’action. `docker prune`, `docker compose down` et toute suppression de volume restent interdits sans validation explicite.

## Historique

- 2026-07-13 : documentation de la configuration Compose réellement versionnée.
