# PROJECT_RULES.md

## Role
Regles generales non negociables du MCP.

## Regles
- Ne jamais coder a l'aveugle.
- Ne jamais ecrire de secret dans Git.
- Ne jamais ecraser sans lecture.
- Ne jamais supprimer sans inventaire.
- Toujours mettre a jour SUIVI.md apres action importante.
- Toujours separer documentation, code, production et securite.

## Ordre obligatoire

1. Identifier la demande et le périmètre.
2. Lire les instructions applicables et le point de reprise.
3. Vérifier GitHub, serveur et `.mcp` selon le risque.
4. Travailler sur branche contrôlée.
5. Tester et documenter.
6. Demander la revue avant merge ou action sensible.

## En cas de contradiction

Suspendre l’écriture, préserver les deux sources, consigner le conflit dans `DECISIONS_LOG.md` et obtenir une validation humaine lorsque l’écart touche sécurité, serveur ou production.

## Historique

- 2026-07-13 : ajout de l’ordre d’intervention et de la gestion des contradictions.
