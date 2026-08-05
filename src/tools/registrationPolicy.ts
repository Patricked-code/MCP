export const READ_ONLY_SCOPED_TOOL_NAMES = new Set<string>([
  'get_write_tools_context',
  'run_sql_readonly_s2',
  'git_status_project_s2'
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
  'mcp_prepare_recovery_candidate_s1'
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
