# WT-MCP-GLOBAL-RECONCILIATION-20261121-01 — Carte des autorités documentaires

> documentType: `DOCUMENT_AUTHORITIES` ; ownerContinuityId: `WT-MCP-GLOBAL-RECONCILIATION-20261121-01` ; parentContinuityId: `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; projectUid: `WT-PROJECT-MCP-001` (identité documentaire candidate) ; repository: `Patricked-code/MCP`.
> Scope: `SUBWORKSTREAM` ; statut: DOCUMENTARY_CANDIDATE / CERTIFICATION_PARTIAL ; source de préparation: `c02af022a80c2f63b64599ef853237a932c1df23` ; mandat: [issue #441](https://github.com/Patricked-code/MCP/issues/441). Ne pas inférer une admission runtime, un ProjectRecord ou une permission.

## Autorités locales
| Type | Document de ce scope | Rôle |
| --- | --- | --- |
| MISSION | [MISSION](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__MISSION.md) | Mandat et périmètre — projection documentaire locale |
| DECISIONS | [DECISIONS](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__DECISIONS.md) | Décisions sourcées — projection documentaire locale |
| CONTINUITY | [CONTINUITY](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__CONTINUITY.md) | Continuité locale — projection documentaire locale |
| ROADMAP | [ROADMAP](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__ROADMAP.md) | Ordre de livraison — projection documentaire locale |
| IMPLEMENTATION_PLAN | [IMPLEMENTATION_PLAN](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__IMPLEMENTATION_PLAN.md) | Plan d'implémentation et certification — projection documentaire locale |
| SOURCE_OF_TRUTH | [SOURCE_OF_TRUTH](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__SOURCE_OF_TRUTH.md) | Sources de vérité et précédence — projection documentaire locale |
| DOCUMENT_AUTHORITIES | [DOCUMENT_AUTHORITIES](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__DOCUMENT_AUTHORITIES.md) | Carte des autorités documentaires — projection documentaire locale |
| AGENTS | [AGENTS](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__AGENTS.md) | Instructions de reprise — projection documentaire locale |
| MEMORY | [MEMORY](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__MEMORY.md) | Mémoire sourcée — projection documentaire locale |
| INTENTIONS | [INTENTIONS](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__INTENTIONS.md) | Intentions du propriétaire — projection documentaire locale |
| SUIVI | [SUIVI](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__SUIVI.md) | Suivi local — projection documentaire locale |
| TASKS | [TASKS](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__TASKS.md) | Unités documentaires REC — projection documentaire locale |
| TODO | [TODO](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__TODO.md) | Obligations ouvertes — projection documentaire locale |
| EVIDENCE_INDEX | [EVIDENCE_INDEX](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__EVIDENCE_INDEX.md) | Index de preuves — projection documentaire locale |
| ARCHITECTURE | [ARCHITECTURE](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__ARCHITECTURE.md) | Architecture de convergence — projection documentaire locale |
| CARTOGRAPHY | [CARTOGRAPHY](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__CARTOGRAPHY.md) | Cartographie des composants — projection documentaire locale |

## Autorités opérationnelles
| Objet | Source propriétaire | Critère |
| --- | --- | --- |
| Révision / CI / règles | GitHub exact HEAD, Actions/rulesets | concordance SHA et contenu |
| Déploiement / G1 | Live State, Governed Deploy, PRODUCTION_STATE.json | runtime healthy, preuve exacte et fraîche |
| Identité projet | GitRegistry / Project Binding | jointure repository numeric ID / scope attestée |
| Tâche / propriétaire | P2 Task Queue, Sessions, Locks | taskId, scope, révision, admission et owner |
| Mémoire et événements | Operational Memory / CUG | reçu propriétaire, version, déduplication |
| Programme | Backlog V2 / GWC / UAC | ordre et contrats, aucun droit implicite |
| Continuité | Dossier local, issue #441, SUIVI racine | checkpoint historique, lecture nouvelle et preuves réobservées |

Aucun registre opérationnel dupliqué. Les 16 fichiers ne contiennent que les projections de ce sous-chantier, pas une copie des stores ni un inventaire concurrent.
