# Gouvernance documentaire MCP

## GLOBAL WORK — Nomenclature des trois chantiers historiques (2026-11-05)

**Statut : index de navigation documentaire transversal, sans autorité opérationnelle.** Cette section distingue trois chantiers existants pour la reprise historique et l'organisation des travaux. « Global Work » est ici le nom de la section et du changement documentaire, **pas** un nouveau programme, une Task Queue, un Continuity ID, un owner, un claim ou un moteur d'exécution. La [directive globale de continuité #235](https://github.com/Patricked-code/MCP/issues/235) demeure l'ancre de programme ; l'[index de priorité PCM #294](https://github.com/Patricked-code/MCP/pull/294) et les autorités existantes gardent leur rôle.

| Chantier conservé | Finalité propre | Ancres vérifiables | Frontière d'autorité |
|---|---|---|---|
| **GWC** | Architecture, contrats, conception et validation du flux gouverné évolué, 18 blueprints `GWC-0..GWC-17` et travaux de candidate `GWC-PRE-*` | [PR #95](https://github.com/Patricked-code/MCP/pull/95) (PRECODE, fusionnée) ; [PR #354](https://github.com/Patricked-code/MCP/pull/354) (candidate, Draft observée au 2026-11-05) ; [flux PRECODE](../../docs/gwc/PRECODE_ACTION_TASK_FLOW.txt) | Les `GWC-PRE-*` sont des work items de conception/candidate, jamais des `TASK-*` runtime automatiques ; la candidate ne prouve pas à elle seule l'intégration production. L'expansion longue de « GWC » n'est pas attestée ici : ne pas l'inventer. |
| **UAC — Universal Agent Coordination** | Généralisation et observabilité de la coordination agent/session/claim/heartbeat à partir des autorités existantes | [PR #154](https://github.com/Patricked-code/MCP/pull/154) (fusionnée le 2026-09-24) | Projection de coordination en lecture seule ; ne crée ni Queue/Session/Lock/ownership parallèle ; un heartbeat STALE/UNKNOWN ne libère ni ne transfère un claim. |
| **Program Backlog V2** | Planification post-UAC, vagues W1 à W4, Work Items et Task Blueprints, dépendances, readiness et sélection déterministe du prochain candidat | [PR #171](https://github.com/Patricked-code/MCP/pull/171) (fusionnée le 2026-09-24) ; [projection machine](program-backlog-convergence.json), `projectionId=program-backlog-convergence-v2-20260924` | `DERIVED_NON_EXECUTABLE_PROJECTION` : `createsRuntimeTasks=false`, `replacesTaskQueue=false`. `READY` n'implique ni matérialisation d'une Task, ni claim, ni permission d'écriture. |

### Raccordement sans confusion des chantiers

- **GWC** décrit et vérifie le comportement des contrats et parcours ; **UAC** fournit l'observabilité de coordination en réutilisant les autorités existantes ; **Program Backlog V2** ordonnance les travaux admissibles. Ce sont **trois périmètres complémentaires**, pas trois nouvelles autorités runtime ni une chaîne de dispatch autonome démontrée.
- **Admission/exécution réelles** : conserver `Governed Task Queue`, `Governed Session`, claim/lock authorities, Operational Memory et contrôles de permissions. La politique demeure `RESUME_OWNED_FIRST → FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`, suivie d'une réobservation des autorités réelles et du HEAD exact avant toute écriture.
- **Cycle gouverné** : branche, RED/GREEN/régression, PR, CI exact-head, revue, fusion gouvernée, Governed Deploy si applicable, attestation, checkpoint, mise à jour du backlog. La présence des étapes dans une documentation n'est pas une preuve d'automatisation intégrale.
- **Blocages historiques à requalifier avant reprise** : `READY` sans claim/session/lock attesté ; décalage backlog/autorité runtime ; continuité après merge ; incidents de transport/deploy/S1. Un ancien blocker n'est pas automatiquement un blocker actuel. Ne jamais attribuer une tâche ou résoudre un conflit par inférence.
- **Chantiers adjacents et non fusionnés** : [GWB #275](https://github.com/Patricked-code/MCP/pull/275), audit/reprise `GWB-00..09`, fusionnée le 2026-10-15 ; [PR #372](https://github.com/Patricked-code/MCP/pull/372), matrice/contrats UTL historiques ; [PR #373](https://github.com/Patricked-code/MCP/pull/373), arborescence de continuité conversationnelle. Ce référencement ne modifie ni leur périmètre, ni leurs branches, ni leurs verrouillages de continuité.

**Règle de reprise GLOBAL WORK** : désigner explicitement le chantier concerné, relever ses identifiants et preuves existants, distinguer état historique et observation courante, vérifier le runtime lorsque nécessaire, puis consigner le checkpoint dans l'autorité déjà prévue. Aucun `GWC-PRE-*`, `UAC-*`, blueprint `TB-*` ou statut documentaire n'est promu artificiellement en `TASK-*`, Continuity ID, UTL canonique ou autorisation. Aucune clôture automatique par simple CI verte.

---

## GLOBAL WORK — Matrice de réconciliation et dispositif de suivi V1 (2026-11-05)

**Matrice lisible par machine (non exécutable) :** [global-work-reconciliation-matrix-v1.json](global-work-reconciliation-matrix-v1.json), versionnée dans **cette même PR #374**. Ce document recoupe **20 périmètres**, **94 Task Blueprints** provenant du Program Backlog V2, **25 PR ouvertes** et **77 issues ouvertes** observées lors du recensement GitHub. Parmi les issues, les demandes `MCP_READONLY_EVIDENCE_REQUEST` sont rangées comme **tickets de preuve** et non comme chantiers ; les trois issues historiques #2, #3, #32 restent explicitement `UNCLASSIFIED_LEGACY_TRIAGE` et ne sont pas effacées.

### Colonnes de pilotage et nature des preuves

| Niveau | Champs enregistrés | Ce que ces champs permettent et **ne** permettent **pas** |
|---|---|---|
| Chantier | `key` de navigation, ancres officielles, vraies références de continuité lorsqu'elles sont documentées, PR/issues liées | Reprendre le bon périmètre. La clé `key` **n'est pas** un Continuity ID, une Task ou un nouveau programme. |
| Planification | Work Items, IDs de blueprint, vagues/lots, dépendances, collision domains, readiness et raisons | Reconstruire l'ordre documentaire ; jamais déduire un owner/claim ou une permission de `READY`. |
| Exécution réelle | `actualTaskRefs`, `runtimeTaskId`, `sessionId`, `claimId`, `lockId`, `lastRuntimeVerification` | Tous les champs inconnus restent vides/`null` à ce stade : aucune introspection runtime live n'est attestée par cette matrice. |
| Blocages et avancement | Issues ouvertes comme **candidats**, `currentProgress=NOT_VERIFIED_FROM_RUNTIME`, dernier contrôle GitHub, prochaine observation | Ne pas transformer une issue historique, une PR Draft ou une absence de preuve en incident actuellement actif. |
| Handoff | Règles E1/E2/P2 et admission, CI, revue, déploiement et checkpoint distincts | Préparer une reprise gouvernée, **sans déclencher** de nouvelle Task, nouvelle UTL, PR, mutation S1/S2 ou fusion. |

### Protocole obligatoire de mise à jour

1. **OBSERVE** : comparer `main` exact, GitHub PR/issues, `program:readiness` / `program:next`, documents du programme, puis autorités runtime pertinentes lorsqu'une opération l'exige.
2. **RECONCILE** : distinguer faits confirmés, snapshots historiques, lacunes, collisions possibles et contradictions. Toute donnée inconnue reste `UNKNOWN`, jamais `DONE` ni `BLOCKED` sans preuve actuelle.
3. **LINK** : relier les références exactes à une seule autorité source, même lorsqu'elles apparaissent dans plusieurs chantiers ; suivre l'origine des preuves et les dates.
4. **ADMIT** : une sélection planning ne suffit pas. `RESUME_OWNED_FIRST`, dépendances, réelle Queue/Session/Claim/Lock, permissions, domaine de collision et HEAD exact doivent être vérifiés par les autorités propriétaires avant écriture.
5. **EXECUTE / VERIFY** seulement par les voies autorisées, puis conserver distincts résultats de tests, CI PR, revue, merge, CI main, Governed Deploy, attestation runtime, `UTL_OUT` et `T_OUT`.
6. **CHECKPOINT / RECOMPUTE** : enregistrer le nouveau niveau de preuve, les blocages réels, la prochaine action réellement admissible. Ne supprimer aucune source historique ; une correction est tracée comme nouvelle version.

**Périmètre temporel :** le fichier Backlog porte sa propre baseline de septembre, alors que le recensement de PR/issues date du **5 novembre 2026**. Les **36 DONE / 18 READY / 28 BLOCKED / 7 DEFERRED / 5 CONDITIONAL** sont les statuts du snapshot de planification, **pas** une photographie de la Task Queue ni des activités S1/S2 actuelles.

**Interdiction de fusion sans autorisation** : la PR #374 et les PR propriétaires #373 et #372 doivent rester non fusionnées tant que le propriétaire n'a pas expressément donné son accord. Aucune CI verte ni revue n'emporte cet accord à elle seule.

---

## GLOBAL WORK — Réconciliation approfondie des continuités et registre Deploy (2026-11-05)

Les trois projections sont **documentaires, horodatées, non exécutables** et réutilisent les sources propriétaires. Elles servent à ne plus perdre les chantiers, leurs références, ni leurs lacunes de preuve :

- [global-work-continuity-discovery-v2.json](global-work-continuity-discovery-v2.json) — racines de continuité issues de [#349](https://github.com/Patricked-code/MCP/issues/349) et [#359](https://github.com/Patricked-code/MCP/issues/359), **7 checkpoints locaux** originaux du dossier [PR #356](https://github.com/Patricked-code/MCP/pull/356), provenance des IDs et écart d'observation avec la découverte E2.
- [global-work-operational-progress-v2.json](global-work-operational-progress-v2.json) — **20 chantiers** rapprochés de la Task Queue MCP réelle, **21 Tasks** à une observation (14 DONE / 4 SUPERSEDED / 3 READY), 16 tâches rapprochées de 9 rubriques et **5 conservées non mappées**. Le rapprochement par intentKey reste un lien documentaire, pas l'ownership runtime.
- [PR #372 — couverture des **11 familles** de modifications de production](https://github.com/Patricked-code/MCP/blob/audit/mcp-historical-merge-traceability-20261103/docs/audits/utl-reconciliation/PR372_PRODUCTION_CHANGE_SOURCE_COVERAGE_V01.json) — S1 MCP, S1/S2 applications, Plesk/DNS/TLS, bases, configuration, opérations manuelles, rollbacks et canaux SSH ; preuve réelle inconnue pour les familles non couvertes, sans conclure à zéro changement.
- [PR #372 — registre historique des événements de déploiement](https://github.com/Patricked-code/MCP/blob/audit/mcp-historical-merge-traceability-20261103/docs/audits/utl-reconciliation/PR372_DEPLOYMENT_EVENT_REGISTRY_V01.json) — **186 PR fusionnées**, 171 workflows Deploy observés (**165 SUCCESS, 6 FAILURE**) et 15 PR sans Deploy trouvé ; 7 jobs de ces 165 ont une preuve de message terminal exact SHA directement lue dans GitHub Actions ; aucune preuve indépendante des anciens fichiers d'attestation S1 ni de la différence de production avant/après. **Seule PR #372 porte les preuves de déploiement et leur base SQLite analytique**, PR #374 n'en duplique pas l'autorité.

### Périmètres découverts qui n'étaient pas explicites dans les 20 rubriques

| Sujet retrouvé | Source originale | Classement préservé |
|---|---|---|
| **S1 recovery / forensics ancien** | [Issue #32](https://github.com/Patricked-code/MCP/issues/32) | Sous-chantier historique à réconcilier avec l'état actuel, **pas** nouvel incident ni permission de recovery |
| **Accès organisation GitHub** | [Issue #2](https://github.com/Patricked-code/MCP/issues/2) | Blocage historique GitHub ; les anciennes mentions Codex ne justifient ni l'utiliser ni le réactiver |
| **Inventaire privé et approbation opérateur** | [Issue #3](https://github.com/Patricked-code/MCP/issues/3) | Gate historique S1/S2 et déploiement applications ; preuves sensibles uniquement hors Git |
| **Décision B3.2 sur la cible serveur** | [Issue #220](https://github.com/Patricked-code/MCP/issues/220) | Intake propriétaire existant intégré au Backlog, pas nouveau programme |
| **Politique PROGRAM_AUTO_CONTINUE sans Human Gate arbitraire** | [Issue #221](https://github.com/Patricked-code/MCP/issues/221) | Politique existante sous Dispatch et Program Backlog V2 |
| **165 outils MCP additionnels GD-U** | [Issue #349, décision propriétaire](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6530080412) | Exigence propre au chantier GD-U ; à comparer par outil aux capacités réellement enregistrées et appelables, **sans confondre avec les 165 workflows Deploy historiques SUCCESS** |

L'issue [#349](https://github.com/Patricked-code/MCP/issues/349) porte la racine documentaire existante `GD-U-CONT-20261030-ROOT-01`; la continuité `GD-U-02D-CONT-20261029-B3I-ROOT-01` reste **fille**, tandis que le registre `MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028`, la méthode `GD-U-METHOD-20261028-01` et l'action `GD-U-355-P1-BOOTSTRAP-RECEIPT-ATTESTATION` ne deviennent **ni racines nouvelles, ni TASK-\* runtime**.

**Écart de découverte à vérifier** : l'outil E2 `mcp_e2_list_continuities` a renvoyé seulement l'ancrage historique de l'issue #359, alors que l'issue #349 et la PR #356 établissent l'autre racine. Le statut technique de la découverte E2 est donc **PARTIAL / TO_RECONCILE**, pas « root supprimé ».

**Production** : l'existence d'un merge et d'une CI réussie ne prouve pas une modification de production. Les canaux applicatifs S1/S2, Plesk, DNS, bases, tâches de maintenance et opérations manuelles ne sont **pas inclus** dans les 171 observations MCP issues de PR #371 ; un audit dédié doit préserver leurs preuves réelles et ne jamais les inventer.

**Interdiction de fusion** : PR #372, #373 et #374 restent Draft jusqu'à un **nouvel accord explicite du propriétaire**, indépendamment de la réussite des tests ou des demandes d'autres agents.

---

## GLOBAL WORK — Observation MCP runtime en lecture seule (2026-11-05)

**Source vérifiée par le MCP connecté** : [global-work-live-observation-20261105.json](global-work-live-observation-20261105.json). Lecture de `mcp_get_current_state_inventory` au **2026-11-05T02:35:28Z**. Ce fichier est une **observation horodatée, non une autorité durable ni un verdict présent à toute date future**.

| Objet | Observation directe, bornée | Limite d'interprétation |
|---|---|---|
| GitHub main, dépôt S1 et runtime MCP | SHA identique `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`, worktree S1 clean, conteneur healthy | Ne valide aucune PR Draft ni déploiement futur. |
| Governed Task Queue | Révision `244`, **21 Tasks** : **14 DONE, 4 SUPERSEDED, 3 READY** | Différent des 94 Blueprints planning. Un `READY` runtime ne constitue pas un claim. |
| Première tâche exécutable signalée | `TASK-20260929-001`, `READY`, OAuth attempt correlation A3.2 | Référence réelle existante ; **aucun claim ni écriture effectué ici**. |
| Governed Sessions visibles dans l'inventaire | 31 enregistrements : 28 CLOSED, 2 EXPIRED, 1 ACTIVE | Session ACTIVE ne prouve pas à elle seule liveness, propriété d'une tâche ou WRITE permission. |
| Coordination de la session courante | Liveness `STALE` ; aucun lock dans **cette projection de coordination** | N'implique ni libération/vol d'un claim, ni absence mondiale de locks ; aucune mutation. |

Trois Task runtime `READY` sont observées dans le snapshot : `TASK-20260920-003` (Stablecoin/S2), `TASK-20260929-001` (OAuth A3.2), `TASK-20261027-001` (Regulatory/S1). Aucune n'a été revendiquée. Le lien de `TASK-20260929-001` avec le blueprint `TB-W3-A3-02` est **un rapprochement par intentKey** à confirmer sous les autorités existantes, pas une attribution nouvelle.

**Règle :** conserver deux colonnes distinctes, `backlogPlanningReadiness` (projection historique) et `runtimeTaskStatusObservedAt` (lecture datée). Avant de décider un travail admissible, relire les autorités live, appliquer owned-first/collision scopes, vérifier source et contrôle de la session concernée, et ne jamais réclamer génériquement une tâche possédée par un autre chantier.

---

## GLOBAL WORK — Autres chantiers retrouvés et liens de reprise (2026-11-05)

**Nature : inventaire de navigation SOURCÉ, non exécutable, complémentaire aux trois périmètres GWC/UAC/Program Backlog V2 ci-dessus.** Les libellés ci-dessous sont des **regroupements fonctionnels de références existantes**, et non des identifiants officiels, nouveaux programmes, nouvelles Tasks ou nouveaux propriétaires. Les PR et issues sont des ancrages historiques ; leur état doit être réobservé avant tout claim, travail ou décision de merge. Les requêtes ouvertes de type `MCP_READONLY_EVIDENCE_REQUEST` sont des supports de preuve, **pas** autant de chantiers.

### A — Programmes, chantiers d'intégration et capacités techniques

| Périmètre retrouvé | Autorité / source historique | PR, sous-chantiers et frontière | Reprise / point de contrôle |
|---|---|---|---|
| **Finalisation continue et supervision MCP** | [Intake maître #235](https://github.com/Patricked-code/MCP/issues/235), [carte PCM-00..14, PR #294](https://github.com/Patricked-code/MCP/pull/294) | Programme transversal préexistant ; ne remplace pas le Backlog V2. | Vérifier readiness et `RESUME_OWNED_FIRST` ; critère terminal global seulement avec acceptation E2E prouvée. |
| **Entrées E1/E2, Bloc 1 et reprise des continuités** | [Pilote #359](https://github.com/Patricked-code/MCP/issues/359), `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` ; [PR #360](https://github.com/Patricked-code/MCP/pull/360), [#365](https://github.com/Patricked-code/MCP/pull/365) fusionnées | [PR #368](https://github.com/Patricked-code/MCP/pull/368) journal d'entrée et [#369](https://github.com/Patricked-code/MCP/pull/369) découverte des racines, ouvertes au contrôle du 05/11 ; G1 réconciliation, G2 registre/découverte, G3 NEW/RESUME. | Vérifier `E2_ENTRY_JOURNAL_UNAVAILABLE`, découverte des Continuity IDs, preuves S1/main/runtime ; **ne pas confondre E2, mandat N, P1, P2**. |
| **Governed Deploy universel — GitHub/Plesk/S1/S2** | [Issue #349](https://github.com/Patricked-code/MCP/issues/349), continuité `GD-U-CONT-20261030-ROOT-01` | [PR #350](https://github.com/Patricked-code/MCP/pull/350), [#355](https://github.com/Patricked-code/MCP/pull/355), [#357](https://github.com/Patricked-code/MCP/pull/357) fusionnées ; [#362](https://github.com/Patricked-code/MCP/pull/362), [#364](https://github.com/Patricked-code/MCP/pull/364) à examiner. | Capacités admin effectives, droits Plesk, anti-traversal, consentement, GitHub App, provisioning, attestation ; distinguer **Governed Deploy MCP** de **Governed Deploy Applications**. |
| **Git/GitHub Control Plane gouverné** | [Programme/intake #177](https://github.com/Patricked-code/MCP/issues/177) ; Backlog V2 W2/W3 | [PR #88](https://github.com/Patricked-code/MCP/pull/88), [#89](https://github.com/Patricked-code/MCP/pull/89), [#90](https://github.com/Patricked-code/MCP/pull/90) encore Draft au contrôle ; provenance à réconcilier, pas à fusionner aveuglément. | GitRegistry, opérations bornées, permissions par dépôt, source de vérité GitHub ; vérifier les capacités déjà intégrées sur `main`. |
| **OAuth/OIDC, consentement et continuité de connexion** | [Issue #341](https://github.com/Patricked-code/MCP/issues/341) (diagnostic P0), [#346](https://github.com/Patricked-code/MCP/issues/346) (persistance P1) | [PR #207](https://github.com/Patricked-code/MCP/pull/207) refresh, [#330](https://github.com/Patricked-code/MCP/pull/330) adaptation de claim ; investigations d'origine/CSRF et [issue #346](https://github.com/Patricked-code/MCP/issues/346). | Vérifier accès ChatGPT/Claude en vrai, codes PKCE, origine POST, persistance et révocation ; aucun relâchement CSRF ni appropriation de l'ancienne branche. |
| **Dispatch et attribution autonome des tâches** | [Intake #222](https://github.com/Patricked-code/MCP/issues/222), [#221](https://github.com/Patricked-code/MCP/issues/221) (non-création de Human Gates déductibles) | [PR #229](https://github.com/Patricked-code/MCP/pull/229) reprise owned-first, [#231](https://github.com/Patricked-code/MCP/pull/231) next-work, fusionnées ; le Program Backlog reste planification uniquement. | Prouver le raccordement blueprint READY → admission Task réelle → Session/Claim/Lock → exécution → checkpoint → recalcul ; pas de second dispatcher. |
| **Bus live et communication inter-agents** | [Intake #313](https://github.com/Patricked-code/MCP/issues/313), lié à #235 | [PR #319](https://github.com/Patricked-code/MCP/pull/319) checkpoint/audit, [#320](https://github.com/Patricked-code/MCP/pull/320) lecture/replay Event Journal, [#321](https://github.com/Patricked-code/MCP/pull/321) supervision des agents, ouvertes au contrôle. | Réutiliser le **journal d'événements canonique**, vérifier les frontières de writers, rétention, lecture bornée et delivery attestée, sans deuxième bus. |
| **Super Admin Cockpit** | [Intake #236](https://github.com/Patricked-code/MCP/issues/236) lié à [#235](https://github.com/Patricked-code/MCP/issues/235) | [PR #237](https://github.com/Patricked-code/MCP/pull/237) a convergé l'intake dans le Backlog V2 ; surface frontend du control plane, pas nouveau backend d'autorité. | Requalifier couverture UI/backend, habilitations, lots W4 et acceptation utilisateur réelle ; ne pas déclarer la complétude sur la seule présence d'un écran. |
| **Provisioning projet, Live State et binding** | [Limites F-03 #262](https://github.com/Patricked-code/MCP/issues/262), [F-04 #268](https://github.com/Patricked-code/MCP/issues/268) | [PR #261](https://github.com/Patricked-code/MCP/pull/261) et [#267](https://github.com/Patricked-code/MCP/pull/267) ; `TB-W3-F-03` / `TB-W3-F-04` du Backlog V2. | Vérifier quotas S1, politiques des archives, réel `realPathVerified`, abonnement multi-projets et schéma Plesk ; ne pas rejouer des blueprints déjà clos. |
| **Transport SSH, certificats et Governed Deploy MCP** | [Issue #190](https://github.com/Patricked-code/MCP/issues/190), intakes consommateurs [#192](https://github.com/Patricked-code/MCP/issues/192) / [#201](https://github.com/Patricked-code/MCP/issues/201) | [PR #85](https://github.com/Patricked-code/MCP/pull/85) candidate Actions/SSH ; historique OIDC/SSH et TLS. | Distinguer canal de transport, identité, permissions, CI, déploiement et attestation ; ni shell général ni second canal WRITE arbitraire. |

### B — Pilotes applicatifs et expérimentations bornées (ne pas promouvoir en programmes MCP)

| Périmètre | Origine et relation | Limite de reprise |
|---|---|---|
| **Governed Repository Template (GRT)** | Intakes [#192](https://github.com/Patricked-code/MCP/issues/192) / [#201](https://github.com/Patricked-code/MCP/issues/201), [PR #351](https://github.com/Patricked-code/MCP/pull/351) pilote d'admission S1 | Consommateur externe du MCP, pas une seconde plateforme MCP ; autorisations runtime réelles et politiques fail-closed à valider. |
| **Regulatory — pilote applicatif S1** | [PR #352](https://github.com/Patricked-code/MCP/pull/352) preflight RED/GREEN ; [#353](https://github.com/Patricked-code/MCP/pull/353) contrat d'admission ; extension [#349](https://github.com/Patricked-code/MCP/issues/349) | Source applicative distincte ; ne pas confondre admission/planification avec provisioning réel ou déploiement attesté. |
| **Stablecoin / E-WARI sur S2** | [PR #86](https://github.com/Patricked-code/MCP/pull/86) recipe SSH/synchronisation gouvernée, Draft observée | Périmètre projet spécifique, distinct du MCP générique ; cible et remote S2 bornés, aucun déploiement présumé. |

### C — Audits, archives et instruments documentaires (non autoritatifs)

| Périmètre | Ancres | Rôle exact |
|---|---|---|
| **Audit historique GWB / suivi PCM** | [PR #273](https://github.com/Patricked-code/MCP/pull/273), [#275](https://github.com/Patricked-code/MCP/pull/275), [#294](https://github.com/Patricked-code/MCP/pull/294) fusionnées ; [#305](https://github.com/Patricked-code/MCP/pull/305) traces H.1 ; [#348](https://github.com/Patricked-code/MCP/pull/348) carte directrice | Investigation, priorités, preuves et reprise à froid ; GWB-00..09 et PCM-00..14 ne créent aucune Task runtime. |
| **Historique PR/SHA/CI/Deploy et contrats UTL** | [PR #371](https://github.com/Patricked-code/MCP/pull/371), [#372](https://github.com/Patricked-code/MCP/pull/372) | Modèle de traçabilité et dossiers de preuve ; conserver le verrou de continuité de #372, ne pas inventer d'UTL ou de `TASK-*` historiques. |
| **Continuité conversationnelle documentaire** | [PR #373](https://github.com/Patricked-code/MCP/pull/373) | Arborescence et références de reprise, sans autorité de programme ni mémoire runtime. |
| **Archivage de l'historique Governed Deploy** | [PR #356](https://github.com/Patricked-code/MCP/pull/356) | Archive additive liée à #349 ; ne pas confondre archives et capacités effectivement déployées. |

### Règles de lecture, maintenance et non-dispersion

1. **Réutiliser l'issue/PR/Continuity ID existant** ; aucun nom de ligne dans cet index ne constitue un ID officiel ni une tâche. Un même objet (par ex. #349) peut être lié à plusieurs périmètres, sans duplication de son autorité ni double comptage.
2. **Hiérarchie de provenance** : programmes et intakes propriétaires → chantiers et sous-chantiers → Work Items/Blueprints du Program Backlog → éventuelles véritables Tasks/UTL attestées → PR/CI/Deploy/preuves. Les références sont des liens, pas une promotion automatique entre niveaux.
3. **Statuts observés** : une PR ouverte/Draft est un statut GitHub à la date du recensement ; `DONE`, `BLOCKED`, `READY` dans un JSON historique sont des projections à réactualiser. `CLOSED` issue ≠ résultat opérationnel, CI verte ≠ merge, merge ≠ deploy, deploy ≠ acceptation.
4. **Avant toute reprise** : lire l'[issue #235](https://github.com/Patricked-code/MCP/issues/235), le Backlog V2 live, `CLAUDE.md`, `AGENTS.md`, l'état courant GitHub/CI, puis les autorités Task/Session/Claim/Lock et S1/S2 uniquement lorsque nécessaires. Compléter les gaps par preuves, non par hypothèses.
5. **Global Work = index transversal seulement**. Toute évolution de cette section suit la PR documentaire #374 pendant qu'elle est ouverte ; les PR propriétaires #207, #319/#320, #348, #351–#354, #368–#369, #372 et #373 restent autonomes et protégées de collisions. Ne pas déployer, merger ni modifier leurs branches depuis cet index.

**Couverture :** recensement des principaux périmètres repérés par requêtes GitHub sur issues/PR ouvertes, intakes et documents de gouvernance, avec ancres directes. Il ne constitue **pas** une preuve d'exhaustivité historique de tous les commits, ni un audit actuel des sources/runtime, ni un nouveau plan officiel de priorité. Le statut réel de chaque capacité doit être vérifié à sa reprise.

---

## Point d'entrée commun — INTAKE et reprise à froid (16 octobre 2026)

**Directive de coordination immédiatement disponible : [issue maîtresse #235, commentaire #6203867094](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6203867094).** Elle complète, sans remplacer, les autorités déjà en place et le [protocole d'entrée de AGENTS.md](../../AGENTS.md). Un agent nouvellement connecté reconstruit l'état depuis GitHub, vérifie le HEAD, les PR et la CI/deploy, puis seulement les autorités runtime nécessaires. Ne jamais déduire la présence active d'un agent, son ownership ou ses permissions d'un commentaire ou d'un snapshot.

**Checkpoint confirmé :** PR #300 fusionnée à `cc31ce12bea236b4cfb31d99ecee700c543f0c17` ; CI principale #38812707495 et Governed Deploy #38812707629 `SUCCESS` sur cet SHA. **Travail restant :** PCM-03/GWB-04 sur `TB-W4-H-01` et `TB-W4-K-01` puis autres READY avec acceptation comportementale, F-03/#262 et F-04/#268 par leurs détenteurs, GWB05..09 et acceptation finale. La matrice [gwb04-ready-ownership-20261015.json](gwb04-ready-ownership-20261015.json) est un inventaire de candidats et non une autorité de Task. La date des sondes OIDC #301–#303 rend leurs résultats historiques pour toute mutation ultérieure.

### GWB-04 — Les 18 blueprints READY et les conflits potentiels de reprise (2026-10-15)

[Matrice READY / PR / preuve runtime](gwb04-ready-ownership-20261015.json) : 18 candidats dans l'ordre officiel du Backlog, dont 15 ont des chevauchements possibles avec les PR DRAFT #207, #88, #89, #90 ; trois n'ont pas de candidat PR connu dans cette recherche. Snapshot OIDC #297–#299 : 2 Tasks READY sans propriétaire, 0 Session active, 0 Lock actif. Une PR candidate n'est pas un propriétaire runtime ; un READY planning n'est ni une Task, ni un claim. Prochaine étape : tests fonctionnels précis et admission autonome autorisée, jamais prise de contrôle d'une branche existante.


### GWB03-02 — PR #267, observations F-04 et limites de preuve

Analyse [GWB03-02](gwb03-pr267-domain-evidence-20261015.json) : 26 constats historiques (15 P1 / 11 P2), 18 rapprochés de lignes code/test, 8 non examinés individuellement. Les quatre limites documentées par l'[issue #268](https://github.com/Patricked-code/MCP/issues/268) restent à traiter sous leur propriétaire : fraîcheur des observations, abonnement Plesk partagé, `realPathVerified` historiquement absent et schéma SQL S1/S2 non attesté. Aucun constat déclaré résolu ni cible S1/S2 modifiée. Pour tout futur correctif : preuve read-only et contrôle d'ownership runtime obligatoire.


### GWB03-01 — Première réconciliation vérifiable de PR #261 (2026-10-15)

La première tranche d'analyse est dans [`gwb03-pr261-source-policy-evidence-20261015.json`](gwb03-pr261-source-policy-evidence-20261015.json) : **73 remarques historiques** (54 P1 / 19 P2), dont **17 comparées à des ancres de code source et de tests** au SHA `0817f340dcd57f59b348b8a023082efd472342e3`. Les 73 états de résolution restent `UNKNOWN` en attente d'une validation suffisante. Deux limites de politique Compose sont signalées : plafonds de ressources déjà connus dans [issue #262](https://github.com/Patricked-code/MCP/issues/262), et plafonds de rotation des logs (`max-size` / `max-file`) présents dans l'historique PR #261 mais non testés négativement aux extrêmes. Ce fichier ne crée pas de Task ni ne permet l'activation d'une cible S1. Prochaine action : tests négatifs par le propriétaire F-03, puis poursuite de la réconciliation de 56 remarques non examinées individuellement et GWB03-02 (#267).


## PRIORITÉ D'ENTRÉE — Carte chronologique de convergence du MCP (2026-10-15)

**Avant d'écrire du code, lire la [carte de priorité machine](mcp-priority-convergence-map-20261015.json).** Cette carte comprend les 15 jalons PCM-00..14, la totalité des 94 blueprints en ordre de programme, les dépendances, domaines de collision, preuves à produire et règles de reprise. Elle **n'est pas** une nouvelle Governed Task Queue ni une autorisation de claims ou d'écriture.

| Ordre de coordination | Travail requis | Reprise et compatibilité |
|---|---|---|
| PCM-00 | Entrée agent, pacte, HEAD, session/ownership/locks si runtime | Obligatoire avant toute mutation |
| PCM-01 | Compléter les traces et deltas de l'audit historique | Lecture indépendante |
| PCM-02 | Vérifier les P1 de PR #261 puis #267, autres P1/P2 | GWB-03, pas 158 bugs supposés |
| PCM-03 | Examiner vraiment sources, assertions et preuves des 94 blueprints | GWB-04, lecture parallèle par slot |
| PCM-04 | Confronter les écarts prouvés à l'architecture et au Backlog | GWB-05, un seul writer de synthèse |
| PCM-05 | Clôturer proprement le volet audit avec résidus et handoff | Ne bloque pas les tâches indépendantes |
| PCM-06 | Diagnostiquer le 403 OAuth de consentement sans affaiblir CSRF | Voie parallèle, propriétaire existant PR #207 |
| PCM-07 | Intégrer les refresh tokens de PR #207 sans régression | Après preuve de la cause OAuth |
| PCM-08 | Certifier Claude et ChatGPT réellement connectés, refresh compris | Preuves clients distinctes |
| PCM-09 | Observer readiness + Queue/Session/Locks, sélectionner nextWork | Dès PCM-00 pour le travail déjà admissible, **sans attendre tout l'audit** |
| PCM-10 | Exécuter W3 par ordre canonique, PR/CI/Deploy/checkpoint | Un writer par collision domain |
| PCM-11 | Construire observabilité et traces de bout en bout | W4 en parallèle si autorisé |
| PCM-12 | Construire et certifier le Super Admin Cockpit existant | W4, aucune permission UI implicite |
| PCM-13 | Certifier dispatch automatique multi-agents, échecs et reprise | Sessions et claims réellement distincts |
| PCM-14 | Valider backend + clients + cockpit ; éventuellement GLOBAL_MCP_COMPLETE | Uniquement avec preuves terminales |

**Gouvernance de l'ordre :** la liste est un ordre logique des objectifs, **pas une sérialisation artificielle des travaux indépendants**. L'agent reprend d'abord sa tâche déjà possédée, sinon déduit le premier candidat compatible `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` du **Program Backlog live** et vérifie les autorités Task/Session/Lock avant toute mutation. Toute collision se résout par arrêt du write concerné et choix d'un autre scope compatible, non par reprise forcée. Les données de la carte sont un snapshot ; lire `SUIVI.md` et [issue #235](https://github.com/Patricked-code/MCP/issues/235) pour les checkpoints et réobserver GitHub avant d'agir.

**NEXT_ACTION d'audit au 15 octobre :** PCM-02 / GWB03-01 sur les constats de la PR #261, puis #267. En parallèle, PCM-03 peut progresser par slots indépendants, PCM-06 reste au propriétaire OAuth #207, et PCM-09 reprend tout travail runtime déjà possédé/autorisé sans attendre l'audit complet.



## Index de reprise — audit, programme et traçabilité (observation du 2026-10-15)

**Point d'entrée documentaire, non nouvelle source de vérité.** L'agent commence par `CLAUDE.md` et `AGENTS.md`, puis consulte :

1. **Architecture cible et pacte** — `ARCHITECTURE.md`, `ROADMAP.md`, `CLAUDE.md §7.1–7.5`, `.mcp/github-first-operational-policy.json` et [issue #235](https://github.com/Patricked-code/MCP/issues/235).
2. **Audit de l'histoire depuis #65** — `architecture-chronology-issue65-20261009.json` (78 issues, 130 PR), `architecture-comments-batch01..06-20261009.json` et les archives de décisions.
3. **Revues complémentaires GWB-02** — `gwb02-inline-pr-review-comments-20261015.json`, `gwb02-pr-review-submissions-batch01..09-20261015.json`, `gwb02-pr-review-submissions-postbaseline-20261015.json`, `gwb02-review-coverage-manifest-20261015.json` : 282 commentaires inline, 215 soumissions sur 135 PR ; commentaires directs sur commits encore non vérifiés.
4. **Triage GWB-03** — `gwb03-pr-review-findings-triage-20261015.json` : 158 remarques historiques P1/P2, 3 vérifications ciblées de code/tests ; leur statut de résolution **reste non certifié**.
5. **Matrice GWB-04** — `gwb04-94-blueprint-source-test-trace-20261015.json` : existence de chemins sources/tests pour 94 blueprints, pas une preuve d'acceptation fonctionnelle.
6. **Plan gouverné des travaux successifs** — `governed-audit-continuation-workblock-20261009.json` : GWB-00..09 et leurs dépendances ; ses `PLANNED_NOT_RUNTIME_TASK` sont intentionnels, son `currentCheckpoint` n'a pas autorité live.
7. **Ordre et état de planification** — `program-backlog-convergence.json`, `TASKS.md`, `SUIVI.md` ; `npm run program:readiness` puis `npm run program:next` après lecture et réconciliation. Le Program Backlog ne crée pas de task.
8. **Preuves et journaux** — [PR #290](https://github.com/Patricked-code/MCP/pull/290), [#291](https://github.com/Patricked-code/MCP/pull/291), [#292](https://github.com/Patricked-code/MCP/pull/292), GitHub Actions, `CHANGELOG.md`, `DECISIONS_LOG.md`, et commentaires de l'[issue #235](https://github.com/Patricked-code/MCP/issues/235).
9. **Mémoire maître historique** — `MASTER_RESUME_MEMORY.md` conserve aussi le snapshot du 5 octobre. **Ne pas reprendre ses nombres et son NEXT_ACTION comme courants** sans relecture de l'état ci-dessus.

**À la date d'observation** : `main@b187953de89d8f6529e2af97abc1de4570c53146` et CI/Governed Deploy du SHA réussis ; 94 blueprints : 36 DONE, 18 READY, 28 BLOCKED, 5 CONDITIONAL, 7 DEFERRED (projection seulement). L'issue #207 OAuth est DRAFT/dirty, propriétaire et autorisations à préserver ; GitHub Actions/OIDC reste le chemin de continuité prioritaire.

**NEXT_ACTION de l'audit** : vérifier contre le code et les tests actuels les constats de la PR #261 (GWB03-01), puis ceux de #267 (GWB03-02), et approfondir GWB-04 sur les 18 READY et les 36 DONE ; classifier uniquement les écarts prouvés, reprendre GWB-05..09 via l'architecture et les autorités existantes. Après chaque étape : preuves, checkpoint, recalcul, prochain travail admissible. Ne jamais considérer `GLOBAL_MCP_COMPLETE` comme atteint sans acceptation backend + clients + cockpit.


## Objet

Ce répertoire contrôle déterministement les Markdown de `Patricked-code/MCP` et distingue les fichiers Git des miroirs runtime-only.

## Surface courante réattestée

La passe read-only post-workflow a observé :

- 204 Markdown suivis par Git et classifiés individuellement dans `markdown-inventory.json` ;
- 33 Markdown sous `wealthtech_project_memory/memory/` sur S1 ;
- 7 de ces 33 également suivis par Git ;
- 26 Markdown runtime-only ;
- surface Git gouvernée actuelle : 204 Markdown ; la composante runtime-only doit
  être réobservée avant tout nouveau total combiné.

## Historique 209

L’ancienne photographie reste `183 Git + 26 runtime-only = 209`. Elle ne doit jamais être substituée au courant. L’évolution Git est `183 → 196`, soit treize Markdown supplémentaires. Les anciens chemins différentiels exacts ne sont pas affirmés sans l’ancien snapshot individuel.

## Catégories Git

Chaque Markdown suivi appartient à exactement une catégorie déterministe : `canonical`, `root-documentation`, `documentation`, `history`, `engineering-plan`, `engineering-spec`, `migration-history`, `memory` ou `runtime-mirror-tracked`.

## Baseline et CI

`markdown-inventory.json` contient les 204 chemins et catégories exacts. La CI échoue sur ajout, disparition, catégorie divergente, document non classifié ou contradiction `canonical-state`.

L’artefact `mcp-autodeploy-governance` copie désormais exactement les sept documents actifs suivis ; il ne génère plus d’anciens candidats codés en dur.

## Limite de preuve

GitHub Actions contrôle Git. La surface runtime-only exige toujours une lecture S1 fraîche pour une déclaration courante ; la présente valeur 26 provient d’une telle lecture gouvernée, mais devra être réattestée lors d’un futur rapport si elle est alors utilisée comme état courant.
