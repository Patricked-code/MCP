# TESTS.md

## Rôle
Stratégie de tests et validations du MCP.

## Tests attendus
- git status.
- scan secrets.
- typecheck TypeScript.
- build Docker/Node si nécessaire.
- lecture des logs MCP.
- vérification des outils read-only.
- vérification contrôlée des outils write-scoped.

## Règle
Toute modification technique doit indiquer les tests réalisés et le résultat dans SUIVI.md.

## Commandes versionnées

- `npm run typecheck` : vérification TypeScript sans émission ;
- `npm run build` : compilation TypeScript ;
- `npm run lint:secrets` : contrôle minimal de signaux sensibles ;
- `npm run docs:check` : présence de la documentation obligatoire.

Aucune suite de tests applicatifs automatisés n’est déclarée dans `package.json` sur le commit audité. Ne pas écrire qu’une suite unitaire a réussi sans commande et sortie vérifiables.

## Matrice de validation

Documentation seule : `docs:check`, contrôle secrets, validation JSON, liens/structure, `git diff --check`.

Code : ajouter `typecheck`, build et tests ciblés du composant.

Production : ajouter état Docker, logs masqués, `/health`, métadonnées OAuth et comportement protégé de `/mcp`.

## Preuve attendue

Consigner date, SHA, environnement, commande, code de sortie, résumé et limites dans `SUIVI.md` ou le rapport d’audit.

## Historique

- 2026-07-13 : alignement sur les scripts réellement déclarés.
