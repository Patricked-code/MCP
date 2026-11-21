# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Point de reprise canonique de mission

> Alias verbal : « Rejoins la mission de résolution du problème des registres ».\
> Projet GitHub : `Patricked-code/MCP` ; UID parent candidat `WT-PROJECT-MCP-001` (PR #389).\
> Continuité de la mission : **`WT-MCP-REGISTRY-RESOLUTION-20261121-01`**.\
> Intervention : **P01 — Audit de couverture**, travail sur `mcp/registry-resolution-audit-20261121` ; fichier présent dans une PR draft après publication et non encore en production.
> Reprise opérateur : ne jamais présumer que le SHA et les comptes observés le 2026-11-21 sont toujours actuels.

## État au point d'arrêt

- MCP HTTPS répond ; Live State observé version 1410 ; GitHub main/S1/runtime au SHA `5bc5e2b4c0b2aa176c1f6131826afbea7af2f164` et runtime healthy lors de l'audit.
- Documentation courante non alignée : `DOCUMENTATION_DRIFT`, référence ancienne `fb0cb474...`.
- GitRegistry V1 : 3 connexions, 6 dépôts, 5 mappings, 2 projets, 1 migration en attente.
- GitHub comptes durables : 17 + 31 + 25 références non dédupliquées.
- Work Queue : 21 tâches (14 DONE / 3 READY / 4 SUPERSEDED), storeRevision=244 ; sessions visibles=31.
- `.mcp/server-map.json` : S1 targetProjectIds est vide.
- CUG webhook reçoit et déduplique ; pas encore de pipeline vérifié à la queue ni au cockpit universel.
- GitHub direct Patricked-code/MCP accessible ; chemin contrôlé MCP `github_get_repository_state` a retourné `GITHUB_CONTROL_ORG_NOT_ALLOWED`.
- Cette mission **n'a pas activé** de tâches, registres, cibles, hooks, écritures S1/S2 ou accès supplémentaires.

## NEXT_ACTION strict

1. Relire ce dossier, les instructions `GPT.md`, `AGENTS.md`, `SUIVI.md`, `SOURCE_OF_TRUTH.md`, les documents de #389 et les derniers points de reprise CUG.
2. Réobserver GitHub live, exact HEAD, S1/runtime/documentation, éviter collisions avec d'autres branches et déclarer les divergences.
3. Compléter et faire relire la matrice P01 : autorités de chaque projet, registres et identifiants réellement disponibles ; prouver les permissions et cibles, ne pas inférer depuis le nom.
4. Diagnostiquer le `GITHUB_CONTROL_ORG_NOT_ALLOWED` et le G1 drift ; préparer les corrections additives après preuve et admittance gouvernée.
5. Seulement après la revue et la clôture de P01, déclencher P02/P03, avant tout code d'auto-raccordement CUG ou frontend.

## Conditions de succès

L'identifiant de mission ramène aux mêmes documents, responsabilités, dépendances et blocages depuis toute nouvelle conversation ; aucune nouvelle Task Queue n'est déduite de ce fichier. Les checkpoints futurs sont ajoutés dans l'autorité de continuité existante puis référencés ici par leur ID, sans inventer leur existence.

## STOP CONDITIONS

Divergence d'HEAD, source/ownership absent, chemin GitHub interdit, identité de dépôt ambiguë, conflit entre registre et mémoire, absence de validation ou CI/revue pour mutation. En cas de STOP : documenter le motif et garder une action de reprise, sans supprimer ni remplacer l'historique.

## 2026-11-21 — Checkpoint audit P02 / gate E2

- Le parcours E2 demandé par le propriétaire a été exécuté : `mcp_e2_reconcile_preflight` → `BLOCKED/E2_DOCUMENTATION_DRIFT` ; `canStartOrdinaryWork=false`. Main/S1/runtime restent alignés à `5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`, mais `PRODUCTION_STATE.json` déclare `fb0cb47417ace348176ff3218484783cc6978a8d`.
- La **PR #429** existante est le correctif documentaire G1 exact SHA ; seul `PRODUCTION_STATE.json` change. Son commit `b42aad9d145b4864c882683d4f869fea164cb5ba` possède une CI `MCP CI` #44742423754 terminée SUCCESS ; aucune revue GitHub n'a été renvoyée lors du contrôle. **Ne pas fusionner sans revue indépendante et autres gates**, ne pas créer un G1 concurrent.
- Diagnostic du refus Bridge : `src/tools/githubControlPlaneRead.ts` et `src/tools/githubLifecycle.ts` appliquent `assertOrg(organization, env.GITHUB_ORG)` ; `defaultTargetOwner=chainsolutions-wealthtech`, alors que l'appel cible `Patricked-code`. Les droits GitHub directs séparés sont attestés ; aucune politique élargie ou contournement n'a été appliqué.
- Le plan détaillé **35 opérations RG-001…RG-035** a été créé dans `WT-MCP-REGISTRY-RESOLUTION-20261121-01__IMPLEMENTATION_PLAN.md`. Il inclut l'intégration des modules existants, la fédération read-only, les admissions CUG/Queue, la UI cockpit, les tests historiques et la chaîne Governed Deploy.
- **Réalité déploiement :** `.github/workflows/mcp-deploy.yml` décrit OIDC → S1 Docker Compose. Aucun déploiement Kubernetes MCP actuel n'est attesté ; une migration Kubernetes ne saurait être annoncée ni intercalée sans mission/gates distincts.
- **NEXT_ACTION** : clore G1 en procédure documentée (PR #429 revue, merge admissible, Governed Deploy, attestation), revalider E2 ; compléter P01 en lecture, puis commencer P03 après gates. Aucun code runtime ni autre dépôt modifié dans cette session.

### Limites de poursuite automatique (constat après le checkpoint)

- La continuité est publiée sur la branche GitHub et la PR #430, mais **son enregistrement comme continuité E2 runtime visible par `mcp_e2_list_continuities` n'est pas attesté** : le préflight E2 reste BLOCKED.
- Une tentative de création d'une automation horaire propre à cette mission a échoué avec `too_many_active_automations` : 5 tâches existantes pour une limite de 5. **Aucune automation supplémentaire n'a été créée et aucune automation existante n'a été modifiée.** La poursuite sans nouveau message n'est donc pas garantie par cette tentative.
- Le dernier HEAD observé de la PR #430 est `94412a39a0cf9b20c38d3b9207690b9a2b29629f` ; run MCP CI #44933287364 `in_progress` lors de l'observation. Son issue doit être réobservée avant toute validation.

## 2026-11-21 — Correction chronologique du checkpoint précédent et exécution P03/P08/P09

> **Ce checkpoint est postérieur à la section « Limites de poursuite automatique » et prévaut pour les faits datés ci-dessous.** Le journal historique reste append-only : les blocages antérieurs ne sont pas supprimés, mais ils ne doivent pas être réutilisés comme état actuel.

- **G1 résolu et déployé :** PR #429 revue par `Wealthtechinnovations`, fusionnée sur `main@a0c7052fe72f65d604ec060a129977708c91d6f5`, GitHub/S1/runtime/OCI healthy et Live State v1416 `FULLY_ALIGNED`. Le préflight E2 renvoie `canStartOrdinaryWork=true` et aucun blocage de synchronisation : ne pas redemander la revue G1 déjà obtenue.
- **E2 activation séparée encore bloquée :** l'écriture append-only de journal canonique sur issue #359 via le credential GitHub *du serveur* reçoit `E2_JOURNAL_POST_HTTP_403`. Le connecteur GitHub ChatGPT autorisé ne peut pas remplacer cette permission dans l'outil runtime. [Diagnostic et demandes de remédiation](https://github.com/Patricked-code/MCP/issues/359#issuecomment-7067480197).
- **Automatisation de continuation :** contrairement au checkpoint ancien, **l'automatisation existante** `Automation_ed5206f7042c8191b454a1cda0d0c4af` « Continuité CUG GRT GRGS » **a bien été enrichie** du mandat distinct `WT-MCP-REGISTRY-RESOLUTION-20261121-01` et demeure active avec `RRULE:FREQ=HOURLY`. Elle reprend périodiquement le chantier et ne doit pas dupliquer les branches déjà possédées. **Elle n'est pas un worker codeur 24 h/24.**
- **RG-008..RG-012, PR #431 :** `mcp/registry-federation-projection-20261121`, dernier HEAD observé `2da41e1792bce2fae1bf1bfe9b09badbc272f1d0`, MCP CI #44938966678 **SUCCESS**. Projection fédérée pure sans second registre, adaptateurs GitRegistry V1/V2 + Governed Task Queue, tâches historiques, preuves, Project UIDs et dépendances inter-dépôts. Deux cycles de revue automatisée ont détecté sept constats P2 désormais corrigés par tests et réponses sur les fils ; nouvelle demande de revue sur ce HEAD [ici](https://github.com/Patricked-code/MCP/pull/431#issuecomment-7067777825). Ne pas prétendre à `APPROVED` tant que GitHub ne l'atteste pas.
- **RG-025..RG-029, PR #432 :** `mcp/registry-federation-cockpit-20261121` HEAD `018669f33b084c270d9daace006fc77d97bb6c9f`, CI #44938580442 **SUCCESS**. Frontend `/registry-cockpit` derrière l'auth web existante, lecture des autorités, filtres, historique terminal, échappement XSS et isolation entre dépôts. **PR empilée sur une ancienne révision de #431 : réconcilier la branche par changement additif avant toute fusion**. Aucune mise en production.
- **RG-030/RG-032, PR #433 :** `mcp/registry-governed-review-dispatch-20261121`, HEAD `f1227afa2024d2af73c9e587350607f23b3a9c63`, workflow GitHub Actions borné proposant automatiquement `@codex review` après CI verte et vérification des SHA/permissions. Le workflow est enregistré dans la politique `.mcp/provisioning-contracts.json` sous `NOT_PROVISIONING`, sans auto-approbation ou fusion. CI #44939759959 **in_progress au dernier contrôle**, revue bot en cours. N'annoncez pas une activation runtime avant merge/attestation/pilote réel.
- **Exécution réellement continue :** `src/cug/receiptConsumer.ts` contient un poller in-process pour le pilote CUG, mais ni lui ni les automations ChatGPT horaires ne constituent un agent de codage supervisé permanent. L'état UAES précédemment observé `runtime_operational=false` interdit de prétendre à la disponibilité d'un worker IA 24 h/24 sans pilote d'hébergement, credentials et supervision attestés.
- **Autorités et non-régression :** aucun des trois nouveaux lots #431/#432/#433 n'est fusionné sur main dans ce checkpoint. Les données historiques et secrets restent en place, GitRegistry et Governed Task Queue demeurent sources de vérité. Aucun autre dépôt n'a été modifié.

**NEXT_ACTION exécutable avec le présent mandat :** réobserver le dernier SHA/CI et les nouvelles remarques des PR #431 et #433, corriger les P2 éventuels, déclencher une revue automatisée indépendante et fusion/auto-merge seulement si les rulesets et la politique `CI_AND_REQUIRED_REVIEWS_ON_EXACT_SHA` le permettent ; après PR #431, réconcilier #432 sur base fraîche, valider CI/revue et effectuer Governed Deploy + Live State ; avancer ensuite les étapes CUG→admission/queue/cockpit enrichi, sans contournement du droit de journal E2. En parallèle, qualifier la permission `Issues:write` du credential serveur et les prérequis d'un worker durable sous supervision.

## 2026-11-21 — Extension de mission : usine logicielle gouvernée 24/7

**Intention propriétaire :** l'usine ne doit pas dépendre d'une conversation ChatGPT. En continu, elle doit observer CUG/GitHub Insights, reconnaître les dépôts autorisés, cartographier leur code/architecture/dépendances, planifier à partir des TASKS/TODO et du Program Backlog sans usurper leurs autorités, admettre les tâches dans la queue existante, exécuter avec agent host authentifié, tester, faire revoir, merger et déployer de façon gouvernée, réconcilier puis reprendre le prochain travail admissible.

**Nouveau plan versionné :** RG-036 à RG-056 / phases P10 à P17 ajoutés dans `__IMPLEMENTATION_PLAN.md` et `__ROADMAP.md`, décisions D09 à D17. **Aucune seconde mission ni deuxième queue.** GitHub Insights et SBOM sont des preuves d'observation, non des mandats. C26/C27 + UAC + Operational Memory restent la base de l'exécution.

**Observation fraîche avant l'extension :** MCP HTTPS ping OK ; Live State observé à `2026-11-21T19:47:50.075Z`, GitHub/S1/runtime au SHA `51a4fd1e3841d586f335669198dccd342497bfc1`, santé `healthy`, mais `DOCUMENTATION_DRIFT` encore présent. **Le runtime autonome du codeur 24/7 n'est pas attesté.**

**PR connues à revalider avant chaque acte** : #432 cockpit (dernier HEAD observé `43252967d009640358f2d02316825f61d65a8616`, CI #44942237447 SUCCESS, un fil de revue restant à contrôler), #434 G1 doc-only HEAD `7ba203e191bfd472320ed398d3da2ccd7ff17745`, CI SUCCESS, revue non attestée, #435 CUG candidates HEAD `024c7a5020bda1f870ceba90d870b0396f1e4b50`, CI SUCCESS, revue non attestée ; #430 reste docs-only. Ces constats sont datés, pas des états intemporels.

**NEXT_ACTION** : relecture des derniers PR/revues/CI et arrêt des collisions ; audit des fonctionnalités Insights/rulesets/permissions réelles de MCP puis de chaque dépôt réellement admis par CUG ; plan de worker isolé avec test du chemin d'exécution C26/P2. NE PAS déployer un worker ou modifier les règles d'approbation simplement à partir de ce document. Une automatisation horaire n'est pas un hôte agent permanent ; attester le service avant toute affirmation 24/7.

## 2026-11-21 — Source DOCX lue intégralement et rapprochement permanent

- **Fichier d'entrée** : `Loop Engineering.docx` (39 pages, 637 paragraphes, 12 tableaux ; source SHA-256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`). Le document contenait deux réponses d'architecture et un mandat de chantier `WT-MCP-AUTONOMY-24X7-20261121-01` explicitement **proposé non créé**.
- **Traçabilité durable de lecture** : [`__SOURCE_READING_LOOP_ENGINEERING_20261121.md`](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md) ; 10 phases, 15 opérations, 11 types docs, deux graphes, classification sémantique, C26/UAC/P2, C27 et matriçage de preuves.
- **Sous-continuité documentaire créée** : [`subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__CONTINUITY.md`](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__CONTINUITY.md), avec neuf fichiers locaux structurés, **enfant de la même mission**, pas E2 TaskRecord/runtime ni UAES déployé.
- **Vérifications source** : `src/governance/e2EntryJournal.ts` utilise l'issue #359 ; `scripts/mcp-autonomous-agent-continuation.mjs` a les ports hôte C26 ; `MCP_AGENT_RULES.md` est planning-only ; UAES `state/CURRENT_STATE.json` déclare U02 pending et `runtime_operational=false` ; `Loop/README.md` déclare une base documentaire.
- **Alignement à l'observation du 21/11/2026 20:10 UTC** : MCP GitHub main/S1/runtime `51a4fd1e3841d586f335669198dccd342497bfc1`, runtime healthy, **DOCUMENTATION_DRIFT** parce que doc toujours `5bc5e2b4...`; la PR #434 reste non fusionnée. PR #430/#432/#435/#436 ouvertes, commits de branches **non déployés**.
- **NEXT_ACTION** : contrôler CI du dernier HEAD de #430, maintenir l'index documentaire ; réviser les PR #432/#434/#435/#436 et éviter les collisions ; traiter G1 puis le 403 E2 via les credentials autorisés ; mettre en place le pilotage C26↔UAES U02 et les tests de récupération sur une infrastructure autorisée sans jamais fabriquer une preuve 24/7.

## 2026-11-21, 21:11 UTC — Point de reprise du mandat transversal G1 / E2

- **Mandat propriétaire** : complément ponctuel fiabilisation permanente G1/E2 et rapprochement général, sans changer le chantier racine `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ni RG-001…RG-056. Aucun worker 24X7 lancé à ce titre.
- **Observation MCP HTTPS** : GitHub `main` = S1 `head/originMain` = runtime sain sur `51a4fd1e3841d586f335669198dccd342497bfc1`; Live State v1421, documentation `5bc5e2b4...`, verdict `RECONCILIATION_REQUIRED / DOCUMENTATION_DRIFT`, E2 préflight `BLOCKED / E2_DOCUMENTATION_DRIFT`.
- **PR #434** : `7ba203e191bfd472320ed398d3da2ccd7ff17745`, CI `44941512738 SUCCESS`, aucun fil de revue non résolu mais aucune revue indépendante enregistrée lors du contrôle. **Branche et PR laissées intactes.** Ne pas merger sans CI/review/protections applicables.
- **Journal E2** : `src/governance/e2EntryJournal.ts`, issue #359 (fermée historiquement), serveur credential `src/github/connection.ts`. Probes GET user/repo/PR 200 ; dernière tentative POST journal `E2_JOURNAL_POST_HTTP_403`. Auth lecture n'est pas preuve d'Issues:write. Aucun token ni permission modifiés ici.
- **Cause structurelle observée** : le job G1 historisé possède des tentatives de preuve 60 s / 3 essais ; `UNVERIFIED` ne donne pas la cause détaillée au workflow. Le chemin `docs_only` existe déjà dans `src/liveState/collect.ts` et doit être conservé/protégé. Le verdict autoritaire G1 reste strict.
- **Correctif indépendant** : PR #439 `mcp/g1-e2-proof-diagnostics-20261121`, HEAD initial `03e1434f0bae4b1fa20887a02f70e445131c6986`, CI #44950662585 en cours au checkpoint. Motifs bornés et fenêtre de preuve étendue sans promouvoir les refus. Ne modifie ni `PRODUCTION_STATE.json` ni la branche #434 ni le journal E2.
- **NEXT_ACTION** : obtenir la revue exigée #434, merger selon les gates, attester Governed Deploy puis refaire E2 ; vérifier CI+revue #439 et corriger régressions ; diagnostiquer/autoriser le credential exact Issues:write du serveur, rejouer journal+readback puis READY_FOR_OWNER et RESUME de la continuité canonique ; intégrer la classification générale dans les contrats de fédération existants et les checkpoints.
- **Ne pas déclarer** `FULLY_ALIGNED`, `E2_READY`, `JOURNAL_REPAIRED` ou `MISSION_DONE` sans les preuves live respectives. Maintenir la priorité et les locks des autres agents et toutes les PR CUG/Cockpit/Insights.

## 2026-11-21 21:28 UTC — G1 déployé et préflight E2 à nouveau admissible (complément ponctuel G1/E2)

- **PR #434 :** revue Codex vérifiée dans l'issue GitHub (summary `code_review.status=completed`, exact HEAD `7ba203e191bfd472320ed398d3da2ccd7ff17745`, aucun major finding), CI #44941512738 SUCCESS, ruleset `protect-main` requis (validations et fils résolus, `required_approving_review_count=0`), fusion normale sans bypass. **Merge SHA** `58e9a89710c877c9253b45f70643204a2445512b`.
- **Deploy attesté** : observé via Live State MCP (21:28 UTC) GitHub `main` = S1 HEAD = origin/main = runtime OCI `58e9a89710c877c9253b45f70643204a2445512b`, health `healthy` ; `documentation.drift=false`, `alignment.global=FULLY_ALIGNED`, `nextAction=null`. Workflow déclenché sur SHA : MCP Governed Deploy #44951084628 ; rapprocher son résultat GitHub Actions exact séparément des observations Live State.
- **E2 preflight réexécuté** : `gate=DISCOVER_GITHUB_CONTINUITIES`, `blockers=[]`, `canStartOrdinaryWork=true`, Live State version 1426 et mêmes 3 SHA. L'incident `E2_DOCUMENTATION_DRIFT` est corrigé **pour cette version** ; ne pas généraliser aux déploiements suivants sans preuve.
- **E2 activation réelle** : tentative `mcp_e2_activate` avec `allow_write=false` refusée `E2_ENTRY_JOURNAL_UNAVAILABLE` / `E2_JOURNAL_POST_HTTP_403`. L'entrée `E2-44A6BFA9-BE8B-4CF9-A5AE-29344248401D` est une **tentative NON enregistrée** : ne pas la compter comme reçu. L'issue #359 est `closed` mais `locked=false`, ce qui ne suffit pas à expliquer 403 ; lecture du credential serveur `Patricked-code` réussie, écriture `Issues:write` NON prouvée. Requiert gestion du credential effectif par circuit administration autorisé ; ne PAS substituer le compte GitHub connecté à ChatGPT.
- **PR #439 (structurelle) :** diagnostic borné G1 avec refus `UNVERIFIED` maintenu ; CI initiale #44950662585 FAIL (3 tests) puis corrections #44950951212 SUCCESS sur `1d74502f7a9f469b45faeae08232265f57b75518`. Revue Codex terminée sans findings sur ce HEAD historique ; branche mise à jour **sans force** sur `main@58e9a897...` avec commit à deux parents `ad53fb33c59815be07e0cb9a52be6348ea6600ac`, conservant la correction doc. **NOUVEL HEAD** exige nouvelle CI et revue exacte avant fusion ; aucun code #439 n'est encore dans le runtime.
- **NEXT_ACTION immédiate** : (1) recontrôler CI/revue du dernier HEAD #439, réparer au besoin puis fusion/déploiement gouvernés uniquement après checks ; (2) diagnostiquer/obtenir `Issues:write` pour le **credential du serveur**, revalider POST+readback, `ACTIVATED`, `READY_FOR_OWNER`, puis RESUME `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` ; (3) conserver programme parent RG-001…056, fichiers, autres PR CUG/GRT/UAES intacts, test de drift sur prochain déploiement.
- **Clôture interdite** tant que le journal E2 n'a pas un reçu réel et que le chemin permanent n'a pas démontré sa reprise après déploiement. Le checkpoint précédent décrivant `E2_DOCUMENTATION_DRIFT` est historique et désormais dépassé par cette observation, mais reste archivé pour traçabilité.

## ANCRAGE NON RÉÉCRIVABLE — avant la parenthèse G1/E2 (reprise de la mission registres)

**Repère historique :** 2026-11-21, avant la demande ponctuelle de fiabilisation E2/G1 ; ceci est un **état figé**, non un état live. L'agent qui lit cette section DOIT ensuite consulter les checkpoints datés plus récents sans effacer ce point.

- **Mission de référence :** `WT-MCP-REGISTRY-RESOLUTION-20261121-01`, programme stable **RG-001…RG-056** ; enfant `WT-MCP-AUTONOMY-24X7-20261121-01` exclusivement pour RG-043…056.
- **Périmètre avant la parenthèse :** federation read-only des identités/projects GitRegistry, observations CUG, admissions GRT, tâches P2, dépendances, mémoire, cockpit multi-projets, GitHub Insights ; restituer un projet/chantier/tâche avec provenance, date et degré de vérification, préserver tous IDs historiques. Aucune nouvelle autorité ni second queue.
- **Inventaire de départ observable :** 73 références de trois comptes GitHub → 44 owner/repo distincts après déduplication ; baseline GitRegistry V1 : 2 projets, 6 repos, 5 mappings, 3 connexions, une migration pending ; Task Queue : 21 tâches (14 DONE/4 SUPERSEDED/3 READY) ; 31 sessions. **Ces nombres ne sont pas le total des projets certifiés.**
- **Ordre convenu initialement :** P0 alignement G1/E2 afin de restaurer une entrée gouvernée ; P1 #430 mémoire/audit ; P2 couverture CUG/Insights/GitRegistry ; P3 cockpit #432 ; P4 admissions CUG/P2 #435 ; P5 Insights #436 et graphes ; P6 préparation UAES isolée C26 sans activer le codeur ; P7 C27, reprise/endurance, déploiement et vérifications. Contrôler également la PR #433 de revue indépendante. La PR #431 (projection fédérée) est déjà fusionnée à cette référence.
- **Source primaire dans la PR #430 :** `__COVERAGE_AUDIT.md`, `__IMPLEMENTATION_PLAN.md`, `__ROADMAP.md`, `__MISSION.md`, `__DECISIONS.md`, `__CONTINUITY.md`, et les matrices de la source Word Loop Engineering.
- **NEXT_ACTION de reprise APRÈS la parenthèse :** recontrôler latest main/S1/runtime/docs, CI/revues/PR et locks ; reprendre P2 couverture GitRegistry/Insights et livraison des PR en respectant les prérequis. **Ne jamais redémarrer un audit de zéro ni confondre la parenthèse G1/E2 avec la mission de fond.**

### Parenthèse G1/E2 — situation et séparation des responsabilités

- PR #434 : fusion `58e9a89710c877c9253b45f70643204a2445512b`; PR #439 : fusion `41a9239a4de4c92896269d5e3a7754cf6b37ec2c`, G1 verdict strict + diagnostics `UNVERIFIED` déjà déployés sur main/S1/runtime lors du dernier Live State observé.
- À **21:44 UTC** (observation ponctuelle), le code GitHub/S1/runtime est identique au SHA `41a9239a4de4c92896269d5e3a7754cf6b37ec2c`, health healthy, mais `PRODUCTION_STATE.json` déclare encore `51a4fd1e...`, et Live State = `RECONCILIATION_REQUIRED / DOCUMENTATION_DRIFT`. **E2 préflight BLOCKED** sur la divergence documentaire ; ne pas annoncer une réparation définitive.
- Le workflow G1 #44952149211 a déployé **SUCCESS** mais son job `reconcile-documentation` a échoué avec `UNVERIFIED` / `G1_DOCUMENTATION_CONTRADICTIONS`. L'observation ultérieure ne montre pourtant qu'une contradiction documentaire : la convergence des preuves est donc à surveiller après stabilisation. Les 6 contrôles post-déploiement historiques n'exploitaient pas toute la fenêtre 180s.
- **Patch dans CETTE MÊME BRANCHE de mission** (sans autre branche) : boucle de lecture G1 réutilisant les règles #439, jusqu'à 16 essais au lieu de six dans la même borne temporelle de 180s, avec tests de workflow synchronisés. Tant que CI/revue/merge/deploy de #430 ne sont pas attestés, cette modification est **BRANCH_ONLY** et ne corrige pas la production.
- **Rôle réel de l'issue #359** : `src/governance/e2EntryJournal.ts` constitue un journal append-only de `ACTIVATED / READY_FOR_OWNER / OWNER_RESUME / CONTINUITY_REGISTERED` et utilise POST + read-after-write sur issue comments. La reprise E2 owner refuse une absence de reçu ; supprimer l'issue sans successeur ferait perdre les preuves et casserait l'admission.
- **Alternative existante à étudier** : `src/operationalMemory/eventJournal.ts` stocke `/app/data/mcp-operational-events.jsonl` et connait `reconcile.requested/reconcile.completed/checkpoint.created`; **il ne fournit pas actuellement un E2 journal équivalent avec lecture exhaustive et receipts propriétaire**. Son stockage tourne/archives et requiert une migration/adaptation prouvée avant remplacement, avec contrôle d'idempotence, durabilité, rétention, migration des reçus historiques #359 et tests d'equivalence. Ne PAS faire du suivi E2 une deuxième Task Queue ou un registre concurrent.
- **E2 403 :** le credential du serveur peut lire le dépôt mais l'écriture `Issues:write` sur #359 n'est pas prouvée ; son remplacement ne se fait pas avec un token ChatGPT, ni une écriture fictive. La migration vers l'Operational Event Journal peut éliminer cette dépendance GitHub **uniquement après preuve de comportement et de pérennité équivalents** ; jusque-là erreur bloquante pour les admissions Owner E2.
- **NEXT_ACTION de parenthèse :** terminer CI exact HEAD du correctif #430, revue indépendante et merge autorisée, suivi Governed Deploy, observer G1 lors d'un déploiement suivant, traiter la journalisation E2 en choisissant une autorité attestée et tester RESUME, puis rendre les chemins d'entrée interrogeables ensemble. Lorsque ces conditions sont remplies, reprendre l'ancrage mission ci-dessus.

## 2026-11-22 — P2 RG-005/RG-006/RG-011/RG-021/RG-023 : rapprochement identité mission ↔ Project Binding (PR #442)

- **Mission et priorité INCHANGÉES :** `WT-MCP-REGISTRY-RESOLUTION-20261121-01`, D32, R01–R07, RG-001…056. Ce checkpoint ajoute une réalisation P2, pas un chantier, moteur ou programme concurrent. L'ancrage pré-parenthèse G1/E2 reste inchangé et autoritaire pour l'ordre des travaux.
- **Baseline lue avant patch :** 2026-11-21 23:37 UTC, GitHub `main` = S1 = runtime `ee6bc30ff911b3e5dfb2e3e76caa2e9ca1700024`, runtime healthy, `documentation.drift=false`, alignement `FULLY_ALIGNED` à cette observation seulement.
- **Identités et migration :** GitRegistry source V1, 2 ProjectRecords / 6 repositories / 5 mappings / 1 migration pending. `WT-PROJECT-MCP-001` est un UID documentaire candidat et ne devient PAS automatiquement le ProjectRecord historique `mcp_bridge`.
- **Code proposé, non livré :** [PR #442](https://github.com/Patricked-code/MCP/pull/442), branche `mcp/registry-p2-identity-crosswalk-20261122`, nouveau module pur `src/registryFederation/missionIdentityCrosswalk.ts` et neuf tests. Il compose les preuves GitRegistry/GW-06 existantes pour détecter une absence de ProjectRecord, une migration V1, un UID ou dépôt contradictoire, un mapping non prêt, un composant manquant et une provenance documentaire invalide. Aucun registre, session, Task, permission, mapping ou code serveur déployé n'est modifié.
- **État de livraison :** `BRANCH_ONLY / PR_DRAFT / CI_PENDING / REVIEW_PENDING / NOT_DEPLOYED`. L'existence du code et d'une PR ne certifie ni le raccordement automatique des documents par Continuity ID ni le déploiement.
- **Anti-collision :** #389 (racine projet), #432 (cockpit), #433 (revue), #435 (candidats CUG), #436 (Insights) restent propriétaires de leurs fichiers et sous-périmètres ; aucun fichier de ces PR modifié.
- **NEXT_ACTION :** valider CI exact HEAD et tests, obtenir une revue indépendante, corriger les constats sur #442. Puis utiliser le résultat de cette projection avec les lecteurs autoritaires existants, compléter la preuve d'installation CUG et des mappings Project Binding (P2), avant de raccorder cockpit/CUG/Insights. Merge et Governed Deploy seulement si les gates et propriétaires le permettent ; réattester GitHub/S1/runtime/G1, puis mettre à jour le checkpoint canonique de cette même mission.
