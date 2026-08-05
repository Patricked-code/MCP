# Specification GitRegistry v2 - audit 2026-08-05

Statut: specification documentaire uniquement.
Aucun changement runtime, build, restart, deploiement ou suppression.

## 1. Objectif

GitRegistry v2 devient la source canonique pour relier:

- compte GitHub;
- depot;
- projet;
- serveur;
- chemin reel;
- domaine;
- branche officielle;
- capacites;
- migration;
- audit;
- provenance runtime.

Aucun module TypeScript ne doit ajouter un chemin ou une permission qui n'existe pas dans le registre valide.

## 2. Structure racine

```json
{
  "schemaVersion": 2,
  "updatedAt": "ISO-8601",
  "connections": [],
  "repositories": [],
  "mappings": [],
  "migrations": [],
  "auditEvents": [],
  "activeContext": null
}
```

## 3. Connections

```json
{
  "connectionId": "github:chainsolutions-wealthtech",
  "provider": "github",
  "accountLogin": "chainsolutions-wealthtech",
  "accountType": "organization",
  "role": "target",
  "status": "validated",
  "durable": true,
  "credentialRef": "/app/secrets/github_token",
  "credentialsInRegistry": false,
  "lastValidatedAt": "ISO-8601",
  "autoRestoreContext": true
}
```

Regles:

- aucun token dans le registre;
- credentialRef limite a /app/secrets/*;
- une perte temporaire de l'app ChatGPT ne supprime pas la connexion;
- validation GitHub reelle separee du statut configure localement.

## 4. Repositories

```json
{
  "repositoryId": "github:chainsolutions-wealthtech/Openfunds",
  "owner": "chainsolutions-wealthtech",
  "name": "Openfunds",
  "fullName": "chainsolutions-wealthtech/Openfunds",
  "visibility": "private",
  "defaultBranch": "main",
  "archived": false,
  "fork": false,
  "discoveryStatus": "discovered",
  "discoveredAt": "ISO-8601",
  "lastSeenAt": "ISO-8601"
}
```

Un depot decouvert n'est jamais un mapping actif.

## 5. Mappings

```json
{
  "mappingId": "openfunds-s2-production",
  "projectId": "openfunds",
  "repositoryId": "github:chainsolutions-wealthtech/Openfunds",
  "sourceRepositoryId": null,
  "targetRepositoryId": null,
  "activeRepositoryId": "github:chainsolutions-wealthtech/Openfunds",
  "serverId": "s2",
  "serverPath": null,
  "realPath": null,
  "realPathVerified": false,
  "remoteVerified": false,
  "domain": null,
  "domainVerified": false,
  "environment": "production",
  "officialBranch": "main",
  "allowedBranchPrefixes": ["mcp/", "feature/", "fix/"],
  "directMainPush": false,
  "status": "proposed",
  "capabilities": {
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
  },
  "backupRequired": true,
  "healthChecks": [],
  "rollbackMethod": null,
  "createdAt": "ISO-8601",
  "validatedAt": null,
  "activatedAt": null,
  "updatedAt": "ISO-8601"
}
```

## 6. Statuts autorises

Repositories:

- discovered;
- ignored;
- recognized;
- archived.

Mappings:

- proposed;
- path_verified;
- validated;
- active;
- suspended;
- migration_pending;
- migration_completed;
- archived.

Transitions:

```text
discovered repository
  -> proposed mapping
  -> path_verified
  -> validated
  -> active
```

Un mapping active peut devenir suspended ou archived sans perte d'historique.

## 7. Verifications obligatoires

Avant `path_verified`:

1. serveur autorise;
2. chemin sous une racine autorisee;
3. realpath calcule;
4. absence de traversal;
5. absence de symlink sortant;
6. remote Git correspondant;
7. branche officielle existante;
8. domaine correspondant au vhost attendu;
9. chemins proteges exclus;
10. absence de secret.

Avant `active`:

1. validation humaine;
2. capacites explicites;
3. politique de sauvegarde;
4. health checks;
5. rollback;
6. niveau de risque;
7. evenement d'audit.

## 8. Migrations de domaines

```json
{
  "migrationId": "sadiaaf-frontend-replacement",
  "mappingId": "sadiaaf-frontend-s1-production",
  "domain": "sadiaaf.wealthtechinnovations.com",
  "currentRepositoryId": null,
  "replacementRepositoryId": null,
  "targetCommit": null,
  "status": "inventory_pending",
  "preserve": ["plesk_root", "tls", "database"],
  "quarantineRequired": true,
  "purgeAllowed": false,
  "backupManifestId": null,
  "rollbackReleaseId": null,
  "healthChecks": [],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Statuts possibles:

- inventory_pending;
- source_verified;
- replacement_verified;
- staging_ready;
- backup_ready;
- deployment_ready;
- deployed;
- validated;
- rollback;
- quarantine_retention;
- migration_completed.

La purge n'est possible qu'apres `validated`, retention terminee et sauvegarde verifiee.

## 9. Audit events

Chaque mutation ajoute un evenement immutable:

```json
{
  "eventId": "uuid",
  "at": "ISO-8601",
  "actor": "identity",
  "tool": "frontend|mcp|operator",
  "type": "mapping.activated",
  "objectId": "mappingId",
  "reason": "texte obligatoire",
  "risk": "low|medium|high|critical",
  "beforeHash": "sha256",
  "afterHash": "sha256",
  "result": "success|rejected|failed"
}
```

Les evenements ne sont jamais modifies. Une correction produit un nouvel evenement.

## 10. Migration v1 vers v2

La migration doit etre non destructive.

Regles:

1. sauvegarder `mcp-git-registry.json`;
2. valider le JSON v1;
3. convertir les comptes en `connections`;
4. convertir chaque depot unique en `repositories`;
5. convertir chaque `repoMapping` en mapping v2;
6. marquer les mappings existants `proposed` sauf preuve de validation;
7. conserver `deployEnabled=false` par defaut;
8. ne jamais inventer `realPathVerified=true`;
9. conserver les anciens auditEvents;
10. ecrire dans un nouveau fichier temporaire;
11. valider le schema v2;
12. comparer le diff;
13. remplacer atomiquement;
14. conserver le backup et le hash.

Cas MCP actuel:

- `Patricked-code/MCP` est le depot actif observe;
- `chainsolutions-wealthtech/MCP` est la cible de migration;
- les deux mappings ne doivent plus etre consideres simultanement actifs;
- le statut exact doit rester `migration_pending` jusqu'a migration validee.

## 11. Frontend

Le frontend doit proposer:

- liste des connexions;
- liste des depots decouverts;
- creation d'un mapping propose;
- verification chemin/remote/domaine;
- validation;
- activation;
- suspension;
- archivage;
- edition des capacites;
- migrations de domaines;
- audit.

Aucune route frontend ne doit ecrire directement le JSON sans passer par service de validation et audit.

## 12. API cible

```text
GET    /api/admin/connections
GET    /api/admin/repositories
GET    /api/admin/mappings
POST   /api/admin/mappings
POST   /api/admin/mappings/:id/verify
POST   /api/admin/mappings/:id/validate
POST   /api/admin/mappings/:id/activate
POST   /api/admin/mappings/:id/suspend
PATCH  /api/admin/mappings/:id/capabilities
GET    /api/admin/migrations
POST   /api/admin/migrations
GET    /api/admin/audit-events
```

## 13. Securite

- CSRF obligatoire;
- reauthentification pour write/deploy/destructive;
- validation serveur de toutes les valeurs;
- aucun chemin libre hors registre;
- aucun push direct main/master;
- aucune purge sans manifeste;
- aucun depot GitHub supprime pendant migration;
- aucune racine Plesk supprimee;
- destruction globalement desactivee par defaut.

## 14. Tests requis

- migration v1 vers v2;
- idempotence;
- rejet d'un schema invalide;
- rejet d'un secret;
- rejet path traversal;
- rejet symlink sortant;
- rejet remote incoherent;
- rejet activation sans validation;
- rejet deploy sans rollback;
- rejet purge sans manifeste;
- conservation des auditEvents;
- absence de regression sur les mappings v1.

## 15. Etat

- specification locale: oui;
- implementation: non;
- migration executee: non;
- runtime modifie: non;
- commit: non;
- push: non.
