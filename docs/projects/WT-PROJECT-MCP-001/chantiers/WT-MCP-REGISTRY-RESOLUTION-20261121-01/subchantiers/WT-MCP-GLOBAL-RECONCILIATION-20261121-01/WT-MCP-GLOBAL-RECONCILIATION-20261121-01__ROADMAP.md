# WT-MCP-GLOBAL-RECONCILIATION-20261121-01 — Ordre de livraison

> documentType: `ROADMAP` ; ownerContinuityId: `WT-MCP-GLOBAL-RECONCILIATION-20261121-01` ; parentContinuityId: `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; projectUid: `WT-PROJECT-MCP-001` (identité documentaire candidate) ; repository: `Patricked-code/MCP`.
> Scope: `SUBWORKSTREAM` ; statut: DOCUMENTARY_CANDIDATE / CERTIFICATION_PARTIAL ; source de préparation: `c02af022a80c2f63b64599ef853237a932c1df23` ; mandat: [issue #441](https://github.com/Patricked-code/MCP/issues/441). Ne pas inférer une admission runtime, un ProjectRecord ou une permission.

## Ordre de reprise et jalons
| Jalon | Objet | État documentaire | Reste / preuve | Référence |
| --- | --- | --- | --- | --- |
| REC-00 | Inventaire et contrats existants | PARTIAL | Inventaire 968 objets / 456 candidats avant ce lot ; contrôles d'impact et d'autorités structurels attestés. Reste qualification sémantique de toutes sources. | [checkpoint 7128616972](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7128616972) |
| REC-01 | Enveloppe de preuve réutilisable | PARTIAL | Rapport par document et empreintes exactes livrés ; couverture champ/autorité/fraîcheur encore incomplète. | [checkpoint 7128310932](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7128310932) |
| REC-02 | Lecteurs et rapprochements | PARTIAL | Six comparaisons concordantes et quatre familles runtime observées ; trois familles sans observation dédiée. | [checkpoint 7129040041](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7129040041) |
| REC-03 | Admission et correction | PARTIAL | GitHub-first indépendant autorisé ; Task réelle non attribuée, claim ciblé non exposé, journal E2 403. | [checkpoint 7128154716](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7128154716) |
| REC-04 | Cycles de divergence réelle | PARTIAL | G1 auto #472 et Loopback #473 réattestés ; anti-boucle prouvée. Deux cycles exhaustifs sémantiques non attestés. | [checkpoint 7129040041](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7129040041) |
| REC-05 | Journalisation E2 | BLOCKED | HTTP 403 du journal #359 ; aucun reçu d'activation revendiqué. Corriger via autorité propriétaire. | [checkpoint 7128284956](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7128284956) |
| REC-06 | Plan commun et maintien documentaire | PARTIAL | SUIVI publié, #474 intégrée ; publisher automatique, rattachement local et couverture sémantique restent ouverts. | [checkpoint 7129203526](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7129203526) |
| REC-07 | Cockpit et certification | PARTIAL | Rapports existants et garde négative disponibles ; projection cockpit et transitions de clôture exhaustives à vérifier. | [checkpoint 7126852182](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7126852182) |

## Séquence de livraison
1. Réattester #474 et confirmer le mapping d'impact en production.
2. Finaliser le rattachement documentaire local (inventaire exact, vérification des PR concurrentes, CI, fusion et relecture). Rejouer le lecteur par Continuity ID ; signaler toute autorité encore non attestée.
3. Raccorder le publisher Loopback au pipeline existant GW60–63, sans élargir les permissions G1 ni créer un second moteur ; prouver déduplication, CAS, refus stale et préservation du texte.
4. Étendre les lecteurs manquants et les règles champ par champ ; faire converger tous les parcours d'entrée vers le plan commun.
5. Réparer le journal E2 par sa voie propriétaire et vérifier cockpit/transition terminale ; prouver deux cycles exhaustifs réels.

Cette séquence ne change pas l'ordre RG du parent ([WT-MCP-REGISTRY-RESOLUTION-20261121-01 — ROADMAP](https://github.com/Patricked-code/MCP/blob/c02af022a80c2f63b64599ef853237a932c1df23/docs/projects/WT-PROJECT-MCP-001/chantiers/WT-MCP-REGISTRY-RESOLUTION-20261121-01/WT-MCP-REGISTRY-RESOLUTION-20261121-01__ROADMAP.md)).
