# Fondation GitRegistry v2 — lecture duale et dry-run

Date : 2026-08-05
Branche : `mcp/git-registry-v2-foundation-20260805`
Base : `main@097dac93715c0af83fcfad82cd598bacec956125`

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

Autorisées dans le candidat :

- inventaire ;
- lecture de fichiers ;
- recherche ;
- statut Git.

Désactivées :

- écriture ;
- création de branche ;
- commit ;
- push ;
- build ;
- déploiement ;
- rollback ;
- quarantaine ;
- purge.

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

La conversion trie les collections par identifiant et calcule un SHA-256 canonique.

Les tests vérifient :

- deux conversions v1 identiques produisent le même candidat ;
- relire un candidat v2 produit le même contenu ;
- le hash canonique reste stable ;
- les doublons sont rejetés ;
- une structure v1 invalide est rejetée.

## Hors périmètre

Cette PR n’implémente pas :

- l’écriture d’un candidat sur disque ;
- le backup ou le renommage atomique ;
- le rapprochement avec `data/github-accounts.json` ;
- la vérification SSH des realpaths ;
- la vérification des remotes Git ;
- la validation des domaines et vhosts ;
- l’activation de mappings ;
- le frontend CRUD ;
- les mutations d’audit v2 ;
- le remplacement du lecteur v1 existant.

Ces étapes doivent rester dans des PR indépendantes après revue de cette fondation.

## Garanties

- aucune modification de `main` directe ;
- aucun changement du registre actif ;
- aucun changement S1/S2 ;
- aucun déploiement ;
- aucun redémarrage ;
- aucune suppression ;
- aucun merge automatique.
