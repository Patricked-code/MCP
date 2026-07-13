# MCP_SERVER_REGISTRY.md

## Rôle
Registre des serveurs et chemins MCP.

## Entrée connue
- Serveur : S1.
- Rôle : hôte du MCP WealthTech SSH Bridge.
- Chemin : /opt/apps/wealthtech-mcp-ssh-bridge.
- Dépôt : Patricked-code/MCP.
- Branche : main.

## À compléter
Domaines, conteneurs, ports, reverse proxy, logs, projets liés, risques et dépendances.

## Registre vérifié au 2026-07-13

| Serveur | Rôle | Projet vérifié | Chemin | Runtime | Documentation |
|---|---|---|---|---|---|
| S1 | hôte principal et destination contrôlée | WealthTech MCP SSH Bridge | `/opt/apps/wealthtech-mcp-ssh-bridge` | Docker Compose / Node.js | présente, bootstrap en cours sur branche dédiée |
| S2 | source/migration et projets protégés | aucun projet déclaré intégré par cette passe | à vérifier par projet | hétérogène, à vérifier | inventaire projet requis |

## Champs obligatoires par entrée

Alias, rôle, propriétaire, projets, chemins, domaines, stack, services, logs, sauvegardes, risques, protections, dernier audit, SHA/branche et état documentaire. Les IP ou credentials ne sont pas nécessaires dans la version publique si un alias suffit.

## Maintenance

Toute modification de mapping doit être reflétée dans `.mcp/server-map.json`, `MCP_SERVER_MAPPING.md` et le dossier enfant concerné, avec preuve serveur et décision si l’impact est sensible.

## Historique

- 2026-07-13 : ajout du registre S1/S2 vérifié et des champs obligatoires.
