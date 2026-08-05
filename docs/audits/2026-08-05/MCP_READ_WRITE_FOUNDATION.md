# Fondation propre de séparation READ / WRITE

Date : 2026-08-05
Branche : `mcp/read-write-foundation-rebased-20260805`
Base : `main@26af37dee3abd0ba36d61b60e2674d78cf1bedbf`

## Objectif

Établir sur le `main` protégé la séparation des outils scoped réellement read-only et des mutations, sans reprendre les modules forensiques postérieurs au 29 juillet et sans perdre le diagnostic GitHub déjà fusionné.

## Changements

- création de `src/tools/registrationPolicy.ts` ;
- catalogues `READ_ONLY_SCOPED_TOOL_NAMES` et `WRITE_SCOPED_TOOL_NAMES` ;
- contrôle de disjonction ;
- séparation de `registerScopedReadOnlyTools()` et `registerScopedWriteTools()` ;
- enregistrement permanent des scoped READ dans le catalogue read-only global ;
- tests d’exactitude des catalogues et de non-exposition des mutations.

## Catalogue READ scoped

- `get_write_tools_context` ;
- `run_sql_readonly_s2` ;
- `git_status_project_s2`.

## Catalogue WRITE scoped

- `exec_repo_script_s2` ;
- `git_pull_project_s2` ;
- `deploy_project_s2` ;
- `deploy_brvm_s2` ;
- `mcp_sync_from_github_s1` ;
- `patch_mcp_code_file_s1` ;
- `mcp_typecheck_s1` ;
- `mcp_build_s1` ;
- `restart_mcp_bridge_s1`.

## Garanties

- aucun alias caché ;
- aucun module AMF, BRVMDATA, SADIAAF, Nigeria, Funds ou Vhosts importé depuis la branche forensique ;
- aucune mutation exposée par `registerReadOnlyTools()` ;
- `github_pr_authorization_diagnostic` reste exposé dans le catalogue read-only ;
- les mutations restent derrière `ENABLE_WRITE_TOOLS` dans `server.ts` ;
- aucun changement S1, Docker ou production.

## Hors périmètre

Cette fondation classe les mutations historiques déjà présentes dans `main`, mais ne valide pas encore leur comportement interne.

Les outils suivants nécessitent des durcissements séparés avant tout déploiement futur :

- `git_pull_project_s2` : retirer stash/rebase automatique et exiger un arbre propre ;
- `deploy_project_s2` / `deploy_brvm_s2` : séparer sync, installation, build, restart et health checks ;
- `exec_repo_script_s2` : introduire manifeste d’effets et `allow_write` explicite ;
- `mcp_typecheck_s1` / `mcp_build_s1` : utiliser `npm ci` et une copie isolée ;
- `restart_mcp_bridge_s1` : ne jamais reconstruire directement depuis un working tree sale.

## Relation avec les PR existantes

- PR #19 reste un snapshot forensique `DO NOT MERGE` ;
- PR #20 est supersédée ;
- PR #22 est conservée comme historique et remplacée par la reconstruction depuis le nouveau `main` ;
- GitRegistry v2 doit précéder l’activation de nouveaux chemins et projets.
