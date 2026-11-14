# L3 — Programmes, roadmap et graphe de dependances

[← Conception](../02-design/DESIGN_TRACEABILITY.md) · [Continuites →](../04-continuity/HIERARCHY.md)

## Ordre de dependances gouvernees

`Exigence/Design APPROVED → Programme → Chantier → Blueprint/Backlog → Readiness → Selection/Ownership → Gate d'admission → Travail GitHub ou runtime → CI → Deploiement → Preuve → NEXT_ACTION`.

C'est un **DAG** : les phases ne doivent pas etre globalement bloquees lorsqu'elles sont independantes ; un gate bloque seulement les travaux dont ses preuves sont des prerequis.

## Sources existantes, sans nouveau moteur

| Niveau | Reference | Limite |
| --- | --- | --- |
| Fondations | [Loop Engineering Master Plan 20260702](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md) | Historique |
| Programme MCP courant | [ROADMAP](https://github.com/Patricked-code/MCP/blob/main/ROADMAP.md), [Issue #235](https://github.com/Patricked-code/MCP/issues/235) | Verifier priorite actuelle |
| PCM et convergence | [Carte PCM](https://github.com/Patricked-code/MCP/blob/main/docs/governance/mcp-priority-convergence-map-20261015.json) | Projection de planning |
| Backlog V2 | [Program Backlog](https://github.com/Patricked-code/MCP/blob/main/docs/governance/program-backlog-convergence.json) | `READY` n'est pas `CLAIMED` |
| GWC | [GWC Architecture](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/README.md) + [Blueprints](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/BLUEPRINTS.md) | Programme specifique |
| Travail execute | GitHub (issues/PRs) et Governed Task Queue | Depends du mode d'entree |
| Global Work | [PR #374](https://github.com/Patricked-code/MCP/pull/374) | Index draft et non autoritaire |
| Carte directrice | [PR #348](https://github.com/Patricked-code/MCP/pull/348) | A examiner avant adoption |

## Familles de travail distinctes

- **MCP projet** : evolution du propre code du bridge, par GitHub → CI/revue → Governed Deploy MCP.
- **Governed Deploy Applications** : le bridge administre le deploiement d'autres projets, avec leurs depots et runtime propres.
- **OAuth P0** : suivi par [PR #207](https://github.com/Patricked-code/MCP/pull/207), ne pas revendiquer le claim d'une autre session.
- **Regulatory** : session et branche historiques independantes ; ne pas utiliser leur ownership comme admission automatique.
- **GWC**, **UAC**, **GD-U**, **E2** : programmes/fonctions distincts, ne pas merger leurs identites ou files.

## Contrat de dependance

Toute liaison explicite porte `sourceNode`, `targetNode`, `kind` (requires/blocks/produces/supersedes/related), `authority`, `evidence`, `observedAt`, `verificationStatus`. Un plan ne donne aucun droit d'execution.

### Preuve de sortie

Exemple : `CI_MAIN_PASS` ne prouve pas `RUNTIME_ALIGNED` ; il manque `DEPLOY_ATTESTATION`, `S1_SHA`, `RUNTIME_SHA` et `HEALTH`. Inversement, une divergence de runtime ne requalifie pas retroactivement une conception approuvee comme non approuvee.

[Chaine de preuves](../05-execution/PROOF_CHAIN.md).
