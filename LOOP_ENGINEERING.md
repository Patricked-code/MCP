# LOOP_ENGINEERING.md

## Role
Boucle de travail obligatoire du MCP.

## Boucle
1. Lire la memoire.
2. Lire le POINT DE REPRISE COURANT.
3. Identifier serveur, depot, branche et domaine.
4. Inventorier.
5. Evaluer les risques.
6. Planifier.
7. Executer prudemment.
8. Tester.
9. Documenter.
10. Mettre a jour SUIVI.md.
11. Preparer la reprise suivante.

## Critères de sortie de boucle

La boucle ne se termine que si le périmètre est respecté, les tests proportionnés ont un résultat, les changements sont traçables, les risques et questions restent visibles, et `SUIVI.md` contient une prochaine action exécutable.

## États possibles

- `prêt` : préconditions et autorisations réunies ;
- `en cours` : action bornée avec point de reprise ;
- `à vérifier` : information insuffisante, lecture seule autorisée ;
- `bloqué` : validation ou preuve externe indispensable ;
- `terminé` : résultat et contrôles documentés.

## Anti-dispersion

Une boucle traite une tâche et un périmètre. Toute découverte hors périmètre va dans `TODO.md` ou une nouvelle tâche ; elle ne doit pas être corrigée silencieusement.

## Historique

- 2026-07-13 : ajout des critères de sortie et états de boucle.
