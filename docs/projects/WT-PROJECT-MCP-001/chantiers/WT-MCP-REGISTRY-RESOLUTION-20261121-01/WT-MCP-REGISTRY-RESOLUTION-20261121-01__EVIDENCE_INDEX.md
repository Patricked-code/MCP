# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Index de preuves de mission

> Ce document contient des **références** aux sources propriétaires, pas des attestions générées ni une copie des registres. Preuves datées et vérifiables à réobserver avant action ; `UNVERIFIED` si la source devient inaccessible.

| Référence | Autorité | Objet et statut historique | Limitation / relecture |
| --- | --- | --- | --- |
| [PR #430](https://github.com/Patricked-code/MCP/pull/430) ; [commentaire #7068870350](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350) | GitHub | Mandat R01–R07, dossier P1, ancrage source | Le statut initial Draft reste historique, non état live |
| [commentaire #7070637056](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7070637056) | GitHub | Audit P1→P2, écart ProjectRecord et sous-chantiers | Audit daté, pas clôture P2 |
| [PR #431](https://github.com/Patricked-code/MCP/pull/431) | GitHub/code | Projection fédérée read-only intégrée | Pas de résolution complète Continuity ID |
| [PR #442](https://github.com/Patricked-code/MCP/pull/442) | GitHub/code | Crosswalk Mission UID ↔ ProjectRecord, fusionnée à `0d7569e2d7f41596726fbcb76f42e471099c035c` | Ne migre ni n'active de mapping |
| [PR #443](https://github.com/Patricked-code/MCP/pull/443) ; [attestation #7071333389](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071333389) | GitHub/G1 | Synchronisation G1, dernier main/runtime observé historiquement `7f0ae4d35daec8d85a430b5280abd16eda6a42c8` | Refaire `mcp_reconcile_governed_context` avant toute assertion actuelle |
| [PR #420](https://github.com/Patricked-code/MCP/pull/420) | GitHub | Couverture installations CUG, Draft à la dernière observation | Ne certifie pas l'accès à tous les dépôts |
| [PR #432](https://github.com/Patricked-code/MCP/pull/432) | GitHub | Cockpit fédéré, ouverte | Non attestée sur runtime |
| [PR #435](https://github.com/Patricked-code/MCP/pull/435) | GitHub | Candidats d'intentions CUG, ouverte | Pas d'admission ou claim prouvés |
| [PR #436](https://github.com/Patricked-code/MCP/pull/436) | GitHub | Observateur Insights, ouverte | Pas de configuration/collecte live exhaustive attestée |
| [PR #389](https://github.com/Patricked-code/MCP/pull/389) | GitHub | Projet documentaire UID candidat | Pas ProjectRecord opérationnel attesté |
| [PR #444](https://github.com/Patricked-code/MCP/pull/444) ; [checkpoint #7071817713](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071817713) | GitHub/docs | Mise à jour D36/D37/D38 et index de mission | Branch-only tant qu'aucune fusion/readback n'est prouvée |
| [source analytique](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md) | Analyse documentaire | DOCX source SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548` | L'original binaire n'est pas publié ici |

## Évaluation de la preuve

`DECLARED` = source affirme ; `VERIFIED` = source propriétaire et version correspondantes contrôlées ; `UNVERIFIED` = contrôle absent/périmé ; `CONFLICT` = autorités contradictoires ; `INACCESSIBLE` = refus d'accès ; `SUPERSEDED` = preuve ancienne conservée avec successeur. Ne pas convertir une revue historique en approbation du dernier HEAD. Toute preuve CI/Deploy doit conserver son run ID, SHA, horodatage et résultats.

**NEXT_ACTION** : pour P2, ajouter à cet index les preuves de Project Binding, GitRegistry V2, installations CUG et lecture de continuité **après leur observation réelle**. Les liens futurs ne sont pas des preuves.
