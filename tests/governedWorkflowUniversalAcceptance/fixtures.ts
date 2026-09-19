export const NOW = '2026-09-19T13:30:00.000Z';

export const SHA_A = 'a'.repeat(40);
export const SHA_B = 'b'.repeat(40);
export const SHA_C = 'c'.repeat(40);
export const SHA_D = 'd'.repeat(40);

export const STABLECOIN_FIXTURE = Object.freeze({
  provenance: Object.freeze({
    pullRequestNumber: 86,
    candidateHeadSha: '5f54b78c87ae3a5e8a402ac80af42355a7f4ec08'
  }),
  project: Object.freeze({
    projectId: 'chainsolutions.stablecoin',
    projectUid: 'CS-STABLECOIN-001',
    globalCheckpointRepositoryId: 'github:Patricked-code/Stablecoin',
    centralGovernanceRepositoryId: 'github:Patricked-code/Stablecoin',
    repositoryComponents: Object.freeze([
      Object.freeze({
        repositoryId: 'github:Patricked-code/Stablecoin',
        mappingId: 'stablecoin-frontend',
        role: 'FRONTEND'
      })
    ])
  }),
  observation: Object.freeze({
    mappingId: 'stablecoin-frontend',
    repositoryId: 'github:Patricked-code/Stablecoin',
    githubHead: SHA_A,
    runtimeRevision: SHA_A,
    freshness: 'CURRENT' as const
  }),
  runtime: Object.freeze({
    serverId: 'S2',
    componentId: 'stablecoin-frontend',
    repositoryId: 'github:Patricked-code/Stablecoin',
    componentRole: 'FRONTEND',
    runtimeKind: 'PASSENGER' as const,
    runtimeId: 'passenger:stablecoin-frontend',
    revision: SHA_A,
    evidenceRef: 'fixture:pr86:passenger'
  }),
  publicDomain: 'stablecoin.chainsolutions.fr',
  publicApi: 'https://api.stablecoin.chainsolutions.fr',
  backendRepository: null,
  backendState: 'LIVE_DISCOVERY_REQUIRED' as const
});

export const MULTI_COMPONENT_FIXTURE = Object.freeze({
  project: Object.freeze({
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    globalCheckpointRepositoryId: 'github:ExampleOrg/web',
    centralGovernanceRepositoryId: 'github:ExampleOrg/web',
    repositoryComponents: Object.freeze([
      Object.freeze({
        repositoryId: 'github:ExampleOrg/web',
        mappingId: 'example-web',
        role: 'FRONTEND'
      }),
      Object.freeze({
        repositoryId: 'github:ExampleOrg/api',
        mappingId: 'example-api',
        role: 'API'
      })
    ])
  }),
  observations: Object.freeze([
    Object.freeze({
      mappingId: 'example-web',
      repositoryId: 'github:ExampleOrg/web',
      githubHead: SHA_A,
      runtimeRevision: SHA_B,
      freshness: 'CURRENT' as const
    }),
    Object.freeze({
      mappingId: 'example-api',
      repositoryId: 'github:ExampleOrg/api',
      githubHead: SHA_C,
      runtimeRevision: SHA_D,
      freshness: 'CURRENT' as const
    })
  ])
});

export const RECOVERY_FIXTURE = Object.freeze({
  candidateSessionId: 'candidate-gwc17-recovery-fixture',
  agentIdentity: 'acceptance-agent',
  headSha: SHA_A,
  workItemId: 'GWC-PRE-E-GWC-17',
  heartbeatObservedAt: '2026-09-19T13:20:00.000Z',
  observedAt: NOW
});
