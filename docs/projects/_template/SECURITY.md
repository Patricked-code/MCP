# SECURITY.md — Modèle projet

## 1. Rôle du fichier
Définir les risques, accès et protections spécifiques au projet.

## 2. Objectif
Empêcher qu’une intervention contourne les règles globales de sécurité.

## 3. Périmètre
Repos, serveurs, domaines, données et intégrations du projet.

## 4. Source de vérité
Politiques validées, `.mcp/permissions.json` et état audité ; parent : `/SECURITY.md`.

## 5. Informations connues
Aucun secret ne doit être documenté en clair.

## 6. Informations à vérifier
Classification des données, acteurs, accès, rotation, journaux, alertes et incidents.

## 7. Règles applicables
Moindre privilège, masquage, branche/PR, approbation humaine et journalisation.

## 8. Procédures
Auditer avant action sensible ; isoler, tracer et escalader tout incident.

## 9. Risques
Fuite de secret, privilège excessif, domaine protégé ou log sensible.

## 10. À maintenir à jour
Matrice d’accès, risques, exceptions approuvées et preuves de revue.

## 11. Historique des mises à jour
- `<Date>` : création après audit sécurité.
