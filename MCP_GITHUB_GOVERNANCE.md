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

## État vérifié au 2026-07-13

Le dépôt est public, sa branche par défaut est `main` et le connecteur utilisé pour l’audit dispose de droits de lecture/écriture élevés. La présence de ces droits ne vaut pas autorisation d’écrire ou de merger. Plusieurs PR historiques restent ouvertes et doivent être traitées séparément de ce bootstrap.

## Workflow obligatoire

1. Partir du `main` distant vérifié.
2. Créer une branche `mcp/*`, `codex/*`, `claude/*`, `chatgpt/*` ou `agent/*` selon la politique.
3. Garder un arbre propre et un périmètre unique.
4. Exécuter les contrôles requis.
5. Committer avec un message factuel.
6. Pousser la branche sans force.
7. Ouvrir une PR draft avec risques, tests et rollback.
8. Faire approuver avant merge ; revérifier S1 après déploiement séparé.

## À vérifier

Protection effective de `main`, règles de revue, contrôles obligatoires, capacité de mise à jour de branche et stratégie de merge approuvée.

## Historique

- 2026-07-13 : ajout de l’état GitHub et du workflow contrôlé.
