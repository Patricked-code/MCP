/**
 * GD-U-MAX — exhaustive *target* catalogue of delegable administration features.
 *
 * Catalogue != permissions. A hint is not an authoritative GitHub/Plesk API
 * permission contract; exact versions, installation scopes, API endpoint
 * coverage, owners and server privileges are observed by separate adapters.
 * Never conflate an installed GitHub App with account owner or Linux root.
 * No capability in this file performs an operation.
 */
export type AdminPlane = 'github' | 'plesk' | 'server' | 'intelligence';
export type AdminRisk = 'low' | 'medium' | 'high' | 'critical';
export type AdminCapability = Readonly<{
  id: string;
  plane: AdminPlane;
  permissionHint: string;
  risk: AdminRisk;
  existing: 'existing' | 'adapter';
}>;
export const UNIVERSAL_ADMIN_CAPABILITIES: readonly AdminCapability[] = [
  { id: 'github.repository.inspect', plane: 'github', permissionHint: 'contents:read', risk: 'low', existing: 'existing' },
  { id: 'github.repository.create', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.repository.configure', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.repository.rename', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.repository.transfer', plane: 'github', permissionHint: 'administration:write', risk: 'critical', existing: 'adapter' },
  { id: 'github.repository.archive', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.repository.delete', plane: 'github', permissionHint: 'administration:write', risk: 'critical', existing: 'adapter' },
  { id: 'github.repository.import', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.repository.visibility', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.repository.topics', plane: 'github', permissionHint: 'metadata:write', risk: 'low', existing: 'adapter' },
  { id: 'github.branch.create', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'existing' },
  { id: 'github.branch.protect', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.branch.ruleset', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.branch.delete', plane: 'github', permissionHint: 'contents:write', risk: 'high', existing: 'adapter' },
  { id: 'github.git.commit', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'existing' },
  { id: 'github.git.file.update', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'existing' },
  { id: 'github.git.tag', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.git.release', plane: 'github', permissionHint: 'contents:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.git.compare', plane: 'github', permissionHint: 'contents:read', risk: 'low', existing: 'existing' },
  { id: 'github.pull_request.create', plane: 'github', permissionHint: 'pull_requests:write', risk: 'medium', existing: 'existing' },
  { id: 'github.pull_request.review', plane: 'github', permissionHint: 'pull_requests:write', risk: 'medium', existing: 'existing' },
  { id: 'github.pull_request.merge', plane: 'github', permissionHint: 'contents:write', risk: 'high', existing: 'existing' },
  { id: 'github.pull_request.update', plane: 'github', permissionHint: 'pull_requests:write', risk: 'medium', existing: 'existing' },
  { id: 'github.issues.manage', plane: 'github', permissionHint: 'issues:write', risk: 'medium', existing: 'existing' },
  { id: 'github.discussions.manage', plane: 'github', permissionHint: 'discussions:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.actions.workflow.manage', plane: 'github', permissionHint: 'workflows:write', risk: 'high', existing: 'adapter' },
  { id: 'github.actions.dispatch', plane: 'github', permissionHint: 'actions:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.actions.rerun', plane: 'github', permissionHint: 'actions:write', risk: 'medium', existing: 'adapter' },
  { id: 'github.actions.runs.read', plane: 'github', permissionHint: 'actions:read', risk: 'low', existing: 'existing' },
  { id: 'github.actions.runners.manage', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.actions.variables.manage', plane: 'github', permissionHint: 'variables:write', risk: 'high', existing: 'adapter' },
  { id: 'github.actions.secrets.manage', plane: 'github', permissionHint: 'secrets:write', risk: 'high', existing: 'adapter' },
  { id: 'github.environments.manage', plane: 'github', permissionHint: 'environments:write', risk: 'high', existing: 'adapter' },
  { id: 'github.deployments.manage', plane: 'github', permissionHint: 'deployments:write', risk: 'high', existing: 'adapter' },
  { id: 'github.packages.manage', plane: 'github', permissionHint: 'packages:write', risk: 'high', existing: 'adapter' },
  { id: 'github.webhooks.manage', plane: 'github', permissionHint: 'webhooks:write', risk: 'high', existing: 'adapter' },
  { id: 'github.security.code_scanning', plane: 'github', permissionHint: 'security_events:write', risk: 'high', existing: 'adapter' },
  { id: 'github.security.dependabot', plane: 'github', permissionHint: 'dependabot_alerts:write', risk: 'high', existing: 'adapter' },
  { id: 'github.security.secret_scanning', plane: 'github', permissionHint: 'secret_scanning_alerts:write', risk: 'high', existing: 'adapter' },
  { id: 'github.security.rules', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.teams.manage', plane: 'github', permissionHint: 'members:write', risk: 'high', existing: 'adapter' },
  { id: 'github.organization.repos.manage', plane: 'github', permissionHint: 'administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.organization.members.manage', plane: 'github', permissionHint: 'members:write', risk: 'high', existing: 'adapter' },
  { id: 'github.organization.roles.manage', plane: 'github', permissionHint: 'organization_custom_roles:write', risk: 'high', existing: 'adapter' },
  { id: 'github.organization.rules.manage', plane: 'github', permissionHint: 'organization_administration:write', risk: 'high', existing: 'adapter' },
  { id: 'github.organization.audit.read', plane: 'github', permissionHint: 'organization_administration:read', risk: 'low', existing: 'adapter' },
  { id: 'github.installation.inspect', plane: 'github', permissionHint: 'metadata:read', risk: 'low', existing: 'existing' },
  { id: 'github.installation.permissions.inspect', plane: 'github', permissionHint: 'metadata:read', risk: 'low', existing: 'existing' },
  { id: 'github.installation.token.mint', plane: 'github', permissionHint: 'metadata:read', risk: 'high', existing: 'existing' },
  { id: 'github.account.settings.manage', plane: 'github', permissionHint: 'user_authorization', risk: 'high', existing: 'adapter' },
  { id: 'github.enterprise.policies.manage', plane: 'github', permissionHint: 'enterprise_authorization', risk: 'critical', existing: 'adapter' },
  { id: 'github.enterprise.audit.read', plane: 'github', permissionHint: 'enterprise_authorization', risk: 'low', existing: 'adapter' },
  { id: 'plesk.server.inspect', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'existing' },
  { id: 'plesk.subscription.inspect', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'existing' },
  { id: 'plesk.subscription.create', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.subscription.update', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.subscription.remove', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'critical', existing: 'adapter' },
  { id: 'plesk.service_plan.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.customer.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.reseller.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.domain.inspect', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'existing' },
  { id: 'plesk.domain.create', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.domain.update', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.domain.delete', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'critical', existing: 'adapter' },
  { id: 'plesk.domain.alias.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'medium', existing: 'adapter' },
  { id: 'plesk.subdomain.create', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'existing' },
  { id: 'plesk.subdomain.update', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.subdomain.delete', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'critical', existing: 'adapter' },
  { id: 'plesk.host.subpath.provision', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.hosting.config.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.hosting.vhost.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.hosting.reverse_proxy.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.dns.zone.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.dns.record.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.tls.certificate.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.tls.renewal.inspect', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'adapter' },
  { id: 'plesk.runtime.php.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.runtime.node.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.runtime.python.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.database.create', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.database.user.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.database.backup', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'medium', existing: 'adapter' },
  { id: 'plesk.database.restore', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'critical', existing: 'adapter' },
  { id: 'plesk.backup.create', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'medium', existing: 'adapter' },
  { id: 'plesk.backup.restore', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'critical', existing: 'adapter' },
  { id: 'plesk.backup.schedule', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'medium', existing: 'adapter' },
  { id: 'plesk.cron.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.files.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.permissions.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.logs.read', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'existing' },
  { id: 'plesk.mail.domain.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.mail.box.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.mail.dns.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.ftp.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.extensions.manage', plane: 'plesk', permissionHint: 'plesk:admin', risk: 'high', existing: 'adapter' },
  { id: 'plesk.service.health.read', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'existing' },
  { id: 'plesk.license.read', plane: 'plesk', permissionHint: 'plesk:read', risk: 'low', existing: 'adapter' },
  { id: 'server.inventory.read', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.filesystem.read', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.filesystem.write', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.filesystem.permissions', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.filesystem.delete', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.users.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'adapter' },
  { id: 'server.users.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.groups.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.sudo.policy.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.packages.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'adapter' },
  { id: 'server.packages.update', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.system.patch', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.system.service.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.system.service.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.process.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.process.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.pm2.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.docker.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.docker.container.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.docker.image.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.docker.volume.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.docker.network.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.network.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.network.firewall.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.network.proxy.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.network.tls.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.ssh.access.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.secrets.rotate', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.database.inspect', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'adapter' },
  { id: 'server.database.migrate', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.database.backup', plane: 'server', permissionHint: 'server:privileged', risk: 'medium', existing: 'adapter' },
  { id: 'server.database.restore', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.application.build', plane: 'server', permissionHint: 'server:privileged', risk: 'medium', existing: 'existing' },
  { id: 'server.application.deploy', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'existing' },
  { id: 'server.application.restart', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'existing' },
  { id: 'server.application.rollback', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.application.health', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.application.logs', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.metrics.read', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'existing' },
  { id: 'server.alerts.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'medium', existing: 'adapter' },
  { id: 'server.cron.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.backup.create', plane: 'server', permissionHint: 'server:privileged', risk: 'medium', existing: 'adapter' },
  { id: 'server.backup.restore', plane: 'server', permissionHint: 'server:privileged', risk: 'critical', existing: 'adapter' },
  { id: 'server.disaster_recovery.test', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'server.audit.logs.read', plane: 'server', permissionHint: 'server:read', risk: 'low', existing: 'adapter' },
  { id: 'server.resource.quotas.manage', plane: 'server', permissionHint: 'server:privileged', risk: 'high', existing: 'adapter' },
  { id: 'intelligence.capabilities.discover', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.accounts.resolve', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.project.resolve', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.repository.mapping.resolve', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.plan.compose', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'adapter' },
  { id: 'intelligence.dependency.schedule', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.candidate.dispatch', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.claims.inspect', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.locks.inspect', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.work.admit', plane: 'intelligence', permissionHint: 'runtime:governed_write', risk: 'high', existing: 'existing' },
  { id: 'intelligence.agent.coordinate', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.agent.handoff', plane: 'intelligence', permissionHint: 'runtime:governed_write', risk: 'medium', existing: 'existing' },
  { id: 'intelligence.continuity.resume', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'adapter' },
  { id: 'intelligence.checkpoint.verify', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.drift.detect', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'existing' },
  { id: 'intelligence.policy.fallback.select', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'adapter' },
  { id: 'intelligence.failure.classify', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'adapter' },
  { id: 'intelligence.rollback.plan', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'medium', existing: 'adapter' },
  { id: 'intelligence.rollback.execute', plane: 'intelligence', permissionHint: 'runtime:governed_write', risk: 'critical', existing: 'adapter' },
  { id: 'intelligence.monitoring.reconcile', plane: 'intelligence', permissionHint: 'runtime:read', risk: 'low', existing: 'adapter' },
  { id: 'intelligence.feedback.record', plane: 'intelligence', permissionHint: 'runtime:governed_write', risk: 'medium', existing: 'adapter' },
  { id: 'intelligence.evidence.attest', plane: 'intelligence', permissionHint: 'runtime:governed_write', risk: 'medium', existing: 'existing' },
];

export const UNIVERSAL_ADMIN_CAPABILITY_COUNT = UNIVERSAL_ADMIN_CAPABILITIES.length;
const BY_ID = new Map(UNIVERSAL_ADMIN_CAPABILITIES.map(c => [c.id, c]));
if (BY_ID.size !== UNIVERSAL_ADMIN_CAPABILITIES.length) {
  throw new Error('UNIVERSAL_CAPABILITY_DUPLICATE_ID');
}
export function findUniversalAdminCapability(id: string): AdminCapability | null {
  return BY_ID.get(id) ?? null;
}

export type DelegatedCapabilityEvidence = Readonly<{
  source: 'GITHUB_API' | 'PLESK_API' | 'SERVER_ATTESTATION' | 'GOVERNED_RUNTIME';
  principalId: string;
  /** Explicit account/repository, subscription/domain, host or target scope. */
  scope: string;
  observedAt: string;
  availablePermissionHints: readonly string[];
  resourceAccessible: boolean;
}>;
export type DelegatedCapabilityAssessment = Readonly<{
  status: 'PERMISSION_OBSERVED_NOT_ADMITTED' | 'BLOCKED';
  reasonCodes: readonly string[];
  capability: AdminCapability | null;
  runtimeWriteAuthorized: false;
  operationExecuted: false;
}>;
const SOURCES: Record<AdminPlane, DelegatedCapabilityEvidence['source']> = {
  github: 'GITHUB_API', plesk: 'PLESK_API',
  server: 'SERVER_ATTESTATION', intelligence: 'GOVERNED_RUNTIME'
};
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9_./:@-]{0,255}$/;
export function assessDelegatedAdminCapability(input: Readonly<{
  id: string;
  expectedScope: string;
  observedAt: string;
  evidence: DelegatedCapabilityEvidence | null;
}>): DelegatedCapabilityAssessment {
  const capability = findUniversalAdminCapability(input.id);
  const reasons: string[] = [];
  if (!capability) reasons.push('CAPABILITY_UNKNOWN');
  if (!SCOPE.test(input.expectedScope)) reasons.push('SCOPE_INVALID');
  const ev = input.evidence;
  if (!ev) reasons.push('EVIDENCE_MISSING');
  else {
    if (!capability || ev.source !== SOURCES[capability.plane]
        || typeof ev.principalId !== 'string' || ev.principalId.length === 0) {
      reasons.push('AUTHORITY_SOURCE_MISMATCH');
    }
    if (ev.scope !== input.expectedScope || ev.resourceAccessible !== true) {
      reasons.push('SCOPE_NOT_ATTESTED');
    }
    if (!ISO.test(input.observedAt) || !ISO.test(ev.observedAt)
        || !Number.isFinite(Date.parse(input.observedAt))
        || !Number.isFinite(Date.parse(ev.observedAt))
        || Date.parse(ev.observedAt) > Date.parse(input.observedAt)
        || Date.parse(input.observedAt) - Date.parse(ev.observedAt) > 300_000) {
      reasons.push('EVIDENCE_STALE');
    }
    if (capability && !ev.availablePermissionHints.includes(capability.permissionHint)) {
      reasons.push('DELEGATED_PERMISSION_MISSING');
    }
  }
  return {
    status: reasons.length === 0 ? 'PERMISSION_OBSERVED_NOT_ADMITTED' : 'BLOCKED',
    reasonCodes: reasons,
    capability,
    runtimeWriteAuthorized: false,
    operationExecuted: false
  };
}
