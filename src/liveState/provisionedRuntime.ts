import type { GitRegistryProjectEvidence } from '../github/registry.js';
import {
  buildProvisionedRuntimeInventoryCommand,
  parseProvisionedRuntimeInventory,
  provisioningInventoryTargets,
  unavailableProvisionedRuntimeInventory,
  type ProvisionedRuntimeInventory
} from '../provisioning/projectRuntime.js';
import type { TargetProjectObservation } from './targetProject.js';

/**
 * F.2 (TB-W3-F-03): Live State inventories, read-only, the runtimes of its
 * resolved target project on the server it observes: the declared, governed
 * path of each component and its provisioned Docker namespace. Without a
 * resolved target nothing is collected; a failed read stays unavailable and
 * never becomes an absence.
 */
export async function collectProvisionedRuntimes(input: {
  targetProject: TargetProjectObservation;
  readRegistry: () => Promise<GitRegistryProjectEvidence>;
  runReadOnly: (command: string) => Promise<{ code: number | null; stdout: string }>;
  now: () => Date;
}): Promise<ProvisionedRuntimeInventory | undefined> {
  const projectId = input.targetProject.targetSelection?.status === 'RESOLVED'
    ? input.targetProject.targetContext?.projectId
    : undefined;
  if (!projectId) return undefined;
  const observedAt = input.now().toISOString();
  let registry: GitRegistryProjectEvidence;
  try {
    registry = await input.readRegistry();
  } catch {
    return undefined;
  }
  const targets = provisioningInventoryTargets(registry, projectId);
  if (targets.length === 0) return undefined;
  try {
    const result = await input.runReadOnly(buildProvisionedRuntimeInventoryCommand(targets));
    if (result.code !== 0) return unavailableProvisionedRuntimeInventory(targets, observedAt);
    return parseProvisionedRuntimeInventory(result.stdout, targets, observedAt);
  } catch {
    return unavailableProvisionedRuntimeInventory(targets, observedAt);
  }
}
