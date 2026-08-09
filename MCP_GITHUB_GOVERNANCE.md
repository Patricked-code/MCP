# MCP_GITHUB_GOVERNANCE.md

## Rôle
Gouvernance GitHub via MCP.

## Règles
- Dépôt attendu : Patricked-code/MCP.
- Branche officielle : main.
- Préférer branche dédiée et PR pour changements importants.
- Ne jamais force-push.
- Ne jamais mélanger code applicatif non revu et documentation.
- Documenter changements dans CHANGELOG.md.

## À vérifier
Protection de branche, PR ouvertes, droits GitHub, remotes, statut sync serveur/GitHub.

## Identité GitHub du déploiement S1

- S1 utilise une deploy key dédiée au seul dépôt `Patricked-code/MCP`.
- L'option GitHub « Allow write access » doit rester désactivée.
- Le remote de fetch attendu est
  `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`.
- Le remote de push attendu est la sentinelle locale
  `disabled://mcp-s1-read-only`.
- Un nom d'alias ne vaut jamais preuve de permissions : la rotation doit attester
  un fetch réussi et un push direct `--dry-run` refusé par GitHub.
- L'ancienne identité `github.com-mcp-patricked-rw` doit être révoquée après
  inventaire de ses usages et validation de la nouvelle identité.

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
