import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const READ_ONLY_SCOPED_TOOL_NAMES = new Set<string>([
  'get_write_tools_context',
  'run_sql_readonly_s2',
  'brvm_run_sql_readonly_s2',
  'brvm_container_logs_s2',
  'git_status_project_s2',

  'amf_registry_native_info',
  'amf_registry_native_chunk',
  'amf_registry_core_chunk',
  'amf_public_main_size',
  'amf_public_main_slice',
  'amf_public_fetch_path',
  'amf_public_search_bundle',

  'brvmdata_amf_preflight',

  'inspect_sadiaaf_s1',
  'sadiaaf_status_s1',
  'sadiaaf_projects_context_s1',
  'sadiaaf_git_status_s1',
  'sadiaaf_list_files_s1',
  'sadiaaf_read_file_s1',
  'sadiaaf_search_code_s1',
  'sadiaaf_git_diff_s1',

  'legacy_funds_frontend_status_s2',
  'legacy_funds_api_status_s2',
  'logs_legacy_funds_frontend_s2',
  'logs_legacy_funds_api_s2',

  'legacy_vhosts_context_s1',
  'legacy_vhost_inventory_s1',
  'legacy_vhost_read_file_s1',
  'legacy_vhost_search_s1',
  'legacy_vhost_git_status_s1',

  'nigeria_project_status_s2'
]);

export const WRITE_SCOPED_TOOL_NAMES = new Set<string>([
  'exec_repo_script_s2',
  'git_pull_project_s2',
  'deploy_project_s2',
  'deploy_brvm_s2',

  'mcp_sync_from_github_s1',
  'patch_mcp_code_file_s1',
  'mcp_typecheck_s1',
  'mcp_build_s1',
  'restart_mcp_bridge_s1',

  'amf_registry_native_export',
  'amf_registry_publish_download',

  'brvmdata_amf_push_branch',

  'deploy_sadiaaf_s1',
  'rollback_sadiaaf_s1',
  'sadiaaf_patch_file_s1',
  'sadiaaf_quality_s1',
  'sadiaaf_prepare_branch_s1',
  'sadiaaf_commit_push_s1',
  'sadiaaf_deploy_s1',
  'sadiaaf_quarantine_contents_s1',
  'sadiaaf_restore_quarantine_s1',

  'legacy_funds_frontend_build_s2',
  'legacy_funds_api_test_s2',
  'restart_legacy_funds_frontend_s2',
  'restart_legacy_funds_api_s2',

  'legacy_vhost_write_file_s1',
  'legacy_vhost_delete_path_s1',
  'legacy_vhost_git_init_s1',
  'legacy_vhost_commit_push_s1',
  'legacy_vhost_quality_s1',
  'legacy_vhost_deploy_s1',
  'legacy_vhost_purge_s1',

  'nigeria_bootstrap_s2',
  'nigeria_patch_file_s2',
  'nigeria_commit_push_s2',
  'nigeria_deploy_s2'
]);

export function filterToolRegistrations(
  server: McpServer,
  allowedNames: ReadonlySet<string>
): McpServer {
  return new Proxy(server, {
    get(target, property, receiver) {
      if (property !== 'tool') {
        const value = Reflect.get(target, property, receiver);

        return typeof value === 'function'
          ? value.bind(target)
          : value;
      }

      const register = target.tool as unknown as (
        name: string,
        ...args: unknown[]
      ) => unknown;

      return ((
        name: string,
        ...args: unknown[]
      ) => {
        if (!allowedNames.has(name)) {
          return undefined;
        }

        return register.call(target, name, ...args);
      }) as McpServer['tool'];
    }
  });
}
