import { randomUUID as createRandomUUID } from 'node:crypto';

import { z } from 'zod';

import type { RequestIdentity } from './sessionService.js';

export const ConnectionContextSchema = z.object({
  schemaVersion: z.literal(1),
  connectionContextId: z.string().uuid(),
  governedSessionId: z.string().uuid(),
  repository: z.literal('Patricked-code/MCP'),
  principalId: z.string().trim().min(1).max(256).startsWith('oauth:'),
  observedClientId: z.string().trim().min(1).max(256).nullable(),
  identityAssurance: z.literal('oauth_subject'),
  clientClassification: z.literal('UNRESOLVED'),
  evidenceSource: z.literal('oauth_auth_info'),
  createdAt: z.string().datetime({ offset: true })
}).strict();

export type ConnectionContext = z.infer<typeof ConnectionContextSchema>;

export type CreateConnectionContextInput = {
  governedSessionId: string;
  repository: 'Patricked-code/MCP';
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
