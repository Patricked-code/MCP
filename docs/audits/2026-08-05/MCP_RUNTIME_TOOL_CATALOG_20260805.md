# Catalogue MCP observé — 5 août 2026

Outils exposés par le connecteur actuellement observé :
- `check_disk_s1`
- `check_disk_s2`
- `curl_domain`
- `deploy_brvm_s2`
- `deploy_project_s2`
- `docker_status_s1`
- `docker_status_s2`
- `exec_repo_script_s2`
- `get_project_context`
- `get_write_tools_context`
- `git_pull_project_s2`
- `git_status_project_s2`
- `list_backups_s1`
- `list_backups_s2`
- `list_domains_s1`
- `list_domains_s2`
- `list_large_files_s1`
- `list_large_files_s2`
- `list_mcp_code_files_s1`
- `mcp_bridge`
- `mcp_build_s1`
- `mcp_container_logs_s1`
- `mcp_git_diff_s1`
- `mcp_git_status_s1`
- `mcp_typecheck_s1`
- `patch_mcp_code_file_s1`
- `ping`
- `pm2_status_s1`
- `pm2_status_s2`
- `read_mcp_code_file_s1`
- `restart_mcp_bridge_s1`
- `run_sql_readonly_s2`
- `scan_mcp_secrets_s1`
- `search_mcp_code_s1`

## Écart à vérifier

Le code récupéré contient aussi des enregistrements AMF-UMOA, Nigeria, SADIAAF et Legacy Funds.
La PR 2 devra vérifier leur exposition réelle, leur classification et leur dépendance aux outils d’écriture.
