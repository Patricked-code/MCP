# MONITORING.md

## Rôle
Supervision du MCP.

## À vérifier
- Logs Docker du conteneur MCP.
- État du service.
- Erreurs serveur.
- Santé des routes MCP.
- Outils read-only et write-scoped.
- Échecs d’authentification.
- Audit des actions sensibles.

## Règle
Tout incident doit être documenté dans SUIVI.md et CHANGELOG.md.

## Référence opérationnelle

Le service expose `/health`. Les métadonnées OAuth publiques et le refus attendu de `/mcp` sans authentification complètent la recette externe. Les logs applicatifs utilisent Pino et les logs du conteneur peuvent être lus par un outil MCP dédié avec masquage.

## Contrôle avant et après changement

1. Relever SHA, état Docker et réponse `/health`.
2. Vérifier les erreurs récentes sans recopier de valeur sensible.
3. Effectuer le changement autorisé.
4. Comparer les mêmes signaux et surveiller les erreurs d’authentification.
5. Documenter heure, résultat, anomalie et décision de rollback.

## Seuils et alertes à vérifier

Disponibilité, latence, taux d’erreur, redémarrages, espace disque, échecs SSH/GitHub/OAuth, saturation des logs et rétention. Aucun seuil n’est considéré validé tant qu’il n’est pas relié à un outil et un responsable.

## Historique

- 2026-07-13 : ajout de la référence de santé et de la boucle de contrôle.
