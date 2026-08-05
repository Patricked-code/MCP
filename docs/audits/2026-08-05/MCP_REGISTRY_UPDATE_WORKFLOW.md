# Procédure officielle de mise à jour du registre MCP — version réparée

Date : 2026-08-05
Statut : documentation et procédure uniquement
Effet runtime : aucun

## 1. Provenance

Cette version remplace la partie illisible de l’ancien document.
L’original est conservé sous :

`MCP_REGISTRY_UPDATE_WORKFLOW.corrupted-original.md`

Cette reconstruction repose uniquement sur :

- `MCP_GIT_REGISTRY_V2_SPEC.md` ;
- `MCP_PRE29_RECOVERY_AUDIT.md` ;
- `MCP_REGISTRY_UPDATE_SUMMARY.md` ;
- `SOURCE_OF_TRUTH.md` ;
- les registres `.mcp/*.json` et `data/*.json`.

## 2. Règles permanentes

1. Un dépôt découvert reste en lecture seule.
2. Un dossier découvert n’est pas automatiquement autorisé.
3. Un mapping doit suivre : discovered → proposed → path_verified → validated → active.
4. Seul un mapping active peut autoriser une écriture.
5. Les branches main et master ne reçoivent aucun push direct.
6. Lecture, écriture, build, déploiement, rollback, quarantaine et purge sont séparés.
7. Les secrets restent exclusivement hors Git.
8. Toute mutation produit un événement d’audit.

## 3. Mise à jour du registre

1. Sauvegarder le registre existant.
2. Calculer son hash SHA-256.
3. Valider le schéma source.
4. Écrire la nouvelle version dans un fichier temporaire.
5. Valider le schéma V2.
6. Comparer l’ancien et le nouveau registre.
7. Refuser toute perte de mapping ou d’événement d’audit.
8. Remplacer le fichier de manière atomique.
9. Conserver le backup et les deux hashes.
10. Ajouter un événement d’audit immuable.

## 4. Vérification d’un mapping

Avant path_verified, vérifier :

- le serveur ;
- la racine autorisée ;
- le realpath ;
- l’absence de traversal ;
- l’absence de symlink sortant ;
- le remote Git ;
- la branche officielle ;
- le domaine ;
- les chemins protégés ;
- l’absence de secret ;
- le commit et l’état Git.

## 5. Activation

Avant active, exiger :

- validation humaine ;
- capacités explicites ;
- sauvegarde ;
- health checks ;
- rollback ;
- niveau de risque ;
- événement d’audit.

## 6. Interdictions

- aucun shell libre ;
- aucun chemin arbitraire ;
- aucune permission implicite ;
- aucune activation automatique après découverte ;
- aucune suppression de dépôt GitHub pendant une migration ;
- aucune suppression de racine Plesk ;
- aucune purge sans rétention, manifeste et validation humaine.

## 7. État de mise en œuvre

- spécification : disponible ;
- migration V1 → V2 : non exécutée ;
- frontend CRUD : non implémenté ;
- runtime modifié par ce document : non.
