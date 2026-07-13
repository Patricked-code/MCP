# CRON.md

## Rôle
Registre des tâches planifiées liées au MCP et aux projets intégrés.

## À documenter
Cron système, scripts applicatifs, fréquences, utilisateur d’exécution, logs, dépendances, risques et état.

## Règle
Ne jamais supprimer ou déplacer un script avant d’avoir vérifié s’il est appelé par un cron.

## État vérifié au 2026-07-13

Aucun cron n’est déclaré dans le dépôt Git. Cela ne permet pas de conclure qu’aucune tâche planifiée n’existe sur S1 ou S2.

## Procédure d’inventaire

Pour chaque tâche : relever serveur, utilisateur, expression, fuseau, commande ou script, répertoire, variables attendues, logs, dépendances, propriétaire, dernière exécution connue et impact d’un échec.

## Garde-fous

- audit serveur en lecture seule avant toute modification ;
- ne jamais afficher les variables sensibles ;
- vérifier les timers systemd, panneaux d’hébergement et ordonnanceurs applicatifs en plus de crontab ;
- documenter les crons projet dans `docs/projects/<projet>/CRON.md` si nécessaire.

## Historique

- 2026-07-13 : distinction entre absence dans Git et absence sur serveur.
