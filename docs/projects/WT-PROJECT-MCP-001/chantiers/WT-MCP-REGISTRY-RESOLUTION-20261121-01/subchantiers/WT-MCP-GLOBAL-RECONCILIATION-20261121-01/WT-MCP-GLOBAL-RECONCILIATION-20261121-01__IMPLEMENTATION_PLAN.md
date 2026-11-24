# WT-MCP-GLOBAL-RECONCILIATION-20261121-01 — Plan d'implémentation et certification

> documentType: `IMPLEMENTATION_PLAN` ; ownerContinuityId: `WT-MCP-GLOBAL-RECONCILIATION-20261121-01` ; parentContinuityId: `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; projectUid: `WT-PROJECT-MCP-001` (identité documentaire candidate) ; repository: `Patricked-code/MCP`.
> Scope: `SUBWORKSTREAM` ; statut: DOCUMENTARY_CANDIDATE / CERTIFICATION_PARTIAL ; source de préparation: `c02af022a80c2f63b64599ef853237a932c1df23` ; mandat: [issue #441](https://github.com/Patricked-code/MCP/issues/441). Ne pas inférer une admission runtime, un ProjectRecord ou une permission.

## Contrat de mise en œuvre
Source détaillée : [checkpoint 7126852182](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7126852182). Chaque événement est lié à un scope, SHA, version, propriétaire, source et date. Inventorier Git/Markdown/JSON et classer les différences ; vérifier identité, dépendances, autorité, fraîcheur et état réel. Résoudre les obligations de lecture, calculer l'impact, rapprocher les champs et produire un candidat uniquement pour les changements démontrés.

## Publication Loopback
Réutiliser `deriveLoopbackCandidate`, `materializeLoopbackCandidate`, GW60/61 et GW62/63 ; garder G1 limité à PRODUCTION_STATE.json. En contexte workflow de main fiable, vérifier preuve de déploiement exact, G1 aligné, SHA base, digest candidat, issue/continuité, préservation de l'ancien bloc, déduplication événement/SHA, absence de collision, CI et règles GitHub. PR bornée à SUIVI.md, aucun accès implicite. Relecture après fusion ; retour NO_CHANGE sur auto-entretien. Toute preuve obsolète, HEAD changé ou journal inaccessible reste explicite.

## Extension de couverture
Brancher les lecteurs propriétaires existants d'Operational Memory, CUG et Program Backlog/GWC/UAC sur le collecteur actuel ; version, fraîcheur, empreinte, cohérence inter-sources, accès et refus explicites. Pour les 4 familles déjà observées, vérifier sémantiquement les jointures, non la seule présence des enregistrements. Construire les vérifications par champ/document sans convertir CONTENT_READ en attestation.

## Tests de sortie
RED/GREEN sur drift injecté, absence/rename, lecteur 403, stale, conflit de valeur, archive, PR concurrente, répétition, doc-only, rollback et nouvelle release. CI complète, identité des arbres, exact Governed Deploy, relecture des blobs et reprise par ID. Tester la garde de clôture sur les chemins réels ; deux cycles substantiels complets attestés. Aucun verdict exhaustif sur fixtures seules.
