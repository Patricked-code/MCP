# CODEX.md

## Rôle
Mode opératoire de Codex dans le dépôt MCP.

## Règles obligatoires
- Lire SUIVI.md avant toute action.
- Lire GPT.md, PROJECT_RULES.md, SOURCE_OF_TRUTH.md et NO_REGRESSION_POLICY.md.
- Ne jamais travailler à l’aveugle.
- Ne jamais écrire de secret dans Git.
- Ne jamais pousser en force.
- Ne pas modifier main directement pour les changements importants : préférer branche dédiée et PR.
- Ne pas mélanger une passe documentaire avec des modifications applicatives non revues.
- Mettre à jour TASKS.md, CHANGELOG.md, DECISIONS_LOG.md et SUIVI.md après action importante.

## Procédure Codex
1. Inventorier le dépôt.
2. Identifier la branche et le remote.
3. Lire le point de reprise.
4. Planifier.
5. Modifier uniquement le périmètre autorisé.
6. Tester.
7. Produire un rapport.
8. Préparer la PR.

## Point d’attention actuel
Deux fichiers applicatifs existaient déjà comme modifiés avant cette passe documentaire : data/mcp-git-registry.json et src/github/registry.ts. Ne pas les mélanger à un commit documentaire sans revue dédiée.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

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
