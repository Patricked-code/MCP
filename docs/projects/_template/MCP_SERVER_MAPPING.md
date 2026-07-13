# MCP_SERVER_MAPPING.md — Modèle projet

## 1. Rôle du fichier
Relier un dépôt vérifié à son emplacement serveur.

## 2. Objectif
Éviter toute action sur le mauvais serveur, chemin ou domaine.

## 3. Périmètre
Repo : `<À vérifier>` ; serveur : `<À vérifier>` ; chemin : `<À vérifier>`.

## 4. Source de vérité
État serveur, Git remote et registre global ; parent : `/MCP_SERVER_MAPPING.md`.

## 5. Informations connues
Aucun mapping n’est valide tant que GitHub et serveur ne concordent pas.

## 6. Informations à vérifier
Domaine, stack, mode de déploiement, commandes, logs, services et protections.

## 7. Règles applicables
Ne jamais inscrire de credential ; une divergence bloque le déploiement.

## 8. Procédures
Vérifier repo/branche/SHA des deux côtés, puis enregistrer et dater le mapping.

## 9. Risques
Confusion S1/S2, chemin historique, domaine protégé ou commande non testée.

## 10. À maintenir à jour
SHA, branche, chemins, domaines, services, logs et dernière vérification.

## 11. Historique des mises à jour
- `<Date>` : mapping initial vérifié.
