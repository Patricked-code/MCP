# L1 — Registre des registres du projet MCP

[← Racine](../README.md) · [Priorites des sources](SOURCE_PRIORITY.md)

**Objet :** repertoire **non autoritatif** de references et de responsables. Un index n'est pas une nouvelle base de donnees. Les mentions `MAIN` proviennent du depot; `PR DRAFT` est de la provenance **non fusionnee** ; `LIVE` exige observation du serveur.

| Famille | Source ou mecanisme | Autorite / portee | Etat de la reference |
| --- | --- | --- | --- |
| Identite projet | [`.mcp/manifest.json`](https://github.com/Patricked-code/MCP/blob/main/.mcp/manifest.json) | Description versionnee, pas identite GitHub prouvee | MAIN |
| Mapping depot/projet | [`data/mcp-git-registry.json`](https://github.com/Patricked-code/MCP/blob/main/data/mcp-git-registry.json), [`src/github/registry.ts`](https://github.com/Patricked-code/MCP/blob/main/src/github/registry.ts) | GitRegistry existant | MAIN |
| Instructions d'arrivee | [`AGENTS.md`](https://github.com/Patricked-code/MCP/blob/main/AGENTS.md), [`CLAUDE.md`](https://github.com/Patricked-code/MCP/blob/main/CLAUDE.md) | Agent/bootstrap | MAIN |
| Doctrine de verite | [`SOURCE_OF_TRUTH.md`](https://github.com/Patricked-code/MCP/blob/main/SOURCE_OF_TRUTH.md), [`ARCHITECTURE.md`](https://github.com/Patricked-code/MCP/blob/main/ARCHITECTURE.md) | Frontieres d'autorite | MAIN |
| Regles de non-regression | [`NO_REGRESSION_POLICY.md`](https://github.com/Patricked-code/MCP/blob/main/NO_REGRESSION_POLICY.md) | Contraintes | MAIN |
| Memoire fondatrice | [`memory/README.md`](https://github.com/Patricked-code/MCP/blob/main/memory/README.md), [`memory/manifest.json`](https://github.com/Patricked-code/MCP/blob/main/memory/manifest.json) | Archives et index, pas runtime | MAIN |
| Loop Engineering | [Master Plan juillet](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md), [Playbook](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md) | Origine de methode | MAIN/HISTORIQUE |
| Matrice exigences | [Matrice de tracabilite 20260702](https://github.com/Patricked-code/MCP/blob/main/memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md) | Sources/exigences/tracks historiques | MAIN/HISTORIQUE |
| Conceptions | [`docs/superpowers/specs/`](https://github.com/Patricked-code/MCP/tree/main/docs/superpowers/specs) | Specifications versionnees | MAIN |
| Plans d'implementation | [`docs/superpowers/plans/`](https://github.com/Patricked-code/MCP/tree/main/docs/superpowers/plans) | Plans lies aux designs | MAIN |
| Architecture GWC | [`docs/gwc/README.md`](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/README.md), [73 contrats](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/ARCHITECTURE_73_CONTRACTS.md) | Architecture de ce programme | MAIN |
| Graphe GWC | [`.mcp/gwc-workflow-graph.json`](https://github.com/Patricked-code/MCP/blob/main/.mcp/gwc-workflow-graph.json) | Graphe propre au GWC, pas universel | MAIN |
| Planification | [`ROADMAP.md`](https://github.com/Patricked-code/MCP/blob/main/ROADMAP.md), [`TASKS.md`](https://github.com/Patricked-code/MCP/blob/main/TASKS.md) | Programme et plan humain | MAIN |
| Program Backlog V2 | [`program-backlog-convergence.json`](https://github.com/Patricked-code/MCP/blob/main/docs/governance/program-backlog-convergence.json) | Readiness **planifiee**, non Task runtime | MAIN |
| Suivi humain | [`SUIVI.md`](https://github.com/Patricked-code/MCP/blob/main/SUIVI.md) | Journal documentaire | MAIN |
| Decisions | [`DECISIONS_LOG.md`](https://github.com/Patricked-code/MCP/blob/main/DECISIONS_LOG.md) | Decisions et arbitrages | MAIN |
| Historique actions | [`ACTIVITY_LOG.md`](https://github.com/Patricked-code/MCP/blob/main/ACTIVITY_LOG.md), [`CHANGELOG.md`](https://github.com/Patricked-code/MCP/blob/main/CHANGELOG.md) | Traces documentaires | MAIN |
| Memoire GWC | [`docs/gwc/canonical-memory/current.json`](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/canonical-memory/current.json) | Continuite **GWC seulement**, pas runtime | MAIN |
| Operational Memory | [`src/operationalMemory/`](https://github.com/Patricked-code/MCP/tree/main/src/operationalMemory) | Sessions, checkpoints, locks, journal et Task Queue | LIVE / code MAIN |
| Continuite E2 | [`e2EntryJournal.ts`](https://github.com/Patricked-code/MCP/blob/main/src/governance/e2EntryJournal.ts), [issue #359](https://github.com/Patricked-code/MCP/issues/359) | Entree E2, pas toutes les sessions | MAIN / GITHUB |
| Index de reprise E1/E2 | [`workEntryContinuityIndex.ts`](https://github.com/Patricked-code/MCP/blob/main/src/governance/workEntryContinuityIndex.ts) | Index derivé, sans admission | MAIN |
| Preuve serveur | [`src/liveState/`](https://github.com/Patricked-code/MCP/tree/main/src/liveState), S1/OCI | Version reellement executee et sante | LIVE |
| Etat GitHub | [depot](https://github.com/Patricked-code/MCP), [Actions](https://github.com/Patricked-code/MCP/actions) | Branche, SHA, PR, CI | LIVE |
| Carte architecturale unique | [PR #348](https://github.com/Patricked-code/MCP/pull/348) | Carte et doctrine **non fusionnees** | PR DRAFT |
| Arbre conversationnel profond | [PR #373](https://github.com/Patricked-code/MCP/pull/373) |  Arbre **documentaire** d'echange, pas Session | PR DRAFT |
| Nomenclature Global Work | [PR #374](https://github.com/Patricked-code/MCP/pull/374) | Index GWC/UAC/Backlog **non fusionne** | PR DRAFT |
| Index documentaire transversal | [PR #379](https://github.com/Patricked-code/MCP/pull/379) | 32 references, **provisoire** | PR DRAFT |
| Preuves historique de merges | [PR #371](https://github.com/Patricked-code/MCP/pull/371) | 186 PR historiques a son checkpoint | PR OUVERTE |
| UTL/reconciliation historique | [PR #372](https://github.com/Patricked-code/MCP/pull/372) | Matrice historique et rapprochements | PR DRAFT |
| Pilot E2 G2 discovery | [PR #369](https://github.com/Patricked-code/MCP/pull/369) | Extension en cours, pas runtime main | PR OUVERTE |

## Regle de consultation

Toute reference renvoie vers son autorite ; la racine n'en stocke pas une copie editable. Pour chaque interrogation : `source + revision/SHA + observedAt + statut de couverture + liens parent/enfant + raison si inconnu`. Les PR non fusionnees demeurent des **branches candidates**, jamais de l'etat `main`.

## Navigation

[Conception](../02-design/DESIGN_TRACEABILITY.md) · [Dependances](../03-planning/DEPENDENCIES.md) · [Continuites](../04-continuity/HIERARCHY.md) · [Preuves](../05-execution/PROOF_CHAIN.md).

## Raccord fondateur et runtime (candidat PR #389)

La [bibliothèque des sources de juillet](../09-foundations/FOUNDING_DOCUMENTS.md), [l'ordre documentaire initial](../09-foundations/ORIGINAL_READING_ORDER.md), le [workflow MCP_SELF](../10-orchestration/PROJECT_SELF_WORKFLOW.md), le [contrat d'autorisations](../10-orchestration/AUTHORIZATION_CONTRACT.md) et la [liaison S1/GitHub](../11-persistence/S1_GITHUB_INDEXATION.md) constituent une **vue de navigation**. Leurs versions documentaires ne deviennent pas propriétaires des sessions, comptes GitHub, tâches, secrets ou de l'état runtime.
