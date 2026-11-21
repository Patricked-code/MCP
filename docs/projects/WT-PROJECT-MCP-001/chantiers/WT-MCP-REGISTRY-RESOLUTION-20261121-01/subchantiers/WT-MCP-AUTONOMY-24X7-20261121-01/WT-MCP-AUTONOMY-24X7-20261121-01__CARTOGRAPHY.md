# Cartographie initiale observée — sous-chantier d'exécution
> Workstream `WT-MCP-AUTONOMY-24X7-20261121-01`, parent `WT-MCP-REGISTRY-RESOLUTION-20261121-01`. Les états marqués `DECLARED` ne sont pas des observations actuelles du runtime.

| Composant / portée | Chemin ou autorité vérifiée | Responsabilité et dépendance | État |
| --- | --- | --- | --- |
| MCP Entrée gouvernée | `Patricked-code/MCP/AGENTS.md`, `CLAUDE.md` | GitHub→MCP→Live State→G1→sélection | Code/docs présents |
| Project Binding / GitRegistry | `src/github/registry.ts`, `registryV2.ts` | Références projets/remote/server mappings | Code présent, activation V2 par cible non attestée |
| P2 Task Queue | `src/operationalMemory/taskQueue.ts`, `src/tools/governedTasks.ts` | Seule autorité de Task/claim | Code présent |
| Gouvernance sessions/locks | `src/operationalMemory/sessionService.ts`, `lockService.ts` et UAC | Own session, liveness et exclusion | Code présent |
| CUG receipts/webhook | `src/cug/webhook.ts`, `receiptConsumer.ts` | Observation événement vérifiable, sans permission | Code présent, multi-projet non certifié |
| Projection fédérée | `src/registryFederation/projection.ts`, `fromAuthorities.ts` | Projette sans remplacer les registres | PR #431 merge/OCI SHA `51a4fd1...` observé |
| Cockpit fédéré | PR #432, `/registry-cockpit` | Frontend projets/tâches/rapprochements | Branch only, non déployé |
| CUG candidats intentions | PR #435, `src/cug/federatedEventIntent.ts` | Candidate idempotente, sans admission P2 | Branch only, non déployé |
| GitHub Insights observateur | PR #436, `src/registryFederation/githubInsightObservations.ts` | SBOM, workflows, security, forks, permissions | Branch only, non connecté au runtime |
| GWC classification | `.mcp/gwc-precode-action-flow.json`, `src/governedContext/candidateContinuity.ts` | Ingestion/déduplication sémantique | Règles/code présents ; hôte autonome non attesté |
| Program selection | `MCP_AGENT_RULES.md` + Program Backlog V2 | `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` plan-only | Règle présente |
| C26 continuation | `scripts/mcp-autonomous-agent-continuation.mjs` | Ports P2 et host atomique | Contrat présent ; host durable live UNVERIFIED |
| C27 certification | `scripts/mcp-autonomy-e2e-certification.mjs` | Vrai cycle exact SHA avec readers | Code présent ; PASS live NON ATTESTÉ |
| UAES U02 | `chainsolutions-wealthtech/universal-agent-engineering-system/state/CURRENT_STATE.json` | Worker isolé, secrets, persistent state | `runtime_operational:false` dans état daté, U02 pending |
| Loop Engineering code engine | `chainsolutions-wealthtech/Loop/README.md` | Intelligence architecture/planification à intégrer | Initialisation documentaire d'après README |
| Deploy MCP | `.github/workflows/mcp-deploy.yml` | OIDC GitHub→S1 Docker Compose | Déployé pour PR #431 uniquement dans cette séquence, G1 drift |

## Graphes à construire sans les confondre
**Graph A Architecture :** modules/imports/API/routes/tables/infra/contrats/versions, reliés à un dépôt@SHA exact. **Graph B Programme :** projet→intention→chantier→décision→lot→task→PR→checks/deploy/continuity. **Join :** taskId↔componentRef (preuve, SHA, timestamp, confidence) et permission distincte de toute observation.

## Couverture, collision et next data
Observation à revalider : current main/S1/OCI `51a4fd1...` healthy, mais docs `5bc5e2b4...` => DOCUMENTATION_DRIFT ; G1 #434 ouvert non merged. E2 activation journal issue #359 refusée HTTP 403 credential serveur. Ne déduire aucun codeur permanent d'une automation ChatGPT horaire.

L'analyse de code exhaustive (module exports/imports, tests, migration/data/cron/lockfile, forks, SBOM, blast-radius et permissions) n'a **pas** encore été produite ou attestée ; `RG-040…042` reste ouvert. Cette cartographie initiale est un inventaire partiel, sans prétention d'exhaustivité.
