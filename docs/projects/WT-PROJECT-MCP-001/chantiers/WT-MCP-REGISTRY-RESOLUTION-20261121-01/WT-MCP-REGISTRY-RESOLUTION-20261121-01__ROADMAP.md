# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Roadmap, tâches de mission et critères d'acceptation

> Plan documentaire de mission — **NON_AUTHORITATIVE**. Les étapes ci-dessous ne sont pas des Task IDs runtime. Les TODO/TASKS existants de chaque périmètre restent leur autorité documentaire.

## Chaîne d'interventions ordonnée

| Phase | Lot | Dépendances | Acceptation objective | Statut |
| --- | --- | --- | --- | --- |
| P01 | Audit de couverture GitHub/MCP/CUG/Project Binding/TODO/tasks | Accès GitHub et MCP lecture | Matrice de sources/provenances/risques, 2/6/5 et 21/31 expliqués | DRAFT SUR BRANCHE |
| P02 | Diagnostic accès GitHub MCP + G1 documentary drift | P01 | Code de rejet expliqué et testé, pas d'escalade ni bypass ; correctif doc/permissions gouverné si justifié | TODO |
| P03 | Schéma de projection fédérée et contrôles d'identité | P01/P02 | Types d'entité, clés stables, provenance/horodatage, conflits, droits, fixtures historiques | TODO |
| P04 | Pipeline CUG événement → observation vérifiée | P03 | signature, installation, replay 202/204, rejeu concurrent, erreurs et renames ; aucune mutation implicite | TODO |
| P05 | Raccordement à GitRegistry/Project Binding existants | P03/P04 + readiness V2 | Jointures vérifiées, NONE/AMBIGUOUS/UNVERIFIED, aucun ProjectRecord fantôme | TODO |
| P06 | Admission des tâches gouvernées et TODO/TASKS locaux | P05 | Intention idempotente → queue si autorisée ; sinon pending ; aucune second Task Queue/claim ; historique préservé | TODO |
| P07 | Cibles multi-dépôts et règles documentaires par projet | P05/P06 | Validation par cible, S1/S2, exact IDs, isolation TODO, GRT/GRGS/UAES/Loop consultés sans mutation croisée | TODO |
| P08 | Cockpit fédéré read-only (MCP/frontend existant) | P03–P07 | vues globale/dépôt/chantier, historique SUPERSEDED/DONE/CANCELLED, pagination, droits, preuve fraîche | TODO |
| P09 | Tests de non-régression + PR(s) + CI + revue + Governed Deploy | P04–P08 et G1 | tests verts, source SHA exact, merge autorisé, S1/runtime/health attestés, rollback et continuité | TODO |

**Ordre intangible :** pas de P04/P05/P06/P07/P08 avant la clôture prouvée du P01 et les gates correspondantes. La seule production de ce lot est le dossier d'audit sur branche.

## Modèle fédéré candidat — chaque relation vérifiable

`entityRef` :
- `entityType` : PROJECT / SUBPROJECT / REPOSITORY / WORKSTREAM / CONTINUITY / TASK / SESSION / BLUEPRINT / PR / CHECKPOINT / COMPONENT / DOCUMENT.
- `sourceAuthority`, `sourceId`, `stableId`, `ownerScope`, `observedAt`, `sourceVersion`, `sourceCommitSha?`, `verificationState`, `evidenceRef`.
- `relations[]` : `relationType`, `fromRef`, `toRef`, `observedAt`, `provenance`, `confidence`, `verificationState`.
- Aucun renommage d'identifiant existant ; alias/addition de jointures seulement ; `unknown`/nul pour les champs non prouvés.

Pour éviter la fausse autorité : le futur index est une **projection recalculable** ; les corrections sur les sources passent par leurs propriétaires, non par l'index. Interdire de déduire "DONE" d'un TODO coché ou "autorisée" de la visibilité GitHub seule.

## Tests exigés avant P09

1. Relecture des 21 tâches historiques, notamment 4 SUPERSEDED, sans altérer leurs identifiants/statuts.
2. Tests de provenance et de liens non résolus : UNKNOWN ne devient jamais VERIFIED sans autorité.
3. Deux événements identiques → une seule intention admissible ; même deliveryId/digest différent → CONFLICT ; crash/replay convergent.
4. Filtres de permissions par projet, installation CUG, confidentialité et identité ; pas de fuite inter-comptes.
5. Missing/renamed/transferred repository et doublons de noms → fail-closed, pas de mapping au hasard.
6. Absence de session, lock manquant, client non autorisé → aucune inscription exécutable ni mutation.
7. Vue cockpit incluant les états terminaux et les pages vides, pagination déterministe et tri stable.
8. Réconciliation HEAD GitHub/S1/runtime/doc, tests API et UI, revue indépendante et rollback vérifié.
9. Validation en lecture seule des TODO/TASKS de chaque cible, sans transformer des TODO documentaires en queue runtime.

## Coordination

Ne pas modifier les branches actives d'autres agents ; ne pas fusionner #389, #414 ou les chantiers CUG/GRT en cours par opportunisme. Réutiliser leur résultat dans des PR additives bornées. Aucun passage sur main ou déploiement hors admission gouvernée.
