# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Travaux propres à la mission (hors Task Queue)

> **Mandat :** R01–R07, opérations RG-001…056, parent `Patricked-code/MCP`, scope `WT-MCP-REGISTRY-RESOLUTION-20261121-01`. Registre de **lots documentaires**. Les codes `REG-WP-*` ci-dessous ne sont **pas** des Task IDs runtime. Toute attribution `TASK-YYYYMMDD-NNN` exige une admission et une lecture explicites dans la Governed Task Queue.

## Travaux et dépendances — état documentaire au 22/11/2026

| Lot local | Ops RG (existantes) | Objet, lien de source | Dépend de | Fait attesté / reste à faire | État |
| --- | --- | --- | --- | --- | --- |
| `REG-WP-01` | RG-001…007 | Inventaire des autorités GitHub/CUG/GitRegistry ; [audit](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__COVERAGE_AUDIT.md) | Accès lecture aux sources propriétaires | Base 2 ProjectRecords/6 repos/5 mappings observée, couverture réelle CUG #420 encore à qualifier | `IN_PROGRESS` |
| `REG-WP-02` | RG-008…012, 021/023 | Vérifier project/repo/mapping UID et relations ; [PR #431](https://github.com/Patricked-code/MCP/pull/431), [#442](https://github.com/Patricked-code/MCP/pull/442) | `REG-WP-01` | Projection et crosswalk livrés ; jointure à installation/ProjectRecord MCP non démontrée | `IN_PROGRESS` |
| `REG-WP-03` | RG-011/019/023/027/034 | Résoudre documents, décisions, intentions, tâches et checkpoints par Continuity ID, avec une NEXT_ACTION par scope | `REG-WP-02`, carte des autorités D38 | Index documentaire/registre local dans [PR #444](https://github.com/Patricked-code/MCP/pull/444), **runtime non implémenté** | `PLANNED` |
| `REG-WP-04` | RG-013…020, 043…045 | CUG événements → intention candidate → admission P2 gouvernée ; [PR #435](https://github.com/Patricked-code/MCP/pull/435) | `REG-WP-01/02`, droits CUG, anti-replay | PR ouverte ; Task/claims runtime non attestés | `BLOCKED_ON_EVIDENCE` |
| `REG-WP-05` | RG-025…029 | Cockpit fédéré, filtre projet/mission, historiques et preuves ; [PR #432](https://github.com/Patricked-code/MCP/pull/432) | `REG-WP-02/03` | PR ouverte, livraison non attestée | `PLANNED` |
| `REG-WP-06` | RG-036…042 | GitHub Insights, code/services/travaux, scopes et preuves ; [PR #436](https://github.com/Patricked-code/MCP/pull/436) | `REG-WP-01/02`, accès GitHub | PR ouverte, couverture live non attestée | `PLANNED` |
| `REG-WP-07` | RG-043…056 | Certifier sous-chantier UAES 24×7, C26/C27, reprise et pilote | `REG-WP-03/04/06`, sécurité et C27 | Enfant documentaire disponible, worker non certifié | `BLOCKED_ON_DEPENDENCIES` |
| `REG-WP-08` | RG-030…035, 049…056 | Non-régression, CI, revue sans Codex, Governed Deploy/G1, preuves de clôture | Tous les travaux nécessaires et droits attestés | Réalisé **par lots** seulement ; clôture totale de mission non acquise | `IN_PROGRESS` |

## Contrat de task scoped

Pour toute future Task réellement admise et liée à cette mission, conserver : `realTaskId` (issu de la Queue ou `null`), `projectId/Uid` vérifiés ou `UNVERIFIED`, `continuityId`, `ownerScope`, `sourceIntentId`, `workPackageId`, `repositoryId`, `dependencies`, `session/locks`, `status`, `nextAction`, `evidenceRefs`, `observedAt`. Ne jamais écrire une Task ID fictive ou transformer un `REG-WP` en claim runtime. Une TASK du sous-chantier doit être indexée dans son propre `__TASKS.md` et seulement référencée ici comme dépendance.

**NEXT_ACTION_CURRENT :** poursuivre `REG-WP-01` et `REG-WP-02` en lecture, puis `REG-WP-03` ; revue/CI de la PR documentaire #444 en parallèle sans déplacer la priorité fonctionnelle. Voir `__SUIVI.md` pour motifs de classement et preuves.

## 2026-11-22 — D39 : correction des autorités de reprise (successeur)

> Complément des huit lots REG-WP existants, sans nouvelle Task Queue ni Task ID inventée. Les colonnes du tableau historique conservent leur vérité datée.

- REG-WP-03 / RG-011/019/023/027/034 : index documentaire #444 **MERGED**, premier résolveur #445 **MERGED et déployé**, deux appels froids **PARTIAL** ; cinq défauts en cours de correction dans #447 (CODE_BRANCH_ONLY). La qualification « runtime non implémenté » du tableau initial est désormais historique.
- REG-WP-01/02 : Project Binding, UID candidat, repository ID et installation CUG ne sont pas certifiés comme joints. Les 21 tâches visibles (révision 244) n'ont pas de relation de continuité démontrée à cette mission.
- REG-WP-04/05/06 : conserver les propriétaires #420/#432/#435/#436 ; reprise et jointures soumises aux preuves et à l'isolation.
- REG-WP-07/08 : enfant UAES, tests C26/C27 et clôture RG-001…056 non certifiés.
- **NEXT_ACTION_CURRENT (documentaire seulement)** : CI/tests #447 au HEAD final, recette MCP parent/enfant après déploiement gouverné ; ensuite jointures avec autorités runtime existantes.
