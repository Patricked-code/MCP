# Fondation GitRegistry v2 — lecture duale et dry-run

Date : 2026-08-05
Branche : `mcp/git-registry-v2-foundation-rebased-20260805`
Base : `main@c4958d97ff67dbf4352b8a1f9c2716fe9cf25d7b`

## Objectif

Créer une fondation pure et testable pour convertir GitRegistry v1 vers v2 sans modifier le fichier actif, les remotes Git, les chemins serveurs, Docker ou la production.

## Composants

- `src/github/registryV2.ts` : schémas Zod v1/v2, validation, migration déterministe et rapport dry-run ;
- `src/tools/githubRegistryV2.ts` : outil MCP read-only `github_registry_v2_dry_run` ;
- `tests/gitRegistryV2.test.ts` : tests du registre réel de `main` ;
- enregistrement de l’outil dans `src/tools/readOnly.ts` ;
- documentation dans `MCP_TOOLS.md`.

## Conversion du registre actuel

Le dry-run attendu sur `data/mcp-git-registry.json` produit :

- 3 connexions ;
- 3 dépôts uniques ;
- 2 mappings ;
- 1 migration ;
- 2 événements historiques.

Les deux entrées v1 du MCP sont consolidées en un mapping :

```text
mappingId               : mcp-s1-production
sourceRepositoryId      : github:Patricked-code/MCP
targetRepositoryId      : github:chainsolutions-wealthtech/MCP
activeRepositoryId      : github:Patricked-code/MCP
status                  : migration_pending
realPathVerified        : false
remoteVerified          : false
```

Le mapping Civitech reste `proposed` et ne reçoit aucune capacité sensible.

## Capacités par défaut

Autorisées dans le candidat : inventaire, lecture de fichiers, recherche et statut Git.

Désactivées : écriture, création de branche, commit, push, build, déploiement, rollback, quarantaine et purge.

## Sécurité

- aucun credential copié depuis le registre v1 ;
- `credentialRef` reste `null` dans cette phase ;
- aucun token lu depuis `/app/secrets` ;
- rejet des signaux de credential dans le candidat ;
- identifiants uniques obligatoires ;
- aucun chemin déclaré vérifié sans preuve ;
- aucun mapping activé automatiquement ;
- migration MCP laissée `migration_pending` ;
- candidat produit uniquement en mémoire.

## Déterminisme et idempotence

La conversion trie les collections par identifiant et calcule un SHA-256 canonique. Les tests vérifient deux conversions identiques, la relecture d’un candidat v2, la stabilité du hash, le rejet des doublons, des credentials et d’une structure v1 invalide.

## Hors périmètre

Cette fondation n’implémente pas l’écriture sur disque, le backup ou renommage atomique, le rapprochement avec `data/github-accounts.json`, la vérification SSH des realpaths et remotes, la validation des domaines, l’activation de mappings, le frontend CRUD, les mutations d’audit v2 ni le remplacement du lecteur v1.

## Relation avec les PR

- PR #23 est conservée comme historique et remplacée par cette reconstruction depuis le `main` protégé ;
- les fondations diagnostic GitHub et séparation READ/WRITE restent présentes ;
- aucune action serveur n’est exécutée par cette PR.

## Garanties

- aucun changement du registre actif ;
- aucun changement S1/S2 ;
- aucun déploiement ;
- aucun redémarrage ;
- aucune suppression ;
- fusion uniquement après CI verte et SHA verrouillé.
