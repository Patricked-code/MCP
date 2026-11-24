# WT-MCP-GLOBAL-RECONCILIATION-20261121-01 — Cartographie des composants

> documentType: `CARTOGRAPHY` ; ownerContinuityId: `WT-MCP-GLOBAL-RECONCILIATION-20261121-01` ; parentContinuityId: `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; projectUid: `WT-PROJECT-MCP-001` (identité documentaire candidate) ; repository: `Patricked-code/MCP`.
> Scope: `SUBWORKSTREAM` ; statut: DOCUMENTARY_CANDIDATE / CERTIFICATION_PARTIAL ; source de préparation: `c02af022a80c2f63b64599ef853237a932c1df23` ; mandat: [issue #441](https://github.com/Patricked-code/MCP/issues/441). Ne pas inférer une admission runtime, un ProjectRecord ou une permission.

## Composants constatés
| Composant | Rôle | État observé |
| --- | --- | --- |
| [scripts/current-state-evidence.mjs](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/current-state-evidence.mjs) | preuves d'inventaire | conflit corrigé, 6/6 observées |
| [scripts/documentary-hierarchy.mjs](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/documentary-hierarchy.mjs) | plan commun / impacts | #474 intégrée, réattestation à obtenir |
| [scripts/mcp-documentary-closure.mjs](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/mcp-documentary-closure.mjs) | verdicts et rapports | garde négative maintenue |
| [scripts/documentary-loopback.mjs](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/documentary-loopback.mjs) | génération candidat | READY et NO_CHANGE en production attestés |
| [scripts/mcp-g1-documentation.ts](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/mcp-g1-documentation.ts) | publication G1 | native #472 prouvée, bornée PRODUCTION_STATE.json |
| [scripts/mcp-g1-merge.ts](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/scripts/mcp-g1-merge.ts) | fusion G1 | CI/HEAD/règles/attestation native |
| [src/deploy/documentaryRuntimeEvidence.ts](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/src/deploy/documentaryRuntimeEvidence.ts) | lecteurs des autorités | 4/7 familles observées, sémantique ouverte |
| [src/tools/missionContinuity.ts](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/src/tools/missionContinuity.ts) | reprise par ID | enfant absent de l'inventaire avant cette préparation |
| [docs/governance/markdown-inventory.json](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/docs/governance/markdown-inventory.json) | inventaire Markdown | 265 entrées avant candidat, neuf PR historiques en recouvrement de fichier |
| [.github/workflows/mcp-deploy.yml](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/.github/workflows/mcp-deploy.yml) | Governed Deploy | technique et clôture séparées |

Cartographie du scope local, pas remplacement de la cartographie racine [MCP_FUNCTIONAL_CARTOGRAPHY.md](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/MCP_FUNCTIONAL_CARTOGRAPHY.md).
