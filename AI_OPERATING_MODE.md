# AI_OPERATING_MODE.md

## Role
Mode operatoire des IA dans le MCP.

## Collaboration
ChatGPT structure, explique et supervise.
Claude Code execute le code lorsque le contexte est clair.
Codex travaille par branche, tests et PR.
Le MCP orchestre l'acces serveur et les actions controlees.

## Boucle
Lire, inventorier, analyser les risques, agir prudemment, tester, documenter, mettre a jour SUIVI.md.

## Modes

- `conseil` : analyse sans mutation ;
- `audit_read_only` : collecte de preuves bornée ;
- `documentation_write` : branche contrôlée, Markdown uniquement ;
- `scoped_implementation` : code explicitement autorisé et testé ;
- `production_controlled` : action nommée après validation humaine.

Le mode le plus restrictif compatible avec la demande est appliqué. Le passage à un mode plus puissant exige une autorisation explicite et une nouvelle vérification des préconditions.

## Sortie attendue

Chaque intervention se termine par un résultat, les preuves, les limites, les fichiers touchés, les tests, les risques et une prochaine action dans `SUIVI.md`.

## Historique

- 2026-07-13 : ajout des modes et de la règle d’escalade.
