# MCP — Carte directrice unique : objectifs, architecture, histoire et reprise

> **Index documentaire NON AUTORITAIRE.** Cette page fédère les sources déjà versionnées ; elle ne remplace ni `main`, ni les autorités Governed Task Queue / Session / Locks, ni les attestations exact-SHA. Date de consolidation : 2026-10-23. Baseline observée : `main@a3df3b01f65cd6c212cf9948b68cd8531c6e76d5`. Toute affirmation de statut courant exige réobservation.

## 1. Racine et contrat de continuité

- **Seul ancrage directeur** : [issue #235, commentaire #6352010236](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352010236).
- **Addendum historique initial** : [#6352050351](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352050351).
- **Traces subordonnées, non concurrentes** : [#6352521624](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352521624), [#6352543890](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352543890), [#6352716263](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352716263) (PR #19–27), [#6352746353](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352746353) (PR #28–39).
- **Entrée agent existante** : [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md), [SUIVI.md](../../SUIVI.md), [README gouvernance](README.md), [fil d'Ariane inter-agents](agent-historical-continuity-breadcrumbs-20261016.md). Le commentaire [#6203867094](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6203867094) reste une directive historique de reprise, pas une seconde racine.

## 2. Objectif final et frontières

**Objectif** : converger vers un MCP gouverné, sûr, observable, récupérable et exploitable par plusieurs agents/clients autorisés, avec identités et tâches durables, mémoire, coordination, GitHub-first, OIDC, déploiement exact-SHA, rollback et preuves de fonctionnement. `GLOBAL_MCP_COMPLETE` exige une acceptation terminale démontrée, pas une simple PR fusionnée.

**Frontières** : uniquement `Patricked-code/MCP` ; ne pas confondre avec les autorités des autres dépôts/organisations. Pas de nouvelle Task, session, claim, queue ou permission créée par ce document. Pas d'écriture de code directement sur S1 ; GitHub → vérifications → déploiement gouverné. Réutiliser les capacités existantes avant de proposer un nouvel élément. Ne pas reprendre l'ownership des PR #207, #88–90 ou issues #262/#268 sans vérifier les autorités.

## 3. Mind map — navigation et dépendances conceptuelles

```mermaid
flowchart TD
  R["Issue #235 · racine documentaire #6352010236"]
  R --> H["HISTOIRE · décisions / commentaires / abandons"]
  R --> A["ARCHITECTURE CIBLE · 94 blueprints"]
  R --> P["PROGRAMME · PCM-00 à PCM-14 / GWB-00 à 09"]
  R --> O["AUTORITÉS LIVE · GitHub / Queue / Sessions / Locks / S1"]
  H --> H1["PR #1–64 · collecte partielle et liens de supersession"]
  H --> H2["Issue/PR #65+ · 6 lots archivés"]
  H --> H3["GWB-02 revues · GWB-03 triage"]
  A --> A1["Gouvernance / identité / ownership / anti-collision"]
  A --> A2["Operational Memory / BUS / reprise inter-agents"]
  A --> A3["GitHub OIDC / OAuth clients / API"]
  A --> A4["Live State / observabilité / déploiement exact-SHA"]
  P --> P1["Audit & réconciliation PCM-00..05"]
  P --> P2["OAuth / connexion PCM-06..08"]
  P --> P3["Exécution gouvernée PCM-09..11"]
  P --> P4["Cockpit / autonomie / acceptation PCM-12..14"]
  O --> O1["HEAD / PR / CI / Deploy"]
  O --> O2["Claims / scopes / locks / receipts"]
  O --> O3["Attestations runtime S1/Docker"]
```

Cette carte est **une navigation**, pas un nouveau schéma d'implémentation. Les frontières détaillées et les 94 éléments se trouvent dans [architecture-94-blueprint-crosswalk-20261009.json](architecture-94-blueprint-crosswalk-20261009.json), [Program Backlog V2](program-backlog-convergence.json) et [ARCHITECTURE.md](../../ARCHITECTURE.md). Ne pas confondre architecture cible historique et architecture actuellement certifiée.

## 4. Étapes chronologiques après la collecte documentaire

| Phase | Travail | Sortie exigée |
|---|---|---|
| 0 — PCM-00..01 | Reprise sûre ; consolider l'historique sans refaire les archives | Matrice de couverture et liens exacts |
| 1 — PCM-02..04 | Trier les constats contre le HEAD actuel ; certifier les 94 blueprints par preuves et tests ; dédupliquer les intentions | Matrice `DONE/PARTIAL/BLOCKED/UNKNOWN/SUPERSEDED`, écarts réels |
| 2 — PCM-05 | Réconcilier backlog, propriétaires, dépendances et verrous ; faire valider les lots admissibles | Plan de réalisation gouverné, sans queue parallèle |
| 3 — PCM-06..08 | Diagnostiquer et corriger OAuth/consentement/refresh déjà en cours ; tester Claude/ChatGPT | Preuves client et sécurité, sans réappropriation #207 |
| 4 — PCM-09..11 | Réobserver Queue/Session/Locks ; exécuter lots compatibles ; certifier tracing, Live State et déploiement | CI exact-head, reviews, Governed Deploy, attestations |
| 5 — PCM-12..13 | Cockpit Super Admin gouverné ; reprise et orchestration autonome multi-agents | Tests négatifs, concurrence, anti-doublons, permissions |
| 6 — PCM-14 | Acceptation intégrale et convergence finale | `GLOBAL_MCP_COMPLETE` uniquement sur preuves terminales |

**Source de l'ordre exact et des chevauchements autorisés :** [mcp-priority-convergence-map-20261015.json](mcp-priority-convergence-map-20261015.json). [Workblock GWB-00..09](governed-audit-continuation-workblock-20261009.json) et [Program Backlog](program-backlog-convergence.json) restent les détails de planning. Les phases ne constituent pas une barrière artificielle : audits indépendants et tâches déjà autorisées peuvent coexister sans collision.

## 5. Corpus historique et décisions abandonnées

| Sources | Ce qui est acquis | Lacunes à combler |
|---|---|---|
| [Chronologie #65+](architecture-chronology-issue65-20261009.json) et six lots `architecture-comments-batch01..06-20261009.json` | 208 entrées archivées à la date du lot | #1–64 ; conversations ultérieures ; liens vers versions retenues |
| [GWB-02](gwb02-review-coverage-manifest-20261015.json) | 135 PR, 282 inline, 215 soumissions de revue dans son périmètre daté | Commit comments non vérifiés ; résolution des fils non classée |
| [GWB-03](gwb03-pr-review-findings-triage-20261015.json) | 158 observations historiques P1/P2 | Résolution individuelle contre HEAD/tests/runtime |
| [Audit forensique août](../audits/2026-08-05/README.md) | Causes et décisions initiales | Relier aux PR et évolutions postérieures |
| [Traces #19–27](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352716263) | #19 gelée ; #20→#22→#26 ; #21→#25 ; #23→#27 ; preview non livrée | Revues complémentaires et preuves exactes de production |
| [Traces #28–39](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6352746353) | #33 gelée ; #34 réintégration ; #35–39 évolution gouvernée | Compléter commentaires/reviews, puis #40–64 |

**Règle de classification** : `DONE` seulement sur preuves du niveau visé ; `PARTIAL`, `DESIGNED`, `READY`, `BLOCKED`, `UNKNOWN`, `SUPERSEDED`, `ABANDONED_FOR_PRODUCTION`, `HISTORICAL_EVIDENCE` selon les sources. Une PR fermée sans fusion peut contenir une idée reprise ailleurs ; une CI verte ne prouve pas un déploiement.

## 6. Protocole de reprise et point d'arrêt

1. Lire **racine #6352010236**, puis la **dernière trace liée** sur #235, cette carte et les fichiers d'entrée.
2. Relever le HEAD GitHub, PR/CI/Deploy et les autorités runtime pertinentes. Toute photographie datée doit être revalidée.
3. Identifier la **dernière tranche vérifiée**, les sources exactes, les trous et l'ownership. Ne jamais ré-extraire les 6 lots #65+ ou GWB-02/GWB-03 sans delta identifié.
4. Continuer **PR #40–64** : descriptions, commentaires de conversation, reviews, fils et relations de supersession ; rapprocher `SUIVI.md`, audits et code. Ensuite combler les deltas #65+ post-baseline, branches et commentaires sur commits si accessibles.
5. Publier sur **issue #235** une trace subordonnée avec `ROOT`, `PARENT`, baseline SHA, périmètre, preuves URLs/IDs, `DONE/UNKNOWN`, décisions, limites, `NEXT_ACTION` et critère d'acceptation. Ne jamais présenter cette trace comme un second checkpoint directeur.
6. Après collecte, appliquer PCM-02..14 via **les autorités existantes**, avec revue, CI et attestations exact-SHA ; ne pas déclarer d'exécution sans preuve.

**Point d'arrêt de cette édition** : la carte est une **proposition documentaire sur branche**, non encore fusionnée ; son contenu n'est pas une validation de l'architecture cible complète ni une certification de l'état courant. **NEXT_ACTION :** revue indépendante de la carte et de ses liens, vérification CI, puis fusion gouvernée éventuelle ; continuer la collecte PR #40–64 sans collision documentaire.


## 7. Registre de provenance — PR #40–63 (lecture du 23/10/2026)

> **Portée et limites :** métadonnées et corps des 24 PR #40 à #63 relus directement via GitHub ; commentaires, reviews, fils inline, commits et état runtime présent **non exhaustivement vérifiés**. La mention « fusionnée » atteste seulement la fusion GitHub. Ne pas réutiliser les attestations historiques comme preuves live.

| PR | Classification documentaire et observation | Lien / successeur |
|---|---|---|
| [#40](https://github.com/Patricked-code/MCP/pull/40) | MERGED — état S1 bootstrap bloqué, divergence GitHub/S1 documentée ; pas d'alignement déclaré | #41–43 |
| [#41](https://github.com/Patricked-code/MCP/pull/41) | MERGED — force-recreate Docker, contrôle /health fail-closed | #42 |
| [#42](https://github.com/Patricked-code/MCP/pull/42) | MERGED — activation autodeploy, readiness polling borné | #43 |
| [#43](https://github.com/Patricked-code/MCP/pull/43) | MERGED — preuves du premier déploiement automatique ; attestation historique | #39–42 |
| [#44](https://github.com/Patricked-code/MCP/pull/44) | MERGED — Governed Session Continuity / Operational Memory V1 | #45 |
| [#45](https://github.com/Patricked-code/MCP/pull/45) | MERGED — corrections de rétention sessions/locks | #46–48 |
| [#46](https://github.com/Patricked-code/MCP/pull/46) | MERGED — réconciliation documentaire production PR #45 | #45 |
| [#47](https://github.com/Patricked-code/MCP/pull/47) | MERGED — correctifs tardifs sur expiration sessions/locks et cohérence S1 | #48 |
| [#48](https://github.com/Patricked-code/MCP/pull/48) | MERGED — réconciliation documentaire PR #47 | #47 |
| [#49](https://github.com/Patricked-code/MCP/pull/49) | MERGED — bootstrap agent obligatoire et orchestration, sans seconde autorité | #50 DUPLICATE |
| [#50](https://github.com/Patricked-code/MCP/pull/50) | CLOSED_UNMERGED — doublon exact de #49, ne pas compter comme livraison | #49 |
| [#51](https://github.com/Patricked-code/MCP/pull/51) | MERGED — attestation documentaire post-déploiement #49 | #49 |
| [#52](https://github.com/Patricked-code/MCP/pull/52) | MERGED — durcissement cycle de vie des tâches gouvernées | #53→#54 |
| [#53](https://github.com/Patricked-code/MCP/pull/53) | CLOSED_UNMERGED — candidat documentaire non livré, ascendance à ne pas reprendre | #54 |
| [#54](https://github.com/Patricked-code/MCP/pull/54) | MERGED — réconciliation documentaire propre après #52 | #53 remplacée |
| [#55](https://github.com/Patricked-code/MCP/pull/55) | MERGED — Unified Operational Work State, composition des autorités existantes | #56/#57→#58 |
| [#56](https://github.com/Patricked-code/MCP/pull/56) | CLOSED_UNMERGED — tentative documentaire de réconciliation, pas livraison | #58 |
| [#57](https://github.com/Patricked-code/MCP/pull/57) | CLOSED_UNMERGED — carrier documentaire remplacé sans nouveau périmètre fonctionnel | #58 |
| [#58](https://github.com/Patricked-code/MCP/pull/58) | MERGED — réconciliation documentaire de #55 | #56/#57 |
| [#59](https://github.com/Patricked-code/MCP/pull/59) | CLOSED_UNMERGED — carrier draft bootstrap, problème de mutation GraphQL Draft→Ready | #60 |
| [#60](https://github.com/Patricked-code/MCP/pull/60) | MERGED — automatic governed connection session binding, continuité du même candidat | #59 |
| [#61](https://github.com/Patricked-code/MCP/pull/61) | CLOSED_UNMERGED — carrier draft correctif transport/session revision | #62 |
| [#62](https://github.com/Patricked-code/MCP/pull/62) | MERGED — préservation révisions optimistes à travers changements de transport | #61 |
| [#63](https://github.com/Patricked-code/MCP/pull/63) | MERGED — réconciliation documentaire après déploiement bootstrap | #62 |

**Synthèse de provenance :** chaîne #40–43 (bootstrap/déploiement) → #44–48 (Operational Memory + rétention) → #49–54 (agent bootstrap / tâche gouvernée) → #55–58 (état opérationnel unifié) → #59–63 (connexion/session/transport). Cette chaîne est une **trajectoire documentaire**, pas une dépendance technique démontrée entre toutes les PR.

**Contrôles restant à faire :** (a) lire commentaires/reviews/fils/commits de #40–63 ; (b) identifier les décisions, objections et corrections non visibles dans les corps ; (c) rapprocher les attestations exact-SHA et le HEAD courant ; (d) prolonger la classification aux PR #64+, sans ré-extraire les lots déjà archivés ; (e) rapprocher les audits historiques de la matrice GWB et des 94 blueprints. Chaque UNKNOWN reste explicite.

**Trace de publication :** issue #235, sous l'ancrage #6352010236. Ce registre reste une proposition de la PR #348 tant que celle-ci n'est pas fusionnée.
