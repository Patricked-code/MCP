# WT-MCP-GLOBAL-RECONCILIATION-20261121-01 — Index de preuves

> documentType: `EVIDENCE_INDEX` ; ownerContinuityId: `WT-MCP-GLOBAL-RECONCILIATION-20261121-01` ; parentContinuityId: `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; projectUid: `WT-PROJECT-MCP-001` (identité documentaire candidate) ; repository: `Patricked-code/MCP`.
> Scope: `SUBWORKSTREAM` ; statut: DOCUMENTARY_CANDIDATE / CERTIFICATION_PARTIAL ; source de préparation: `c02af022a80c2f63b64599ef853237a932c1df23` ; mandat: [issue #441](https://github.com/Patricked-code/MCP/issues/441). Ne pas inférer une admission runtime, un ProjectRecord ou une permission.

## Preuves de livraison et de reprise
| Objet | Source | Portée attestée |
| --- | --- | --- |
| #470 | [#470](https://github.com/Patricked-code/MCP/pull/470), [45371364677](https://github.com/Patricked-code/MCP/actions/runs/45371364677), [45372404556](https://github.com/Patricked-code/MCP/actions/runs/45372404556), [45372404391](https://github.com/Patricked-code/MCP/actions/runs/45372404391) | CI, merge, déploiement ; rapport artefact 14910676522, 6/6 MATCHED |
| #472 | [#472](https://github.com/Patricked-code/MCP/pull/472), [45373938920](https://github.com/Patricked-code/MCP/actions/runs/45373938920), [45373939000](https://github.com/Patricked-code/MCP/actions/runs/45373939000) | fusion G1 native, alignement v1557, candidat SUIVI READY (artefact 14910359128) |
| #473 | [#473](https://github.com/Patricked-code/MCP/pull/473), [45375111510](https://github.com/Patricked-code/MCP/actions/runs/45375111510), [45375124056](https://github.com/Patricked-code/MCP/actions/runs/45375124056), [45375504924](https://github.com/Patricked-code/MCP/actions/runs/45375504924) | publication du blob exact, réattestation v1562, anti-boucle (artefact 14910094809) |
| #474 RED/GREEN | [45375248309](https://github.com/Patricked-code/MCP/actions/runs/45375248309), [45375295452](https://github.com/Patricked-code/MCP/actions/runs/45375295452), [45375306876](https://github.com/Patricked-code/MCP/actions/runs/45375306876) | un échec attendu avant correction, 1641/1641 après |
| #474 alignée | [#474](https://github.com/Patricked-code/MCP/pull/474), [45376648194](https://github.com/Patricked-code/MCP/actions/runs/45376648194), [45376656209](https://github.com/Patricked-code/MCP/actions/runs/45376656209), [checkpoint 7129203526](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7129203526) | CI exacte, fusion et arbre identique ; production à réattester |
| Reprise par ID | [checkpoint 7128926524](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7128926524) | NOT_FOUND enfant ; parent PARTIAL, 17 documents |
| Mandat / historique | [issue #441](https://github.com/Patricked-code/MCP/issues/441), [MEMORY](WT-MCP-GLOBAL-RECONCILIATION-20261121-01__MEMORY.md) | décisions et checkpoints sources |

Artefacts : [14910676522](https://github.com/Patricked-code/MCP/actions/runs/45372404391/artifacts/14910676522), [14910359128](https://github.com/Patricked-code/MCP/actions/runs/45373939000/artifacts/14910359128), [14910094809](https://github.com/Patricked-code/MCP/actions/runs/45375504924/artifacts/14910094809). Les références sont historiques ; relecture et disponibilité à vérifier. Aucune preuve de certification exhaustive revendiquée.

## 2026-11-24 — Observation ultérieure et admission du dossier

- Source : [checkpoint 7129998632](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7129998632). Main/S1/runtime `ccb205b80ee0f4ddaf5fb8a6e5699650169cf958`, v1571 FULLY_ALIGNED, préflight sans blocage à 11:21:01Z ; observation à revalider à chaque reprise.
- Governed Deploy 45378897576 : attestation technique réussie, rapport documentaire bloqué sur G1 non vérifié au moment du workflow ; aucun verdict exhaustif. Cette différence temporelle reste à expliquer. Task réelle READY non attribuée.
- Dossier local admis en branche/PR GitHub-first ; préserver l'inventaire commun et les neuf PR historiques. **NEXT_ACTION** : vérifier la publication/CI et les protections, fusion admissible, déploiement et test réel de reprise par ID ; traiter ensuite le publisher et les vérifications sémantiques. Aucun DONE ni droit runtime implicite.
