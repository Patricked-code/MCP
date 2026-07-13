# BACKUP_RESTORE.md

## Rôle
Sauvegarde, restauration et rollback.

## Règles
- Aucune suppression sans inventaire.
- Aucune migration sans plan de restauration.
- Sauvegarder avant modification risquée.
- Documenter emplacement, date, contenu, commande, résultat et méthode de restauration.

## À vérifier
Sauvegardes existantes S1/S2, dumps, archives, rétention et restauration testée.

## Inventaire minimal

Pour chaque sauvegarde : projet, serveur, source, type, date, taille, chiffrement, rétention, emplacement logique, propriétaire, preuve d’intégrité et dernier test de restauration. Ne jamais versionner l’archive ni son credential.

## Procédure de restauration

1. Identifier l’incident et geler les écritures si l’opérateur l’autorise.
2. Vérifier l’intégrité et la compatibilité de la sauvegarde.
3. Restaurer dans un environnement isolé lorsque possible.
4. Exécuter la recette fonctionnelle et données.
5. Obtenir l’approbation avant bascule production.
6. Documenter résultat, écarts et rollback.

## État actuel

Le connecteur permet un inventaire en lecture seule des sauvegardes potentielles sur S1/S2. Aucune preuve de restauration récente n’a été établie dans cette passe documentaire.

## Historique

- 2026-07-13 : ajout de l’inventaire minimal et de la procédure de restauration.
