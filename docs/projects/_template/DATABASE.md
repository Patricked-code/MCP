# DATABASE.md — Modèle projet

## 1. Rôle du fichier
Décrire les données et règles de changement sans exposer de credentials.

## 2. Objectif
Encadrer lecture, migration, sauvegarde et restauration.

## 3. Périmètre
Moteurs, schémas, propriétaires et environnements du projet.

## 4. Source de vérité
Schémas versionnés et état vérifié ; parent : `/DATABASE.md`.

## 5. Informations connues
À compléter après audit en lecture seule.

## 6. Informations à vérifier
Moteur, version, schémas, volumétrie, migrations, sauvegardes, rétention et restauration.

## 7. Règles applicables
Aucun secret, aucune écriture ou migration sans sauvegarde, validation et rollback.

## 8. Procédures
Inventorier, sauvegarder, tester hors production, approuver, exécuter et vérifier.

## 9. Risques
Perte de données, incompatibilité de schéma, verrouillage et sauvegarde inutilisable.

## 10. À maintenir à jour
Versions, migrations, sauvegardes, tests de restauration et responsables.

## 11. Historique des mises à jour
- `<Date>` : création après audit des données.
