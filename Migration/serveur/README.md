# Serveur

Ce repertoire decrit les liens entre GitHub et les environnements serveur sans exposer de secrets.

Il peut contenir:

- des mappings repo vers dossier serveur;
- des noms de services ou domaines publics;
- des procedures de verification;
- des notes d audit;
- des statuts de synchronisation.

Il ne doit pas contenir de cle SSH, mot de passe, token, fichier `.env` reel, dump, ou inventaire serveur brut trop sensible.

## Cartes d inventaire prive

- `PRIVATE_SERVER_INVENTORY_TASK_CARDS.json` : templates generes pour l inventaire prive S1/S2, les migrations S2 vers S1, les gates rollback/test et l approbation operateur.
- `PRIVATE_SERVER_INVENTORY_TASK_CARDS.md` : synthese lisible des cartes pretes et bloquees.

Ces cartes ne sont pas des autorisations d action production. Elles definissent les preuves privees requises avant toute suppression, migration, modification de vhost, arret de service ou nettoyage.
