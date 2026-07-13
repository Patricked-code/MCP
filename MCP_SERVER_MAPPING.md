# MCP Server Mapping

## S1

- IP : `212.227.212.33`
- MCP : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Domaine MCP : `https://mcp.wealthtechinnovations.com`

## S2

- IP : `217.160.249.254`

## Règle

Toute migration doit passer par inventaire, sauvegarde ou GitHub, branche dédiée, déploiement contrôlé, vérification HTTP/API/logs et documentation.

## Mapping vérifié du MCP au 2026-07-13

| Dépôt | Branche | Serveur | Chemin | Domaine | Runtime | État |
|---|---|---|---|---|---|---|
| `Patricked-code/MCP` | `main` | S1 | `/opt/apps/wealthtech-mcp-ssh-bridge` | `mcp.wealthtechinnovations.com` | Docker Compose / Node.js | checkout propre et aligné avec GitHub au début de l’audit |

Le MCP n’est pas mappé sur S2 comme application exécutée. S2 est déclaré comme serveur source/migration avec des domaines protégés ; aucune action y est autorisée par ce document.

## Vérification obligatoire du mapping

1. Vérifier owner/repo et URL du remote.
2. Vérifier branche et SHA GitHub.
3. Vérifier branche, SHA et propreté du checkout serveur.
4. Vérifier chemin, service, runtime, domaine, logs et healthcheck.
5. Comparer à `.mcp/server-map.json` et `MCP_SERVER_REGISTRY.md`.
6. Bloquer tout déploiement en cas d’écart.

## Services et domaines à ne pas toucher

Tous les domaines marqués protégés par le connecteur S1/S2, ainsi que les volumes `keys`, `secrets`, `logs` et données, restent hors périmètre documentaire. Leur liste détaillée doit être consultée dans le contexte serveur autorisé, sans recopier de credential.

## Commandes et logs

Les commandes de build/test viennent de `package.json`. Les opérations Docker et les contrôles HTTP suivent `DOCKER.md`, `TESTS.md` et `MONITORING.md`. Les logs doivent être lus via un outil masquant les secrets.

## Historique

- 2026-07-13 : mapping MCP GitHub ↔ S1 revérifié avant modification.
