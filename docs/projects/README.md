# Documentation des projets intégrés

## 1. Rôle du fichier

Définir la structure enfant des projets reliés au MCP sans créer de faux états d’intégration.

## 2. Objectif

Chaque dossier `docs/projects/<slug>/` applique les règles globales de la racine à un seul projet vérifié.

## 3. Périmètre

Ce dossier contient un modèle `_template/` et, après audit, un dossier par projet réellement intégré.

## 4. Source de vérité

Les fichiers racine restent parents. Les fichiers enfants précisent l’application au projet sans contredire `SOURCE_OF_TRUTH.md`, `.mcp/` ou les registres MCP.

## 5. Informations connues

Les noms `brvmchain`, `wealthtech`, `evote`, `evaluations` et `stablecoin` apparaissent dans la documentation historique comme candidats. Leur intégration n’est pas confirmée par la seule présence de ces noms.

## 6. Informations à vérifier

Avant de créer un dossier réel : owner/repo, branche officielle, serveur, chemin, domaine, stack, déploiement, données, crons, logs, tests, agents, permissions et point de reprise.

## 7. Règles applicables

- copier `_template/`, puis remplacer toutes les balises `<À vérifier>` ;
- ne jamais recopier un secret, une clé, un token ou une valeur `.env` ;
- conserver et fusionner la documentation déjà présente dans le dépôt projet ;
- inscrire l’onboarding dans les trois registres MCP et dans `SUIVI.md` ;
- ne pas marquer un onboarding terminé tant que les preuves GitHub et serveur manquent.

## 8. Procédure

1. Auditer le projet en lecture seule.
2. Ouvrir une tâche dans `TASKS.md`.
3. Copier `_template/` vers le slug validé.
4. Consolider les documents existants.
5. Mettre à jour les registres globaux.
6. Vérifier les liens et le statut Git.
7. Ouvrir une PR dédiée.

## 9. Risques

Doublon documentaire, mauvais mapping serveur, nom de projet ambigu, branche incorrecte et information historique présentée comme actuelle.

## 10. À maintenir à jour

Le modèle, la liste des projets vérifiés et les règles d’héritage doivent évoluer avec `MCP_ONBOARDING_ENGINE.md`.

## 11. Historique des mises à jour

- 2026-07-13 : création du hub et du modèle projet après audit du dépôt MCP.
