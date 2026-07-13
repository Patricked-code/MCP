# MCP_TOOLS.md

## Rôle
Catalogue des outils MCP disponibles.

## Catégories
- Read-only : statut, inventaire, logs, scan.
- Write-scoped : écriture contrôlée de fichiers autorisés.
- Projet : pull, build, deploy uniquement sur projets autorisés.
- SQL : SELECT uniquement.
- Sécurité : scan secrets, masquage.

## Règle
Chaque outil doit documenter arguments, résultat, droits requis, risques et interdictions.

## `mcp_sync_from_github_s1`

Objectif : synchroniser `/opt/apps/wealthtech-mcp-ssh-bridge` avec `Patricked-code/MCP:main` sans écraser ni réécrire l'historique.

Argument obligatoire :

- `allow_write=true` après validation explicite de l'opérateur.

Garde-fous :

- `ENABLE_WRITE_TOOLS` doit être actif ;
- branche serveur obligatoirement `main` ;
- remote `origin` limité au dépôt `Patricked-code/MCP` ;
- dépôt totalement propre, y compris les fichiers non suivis ;
- avance rapide uniquement après vérification d'ascendance ;
- hooks Git désactivés pendant le fetch et le fast-forward ;
- contrôle du commit final et nouvel état propre obligatoire.

L'outil n'exécute ni build, ni redémarrage, ni reset, ni clean, ni rebase, ni stash, ni push. Le build et le redémarrage restent des opérations séparées afin de conserver des points de contrôle explicites.

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
