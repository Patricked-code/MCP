# MCP Governed Session Continuity / Operational Memory V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Étendre le serveur MCP existant avec une identité de session opérationnelle durable distincte du transport, une mémoire bornée et persistante, un contexte gouverné reconstituable, des locks temporaires et un WRITE gate strictement shadow, tout en corrigeant par TDD le faux alignement documentaire de Live State V1.

**Architecture:** L’implémentation reste dans le processus Node/TypeScript wealthtech_ssh_bridge et compose les autorités existantes au lieu de les remplacer. Live State V1 demeure l’autorité d’alignement, GitHub demeure l’autorité du code/PR/CI, S1 et Docker demeurent l’autorité du runtime, tandis que les nouveaux stores sous /app/data ne portent que le cycle de vie des governed sessions, locks, checkpoints et événements. MCP-Session-Id reste éphémère et n’est utilisé que dans un binding mémoire; governedSessionId est durable et reprend sur un nouveau transport uniquement avec une preuve légitime.

**Tech Stack:** Node.js >=20, TypeScript, node:test, Zod 4, MCP SDK 1.30.0, Express, stockage JSON/JSONL atomique sous /app/data, API GitHub HTTPS allowlistée, helpers SSH/Live State existants.

## Global Constraints

- Repository canonique : Patricked-code/MCP.
- Baseline immuable GitHub/S1/runtime : eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2.
- Branche de travail unique : mcp/session-continuity-v1-20260813.
- Ne jamais modifier main directement.
- Ne jamais écrire directement sur S1.
- Ne jamais modifier le runtime pendant l’implémentation de branche.
- Ne pas modifier .github/workflows/mcp-deploy.yml, GitHub OIDC, src/deploy/githubOidc.ts, src/deploy/routes.ts ou src/deploy/s1Deploy.ts.
- Ne pas remplacer Live State V1, son store, son stateVersion, son single-flight, son démarrage initial ou son fallback de 60 secondes.
- Ne supprimer, renommer ou modifier le schéma d’aucun outil existant.
- Conserver ENABLE_WRITE_TOOLS comme gate d’exposition existant.
- Conserver allow_write partout où il existe; ne l’ajouter ni ne le retirer des schémas historiques.
- Le nouveau gate de la surface scoped WRITE est off ou shadow seulement en V1; shadow ne bloque jamais.
- Le handler historique doit être invoqué exactement une fois et conserver résultat, erreur et annulation.
- MCP-Session-Id brut ne doit jamais devenir une clé persistante, apparaître dans le journal JSONL ou être exposé dans le contexte.
- governedSessionId est un identifiant UUID, jamais un secret d’autorisation.
- Aucun prompt, argument complet, sortie brute, token, header Authorization, secret, clé ou contenu de fichier ne peut être persisté ou journalisé.
- Aucun service, conteneur, base externe, webhook ou second MCP n’est créé.
- Les nouveaux timers utilisent unref et n’empêchent pas l’arrêt.
- ACTIVITY_LOG.md reste append-only.
- Aucune action relative à la 2FA GitHub.
- Chaque code fonctionnel est précédé d’un test observé RED pour la raison attendue.
- Chaque GREEN est suivi du test ciblé, des tests voisins, de typecheck et de git diff --check.
- Une CI rouge attendue d’un commit RED doit échouer uniquement sur le nouveau comportement manquant.
- Toute nécessité de casser un invariant déclenche STOP avant modification.

## Baseline vérifiée avant le plan

- main, S1 HEAD, S1 origin/main et révision OCI : eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2.
- S1 : branche main, arbre propre, diff vide, fetch read-only et push disabled://mcp-s1-read-only.
- Docker : wealthtech_mcp_ssh_bridge running et healthy.
- Live State : CURRENT, stateVersion=9, mais declaredGithubSha=9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7 et documentation=ALIGNED; le défaut est reproduit.
- Branche de travail au moment du plan : e80e420859653224dd4c03964cd87e2ae4ffb618.
- CI d’approbation de la spec : run 31668698160, conclusion success.
- Baseline locale : 12 tests gouvernance + 108 tests sécurité/intégration, soit 120 tests, zéro échec.
- Typecheck, build, docs:check, lint:secrets et git diff --check : succès.
- Dans ce sandbox, exécuter les tests par node --import tsx --test afin d’éviter le socket IPC interdit de la CLI tsx; la CI conserve les scripts npm canoniques.

## Carte des fichiers et responsabilités

### Fichiers existants modifiés

- src/liveState/collect.ts : calcul minimal du drift SHA documentaire; aucun autre collecteur changé.
- tests/liveStateCollectors.test.ts : reproduction RED du SHA documentaire ancien.
- tests/liveStateReconcile.test.ts : verrouillage du contrat Live State non aligné.
- src/config/env.ts : options additives, bornées, sans retrait des variables existantes.
- src/oauth.ts : inspection sanitizée d’un token OAuth déjà validé; verifyOauthAccessToken conserve son contrat booléen.
- src/auth.ts : attache AuthInfo au request MCP sans changer les décisions 200/401.
- src/server.ts : instructions MCP, composition additive des nouveaux services, binding transport mémoire, dashboard additif et décorateur shadow limité à la surface scoped WRITE.
- src/tools/readOnly.ts : enregistre les nouveaux outils/resources après la chaîne Live State existante.
- src/tools/writeScoped.ts : aucune modification des handlers; reçoit seulement un McpServer décoré depuis server.ts.
- package.json : ajoute les nouveaux tests au script existant test:readonly-safety; aucun workflow CI modifié.
- SUIVI.md, TASKS.md, TODO.md, DECISIONS_LOG.md, CHANGELOG.md, PRODUCTION_STATE.json : faits vérifiés et tâche active.
- ACTIVITY_LOG.md : ajouts en fin de fichier uniquement.
- docs/governance/markdown-inventory.json : ajout mécanique du présent plan dans engineering-plan.

### Fichiers nouveaux

- src/operationalMemory/config.ts : constantes et bornes centralisées.
- src/operationalMemory/types.ts : types/schémas Zod persistants et vues publiques.
- src/operationalMemory/atomicStore.ts : JSON strict, file queue, écriture atomique et mode 0600.
- src/operationalMemory/eventJournal.ts : JSONL append-only, métadonnées allowlistées et rotation.
- src/operationalMemory/transportBindings.ts : Map mémoire transport brut vers governedSessionId et fingerprint persistable.
- src/operationalMemory/resumeProof.ts : secret de reprise à forte entropie, hash scrypt salé et comparaison.
- src/operationalMemory/sessionService.ts : transitions, reprise, concurrence optimiste, heartbeat, acquittement et checkpoints.
- src/operationalMemory/lockService.ts : scopes normalisés, conflit, TTL, renouvellement et expiration.
- src/operationalMemory/maintenance.ts : expiration périodique et unref.
- src/tools/governedSessions.ts : outils MCP de cycle de vie et locks.
- src/governedContext/types.ts : projection publique versionnée.
- src/governedContext/github.ts : PR/CI/revue GitHub read-only, borné et caché.
- src/governedContext/service.ts : composition Live State + GitHub + session + locks.
- src/governedContext/dashboard.ts : rendu HTML pur et échappé.
- src/tools/governedContext.ts : ressource, outils read-only et instructions associées.
- src/governance/scopedWriteGate.ts : décorateur shadow best-effort et non bloquant.
- tests/helpers/captureToolContracts.ts : capture test-only des noms et JSON schemas historiques.
- tests/fixtures/existing-tool-contracts-v1.json : baseline littérale des outils existants.
- tests/toolContractRegression.test.ts : aucun outil/schéma historique retiré.
- tests/operationalMemoryStore.test.ts
- tests/operationalEventJournal.test.ts
- tests/governedSessionService.test.ts
- tests/governedSessionTools.test.ts
- tests/governedLocks.test.ts
- tests/governedContextGithub.test.ts
- tests/governedContextService.test.ts
- tests/governedContextTools.test.ts
- tests/scopedWriteGate.test.ts
- tests/mcpAuthContext.test.ts
- tests/governedDashboard.test.ts

---

### Task 1: Caractériser les contrats existants et rendre RED le défaut documentaire

**Files:**
- Create: tests/helpers/captureToolContracts.ts
- Create: tests/fixtures/existing-tool-contracts-v1.json
- Create: tests/toolContractRegression.test.ts
- Modify: tests/liveStateCollectors.test.ts
- Modify: tests/liveStateReconcile.test.ts
- Modify: package.json

**Interfaces:**
- Produces captureToolContracts(register) retournant un objet trié name -> JSON Schema.
- Le fixture contient uniquement la surface existant à e80e420859653224dd4c03964cd87e2ae4ffb618.
- Ne produit aucun code runtime.

- [x] **Step 1: Capturer la baseline des outils existants avant toute extension.**

Le helper enveloppe chaque raw Zod shape dans z.object(shape), appelle z.toJSONSchema et conserve description + inputSchema. Les overloads sans schema produisent un objet JSON Schema vide. Les fonctions handler ne sont jamais invoquées pendant la capture.

~~~~typescript
export type CapturedToolContract = {
  description: string | null;
  inputSchema: Record<string, unknown>;
};

export function captureToolContracts(
  register: (server: McpServer) => void
): Record<string, CapturedToolContract>;
~~~~

Le test appelle séparément registerReadOnlyTools et registerScopedWriteTools, fusionne les résultats et vérifie chaque contrat littéral du fixture. Les futurs outils sont permis, mais chaque nom historique doit rester présent et strictement égal.

- [x] **Step 2: Vérifier que le test de caractérisation est GREEN sur la baseline.**

Run:

~~~~bash
node --import tsx --test tests/toolContractRegression.test.ts
~~~~

Expected: PASS; le nombre capturé correspond exactement au fixture généré sur e80e420.

- [x] **Step 3: Remplacer le test qui autorise à tort le SHA historique par le test RED demandé.**

~~~~typescript
test('un SHA GitHub documentaire explicite ancien force le drift', () => {
  const observedGithubSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const observedS1Sha = observedGithubSha;

  const observation = parseDocumentationObservation([
    'active_task=TASK-20260813-004 — EN COURS',
    'declared_github_sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'declared_s1_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'documentation_requires_revalidation=false'
  ].join('\n'), observedGithubSha, observedS1Sha);

  assert.equal(observation.declaredGithubSha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(observation.drift, true);
});
~~~~

Ajouter dans liveStateReconcile.test.ts un test où documentation.drift=true et declaredGithubSha diffère du head GitHub; attendre DOCUMENTATION_DRIFT, RECONCILIATION_REQUIRED, contradiction DOCUMENTATION_DRIFT et nextAction reconcile_canonical_documentation.

- [x] **Step 4: Exécuter RED et vérifier la cause exacte.**

Run:

~~~~bash
node --import tsx --test tests/liveStateCollectors.test.ts tests/liveStateReconcile.test.ts
~~~~

Expected: un seul échec nouveau, actual false, expected true, dans le test du SHA documentaire ancien. Les tests de réconciliation existants restent verts.

- [x] **Step 5: Commit RED.**

~~~~bash
git add tests/helpers/captureToolContracts.ts tests/fixtures/existing-tool-contracts-v1.json tests/toolContractRegression.test.ts tests/liveStateCollectors.test.ts tests/liveStateReconcile.test.ts package.json
git commit -m "test(live-state): expose stale documentation sha"
~~~~

Pousser le commit via le connecteur GitHub et conserver le run CI rouge comme preuve RED.

### Task 2: Corriger minimalement le drift documentaire et réconcilier les faits historiques

**Files:**
- Modify: src/liveState/collect.ts
- Modify: SUIVI.md
- Modify: TASKS.md
- Modify: TODO.md
- Modify: DECISIONS_LOG.md
- Modify: CHANGELOG.md
- Modify: PRODUCTION_STATE.json
- Append only: ACTIVITY_LOG.md

**Interfaces:**
- parseDocumentationObservation(output, observedGithubSha, observedS1Sha) conserve exactement son type de retour.
- Aucun champ LiveStateSnapshot, nom d’alignement, stateVersion ou outil ne change.

- [x] **Step 1: Implémenter le calcul minimal du drift.**

~~~~typescript
const explicitGithubMismatch = Boolean(
  declaredGithubSha
  && observedGithubSha
  && declaredGithubSha !== observedGithubSha
);
const explicitS1Mismatch = Boolean(
  declaredS1Sha
  && observedS1Sha
  && declaredS1Sha !== observedS1Sha
);
const drift = values.documentation_requires_revalidation === 'true'
  || explicitGithubMismatch
  || explicitS1Mismatch;
~~~~

Renommer les paramètres _observedGithubSha et _observedS1Sha sans changer la signature. Ne considérer ni null ni chaîne invalide comme égalité implicite.

- [x] **Step 2: Vérifier GREEN ciblé.**

~~~~bash
node --import tsx --test tests/liveStateCollectors.test.ts tests/liveStateReconcile.test.ts
~~~~

Expected: tous les tests ciblés passent; la valeur publique non alignée reste DOCUMENTATION_DRIFT.

- [x] **Step 3: Rejouer tous les tests Live State.**

~~~~bash
node --import tsx --test tests/liveStateCollectors.test.ts tests/liveStateReconcile.test.ts tests/liveStateStore.test.ts tests/liveStateEngine.test.ts tests/liveStateTools.test.ts
~~~~

Expected: PASS, zéro changement de stateVersion lorsque seules les dates changent.

- [x] **Step 4: Réconcilier les documents avec les preuves effectivement observées au 2026-08-13.**

Écrire les faits suivants, sans déclarer le head futur de la branche comme état de production :

- PR #43 fusionnée.
- main/S1/origin/main/OCI/runtime = eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2.
- CI push et autodeploy de la seconde preuve réussis.
- runtime running/healthy, S1 propre/read-only.
- TASK-20260809-003 terminée.
- Nouvelle tâche active unique : TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — EN COURS.
- Branche : mcp/session-continuity-v1-20260813.
- Prochaine action : exécuter le plan TDD sans PR avant régression complète.
- La 2FA reste hors périmètre et n’est pas exécutée.

PRODUCTION_STATE.json doit être actualisé uniquement avec les identifiants de runs déjà vérifiés dans la preuve de PR #43; si un identifiant exact n’est pas disponible dans les documents ou GitHub, conserver un champ null/absent plutôt que l’inventer.

- [x] **Step 5: Ajouter l’événement ACTIVITY_LOG en fin de fichier.**

L’entrée indique le GO humain, la branche, le head du plan, la baseline runtime, le défaut documentaire reproduit et l’absence de mutation S1/runtime.

- [x] **Step 6: Vérifier la gouvernance documentaire.**

~~~~bash
npm run docs:check
node --import tsx --test tests/docGovernance.test.ts
git diff --check
~~~~

- [x] **Step 7: Commit GREEN.**

~~~~bash
git add src/liveState/collect.ts tests/liveStateCollectors.test.ts tests/liveStateReconcile.test.ts SUIVI.md TASKS.md TODO.md DECISIONS_LOG.md CHANGELOG.md PRODUCTION_STATE.json ACTIVITY_LOG.md
git commit -m "fix(live-state): reject stale documentation sha"
~~~~

Pousser et attendre une CI entièrement verte avant Task 3.

### Task 3: Ajouter les types, la configuration et les stores atomiques V1

**Files:**
- Create: src/operationalMemory/config.ts
- Create: src/operationalMemory/types.ts
- Create: src/operationalMemory/atomicStore.ts
- Create: tests/operationalMemoryStore.test.ts
- Modify: src/config/env.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type GovernedSessionStatus = 'OPEN' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CLOSED';
export type IdentityAssurance =
  | 'oauth_subject'
  | 'resume_secret'
  | 'shared_credential'
  | 'declared_only';

export type SanitizedTransportMetadata = {
  fingerprint: string;
  boundAt: string;
  lastSeenAt: string;
};

export type GovernedCheckpoint = {
  checkpointId: string;
  governedSessionId: string;
  createdAt: string;
  taskScope: string;
  workBranch: string | null;
  pullRequestNumber: number | null;
  observedHeadSha: string | null;
  acknowledgedStateVersion: number;
  completedAction: string;
  resultCode: string;
  blockers: string[];
  nextAction: string | null;
  eventIds: string[];
  sessionRevision: number;
};

export type GovernedSessionRecord = {
  schemaVersion: 1;
  governedSessionId: string;
  repository: 'Patricked-code/MCP';
  taskScope: string;
  workBranch: string | null;
  agentIdentity: string;
  ownerPrincipalId: string | null;
  identityAssurance: IdentityAssurance;
  resumeSecretHash: string;
  status: GovernedSessionStatus;
  createdAt: string;
  resumedAt: string | null;
  lastHeartbeatAt: string;
  pausedAt: string | null;
  expiredAt: string | null;
  closedAt: string | null;
  currentTransport: SanitizedTransportMetadata | null;
  lastAcknowledgedStateVersion: number | null;
  sessionRevision: number;
  lastCheckpoint: GovernedCheckpoint | null;
  blockers: string[];
  nextAction: string | null;
  lockIds: string[];
  resumePolicy: 'stable_principal_or_resume_secret';
};

export type SessionStoreDocument = {
  schemaVersion: 1;
  storeRevision: number;
  sessions: GovernedSessionRecord[];
};

export type GovernedLockStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED';
export type GovernedLockRecord = {
  schemaVersion: 1;
  lockId: string;
  scope: string;
  governedSessionId: string;
  acquiredAt: string;
  expiresAt: string;
  renewedAt: string;
  reason: string;
  status: GovernedLockStatus;
  lockRevision: number;
};

export type LockStoreDocument = {
  schemaVersion: 1;
  storeRevision: number;
  locks: GovernedLockRecord[];
};
~~~~

Les vues publiques omettent resumeSecretHash. Les schémas Zod sont stricts et bornent toutes les chaînes/listes.

Configuration additive exacte :

- MCP_GOVERNED_SESSIONS_ENABLED : boolean, default true.
- MCP_GOVERNED_SESSION_IDLE_TTL_SECONDS : integer 300..604800, default 86400.
- MCP_GOVERNED_SESSION_RESUME_GRACE_SECONDS : integer 3600..2592000, default 604800.
- MCP_GOVERNED_LOCK_DEFAULT_TTL_SECONDS : integer 30..1800, default 300.
- MCP_GOVERNED_LOCK_MAX_TTL_SECONDS : integer 60..3600, default 1800.
- MCP_WRITE_GATE_MODE : enum off|shadow, default shadow.
- MCP_OPERATIONAL_EVENT_MAX_BYTES : integer 65536..52428800, default 10485760.
- MCP_OPERATIONAL_EVENT_ARCHIVES : integer 1..10, default 5.

Paths par défaut : /app/data/mcp-governed-sessions.json et /app/data/mcp-governed-locks.json. Les tests injectent des paths temporaires par dépendance, pas par mutation globale.

~~~~typescript
export type AtomicJsonStore<T> = {
  read(): Promise<T>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
};

export function createAtomicJsonStore<T>(options: {
  filePath: string;
  schema: z.ZodType<T>;
  empty: () => T;
}): AtomicJsonStore<T>;
~~~~

- [x] **Step 1: Écrire RED pour absence, écriture, remplacement, 0600, sérialisation et corruption.**

Le test de corruption écrit un JSON invalide, appelle read, attend OPERATIONAL_STORE_CORRUPTED et vérifie octet pour octet que le fichier corrompu n’a pas été remplacé.

- [x] **Step 2: Exécuter RED.**

~~~~bash
node --import tsx --test tests/operationalMemoryStore.test.ts
~~~~

Expected: module not found.

- [x] **Step 3: Implémenter strictement le store minimal.**

- mkdir parent avec mode 0700;
- readFile puis schema.safeParse;
- ENOENT retourne empty sans écrire;
- update sérialisé par une Promise queue propre au store;
- writeFile temporaire dans le même dossier, mode 0600;
- rename atomique;
- chmod final 0600;
- en erreur avant rename, supprimer uniquement le temporaire exact;
- ne jamais réécrire un fichier corrompu.

- [x] **Step 4: Vérifier GREEN puis typecheck.**

~~~~bash
node --import tsx --test tests/operationalMemoryStore.test.ts
npm run typecheck
git diff --check
~~~~

- [x] **Step 5: Commit RED puis GREEN séparément.**

- RED: test(operational-memory): define atomic store contract
- GREEN: feat(operational-memory): add versioned atomic stores

### Task 4: Ajouter le journal machine append-only, sanitizé et borné

**Files:**
- Create: src/operationalMemory/eventJournal.ts
- Create: tests/operationalEventJournal.test.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type OperationalEventType =
  | 'session.opened'
  | 'session.resumed'
  | 'session.heartbeat'
  | 'session.paused'
  | 'session.expired'
  | 'session.closed'
  | 'transport.bound'
  | 'transport.unbound'
  | 'context.read'
  | 'context.acknowledged'
  | 'checkpoint.created'
  | 'lock.acquired'
  | 'lock.renewed'
  | 'lock.conflicted'
  | 'lock.released'
  | 'lock.expired'
  | 'scoped_write.shadow'
  | 'reconcile.requested'
  | 'reconcile.completed'
  | 'blocker.detected';

export type OperationalEvent = {
  schemaVersion: 1;
  eventId: string;
  processSequence: number;
  occurredAt: string;
  type: OperationalEventType;
  governedSessionId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type OperationalEventJournal = {
  append(input: Omit<OperationalEvent, 'schemaVersion' | 'eventId' | 'processSequence' | 'occurredAt'>): Promise<OperationalEvent>;
};
~~~~

Le module n’accepte pas un Record arbitraire depuis les handlers. Une fonction metadataForEvent(type, typedInput) construit une allowlist par type. Les clés token, authorization, prompt, arguments, output, content, mcpSessionId et transportSessionId sont refusées par test.

- [x] **Step 1: Écrire RED pour append, séquence, parallélisme, permissions, sanitization et rotation.**

Avec maxBytes=512 et archives=2, écrire assez d’événements pour produire .1 et .2, vérifier absence de .3 et JSON valide ligne par ligne.

- [x] **Step 2: Exécuter RED.**

~~~~bash
node --import tsx --test tests/operationalEventJournal.test.ts
~~~~

- [x] **Step 3: Implémenter append sérialisé et rotation 10 MiB/5 archives par défaut.**

La rotation renomme du plus ancien au plus récent, ne suit aucun symlink, et maintient le fichier actif en 0600.

- [x] **Step 4: Vérifier GREEN et le secret scan.**

~~~~bash
node --import tsx --test tests/operationalEventJournal.test.ts
npm run lint:secrets
git diff --check
~~~~

- [x] **Step 5: Commits.**

- RED: test(operational-memory): define event journal contract
- GREEN: feat(operational-memory): add sanitized event journal

### Task 5: Séparer transport et identité durable, puis implémenter ouverture/reprise

**Files:**
- Create: src/operationalMemory/transportBindings.ts
- Create: src/operationalMemory/resumeProof.ts
- Create: src/operationalMemory/sessionService.ts
- Create: tests/governedSessionService.test.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type RequestIdentity = {
  principalId: string | null;
  clientId: string | null;
  assurance: 'oauth_subject' | 'shared_credential' | 'declared_only';
};

export type TransportBindings = {
  bind(transportSessionId: string, governedSessionId: string, now: Date): SanitizedTransportMetadata;
  lookup(transportSessionId: string | undefined): string | null;
  unbind(transportSessionId: string): string | null;
};

export function createResumeSecret(): string;
export async function hashResumeSecret(secret: string): Promise<string>;
export async function verifyResumeSecret(secret: string, encodedHash: string): Promise<boolean>;

export type OpenSessionInput = {
  repository: 'Patricked-code/MCP';
  taskScope: string;
  workBranch: string | null;
  agentIdentity: string;
  blockers: string[];
  nextAction: string | null;
};

export type OpenSessionResult = {
  session: PublicGovernedSession;
  resumeSecret: string;
};

export type ResumeSessionInput = {
  governedSessionId: string;
  resumeSecret?: string;
  repository: 'Patricked-code/MCP';
  taskScope: string;
  expectedSessionRevision: number;
};
~~~~

- secret : randomBytes(32).toString('base64url');
- hash : scrypt avec sel aléatoire, format scrypt-v1$N$r$p$salt$hash;
- comparaison : timingSafeEqual;
- aucun secret brut dans store, journal ou logger;
- fingerprint transport : SHA-256 avec préfixe de domaine mcp-transport-v1 et valeur brute, mais seul le digest est persisté;
- la Map mémoire est la seule structure indexée par MCP-Session-Id brut.

Politique de reprise :

1. session CLOSED : SESSION_CLOSED;
2. EXPIRED au-delà du grace period : SESSION_EXPIRED;
3. repository/taskScope incompatibles : SESSION_SCOPE_MISMATCH;
4. expectedSessionRevision différent : SESSION_REVISION_MISMATCH, aucune écriture;
5. principal OAuth stable égal au ownerPrincipalId : autorisé;
6. sinon secret de reprise correct : autorisé avec assurance resume_secret;
7. sinon : SESSION_RESUME_PROOF_REQUIRED;
8. un credential partagé ou agentIdentity seul ne suffit jamais.

- [x] **Step 1: Écrire RED pour governedSessionId stable et secret non persisté.**

Ouvrir avec transport-A, lire le JSON et vérifier governedSessionId présent, resumeSecret absent, transport-A absent et fingerprint présent.

- [x] **Step 2: Écrire RED pour reprise sur transport-B.**

Reprendre avec secret valide et même scope; vérifier même governedSessionId, nouveau fingerprint, revision +1 et lookup(transport-B) égal à la session.

- [x] **Step 3: Écrire RED pour les refus.**

Secret faux, scope différent, session fermée, revision périmée, credential partagé seul et collision ambiguë doivent échouer sans modifier les octets du store.

- [x] **Step 4: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedSessionService.test.ts
~~~~

- [x] **Step 5: Implémenter le minimum puis GREEN.**

Toutes les mutations de session passent par atomicStore.update et comparent la revision avant copie immutable. La vue publique est construite par une fonction unique qui omet resumeSecretHash.

- [x] **Step 6: Vérifier mutation mentale.**

Les tests doivent échouer si le code :
- utilise transportSessionId comme governedSessionId;
- persiste le secret brut;
- accepte un mauvais expectedSessionRevision;
- accepte un credential partagé sans secret;
- crée un nouvel UUID pendant resume.

- [x] **Step 7: Commits.**

- RED: test(session): define durable resume policy
- GREEN: feat(session): add governed session continuity

### Task 6: Heartbeat, acquittement, checkpoints, pause/close et maintenance

**Files:**
- Modify: src/operationalMemory/sessionService.ts
- Create: src/operationalMemory/maintenance.ts
- Modify: tests/governedSessionService.test.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
heartbeat(input: {
  governedSessionId: string;
  expectedSessionRevision: number;
}, request: BoundRequest): Promise<PublicGovernedSession>;

acknowledgeContext(input: {
  governedSessionId: string;
  expectedSessionRevision: number;
  expectedStateVersion: number;
}, request: BoundRequest): Promise<PublicGovernedSession>;

createCheckpoint(input: {
  governedSessionId: string;
  expectedSessionRevision: number;
  expectedStateVersion: number;
  completedAction: string;
  resultCode: string;
  pullRequestNumber: number | null;
  observedHeadSha: string | null;
  blockers: string[];
  nextAction: string | null;
}, request: BoundRequest): Promise<GovernedCheckpoint>;

pauseSession(...): Promise<PublicGovernedSession>;
closeSession(...): Promise<PublicGovernedSession>;
listVisibleSessions(request): Promise<PublicGovernedSession[]>;
getVisibleSession(id, request): Promise<PublicGovernedSession | null>;
~~~~

Règles :

- BoundRequest exige que le transport courant soit lié à governedSessionId, ou un principal OAuth stable propriétaire.
- expectedStateVersion est comparé au liveStateEngine.getCurrent(); mismatch = LIVE_STATE_VERSION_MISMATCH sans écriture.
- acknowledge met lastAcknowledgedStateVersion.
- checkpoint exige que expectedStateVersion soit déjà acquitté; un checkpoint ne contient que des champs bornés.
- heartbeat met lastHeartbeatAt et revision +1.
- pause conserve la possibilité de reprise.
- close est idempotent pour le propriétaire mais interdit toute reprise ultérieure.
- idle TTL marque EXPIRED; grace dépassé rend la reprise impossible.
- maintenance toutes les 60 secondes, unref, single timer.

- [x] **Step 1: RED pour revision et stateVersion indépendants.**
- [x] **Step 2: RED pour checkpoint sanitizé et borné.**
- [x] **Step 3: RED pour heartbeat, pause, close, expiration et timer unref.**
- [x] **Step 4: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedSessionService.test.ts
~~~~

- [x] **Step 5: Implémenter minimalement et vérifier GREEN.**
- [x] **Step 6: Commits.**

- RED: test(session): define lifecycle and checkpoint contracts
- GREEN: feat(session): add lifecycle and checkpoints

### Task 7: Locks temporaires avec conflit explicite et renouvellement par heartbeat

**Files:**
- Create: src/operationalMemory/lockService.ts
- Create: tests/governedLocks.test.ts
- Modify: src/operationalMemory/sessionService.ts
- Modify: src/operationalMemory/maintenance.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type LockScopeInput =
  | { type: 'repository'; key: 'Patricked-code/MCP' }
  | { type: 'task'; key: string }
  | { type: 'resource'; key: string };

acquireLock(input: {
  governedSessionId: string;
  expectedSessionRevision: number;
  scope: LockScopeInput;
  ttlSeconds?: number;
  reason: string;
}, request: BoundRequest): Promise<GovernedLockRecord>;

releaseLock(input: {
  governedSessionId: string;
  lockId: string;
  expectedLockRevision: number;
}, request: BoundRequest): Promise<GovernedLockRecord>;

renewLocksForHeartbeat(governedSessionId: string, now: Date): Promise<GovernedLockRecord[]>;
expireLocks(now: Date): Promise<number>;
listActiveLocks(): Promise<PublicGovernedLock[]>;
~~~~

Normalisation :
- repository:Patricked-code/MCP;
- task:TASK-YYYYMMDD-NNN;
- resource suivi d’une clé 1..160 caractères limitée à lettres, chiffres, ., /, :, _, -;
- aucun .., slash initial, shell metacharacter ou chaîne libre illimitée.

TTL default 300 secondes, max 1800 secondes. Un lock actif concurrent sur le même scope retourne LOCK_CONFLICT et l’identifiant public du propriétaire, sans transfert.

- [x] **Step 1: RED acquisition, conflit et non-écriture sur conflit.**
- [x] **Step 2: RED renouvellement heartbeat, expiration et libération idempotente.**
- [x] **Step 3: RED redémarrage simulé : un lock expiré relu du store reste expiré.**
- [x] **Step 4: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedLocks.test.ts
~~~~

- [x] **Step 5: Implémenter et GREEN.**
- [x] **Step 6: Commits.**

- RED: test(locks): define governed lock semantics
- GREEN: feat(locks): add bounded session locks

### Task 8: Propager une identité MCP sanitizée et exposer les outils de session

**Files:**
- Modify: src/oauth.ts
- Modify: src/auth.ts
- Modify: src/server.ts
- Create: src/tools/governedSessions.ts
- Create: tests/mcpAuthContext.test.ts
- Create: tests/governedSessionTools.test.ts
- Modify: src/tools/readOnly.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type VerifiedOauthIdentity = {
  subject: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
};

export function inspectOauthAccessToken(
  token: string,
  requiredScope?: string
): VerifiedOauthIdentity | null;
~~~~

verifyOauthAccessToken(token, scope) continue à retourner boolean et délègue à inspectOauthAccessToken.

AuthInfo attaché au request :

- OAuth : clientId réel, scopes, expiresAt, extra.governedPrincipalId = oauth:<subject>, extra.identityAssurance = oauth_subject.
- token MCP partagé : clientId = wealthtech-shared-mcp, scopes inchangés selon le comportement actuel, extra.governedPrincipalId = null, extra.identityAssurance = shared_credential.
- authInfo.token reste en mémoire de request parce que le SDK l’exige; aucun nouveau code ne le logue/persiste/retourne.

Outils additifs :

- mcp_open_governed_session
- mcp_resume_governed_session
- mcp_governed_session_heartbeat
- mcp_acknowledge_governed_context
- mcp_create_governed_checkpoint
- mcp_pause_governed_session
- mcp_close_governed_session
- mcp_list_governed_sessions
- mcp_get_governed_session
- mcp_acquire_governed_lock
- mcp_release_governed_lock

Les mutations portent uniquement sur /app/data et restent disponibles indépendamment de ENABLE_WRITE_TOOLS. Les réponses utilisent content JSON et isError=true avec un code borné pour les erreurs nouvelles.

- [x] **Step 1: RED auth.**

Tester token partagé et OAuth valides/invalide; les décisions 200/401 existantes sont inchangées. Vérifier que la vue identité ne contient jamais le token.

- [x] **Step 2: RED outils.**

Fake McpServer capture les handlers et extra.sessionId. Vérifier ouverture, resume, heartbeat, erreur structurée de revision et absence de MCP-Session-Id dans la réponse.

- [x] **Step 3: Exécuter RED.**

~~~~bash
node --import tsx --test tests/mcpAuthContext.test.ts tests/governedSessionTools.test.ts
~~~~

- [x] **Step 4: Implémenter sans toucher aux schémas historiques.**
- [x] **Step 5: Rejouer auth/OAuth et tool contracts.**

~~~~bash
node --import tsx --test tests/mcpAuthContext.test.ts tests/governedSessionTools.test.ts tests/oauthLogRedaction.test.ts tests/toolClassification.test.ts tests/toolContractRegression.test.ts
~~~~

- [x] **Step 6: Commits.**

- RED: test(mcp-session): define authenticated lifecycle tools
- GREEN: feat(mcp-session): expose governed lifecycle tools

### Task 9: Collecter GitHub de manière bornée et composer le Governed Operational Context

**Files:**
- Create: src/governedContext/types.ts
- Create: src/governedContext/github.ts
- Create: src/governedContext/service.ts
- Create: tests/governedContextGithub.test.ts
- Create: tests/governedContextService.test.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type GithubOperationalContext = {
  status: 'CURRENT' | 'DEGRADED' | 'UNAVAILABLE';
  observedAt: string;
  mainHead: string | null;
  workBranch: string | null;
  pullRequest: {
    number: number;
    state: 'open' | 'closed';
    draft: boolean;
    merged: boolean;
    base: string;
    head: string;
    headSha: string;
    updatedAt: string;
  } | null;
  checks: {
    status: 'queued' | 'in_progress' | 'completed' | 'unavailable';
    conclusion: string | null;
    total: number;
    failed: number;
  };
  reviews: {
    approvals: number;
    changesRequested: number;
    unresolvedThreads: number | null;
  };
  ruleset: {
    name: string | null;
    enforcement: string | null;
    requiresPullRequest: boolean | null;
    requiredStatusChecks: string[];
    requiresConversationResolution: boolean | null;
  };
  error: string | null;
};

export type GovernedOperationalContext = {
  schemaVersion: 1;
  generatedAt: string;
  freshness: 'CURRENT' | 'STALE' | 'DEGRADED';
  repository: 'Patricked-code/MCP';
  governedBranch: 'main';
  liveState: LiveStateSnapshot | null;
  github: GithubOperationalContext;
  session: PublicGovernedSession | null;
  activeLocks: PublicGovernedLock[];
  lastCheckpoint: GovernedCheckpoint | null;
  blockers: string[];
  nextAction: string | null;
  gate: {
    mode: 'off' | 'shadow';
    existingWriteToolsEnabled: boolean;
    decision: 'read_only' | 'shadow_observed' | 'session_unbound' | 'context_unacknowledged' | 'lock_conflict';
  };
  proof: {
    identityAssurance: IdentityAssurance | null;
    runtimeRealtimeAvailable: boolean;
    limitations: string[];
  };
};
~~~~

GitHub collector :
- REST GET commit main;
- REST GET PR par head+base, maximum 10;
- REST GET check-runs, maximum 100;
- REST GET reviews, maximum 100;
- GraphQL read-only reviewThreads(first:50) pour isResolved;
- REST GET rulesets, maximum 20;
- timeout 15 secondes maximum;
- cache 15 secondes par workBranch;
- single-flight par cache key;
- token lu depuis le chemin existant;
- API HTTPS et hostname allowlistés via resolveGithubApiBase existant;
- aucune pagination non bornée;
- jamais de token dans error;
- échec partiel = DEGRADED, jamais throw depuis le composer.

- [x] **Step 1: RED GitHub avec fetch injecté.**

Couvrir PR active, checks, reviews, thread count, ruleset, cache et timeout. Un body malformé retourne DEGRADED avec champs null/bornés.

- [x] **Step 2: RED composer.**

Avec Live State et GitHub fixtures littéraux, vérifier les priorités de nextAction :
1. blocker Live State;
2. session non acquittée;
3. lock conflict;
4. review/CI;
5. checkpoint nextAction;
6. null.

- [x] **Step 3: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedContextGithub.test.ts tests/governedContextService.test.ts
~~~~

- [x] **Step 4: Implémenter puis GREEN.**

Le composer lit les stores et caches; il n’écrit rien et ne force ni SSH ni GitHub sauf dans reconcileExplicit().

- [x] **Step 5: Commits.**

- RED: test(governed-context): define composed operational view
- GREEN: feat(governed-context): compose bounded live context

### Task 10: Exposer instructions, ressource et outils MCP de contexte

**Files:**
- Create: src/tools/governedContext.ts
- Create: tests/governedContextTools.test.ts
- Modify: src/server.ts
- Modify: src/tools/readOnly.ts
- Modify: package.json

**Interfaces:**

McpServer est construit avec des instructions statiques :

~~~~typescript
const GOVERNED_CONTEXT_INSTRUCTIONS = [
  'Avant une mutation gouvernée, lire mcp://wealthtech/governed-context/current.',
  'Ouvrir ou reprendre une governed session; MCP-Session-Id reste un transport temporaire.',
  'Acquitter le stateVersion courant avant checkpoint.',
  'Le WRITE gate V1 est shadow et ne remplace ni ENABLE_WRITE_TOOLS ni allow_write.'
].join('\n');
~~~~

Ressource :

- URI mcp://wealthtech/governed-context/current
- name wealthtech-governed-context-current
- title WealthTech Governed Operational Context
- mimeType application/json
- annotations audience assistant, priority 1
- callback utilise extra.sessionId pour résoudre le binding mémoire.

Outils read-only :

- mcp_get_governed_context : lit caches/stores sans forcer reconcile.
- mcp_reconcile_governed_context : appelle liveStateEngine.reconcileNow et force le refresh GitHub, puis compose.
- annotations readOnlyHint=true, destructiveHint=false.

- [ ] **Step 1: RED enregistrement réel.**

Fake McpServer capture registerResource/registerTool. Vérifier URI, metadata, annotations et résultats JSON. Le test ne greppe pas le source.

- [ ] **Step 2: RED client sans resources.**

Appeler mcp_get_governed_context directement et obtenir la même projection essentielle que la ressource. Cela prouve que la garantie ne dépend pas du support resource du client.

- [ ] **Step 3: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedContextTools.test.ts
~~~~

- [ ] **Step 4: Implémenter et GREEN.**
- [ ] **Step 5: Rejouer Live State/tool contracts.**

~~~~bash
node --import tsx --test tests/governedContextTools.test.ts tests/liveStateTools.test.ts tests/toolClassification.test.ts tests/toolContractRegression.test.ts
~~~~

- [ ] **Step 6: Commits.**

- RED: test(governed-context): define MCP context surfaces
- GREEN: feat(governed-context): expose resource and read tools

### Task 11: Ajouter le WRITE gate shadow sans modifier les handlers existants

**Files:**
- Create: src/governance/scopedWriteGate.ts
- Create: tests/scopedWriteGate.test.ts
- Modify: src/server.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export type ShadowWriteDecision = {
  mode: 'off' | 'shadow';
  toolName: string;
  governedSessionId: string | null;
  currentStateVersion: number | null;
  acknowledgedStateVersion: number | null;
  activeLockConflicts: number;
  verdict:
    | 'off'
    | 'session_unbound'
    | 'context_unacknowledged'
    | 'state_version_stale'
    | 'lock_conflict'
    | 'shadow_ready';
};

export function decorateScopedWriteServer(
  server: McpServer,
  dependencies: {
    mode: 'off' | 'shadow';
    evaluate(extra: RequestHandlerExtra): Promise<ShadowWriteDecision>;
    record(decision: ShadowWriteDecision, outcome: 'succeeded' | 'failed' | 'cancelled'): Promise<void>;
    requestReconcile(): void;
  }
): McpServer;
~~~~

Règles d’implémentation V1 :

- Le proxy intercepte uniquement tool/registerTool sur l’objet remis à registerScopedWriteTools.
- Nom, description, raw schema, annotations et callback arity restent identiques.
- Le callback original est appelé une seule fois.
- Aucune décision shadow ne peut empêcher l’appel original.
- Le résultat retourné est la même référence que le résultat original.
- L’erreur levée est la même instance que l’erreur originale.
- Une erreur du journal/evaluator est catchée, loguée sans donnée sensible et ne change pas l’issue du handler.
- La décision shadow est enregistrée après que les contrôles/handler historiques ont produit leur issue; le gate ne se substitue donc pas à ENABLE_WRITE_TOOLS ou allow_write.
- Après succès uniquement, requestReconcile déclenche liveStateEngine.reconcileNow en fire-and-forget; le single-flight existant absorbe la concurrence.
- createGithubDeployRouter reçoit exactement les dépendances actuelles et n’est jamais enveloppé.

- [ ] **Step 1: RED délégation exacte.**

Tester success, Error, AbortError et erreur du journal. Compteur original toujours égal à 1; résultat/erreur identique.

- [ ] **Step 2: RED off/shadow.**

off n’écrit aucun événement; shadow journalise une décision. session absente, stateVersion périmé et conflit de lock restent non bloquants.

- [ ] **Step 3: RED contrats historiques.**

registerScopedWriteTools sur le serveur décoré doit encore correspondre au fixture historique exact.

- [ ] **Step 4: Exécuter RED.**

~~~~bash
node --import tsx --test tests/scopedWriteGate.test.ts tests/toolContractRegression.test.ts tests/toolClassification.test.ts
~~~~

- [ ] **Step 5: Implémenter et GREEN.**
- [ ] **Step 6: Rejouer toutes les régressions OIDC/deploy inchangées.**

~~~~bash
node --import tsx --test tests/githubOidc.test.ts tests/s1Deploy.test.ts tests/deployRoutes.test.ts tests/serverDeployRegistration.test.ts tests/deployWorkflow.test.ts tests/deployWorkflowShell.test.ts
~~~~

- [ ] **Step 7: Vérifier qu’aucun fichier OIDC/deploy n’a changé depuis la baseline.**

~~~~bash
git diff --exit-code eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2 -- .github/workflows/mcp-deploy.yml src/deploy
~~~~

- [ ] **Step 8: Commits.**

- RED: test(write-gate): define non-blocking shadow behavior
- GREEN: feat(write-gate): observe scoped writes in shadow

### Task 12: Ajouter maintenance événementielle et dashboard sans nouvelle autorité

**Files:**
- Modify: src/operationalMemory/maintenance.ts
- Create: src/governedContext/dashboard.ts
- Create: tests/governedDashboard.test.ts
- Modify: src/server.ts
- Modify: package.json

**Interfaces:**

~~~~typescript
export function renderGovernedContextDashboardSection(
  context: GovernedOperationalContext
): string;
~~~~

Le rendu affiche :
- Live State stateVersion/freshness/global;
- task et nextAction;
- nombre de sessions actives compatibles;
- locks actifs et expirations;
- PR/checks/reviews;
- mode off/shadow;
- blockers.

Toutes les chaînes sont échappées par escapeHtml. Aucun secret, resumeSecretHash, authInfo ou transport brut n’est accepté par le type de vue.

Maintenance :
- démarrage unique dans src/index.ts ou startHttpServer, selon le pattern Live State existant;
- intervalle 60 secondes;
- unref;
- expire sessions/locks;
- journalise uniquement les compteurs/IDs gouvernés;
- aucune collecte GitHub/SSH à chaque heartbeat;
- aucun changement de Live State stateVersion à cause d’une session ou d’un lock.

- [ ] **Step 1: RED rendu et sanitization.**
- [ ] **Step 2: RED maintenance single timer/unref et absence de Live State write.**
- [ ] **Step 3: Exécuter RED.**

~~~~bash
node --import tsx --test tests/governedDashboard.test.ts tests/governedSessionService.test.ts tests/governedLocks.test.ts
~~~~

- [ ] **Step 4: Implémenter puis GREEN.**
- [ ] **Step 5: Commits.**

- RED: test(governed-dashboard): define additive operational view
- GREEN: feat(governed-dashboard): expose bounded live context

### Task 13: Régression complète, documentation de livraison et draft PR

**Files:**
- Modify: package.json
- Modify: SUIVI.md
- Modify: TASKS.md
- Modify: TODO.md
- Modify: DECISIONS_LOG.md
- Modify: CHANGELOG.md
- Append only: ACTIVITY_LOG.md
- Modify: docs/governance/markdown-inventory.json

**Interfaces:**
- Aucun nouveau comportement; phase de preuve et consolidation.

- [ ] **Step 1: Vérifier le script de test.**

test:readonly-safety doit inclure tous les tests nouveaux sans retirer un test historique. Le workflow .github/workflows/mcp-ci.yml reste inchangé.

- [ ] **Step 2: Lancer la régression locale fraîche.**

~~~~bash
npm ci
node --import tsx --test tests/docGovernance.test.ts
node --import tsx --test tests/readOnlySafety.test.ts tests/mcpGitSync.test.ts tests/githubAuthorization.test.ts tests/toolClassification.test.ts tests/gitRegistryV2.test.ts tests/oauthLogRedaction.test.ts tests/runtimeAttestation.test.ts tests/liveStateReconcile.test.ts tests/liveStateStore.test.ts tests/liveStateCollectors.test.ts tests/liveStateEngine.test.ts tests/liveStateTools.test.ts tests/githubOidc.test.ts tests/s1Deploy.test.ts tests/deployRoutes.test.ts tests/serverDeployRegistration.test.ts tests/deployWorkflow.test.ts tests/deployWorkflowShell.test.ts tests/toolContractRegression.test.ts tests/operationalMemoryStore.test.ts tests/operationalEventJournal.test.ts tests/governedSessionService.test.ts tests/governedSessionTools.test.ts tests/governedLocks.test.ts tests/governedContextGithub.test.ts tests/governedContextService.test.ts tests/governedContextTools.test.ts tests/scopedWriteGate.test.ts tests/mcpAuthContext.test.ts tests/governedDashboard.test.ts
npm run typecheck
npm run build
npm run docs:check
npm run lint:secrets
git diff --check
~~~~

Expected: zéro fail/cancelled/todo/skipped; build et typecheck exit 0.

- [ ] **Step 3: Vérifier les invariants par diff.**

- main n’a pas bougé pendant la branche;
- aucun fichier src/deploy ou mcp-deploy.yml modifié;
- .mcp/autodeploy-policy.json inchangé et pushEnabled=true;
- ENABLE_WRITE_TOOLS et allow_write présents;
- fixture historique entièrement satisfaite;
- aucune suppression de fichier;
- ACTIVITY_LOG uniquement ajouté en fin;
- aucun secret via lint + revue manuelle;
- aucune occurrence persistée de mcp-session-id comme clé dans operationalMemory.

Commandes :

~~~~bash
git diff --name-status eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2
git diff --exit-code eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2 -- .github/workflows/mcp-deploy.yml src/deploy .mcp/autodeploy-policy.json
rg -n "ENABLE_WRITE_TOOLS|allow_write" src tests
rg -n "MCP-Session-Id|mcp-session-id|transportSessionId" src/operationalMemory
~~~~

La dernière commande peut trouver transportSessionId uniquement dans transportBindings et paramètres éphémères; aucun serializer/type persistant ne doit le contenir.

- [ ] **Step 4: Mettre à jour les documents avec le head de branche et les preuves réelles.**

Ne pas déclarer merge, autodeploy ou attestation avant leur observation. TASK-20260813-004 reste EN COURS avec prochaine action draft PR/review/CI.

- [ ] **Step 5: Commit de consolidation.**

~~~~bash
git add package.json SUIVI.md TASKS.md TODO.md DECISIONS_LOG.md CHANGELOG.md ACTIVITY_LOG.md docs/governance/markdown-inventory.json
git commit -m "docs: prepare governed session continuity review"
~~~~

- [ ] **Step 6: Pousser, attendre CI verte et auto-relire le diff complet.**

Créer ensuite une seule draft PR de mcp/session-continuity-v1-20260813 vers main. Ne pas la passer ready dans la même action.

- [ ] **Step 7: Review.**

- lire tous les threads;
- traiter uniquement les findings actionnables;
- chaque correction fonctionnelle reçoit un nouveau test RED;
- résoudre un thread seulement lorsque la correction est sur le head;
- relancer la régression complète;
- verrouiller l’exact head SHA.

- [ ] **Step 8: Ready et merge exact-head uniquement après autorisation et preuves.**

Conditions :
- CI validate success sur head exact;
- aucune dérive de main;
- tous les threads actionnables résolus;
- review conforme;
- aucun blocker STOP.

### Task 14: Autodeploy existant et attestation post-merge

**Files:**
- Aucun changement avant observation.
- Les documents ne sont actualisés dans un commit/PR ultérieur gouverné que si nécessaire et avec des faits observés.

- [ ] **Step 1: Observer les workflows push sans en modifier la définition.**

Exiger CI push success et workflow de déploiement non skipped.

- [ ] **Step 2: Avant toute opération bridge, appeler ping.**

Si ping échoue : BLOCKED_MCP, aucune inférence runtime.

- [ ] **Step 3: Attester sans écriture directe.**

- GitHub main = merge SHA;
- S1 HEAD = origin/main = merge SHA;
- branche main, working tree clean, diff empty;
- fetch read-only, push disabled;
- image OCI revision = merge SHA;
- conteneur running/healthy;
- endpoints health 200, OAuth metadata 200, MCP sans token 401;
- Live State CURRENT;
- le mismatch documentaire ne peut plus être ALIGNED;
- mcp_get_governed_context fonctionne depuis un nouveau transport;
- ouverture puis reprise légitime gardent le même governedSessionId;
- MCP-Session-Id change et ne devient pas l’identité durable;
- gate reste shadow;
- outil WRITE historique représentatif garde le même comportement, sans exécuter une mutation risquée non nécessaire.

- [ ] **Step 4: Vérifier rollback.**

Le rollback reste le mécanisme Autodeploy V1 existant. Le rollback fonctionnel des nouvelles fonctions consiste à MCP_GOVERNED_SESSIONS_ENABLED=false ou MCP_WRITE_GATE_MODE=off/shadow; aucun store plus récent n’est écrasé.

- [ ] **Step 5: Verdict final.**

Terminé uniquement si les 14 critères d’acceptation de la spec sont prouvés. Sinon reporter le statut exact, le blocker et la prochaine action unique.

## Matrice RED/GREEN et commits attendus

| Cycle | RED attendu | GREEN minimal | Commit GREEN |
|---|---|---|---|
| Documentation SHA | drift false au lieu de true | comparaison SHA explicite | fix(live-state): reject stale documentation sha |
| Store | module absent | JSON strict atomique 0600 | feat(operational-memory): add versioned atomic stores |
| Journal | module absent | append sérialisé + rotation | feat(operational-memory): add sanitized event journal |
| Reprise | nouvel ID ou preuve acceptée à tort | secret hash/principal stable | feat(session): add governed session continuity |
| Lifecycle | versions ignorées | transitions optimistes | feat(session): add lifecycle and checkpoints |
| Locks | conflit non détecté | TTL/conflit/renew | feat(locks): add bounded session locks |
| Outils session | surface absente | handlers bornés | feat(mcp-session): expose governed lifecycle tools |
| Contexte GitHub | vue absente | cache/read-only dégradé | feat(governed-context): compose bounded live context |
| Resource/tools | surface absente | instructions/resource/tools | feat(governed-context): expose resource and read tools |
| Gate shadow | handler altéré ou non observé | wrapper exact-once non bloquant | feat(write-gate): observe scoped writes in shadow |
| Dashboard | section absente | rendu échappé read-only | feat(governed-dashboard): expose bounded live context |

## Critères STOP exécutables

STOP immédiat avant modification si l’un des constats suivants apparaît :

1. Le correctif documentaire exige une nouvelle valeur d’enum Live State, un nouveau stateVersion ou le remplacement du collecteur.
2. Le SDK impose MCP-Session-Id comme clé persistante pour exposer un outil/resource.
3. La reprise ne peut être sécurisée sans faire du governedSessionId un secret.
4. L’intégration exige un argument nouveau dans un outil historique.
5. Le gate shadow ne peut pas garantir l’appel exact-once et la propagation de la même erreur/réponse.
6. Le gate doit envelopper createGithubDeployRouter ou le workflow OIDC.
7. Un store corrompu devrait être écrasé pour démarrer.
8. La journalisation nécessiterait des arguments, prompts, headers, tokens ou sorties brutes.
9. L’API GitHub requiert une permission d’écriture ou une pagination non bornée.
10. Le dashboard devrait forcer un SSH/GitHub à chaque affichage.
11. Une étape exigerait patch/build/restart direct S1 avant merge.
12. main ou la baseline runtime dérive d’une manière incompatible avec la branche.
13. La CI révèle une régression historique non causée par le test RED attendu.
14. La solution nécessite une base, un service ou un second MCP.
15. Une demande d’activation 2FA apparaît dans le chemin de livraison.

Rapport STOP obligatoire :

- preuve exacte;
- invariant affecté;
- fichiers/contrats concernés;
- pourquoi l’implémentation additive ne suffit pas;
- alternative backward-compatible;
- impact/risque/rollback;
- décision humaine requise avant reprise.

## Auto-revue du plan contre la spécification

- Governed Operational Context : Tasks 9, 10 et 12.
- governedSessionId durable distinct du transport : Tasks 5, 6 et 8.
- reprise légitime nouveau transport : Task 5.
- checkpoints : Task 6.
- locks : Task 7.
- stores /app/data atomiques 0600 : Task 3.
- journal JSONL sanitizé/rotation : Task 4.
- correction SHA documentaire TDD : Tasks 1 et 2.
- GitHub enrichi borné : Task 9.
- réconciliation événementielle + fallback conservé : Tasks 10 à 12.
- gate shadow après mécanismes existants, exact-once : Task 11.
- OIDC exclu : Global Constraints, Task 11 et régression Task 13.
- instructions/resources/outils : Task 10.
- dashboard additif : Task 12.
- non-régression des outils/schémas : Tasks 1, 8, 10, 11 et 13.
- PR/review/CI/merge exact-head/autodeploy/attestation : Tasks 13 et 14.
- 2FA exclue : Global Constraints et critère STOP 15.

## Règle d’exécution

Exécuter inline dans cette session avec superpowers:executing-plans et superpowers:test-driven-development. Ne déléguer à aucun sous-agent dans ce chantier. Après chaque GREEN poussé, attendre la CI du head avant de passer au cycle suivant; si la CI échoue pour une cause autre que le RED attendu, appliquer systematic-debugging et ne pas empiler de correction.
