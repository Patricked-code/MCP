# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Suivi opérationnel propre à la mission

> Ce suivi n'est **pas** le `SUIVI.md` global MCP. Il décrit la mission `WT-MCP-REGISTRY-RESOLUTION-20261121-01`, ses seules opérations RG, ses preuves, dépendances et priorités. État reconstitué à partir des sources GitHub consultées le 22/11/2026. L'état « main/S1/runtime fully aligned » est un **snapshot historique**, non une attestation perpétuelle.

## Tableau de pilotage courant (dernier contrôle documentaire 22/11/2026)

| Lot et portée | Livré/prouvé | Manque / gate | État |
| --- | --- | --- | --- |
| P1 — mandat R01–R07, RG-001…056 | #430 fusionnée et docs mission présents | Couverture universelle de tous les documents/identités et statuts live à certifier | `PARTIAL` |
| P2 — fédération GitRegistry, identités, Project Binding | #431 et #442 fusionnées ; crosswalk read-only, G1 #443 | Mapping `mcp_bridge`/UID candidat, ProjectRecord MCP, installation CUG, preuves de jointure et migration V1/V2 | `PARTIAL` |
| P2 — continuité documentaire et tâches par scope | D35/D37/D38, `__DOCUMENT_AUTHORITIES`, `__MEMORY`, `__INTENTIONS` et registres locaux proposés dans #444 | Lecteur MCP universel, indexs par mission, mise à jour automatique, cycle de priorité et readback non certifiés | `BRANCH_ONLY` |
| P3 — cockpit fédéré | #432 ouverte | CI/revue propriétaire hors Codex, intégration et preuve runtime | `NOT_DELIVERED` |
| P4 — CUG, intention, admission P2 | #420 Draft, #435 ouverte | Couverture par installation, permissions, déduplication, Task ID et autorisations réels | `NOT_DELIVERED` |
| P5 — Insights et dépendances | #436 ouverte | Observations live sourcées, intégration graphe et cockpit, CI/revue hors Codex | `NOT_DELIVERED` |
| P6/P7/P12–17 — UAES C26/C27 | Dossier enfant documenté (13 fichiers) | Hôte isolé, locks/session, boucle testée, restart/replay/rollback et certification | `NOT_CERTIFIED` |
| RG-035 / RG-055–056 — clôture | Checklist et critères dans plan | Matrice attestée pour toutes les RG et `MISSION_DONE` avec preuves | `OPEN` |

## Ordre de priorité courant, distinct des autres projets

1. **P2-1 / RG-001…012, 021/023** : obtenir les identités GitRegistry/Project Binding/CUG et classer les inconnues avec preuves.
2. **P2-2 / RG-011/019/023/027/034** : résoudre le corpus, intentions, tâches documentaires et checkpoints **de cette mission** par Continuity ID ; préserver D37, refuser les liens inventés.
3. **P2-3** : vérifier la PR documentaire #444 ; CI sur HEAD exact, revue indépendante sans Codex et fusion seulement si gouvernance le permet ; ne pas bloquer les travaux de P2-1/P2-2 en attente de la revue.
4. **P3–P5** : réconcilier les PR propriétaires #420/#432/#435/#436, tests et livraison progressive.
5. **UAES puis clôture** : démarrer uniquement après les permissions/gates et certifications nécessaires.

**Pourquoi cet ordre ?** Identités et permissions sont des prérequis pour des jointures sûres ; des registres documentaires sans identité attestée ne peuvent être autorité opérationnelle. D38 enrichit les critères P2, ne remplace pas P2 par une mission documentaire distincte.

## Variations de priorité et historique

| Référence | Ancienne prochaine action | Nouvelle prochaine action | Motif / résultat |
| --- | --- | --- | --- |
| D32 / [#7068870350](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350) | Parenthèse G1/E2 à résoudre | Reprise P2 GitRegistry/CUG | G1 ne remplace pas la mission mère |
| #442/#443, [#7071333389](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071333389) | Tester/déployer le crosswalk | Rapprocher ProjectRecords et CUG | Primitive livrée, intégration restante |
| D37–D38 / #444 | P2 identités et reprise globale | **P2 identités et reprise par scope**, avec journal d'intentions | Critères élargis, ordre principal conservé |

## NEXT_ACTION_CURRENT — scope mission

**Opération :** contrôler ProjectRecord/UID candidat/repository ID/installations CUG sous P2, puis spécifier/raccorder le résolveur read-only par Continuity ID existant. **Statut : READY_FOR_READ_ONLY_DISCOVERY** ; aucun Task ID runtime prétendu. **Blocages potentiels :** politiques GitHub bridge, installation CUG non vérifiée, droits/ownership/locks et absence de revue indépendante non-Codex pour certaines fusions.

## Protocole de tenue

Toute intention significative : `__INTENTIONS.md` → impact et décisions dans `__DECISIONS.md` → ordre `__ROADMAP.md` + journal de changement ici → action `__TASKS.md`/`__TODO.md` → preuve `__EVIDENCE_INDEX.md` → checkpoint `__CONTINUITY.md`. Aucune mise à jour live n'est automatique par la seule présence de ce fichier ; statut de PR et runtime doivent être relus.
