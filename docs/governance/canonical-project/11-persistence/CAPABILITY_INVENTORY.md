# L11 — Index des comptes GitHub et des fonctionnalités MCP existantes

[← Persistance S1](S1_GITHUB_INDEXATION.md) · [Autorisation](../10-orchestration/AUTHORIZATION_CONTRACT.md)

## Compte GitHub ≠ projet ≠ connexion MCP

Le catalogue ci-dessous **référence des fonctions existantes**, pas une liste figée des comptes de l'utilisateur. Un compte ou une GitHub App doit être découvert dans le cadre du principal connecté. Les outils cités ne deviennent pas automatiquement utilisables pour un autre agent.

| Domaine | Entrée existante | Résultat à indexer (si autorisé) |
| --- | --- | --- |
| Identités et comptes | `github_account_inventory` | Comptes accessibles, provenance et fraîcheur |
| Statut durable des comptes | `github_durable_accounts_status` et `github_durable_accounts_inventory` | Statut et métadonnées contrôlées, pas de credentials |
| Organisations | `github_org_inventory` | Organisations / accès observés |
| GitRegistry | `github_registry_v2_dry_run` | Mappings et readiness V2, sans activation |
| Références du dépôt | `github_get_repository_state`, `github_get_tree`, `github_get_branch_state` | Branche/SHA/permissions observées |
| CI / revues | `github_get_commit_checks`, `github_get_workflow_runs`, `github_get_pull_request_reviews` | Runs et gates exact-head |
| Inventaire MCP | `mcp_get_current_state_inventory` | Contrats outils/ressources, version/digest |
| Runtime | `mcp_get_live_state` | Révision S1, image, santé, alignement |
| Sessions | `mcp_list_governed_sessions`, `mcp_get_governed_session` | Informations visibles selon le contexte |
| Queue | `mcp_get_work_queue` | Tâches visibles et ownership, pas de claim |
| Point de reprise | `mcp_e2_list_continuities` et lecteurs d'index existants | Continuities E2 sous leurs règles propres |

## Règles

1. L'ID de projet **n'agrège pas automatiquement les permissions de plusieurs connexions** ; chaque observation est liée à la source et au principal effectif.
2. Les outils « présents dans le catalogue » ne sont pas nécessairement « autorisés maintenant ».
3. Les nombres de comptes, repos, outils et ressources sont **dynamiques** ; leur version doit être datée. Ne pas figer les comptes actuels dans un manifeste versionné.
4. Une mauvaise correspondance repo/source/serveur n'est pas corrigée par sélection arbitraire d'un alias.
5. Ne pas stocker de secrets d'installation, jetons GitHub App ou liens internes sensibles dans l'index Markdown.
6. La disponibilité d'une fonction ne constitue pas une autorisation de mutation.
