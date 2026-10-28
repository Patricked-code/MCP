/**
 * GD-U-COMPOSE: read-only cross-plane deployment *blueprint*.
 * Composes previously implemented, fail-closed autonomy advice + the
 * universal target capability catalogue. NO EXECUTOR and NO new scheduler.
 * Every mutation must be performed by an existing governed runtime action
 * after authoritative Task/Session/claim/locks, E3 consent and re-observation.
 */
import {
  composeUniversalAutonomyAdvice,
  type UniversalAutonomyAdviceInput
} from './universalAutonomyAdvice.js';
import {
  assessDelegatedAdminCapability,
  findUniversalAdminCapability,
  type DelegatedCapabilityEvidence
} from './universalAdminCapabilityCatalog.js';

export type DeploymentTargetMode = 'EXISTING_HOST_SUBPATH' | 'SUBDOMAIN' | 'DEDICATED_DOMAIN';
export type UniversalDeploymentBlueprintInput = Readonly<{
  sourceRepository: string;
  /** Authoritative MCP repository provided by the current governed context, never hard-coded. */
  mcpRepository: string;
  sourceSha: string;
  serverId: 's1' | 's2';
  domain: string;
  mode: DeploymentTargetMode;
  path: string | null;
  at: string;
  existingAutonomy: UniversalAutonomyAdviceInput;
  /** Keyed by full capability ID. Values must originate from real providers. */
  evidenceByCapability: Readonly<Record<string, DelegatedCapabilityEvidence | null>>;
}>;
export type UniversalBlueprintStep = Readonly<{
  stepId: string;
  capabilityId: string;
  dependsOn: readonly string[];
  resourceScope: string;
  phase: 'SOURCE'|'HOST'|'BUILD'|'DEPLOY'|'VERIFY'|'RECOVER';
  status: 'PERMISSION_OBSERVED_NOT_ADMITTED' | 'BLOCKED';
  reasons: readonly string[];
  destructive: boolean;
}>;
export type UniversalDeploymentBlueprint = Readonly<{
  disposition: 'PROPOSE_FOR_EXISTING_ADMISSION' | 'HOLD';
  target: string;
  reasonCodes: readonly string[];
  steps: readonly UniversalBlueprintStep[];
  /** This is intentionally never an execution ticket or write authority. */
  runtimeWriteAuthorized: false;
  operationExecuted: false;
}>;
const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PATH = /^\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*){0,4}$/;

type RawStep = Readonly<{capability: string;phase: UniversalBlueprintStep['phase']}>;
const TEMPLATE: readonly RawStep[] = [
  { capability: 'github.repository.inspect', phase: 'SOURCE' },
  { capability: 'github.git.compare', phase: 'SOURCE' },
  { capability: 'github.actions.dispatch', phase: 'SOURCE' },
  { capability: 'server.filesystem.write', phase: 'HOST' },
  { capability: 'server.application.build', phase: 'BUILD' },
  { capability: 'server.application.deploy', phase: 'DEPLOY' },
  { capability: 'server.application.health', phase: 'VERIFY' },
  { capability: 'intelligence.evidence.attest', phase: 'VERIFY' },
  { capability: 'server.application.rollback', phase: 'RECOVER' }
];

export function buildUniversalDeploymentBlueprint(input: UniversalDeploymentBlueprintInput): UniversalDeploymentBlueprint {
  const bad: string[] = [];
  const parts = input.sourceRepository.split('/');
  if (!REPOSITORY.test(input.sourceRepository) || !REPOSITORY.test(input.mcpRepository)
      || parts.some(part=>part==='.'||part==='..')
      || !SHA.test(input.sourceSha)) bad.push('SOURCE_NOT_ATTESTED');
  if (!DOMAIN.test(input.domain) || (input.serverId !== 's1' && input.serverId !== 's2')) {
    bad.push('TARGET_INVALID');
  }
  if (input.mode === 'EXISTING_HOST_SUBPATH') {
    if (!input.path || !PATH.test(input.path)) bad.push('TARGET_INVALID');
  } else if (input.path !== null) {
    bad.push('TARGET_INVALID');
  }
  if (input.mode !== 'SUBDOMAIN' && input.mode !== 'DEDICATED_DOMAIN'
      && input.mode !== 'EXISTING_HOST_SUBPATH') bad.push('TARGET_INVALID');

  const advice = composeUniversalAutonomyAdvice(input.existingAutonomy);
  if (advice.disposition !== 'PROPOSE') bad.push('AUTONOMY_PREFLIGHT_BLOCKED');
  if (input.at !== input.existingAutonomy.at) bad.push('OBSERVATION_CLOCK_MISMATCH');
  // A real existing-host subpath needs a dedicated adapter and governing PR.
  // The existing subdomain planner is never an alternative for /regulatory.
  if (input.mode === 'EXISTING_HOST_SUBPATH') bad.push('SUBPATH_ADAPTER_NOT_ATTESTED');
  if (input.mode === 'SUBDOMAIN'
      && input.existingAutonomy.target.mode !== 'SUBDOMAIN') {
    bad.push('TARGET_STRATEGY_MISMATCH');
  }
  if (input.mode !== 'SUBDOMAIN'
      && input.existingAutonomy.target.mode !== 'NO_INFRA_CHANGE'
      && input.existingAutonomy.target.mode !== 'EXISTING_HOST_SUBPATH') {
    bad.push('TARGET_STRATEGY_MISMATCH');
  }
  if (bad.includes('SOURCE_NOT_ATTESTED') || bad.includes('TARGET_INVALID')) {
    return { disposition:'HOLD',target:'UNVERIFIED',reasonCodes:[...new Set(bad)],
      steps:[],runtimeWriteAuthorized:false,operationExecuted:false };
  }

  const hosting: RawStep = input.mode === 'EXISTING_HOST_SUBPATH'
    ? { capability:'plesk.host.subpath.provision',phase:'HOST' }
    : input.mode === 'SUBDOMAIN'
      ? { capability:'plesk.subdomain.create',phase:'HOST' }
      : { capability:'plesk.domain.create',phase:'HOST' };
  const template = [...TEMPLATE.slice(0,4), hosting,
    { capability:'plesk.tls.certificate.manage',phase:'HOST' as const }, ...TEMPLATE.slice(4)];
  let prior: string | null = null;
  const steps = template.map((s,index): UniversalBlueprintStep => {
    const stepId = 'GD-STEP-' + String(index+1).padStart(2,'0');
    const cap = findUniversalAdminCapability(s.capability);
    const scope = s.capability.startsWith('github.') ? 'github:'+input.sourceRepository
      : s.capability.startsWith('plesk.') ? 'plesk:'+input.serverId+':'+input.domain
        : s.capability.startsWith('server.') ? 'server:'+input.serverId
          : 'runtime:'+input.mcpRepository;
    const assessment = assessDelegatedAdminCapability({
      id:s.capability,expectedScope:scope,observedAt:input.at,
      evidence:input.evidenceByCapability[s.capability] ?? null
    });
    const node: UniversalBlueprintStep = {
      stepId,capabilityId:s.capability,dependsOn:prior?[prior]:[],
      resourceScope:scope,phase:s.phase,status:assessment.status,
      reasons:assessment.reasonCodes,destructive:cap?.risk==='critical'
    };
    prior = stepId;
    return node;
  });

  if (steps.some(step=>step.status==='BLOCKED')) bad.push('CAPABILITY_EVIDENCE_INCOMPLETE');
  const target = input.mode === 'EXISTING_HOST_SUBPATH' ? input.domain + input.path : input.domain;
  return {
    disposition:bad.length===0?'PROPOSE_FOR_EXISTING_ADMISSION':'HOLD',
    target,reasonCodes:[...new Set(bad)],steps,
    runtimeWriteAuthorized:false,operationExecuted:false
  };
}
