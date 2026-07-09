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
