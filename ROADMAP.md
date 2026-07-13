# ROADMAP.md

## Role
Feuille de route du MCP WealthTech.

## Phases
1. Inventaire read-only du depot et du serveur.
2. Creation des fichiers de memoire racine manquants.
3. Consolidation avec docs/ et memory/.
4. Verification de la couche .mcp.
5. Creation des memoires enfants par projet.
6. Audit des droits agents et GitHub.
7. Tests de non-regression.
8. Commit documentaire et synchronisation GitHub.
9. Extension progressive aux projets integres.

## Regle
Chaque phase doit avoir un statut, un risque, une condition de validation et une prochaine action.

## État au 2026-07-13

| Phase | Statut | Condition de sortie / prochaine action |
|---|---|---|
| 1. Inventaire read-only | terminé pour GitHub `main` et S1 | Réauditer avant merge/déploiement |
| 2. Fichiers racine | préparé sur branche | Revue humaine du contenu |
| 3. Consolidation `docs/` / `memory/` | partielle et non destructive | Traiter par thème, sans fusion massive |
| 4. Couche `.mcp` | syntaxe et présence vérifiées | Revue sémantique/compatibilité ultérieure |
| 5. Mémoires enfants | modèle créé | Onboarder un projet vérifié à la fois |
| 6. Droits agents/GitHub | documentation enrichie | Vérifier protections et droits réels |
| 7. Non-régression | contrôles documentaires réussis | Refaire sur le diff final |
| 8. Commit/PR | non exécuté | Validation humaine puis commit et PR draft |
| 9. Extension projets | non démarrée | Choisir le premier projet après audit |

Cette passe n’autorise aucun déploiement ni modification de production.


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
