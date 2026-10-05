import { randomUUID as createRandomUUID } from 'node:crypto';

import { z } from 'zod';

import type { RequestIdentity } from './sessionService.js';
import { RepositoryTargetSchema } from './targetScope.js';

export const ConnectionContextSchema = z.object({
  schemaVersion: z.literal(1),
  connectionContextId: z.string().uuid(),
  governedSessionId: z.string().uuid(),
  repository: RepositoryTargetSchema,
  principalId: z.string().trim().min(1).max(256).startsWith('oauth:'),
  observedClientId: z.string().trim().min(1).max(256).nullable(),
  identityAssurance: z.literal('oauth_subject'),
  clientClassification: z.literal('UNRESOLVED'),
  evidenceSource: z.literal('oauth_auth_info'),
  createdAt: z.string().datetime({ offset: true })
}).strict();

export type ConnectionContext = z.infer<typeof ConnectionContextSchema>;

const ForbiddenClientInferencesSchema = z.tuple([
  z.literal('CLIENT_CLASS_FROM_CLIENT_ID_ONLY'),
  z.literal('CONVERSATION_FROM_TRANSPORT_SESSION'),
  z.literal('WORKSPACE_FROM_REPOSITORY')
]);

const FORBIDDEN_CLIENT_INFERENCES: z.infer<typeof ForbiddenClientInferencesSchema> = [
  'CLIENT_CLASS_FROM_CLIENT_ID_ONLY',
  'CONVERSATION_FROM_TRANSPORT_SESSION',
  'WORKSPACE_FROM_REPOSITORY'
];

export const ClientEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.literal('connection_context'),
  connectionContextId: z.string().uuid().nullable(),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  principal: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('VERIFIED'),
      assurance: z.literal('oauth_subject'),
      evidenceSource: z.literal('oauth_auth_info')
    }).strict(),
    z.object({
      status: z.literal('UNKNOWN'),
      reasonCode: z.enum(['CONNECTION_CONTEXT_ABSENT', 'CONNECTION_CONTEXT_INVALID'])
    }).strict()
  ]),
  oauthClientId: z.object({
    observed: z.boolean(),
    opaque: z.literal(true),
    classificationAuthority: z.literal(false)
  }).strict(),
  clientClassification: z.object({
    status: z.literal('UNKNOWN'),
    reasonCode: z.literal('UNKNOWN_UNTIL_VERIFIABLE_CLIENT_EVIDENCE')
  }).strict(),
  conversationReference: z.object({
    status: z.literal('UNKNOWN'),
    reasonCode: z.literal('CONVERSATION_REFERENCE_NOT_SUPPLIED')
  }).strict(),
  workspaceReference: z.object({
    status: z.literal('UNKNOWN'),
    reasonCode: z.literal('WORKSPACE_REFERENCE_NOT_SUPPLIED')
  }).strict(),
  forbiddenInferences: ForbiddenClientInferencesSchema,
  blocksOauthPrincipalResolution: z.literal(false)
}).strict().superRefine((evidence, context) => {
  const verified = evidence.principal.status === 'VERIFIED';
  const anchored = evidence.connectionContextId !== null && evidence.observedAt !== null;

  if (verified !== anchored) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['principal'],
      message: 'the connection context anchor must be present exactly when the principal is verified'
    });
  }

  if (!verified && evidence.oauthClientId.observed) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['oauthClientId', 'observed'],
      message: 'an OAuth clientId can only be observed on a verified connection context'
    });
  }
});

export type ClientEvidence = z.infer<typeof ClientEvidenceSchema>;

export type CreateConnectionContextInput = {
  governedSessionId: string;
  repository: string;
  requestIdentity: RequestIdentity;
  now?: () => Date;
  randomUUID?: () => string;
};

export function createConnectionContext(
  input: CreateConnectionContextInput
): ConnectionContext | null {
  if (input.requestIdentity.assurance !== 'oauth_subject') {
    return null;
  }

  return ConnectionContextSchema.parse({
    schemaVersion: 1,
    connectionContextId: (input.randomUUID ?? createRandomUUID)(),
    governedSessionId: input.governedSessionId,
    repository: input.repository,
    principalId: input.requestIdentity.principalId,
    observedClientId: input.requestIdentity.clientId,
    identityAssurance: 'oauth_subject',
    clientClassification: 'UNRESOLVED',
    evidenceSource: 'oauth_auth_info',
    createdAt: (input.now ?? (() => new Date()))().toISOString()
  });
}

/**
 * True only for a connection context proven by OAuth: the one context that
 * carries a principal for the GitHub identity scope and for E1 detection.
 */
export function isOauthConnectionContext(
  context: ConnectionContext | null | undefined
): context is ConnectionContext {
  return Boolean(
    context
    && context.identityAssurance === 'oauth_subject'
    && context.evidenceSource === 'oauth_auth_info'
    && context.principalId.startsWith('oauth:')
  );
}

/**
 * Projects the client evidence proven by a persisted ConnectionContext.
 *
 * Only the OAuth subject is verified evidence. The observed clientId stays opaque,
 * and classification, conversation and workspace stay UNKNOWN until a verifiable
 * source supplies them. Nothing is persisted: absence stays absence.
 */
export function deriveClientEvidence(
  context: ConnectionContext | null | undefined
): ClientEvidence {
  const parsed = context ? ConnectionContextSchema.safeParse(context) : null;
  const current = parsed?.success ? parsed.data : null;

  return ClientEvidenceSchema.parse({
    schemaVersion: 1,
    source: 'connection_context',
    connectionContextId: current?.connectionContextId ?? null,
    observedAt: current?.createdAt ?? null,
    principal: current
      ? {
          status: 'VERIFIED',
          assurance: current.identityAssurance,
          evidenceSource: current.evidenceSource
        }
      : {
          status: 'UNKNOWN',
          reasonCode: context ? 'CONNECTION_CONTEXT_INVALID' : 'CONNECTION_CONTEXT_ABSENT'
        },
    oauthClientId: {
      observed: current !== null && current.observedClientId !== null,
      opaque: true,
      classificationAuthority: false
    },
    clientClassification: {
      status: 'UNKNOWN',
      reasonCode: 'UNKNOWN_UNTIL_VERIFIABLE_CLIENT_EVIDENCE'
    },
    conversationReference: {
      status: 'UNKNOWN',
      reasonCode: 'CONVERSATION_REFERENCE_NOT_SUPPLIED'
    },
    workspaceReference: {
      status: 'UNKNOWN',
      reasonCode: 'WORKSPACE_REFERENCE_NOT_SUPPLIED'
    },
    forbiddenInferences: FORBIDDEN_CLIENT_INFERENCES,
    blocksOauthPrincipalResolution: false
  });
}
