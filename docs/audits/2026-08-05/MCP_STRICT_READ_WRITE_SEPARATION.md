# PR 2 — Séparation stricte lecture / écriture

Date : 2026-08-05

Statut : branche candidate, aucun déploiement.

## Objectifs

- remettre `curl_domain` en contrôle HTTPS uniquement ;
- retirer les alias magiques ;
- exposer des outils AMF et BRVMDATA explicites ;
- rendre les diagnostics indépendants de `ENABLE_WRITE_TOOLS` ;
- empêcher l’enregistrement des outils de mutation en mode read-only ;
- conserver les fonctions Nigeria, SADIAAF, Legacy Funds et Legacy Vhosts ;
- ajouter des tests de classification ;
- ne redémarrer ni déployer la production.

## Architecture introduite

`registrationPolicy.ts` contient deux catalogues disjoints :

- `READ_ONLY_SCOPED_TOOL_NAMES` ;
- `WRITE_SCOPED_TOOL_NAMES`.

`filterToolRegistrations()` filtre les enregistrements au moment de la construction du serveur MCP.

Les modules historiques restent présents pour limiter les régressions, mais leurs outils ne sont plus exposés dans le mauvais mode.

## Alias remplacés

- `amfinfo` → `amf_registry_native_info` ;
- `amfchunk-*` → `amf_registry_native_chunk` ;
- `amfcore0` / `amfcore1` → `amf_registry_core_chunk` ;
- `amfhex-*` → outils `amf_public_*` ;
- `amfgrep-*` → `amf_public_search_bundle` ;
- `amfexport` → `amf_registry_native_export` ;
- `brvmdatapreflight` → `brvmdata_amf_preflight` ;
- `brvmdatapush` → `brvmdata_amf_push_branch`.

## Hors périmètre

- aucun déploiement ;
- aucun redémarrage ;
- aucun merge ;
- aucune migration Registry V2 ;
- aucun frontend Cockpit ;
- aucune suppression de fonction ;
- aucune modification de secret.
