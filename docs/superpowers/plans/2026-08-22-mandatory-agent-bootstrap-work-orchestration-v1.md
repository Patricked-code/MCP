# Mandatory Agent Bootstrap & Work Orchestration V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir les moteurs MCP existants pour fournir à chaque connexion un inventaire courant, un receipt de bootstrap et une queue de travail gouvernée sans régression des contrats historiques.

**Architecture:** Live State reçoit des preuves globales dérivées, Governed Context les compose pour l’agent et Operational Memory porte Task ID/queue/receipt en réutilisant ses stores et son journal. Le catalogue est dérivé des registrations réelles et l’architecture du SHA S1, sans autorité parallèle.

**Tech Stack:** Node.js 20+, TypeScript ESM, MCP SDK 1.30.0, Zod, `node:test`, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-mandatory-agent-bootstrap-work-orchestration-v1-design.md`

## Global Constraints

- Baseline exacte : `78dade5e103c2ac73727f44c571f99384d6b8798`.
- Branche unique : `mcp/mandatory-agent-bootstrap-v1-20260822`.
- Aucun push direct sur `main`, aucune écriture directe S1.
- TDD RED→GREEN obligatoire pour tout comportement.
- Aucun changement des 92 contrats historiques, d’OIDC, Autodeploy, `ENABLE_WRITE_TOOLS`, `allow_write`, 2FA ou du mode `shadow`.
- Aucun prompt complet, token, credential, transport brut ou sortie brute persisté.
- Aucun nouveau moteur parallèle à Live State, Governed Context ou Operational Memory.

---

### Task 1: Catalogue dérivé des registrations

**Files:**
- Create: `src/currentState/toolCatalog.ts`
- Create: `tests/currentToolCatalog.test.ts`
- Modify: `src/server.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: appels SDK `tool`, `registerTool`, `registerResource`.
- Produces: `decorateRegistrationCatalogServer`, `getCurrentToolCatalog`, `resetToolCatalogForTests`.

- [ ] **Step 1: Écrire le RED qui capture deux outils, une ressource, leurs schémas et leur classification sans changer les retours SDK.**
- [ ] **Step 2: Exécuter `node --import tsx --test tests/currentToolCatalog.test.ts`; attendre `ERR_MODULE_NOT_FOUND`.**
- [ ] **Step 3: Implémenter le décorateur avec tri, JSON canonique, SHA-256, déduplication idempotente et conflit fail-closed.**
- [ ] **Step 4: Câbler `registerReadOnlyTools` sur la surface `read` et `registerScopedWriteTools` sur `scoped-write`, le gate historique restant autour du second décorateur.**
- [ ] **Step 5: Rejouer le test ciblé, `toolContractRegression` et `scopedWriteGate`; attendre zéro échec.**
- [ ] **Step 6: Commit `feat(current-state): derive catalog from MCP registrations`.**

### Task 2: Preuve read-only architecture, documents, audits et gouvernance

**Files:**
- Create: `scripts/current-state-evidence.mjs`
- Create: `tests/currentStateEvidence.test.ts`
- Create: `tests/fixtures/current-state-evidence-repo/` fixtures minimales
- Modify: `package.json`

**Interfaces:**
- Consumes: clone Git suivi au SHA courant.
- Produces: JSON schemaVersion 1 avec `architecture`, `documentation`, `audits`, `governance`, `testSuiteDigest`, `sourceDigest`, `contradictions`.

- [ ] **Step 1: Écrire le RED qui crée un dépôt fixture, exécute le script et attend modules/imports/routes/digests triés sans fichier écrit.**
- [ ] **Step 2: Vérifier RED avec `node --import tsx --test tests/currentStateEvidence.test.ts`.**
- [ ] **Step 3: Implémenter uniquement avec `fs`, `crypto` et `git ls-files`; interdire symlinks hors racine, fichiers non suivis, réseau et contenu de secrets.**
- [ ] **Step 4: Vérifier déterminisme, borne de sortie et contradictions pour fichier `.mcp` manquant.**
- [ ] **Step 5: Commit `feat(current-state): derive bounded repository evidence`.**

### Task 3: Enrichir Live State sans changer son autorité

**Files:**
- Modify: `src/liveState/types.ts`
- Modify: `src/liveState/collect.ts`
- Modify: `src/liveState/engine.ts`
- Modify: `src/liveState/reconcile.ts`
- Modify: `src/tools/liveState.ts`
- Modify: `tests/liveStateCollectors.test.ts`
- Modify: `tests/liveStateReconcile.test.ts`
- Modify: `tests/liveStateEngine.test.ts`
- Modify: `tests/liveStateTools.test.ts`

**Interfaces:**
- Consumes: catalogue en mémoire et JSON du script S1.
- Produces: sections additives `capabilities`, `governance`, `auditBaseline`, `inventory`.

- [ ] **Step 1: RED : un digest catalogue modifié incrémente `stateVersion`; `generatedAt` seul ne l’incrémente pas.**
- [ ] **Step 2: RED : collecteur absent produit sections `UNAVAILABLE` et contradiction bornée, jamais throw global.**
- [ ] **Step 3: GREEN : exécuter `node scripts/current-state-evidence.mjs` via `runReadOnlyCommand` et composer les observations.**
- [ ] **Step 4: Étendre résumé et outils sans modifier noms/schémas existants.**
- [ ] **Step 5: Rejouer toutes les suites Live State et contrats historiques.**
- [ ] **Step 6: Commit `feat(live-state): add current-state evidence digests`.**

### Task 4: Task Registry et Work Queue dans Operational Memory

**Files:**
- Create: `.mcp/task-registry.json`
- Create: `src/operationalMemory/taskQueue.ts`
- Create: `tests/governedTaskQueue.test.ts`
- Modify: `src/operationalMemory/types.ts`
- Modify: `src/operationalMemory/config.ts`

**Interfaces:**
- Consumes: seed versionné et atomic store existant.
- Produces: `reconcileIntent`, `claimNextTask`, `transitionTask`, `listVisibleTasks`, `getVisibleTask`.

- [ ] **Step 1: RED : seed idempotent, NEW_TASK ajouté après les tâches existantes, reprise sans doublon.**
- [ ] **Step 2: RED : dépendance non DONE => BLOCKED; scope actif => CONFLICT; priorité+séquence => claim de la tâche antérieure.**
- [ ] **Step 3: RED : transitions illégales et révisions périmées ne modifient pas le store.**
- [ ] **Step 4: GREEN : implémenter schémas stricts, writes atomiques, digests de prompt et événements sans résumé brut.**
- [ ] **Step 5: Rejouer atomic store, sessions, locks et queue.**
- [ ] **Step 6: Commit `feat(operational-memory): add governed task queue`.**

### Task 5: Bootstrap receipt lié à la session

**Files:**
- Modify: `src/operationalMemory/types.ts`
- Modify: `src/operationalMemory/sessionService.ts`
- Modify: `src/operationalMemory/operationalAudit.ts`
- Modify: `src/operationalMemory/eventJournal.ts`
- Modify: `tests/governedSessionService.test.ts`
- Modify: `tests/operationalEventJournal.test.ts`

**Interfaces:**
- Consumes: Live State enrichi lors de `acknowledgeContext`.
- Produces: `bootstrapReceipt` public sanitizé et événement `bootstrap.acknowledged`.

- [ ] **Step 1: RED : un store historique sans receipt reste lisible et acquittable.**
- [ ] **Step 2: RED : receipt contient versions/digests/limitations mais aucun secret, prompt ou transport.**
- [ ] **Step 3: GREEN : enrichir le schéma de manière backward-compatible et créer le receipt atomiquement avec l’acquittement.**
- [ ] **Step 4: Rejouer session, locks, journal et outils existants.**
- [ ] **Step 5: Commit `feat(bootstrap): attest governed context acknowledgement`.**

### Task 6: Current-State Inventory, intention et outils de queue

**Files:**
- Create: `src/currentState/service.ts`
- Create: `src/tools/currentState.ts`
- Create: `src/tools/governedTasks.ts`
- Create: `tests/currentStateTools.test.ts`
- Create: `tests/governedTaskTools.test.ts`
- Modify: `src/tools/readOnly.ts`
- Modify: `src/tools/governedContext.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Live State, catalogue, queue, session et request identity.
- Produces: ressource `mcp://wealthtech/current-state/inventory` et six outils additifs définis par la spécification.

- [ ] **Step 1: RED : ressource et outil read-only rendent la même projection bornée.**
- [ ] **Step 2: RED : mutations refusées sans session/receipt/révision; aucune écriture partielle.**
- [ ] **Step 3: GREEN : composer le service et enregistrer les outils sans `ENABLE_WRITE_TOOLS`.**
- [ ] **Step 4: Rejouer classification, contrats historiques et ressources Governed Context.**
- [ ] **Step 5: Commit `feat(bootstrap): expose inventory and governed queue tools`.**

### Task 7: Enrichir Governed Context et l’ordre de reprise

**Files:**
- Modify: `src/governedContext/types.ts`
- Modify: `src/governedContext/service.ts`
- Modify: `src/tools/governedContext.ts`
- Modify: `tests/governedContextService.test.ts`
- Modify: `tests/governedContextTools.test.ts`

**Interfaces:**
- Consumes: inventory, receipt, queue et tâches.
- Produces: `bootstrap`, `currentState`, `workQueue`, `currentTask`, `firstExecutableTask` et `nextAction` enrichis.

- [ ] **Step 1: RED : la priorité devient Live State → session → receipt → intention/queue → locks → CI/reviews → checkpoint.**
- [ ] **Step 2: GREEN : ajout de champs uniquement, limites explicites en cas de source dégradée.**
- [ ] **Step 3: Rejouer tout Governed Context et Live State.**
- [ ] **Step 4: Commit `feat(governed-context): compose mandatory bootstrap view`.**

### Task 8: Audit, WRITE gate shadow, onboarding et dashboard

**Files:**
- Modify: `src/operationalMemory/eventJournal.ts`
- Modify: `src/operationalMemory/operationalAudit.ts`
- Modify: `src/governance/scopedWriteGate.ts`
- Modify: `src/governedContext/dashboard.ts`
- Modify: `src/server.ts`
- Modify: `.mcp/onboarding.json`
- Modify: `.mcp/manifest.json`
- Modify: `MCP_ONBOARDING_ENGINE.md`
- Modify: `tests/scopedWriteGate.test.ts`
- Modify: `tests/governedDashboard.test.ts`

**Interfaces:**
- Consumes: receipt, tâche, baseline et contradictions.
- Produces: nouveaux verdicts shadow, instructions de connexion réelles et dashboard enrichi.

- [ ] **Step 1: RED : nouveaux verdicts restent non bloquants et handler historique appelé exactement une fois.**
- [ ] **Step 2: RED : dashboard échappe toutes les nouvelles chaînes et borne les listes.**
- [ ] **Step 3: GREEN : étendre le gate, les instructions et le rendu sans route HTTP fictive.**
- [ ] **Step 4: Rejouer OIDC/deploy et vérifier diff nul sous `src/deploy` et workflow.**
- [ ] **Step 5: Commit `feat(governance): observe bootstrap and task readiness`.**

### Task 9: Cartographies générées et garde CI anti-staleness

**Files:**
- Create: `scripts/check-function-cartography.mjs`
- Modify: `.mcp/function-cartography.json`
- Modify: `scripts/check-doc-governance.mjs`
- Create: `tests/functionCartography.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: registrations réelles avec WRITE activé dans un processus de capture sans handler.
- Produces: cartographie triée, digestée et vérifiée par CI.

- [ ] **Step 1: RED : la cartographie actuelle obsolète échoue avec tool count/digest divergents.**
- [ ] **Step 2: GREEN : générer le candidat depuis `buildMcpServer`, comparer strictement en check mode et écrire seulement avec `--write`.**
- [ ] **Step 3: Régénérer la cartographie et l’inventaire Markdown, puis vérifier aucun delta après seconde génération.**
- [ ] **Step 4: Commit `chore(governance): derive machine cartographies`.**

### Task 10: Preuves complètes, documentation et livraison gouvernée

**Files:**
- Modify: `SUIVI.md`, `TASKS.md`, `TODO.md`, `PRODUCTION_STATE.json`, `CHANGELOG.md`, `DECISIONS_LOG.md`
- Append only: `ACTIVITY_LOG.md`
- Modify: `docs/governance/markdown-inventory.json`

**Interfaces:**
- Consumes: résultats réels des Tasks 1–9.
- Produces: point de reprise, Draft PR et attestation finale.

- [ ] **Step 1: Exécuter installation fraîche, tests gouvernance, suite read-only complète étendue, typecheck, build, docs, secrets et `git diff --check`.**
- [ ] **Step 2: Vérifier 92 contrats historiques, aucun fichier supprimé, aucun diff OIDC/deploy/2FA, aucune donnée sensible.**
- [ ] **Step 3: Publier le head exact, créer une Draft PR, attendre CI push+PR et traiter tous les findings par TDD.**
- [ ] **Step 4: Passer Ready uniquement après CI exacte et revue sans finding critique/important; fusionner avec `expected_head_sha`.**
- [ ] **Step 5: Attendre CI main et Autodeploy exact-SHA; réattester GitHub/S1/OCI/runtime/Live State.**
- [ ] **Step 6: Si nécessaire, faire une PR documentaire de réconciliation séparée, puis réattester.**
- [ ] **Step 7: Créer le checkpoint final, libérer le lock et fermer la session.**
