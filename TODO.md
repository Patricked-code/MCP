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

## Programme en cours — TASK-20260901-001

La séquence détaillée, les dépendances et les contrats d'intégration sont portés par `ROADMAP.md`. `TASK-20260901-001` est officiellement enregistrée dans Operational Memory, mais son plan approuvé borne l'exécution à A2.1. B1 et les lots suivants restent des candidats non enregistrés tant qu'aucune décision gouvernée n'a réconcilié autrement cette portée.

### A2.1 — Connection Context minimal — fonctionnellement déployé, clôture restante

- [x] rattacher durablement le principal OAuth et la Governed Session à un `ConnectionContext` minimal sans second moteur de session ;
- [x] conserver une classification initiale `UNRESOLVED` sans inventer l'identité du client ;
- [x] ne jamais inventer de `conversation_id`, workspace ou project ref externe ;
- [x] conserver secrets, codes, tokens, transports bruts et resume proofs hors du contexte et de la journalisation ;
- [x] préserver les sessions historiques sans backfill et les credentials partagés avec `connectionContext: null` ;
- [x] corriger TDD-first le risque de binding orphelin puis valider `272/272`, merge et déploiement exact-SHA ;
- [ ] fusionner et attester la réconciliation documentaire, obtenir `FULLY_ALIGNED`, puis clôturer `TASK-20260901-001` selon le plan approuvé.

### A2.2 — Verified Client Evidence — restant et conditionnel

- [ ] classifier l'identité cliente uniquement lorsqu'une preuve vérifiable et bornée est réellement fournie ;
- [ ] conserver `UNKNOWN` en l'absence de preuve et ne rien déduire du seul `clientId` opaque ;
- [ ] persister une référence conversation/workspace uniquement si elle est fournie, autorisée et sanitizable ;
- [ ] garder A2.2 non bloquant pour B1 lorsque le principal OAuth suffit à la résolution GitHub gouvernée.

### GitHub Identity & Repository Resolution

- [ ] résoudre les comptes GitHub autorisés liés au contexte courant ;
- [ ] compléter le mapping GitHub user/account → rôle projet sans exposer le token ;
- [ ] gérer `NONE` / `AMBIGUOUS` sans choix arbitraire ;
- [ ] résoudre le repository explicitement fourni ou déjà gouverné ;
- [ ] supprimer progressivement les dépendances hardcodées à `Patricked-code/MCP` uniquement quand un `repositoryId`/mapping validé est disponible et sans casser le cas historique.

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
