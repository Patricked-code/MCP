# WealthTech MCP SSH Bridge

Serveur MCP Node.js/TypeScript destiné à exposer à ChatGPT/Codex des outils contrôlés pour inventorier, documenter et préparer les opérations sur les serveurs WealthTech.

## Objectif

Ce dépôt contient le MCP `wealthtech_ssh_bridge`. Il doit permettre une connexion contrôlée vers :

- S1 : `root@212.227.212.33`
- S2 : `root@217.160.249.254`

Le mode initial est volontairement **read-only first** : aucune suppression, aucun redémarrage, aucun vidage de dossier, aucune migration destructive ne doit être activée dans la première version.

## URL cible

```text
https://mcp.wealthtechinnovations.com/mcp
```

## Installation locale

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

## Variables d’environnement

Voir `.env.example`.

Ne jamais pousser `.env`, les clés SSH, les dumps SQL, les sauvegardes ou les secrets.

## Outils MCP read-only initiaux

- `ping`
- `get_project_context`
- `check_disk_s1`
- `check_disk_s2`
- `pm2_status_s1`
- `pm2_status_s2`
- `docker_status_s1`
- `docker_status_s2`
- `list_domains_s1`
- `list_domains_s2`
- `list_large_files_s1`
- `list_large_files_s2`
- `list_backups_s1`
- `list_backups_s2`
- `curl_domain`

## Documentation obligatoire

La mémoire persistante du projet se trouve dans `docs/`.

Avant toute modification, lire :

1. `docs/GPT.md`
2. `docs/SUIVI.md`
3. `docs/ROADMAP.md`
4. `docs/TASKS.md`
5. `docs/SECURITY.md`
6. `docs/MCP_TOOLS.md`
7. `docs/AGENTS_ARCHITECTURE.md`
8. `docs/AI_SKILLS.md`

## Déploiement recommandé

- Hébergement : S1
- Dossier : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Runtime initial : PM2 ou Docker Compose
- Reverse proxy : Nginx/Plesk vers `127.0.0.1:8787`
- HTTPS obligatoire
- Authentification : header `Authorization: Bearer <MCP_AUTH_TOKEN>`

## Règle de sécurité

Le MCP ne doit pas devenir une console root libre. Il doit exposer uniquement des outils contrôlés, nommés, documentés, journalisés et validés.
