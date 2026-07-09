# SOURCE_OF_TRUTH.md

## Role
Registre des sources de verite du MCP.

## Ordre de priorite
1. Etat reel serveur et Git.
2. Fichiers .mcp/*.json pour la couche MCP.
3. SUIVI.md pour le point de reprise.
4. MCP_REPO_INVENTORY.md pour le depot.
5. MCP_SERVER_MAPPING.md pour le mapping serveur.
6. docs/ et memory/ pour historique et contexte.

## Regle
En cas de contradiction, documenter le conflit dans DECISIONS_LOG.md avant action.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z
