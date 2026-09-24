# TODO.md

## État canonique structurel

```canonical-state
{
  "repository": "Patricked-code/MCP",
  "branch": "main",
  "s1Root": "/opt/apps/wealthtech-mcp-ssh-bridge",
  "fetchRemote": "git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",
  "pushRemote": "disabled://mcp-s1-read-only",
  "container": "wealthtech_mcp_ssh_bridge"
}
```

## Rôle

Travaux restant réellement à accomplir. Les états dynamiques de tâche, session, branche et PR sont lus depuis leurs autorités runtime/GitHub et ne sont pas figés ici.

## Convergence exhaustive du backlog — projection dérivée

Cette section est un **index humain**, pas une seconde Task Queue. La projection machine correspondante est `docs/governance/program-backlog-convergence.json`.

Règle permanente : avant toute création de tâche ou tout nouveau code, rechercher l'intention dans cette convergence et dans le `main` courant. Un élément ancien n'est jamais recodé parce qu'il est encore `[ ]`, `OPEN` ou `corrected=false`.

| Workstream | Disposition | Integration Slot | Objet |
|---|---|---|---|
| `PB-FOUNDATIONS-DONE` | `DONE` | `program.delivered-foundations` | Delivered connection/repository/project foundations |
| `PB-A2.2` | `KNOWN_NOT_ANALYZED` | `connection.client-evidence` | A2.2 Verified Client Evidence |
| `PB-A3` | `KNOWN_NOT_ANALYZED` | `connection.oauth-attempt-correlation` | A3 OAuth Auth Attempt Correlation |
| `PB-B3` | `PARTIALLY_IMPLEMENTED` | `context.multi-repository` | B3 Multi-repository Governed Context |
| `PB-C1` | `PARTIALLY_IMPLEMENTED` | `project.gitregistry-verification` | C1 GitRegistry V2 verification and activation path |
| `PB-C345` | `DESIGNED_NOT_IMPLEMENTED` | `project.server-runtime-domain-resolution` | C3/C4/C5 Server, Runtime and Domain Resolution |
| `PB-D1` | `DESIGNED_NOT_IMPLEMENTED` | `governance.inheritance` | D1 Existing Governance Inheritance |
| `PB-D2` | `DESIGNED_NOT_IMPLEMENTED` | `governance.effective-capabilities` | D2 Effective Capabilities |
| `PB-D3` | `PARTIALLY_IMPLEMENTED` | `bootstrap.receipt-enrichment` | D3 Bootstrap Receipt Enrichment |
| `PB-E` | `KNOWN_NOT_ANALYZED` | `context.guided-completion` | E1/E2/E3 Guided Context Completion |
| `PB-F` | `KNOWN_NOT_ANALYZED` | `provisioning.governed` | F Governed Provisioning |
| `PB-G12` | `KNOWN_NOT_ANALYZED` | `presence.client-two-clock` | G1/G2 Client Presence and two-clock model |
| `PB-G3` | `PARTIALLY_IMPLEMENTED` | `attestation.tool-surface` | G3 Tool Surface Attestation |
| `PB-H` | `KNOWN_NOT_ANALYZED` | `observability.end-to-end-tracing` | H End-to-End Tracing |
| `PB-I` | `KNOWN_NOT_ANALYZED` | `observability.synthetic-monitoring` | I1/I2/I3 Synthetic Monitoring, connection dashboard and alerts |
| `PB-J12` | `KNOWN_NOT_ANALYZED` | `certification.clients` | J1/J2 Claude and ChatGPT certification |
| `PB-J3` | `KNOWN_NOT_ANALYZED` | `maintenance.github-actions-node24` | J3 GitHub Actions / Node 24 maintenance |
| `PB-J4` | `CONDITIONAL` | `governance.write-gate-enforcement` | J4 WRITE gate shadow→enforce |
| `PB-GITHUB-FIRST-PROGRAM` | `PARTIALLY_IMPLEMENTED` | `github-first.continuity-program` | GitHub-first Operational Continuity residual program |
| `PB-GITHUB-FIRST-PROOF` | `DONE` | `github-first.read-evidence-proof` | GitHub-first S1 read-only evidence proof |
| `PB-GITHUB-FIRST-FALLBACKS` | `DEFERRED` | `github-first.optional-readonly-fallbacks` | Optional SSH read-only fallback selection |
| `PB-GITHUB-FIRST-WRITE` | `DEFERRED` | `github-first.server-write-extensions` | Additional bounded server WRITE transports |
| `PB-GITHUB-READ` | `READY` | `github.control-plane.read-complements` | GitHub Control Plane READ R1 |
| `PB-GITHUB-ADMIN` | `DESIGNED_NOT_IMPLEMENTED` | `github.admin.create-repository` | Governed github_create_repository |
| `PB-GITHUB-PRWRITE` | `DESIGNED_NOT_IMPLEMENTED` | `github.pr-write.extensions` | Governed PR write extensions |
| `PB-GITHUB-DESTRUCTIVE` | `DEFERRED` | `github.destructive-writes` | Destructive GitHub file/branch operations |
| `PB-STABLECOIN-APPDEPLOY` | `CONDITIONAL` | `deployment.stablecoin-application` | Stablecoin application-changing deploy path |
| `PB-UAC` | `ACTIVE` | `coordination.universal` | Universal Agent Coordination / heartbeat and claim observability |
| `PB-GWC-RECONCILE` | `NEEDS_RECONCILIATION` | `governance.gwc-blueprint-convergence` | GWC-0..17 implementation-state convergence |
| `PB-AF-CLOSED` | `DONE` | `governance.gwc-findings-closed` | GWC findings with attested corrections |
| `PB-AF-RECONCILE` | `NEEDS_RECONCILIATION` | `governance.gwc-findings-reconciliation` | Remaining GWC finding classification |
| `PB-OD-RECONCILE` | `NEEDS_RECONCILIATION` | `governance.open-decisions-reconciliation` | OD-01..12 decision-state convergence |
| `PB-TASKREG-RECONCILE` | `NEEDS_RECONCILIATION` | `governance.task-registry-reconciliation` | Static task-registry drift reconciliation |
| `PB-LEGACY-CONVERGENCE-DONE` | `DONE` | `governance.historical-pr-intents` | Historical PR intent reconciliation |

### Ordonnancement courant

- **DONE** : `PB-UAC` / PR #154 est fusionné, déployé et attesté ; ne jamais recopier ses UAC-01..24.
- **RECONCILE avant nouveau code issu du GWC historique** : `PB-GWC-RECONCILE`, `PB-AF-RECONCILE`, `PB-OD-RECONCILE`, `PB-TASKREG-RECONCILE`.
- **ACTIVE planning wave** : W1 Program State Convergence. Seul `TB-W1-01` est planning-ready avant relecture live ; aucun blueprint ne crée automatiquement de Task runtime.
- **READY après W1** : `PB-GITHUB-READ` uniquement pour `github_get_commits`, `github_get_tree`, `github_get_required_checks`.
- **Chaîne produit/connexion à construire additivement** : A2.2 → A3/B3/C1 → C3/C4/C5 → D1/D2/D3 → E → F.
- **Observabilité/certification** : G1/G2, G3, H, I, J1/J2 après leurs dépendances.
- **Séparés/conditionnels** : J3 Node 24, J4 WRITE gate enforce, fallbacks SSH, WRITE serveur additionnels, GitHub destructif, déploiement applicatif Stablecoin.


### Program Backlog V2 — règle d'exécution

Les Task Blueprints machine-readable sont portés par `docs/governance/program-backlog-convergence.json`. Ils décrivent à l'avance objectifs, dépendances, Integration Slots, collision domains, autorités, RED/GREEN, régressions et DONE. Ils ne sont pas des `TASK-*` et ne sont jamais chargés automatiquement dans Operational Memory.

Ordre courant : **W1 convergence → W2 GitHub READ → W3 connection/resolution/governance/provisioning → W4 observability/certification**. Maintenance et lots conditionnels restent séparés.

### Règle anti-régression / anti-doublon

Une intention nouvelle doit être classée contre l'existant selon `REUSE → WRAP → GENERALIZE → EXTEND → NEW`. Si un Integration Slot est déjà porté par un workstream actif ou existant, le nouveau besoin doit être rattaché à ce workstream ou déclaré explicitement dépendant/composable ; il ne crée jamais une implémentation parallèle.


## Règle de dérivation depuis la roadmap

`ROADMAP.md` porte la vision complète des chantiers et lots connus. Ce fichier ne duplique pas toute la roadmap : il ne contient que les éléments qui restent réellement à accomplir ou à vérifier avant qu'un lot puisse être considéré exécutable.

Une amélioration structurante est d'abord positionnée dans `ROADMAP.md`. Lorsqu'elle devient un travail réellement restant, elle est reflétée ici. Une `TASK-...` officielle n'est créée que lorsque la gouvernance et Operational Memory l'autorisent.

## Governed Autodeploy V1

- [x] Bootstrap manuel et preuves automatiques exact-SHA attestés.
- [x] `pushEnabled=true`, OIDC GitHub et déploiement fail-closed actifs.
- [x] PR #44, #45, #47 et #55 fusionnées et automatiquement déployées.
- [x] S1, OCI, Docker, health et Live State technique réattestés sur les jalons clôturés.

## Governed Session Continuity / Operational Memory V1

- [x] Réaliser la portée initiale, les hardenings PR #45 et la première réconciliation documentaire.
- [x] Reproduire puis corriger les trois findings tardifs PR #45.
- [x] Valider le head PR #47 avec `12/12 + 188/188`, typecheck, build, docs, secrets et diff.
- [x] Fusionner exact-head, attester l'Autodeploy et résoudre les trois threads PR #45.
- [x] Obtenir `FULLY_ALIGNED` par la politique descendant docs-only puis clôturer `TASK-20260813-004`.

## Mandatory Agent Bootstrap & Work Orchestration V1

- [x] Catalogue et cartographie dérivés des registrations réelles.
- [x] Inventaire architecture/documents/audits/politiques dérivé du SHA suivi.
- [x] Live State enrichi, Bootstrap Receipt, Task Registry et Work Queue persistante.
- [x] Governed Context, onboarding, dashboard, audit et verdicts `shadow` enrichis.
- [x] PR #49 fusionnée et déployée exact-SHA.
- [x] Findings tardifs PR #49 et écarts de gate/catalogue corrigés par PR #52.
- [x] PR #52 fusionnée, CI/Autodeploy exact-SHA et GitHub/S1/OCI/runtime attestés au SHA `fff44ff2db386942730a67f3884980c7824cae7f`.
- [x] Réconciliation documentaire fusionnée par PR #54 au SHA `a35280e172e40525689520e1443ccd59e850e91a`; CI main `33222774901` et Governed Deploy `33222774905` réussis.
- Note d'autorité runtime : checkpoint final, locks et cycle de session ne sont pas maintenus comme TODO documentaire ; les lire depuis Operational Memory lorsqu'une preuve actuelle est nécessaire.

## Unified Operational Work State — historique

- [x] Réutiliser Live State, Current-State Inventory, Operational Memory, Governed Task Queue, GitHub context et scoped WRITE gate; aucun nouveau store global.
- [x] Ajouter `CapabilityReality`, `TaskReality` et `GovernanceDecision` comme projections dérivées et bornées.
- [x] Ajouter l'observation GitHub exacte de la branche/PR/checks/reviews/ruleset/ownership/fraîcheur sans nouveau collecteur concurrent.
- [x] Exposer la réalité unifiée dans Governed Context et le dashboard.
- [x] Préserver la parité du gate `shadow` et les contrats historiques.
- [x] Intégrer Observer Before Actor au chemin réel et ajouter son test de régression complet.
- [x] Corriger la reprise de `currentTask.workBranch` pour les sessions d'intake sans branche.
- [x] Propager les reason codes GitHub vers `GovernanceDecision`.
- [x] Distinguer cache miss, auth manquante/invalide, permission denied, not-found/invisible incertain, timeout, stale, head mismatch, checks pending/failed et review bloquante.
- [x] Prouver qu'une indisponibilité GitHub ne bloque pas artificiellement une opération indépendante de GitHub.
- [x] Observer le HEAD de `workBranch` avant PR lorsque la branche existe, par lecture GitHub bornée et read-only.
- [x] Corriger les quatre findings finaux de PR #55 et valider le head exact `de0030b0df42a693d2e96c87f008c9ffd1c2ce04` par CI `33256403390` / job `99110808499`, avec `250/250` tests.
- [x] Résoudre les threads, satisfaire `protect-main` et fusionner PR #55 sous garde exact-head.
- [x] Attester le merge fonctionnel `2c2dde2bffe62b2685bf2fad94530571762470c8`, CI main `33256566688` et Governed Deploy `33256566695` / job `99111230626`.
- [x] Réattester GitHub main, S1 HEAD/origin-main et runtime healthy sur le même SHA dans Live State `51`.
- [x] Démarrer la réconciliation documentaire post-déploiement sur `mcp/reconcile-unified-operational-work-state-20260829` sans code, workflow, policy ou changement de WRITE gate.
- Note d'autorité runtime : le statut final de `TASK-20260829-001`, son checkpoint, ses locks et sa session sont lus depuis Operational Memory/Task Reality ; ils ne constituent pas un TODO Markdown persistant.

## Automatic Governed Connection Bootstrap — livraison GitHub acquise

- [x] PR #60 fusionnée et déployée sur `211a7de7940f115aa997f404927a8e0c9ace9055`.
- [x] Drift documentaire et finding tardif PR #60 identifiés.
- [x] Churn de révision sur transports successifs reproduit en runtime et par RED CI #626/#628.
- [x] GREEN `ATTACHED`/`RESUMED` finalisé au head `2e8fa683296f4f1bf53b9875104598696ba9c6e2`, CI PR #645, `258/258`.
- [x] PR #62 fusionnée sous garde exact-head au SHA `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`.
- [x] CI main #646, Governed Deploy #19, GitHub/S1/runtime exact-SHA, dépôt S1 propre et Docker healthy attestés au jalon fonctionnel.
- [x] Stabilité runtime confirmée : trois lectures successives restent à `sessionRevision=68` au jalon observé.
- [x] Réconciliation docs-only fusionnée par PR #63 au SHA `a026616fbf2df47962243bfcff46ac734bed50ba`.
- Note d'autorité runtime : l'état courant de `TASK-20260829-002`, son checkpoint, ses locks et la session sont lus depuis Operational Memory/Live State ; ils ne sont pas maintenus comme cases à cocher ici.

## A2.1 livré — TASK-20260901-001 clôturée

La séquence détaillée, les dépendances et les contrats d'intégration restent portés par `ROADMAP.md`. Operational Memory a clôturé `TASK-20260901-001` à `DONE` en révision 10 après la PR #70, la CI main #746, Governed Deploy #25 et Live State `83` `FULLY_ALIGNED`. À cette clôture A2.1, B1 et les lots suivants étaient encore des candidats distincts non enregistrés ; B1 a depuis été clôturé séparément et B2 enregistré sous sa propre tâche.

### A2.1 — Connection Context minimal — livré et attesté

- [x] rattacher durablement le principal OAuth et la Governed Session à un `ConnectionContext` minimal sans second moteur de session ;
- [x] conserver une classification initiale `UNRESOLVED` sans inventer l'identité du client ;
- [x] ne jamais inventer de `conversation_id`, workspace ou project ref externe ;
- [x] conserver secrets, codes, tokens, transports bruts et resume proofs hors du contexte et de la journalisation ;
- [x] préserver les sessions historiques sans backfill et les credentials partagés avec `connectionContext: null` ;
- [x] corriger TDD-first le risque de binding orphelin puis valider `272/272`, merge et déploiement exact-SHA ;
- [x] fusionner la réconciliation documentaire PR #70 au SHA `c87598ddab01131eb8d3b9bad35f9d0cbdc2a5d4`, réussir CI main #746 et Governed Deploy #25, obtenir Live State `83` `FULLY_ALIGNED`, puis clôturer `TASK-20260901-001` à `DONE` selon le plan approuvé.
- Note d'autorité : checkpoint, lock, session et état courant de la queue restent lus depuis Operational Memory; cette preuve historique ne crée aucune tâche B1.

### A2.2 — Verified Client Evidence — restant et conditionnel

- [ ] classifier l'identité cliente uniquement lorsqu'une preuve vérifiable et bornée est réellement fournie ;
- [ ] conserver `UNKNOWN` en l'absence de preuve et ne rien déduire du seul `clientId` opaque ;
- [ ] persister une référence conversation/workspace uniquement si elle est fournie, autorisée et sanitizable ;
- [ ] garder A2.2 non bloquant pour B1 lorsque le principal OAuth suffit à la résolution GitHub gouvernée.

### B1 — GitHub Identity Resolution — livré et clôturé avant B2

- [x] approuver le binding `oauth:wealthtech-mcp-admin` → `Patricked-code` uniquement pour `Patricked-code/MCP`, avec effet `IDENTITY_ONLY` ;
- [x] préserver toute la sémantique Identity Policy V1 dans une V2 additive ;
- [x] réutiliser les connexions durables, le secret storage, `GET /user` et le collecteur/cache Governed Context existants sans registre/observateur/cache parallèle ;
- [x] distinguer principal GitHub authentifié et organisation accessible ;
- [x] exiger une appartenance authentifiée active pour une organisation et isoler les contextes accessibles par credential sans exposer sa corrélation ;
- [x] gérer `RESOLVED` / `NONE` / `AMBIGUOUS` / `UNVERIFIED` sans premier-match ;
- [x] préserver les sessions/`ConnectionContext` historiques et exclure permissions, Human Identity, Agent Role et résolution repository ;
- [x] obtenir 43 GREEN ciblés et 310 tests complets, puis MCP CI #777 verte sur le head exact `9b1a572ab0362aeefa5e13f425225e1f510704b7` ;
- [x] résoudre les trois threads et fusionner la PR #73 sous garde exact-head au merge `208b8744810a23e48a4282450786805e7ff18845` ;
- [x] réussir MCP CI main #778 et MCP Governed Deploy #27 ;
- [x] attester dans Live State `96` GitHub/S1/OCI/runtime exact-SHA et healthy ainsi que B1 `RESOLVED` sans permission dérivée ;
- [x] publier, valider, revoir et fusionner la réconciliation documentaire finale par PR #74 ;
- [x] observer son Autodeploy et obtenir Live State `FULLY_ALIGNED` sans `DOCUMENTATION_DRIFT` ;
- [x] clôturer `TASK-20260907-001` avant l'enregistrement séparé de B2.

### B2 — Repository Resolution — livré et clôturé

- [x] approuver le design B2 au checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c` ;
- [x] enregistrer/claim B2 séparément sous `TASK-20260909-001` après clôture B1 ;
- [x] restaurer additivement la branche après détection du lot concurrent incompatible, sans force-push ;
- [x] implémenter le resolver pur fail-closed et la vue d'évidence GitRegistry V1 ;
- [x] étendre l'observateur durable existant avec le batch credential-scoped ;
- [x] projeter B2 dans le collecteur/cache/service/dashboard Governed Context existant ;
- [x] gérer `RESOLVED` / `NONE` / `AMBIGUOUS` / `UNVERIFIED`, dont 404 jamais `NONE` ;
- [x] préserver les contrats historiques et exclure toute permission, V2 active ou mapping aval ;
- [x] terminer documentation, suite complète, sécurité, cartographie et revue indépendante ;
- [x] publier la branche exacte, ouvrir/revoir la PR #75 et obtenir CI exact-head sans thread ;
- [x] merger le head exact `dd2a9a7894f928aa5dac886c79dc269ea3838a7b` au SHA `f2c90902a627ee9209d805403e584f3123a0453a`, réussir CI main #811 et Governed Deploy #29 ;
- [x] attester GitHub/S1/origin-main/runtime alignés, S1 propre/read-only et runtime healthy dans Live State `163` ;
- [x] publier/fusionner/déployer les réconciliations documentaires #76/#77, obtenir `FULLY_ALIGNED`, clôturer B2 `DONE` révision 18, fermer sa session et réconcilier la Work Queue ;
- [x] conserver B3/C1+ dans la roadmap sans les précréer dans la queue.

Le mapping GitHub user/account → rôle projet et les permissions ne font pas partie
de B1. Ils restent positionnés dans les lots de gouvernance/Effective Capabilities
appropriés, sans être pré-créés comme tasks.

### AfricaFunds — livraison fonctionnelle acquise

PR #80 fusionnée depuis le head exact `18355de8d4892685ee4f68b11d1542fb249e838a` au merge `1eac93f631fcf7843d7e768bba7a4125ed00bdbb`; CI PR #841, CI main #842 et Governed Deploy #34 (run `34750625897`) réussis.

- [x] Phase 1 et réconciliation #79 attestées avant Phase 2 ;
- [x] observations S2 sans mutation, RED/GREEN et mapping approuvé ;
- [x] CI/revue/merge exact-head Phase 2 et Governed Deploy #34 ;
- [x] GitHub/S1/origin-main/runtime exact-SHA, S1 propre/read-only et runtime healthy ;
- La présente réconciliation documentaire lève la projection devenue stale. Sa validation et son déploiement restent requis pour l'attestation FULLY_ALIGNED.
- Note d'autorité : DONE, checkpoint final, locks et fermeture de session se vérifient dans Operational Memory; ils ne deviennent pas des TODO Markdown persistants.

### Project Binding / GitRegistry V2

- [ ] réutiliser GitRegistry V2 comme autorité de binding repo ↔ projet ↔ serveur ↔ domaine ;
- [ ] vérifier `realPath`, remote et domaine pour les mappings qui en ont besoin ;
- [ ] résoudre `repositoryId → mappingId → projectId` avec `RESOLVED` / `NONE` / `AMBIGUOUS` / `UNVERIFIED` ;
- [ ] composer `.mcp/server-map.json`, GitRegistry et Live State pour résoudre S1/S2, path, runtime/container et domaine ;
- [ ] ne pas créer de `repository-binding.yaml` éditable comme seconde source de vérité ; une éventuelle matérialisation future doit rester une projection dérivée.

### Governance Inheritance & Effective Capabilities

- [ ] hériter automatiquement de la gouvernance existante lorsqu'un mapping est connu ;
- [ ] calculer les capacités effectives en composant OAuth, GitHub, projet, serveur, règles et WRITE gate ;
- [ ] enrichir le Bootstrap Receipt existant avec les références de connexion/repository/project nécessaires sans secret.

### Guided Context Completion

- [ ] détecter uniquement les informations réellement manquantes ;
- [ ] faire évoluer les surfaces frontend existantes en wizard de complétion plutôt que créer un frontend parallèle ;
- [ ] exiger consentement explicite avant toute création ou écriture de ressource inconnue.

### Lots ultérieurs déjà identifiés

- [ ] Governed Provisioning contrôlé pour les ressources réellement absentes ;
- [ ] Client Presence et distinction `lastClientObservedAt` / `lastSyntheticProbeAt` ;
- [ ] Tool Surface Attestation serveur vs client observé ;
- [ ] tracing end-to-end OAuth/MCP/tool/upstream dans l'Event Journal existant ;
- [ ] monitoring synthétique et enrichissement du dashboard de connexion ;
- [ ] certifications Claude et ChatGPT ;
- [ ] hardening futur selon décisions séparées.

## Maintenance séparée

- [ ] Migrer dans une PR dédiée les actions GitHub encore exécutées sous compatibilité Node 24.
- [ ] Évaluer un éventuel passage `WRITE gate shadow → enforce` uniquement après GO distinct, décision architecturale, TDD, PR séparée et preuve de parité; ce n'est pas inclus dans le prochain chantier.
- La 2FA GitHub reste explicitement exclue.

## Règle permanente de synchronisation

- nouvelle amélioration structurante → `ROADMAP.md` ;
- travail réellement restant → `TODO.md` ;
- tâche gouvernée réellement enregistrée → Operational Memory + `TASKS.md` ;
- fin de tâche → autorités runtime/GitHub d'abord, puis réconciliation descendante `SUIVI.md` / `TASKS.md` / `TODO.md` / `ROADMAP.md`.


### C1 — GitRegistry V2 verification — travail gouverné en cours

- [x] introduire un verdict d'activation pur, déterministe et non mutant ;
- [x] bloquer fail-closed les mappings non validés ou dont path/remote/domain/credential/migration/health/rollback sont insuffisamment prouvés ;
- [x] démontrer RED #854 puis GREEN #855 sans activer le registre V2 ni changer de permission ;
- [x] faire revoir et fusionner ce socle via PR #83, CI exact-head #857, CI main #858 et Governed Deploy #37 ;
- [ ] réconcilier la projection documentaire post-déploiement et exiger le Live State frais ;
- [ ] prouver les credentials durables applicables, notamment Wealthtechinnovations ;
- [ ] vérifier les realpaths, remotes et domaines requis sans déduire une preuve absente ;
- [ ] traiter la migration MCP séparément ; `migration_pending` interdit toute mutation automatique du remote actif ;
- [ ] seulement après toutes les preuves et gates, concevoir/exécuter la transition explicite d'un mapping `validated → active` ; aucune activation n'est incluse dans le présent jalon.


### GitHub-first Operational Continuity V1

- [x] généraliser la décision de bootstrap en `GITHUB_ONLY | GITHUB_ACTION_READONLY_EVIDENCE | RUNTIME_REQUIRED` ;
- [x] ajouter une politique machine-readable sans nouvelle autorité ;
- [x] ajouter un workflow GitHub Actions read-only déclenchable par issue structurée ;
- [x] interdire command input/arbitrary shell et les primitives serveur mutantes par tests ;
- [x] ajouter le transport primaire GitHub OIDC → endpoint MCP read-only, sans OAuth MCP interactif ni secret SSH GitHub ;
- [ ] prouver un artifact `mcp_git_status` S1 via OIDC sans bridge interactif ;
- [x] prouver un artifact `stablecoin_frontend_git_status` S2 via OIDC sans bridge interactif ;
- [ ] optionnel : configurer `mcp-s1-readonly` comme fallback SSH secondaire ;
- [ ] optionnel : configurer `mcp-s2-readonly` comme fallback SSH secondaire ;
- [ ] seulement après preuves, décider si le fallback read-only peut être sélectionné automatiquement ;
- [ ] traiter tout transport serveur WRITE comme un chantier séparé avec parité et gouvernance propres ;
  - [x] construire et valider GREEN la candidate Stablecoin fast-forward exact-SHA, OIDC dédié, sans build/restart ;
  - [x] fusionner/déployer le MCP exact-SHA puis attester le premier fast-forward Stablecoin S2 — PR #117 fusionnée, puis requêtes #118 et #121 SUCCESS ;
  - [ ] généraliser à d'autres écritures uniquement par chantiers séparés, jamais par shell libre.


## Réconciliation des anciennes PR ouvertes — backlog résiduel current-first (2026-09-22)

Source : `docs/audits/2026-09-22-legacy-open-pr-intent-reconciliation.md`.

Règle : aucune reprise directe des branches #85/#86/#88/#89/#90. Chaque item est redérivé depuis le `main` courant après recherche d'équivalent.

- [x] Classer #85 comme intention historique absorbée par GitHub-first/OIDC ; ne pas créer un second transport parallèle.
- [x] Classer #89 READ comme déjà matérialisé ; conserver son manifeste de capacités comme superseded, non autoritatif.
- [x] Classer le fast-forward Stablecoin de #86 comme superseded par PR #117 et les fast-forwards attestés #118/#121.
- [x] Auditer `github_create_repository` (#88/GWC-12 DEFER) contre les primitives GitHub actuelles : capacité unique absente, à redessiner current-first comme lot admin séparé.
- [ ] Concevoir le lot admin `github_create_repository` depuis le main courant : private-only, org-bounded, idempotent, scoped-write et sans side effects implicites.
- [x] Auditer le lot READ différé de #90 : `github_get_mergeability` est un doublon de `github_get_pull_request_state`; `github_get_commit_diff` est composable avec `github_get_commit_state` + `github_compare_refs`; commits/tree/required-checks restent complémentaires.
- [ ] Préparer le lot READ current-first uniquement pour `github_get_commits`, `github_get_tree` et `github_get_required_checks`, avec TDD, sorties bornées et aucune nouvelle autorité.
- [x] Auditer les mutations différées `github_update_pull_request` et `github_request_review` : elles sont absentes ; l'ancien contrat update PR est trop large et non exact-head selon les standards courants.
- [ ] Concevoir un lot PR-WRITE current-first : request-review exact-head et update PR réduit/scindé, sans fermeture/changement de base caché.
- [x] Auditer `github_delete_file` et `github_delete_branch` : capacités destructives absentes ; le transport serveur GitHub courant n'autorise pas DELETE.
- [ ] Concevoir les suppressions dans un lot destructif séparé ; aucune extension implicite du transport DELETE et aucun assouplissement du scoped WRITE gate.
- [ ] Si un futur delta Stablecoin devient applicatif, concevoir un chantier distinct build/restart/health/rollback ; ne jamais réactiver le vieux chemin #86 et ne pas modifier le bounded fast-forward non applicatif existant.
