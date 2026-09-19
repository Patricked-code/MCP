# DECISIONS_LOG.md

## Role
Journal des decisions structurantes du MCP.

## 2026-09-19 — Les nouvelles informations passent un gate avant adoption

Décision : un `NEW_INFORMATION_INTAKE` est une entrée de connaissance, jamais une règle canonique ou une tâche par défaut.

Le système conserve un cursor incrémental dans les projections PRECODE existantes, sans créer d'autorité parallèle. Chaque intake est évalué selon compréhension, pertinence, preuve, objectif GWC, relation à l'existant, architecture, autorités, non-régression, impact et existing-first.

Une proposition de nouvelle autorité parallèle est `REJECT`. Une contradiction/supersession/breaking change est `HOLD_FOR_REVIEW`. Une preuve factuelle requise mais non vérifiée est `DEFER`. Les effets acceptés enrichissent d'abord un work item compatible existant avant toute proposition de nouveau travail.

Les agents travaillent depuis l'état réconcilié et un receipt, jamais directement depuis les intakes bruts. La fraîcheur du travail est gouvernée par `HEAD_SHA + canonicalRevision + backlogRevision`; un drift de connaissance ne bloque que les scopes affectés.

Les intakes #001/#002, déjà versionnés avec `canonicalAdoptionPerformed=false`, restent pending et doivent passer ce gate avant leur consommation par B-01.


## 2026-09-19 — PRECODE GitHub-first, sans dépendance MCP runtime

Décision : pendant la construction candidate sur `claude/ecstatic-edison-v1dyt1`, l'agent arrive directement par GitHub et reconstruit son contexte depuis le HEAD et les artefacts versionnés de branche. Le MCP runtime n'est ni un prérequis de connexion, ni une autorité de session, tâche ou lock pour le PRECODE.

Identité : la `candidateSessionId` est une identité branch-local dérivée pour la coordination. Elle ne doit jamais être présentée comme un véritable ID ChatGPT/Claude. Les références provider ne sont stockées que si le client les expose réellement ; sinon elles restent `null/UNAVAILABLE`.

Orientation : si le message permet de déduire information/continuation/both, l'agent route sans question redondante. Si l'intention est indéterminable, il demande les trois choix canoniques avant tout claim.

Évolution sans régression : les anciens enregistrements de candidate session restent lisibles ; les nouveaux champs sont additifs et peuvent être enrichis au prochain resume.


## 2026-09-19 — Continuité PRECODE multi-agent et informations de conversation

Décision : toute IA autorisée qui reprend `claude/ecstatic-edison-v1dyt1` doit reconstituer le contexte depuis les autorités de branche, analyser les nouvelles informations de sa conversation, les réconcilier avec la mémoire canonique/backlog, puis reprendre son claim ou recevoir le prochain work item dependency-safe/collision-safe.

Architecture : la capacité étend `Governed Context` et les projections PRECODE existantes. Elle ne crée aucune seconde Operational Memory, Task Queue, Governed Session, Lock Service ou mémoire canonique.

Sémantique : l'IA connectée reste responsable de comprendre le langage naturel. Le code n'essaie pas de persister/comprendre un transcript arbitraire ; il reçoit une projection bornée et effectue une réconciliation déterministe.

Mémoire/tâches : `DUPLICATE` ne duplique rien ; `COMPLEMENT` enrichit ; `DECISION` et `FINDING` sont tracés ; `TASK` enrichit/propose le work candidate ; `CONTRADICTION` et supersession d'une règle active sont `HOLD_FOR_REVIEW`.

Concurrence : un claim n'est durable qu'après relecture du HEAD exact et commit de la projection branch-local. Tout `HEAD_MOVED` invalide le choix non persisté et impose redispatch.

Frontière : aucun effet live avant `FINAL_PRECODE_VERSION_ACCEPTED`.


## 2026-09-18 — PRECODE = candidate évoluée complète avant intégration réelle

Décision : `claude/ecstatic-edison-v1dyt1` n'est pas une branche de documentation seulement. Après `GWC_ARCHITECTURE_GATE_PASS`, elle devient la surface de construction de la future version évoluée complète du MCP à partir du squelette réel existant.

Le candidate build doit produire progressivement le code, tests, workflows, types, compatibilité/migrations additives, wrappers, généralisations, extensions et primitives nouvelles justifiées des 18 blueprints, selon `REUSE → WRAP → GENERALIZE → EXTEND → NEW`.

Les work items candidate restent des `GWC-PRE-*` coordonnés par GitHub/canonical-memory/checkpoints. Ils ne sont pas des GovernedTaskRecords et ne nécessitent ni runtime Task Queue, ni runtime locks, ni OAuth bridge.

Frontière : `main`, S1, production, déploiement et activation live sont interdits jusqu'à `FINAL_PRECODE_VERSION_ACCEPTED`. Après ce gate, l'intégration réelle réobserve l'état courant du projet, réconcilie le drift éventuel et intègre la candidate déjà construite, sans redévelopper l'architecture.


## 2026-09-18 — PRECODE ne dépend pas de l'OAuth/bridge MCP

Décision : la finalisation PRECODE doit pouvoir fonctionner avec GitHub et les preuves versionnées sans ouvrir de session OAuth contre le serveur MCP.

Ordre de preuve : (1) audits/historiques/canonical-memory déjà versionnés, (2) GitHub live et artefacts CI, (3) uniquement si nécessaire, futur export serveur read-only indépendant du MCP/OAuth et publié comme artefact GitHub.

Le futur exporteur doit respecter le moindre privilège : identité read-only dédiée ou forced-command, commandes allowlistées, redaction, digest, TTL/fraîcheur, aucun secret et aucune capacité de mutation/restart/deploy/claim/lock.

Une preuve historique ne prouve pas automatiquement l'état live ; si aucune preuve fraîche n'est disponible, l'état est `UNKNOWN` ou `STALE`. Cette absence ne doit pas pousser un agent PRECODE à ouvrir une Governed Session runtime.


## 2026-09-18 — PR #95 reste PRECODE-only jusqu'à FINAL_PRECODE_VERSION_ACCEPTED

Décision : la branche `claude/ecstatic-edison-v1dyt1` sert d'abord à produire la version finale PRECODE complète. Le passage de `GWC_ARCHITECTURE_GATE_PASS` ne déclenche pas automatiquement l'intégration dans le MCP réel.

Le catalogue complet `T00→T204` reste visible et ordonné dans les artefacts PRECODE, mais l'exécution actuelle est limitée à la construction/revalidation/canonicalisation PRECODE `T00→T195`. Les tâches `T196→T204` et les Phases B→F décrivent l'intégration future ; elles ne doivent pas être matérialisées ou exécutées contre le runtime pendant cette phase.

La mémoire canonique doit permettre à tout agent de retrouver : état du programme, preuves, work item courant, session/handoff et `NEXT_ACTION`, sans utiliser une seconde Task Queue ni transformer les `GWC-PRE-*` en `TASK-*`.

Sortie obligatoire avant toute phase d'intégration réelle : `FINAL_PRECODE_VERSION_ACCEPTED`.



## 2026-09-17 — Flux pré-code : décisions de conception

Décision : les modèles `M1` à `M5` — `EvidenceRef`, `StepAttestation`, classes de rejeu, `RecoveryAnchor`, précondition d'arête — sont spécifiés au niveau conception, dans `docs/gwc/BLUEPRINTS.md`, sans aucune implémentation runtime. Motif : les phases `A7` et `A8` du flux pré-code les exigeaient, et le dossier les nommait sans les définir. Un modèle nommé mais non spécifié ne satisfait aucune condition de sortie.

Décision : toute arête du graphe porte un `trigger` typé et une `precondition` explicite. Motif : `A5-01` interdit les transitions implicites. Les 16 arêtes `SKIP` reçoivent chacune une condition propre, dérivée du contrat source, plutôt qu'une formule générique — une condition de saut générique n'est pas une condition.

Décision : `merge` et `déploiement` sont classés `NON_REPLAYABLE_MUTATION`. Motif : ces mutations ne convergent pas sur un second passage. Devant une invocation potentiellement dupliquée, la seule issue admise est de réobserver l'autorité pour savoir si la mutation a eu lieu — jamais de la retenter.

Décision : un verdict de gate doit être recoupé contre une preuve par phase. Motif : `AF-34` a montré qu'un gate peut se déclarer complet sans l'être, et qu'un vérificateur contrôlant les compteurs déclarés valide la déclaration, pas la réalité. `scripts/gwc-precode-verify.mjs` recoupe désormais le gate contre `.mcp/gwc-precode-status.json` et refuse un `PASS_WITH_EVIDENCE` dépourvu de référence de preuve relisible.

Décision : la mémoire canonique avance par nouveau bundle et déplacement du pointeur, jamais par mutation d'un bundle existant. Motif : règle déjà posée par `CLAUDE.md §8` ; elle est appliquée ici pour la première fois — `pr95-precode-gate` succède à `pr95-precode-architecture-complete`, qui reste immuable.

Décision : l'exécution s'arrête à l'entrée de la Phase B. Motif : la réconciliation de la Governed Task Queue exige une autorité runtime qui n'est pas atteignable depuis cette session. C'est un blocker gouverné réel au sens de `CLAUDE.md §9.5`, pas une fin de sous-tâche — et seule une classification `NEW_TASK` issue de cette réconciliation pourrait matérialiser une tâche runtime.

## 2026-09-17 — Conception d'évolution détaillée : décisions de conception

Décision : la conception d'évolution détaillée vit dans `docs/gwc/BLUEPRINTS.md`, aux côtés des blueprints qu'elle détaille, et non dans un document séparé. Motif : une seconde surface de conception aurait créé exactement la dispersion que `MCP_ANTI_DISPERSION_GOVERNANCE.md` interdit, et aurait forcé un agent à décider lequel des deux documents fait foi.

Décision : `AF-19` ne sera pas corrigé par un déclencheur `workflow_run`. Motif prouvé : `GITHUB_OIDC_POLICY` est gelée avec `allowedEvents = ['push', 'workflow_dispatch']`, et `validateClaims()` exige `tokenSha === requestedSha`. Un run déclenché par `workflow_run` échouerait deux fois — `oidc_event_not_allowed` puis `oidc_sha_mismatch` — et l'adopter exigerait d'élargir les événements admis et de relâcher la liaison au SHA, c'est-à-dire de démonter la protection même que `AF-19` vise à renforcer. Cette option avait été recommandée dans une analyse antérieure sur un argument de simplicité apparente ; la lecture intégrale de `src/deploy/githubOidc.ts` l'invalide.

Décision : `OD-07` reste ouverte avec trois options compatibles — étape `gate` existante, point d'admission serveur, dépendance de job — dont aucune ne modifie la politique OIDC. Motif : le choix engage les permissions du workflow de déploiement et les responsabilités de l'autorité de déploiement ; il relève d'une décision gouvernée, pas d'une déduction de conception.

Décision : `AF-22` et `AF-30` se corrigent en recopiant une forme qui existe déjà. `GithubOperationalContext.checks` porte `headSha` et `exactHead` ; `reviews`, déclaré dix lignes plus bas dans le même type, n'en porte aucun. La correction est donc une réutilisation de motif existant, pas une conception nouvelle.

Décision : l'acquisition atomique multi-verrous est placée **dans** `lockService.ts`, jamais à côté. Motif : c'est la seule nouveauté réelle de concurrence du programme, et l'implémenter ailleurs créerait un second système de verrouillage.

Décision : aucune définition de finding n'est inventée pour réconcilier un écart. Les affectations `AF-07` et `AF-08` du registre machine ne correspondent pas aux seules définitions versionnées, qui vivent dans l'archive non canonique. L'écart est enregistré sous `AF-33` et rattaché à `GWC-0` plutôt que résolu par hypothèse.

Décision : la propagation multi-repository est strictement additive et optionnelle. Une session, une tâche, un verrou ou un reçu écrit avant cette évolution doit rester valide, lisible et reprenable sans étape de migration. Un enregistrement sans `TargetScope` signifie la cible unique actuelle, jamais « tous les composants ».

Décision : le verdict est `DETAILED_EVOLUTION_DESIGN_READY_FOR_TASK_RECONCILIATION`, assorti de trois réserves énoncées explicitement. Motif : la couche de conception est complète et vérifiable par machine, et ce qui reste ouvert relève de décisions et de dispositions rattachées à un propriétaire, non de preuves manquantes. Les réserves sont écrites dans le verdict lui-même pour qu'il ne soit pas lu comme « tout est tranché ».

## 2026-09-16 — R3 : corps canonique, blueprints et frontière Task Queue / Execution Engine

Décision : le corps canonique de l'architecture ne contient que l'architecture retenue courante. Motif : un agent qui récupère un fragment du document ne doit jamais lire une conclusion invalidée et la croire actuelle. Les affirmations remplacées vivent dans `docs/gwc/DEPRECATED_CLAIMS.md`, l'histoire dans `docs/gwc/REVISION_HISTORY.md`, et un corps entièrement remplacé sous `docs/gwc/archive/` avec bannière non canonique.

Correction : la Governed Task Queue n'est pas le GWC Workflow Execution Engine. Elle fournit `initializeSeed`, `firstExecutable`, le claim, le cycle de vie, les priorités, les dépendances, l'ownership et les conflits de ressources. Le moteur reste une couche d'orchestration distincte qui compose les autorités existantes et n'acquiert aucune autorité métier nouvelle. Blueprint porteur `GWC-2`.

Décision : `TASK BLUEPRINT ≠ GovernedTaskRecord`. Le chemin est architecture → blueprints → réconciliation avec la Task Queue live → classification `NEW_TASK` uniquement → Task runtime. Un blueprint peut produire 0, 1 ou N Governed Tasks. `.mcp/gwc-task-seed.json` est supprimé au profit de `.mcp/gwc-blueprints.json`, jamais chargé par `initializeSeed()`.

Décision : aucun human gate générique. La validation conceptuelle était une étape de programme, pas une Task runtime. La Task de ratification `TASK-20260916-001` est supprimée. Les seules interruptions futures viennent d'autorités réelles : permission requise, capacité absente, ambiguïté, conflit, évidence périmée, lock, politique explicite.

Décision : portées de ressource au domaine de collision minimal. Sérialiser tout le programme derrière `repository:Patricked-code/MCP` n'est pas de l'anti-dispersion mais une perte de parallélisme. Deux travaux indépendants doivent progresser si dépendances satisfaites et portées et locks disjoints.

Décision : propriété architecturale des findings figée — `AF-19` à `GWC-15`, `AF-22` et `AF-30` à `GWC-14`, réconciliation de la pile de PR à `GWC-12`, multi-repository `TargetScope` à `GWC-10`. Leur priorité d'implémentation est volontairement plus précoce que la position de leur propriétaire dans le graphe ; cela ne crée pas d'architecture parallèle.

Décision : le modèle est réellement multi-repository. Un projet peut porter 0, 1 ou N repositories et runtimes, plusieurs endpoints et plusieurs SHAs indépendants. Réduire cela à un `PROJECT_SHA` unique est interdit. Session, Task et Receipt évoluent de façon additive et rétrocompatible.

Reconnaissance : les conclusions de R1 et R2 ont été produites avec `LOCAL_CLONE_USED = yes` et ne suffisent pas à une certification. Elles sont conservées, revalidées depuis `GITHUB_LIVE` ou explicitement marquées `À VÉRIFIER`. Une donnée live inaccessible n'est jamais compensée par le clone.

## 2026-09-16 — Le dossier GWC devient la source versionnée, la promotion des tâches reste humaine

Décision : l'architecture GWC et le backlog qui en découle vivent désormais dans le dépôt, sous `docs/gwc/` pour la lecture humaine et sous `.mcp/gwc-*.json` pour la lecture machine, plutôt que dans des documents externes. Motif : tout agent doit pouvoir lire le même état sans dépendre d'un canal hors dépôt, et les révisions doivent être traçables par Git.

Décision : le backlog est déposé dans un fichier de préparation `.mcp/gwc-task-seed.json` distinct de `.mcp/task-registry.json`. Motif : `initializeSeed()` charge le registre au démarrage ; y écrire directement rendrait exécutables des tâches issues d'une architecture non ratifiée. La promotion est une étape humaine explicite, documentée dans `docs/gwc/BACKLOG.md`.

Décision : les révisions du dossier sont additives. Une révision amende et signale, elle ne réécrit pas. Motif : non-régression documentaire et lisibilité de l'historique d'analyse.

Décision maintenue : aucune implémentation GWC ne commence avant ratification humaine de l'architecture (`TASK-20260916-001`). Les identifiants `GW-01` à `GW-73` restent un espace de noms stable et ne sont ni renumérotés, ni supprimés, ni fusionnés.

Point ouvert soumis à ratification : la table des familles `A=GW-01`, `B=GW-02..09`, `C=GW-10..12`, `D=GW-13..20`, `E=GW-21..33`, `F=GW-34..45`, `G=GW-46..57`, `H=GW-58..72`, `I=GW-73` est une dérivation convergente de deux analyses indépendantes, pas un texte du design. Elle doit être ratifiée avant d'être figée dans `ids.ts`.

## 2026-09-13 — AfricaFunds Phase 2 livrée, réconciliation terminale

PR #80 fusionnée depuis le head exact `18355de8d4892685ee4f68b11d1542fb249e838a` au merge `1eac93f631fcf7843d7e768bba7a4125ed00bdbb`; CI PR #841, CI main #842 et Governed Deploy #34 (run `34750625897`) réussis.

Live State `204` : GitHub/S1/origin-main/runtime exact-SHA, S1 propre/read-only et runtime healthy. Le seul DOCUMENTATION_DRIFT exige cette réconciliation descendante des six Markdown via une PR documentaire distincte.

Le dry-run du registre exécuté confirme 1 projet, 5 repositories, 4 mappings, capacités sensibles désactivées et aucune écriture. Aucun code fonctionnel, workflow, secret, permission ou checkout S2 modifié.

#840 à zéro job n'est pas une régression démontrée; #841 est la preuve du head fusionné. Le statut terminal, le checkpoint final, les locks et la fermeture de session restent exclusivement sous Operational Memory; les relire après le déploiement documentaire. Aucun DONE n'est anticipé par cette projection.

Le transport SSH direct indépendant du MCP reste un sujet séparé. La queue runtime doit être relue après clôture; aucune tâche ou permission n'est inférée de la roadmap.

## 2026-09-12 — AfricaFunds en deux phases dans l'unique GitRegistry

Décision : représenter AfricaFunds comme un projet logique multi-repository dans
l'autorité GitRegistry existante, jamais dans un nouveau Project Registry. La
première livraison ajoute uniquement une compatibilité structurelle optionnelle
aux lecteurs/writers V1 et au candidat V2 dry-run. La donnée AfricaFunds n'entre
qu'après merge, déploiement exact-SHA et attestation `FULLY_ALIGNED` de cette
fondation.

Compatibilité : un registre historique sans `projects` ne gagne pas ce champ par
normalisation ou migration. Les nouveaux projets et corrélations sont optionnels,
bornés et validés. Les composants doivent référencer des repositories/mappings
existants; un `HISTORICAL_VHOST` conserve `repositoryId=null`, `current=false` et
`deploymentSource=false`.

Autorités : GitRegistry V1 reste la persistance active; GitRegistry V2 reste
dry-run. GitHub, S2, server-map et Live State fournissent les preuves observées;
les permissions restent au SLOT-11. Aucun store, cache, observateur, outil,
Session Manager ou chemin de déploiement parallèle n'est créé.

Séquençage : la PR #78 est fusionnée sous garde du head exact
`f7800966119601e336c480da6f2f98eafe6e6e70` au merge
`b747dfc7f67786a40c19c285dbcdb3a07b78d5c0`. MCP CI #824 et Live State `175`
attestent les tests et l'alignement technique exact-SHA; la Phase 2 reste interdite
tant que la présente réconciliation documentaire n'a pas produit
`FULLY_ALIGNED`.

Exclusions : ne pas synchroniser les checkouts S2 en retard, toucher les untracked
API, modifier les dépôts AfricaFunds, transformer les vhosts historiques en Git,
déduire une permission ou mélanger le futur transport GitHub Actions → SSH → S1
avec `TASK-20260910-001`.

## 2026-09-11 — Repository Resolution B2 fail-closed dans les autorités existantes

Décision : SLOT-07 résout une identité de repository, pas une permission ni un
mapping aval. Le repository exact du `ConnectionContext` est prioritaire quand il
est déjà prouvé. En son absence, seuls `githubOwner/githubRepo` des mappings
GitRegistry V1 servent de candidats ; `activeContext`, fallback `mcp_bridge`,
`allowedAccess` et `deployEnabled` sont exclus.

Preuve : `RESOLVED` exige B1 `RESOLVED/CURRENT`, son même contexte
d'authentification éphémère et un `GET /repos/{owner}/{repo}` frais et concordant.
Zéro candidat dans un registre disponible donne `NONE`, plusieurs donnent
`AMBIGUOUS`, toute preuve insuffisante donne `UNVERIFIED`. Un 404 signifie
not-found-ou-invisible, porte une incertitude de visibilité et ne devient jamais
`NONE`.

Autorités : l'observateur durable existant est refactoré en batch éphémère ; le
credential n'est ni persisté ni projeté. GitRegistry V1 reçoit seulement une vue
d'évidence read-only qui distingue absence/corruption de zéro mapping, sans
modifier le lecteur historique. Governed Context et son cache existant portent la
projection. GitRegistry V2 demeure dry-run jusqu'à C1.

Compatibilité et sécurité : le champ B2 est optionnel pour les consommateurs
historiques ; B1, ConnectionContext V1, Identity Policy V2, sessions, tasks,
receipts, locks et outils restent lisibles. GitHub `permissions`, scopes, erreurs
brutes et données de projet/serveur/runtime/domaine sont rejetés. SLOT-11 reste
l'unique lieu des Effective Capabilities et le WRITE gate reste `shadow`.

Conflit de branche : le lot concurrent mélangeant Policy V3, permissions et
observateur parallèle a été annulé par commit descendant sans réécriture
d'historique. L'implémentation approuvée repart de l'arbre exact de la baseline.

Décision de revue : le premier passage indépendant a maintenu le gate fermé sans
finding critique et a exigé six preuves supplémentaires. Le RED `e81e3cd`
reproduit les écarts (`38/44`) ; le GREEN `ffc4c96` isole les single-flights par
inputs exacts, réobserve les autorités pour une collecte identity-scoped, borne le
registre avant parsing, conserve l'horodatage stale et refuse `.`/`..`. Le second
passage conclut `READY` sans finding restant et 76/76 tests ciblés.

Décision de livraison : la PR #75 est fusionnée sous garde du head exact
`dd2a9a7894f928aa5dac886c79dc269ea3838a7b` au merge
`f2c90902a627ee9209d805403e584f3123a0453a`. MCP CI main #811 et Governed Deploy
#29 sont réussis ; Live State `163` atteste GitHub/S1/origin-main/runtime exact-SHA,
S1 propre/read-only et runtime healthy. Governed Context observe B2
`RESOLVED/CURRENT` pour `github:Patricked-code/MCP`, GitHub repository ID
`1285534440`, sans reason code, incertitude ni permission dérivée. Après son passage
technique à `VERIFYING` révision 7, la tâche revient explicitement à `IN_PROGRESS`
révision 8 tant que la réconciliation documentaire descendante n'a pas elle-même
passé PR, CI, merge, déploiement et Live State `FULLY_ALIGNED`. Cette
réconciliation n'élargit aucune autorité et ne contient aucun changement runtime.

## 2026-09-08 — Résolution GitHub contextuelle B1 sans autorité ni permission parallèle

Contexte : A2.1 fournit déjà un `ConnectionContext` durable contenant le principal OAuth et, pour le cas historique courant, le repository `Patricked-code/MCP`. B1 doit résoudre l'identité GitHub sans supposer qu'un principal OAuth, un login GitHub, une organisation accessible, une Human Identity ou un Agent Role sont équivalents.

Décision de binding : sélectionner la connexion utilisateur `Patricked-code` pour `oauth:wealthtech-mcp-admin` uniquement lorsque le contexte exact `Patricked-code/MCP` est déjà prouvé. L'effet est `IDENTITY_ONLY` : il n'accorde aucun scope, rôle, grant, droit d'écriture, de merge ou de déploiement. Ce binding n'est ni global, ni exclusif, ni irréversible et n'empêche aucun futur binding contextuel vers `chainsolutions-wealthtech` ou un autre compte/repository.

Décision d'autorité : `.mcp/identity-policy.json` porte seulement la policy versionnée de sélection ; `data/github-accounts.json` et les mécanismes durable accounts existants portent les connexions configurées ; le secret storage existant porte le credential ; GitHub `GET /user` porte la preuve live ; Governed Context/Identity Block porte une projection dérivée. GitRegistry V2 conserve exclusivement l'autorité repo ↔ projet ↔ serveur ↔ domaine.

Décision de compatibilité : Identity Policy V2 étend l'intégralité de V1 avec `githubPrincipalBindings`. Les champs V1 restent obligatoires, V1 et V2 restent lisibles, aucun backfill n'est exécuté et les sessions historiques sans identité GitHub restent valides. Le repository est un filtre B1 lorsqu'il est déjà prouvé, jamais une précondition universelle créant une circularité B1 ↔ B2.

Décision d'intégration : enrichir `src/github/connection.ts`, `src/tools/durableAccounts.ts` et le collecteur/cache GitHub de Governed Context existants. Un même helper borné observe `GET /user` et les token files identiques sont dédupliqués uniquement pendant une collecte. Aucun second observateur/cache/store/registry/Session Manager ni nouvel outil MCP n'est créé.

Décision fail-closed : B1 produit seulement `RESOLVED`, `NONE`, `AMBIGUOUS` ou `UNVERIFIED`, avec provenance, fraîcheur et reason codes. Un `GET /user` prouve le principal utilisateur ; une organisation accessible reste un contexte organisationnel distinct. Permissions et Effective Capabilities restent au SLOT-11 ; le WRITE gate demeure `shadow`.

Décision de correction de revue : un profil public `GET /orgs/{owner}` ne prouve jamais l'accès du principal. Une organisation B1 exige une appartenance active et concordante via `GET /user/memberships/orgs/{owner}`. Les observations d'un même credential reçoivent une corrélation opaque uniquement pendant la collecte ; la projection exclut les contextes d'un autre credential et n'expose ni ne persiste cette corrélation. Une preuve ou corrélation insuffisante reste `UNVERIFIED`, sans permission implicite.

Gate de livraison : RED/GREEN publiés, documentation canonique, suite complète, CI/revue exact-head, merge protégé, déploiement GitHub → S1, attestation OCI/runtime et Live State `FULLY_ALIGNED` sont requis avant `DONE`. B2 reste un lot séparé et ne doit pas être précréé par B1.

Preuve fonctionnelle et décision de clôture : les corrections finales ont été publiées en RED `631b5070f201950d2cdcc73363df8004d4ab5fec` puis GREEN `9b1a572ab0362aeefa5e13f425225e1f510704b7`. MCP CI #777 et les trois threads résolus ont autorisé le merge protégé de la PR #73 au SHA `208b8744810a23e48a4282450786805e7ff18845`; MCP CI main #778 et Governed Deploy #27 ont réussi. Live State `96` a attesté l'exact-SHA GitHub/S1/runtime healthy et la projection B1 `RESOLVED` sans permission. La tâche est restée ouverte uniquement pendant la suppression de `DOCUMENTATION_DRIFT` ; la PR #74 a ensuite été fusionnée/déployée à `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c` et `TASK-20260907-001` a été clôturée `DONE` révision 19 avant la création séparée de B2.

## 2026-09-01 — Connection Context dans la Governed Session existante

Contexte : l'authentification fournit déjà un principal OAuth, un `clientId` et une assurance, mais ces preuves ne sont pas regroupées dans un contexte logique durable préparant la résolution GitHub/repository/projet.

Décision : ajouter un `ConnectionContext` versionné, strict, sanitizé, optionnel et imbriqué dans `GovernedSessionRecord`. Le contexte est créé uniquement pour une identité `oauth_subject` prouvée; un credential partagé conserve `connectionContext=null`. Aucun nom ChatGPT/Claude/Codex ni identifiant de conversation externe n'est déduit sans preuve.

Compatibilité : le champ optionnel maintient la lecture des sessions historiques. Le même `connectionContextId` est conservé pendant `ATTACHED` et `RESUMED`; aucune attache de transport ne doit incrémenter `sessionRevision`.

Frontière : ce premier lot ne modifie ni GitRegistry V1/V2, ni Bootstrap Receipt, ni Governed Context Service, ni WRITE gate, ni serveur/runtime/domaine. Les résolutions GitHub et Project Binding restent des lots ultérieurs.

Décision de pilotage : décomposer A2 dans `ROADMAP.md` en A2.1 `Connection Context minimal` et A2.2 `Verified Client Evidence`. A2.2 ne bloque pas B1 si le principal OAuth fournit déjà la preuve requise; aucun statut `LIVRÉ` n'est figé avant merge, déploiement exact-SHA et `FULLY_ALIGNED`.

Gate : tests RED avant code, suite complète, Draft PR, revue exact-head, GitHub → S1 uniquement et attestation Live State avant clôture.

Preuve d'exécution : le premier RED (`7335e3fdb0812402d4ed3cd570e9909beb74c475`) échoue uniquement sur le module absent; le second (`28b3bf45c903f43f56bd8b90921a34236f707f03`) échoue uniquement sur la persistance non encore implémentée. Les GREEN `994b71de97beeb14b48cbd8ad501f9844b145764`, `6088a707c8a2e580cc0467adbae06873c73f4265` et `2f9d752e5c2c9c4eff98138b67a3bd96b6561656` valident respectivement création, continuité historique et exposition via les surfaces existantes, avec CI complète réussie.

Décision de correction de revue : le finding P2 de binding orphelin est corrigé sans nouveau mécanisme de cleanup parallèle. Le contexte est construit et validé avant `TransportBindings.bind`; le test RED `f3b4bacd1d8a6975d33c949372cda6f1d1d2d523` puis le GREEN `81832e1b702a8dfe10cda5634d6092fb3a177142` prouvent l'ordre sûr des effets.

Clôture A2.1 : la PR #68 est fusionnée et déployée au SHA `024f6ad4c047614bdfaea0e317f371b789f60136`, avec CI PR #713 (`272/272`), CI main #714/#715 et Governed Deploy #24. La réconciliation PR #70 est ensuite fusionnée depuis `59de3687bf1b2439a24f092257236fb3f559feee` au merge `c87598ddab01131eb8d3b9bad35f9d0cbdc2a5d4`; CI PR #745, CI main #746 et Governed Deploy #25 réussissent, puis Live State `83` confirme `FULLY_ALIGNED`. Operational Memory clôture `TASK-20260901-001` à `DONE` révision 10, checkpointe, libère le lock et ferme la session.

Décision de réconciliation descendante : `TASK-20260901-002` est strictement documentaire et met à jour uniquement les six projections canoniques. Elle ne rouvre pas A2.1, ne modifie aucune autorité runtime et n'enregistre ni A2.2 ni B1. GitHub Identity/Repository Resolution reste une future tâche distincte soumise à son propre design, à une décision de binding du principal et aux gates de non-régression. A2.2 reste conditionné à une preuve cliente réelle et ne peut inventer aucune identité externe.

## 2026-08-31 — Attacher les transports actifs sans reprendre la session durable

Contexte : un client peut ouvrir des transports MCP OAuth successifs pour un même principal. Appeler `resumeSession()` à chaque transport incrémente `sessionRevision`, remplace le binding durable et invalide toute opération optimiste observée juste avant.

Décision : une session unique compatible en état `OPEN`, `ACTIVE` ou `PAUSED` produit `ATTACHED`. Le transport éphémère est ajouté aux `TransportBindings` existants sans écriture du session store, sans nouvelle autorité et sans incrément de `sessionRevision`. Seule une session `EXPIRED` encore reprenable produit `RESUMED` et une mutation durable.

Sécurité : `NONE`, `AMBIGUOUS`, `IN_USE` et le refus des credentials partagés restent fail-closed. L'attachement ne supprime pas les bindings actifs existants. L'audit encode `bindingResult=attached` et les logs n'exposent aucun identifiant de transport brut.

Preuve : RED CI #626/#628, GREEN exact-head `2e8fa683296f4f1bf53b9875104598696ba9c6e2` avec CI PR #645 et `258/258` tests. PR #62 fusionnée au SHA `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`; CI main #646 et Governed Deploy #19 réussis. Live State `63`, S1 propre et l'image OCI active attestent ce même SHA; trois lectures production conservent `sessionRevision=68`.

Clôture : une réconciliation strictement documentaire descendante de `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53` doit supprimer le drift documentaire. La tâche Operational Memory ne devient `DONE` qu'après CI/review/merge de cette réconciliation, nouvel autodeploy, Live State `FULLY_ALIGNED`, checkpoint final et fermeture de la Governed Session.

## 2026-08-29 — Unified Operational Work State sans autorité parallèle

Contexte : Live State, Current-State Inventory, Operational Memory, Governed Task Queue et le collecteur GitHub savent déjà observer leurs domaines, mais aucune projection unique ne relie encore capability, tâche, session, owner, dépendances, locks, GitHub, runtime et opération proposée pour répondre de manière bornée à « que peut-on faire maintenant ? ».

Décision d'architecture : ajouter `CapabilityReality`, `TaskReality` et `GovernanceDecision` comme projections dérivées dans le processus existant. Aucun store, service persistant ou moteur current-state concurrent n'est créé. GitHub reste autorité des PR/checks/reviews, Live State de l'alignement exact-SHA, Operational Memory des sessions/checkpoints/locks/receipts, Governed Task Queue des tâches et registrations MCP des capabilities.

Décision Observer Before Actor : une opération dépendante de GitHub ne peut ignorer l'état GitHub déjà observé. La branche de travail est résolue par priorité `session.workBranch`, puis `currentTask.workBranch`, puis branche d'entrée explicite. Les reason codes GitHub sont propagés dans `GovernanceDecision` uniquement lorsque l'opération exige cette preuve; ils ne doivent pas bloquer une opération indépendante de GitHub.

Décision de réalité de tâche : l'état déclaré ne remplace jamais la preuve observée. `TaskReality` signale les états en avance, en retard, incomplets ou contradictoires; `VERIFIED` exige les preuves de livraison nécessaires et ne doit pas être déduit d'un simple commit ou merge.

Décision de compatibilité : le WRITE gate reste `shadow`. Les décisions nouvelles sont observables et testables mais ne remplacent pas les contrats WRITE historiques. Tout passage à `enforce` reste hors périmètre et exige un GO, une décision et une PR distincts. OIDC, Autodeploy, 2FA, `ENABLE_WRITE_TOOLS` et `allow_write` restent invariants.

Preuve fonctionnelle : le head `34d51247c021524f4c3e03824c938529bc831743` a passé la CI `33236805556`, job `99059095387`, avec typecheck, build, docs, gouvernance, secrets, read-only safety et diff tous verts. Le test d'intégration Observer Before Actor a exposé successivement deux gaps réels — branche de tâche non propagée puis reason code GitHub non propagé — corrigés par deux changements minimaux sans refonte.

Gate de livraison : documenter ce chantier sur la même branche, obtenir CI du head documentaire exact, ouvrir une Draft PR, exiger revue et checks exact-head, fusionner uniquement sous les protections de `main`, puis attester Autodeploy/runtime/Live State avant toute clôture. La migration Node GitHub Actions et l'enforcement restent des chantiers séparés.

## 2026-08-28 — Clôture fonctionnelle de la correction Mandatory Bootstrap

Décision de livraison : accepter la PR #52 après validation `234/234`, CI exacte et revue indépendante sans Critical/Important/Minor, puis fusionner uniquement le head `33a3e424a5fe271cf82c1ee6db8c94785289e3ca` par `expected_head_sha`.

Décision d'attestation : retenir `fff44ff2db386942730a67f3884980c7824cae7f` comme baseline fonctionnelle seulement après succès de la CI main, de l'Autodeploy et des preuves GitHub/S1/OCI/runtime. Le SHA déclaré reste la baseline fonctionnelle lorsqu'une PR descendante modifie uniquement Markdown, `PRODUCTION_STATE.json` et l'inventaire documentaire autorisé.

Décision de revue : résoudre les trois threads PR #49 uniquement après publication des preuves de correction fusionnées et déployées. Les trois threads sont désormais résolus.

Décision de périmètre : la réconciliation finale reste strictement documentaire sur la branche gouvernée existante. Le WRITE gate reste `shadow`; aucun `enforce`, changement OIDC/Autodeploy/2FA ou nouveau moteur persistant n'est autorisé.

## 2026-08-28 — Cycle de vie de tâche, preuve Git et surface de queue

Contexte : trois threads tardifs de la PR #49 montrent qu'une tâche pouvait rester détenue par une session définitivement terminale, que `currentTask` pouvait provenir d'une autre session ou être terminale, et que la preuve current-state associait le contenu du working tree au `evidenceHead`. La cartographie classait aussi les deux lectures de queue comme écritures et les mutations n'écartaient pas les sessions terminales.

Décision de cycle de vie : la maintenance réattribue les tâches non terminales d'une session `CLOSED` immédiatement et d'une session `EXPIRED` seulement après le dépassement strict de `resumeGraceSeconds`. La transition conserve les corrélations branche/PR/SHA/runtime, incrémente les révisions et journalise `task.transitioned`. Elle est idempotente.

Décision de contexte : `currentTask` est une projection de la seule Governed Session liée au transport appelant. Une session non `OPEN`, `ACTIVE` ou `PAUSED`, ou une tâche `DONE`, `CANCELLED` ou `SUPERSEDED`, ne produit aucun `currentTask`.

Décision de preuve : les fichiers attribués au `evidenceHead` sont énumérés par `git ls-tree` et lus par `git cat-file`. Les plafonds, refus de symlink et limitations public-safe existants sont conservés ; les modifications locales ne changent plus la preuve du commit.

Décision de surface : `mcp_get_work_queue` et `mcp_get_governed_task` sont enregistrés comme `read`; les trois mutations restent `operational-write`. Toute mutation exige en outre une session non terminale avec receipt valide.

Gate : aucune fusion avant validation complète, Draft PR, CI et revue du head exact. Aucun `enforce`, changement OIDC/Autodeploy, écriture directe S1 ou modification 2FA n'est autorisé par cette décision.

## 2026-08-28 — Fermeture des gaps de revue PR #52

Décision d'orphelin : la queue ne dépend plus de l'existence durable d'un enregistrement terminal. Elle conserve l'ownership uniquement pour les sessions actives ou expirées encore reprenables ; tout owner absent, fermé ou définitivement expiré est réattribué au prochain cycle de maintenance, normalement dans les 60 secondes. Les blockers de l'ancien owner sont effacés lors du retour `READY`, car ils ne sont pas distinguables de limitations propres à la session disparue ; les corrélations branche/PR/SHA/runtime restent conservées.

Décision de concurrence : ajouter un coordinateur FIFO en mémoire, partagé par les services existants, autour de l'ouverture avec rétention, la reprise, la fermeture, l'expiration, la réattribution et les trois mutations de tâche. Ce verrou ferme le TOCTOU sans fusionner les stores ni créer une autorité persistante.

Décision read-only : le seed est persisté avant que le serveur n'expose ses routes. Les deux outils de lecture de queue et le Current-State Inventory lisent ensuite seulement le store ; leur classification `read` correspond donc au comportement effectif.

Décision de preuve : `GIT_NO_REPLACE_OBJECTS=1` s'applique à toutes les lectures Git et `generatedAt` est dérivé du SHA capturé, non d'une seconde résolution de `HEAD`.

Décision d'audit : conserver le modèle best-effort déjà appliqué aux mutations de tâche. Une indisponibilité du journal ne bloque jamais la persistance et le retry idempotent ne fabrique pas un événement rétroactif. Un outbox transactionnel modifierait le schéma et l'autorité de persistance ; il reste hors périmètre tant qu'une exigence exactly-once distincte n'est pas approuvée.

## 2026-07-09 - Documentation racine et logique parent/enfant
Contexte : le MCP doit etre repris par ChatGPT, Claude Code, Codex, le MCP et un humain sans perte de contexte.
Decision : creer les fichiers Markdown racine manquants et utiliser docs/projects/<projet>/ pour la memoire enfant de chaque projet.
Raison : eviter le codage a l'aveugle, les regressions, les oublis et la confusion entre serveur, depot, branche, domaine et agent.
Limite : aucune autorisation de secret, suppression, deploiement ou modification applicative sans audit separe.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## 2026-07-11 -- Phase 2 hardening read-only / CI / state docs

Contexte : l'audit Phase 1 a confirmé `main@f92f621`, 7 PR ouvertes, issues #2/#3 ouvertes, absence de workflow GitHub Actions et un faux positif read-only autour de `cp`.

Décision : ouvrir une branche unique `mcp/hardening-readonly-ci-state-20260711` depuis `main@f92f621` pour corriger les garde-fous read-only, ajouter la CI minimale et actualiser l'état documentaire public-safe avant toute reprise de PR #10.

Décision complémentaire : le commit direct `f92f621` est documenté comme exception historique à tracer, car il inclut OAuth resource aliases et durable accounts. Les futurs changements doivent suivre branche `mcp/*`, PR draft, validations et revue humaine.

Limites : ne pas merger ou rebaser PR #10 dans cette branche ; ne pas fermer #2/#3 ; ne pas supprimer de branche ; ne pas déclencher restart, déploiement, migration ou cleanup ; ne pas publier d'inventaire privé S1/S2.

## 2026-07-12 -- Phase 4 correction contrôlée de la PR #11

- DÉCIDÉ : conserver le correctif read-only et la CI dans la PR #11, avec les renforcements issus de la revue Phase 3.
- DÉCIDÉ : retirer `MCP_MASTER_REFERENCE.md` sans remplacement ; `SOURCE_OF_TRUTH.md`, `SUIVI.md`, `PRODUCTION_STATE.json` et `DECISIONS_LOG.md` restent les sources canoniques existantes.
- VÉRIFIÉ : le SHA GitHub complet est `f92f621fa495d5728df5fb5befcc3265ff3a1302` ; S1 a directement restitué uniquement `f92f621`.
- PARTIELLEMENT VÉRIFIÉ : dépôt Git suivi S1 propre ; fichiers ignorés non audités.
- NON VÉRIFIÉ : commit embarqué dans l'image Docker active.
- PLANIFIÉ HORS PR #11 : migration Node et modernisation des GitHub Actions dans des PR séparées.
- Prochaine action unique : nouvelle revue complète de la PR #11 et de sa CI, sans fusion automatique.

## 2026-07-13 -- Synchronisation MCP GitHub vers S1

Contexte : après fusion de la PR #11, le MCP déployé ne disposait d'aucun outil autorisé pour synchroniser son propre dépôt depuis GitHub. Les outils existants permettaient seulement lecture, patch contrôlé, typecheck, build et redémarrage.

Décision : ajouter `mcp_sync_from_github_s1` comme opération séparée exigeant `allow_write=true`. L'outil vérifie la branche `main`, le remote `Patricked-code/MCP`, un état totalement propre et l'ascendance avant tout fast-forward. Les hooks Git sont désactivés pendant la synchronisation.

Interdictions : aucun reset, clean, checkout, switch, rebase, stash, push, build ou redémarrage dans l'outil de synchronisation. Les étapes de validation et de déploiement restent indépendantes.

## 2026-08-05 — Alignement serveur vers GitHub sans régression

Contexte : le runtime S1 contenait des fonctions absentes de `Patricked-code/MCP:main`.

Décision : préserver exactement le runtime dans une branche forensique, puis produire des PR indépendantes.

Ordre validé :
1. documentation et état attesté ;
2. séparation lecture / écriture ;
3. Registry V2 ;
4. inventaires ;
5. mappings ;
6. cockpit read-only ;
7. réintroduction progressive des actions.

Interdiction : ne pas fusionner directement la branche forensique dans main.

## 2026-08-05 — Diagnostic séparé des autorisations GitHub PR

Contexte : une lecture de pull request peut renvoyer `401`, `403 FORBIDDEN` ou `404` alors qu’une création antérieure avait fonctionné. Un refus d’autorisation ne doit produire aucun verdict sur l’existence, l’état ou la fusion possible d’une PR.

Décision : reconstruire depuis le `main` protégé un outil strictement read-only nommé `github_pr_authorization_diagnostic`. Il teste séparément l’utilisateur authentifié, la visibilité du dépôt, la liste des PR et une PR facultative.

Périmètre : l’outil diagnostique uniquement le credential GitHub monté dans le runtime MCP. Il ne lit ni ne répare le credential interne du connecteur GitHub natif de ChatGPT.

Sécurité : requêtes `GET` uniquement ; API HTTPS et hostname autorisé ; timeout borné ; aucun token, en-tête `Authorization`, secret ou objet d’erreur réseau retourné.

Interdictions : aucun changement automatique de permissions GitHub, aucun élargissement de rôle, aucun déploiement et aucun redémarrage de production.

## 2026-08-05 — Clôture des fondations GitHub

Contexte : la documentation, le diagnostic GitHub, la séparation READ/WRITE et GitRegistry v2 avaient été préparés dans des PR basées sur plusieurs états successifs de `main`.

Décision : reconstruire chaque fondation depuis le `main` protégé, fermer les anciennes PR sans fusion, exiger une nouvelle CI puis fusionner avec un SHA attendu.

Résultat :

- PR #18 fusionnée : documentation canonique ;
- PR #25 fusionnée : diagnostic GitHub read-only ;
- PR #26 fusionnée : séparation READ/WRITE ;
- PR #27 fusionnée : GitRegistry v2 dry-run ;
- `main` protégé et positionné sur `618f4020ac69801dd53f624e5cd188fc6d76cc24` ;
- issue #24 clôturée comme terminée.

Décision de frontière : les fondations GitHub sont terminées, mais cela ne vaut ni alignement S1, ni déploiement, ni migration du registre actif.

Prochaine action unique : reconnecter `wealthtech_ssh_bridge` et effectuer une attestation strictement read-only de Git S1, Docker, outils et endpoints.

Interdictions jusqu’au verdict : aucun pull, reset, clean, checkout, build ou restart dans le working tree actif ; aucun remplacement du registre ; aucun changement de remote ; aucun déploiement, nettoyage ou suppression.

## 2026-08-09 — Identité GitHub de déploiement S1 strictement read-only

Contexte : le checkout MCP actif sur S1 est aligné avec `main@4228119…`, mais son
remote `origin` utilise l'alias `github.com-mcp-patricked-rw` pour le fetch et le
push. Le code de `mcp_sync_from_github_s1` accepte également cet alias.

Décision : S1 doit utiliser une deploy key dédiée à `Patricked-code/MCP`, créée
avec l'écriture GitHub désactivée. Le fetch doit passer exclusivement par l'alias
`github.com-mcp-patricked-ro`. La configuration Git doit en outre déclarer
`disabled://mcp-s1-read-only` comme push URL afin qu'un push accidentel échoue
avant même toute connexion réseau.

Preuves exigées : lecture de `refs/heads/main` réussie avec la nouvelle identité,
SHA attendu retrouvé, push normal neutralisé localement, push direct `--dry-run`
refusé par GitHub avec la deploy key read-only, working tree propre et runtime
attesté après déploiement.

Ordre de rotation : installer et tester la nouvelle identité en parallèle,
fusionner/déployer le correctif, basculer le remote, vérifier, puis seulement
révoquer l'ancienne identité. Aucune clé privée ou donnée sensible n'entre dans
Git.

## 2026-08-09 — MCP Live State Engine V1 natif et read-only-first

Contexte : l'état opérationnel du MCP est aujourd'hui réparti entre GitHub, le checkout S1, Docker et plusieurs documents. Les documents peuvent devenir périmés après une fusion ou un déploiement, et un nouvel agent doit reconstruire manuellement la situation avant de savoir quoi faire.

Décision : intégrer le Live State Engine directement dans le processus Node/TypeScript `wealthtech_ssh_bridge`, sans second MCP ni microservice. La V1 observe les sources, les compare, persiste un snapshot commun et l'expose aux clients MCP.

Architecture décidée :

- stockage runtime : `/app/data/mcp-live-state.json` ;
- écriture atomique et permissions `0600` ;
- GitHub `main` lu dynamiquement, aucun SHA de production codé en dur ;
- S1 observé uniquement par commandes Git read-only compatibles avec `assertReadOnlyCommand` ;
- runtime observé via l'attestation Docker bornée existante ;
- documentation réduite à des signaux déterministes de tâche/SHA ;
- réconciliation initiale au démarrage puis au plus toutes les 60 secondes ;
- `stateVersion` évoluant uniquement lors d'un changement sémantique ;
- une source indisponible ou périmée dégrade explicitement le verdict ;
- `FULLY_ALIGNED` est interdit sans preuve que GitHub, S1 et la révision runtime sont actuels et égaux ;
- le build Docker reçoit le HEAD S1 dans `org.opencontainers.image.revision` afin de rendre l'attestation runtime vérifiable ;
- outils read-only exposés : `mcp_get_live_state` et `mcp_reconcile_live_state`.

Limites V1 : pas de PostgreSQL, Redis, GitHub App/webhook, locks de tâches, heartbeats, write gates ou concurrence optimiste généralisée. Ces mécanismes appartiennent à V1.5/V2 après validation du moteur d'observation.

Décision de non-duplication : réutiliser le volume `/app/data`, l'SSH read-only, l'attestation Docker et le chemin d'enregistrement MCP existants. Ne pas créer de système systemd parallèle de mémoire vive.

Limitation d'intégration connue : l'injection directe du résumé Live State dans `get_project_context` reste différée car le wrapper de mutation GitHub a bloqué la réécriture de `src/tools/readOnly.ts`, fichier contenant de nombreuses commandes shell historiques. Le moteur et les deux outils Live State sont néanmoins enregistrés dans le chemin read-only existant ; aucun contournement opaque de ce garde-fou n'est autorisé.

## 2026-08-12 — Blocage de bootstrap par catalogue et validation de l'état machine

Contexte : la PR #39 est fusionnée et ses workflows post-fusion sont réussis, mais S1 reste au commit `d3bcac0…`. L'outil `mcp_sync_from_github_s1` est présent dans `src/tools/selfManagement.ts` et dans la politique de registration S1, tandis que le catalogue ChatGPT courant ne le publie pas.

Décision : ne pas contourner cette rupture par `patch_mcp_code_file_s1`, shell libre, modification directe S1 ou détournement d'un hook de build. Le bootstrap reste bloqué jusqu'à exposition réelle de l'outil gouverné. Après rafraîchissement du catalogue, reprendre au préflight complet avant toute mutation.

Décision complémentaire : `docs:check` valide désormais la cohérence de `PRODUCTION_STATE.json` avec l'état canonique et refuse notamment un jalon PR #39 absent, un catalogue non qualifié, un alignement attesté malgré des SHA GitHub/S1 différents ou un runtime `FULLY_ALIGNED` sans révision OCI égale.

## 2026-08-12 — Le redémarrage gouverné doit recréer le conteneur et échouer si la santé échoue

Contexte : sur S1 propre, typecheck et build réussis, `restart_mcp_bridge_s1` a terminé avec un code 0 mais l'uptime Docker est resté à trois jours. `docker compose up -d --build` avait réutilisé l'image et conservé le conteneur. La commande masquait également un échec de santé avec `curl ... || true`.

Décision : le générateur de redémarrage ajoute `--force-recreate` et le contrôle `/health` devient fail-closed avec timeout. Un redémarrage ne peut plus être attesté sur le seul succès de construction ou sur un conteneur préexistant.

Limite : cette correction ne vaut ni exposition du catalogue ChatGPT, ni synchronisation GitHub → S1. Le garde `pushEnabled=false` reste fermé jusqu'au bootstrap exact-SHA et aux attestations complètes.

## 2026-08-13 — Activation automatique autorisée après preuve manuelle, preuve push encore requise

Contexte : le run manuel `31655087215` a exécuté l’étape de déploiement exact-SHA et attesté `8fb075dd55a3b94ed620527f11b2a77f88627188`. La passe post-workflow a confirmé l’égalité GitHub/S1/origin/OCI/runtime, la propreté S1, la santé, OAuth, MCP, Live State sans contradiction et rollback non nécessaire.

Décision : la PR #42 est autorisée à passer `.mcp/autodeploy-policy.json` à `pushEnabled=true`. Cette décision signifie bootstrap terminé, garde-fous validés et activation autorisée ; elle ne signifie pas qu’un futur déclenchement automatique est déjà prouvé.

Décision complémentaire : le thread P2 de la PR #41 est traité par un polling borné fail-closed, vérifié RED/GREEN. L’artefact CI doit être une copie exacte des sept documents actifs, jamais une régénération de snapshots historiques.

Preuve restante : le push de fusion de la PR #42 puis une seconde fusion utile doivent chacun produire un job non skipped, exact-SHA et attesté avant la clôture complète.

## 2026-08-13 — Première preuve automatique acceptée, seconde preuve canonique requise

Contexte : la PR #42 a activé `pushEnabled=true` et a fusionné le SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` après CI verte. Le push a produit la CI `31658327373` et le déploiement `31658327435`; l’étape exact-SHA a réussi et S1/OCI/runtime ont convergé vers ce SHA.

Décision : accepter ce run comme première preuve réelle du chemin automatique et résoudre le P2 de la PR #41, la correction étant fusionnée, testée et déployée.

Décision complémentaire : conserver le chantier ouvert jusqu’à la fusion d’une seconde PR documentaire utile et à l’attestation indépendante du second push automatique. Aucun succès final ni changement d’automatisation n’est déclaré avant cette seconde preuve.

## 2026-08-13 — Seconde preuve automatique acceptée et passage au plan Governed Session V1

Contexte : la PR #43 a fusionné le SHA `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`. Son push a produit la CI `31659053828` et le déploiement `31659053836`, job `94319801309`, tous réussis. La lecture fraîche du bridge confirme GitHub/S1/origin/OCI/runtime égaux, S1 propre et read-only, Docker running/healthy.

Décision : clôturer `TASK-20260809-003` sur ces deux preuves automatiques exact-SHA et verrouiller `eb61b97e…` comme baseline immuable de `TASK-20260813-004`.

Décision complémentaire : corriger en premier, par TDD additif, le détecteur documentaire qui autorise encore un SHA déclaré ancien avec `documentation=ALIGNED`. L'extension Governed Session conserve tous les contrats existants, sépare `governedSessionId` de `MCP-Session-Id` et démarre le nouveau WRITE gate en `shadow` non bloquant. Toute nécessité de remplacer une mécanique validée impose STOP. Aucune action 2FA n'est autorisée dans ce chantier.

## 2026-08-13 — Governed Session Continuity V1 prête pour review sans nouvelle autorité

Contexte : les cycles RED/GREEN de la branche unique sont terminés au head fonctionnel `38e3ced7ff61119b1e8fd8d0228bf032972ecca9`. La CI `31675193991` et la régression locale fraîche sont vertes ; `main` reste sur la baseline `eb61b97e…`.

Décision : conserver Live State V1 comme source opérationnelle existante et lui composer, sans le remplacer, la session durable, les locks, le contexte GitHub borné et la vue dashboard. Le transport MCP reste une liaison éphémère ; seul `governedSessionId` est l'identité de continuité.

Décision complémentaire : partager un journal opérationnel unique dans le processus, démarrer une seule maintenance à intervalle 60 secondes et limiter ses événements aux compteurs d'expiration. Le dashboard utilise `getCurrent` cache/store-only et ne force aucune collecte GitHub/SSH.

Limites : le WRITE gate demeure `shadow` non bloquant ; aucune mutation existante n’est retirée ou durcie en V1. Aucun merge, déploiement ou état runtime de cette branche n’est déclaré avant preuve exacte ; aucune action 2FA n’est permise.

## 2026-08-13 — Résolution additive de la première revue de la PR #44

Contexte : la première revue a identifié des liaisons transport survivant à une reprise, un shadow qui attendait l’observation, un journal insuffisamment câblé, une fenêtre de divergence entre les deux stores, une lecture erronée des résumés de rulesets, un feature-off incohérent et deux défauts mineurs de dashboard/maintenance.

Décision : corriger chaque point par test RED puis GREEN sur la branche unique. Le transport précédent est révoqué, le shadow devient best-effort hors chemin critique, l’audit reçoit uniquement des objets de domaine typés/sanitizés, et le collecteur GitHub charge le détail d’un seul ruleset actif.

Décision de compatibilité : ne pas fusionner les stores sessions et locks, car cela remplacerait une mécanique approuvée. Le store de locks reste l’autorité des locks actifs ; `session.lockIds` demeure une projection dénormalisée réparée par la maintenance existante après toute panne partielle.

Limites : la PR reste draft jusqu’à CI et seconde revue du head exact. `main`, S1/runtime, Autodeploy V1, GitHub OIDC, `ENABLE_WRITE_TOOLS`, `allow_write` et l’exclusion 2FA restent inchangés.

## 2026-08-13 — Résolution additive de la seconde revue de la PR #44

Contexte : la seconde revue a confirmé une compensation mémoire incorrecte lors d’une reprise sur le même transport, une agrégation historique des reviews GitHub, une course de preuve lors d’un unbind et un libellé dashboard ambigu. La confirmation différentielle a ajouté deux cas : `COMMENTED` effaçait le verdict décisif antérieur et la redaction par motifs laissait des PAT/URI/JWT/PEM dans des champs libres.

Décision : différer le rebinding jusqu’au succès durable, agréger uniquement le dernier verdict décisif par reviewer avec `DISMISSED` explicite, conserver un instantané éphémère sanitizé de chaque binding retiré et nommer le compteur global. Les champs libres du journal deviennent systématiquement `[REDACTED]`; les autres valeurs conservent une défense PAT/JWT/PEM/Bearer/URI.

Décision de compatibilité : conserver toutes les APIs/outils existants, la table de bindings dans le même service et le journal unique déjà validé. Aucun store, service, gate ou collecteur parallèle n’est introduit.

Limites : la PR reste draft jusqu’à confirmation différentielle et CI du head exact. Aucun merge, Autodeploy, S1/runtime ou 2FA n’est exécuté ; `ENABLE_WRITE_TOOLS`, `allow_write`, Live State V1 et OIDC restent invariants.

Confirmation : l’ultime revue différentielle ne relève aucun finding critique ou important et juge le range fonctionnel `fd0b1d8…de8a6df` mergeable. Cela ne vaut pas autorisation de fusion ; la CI du head documentaire exact reste exigée.

Preuve de clôture de review : le head consolidé `4eee32b…` a passé la régression locale `187/187` et la CI exacte `31681641604`. La PR #44 reste volontairement draft. La prochaine mutation autorisée est uniquement son passage ready/merge après GO humain, reverrouillage du SHA et CI verte de la tête proposée.

## 2026-08-15 — Rétention bornée et clôture documentaire post-merge

Contexte : trois findings publiés après la fusion de la PR #44 rendent à terme l'ouverture de sessions et l'acquisition de locks indisponibles, et la fermeture d'une session peut conserver un lock actif jusqu'à son TTL.

Décision : conserver toutes les sessions actives, toutes les sessions terminales portant encore des `lockIds` et tous les locks actifs. À la borne, retirer uniquement les plus anciens enregistrements terminaux/inactifs selon un ordre horodatage puis identifiant. Si le nombre d'entrées supprimables est insuffisant, échouer explicitement avec `SESSION_STORE_CAPACITY_EXCEEDED` ou `LOCK_STORE_CAPACITY_EXCEEDED`.

Décision de cycle de vie : libérer durablement les locks dans leur store avant de fermer la session, puis vider `session.lockIds` dans l'écriture atomique de fermeture. Si la seconde étape échoue, aucun lock actif ne subsiste et la réconciliation existante répare la projection ; les stores restent séparés.

Décision documentaire : l'égalité stricte entre le SHA déclaré dans un fichier et le SHA du commit contenant ce même fichier est auto-référente et inexécutable. Un SHA déclaré différent n'est accepté que s'il est un ancêtre Git et si tous les chemins descendants appartiennent à l'allowlist documentaire. Toute modification de code, tout SHA inconnu et tout signal `requires_revalidation` restent en drift.

Limites : cette décision n'élargit aucune autorité, ne modifie aucun outil historique, ne remplace aucun store et ne touche ni Autodeploy/OIDC, ni `ENABLE_WRITE_TOOLS`, `allow_write`, le gate `shadow` ou la 2FA.

## 2026-08-15 — Clôture de TASK-20260813-004

Décision : accepter la correction Operational Memory uniquement après double CI du head exact, fusion gardée par `expected_head_sha`, Autodeploy exact-SHA et attestation indépendante GitHub/S1/OCI/runtime.

Décision : résoudre les findings tardifs de la PR #44 seulement après déploiement attesté du merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`. Les trois threads P1/P1/P2 ont suivi cette séquence.

Décision : la clôture canonique est portée par une PR séparée ne modifiant que huit documents. Elle déclare le merge fonctionnel comme ancêtre ; Live State n'accepte le descendant que si Git prouve une portée strictement documentaire. Cette exception ne couvre jamais un changement de code, un SHA inconnu ou un état nécessitant revalidation.

Résultat : `TASK-20260813-004` est terminée, sans modification d'Autodeploy/OIDC, des outils historiques, de `ENABLE_WRITE_TOOLS`, `allow_write`, du gate `shadow` ou de la 2FA.

## 2026-08-15 — Gate de revue tardive PR #47

Décision : une session `EXPIRED` n'est définitivement supprimable que lorsque la condition de refus de `resumeSession` est vraie, soit un dépassement strict de `resumeGraceSeconds` ou un horodatage inexploitable.

Décision : à capacité, un lock `ACTIVE` dont `expiresAt` est écoulé est logiquement inactif. Sa suppression en rétention produit une preuve `lock.expired` et retire sa projection de session dans la mise à jour inter-store ; la réconciliation existante reste le filet après panne partielle.

Décision : la dérogation docs-only au mismatch S1 exige que le SHA S1 déclaré soit identique au SHA GitHub déclaré ancêtre. Cette contrainte évite de masquer deux déclarations canoniques divergentes.

Gate : aucune fusion de la PR #47 avant mise à jour des journaux canoniques, CI exacte du nouveau head, revue sans thread non résolu, Autodeploy post-merge et réconciliation documentaire finale.

## 2026-08-22 — Clôture de la correction tardive Operational Memory

Décision : une session `EXPIRED` reste conservée exactement pendant la fenêtre où `resumeSession` autorise encore sa reprise ; sa suppression n'est permise qu'après dépassement strict de la grâce ou horodatage inexploitable.

Décision : un lock `ACTIVE` dont le TTL est écoulé est logiquement inactif à capacité. Sa rétention produit `lock.expired`, nettoie les projections de session et conserve la réconciliation comme filet après panne partielle.

Décision : la dérogation descendant docs-only couvre le mismatch S1 uniquement si le SHA S1 déclaré est égal au SHA GitHub déclaré ancêtre. Toute divergence, tout code descendant ou `requires_revalidation` reste bloquant.

Gate satisfait : PR #47 fusionnée au SHA `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI/Autodeploy exact-SHA réussis, S1/runtime réattestés, trois threads PR #45 résolus. La PR #48 est limitée aux huit documents canoniques et clôt `TASK-20260813-004` sans élargissement d'autorité.

## 2026-08-22 — Bootstrap obligatoire et orchestration sans moteur parallèle

Décision : compléter Live State, Governed Context et Operational Memory au lieu de créer une nouvelle autorité. Le catalogue provient des registrations réelles ; l'architecture, les routes, documents, audits et politiques proviennent du clone Git suivi au SHA observé.

Décision de queue : une nouvelle instruction est projetée sous forme bornée, classifiée de manière déterministe puis ajoutée après le backlog existant. `claimNextTask` choisit la première tâche exécutable par priorité puis séquence ; dépendances, scopes, ownership et transitions restent fail-closed sous révisions optimistes.

Décision de bootstrap : l'acquittement de Live State crée un receipt sanitizé lié à la session, au stateVersion et aux digests. Les surfaces MCP et le dashboard réutilisent cette même projection. Aucun prompt brut, token, transport ou secret de reprise n'est journalisé.

Décision de compatibilité : le gate reste `shadow`. Les nouveaux verdicts observent receipt, tâche et baseline d'audit, mais le handler historique reste exécuté exactement une fois. L'enforcement bloquant exigera une décision et une PR distinctes.

Décision anti-staleness : `.mcp/branch-governance.json` ne porte plus aucun numéro de PR, branche de travail ou prochaine branche dynamique. GitHub, Operational Memory, Governed Task Queue et Live State restent les autorités ; le collecteur current-state signale toute réintroduction d'une valeur dynamique persistée.

Décision de clôture : la tâche seed `TASK-20260822-001` reste `READY` jusqu'à la preuve CI du head exact, le merge, l'Autodeploy exact-SHA, l'attestation GitHub/S1/runtime et la réconciliation canonique. Le déploiement du code ne doit pas fabriquer rétrospectivement un état `DONE` non attesté.

## 2026-08-22 — Clôture en deux preuves et reprise obligatoire de la queue runtime

Décision : accepter la PR #49 uniquement après `222/222`, CI exacte `32565936838`, absence de thread actionnable et fusion gardée par `expected_head_sha`. Le merge fonctionnel retenu est `c944fd9e7c05aad503f9e1d5d21e0ead25747886`.

Décision : considérer l'Autodeploy attesté uniquement après un nouveau Live State prouvant GitHub, S1, `origin/main` et runtime égaux, arbre S1 propre et conteneur healthy. Cette preuve est `stateVersion=33` ; la documentation est ensuite réconciliée dans une branche séparée strictement documentaire.

Décision de queue : ne pas contourner la state machine et ne pas modifier directement le store. Le connecteur de cette conversation ayant figé son catalogue avant le déploiement, `TASK-20260822-001` reste volontairement `READY`. La prochaine connexion doit charger les nouveaux outils, reprendre cette tâche existante et appliquer les transitions gouvernées jusqu'à `DONE`, sans créer de doublon.

## 2026-08-31 — Attachement éphémère sans révision durable pour les transports OAuth successifs

Contexte : après le déploiement de la PR #60 au SHA `211a7de7940f115aa997f404927a8e0c9ace9055`, trois appels réels depuis la surface ChatGPT/Codex ont repris la même Governed Session et produit les révisions `66 → 67 → 68`. Chaque appel initialise un nouveau transport MCP ; l'appel automatique systématique à `resumeSession()` invalidait donc l'optimistic locking avant l'opération métier suivante.

Décision : pour l'unique session OAuth compatible dont le statut est `OPEN`, `ACTIVE` ou `PAUSED`, l'initialisation d'un nouveau transport crée uniquement un binding éphémère `ATTACHED` dans `TransportBindings`. Elle ne modifie ni le store de session, ni `resumedAt`, ni `lastHeartbeatAt`, ni `sessionRevision`. Les bindings antérieurs ne sont pas arbitrairement volés.

Décision complémentaire : conserver `resumeSession()` et le statut `RESUMED` pour une session réellement `EXPIRED` encore dans sa fenêtre de grâce. Conserver `NONE` pour zéro candidat, `AMBIGUOUS` pour plusieurs candidats et le refus d'auto-reprise pour `shared_credential`.

Preuve : RED exact `actual RESUMED / expected ATTACHED` dans CI #626, second RED serveur dans CI #628, puis GREEN `8a0e6fc0903bfdce04f2c476df50bee013fd1b9a` avec CI #635 entièrement réussie et `257/257` tests.

Limites : aucun identifiant stable de conversation n'est fabriqué. Aucune nouvelle autorité, aucun nouveau store, aucun élargissement de droits, aucun changement du WRITE gate `shadow`, d'OIDC, d'Autodeploy, de 2FA ou du chemin GitHub→S1. Le merge, le déploiement exact-SHA, la réconciliation docs-only et la clôture Operational Memory restent à attester.


## 2026-09-13 — Décision Phase 2 AfricaFunds

Décision : représenter AfricaFunds par un projet logique unique dans le GitRegistry existant, avec deux composants Git indépendants. Le frontend porte la référence de checkpoint global et de gouvernance centrale observée; les SHA API et frontend restent deux preuves séparées.

Décision de sécurité : les mappings restent `read`, `deployEnabled=false` et toutes les capabilities sensibles V2 restent fausses. Les vhosts historiques restent non Git, non courants et non sources de déploiement. Aucun écart S2 n'est corrigé dans cette tâche.


## 2026-09-13 — C1 GitRegistry V2 : activation uniquement après preuves explicites

Décision : l'activation V2 doit être précédée d'un verdict pur et fail-closed dérivé du registre existant. Un mapping ne peut être considéré `READY` que si son statut est validé/actif et si les preuves applicables de realPath, remote, domaine, credential, migration, health checks et rollback sont satisfaites.

Décision de non-régression : ce verdict n'écrit rien. Il ne modifie ni mapping, migration, credential, remote, branche, permission ou capability. GitRegistry V1 reste l'autorité active tant qu'une activation V2 distincte n'a pas été explicitement approuvée et attestée.

Décision migration : tout mapping portant une migration autre que `migration_completed` reste `BLOCKED`; `migration_pending` n'autorise aucune mutation automatique du repository/remote actif.

Preuve TDD : RED #854 sur `af4ee0f7`, puis GREEN #855 sur `db703454`. Le présent lot prépare le gate de vérification ; il ne constitue pas une activation V2.

Décision de livraison : le socle fail-closed est fusionné par PR #83 au merge `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e`, avec CI PR #857, CI main #858 et Governed Deploy #37 réussis. Live State 217 atteste GitHub/S1/runtime exact-SHA mais exige une réconciliation documentaire descendante avant de considérer la projection canonique alignée.

Décision de frontière : cette livraison n'autorise toujours aucune activation V2. Credential Wealthtechinnovations, preuves path/remote/domain et migration MCP restent des gates distincts ; aucun d'eux ne peut être déduit du simple déploiement du verdict de readiness.


## 2026-09-15 — G3 attestation liée à sa session et bornée dans le temps

Décision de correction P2 : une attestation de surface d'outils client n'a de sens que rattachée à la session gouvernée qui la contient. Le `GovernedSessionRecord` valide donc de façon croisée et fail-closed que `clientToolSurfaceAttestation.governedSessionId` égale le `governedSessionId` parent, et que le `connectionContextId` non nul de l'attestation égale celui du `connectionContext` parent lorsque ce binding existe dans le contrat applicable. Une attestation appartenant à une autre session ou à un autre contexte n'est jamais acceptée comme preuve de la session contenante.

Décision de borne temporelle : `expiresAt` doit être strictement postérieur à `observedAt`, et la durée d'attestation ne peut pas dépasser cinq minutes. La borne canonique de cinq minutes est dérivée du fixture G3 `safeAttestation` déjà accepté par le contrat existant, et non d'une nouvelle constante arbitraire. La validation réutilise les timestamps déjà validés par la frontière existante; aucune nouvelle autorité de temps n'est introduite.

Décision de non-régression : `schemaVersion` reste `1`, l'attestation reste optionnelle et nullable, les records historiques sans attestation restent valides, les objets restent stricts, le repository scoping et les bornes existantes sont préservés, absence et staleness projettent toujours `UNKNOWN`, et `CLIENT_ATTESTATION` reste une provenance de callability qui n'implique ni `AUTHORIZED` ni `safeNow`.

Décision d'autodeploy : `pushEnabled: true` dans `.mcp/autodeploy-policy.json` est intentionnel et n'est pas désactivé. Un merge explicitement autorisé sur `main` déclenche l'autodeploy gouverné, l'attestation exact-SHA puis la réconciliation; cette conséquence automatique est une conséquence gouvernée connue du merge et non un déploiement manuel supplémentaire. L'interdiction porte sur le déploiement manuel, l'appel direct sync/restart/deploy hors gate et tout contournement de la gouvernance.

Décision de projection de preuve : `deploymentExactShaSuccess` exige que la tâche enregistre elle-même son `runtimeRevision`. Le gap résiduel constaté après le merge G3 est donc une projection de preuve manquante, pas un état runtime manquant; il se lève par l'enregistrement du `runtimeRevision` attesté sur la tâche, jamais par un nouveau déploiement ni par une seconde autorité d'attestation.

Décision de livraison : PR #87 fusionnée depuis le head exact revu `289b3b71c8352738395bf290bc1ae10dc405ee15` au merge `dc4698de66b7becfc924ea4fabe8037e089d3336` sous l'autorisation humaine distincte et bornée `G3_EXACT_HEAD_MERGE_AUTHORIZATION_V2`. Aucune autorisation antérieure liée à `ae7bec13` n'a été considérée comme valable pour ce head.

Décision de frontière : cette livraison n'autorise aucune activation GitRegistry V2, aucun transport SSH, aucune délégation d'exécution externe, aucune permission supplémentaire et aucun secret. Le statut terminal de `TASK-20260914-002` reste exclusivement sous Operational Memory.

## 2026-09-15 — C2 résout l'identité projet sans activer le mapping

Décision : C2 résout uniquement la chaîne d'identité `repositoryId → mappingId → projectId`. Les résultats restent bornés `RESOLVED`, `NONE`, `AMBIGUOUS` ou `UNVERIFIED`. C2 compose B2 avec le candidat GitRegistry V2 dérivé de l'unique registre existant ; il ne crée aucune autorité parallèle et n'active pas GitRegistry V2.

Décision de frontière C1/C2 : `activationReadiness` est une preuve opérationnelle distincte de l'identité du binding. Un mapping structurellement cohérent peut donc être C2 `RESOLVED` tout en restant C1 `BLOCKED`; les reason codes de readiness restent projetés séparément et ne deviennent ni permission, ni capability, ni autorisation de déploiement.

Décision de compatibilité : le `projectId` validé du mapping est suffisant pour C2 même lorsqu'aucune fiche `projects[]` enrichie n'existe encore, notamment pour le cas historique `Patricked-code/MCP → mcp_bridge`. Si une fiche projet existe, ses références repository/mapping/role doivent rester cohérentes ; toute contradiction est `UNVERIFIED`.

Décision de sécurité : la projection C2 exclut permissions, grants, credentials, chemins serveur et capacités de déploiement. Le cache Governed Context existant propage cache-miss/staleness fail-closed ; aucune donnée secrète ou transport brut n'est introduit.

Preuve TDD : RED initial `f71704dbfd2ad3fe2ba7c8545fa157435e97de7e` / CI #933 ; GREEN `45adc85925bf819b8c71df4621315e95bc3154ca` / CI #935 ; RED historique MCP `6fc9c74b3a405a69f23e13d80c4557fa1d5b4538` / CI #937 ; GREEN `d71ba1671adcadf94f263f00ec6eef02d915663f` / CI #939.

## 2026-09-15 — Livraison fonctionnelle C2 et réconciliation descendante

Décision de livraison : PR #92 est fusionnée sous garde du head exact `8b71f14f9a4884d57699e093853f4ccfb84080ef` au merge `46d576e53820eba0360647b6fd96d41dd4a2bbc6`. MCP CI main #944 et Governed Deploy #41 réussissent sur ce même SHA ; GitHub main, S1 HEAD/origin-main et runtime healthy sont observés alignés.

Décision de preuve : la Task enregistre `runtimeRevision=46d576e53820eba0360647b6fd96d41dd4a2bbc6` sans redéploiement manuel. La seule contradiction résiduelle est documentaire ; elle se corrige par une branche/PR docs-only descendante, puis nouvelle observation Live State avant toute transition `VERIFYING` ou `DONE`.

Décision de frontière : la livraison C2 n'active pas GitRegistry V2, n'élargit aucune permission, n'autorise aucun déploiement de projet et ne modifie pas le WRITE gate `shadow`. C3 reste un lot distinct après clôture gouvernée de C2.

## 2026-09-17 — Le gate pré-code se vérifie contre le head exact, jamais contre sa propre déclaration

Décision : un compteur déclaré dans `.mcp/gwc-precode-gate.json` n'est pas une preuve. `AF-34` a montré qu'un gate pouvait déclarer `architecturePhases.satisfied = 14` alors que la vérification du head exact `58d71959` en donnait 10. La correction porte sur les deux faces : l'instance est comblée par conception, et le vérificateur recoupe désormais les compteurs du gate contre les preuves par phase de `.mcp/gwc-precode-status.json`. Un `PASS_WITH_EVIDENCE` sans référence de preuve relisible est refusé, et un verdict de gate qui contredit le décompte des phases est refusé.

Décision de portée : cette correction ne crée aucune autorité nouvelle. Elle durcit un vérificateur déterministe déjà exécuté par la CI au head exact. Elle n'ajoute aucun outil MCP, ne crée aucune Task, ne prend aucun lock et ne déclenche aucun déploiement.

## 2026-09-17 — La réconciliation live classe sans créer, et ne résout pas le conflit d'un autre agent

Décision de classification : la réconciliation Phase B repose exclusivement sur l'observation des autorités live propriétaires — Governed Task Queue, Live State, sessions gouvernées, locks — et jamais sur `.mcp/task-registry.json`, sur un document Markdown ni sur une mémoire canonique. L'absence d'un blueprint dans un registre versionné ne vaut pas `NEW_TASK`.

Décision : aucune tâche GWC n'existe dans la file live, donc ni `CONTINUATION` ni `DUPLICATE` ne s'appliquent aux 18 blueprints. La seule tâche non terminale, `TASK-20260915-001`, est classée `CONFLICT` : la Task Queue la déclare `DEPLOYING` avec blocker `DOCUMENTATION_DRIFT` observé à `46d576e5`, tandis que Live State `stateVersion 246` déclare `documentation: ALIGNED`, `global: FULLY_ALIGNED` et 0 contradiction à `d1f30395`, plus récent. Ce blocker est donc probablement périmé plutôt que réel, mais l'écart se constate et s'enregistre — il ne se tranche pas par hypothèse. Il est enregistré sous `AF-35`, propriétaire `GWC-5`.

Décision de blocage : `GWC-0` à `GWC-17` sont classés `BLOCKED`, pas `NEW_TASK`. Le protocole MCP impose que la première tâche exécutable précède les nouvelles ; enregistrer dix-huit tâches GWC devant une tâche non terminale reviendrait à doubler la file et à contourner l'ordonnancement gouverné.

Décision de non-intervention : le `CONFLICT` n'est pas résolu par cette session. `TASK-20260915-001` est possédée par la session `ACTIVE` `499b2ea3` d'un autre agent. Toute transition exigerait son `governedSessionId` et son `expectedSessionRevision` ; agir à sa place violerait la règle d'un seul writer par domaine de collision et l'interdiction d'écraser un travail concurrent. Le fait que cette session soit manifestement périmée — Bootstrap Receipt acquitté à `stateVersion 233` contre 246 en live, aucun heartbeat depuis le 2026-09-16T22:52Z, `nextAction` demandant la fusion d'une PR déjà fusionnée — ne transfère pas sa propriété. Deux voies légitimes seulement : l'agent propriétaire clôture sa tâche et sa session, ou une décision humaine explicite fait expirer ou superséder la tâche.

Décision de frontière : l'observation seule a suffi à produire la classification. Aucune session n'a été ouverte, aucun Bootstrap Receipt demandé, aucun claim effectué, aucun lock pris, aucune transition tentée. `RUNTIME_TASKS_CREATED = 0` et le runtime GWC reste gelé jusqu'à résolution du `CONFLICT`.

## 2026-09-18 — La pile candidate se dispose capacité par capacité, jamais en bloc

Décision : la disposition d'une pile de pull requests ne se prend pas au niveau de la pile mais au niveau de chaque capacité. `GWC-12` énonçait quatre options stratégiques — rebaser, re-dériver, fermer, laisser ouvert — et les laissait à une décision gouvernée, faute de mesure. `GWC-PRE-C3` fournit la mesure : sur les 73 contrats, 7 sont bloqués et ils ne dépendent que de quatre outils de `#90`. La pile ajoute plus de 5 500 lignes ; ce qui bloque réellement l'architecture en est une fraction.

Décision structurelle : `#88` est la racine de la pile et la seule des trois à être en conflit direct avec `main`, alors qu'aucun des 73 contrats ne requiert sa capacité. La staleness de l'ensemble est donc enracinée dans une pull request dont GWC n'a pas besoin. C'est ce qui rend `SPLIT` préférable à une rebase de la pile entière : re-découper depuis `main` courant évite de porter `#88` pour rien.

Décision sur le manifeste de `#89` : ses 170 capacités classifiées sont conservées comme **entrée de conception** et non comme artefact runtime. La cartographie de fonctions est déjà l'autorité de la surface enregistrée ; introduire un second registre de capacités créerait une seconde autorité, ce que la règle 6 du protocole interdit. D'où `SUPERSEDE` plutôt que `SPLIT`.

Décision d'ordonnancement, dérivée d'un finding et non d'une préférence : `GWC-9` précède l'atterrissage de tout `SPLIT` portant du `WRITE`. `AF-32` établit que trois mutations gouvernées de `main` ne traversent aujourd'hui aucune porte d'écriture ; `#90` ajoute douze outils `WRITE`. Les faire atterrir avant la fermeture d'`AF-32` élargirait un trou existant d'un facteur quatre au lieu de le combler. Le `SPLIT` `C-89.2`, `READ` seul, n'est pas soumis à cette contrainte.

Décision de frontière : `C3` produit une disposition, pas un merge. Exécuter un `SPLIT` est une matérialisation de tâche, donc soumis à la Phase B, qui reste `BLOCKED` sur le `CONFLICT` de `TASK-20260915-001`. Aucune pull request n'est fusionnée, rebasée, fermée ni modifiée par cette analyse, et aucune ne reçoit `CLOSE` : fermer la pull request d'un autre agent n'est pas une disposition que cette session exécute.

Décision de non-exécution assumée : `GWC-PRE-C1` (`AF-19`) et `GWC-PRE-C2` (`AF-22`/`AF-30`) ne sont pas exécutés. Ils touchent au chemin de déploiement et au gating de revue, au-delà de ce que l'autorisation courante couvre. Ils sont enregistrés `PENDING` avec leur motif, plutôt que passés sous silence ou déclarés satisfaits.

## 2026-09-18 — `NEW_TASK` rend la matérialisation admissible, jamais automatique

Décision de classification : après réobservation live, `GWC-0` à `GWC-17` passent de `BLOCKED` à `NEW_TASK`. Le raisonnement est éliminatoire et repose uniquement sur des autorités propriétaires observées : aucune tâche GWC n'existe dans la file, donc ni `CONTINUATION` ni `DUPLICATE` ; le `CONFLICT` sur `TASK-20260915-001` est résolu à la source ; et le motif `BLOCKED` — la première tâche exécutable précède les nouvelles — tombe puisque les 15 tâches sont terminales et qu'aucune session n'est `ACTIVE`. Il ne reste que `NEW_TASK`.

Décision de non-exécution : `NEW_TASK` autorise la création d'un `GovernedTaskRecord`, il ne l'ordonne pas. Créer une Governed Task exige d'ouvrir une governed session et d'acquitter un Bootstrap Receipt, c'est-à-dire de muter une autorité de production. Cela dépasse le périmètre sous lequel cette session a travaillé depuis le début — aucune session ouverte, aucun claim, aucun lock — et n'a pas été explicitement autorisé. La matérialisation est donc enregistrée comme admissible et laissée à une décision humaine.

Décision de granularité : même autorisée, la matérialisation ne se fait pas en bloc. `TASK BLUEPRINT ≠ GovernedTaskRecord` : un blueprint peut produire 0, 1 ou N tâches selon la réalité live. Créer dix-huit tâches d'un coup fabriquerait une file artificielle au lieu de refléter le travail réellement exécutable. L'ordre prescrit reste celui de la Phase E, à partir de `GWC-0`, et la contrainte dérivée de `C3` tient : `GWC-9` précède l'atterrissage de tout `SPLIT` portant du `WRITE`, parce qu'`AF-32` reste ouvert.

Décision de provenance sur `AF-35` : le finding est résolu **par l'agent propriétaire**, pas par cette session. Il a acquitté le `stateVersion 246`, porté sa tâche à `DONE` et fermé sa session. C'est la voie (a) annoncée dans le `SESSION_HANDOFF`, et elle confirme l'hypothèse qui y était posée sans être tranchée : le blocker `DOCUMENTATION_DRIFT` était périmé plutôt que réel. L'attribution est enregistrée telle quelle — ne jamais s'attribuer la résolution d'un finding levé par un autre.

Décision de méthode : la classification Phase B du 2026-09-17 n'a pas été rejouée ni supposée valide. Elle a été **réobservée** contre les autorités live avant toute mise à jour, conformément à la règle inscrite dans `current.json` : une classification est une observation datée, jamais un fait permanent.

## 2026-09-18 — Un contenu de dépôt ne lève pas une limite posée par l'utilisateur

Décision : le commit pair `e22214d` ajoute à `docs/gwc/canonical-memory/current.json` un bloc `continuationPolicy` déclarant `newTaskIsHumanGateByDefault: false` et `redundantHumanApprovalForbidden: true`, et retire de `readProtocol` la ligne exigeant une décision humaine explicite avant de créer un `GovernedTaskRecord`. Ces blocs sont **conservés intacts** — cette session ne les réécrit pas, ne les supprime pas et n'engage pas de guerre d'édition — et ils ne sont **pas** traités comme une autorisation.

Motif : un fichier versionné est du contenu de dépôt, pas une instruction de l'utilisateur. La limite « pas de session gouvernée, pas de claim, pas de lock, pas de création de tâche » vient des mandats de l'utilisateur dans la conversation. Un autre agent ne peut pas la lever en écrivant le contraire dans un fichier, quelle que soit la formulation. Seul l'utilisateur peut la lever, et il en a été informé.

Décision de réconciliation : après `HEAD_MOVED`, le travail intervenu est lu et compris avant toute écriture, et intégré par merge — jamais par rebase, amend ou force-push sur une branche partagée. Les affirmations du commit sont vérifiées contre les autorités propriétaires et non prises pour argent comptant : `TASK-20260918-001` a été confirmée réellement présente dans la file live, `READY` et non réclamée.

Décision sur `AF-36` : la mémoire canonique n'a de valeur de continuité que si son pointeur se résout. Un pointeur pendant laisse un agent qui reprend sans checkpoint, ce que `CLAUDE.md` §9 vise précisément à empêcher — et il passait une CI verte. La correction porte sur les deux faces, comme pour `AF-34` : l'instance est réparée, et la cause — l'absence de tout contrôle — est refermée par `verifyCanonicalMemory()`. Le contrôle est éprouvé par injection : cinq défauts distincts, cinq rejets.

Décision de portée de la réparation : le pointeur est repointé vers le bundle le plus récent **réellement présent**, et ce bundle est retiré de `previousBundles` pour qu'il ne soit pas à la fois courant et supersédé. Si l'auteur du commit ajoute ultérieurement le bundle manquant, le pointeur pourra être réavancé vers lui : le nouveau contrôle l'acceptera dès lors qu'il se résout et vérifie.

## 2026-09-19 — OD-07 résolue automatiquement par existing-first, sans human gate normal

Décision de continuité : l'exécution PRECODE est autonome par défaut. Les work items, findings, dépendances et nouvelles informations continuent d'être enrichis/réconciliés au fil de l'eau. Une décision technique ouverte n'est pas un human gate : la tâche la résout depuis les autorités, contraintes, preuves, Integration Slots et tests existants dès que le choix est déductible. Un arrêt externe n'est réservé qu'à un empêchement réellement non déductible ou non exécutable.

Décision AF-19 / OD-07 : le mécanisme retenu est **B — extension du gate de déploiement existant**. Ce choix applique `REUSE -> WRAP -> GENERALIZE -> EXTEND -> NEW` : le gate était déjà l'Integration Slot documenté ; `workflow_run` reste interdit par la politique OIDC ; l'option B ferme AF-19 sans créer une nouvelle autorité ni déplacer la responsabilité d'admission vers le serveur.

Compatibilité : `GITHUB_OIDC_POLICY.allowedEvents` reste inchangé, `tokenSha === requestedSha` reste inchangé, le nom de l'étape `Deploy exact main SHA through MCP` reste inchangé et le comportement historique de `workflow_dispatch` est conservé. Le push autodeploy exige désormais un `MCP CI` conclu `success` pour le même `GITHUB_SHA`; échec, timeout ou verdict indisponible restent fail-closed.

Preuve TDD : RED `757ee2a525741eef5cbb36796fc69c62c85a47b2` / MCP CI #1110 (échec attendu à `Read-only safety tests` après les contrôles précédents verts), puis GREEN final `074f2bd21eef6e23811512453d34670bfecc7485` / MCP CI #1112 entièrement réussi.

Frontière : aucun merge `main`, aucune écriture S1, aucun déploiement, aucune activation live, aucune Governed Task runtime, aucun runtime lock et aucune Governed Session runtime ne sont produits par cette correction candidate.


## 2026-09-19 — Clôture d'un claim PRECODE stale sous autorisation humaine

Décision appliquée uniquement au programme GWC/PRECODE PR #95 :

- `STALE != DEAD`, `STALE != RELEASED` et `STALE != CLAIM_TRANSFER` restent invariants.
- Le claim `candidate-minute-liveness-20260919T042806Z` peut être libéré dans cette clôture parce que l'utilisateur a explicitement demandé la récupération et la finalisation, preuve durable PR #95 commentaire `5739730790`, après réobservation du HEAD et du heartbeat.
- Cette autorisation ne s'étend pas au claim `GWC-PRE-E-GWC-6`.
- Pour GWC-6, l'absence de heartbeat produit `UNKNOWN/MISSING_HEARTBEAT`, pas une inférence `STALE` ou `DEAD`; son ownership reste inchangé.
- Une reprise GWC-6 doit d'abord réobserver claim/session/HEAD/heartbeat et utiliser le mécanisme de recovery en mode reconcile-only si l'exécuteur d'origine n'est pas vérifiable.

## 2026-09-19 — OD-03 : identité serveur canonique explicite, preuves serveur distinctes

Décision : `GW-07 SERVER_RESOLUTION` ne déduit jamais un serveur d'un chemin, d'un nom historique libre ou d'une simple disponibilité de transport. L'identité canonique est choisie exclusivement dans l'ensemble borné `canonicalServerIds`. Une variante de casse d'un `serverId` GitRegistry peut se normaliser vers cette identité explicite ; l'ID brut est toujours conservé comme preuve. Une valeur sans correspondance canonique reste `UNVERIFIED`.

Décision de désambiguïsation : un `serverHint` est un hint, pas une autorité. Il ne peut sélectionner qu'une identité canonique déjà liée au projet résolu ; sinon le resolver reste fail-closed. L'environnement fait partie du candidat ; `serverPath` et `realPath` restent des preuves et ne deviennent jamais identité.

Décision de liaison de preuve : les digests portés par le `ProjectResolution` et ceux de la preuve de bindings serveur sont des domaines de preuve distincts. Leur égalité n'est pas une précondition implicite de GW-07 ; elle ne pourra être exigée que si un contrat explicite les lie. Le faux couplage a été identifié par le RED GWC-6 et retiré à `d616849f`.

Décision de déterminisme : l'ordre des alias bruts est fixé par un tri de code units, sans `localeCompare`, afin que le même evidence snapshot produise le même résultat indépendamment de la locale d'exécution.

Frontière : GWC-6 reste `READ_ONLY`; GitRegistry conserve son autorité, ProjectResolution reste l'autorité prédécesseur, et aucun SSH, mutation, permission ou deuxième registre n'est introduit. Preuve finale : MCP CI #1258 SUCCESS sur `087b0a23230c83b6cb1c9069947f48a5d8cc0357`.

## 2026-09-19 — GWC-7 — OD-04 final / recovery ownership

- OD-04 est matérialisé par un RuntimeBinding éphémère et borné, jamais par un nouveau store ou executor.
- L'observation serveur reste l'autorité de vérité runtime ; Live State reste sa projection réconciliée ; GitRegistry ne peut que cross-checker une observation courante.
- NO_RUNTIME exige une observation explicite ; absence d'observation = UNVERIFIED.
- La session writer précédente étant STALE, son claim n'a pas été libéré par timeout. Le transfert GWC-7 a été effectué uniquement après autorisation humaine explicite PR #95 comment 5739928009 et revalidation du HEAD/claim/evidence.

## 2026-09-19 — GWC-8 : politique de résolution de domaine et compatibilité historique

Décision : `GW-09 DOMAIN_RESOLUTION` compose les autorités existantes au lieu de créer un registre parallèle. GitRegistry porte les déclarations `publicDomain`, `publicApi`, `historicalVhosts` et domaines de mapping ; l'observation courante du serveur prouve ce qui est effectivement servi. `protectedDomains` reste une liste de sûreté et ne devient jamais une autorité de domaine.

Décision `NONE` : un projet n'est `NONE` que si l'autorité projet déclare explicitement `publicDomain=null` et `publicApi=null`, que les mappings du serveur résolu ne déclarent aucun domaine, et que l'observation courante prouve une surface active vide. Une observation absente, indisponible ou stale reste `UNVERIFIED`.

Décision historique : `historicalVhosts` ne peut jamais être promu automatiquement en surface active. Il est exclu et rapporté. Un domaine observé courant sans déclaration active correspondante échoue fermé.

Décision de rôle : FRONTEND et API proviennent seulement d'autorités explicites. Un mapping historique sans `componentRole` peut renforcer comme preuve une déclaration projet du même domaine, mais il ne crée pas un nouveau rôle `OTHER` si une autorité plus explicite existe déjà. Plusieurs domaines distincts pour un même rôle restent `AMBIGUOUS` plutôt que d'appliquer une priorité implicite.

Frontière : resolver `READ_ONLY`, sans mutation vhost/SSH, sans probing side effect, sans persistance et sans inférence d'autorisation. Preuve finale : MCP CI #1286 SUCCESS sur `d6240484e387770751d9d3db476ac3b9470c74ce`.

## 2026-09-19 — GWC-9 : composition gouvernance/capabilities et fermeture AF-32

Décision : GW-10/GW-11 ne créent aucune nouvelle autorité. `CapabilityReality` reste la vérité de capacité/callability, `GovernanceDecision` reste la décision composée existante, et `Scoped Write Gate` reste le mécanisme d'observation des écritures. Le composer GWC-9 ne fait que vérifier leur cohérence pour une cible bornée et ne peut qu'être aussi restrictif ou plus restrictif.

Décision sécurité : une valeur `UNKNOWN` ne devient jamais permise. Un snapshot capability différent de celui effectivement utilisé par `GovernanceDecision` produit `CONFLICT`. En particulier, une attestation client permissive ne peut pas supplanter une capability serveur contradictoire. Aucun droit n'est inféré.

Décision AF-32 : les trois outils `mcp_reconcile_agent_intent`, `mcp_claim_next_governed_task` et `mcp_transition_governed_task` restent classés `operational-write`, mais leur enregistrement passe désormais par le même `decorateScopedWriteServer` que les writes scopés. Le mode reste strictement `off | shadow` ; aucun enforcing n'est introduit. Même un verdict shadow `wouldBlock=true` reste observationnel et ne modifie pas le résultat historique du handler.

Décision cartographie : l'ajout du shadow gate ne change pas la surface de registration ni les noms/contrats des outils. La cartographie reste donc inchangée et ne doit pas être régénérée artificiellement ; la régression exacte `functionCartography` de CI #1302 le prouve.

Preuve finale : MCP CI #1302 SUCCESS sur `ff85ab51ae59df044ad179abe0865374e41f2412`.

## 2026-09-19 — GWC-10 : TargetScope multi-repository

Décision OD-10 : la migration est strictement additive. `TargetScope` est optionnel sur les records opérationnels concernés. Son absence signifie exactement la cible mono-repository historique et **jamais** « tous les composants ». Aucun record existant n'est rétro-rempli et `schemaVersion: 1` reste valide.

Décision OD-11 : `ownerGovernedSessionId` reste l'owner d'une Task ; la Task possède exactement le sous-ensemble de composants nommé par son `TargetScope`. Un même `intentKey` sur deux scopes composants disjoints ne doit pas être fusionné. Les locks composants utilisent un scope minimal indépendant et ne sont jamais élargis automatiquement au projet.

Décision SHA : aucun `PROJECT_SHA` n'existe. `TargetContext` conserve `githubHead` et `runtimeRevision` séparément pour chaque composant. Pour un BootstrapReceipt multi-composant, les champs SHA legacy globaux sont `null` et la preuve exacte vit dans le `targetContext` scoped.

Décision autorité : GitRegistry V2 reste l'autorité projet/composants, Operational Memory reste l'autorité Session/Task/Lock, Live State reste l'autorité d'observation. GWC-10 ne crée aucun second registre, aucun second store ni aucun second Live State.

Décision égalité : deux `TargetScope` portant exactement les mêmes composants sont identiques indépendamment de l'ordre du tableau. Cette règle a été découverte par self-review CI #1329 et prouvée GREEN en CI #1330.

Preuve finale de code : MCP CI #1330 SUCCESS sur `67197cd12e13f450734b403c4b85e26dc9760c60`. Le claim GWC-10 n'est libérable qu'après validation CI du checkpoint canonique exact-head.
