# MONITORING.md — Modèle projet

## 1. Rôle du fichier
Décrire les signaux de santé, journaux et alertes du projet.

## 2. Objectif
Détecter une régression et disposer d’une preuve après changement.

## 3. Périmètre
Services, routes, jobs, bases et dépendances critiques.

## 4. Source de vérité
Outils de supervision et état serveur ; parent : `/MONITORING.md`.

## 5. Informations connues
À compléter après observation en lecture seule.

## 6. Informations à vérifier
Healthchecks, métriques, logs, seuils, rétention, alertes et astreinte.

## 7. Règles applicables
Masquer les secrets et documenter tout incident dans `SUIVI.md` et `CHANGELOG.md`.

## 8. Procédures
Établir la référence, modifier, comparer, surveiller et escalader.

## 9. Risques
Faux positif, absence d’alerte, rétention insuffisante ou log sensible.

## 10. À maintenir à jour
Endpoints, tableaux de bord, seuils, contacts et dernières vérifications.

## 11. Historique des mises à jour
- `<Date>` : création après audit de supervision.
