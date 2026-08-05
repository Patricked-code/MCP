export const READ_ONLY_SCOPED_TOOL_NAMES = new Set<string>([
  'get_write_tools_context',
  'run_sql_readonly_s2',
  'git_status_project_s2'
]);

// Catalogue de la surface scoped enregistrée uniquement lorsque
// ENABLE_WRITE_TOOLS=true. Il inclut les opérations de lecture
// volontairement réservées au mode opérationnel contrôlé.
export const WRITE_SCOPED_TOOL_NAMES = new Set<string>([
  'amf_registry_native_chunk',
  'amf_registry_native_export',
  'amf_registry_native_info',
  'amf_registry_publish_download',
  'brvm_container_logs_s2',
  'brvm_run_sql_readonly_s2',
  'deploy_brvm_s2',
  'deploy_project_s2',
  'exec_repo_script_s2',
  'git_pull_project_s2',
  'legacy_vhost_commit_push_s1',
  'legacy_vhost_delete_path_s1',
  'legacy_vhost_deploy_s1',
  'legacy_vhost_git_init_s1',
  'legacy_vhost_git_status_s1',
  'legacy_vhost_inventory_s1',
  'legacy_vhost_purge_s1',
  'legacy_vhost_quality_s1',
  'legacy_vhost_read_file_s1',
  'legacy_vhost_search_s1',
  'legacy_vhost_write_file_s1',
  'legacy_vhosts_context_s1',
  'mcp_build_s1',
  'mcp_sync_from_github_s1',
  'mcp_typecheck_s1',
  'patch_mcp_code_file_s1',
  'restart_mcp_bridge_s1',
  'sadiaaf_commit_push_s1',
  'sadiaaf_deploy_s1',
  'sadiaaf_git_diff_s1',
  'sadiaaf_git_status_s1',
  'sadiaaf_list_files_s1',
  'sadiaaf_patch_file_s1',
  'sadiaaf_prepare_branch_s1',
  'sadiaaf_projects_context_s1',
  'sadiaaf_quality_s1',
  'sadiaaf_quarantine_contents_s1',
  'sadiaaf_read_file_s1',
  'sadiaaf_restore_quarantine_s1',
  'sadiaaf_search_code_s1'
]);

export const ALL_SCOPED_TOOL_NAMES = new Set<string>([
  ...READ_ONLY_SCOPED_TOOL_NAMES,
  ...WRITE_SCOPED_TOOL_NAMES
]);

export function assertScopedToolCatalogsAreValid(): void {
  for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
    if (WRITE_SCOPED_TOOL_NAMES.has(name)) {
      throw new Error(`Outil présent dans les catalogues READ et WRITE : ${name}`);
    }
  }
}
