# MCP Repo Footprint

## Objectif

Le **Repo Footprint** définit les fichiers que le MCP doit vérifier et éventuellement générer dans chaque repository connecté. Ces fichiers permettent de savoir si un repo est connu, documenté, gouverné et lié à un serveur.

## Fichiers JSON MCP obligatoires

```text
.mcp/manifest.json
.mcp/permissions.json
.mcp/agents.json
.mcp/server-map.json
.mcp/onboarding.json
```

### `.mcp/manifest.json`

Contient :

- nom du projet ;
- owner/repo ;
- branche officielle ;
- statut MCP ;
- version du manifeste ;
- modules activés ;
- date de création ;
- date de dernière vérification.

### `.mcp/permissions.json`

Contient :

- agents autorisés ;
- droits par agent ;
- branches autorisées ;
- actions interdites ;
- actions nécessitant validation humaine.

### `.mcp/agents.json`

Contient :

- agents liés au repo ;
- rôles ;
- droits ;
- restrictions ;
- historique minimal.

### `.mcp/server-map.json`

Contient :

- serveur cible ;
- chemin projet ;
- domaine public ;
- service Docker/PM2 éventuel ;
- environnement ;
- scripts de build/test/deploy ;
- aucune donnée secrète.

### `.mcp/onboarding.json`

Contient :

- statut de l'onboarding ;
- questions répondues ;
- décisions prises ;
- acteur ;
- prochaine étape.

## Fichiers Markdown MCP obligatoires

```text
MCP_PROJECT.md
MCP_AGENT_RULES.md
MCP_REPO_INVENTORY.md
MCP_SERVER_MAPPING.md
```

## Fichiers projet standards à vérifier

```text
README.md
SUIVI.md ou TASKS.md
DEPLOYMENT.md
SECURITY.md
```

## États possibles

- `not_configured` : aucun fichier `.mcp` détecté.
- `partial` : une partie de la structure existe.
- `ready` : fichiers minimum présents et cohérents.
- `needs_review` : fichiers présents mais incohérents, anciens ou incomplets.

## Rapport attendu par repo

```json
{
  "owner": "Patricked-code",
  "repo": "MCP",
  "defaultBranch": "main",
  "visibility": "public",
  "permissions": {
    "pull": true,
    "push": true,
    "admin": true
  },
  "presentFiles": [],
  "missingFiles": [],
  "mcpStatus": "partial",
  "recommendations": [],
  "canBootstrapOnBranch": true
}
```

## Stratégie de génération

Si des fichiers manquent :

1. créer une branche MCP dédiée ;
2. générer les fichiers manquants ;
3. ne jamais écrire directement sur `main` ;
4. ouvrir ou préparer une pull request ;
5. tracer l'action dans l'audit.
