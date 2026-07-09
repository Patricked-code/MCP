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
