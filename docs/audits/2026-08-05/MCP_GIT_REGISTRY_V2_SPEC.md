# GitRegistry v2 — spécification de gouvernance

## Objectif

GitRegistry v2 devient la source canonique pour relier :

- connexion GitHub durable
- dépôt découvert
- projet
- serveur
- chemin réel
- domaine
- branche officielle
- capacités autorisées
- migration de domaine ou de dépôt
- audit
- contexte conversationnel

## Structure racine

```json
{
  "schemaVersion": 2,
  "connections": [],
  "repositories": [],
  "mappings": [],
  "migrations": [],
  "auditEvents": [],
  "activeContext": null
}
```

## Cycle de vie

Dépôts :

- `discovered`
- `recognized`
- `ignored`
- `archived`

Mappings :

- `proposed`
- `path_verified`
- `validated`
- `active`
- `suspended`
- `migration_pending`
- `migration_completed`
- `archived`

Un dépôt découvert n'est jamais automatiquement administrable.

## Capacités par mapping

```json
{
  "inventory": true,
  "readFiles": true,
  "searchCode": true,
  "readLogs": true,
  "gitStatus": true,
  "writeFiles": false,
  "createBranch": false,
  "commit": false,
  "pushBranch": false,
  "build": false,
  "deploy": false,
  "rollback": false,
  "quarantine": false,
  "purge": false
}
```

Aucune capacité sensible n'est activée par défaut.

## Vérifications avant activation

- serveur autorisé
- racine autorisée
- `realpath` calculé
- absence de traversal
- absence de symlink sortant
- remote Git correspondant
- branche officielle existante
- domaine/vhost cohérent
- chemins protégés exclus
- absence de secret
- sauvegarde définie
- health checks définis
- rollback défini
- validation humaine
- événement d'audit

## Migration MCP

État attendu pendant la transition :

- dépôt source : `Patricked-code/MCP`
- dépôt actif : `Patricked-code/MCP`
- dépôt cible : `chainsolutions-wealthtech/MCP`
- statut : `migration_pending`

Les deux dépôts ne doivent jamais être simultanément déclarés actifs pour le même répertoire.

## Frontend

Le frontend doit gérer :

- comptes GitHub
- dépôts découverts
- mappings proposés et actifs
- vérification de chemin, remote et domaine
- capacités
- migrations
- suspension et archivage
- audit
- état serveur MCP
- disponibilité de l'app ChatGPT
- état de la connexion GitHub

Le frontend ne doit jamais écrire directement le JSON sans service de validation et d'audit.
