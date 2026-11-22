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

## Extension de la même roadmap — usine logicielle, P10 à P17 (2026-11-21)

**Ce bloc complète P01–P09, il ne les remplace pas.** Ne pas marquer les lignes ci-dessous DONE sur la seule existence de code/plan. Référence détaillée : `__IMPLEMENTATION_PLAN.md` de ce chantier.

| Phase | IDs | Dépendance initiale | Critère de livraison | État au 2026-11-21 |
| --- | --- | --- | --- | --- |
| P10 | RG-036…039 | Audit P01, permissions GitHub/CUG vérifiées | Signalement par dépôt des services GitHub Insights, SBOM, sécurité, permissions et couverture | PLANIFIED / NON DEPLOYED |
| P11 | RG-040…042 | P10, architecture/ProjectReality | Carte de code et graphe d'impact sourcés au SHA, pas d'invention | PLANIFIED / NON DEPLOYED |
| P12 | RG-043…045 | P03–P07, C26/P2/UAC | Admission contrôlée, scheduler P2, idempotence, locks et droits réels | PLANIFIED / NON DEPLOYED |
| P13 | RG-046…048 | P12, attestation ressources S1 | Agent host isolé durable, restart et recovery testés | PLANIFIED / NON DEPLOYED |
| P14 | RG-049…051 | P13, règles GitHub réelles | PR/tests/review indépendantes/merge admissible/Deploy OIDC/G1/C27 | PLANIFIED / NON DEPLOYED |
| P15/P16 | RG-052…054 | P08/P10–P14 | Cockpit agents/runs/Insights/risques/continuity, droits et provenance | PLANIFIED / NON DEPLOYED |
| P17 | RG-055…056 | P13–P16 | Exécution réelle E2E attestée, crash/replay, observabilité, endurance et pilote cible | PLANIFIED / NON DEPLOYED |

**Priorités effectives** : clôturer les revues et CI sur #432/#434/#435 avec leurs propriétaires ; réduire le drift G1 et le 403 E2 par procédures existantes ; lancer l'inventaire GitHub Insights en lecture seule ; développer l'adaptateur de contexte et le worker C26/P2 uniquement après autorisation et dimensionnement. L'automatisation horaire conserve un filet de reprise, non une preuve de codeur 24 h/24.

## Alignement du sous-chantier autonome et de la source DOCX (2026-11-21)

Les **56 opérations RG-001…056** restent dans cette unique roadmap ; la source `Loop Engineering.docx` n'en crée pas de doublons. [Analyse intégrale](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md) ; [roadmap du sous-chantier](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__ROADMAP.md).

Nouveau critère obligatoire dans P11 : graphe d'architecture `composants/imports/API/infra` **distinct** du graphe du programme `intentions/lots/TASKS/prérequis/owners`, avec jointures attestées. Nouveau critère P12 : un codeur ne peut intervenir avant dossier d'impact/architecture/plan et une Task P2 admise. Nouveau critère P13 : machine indépendante de ChatGPT avec services UAES isolés et perte/restauration vérifiées. P14/P17 : différencier code GitHub, merge main, Deploy OIDC, runtime exact SHA, réconciliation G1 et certification C27.

**Dépendances communes non effacées** : PR #434 correction documentaire G1 non mergée ; E2 #359 POST HTTP 403 credential serveur ; PR #432 cockpit, #435 candidats CUG et #436 contrat Insights ouvertes sur branches. En attendant ces gates, l'audit de cartographie et les tests indépendants peuvent avancer sur des lots sans collision.

## Projection opérationnelle courante — 2026-11-22, après #442/#443

> Les tableaux historiques P01–P17 au-dessus restent des observations de leur date, **pas** des statuts live. Cette projection les complète sans les effacer. Elle ne crée aucun RG, tâche runtime ou autorité supplémentaire. À toute reprise, valider HEAD GitHub, S1, runtime, GitRegistry, installations CUG, ownership et preuves.

| Ordre | Lot existant / livrable vérifiable | Acquis au 2026-11-22 00:19 UTC | Écart / critère de clôture objectif |
| --- | --- | --- | --- |
| **1** | **P2 — identité, couverture et Project Binding (RG-001…012, 021/023, #420)** | #431 projection pure et #442 crosswalk déployés ; baseline GitRegistry V1 2 projets/6 repos/5 mappings/1 migration | Qualifier identité numérique repo, installations CUG, permissions, propriétaires, mapping `mcp-s1-production → mcp_bridge`, UID candidat `WT-PROJECT-MCP-001`, preuves et conflits ; aucun ProjectRecord ni mapping activé sans autorité |
| **2** | **P2 — reprise par Continuity ID (RG-011/019/023/027/034)** | Documents P1 #430 et historique D32/D35 présents ; lecteurs fédérés et Project Resolution existants | Lire à partir de l'ID mission les documents, décisions, roadmap, tâches, PR, sous-chantiers et dernier checkpoint ; jointures au ProjectRecord et installation uniquement si vérifiées ; API/lecteur MCP effectif et tests readback négatifs requis |
| **3** | **P3 — cockpit fédéré (RG-025…029, #432)** | PR ouverte, non attestée sur runtime | Rebaser/réconcilier sous propriétaire, fournir vues globale/projet/chantier, historiques DONE/CANCELLED/SUPERSEDED, filtres de scope, erreurs et preuves fraîches ; CI/revue indépendante sans Codex/deploy/G1 |
| **4** | **P4 — événement CUG → intention P2 (RG-013…020, RG-043…045, #435)** | Candidats d'intention proposés sur branche, pas d'admission attestée | Reçu signé, installation vérifiée, anti-replay, projet/mapping autorisé, mandat, task idempotente, sessions et locks ; aucun claim induit par événement |
| **5** | **P5/P10/P11 — Insights et dépendances (RG-036…042, #436)** | Observateur proposé en PR, non attesté sur runtime | Couverture GitHub réelle par dépôt, API 403/404 classées, identifiants stables, graphe code/services/plan distincts, jointures sourcées SHA ; lecture cockpit vérifiée |
| **6** | **P6/P7/P12…P17 — UAES, C26/C27, endurance (RG-043…056)** | Mandat et 13 documents du sous-chantier autonomie disponibles | Hôte isolé, Task P2 admise, ownership, quotas, revues indépendantes hors Codex, Governed Deploy, readback, crash/replay, rollback, endurance et certification C27 pilote ; aucune extension collective avant preuve |
| **7** | **RG-035 + RG-055/056 — clôture** | Pas de verdict de clôture global | Matrice RG-001…RG-056 avec statut, dépendances, preuve/CI/PR/SHA/Deploy/runtime, décisions et NEXT_ACTION ; `MISSION_DONE` uniquement après satisfaction de tous les critères |

### Prochain jalon concret P2 (critère PASS/FAIL)

Pour le cas `WT-MCP-REGISTRY-RESOLUTION-20261121-01`, obtenir une réponse de lecture reproductible associant **mission → corpus Markdown et derniers checkpoints → UID documentaire → ProjectRecord attesté → repository ID stable → installation CUG attestée → tâches et dépendances**, sans lien fabriqué. Les données insuffisantes doivent être marquées `UNVERIFIED`, `CONFLICT` ou `INACCESSIBLE`, avec provenance et date ; les confirmations de GitRegistry/CUG doivent provenir de leurs autorités. La fonction `missionIdentityCrosswalk` (#442) est une **primitive testée**, pas cette intégration complète.

**NEXT_ACTION_CURRENT :** commencer par les preuves Project Binding / CUG (P2), rapprocher les lecteurs existants à cette continuité, vérifier les branches propriétaires #420/#432/#435/#436 puis poursuivre leurs livraisons gouvernées. Respecter la décision D32, la capture D35 et la suspension temporaire Codex/automation portée au fichier des décisions. Ne pas activer un worker par anticipation.

### D37 — Critères P2/P3/P4 pour registres distincts par périmètre

| Lot existant | Contrôle de livraison ajouté (sans nouveau RG) |
| --- | --- |
| **P2 — R02/R03/R06, RG-008…024** | Pour chaque projet/sous-projet/mission, produire une identité propre et un index logique de ses `TASKS`, `TODO`, `SUIVI`, `DECISIONS`, `CONTINUITY` et checkpoints ; les tâches opératoires restent sous autorité de Governed Task Queue mais sont projetées par ownerScope/continuityId attesté. Vérifier le lien projectUid ↔ ProjectRecord ↔ repo ID ↔ CUG et les héritages parent/enfant. |
| **P2 — Attribution de tâches et NEXT_ACTION** | Qualifier les étapes d'intake/préflight/classification/plan/admission P2 et le terme ASQ avant implémentation. Chaque entité a son prochain acte admissible indépendant. Aucune priorité globale ne doit remplacer les next actions des missions ; blocage local ≠ blocage de toute l'usine. L'autorité globale préserve les dépendances entre Task IDs et les locks. |
| **P3 — Cockpit #432** | Navigation filtrée écosystème → projet → sous-projet → chantier/mission → tâches/checkpoints ; liens parent/enfant et références croisées, données sans fuite entre owners, NEXT_ACTION scope et état global séparés. |
| **P4 — CUG/P2 #435** | Pour chaque événement : identifier installation/repo/ProjectRecord/Continuity ID et owner ; créer seulement une intention candidate de ce périmètre, puis admission transactionnelle existante si autorisée, idempotente et sans collision. |
| **P5/P10/P11 — Insights** | Chaque observation conserve son dépôt/projet/chantier/scope et ses preuves ; les relations inter-projets sont typées et jamais assimilées à une identité unique. |

**Tests de recette transversaux D37 :** au moins deux projets distincts, deux missions d'un projet, sous-chantier avec checkpoint propre, tâche et `NEXT_ACTION` propres, tâche du programme central sans relation par défaut, dépendance explicitement inter-missions, événements concurrents/doublons, scénario `UNVERIFIED/CONFLICT`, et conservation des statuts terminales. Un `DONE` global ne peut jamais être induit d'un sous-chantier `DONE` ; un `NEXT_ACTION=null` d'une mission ne clôture pas son parent.

**NEXT_ACTION_CURRENT maintenue :** P2 et son identité vérifiée d'abord, puis index/documentation/tâches scoppés ; aucun remaniement de l'architecture des stores sans tests d'équivalence et décision de gouvernance. Référence D37 dans `__DECISIONS.md` et checkpoint homonyme dans `__CONTINUITY.md`.
