# CODE_REVIEW.md

## Rôle
Journal de revue technique et dette du MCP.

## Points initiaux
- Deux fichiers applicatifs étaient déjà modifiés avant la passe documentaire : data/mcp-git-registry.json et src/github/registry.ts.
- Ne pas les mélanger avec le commit documentaire sans revue spécifique.
- Vérifier CODEX.md après écriture pour corriger toute anomalie d’encodage ou typo.

## À documenter
Risques, dette, fichiers critiques, corrections faites, corrections restantes et tests.


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
