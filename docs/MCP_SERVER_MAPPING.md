# MCP Server Mapping

## Objectif

Le mapping serveur relie un repository GitHub à un dossier déployé sur S1, S2 ou un autre serveur connu du MCP. Il permet à chaque agent de comprendre où se trouve le projet, comment il est exécuté et quelles actions sont autorisées.

## Champs minimum

```json
{
  "projectKey": "brvmchainsolution",
  "githubOwner": "Patricked-code",
  "githubRepo": "MCP",
  "officialBranch": "main",
  "serverId": "S1",
  "serverName": "crazy-mendel",
  "serverPath": "/opt/apps/wealthtech-mcp-ssh-bridge",
  "environment": "production",
  "publicDomain": "mcp.wealthtechinnovations.com",
  "runtime": "node-docker",
  "serviceName": "wealthtech_mcp_ssh_bridge",
  "buildCommand": "npm run build",
  "testCommand": "npm run typecheck",
  "deployCommand": "docker build ... && docker run ...",
  "allowedAgents": ["SuperAdmin MCP", "Codex", "Agent serveur"],
  "requiresHumanApprovalForDeploy": true,
  "lastCheckedAt": "2026-07-08T00:00:00.000Z",
  "notes": []
}
```

## Règles

- Aucun secret dans `.mcp/server-map.json`.
- Aucun mot de passe, token, clé privée ou variable sensible.
- Le chemin serveur doit être explicite.
- Le type de runtime doit être identifié : Node, Docker, PM2, static, API, database, autre.
- Le mapping doit indiquer si le déploiement est seulement préparé ou exécuté.
- Le déploiement exige une validation humaine sauf rôle explicitement autorisé.

## Détection automatique

Quand ConfigCloud connecte un répertoire, le MCP doit :

1. détecter s'il s'agit d'un repo Git ;
2. lire le remote GitHub ;
3. identifier owner/repo ;
4. identifier la branche active ;
5. identifier le chemin local/serveur ;
6. vérifier si le mapping existe déjà ;
7. proposer de créer ou mettre à jour `.mcp/server-map.json` ;
8. auditer la décision.

## États du mapping

- `unknown` : aucun mapping.
- `candidate` : mapping proposé, non validé.
- `linked` : repo et dossier serveur liés.
- `stale` : mapping ancien ou incohérent.
- `blocked` : mapping interdit ou sans droits suffisants.

## Sortie attendue

Le MCP doit afficher pour chaque repo :

- serveur lié ;
- chemin serveur ;
- branche officielle ;
- service ;
- dernier check ;
- agents autorisés ;
- prochaines actions.
