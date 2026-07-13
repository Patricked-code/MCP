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

## Fiche obligatoire par outil

Nom, description, catégorie, arguments, sortie, serveur/projet, rôle requis, effets de bord, chemins autorisés, timeout, masquage, audit, tests, rollback et propriétaire.

## Garde d’exécution

Avant appel : vérifier rôle, périmètre, état Git, point de reprise et préconditions. Après appel : capturer résultat public sûr, code de sortie, effets, test et prochaine action.

## Classification

- `read_only` : observation sans mutation ;
- `documentation_write` : fichiers autorisés sur branche contrôlée ;
- `scoped_code_write` : périmètre de code explicite avec tests ;
- `deploy_controlled` : procédure et approbation humaines ;
- `admin_human_only` : jamais délégué implicitement.

## Désactivation

Un outil doit être désactivé ou repassé en lecture seule si son périmètre est ambigu, son masquage échoue, ses tests régressent ou les permissions divergent.

## Historique

- 2026-07-13 : ajout du contrat et des gardes d’exécution.
