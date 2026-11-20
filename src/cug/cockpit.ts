import { z } from 'zod';
import { GRGS_POLICY_ID, GRGS_POLICY_VERSION } from './grgsDocumentPolicy.js';
import { GRT_CONTROL_REPOSITORY, type GrtCheckpoint } from './questionnaire.js';

const sha = z.string().regex(/^[0-9a-f]{40}$/);
const phase = z.string().regex(/^[A-Z][A-Z0-9_-]{0,79}$/);
const instant = z.iso.datetime();
const repositoryName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/);
const positive = z.number().int().positive();
const count = z.number().int().min(0).max(10_000);
const local = z.object({
  authority: z.literal('GRT_LOCAL'),
  requestId: z.string().regex(/^LOCAL-[0-9]{6,12}$/),
  revision: positive,
  phase,
  next: z.object({ kind: phase, id: phase }).nullable(),
  evidence: z.object({ repository: repositoryName, issue: positive, observedAt: instant })
});
const capsule = z.object({
  status: z.enum(['WAITING_LOCAL', 'READY', 'HELD', 'HANDOFF']),
  projectId: z.string(),
  repository: z.object({ id: z.string().regex(/^[1-9][0-9]{0,19}$/), name: repositoryName }).optional(),
  checkpoint: z.unknown()
});
const baseline = z.object({
  status: z.literal('BASELINE_ATTESTED'),
  subjectHead: sha,
  completedAt: instant
});
const documentation = z.object({
  status: z.literal('CLASSIFIED'),
  policyId: z.literal(GRGS_POLICY_ID),
  policyVersion: z.literal(GRGS_POLICY_VERSION),
  observedCommit: sha,
  evidenceDigest: z.string().regex(/^[0-9a-f]{64}$/),
  counts: z.object({
    CONVENTIONAL_EXCEPTION: count.optional(),
    SCOPED_DOCUMENT: count.optional(),
    LEGACY_REVIEW: count.optional()
  }),
  automaticMutation: z.literal(false)
});

/** Browser DTO from already correlated authorities. No issue bodies, tokens or raw GRGS paths. */
export function projectCugCockpit(central: GrtCheckpoint, raw: unknown) {
  const issue = Number(central.projectContinuityId.split('-').at(-1));
  const observed = {
    projectContinuityId: central.projectContinuityId,
    phase: central.phase,
    grtState: central.grtState,
    revision: central.revision,
    issueUrl: 'https://github.com/' + GRT_CONTROL_REPOSITORY + '/issues/' + issue
  };
  const empty = {
    central: observed,
    local: null,
    repository: { status: 'NOT_CONFIRMED' } as const,
    baseline: { status: 'NOT_ATTESTED' } as const,
    documentation: { status: 'NOT_OBSERVED' } as const
  };
  const result = capsule.safeParse(raw);
  if (!result.success || result.data.projectId !== central.projectContinuityId) {
    return { ...empty, status: 'ATTENTION' } as const;
  }
  const { repository, status, checkpoint } = result.data;
  if (!repository) return { ...empty, status: status === 'HELD' ? 'HELD' : 'CENTRAL_ONLY' } as const;
  const verifiedLocal = local.safeParse(checkpoint);
  const localProof = verifiedLocal.success &&
      verifiedLocal.data.evidence.repository.toLowerCase() === repository.name.toLowerCase()
    ? verifiedLocal.data : null;
  // WAITING_LOCAL is emitted by the capsule only after the repository ID is
  // observed through the installation and a correlated local issue is absent.
  if (!localProof && status !== 'WAITING_LOCAL') return { ...empty, status: 'ATTENTION' } as const;
  const terminal = status === 'HANDOFF' && localProof?.phase === 'HANDOFF';
  // Parse independently so an absent receipt cannot promote or erase GRGS.
  const evidence = terminal ? z.object({ architecture: z.unknown(), documentation: z.unknown() }).safeParse(raw) : null;
  const observedBaseline = baseline.safeParse(evidence?.success ? evidence.data.architecture : undefined);
  const observedDocs = documentation.safeParse(evidence?.success ? evidence.data.documentation : undefined);
  return {
    status,
    central: observed,
    local: localProof,
    repository: { status: 'OBSERVED', name: repository.name, id: repository.id } as const,
    baseline: observedBaseline.data ?? empty.baseline,
    documentation: observedDocs.data ?? empty.documentation
  };
}
