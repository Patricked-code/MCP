# Manuel détaillé fonctions et outils MCP

<!-- MCP-FUNCTIONS-TOOLS-MANUAL -->

## Objectif

Ce manuel décrit les fonctions, outils, processus et modes d’utilisation du MCP WealthTech SSH Bridge.

Il doit être lu par tout agent connecté au MCP avant une action structurante.

## Ce que le MCP est

Le MCP est un bridge SSH contrôlé entre les agents IA, GitHub, les serveurs S1/S2, les projets, les branches, les PR, les audits et la documentation.

Le MCP n’est pas un shell libre.

Le MCP fonctionne en mode read-only-first.

Les écritures sont limitées à des outils scoped-write et exigent une validation explicite.

## Ce que le MCP connaît

- serveur S1 : serveur principal, destination, héberge le MCP ;
- serveur S2 : serveur source, migration, projets applicatifs ;
- dépôt MCP : Patricked-code/MCP ;
- dossier MCP : /opt/apps/wealthtech-mcp-ssh-bridge ;
- conteneur Docker MCP : wealthtech_mcp_ssh_bridge ;
- domaine public : mcp.wealthtechinnovations.com ;
- projets S2 autorisés : api_opcv, front_end_opcvm, brvmchainsolution ;
- domaines protégés S1 et S2 ;
- fichiers sensibles à bloquer ;
- fichiers .mcp ;
- fichiers Markdown de gouvernance ;
- outils read-only ;
- outils write-scoped ;
- outils SQL SELECT uniquement.

## Git/GitHub Control Plane

La couverture cible Git/GitHub est inventoriée dans `.mcp/git-github-capabilities.json`. Le manifeste classe les capacités et leurs risques mais ne crée aucune autorisation.

Première vague candidate READ :
- `github_get_repository_state`
- `github_get_branch_state`
- `github_get_commit_state`
- `github_compare_refs`
- `github_get_pull_request_state`
- `github_get_pull_request_reviews`
- `github_get_commit_checks`
- `github_get_workflow_runs`
- `github_get_rulesets`
- `github_get_webhooks`
- `github_get_releases`
- `github_get_deployments`

Toutes ces projections sont assainies et bornées à l'organisation configurée. Les capacités WRITE/ADMIN prévues restent non livrées tant que leur lot dédié n'a pas passé TDD, revue, merge et déploiement gouvernés.

### Lifecycle GitHub candidat

La vague lifecycle ajoute les lectures `github_get_commits`, `github_get_commit_diff`, `github_get_tree`, `github_get_review_threads`, `github_get_mergeability` et `github_get_required_checks`.

Les mutations candidates sont `github_create_branch`, `github_delete_branch`, `github_create_commit`, `github_create_or_update_file`, `github_delete_file`, `github_create_pull_request`, `github_update_pull_request`, `github_mark_pr_ready`, `github_request_review`, `github_reply_review_thread`, `github_resolve_review_thread` et `github_merge_pull_request`. Elles restent indisponibles en runtime tant que leur chaîne gouvernée de merge/déploiement n'est pas terminée.

## Outils read-only

ping : vérifie que le MCP répond.

get_project_context : retourne les serveurs, labels, hosts et domaines protégés.

mcp_bridge : retourne la fiche du MCP auto-gérable.

mcp_git_status_s1 : vérifie l’état Git du MCP sur S1.

mcp_git_diff_s1 : affiche le diff MCP avec masquage des secrets.

list_mcp_code_files_s1 : liste les fichiers utiles du MCP hors secrets.

read_mcp_code_file_s1 : lit un fichier autorisé avec masquage.

search_mcp_code_s1 : recherche un terme dans code et documentation.

mcp_container_logs_s1 : affiche les logs Docker MCP masqués.

docker_status_s1 et docker_status_s2 : affichent les conteneurs actifs.

pm2_status_s1 et pm2_status_s2 : affichent PM2.

check_disk_s1 et check_disk_s2 : affichent df -h.

list_domains_s1 et list_domains_s2 : inventorient les domaines Plesk.

list_large_files_s1 et list_large_files_s2 : listent les gros fichiers sans suppression.

list_backups_s1 et list_backups_s2 : listent les sauvegardes sans suppression.

curl_domain : fait un curl HTTPS HEAD sur un domaine validé.

## Outils write-scoped

patch_mcp_code_file_s1 : écrit ou remplace un fichier texte autorisé du MCP via contenu base64. Ne doit pas être utilisé sur secrets.

mcp_typecheck_s1 : lance le typecheck TypeScript via Docker Node 20 avec allow_write.

mcp_build_s1 : lance le build MCP via Docker Node 20 avec allow_write.

restart_mcp_bridge_s1 : redémarre le conteneur MCP après validation.

github_create_repository : crée uniquement un dépôt GitHub privé et vide dans l’organisation configurée du MCP. L’outil est scoped-write, n’accepte aucune autre organisation, est idempotent si le dépôt privé existe déjà et exige un verdict gouverné `shadow_ready` avant toute mutation. Il ne crée ni GitHub App, ni webhook, ni ruleset, ni secret et ne transforme jamais une permission technique en autorisation de gouvernance.

## Outils projet S2

get_write_tools_context : liste les projets et opérations d’écriture contrôlées.

git_status_project_s2 : affiche l’état Git d’un projet S2 autorisé.

git_pull_project_s2 : pull contrôlé avec stash, rebase et restauration du stash.

deploy_project_s2 : déploie un projet autorisé avec recette contrôlée.

deploy_brvm_s2 : déploie BRVM ChainSolution.

exec_repo_script_s2 : exécute uniquement scripts/*.js ou scripts/*.ts autorisés.

run_sql_readonly_s2 : exécute uniquement des SELECT sur la base OPCVM S2.

## Ce que le MCP bloque

- shell libre ;
- secrets ;
- .env ;
- clés privées ;
- fichiers .pem, .key, .p12, .crt ;
- dumps .sql, .dump ;
- node_modules, .git, dist, build, coverage ;
- chemins absolus ou contenant .. ;
- SQL destructif ;
- suppression non documentée ;
- écriture directe sur main ou master ;
- action production non validée.

## Base de données

Le MCP lui-même n’a pas de base applicative centrale documentée.

Il possède des fichiers de registre JSON dans data/, des fichiers .mcp/, des fichiers memory/, des rapports docs/reports/ et des logs Docker.

Il possède aussi un accès SQL limité en lecture seule vers la base OPCVM S2 via run_sql_readonly_s2.

## Mode d’utilisation intelligent

Avant chaque action :

1. identifier dépôt ;
2. identifier branche ;
3. identifier serveur ;
4. identifier projet ;
5. lire SUIVI.md ;
6. vérifier DirtyCount ;
7. choisir outil read-only si possible ;
8. évaluer risque ;
9. créer branche mcp/* si écriture ;
10. tester ;
11. documenter ;
12. pousser branche ;
13. ouvrir PR draft ;
14. revenir serveur sur main.

## À ne jamais faire

- agir à l’aveugle ;
- supposer une synchronisation GitHub/serveur ;
- modifier main directement ;
- supprimer sans inventaire ;
- déployer sans tests ;
- exposer un secret ;
- nettoyer globalement S2 ;
- toucher aux branches Claude sans audit.
