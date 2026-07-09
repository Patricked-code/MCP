# Cartographie fonctionnelle MCP

<!-- MCP-FUNCTIONAL-CARTOGRAPHY -->

## Cartographie fonctionnelle

MCP WealthTech SSH Bridge
- Diagnostic lecture
  - ping
  - get_project_context
  - check_disk_s1 / check_disk_s2
  - pm2_status_s1 / pm2_status_s2
  - docker_status_s1 / docker_status_s2
  - list_domains_s1 / list_domains_s2
  - list_large_files_s1 / list_large_files_s2
  - list_backups_s1 / list_backups_s2
  - curl_domain

- Auto-gestion MCP
  - mcp_bridge
  - mcp_git_status_s1
  - mcp_git_diff_s1
  - list_mcp_code_files_s1
  - read_mcp_code_file_s1
  - search_mcp_code_s1
  - scan_mcp_secrets_s1
  - mcp_container_logs_s1

- Écriture contrôlée MCP
  - patch_mcp_code_file_s1
  - mcp_typecheck_s1
  - mcp_build_s1
  - restart_mcp_bridge_s1

- Projets S2
  - get_write_tools_context
  - git_status_project_s2
  - git_pull_project_s2
  - deploy_project_s2
  - deploy_brvm_s2
  - exec_repo_script_s2

- Données
  - run_sql_readonly_s2

## Cartographie projets connus

MCP Bridge :
- serveur : S1
- chemin : /opt/apps/wealthtech-mcp-ssh-bridge
- repo : Patricked-code/MCP
- branche stable : main

API OPCVM :
- serveur : S2
- chemin : /var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api
- repo : Wealthtechinnovations/api_opcv
- branche serveur observée : claude/code-review-improvements-ikvuj
- état observé : DirtyCount supérieur à zéro, ne pas pull/merge/deploy avant audit.

Frontend OPCVM :
- serveur : S2
- chemin : /var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend
- repo : Wealthtechinnovations/front_end_opcvm
- branche serveur observée : claude/code-review-improvements-ikvuj
- état observé : propre lors du dernier audit MCP.

BRVM ChainSolution :
- serveur : S2
- chemin : /opt/apps/brvmchain/BRVMCHAINSOLUTION
- repo : Wealthtechinnovations/BRVMCHAINSOLUTION
- branche serveur observée : claude/migrate-from-gcp-Yr9qH
- état observé : fichiers non suivis dont .env, ne pas pull/merge/deploy avant audit.

## Cartographie de lecture à chaque connexion MCP

Ordre recommandé :

1. SUIVI.md
2. NO_REGRESSION_POLICY.md
3. SOURCE_OF_TRUTH.md
4. MCP_ANTI_DISPERSION_GOVERNANCE.md
5. MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
6. MCP_FUNCTIONAL_CARTOGRAPHY.md
7. MCP_CONNECTION_IDENTITY_MODEL.md
8. MCP_TOOLS.md
9. MCP_AGENT_RULES.md
10. .mcp/branch-governance.json
11. .mcp/function-cartography.json
12. .mcp/identity-policy.json
13. .mcp/permissions.json
14. .mcp/agents.json
15. .mcp/server-map.json
