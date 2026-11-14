# L6 — Histoire, chronologie et couverture des sources

[← Racine](../README.md) · [Continuites](../04-continuity/ROOTS_AND_CHECKPOINTS.md)

## Jalons sources, sans pretendre a l'exhaustivite

| Periode / jalon | Source | Ce que l'on peut retrouver |
| --- | --- | --- |
| Juillet 2026 | [memoire fondatrice](https://github.com/Patricked-code/MCP/blob/main/memory/README.md), [Master Plan 20260702](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md) | Besoins, inventaires, methode Loop Engineering et reprise |
| 02 juillet | [Matrice sources/exigences/tracks](https://github.com/Patricked-code/MCP/blob/main/memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md) | 15 exigences du corpus historique, sans certifier chaque exigence comme livree |
| Aout | [Live State design](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-08-09-live-state-v1-design.md), [Continuite Sessions](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-08-13-mcp-governed-session-continuity-v1-design.md) | Separation du runtime, de l'etat et des sessions |
| 22 aout | [Mandatory Bootstrap design](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-08-22-mandatory-agent-bootstrap-work-orchestration-v1-design.md) | Procedures d'entree et Task Registry |
| Septembre | [Design GWC](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-09-15-governed-workflow-contract-v1-design.md), [revisions GWC](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/REVISION_HISTORY.md) | Architecture, 73 contrats, evolution R1/R2/R3 |
| Octobre | [issue #235](https://github.com/Patricked-code/MCP/issues/235), [fil d'Ariane 20261016](https://github.com/Patricked-code/MCP/blob/main/docs/governance/agent-historical-continuity-breadcrumbs-20261016.md) | INTAKE et gouvernance historique |
| Fin octobre | [GD-U issue #349](https://github.com/Patricked-code/MCP/issues/349), [pilote E2 #359](https://github.com/Patricked-code/MCP/issues/359) | Programmes/continuities distincts |
| Novembre | [PR #371](https://github.com/Patricked-code/MCP/pull/371), [#372](https://github.com/Patricked-code/MCP/pull/372), [#373](https://github.com/Patricked-code/MCP/pull/373), [#374](https://github.com/Patricked-code/MCP/pull/374), [#379](https://github.com/Patricked-code/MCP/pull/379) | Archives de merges, matrices, arbre de conversations, Global Work et index documentaire : **PR candidates** |
| 09 novembre | [Merge PR #388](https://github.com/Patricked-code/MCP/pull/388) | `main@b2cdeaa116b22546ca15c2fb9fd6dcc7e215efb7` observe le 10/11 |

## Frontieres de connaissance

- L'issue #65 est un debut de **perimetre d'audit**, pas l'acte de naissance du projet.
- Les memoires du 02/07 reconnaissent des transcripts externes manquants : une reconstitution litterale integrale de tout ce qui s'est dit **n'est pas garantie**.
- PR #371/372 sont des travaux de source/provenance, a garder separes des premieres attestations runtime.
- PR #373 indexe des **nœuds documentaires** de conversation, non des sessions MCP.
- Aucun document de novembre ne doit etre traite comme une preuve de runtime du jour suivant.

## Controle de couverture historique

Pour un intervalle demande : (1) prendre les bornes UTC, (2) retrouver issues/PR/merges/CI, (3) retrouver decisions/documents, (4) retrouver la session ou le checkpoint si disponible, (5) joindre preuves, (6) afficher gaps, doublons et conflits.

Statuts possibles : `COVERED_VERIFIED`, `PARTIAL_SOURCES`, `SOURCE_NOT_ACCESSIBLE`, `CONFLICT`. La derniere date source ne signifie pas que toute la periode precedente a ete couverte.
