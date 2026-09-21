# CHANGELOG.md

## 2026-09-19 — Incremental intake continuity and coherence

- Ajout additif de séquençage monotone des `NEW_INFORMATION_INTAKE-NNN`.
- Ajout du `CandidateIntakeContinuityCursor` et des revisions canonical/backlog.
- Ajout du Coherence Gate déterministe et de ses verdicts bornés.
- Ajout de la réconciliation par batch contigu avec `IntakeReconciliationReceipt` digesté.
- Ajout d'un knowledge freshness guard local : HEAD + canonical revision + backlog revision.
- Préservation des deux intakes historiques #001/#002 sans adoption automatique ni réécriture.
- TDD : RED CI #1080, GREEN CI #1081.
- Aucun runtime MCP, Task Queue runtime, lock, main, S1 ou prod modifié.


## 2026-09-19 — GitHub-first PRECODE bootstrap

- Extension additive de `candidateContinuity.ts` avec `resolveCandidateSession()`, `routeCandidateConnectionIntent()` et `bootstrapCandidateConnection()`.
- Connexion PRECODE directe GitHub ; `runtimeMcpRequired=false`.
- Identifiants provider/GitHub conservés uniquement s'ils sont réellement observés ; IDs conversation absents restent `null/UNAVAILABLE`.
- Routage automatique information/continuation/both ; `ASK_USER` uniquement si ambigu.
- Compatibilité ascendante des anciennes candidate sessions sans `connectionInstanceRef`.
- TDD : RED CI #1061, correction de compatibilité CI #1062, GREEN CI #1063.
- Aucun changement live `main`/S1/prod/runtime.


## 2026-09-19 — Candidate multi-agent continuity and conversation reconciliation

- Ajout additif de `src/governedContext/candidateContinuity.ts`.
- Ajout du dispatch PRECODE multi-agent sans Task Queue runtime : reprise du claim courant, dépendances, priorité/séquence et collision domains.
- Ajout d'un intake borné de nouvelles informations de conversation avec réconciliation mémoire/backlog.
- Refus de persister le transcript brut ; contradictions fail-closed vers review.
- Ajout de `tests/candidateContinuity.test.ts` à `test:readonly-safety`.
- TDD : RED #1046, GREEN #1048.
- Nouveau bundle canonique `pr95-candidate-continuity-ready`.
- Aucun merge main, aucune mutation S1/prod, aucun runtime Task/lock, aucun déploiement.


## 2026-09-18 — PRECODE devient construction de candidate évoluée

- Correction sémantique majeure : PRECODE signifie désormais pré-intégration de la version évoluée complète, et non « architecture/doc uniquement ».
- Le gate d'architecture autorise le code candidate sur `claude/ecstatic-edison-v1dyt1`.
- Phases B→F redéfinies : backlog candidate, safety/foundations, cycle d'implémentation branch-local, construction GWC-0..17, acceptance candidate.
- Ajout de 18 work items candidate `GWC-PRE-E-GWC-0..17`.
- Gate machine R4 distingue candidate code autorisé de l'intégration live interdite.
- Vérificateur PRECODE durci pour contrôler cette frontière.
- Nouveau bundle canonique `pr95-candidate-build-ready`.
- Aucune Governed Task runtime créée ; aucun main/S1/prod/deploy touché.



## 2026-09-18 — PRECODE indépendant du bridge OAuth

- Ajout d'une hiérarchie de preuves PRECODE : audits versionnés → GitHub live/artefacts → miroir serveur read-only futur.
- OAuth MCP / `wealthtech_ssh_bridge` n'est plus une dépendance de progression PRECODE.
- Le miroir serveur proposé est GitHub-side, read-only, least-privilege, redacted et sans surface de mutation.
- Les preuves historiques conservent date/SHA/fraîcheur ; absence de preuve fraîche = `UNKNOWN` / `STALE`.
- Aucun workflow serveur, credential, runtime ou déploiement n'a été activé : conception PRECODE uniquement.



## 2026-09-18 — Rétablissement de la frontière PRECODE

- Recentrage de la PR #95 sur la finalisation de la version PRECODE, sans intégration runtime.
- `CLAUDE.md` et la coordination multi-agent précisent désormais que le passage du gate d'architecture n'autorise pas l'intégration réelle.
- `.mcp/gwc-precode-status.json` distingue le catalogue complet `T00→T204` de la plage PRECODE courante `T00→T195`; `T196→T204` reste un plan futur.
- `docs/gwc/canonical-memory/current.json` repointe sur le bundle PRECODE `pr95-precode-gate` et remet `T195/A14` comme travail courant.
- Les observations Phase B/C antérieures sont conservées pour provenance mais ne sont plus la phase d'exécution courante.
- Aucun changement `main`, S1, runtime, Governed Task, lock ou déploiement.



## 2026-09-17 — Flux pré-code exécuté : gate vérifié, AF-34 ouvert puis corrigé

- Exécution de `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt` de `GWC-PRE-000` à `GWC-PRE-GATE-01` sur le head exact. Aucun code runtime, aucune Task, aucun lock, aucun déploiement.
- Ajout de `.mcp/gwc-precode-status.json` : projection de statut par phase, non autoritative, avec références de preuve relisibles et head exact observé.
- `.mcp/gwc-workflow-graph.json` : les 91 arêtes portent désormais `trigger` et `precondition` — 70 `POSTCONDITION_PASS`, 16 `SKIP_CONDITION` motivées individuellement, 4 `REOBSERVE_REQUIRED`, 1 `POSTCONDITION_FAIL`.
- `docs/gwc/BLUEPRINTS.md` : ajout des modèles `M1 EvidenceRef`, `M2 StepAttestation`, `M3 classes de rejeu`, `M4 RecoveryAnchor` et `M5 précondition d'arête`, exigés par les phases `A7`, `A8` et `A5`.
- `docs/gwc/PRECODE_EXECUTION_PLAN.txt` : ajout d'`E2E-22` (résolution de finding de revue) ; 22 scénarios E2E.
- `scripts/gwc-verify.mjs` : refus de toute arête sans `trigger` ni `precondition`, vocabulaire `EDGE_TRIGGERS` borné, cohérence `SKIP`/`SKIP_CONDITION` et `FORWARD`/`POSTCONDITION_PASS`. Correction d'un défaut introduit dans le même lot : le contrôle avait été placé dans une fonction qui ne servait qu'à une sonde synthétique.
- `scripts/gwc-precode-verify.mjs` : recoupement du gate contre la projection de statut — refus d'un `PASS_WITH_EVIDENCE` sans preuve, d'un verdict contredisant le décompte des phases, d'une Task runtime déclarée, ou d'un head exact absent.
- `AF-34` ajouté puis corrigé : le gate déclarait 14/14 phases satisfaites alors que 10/14 seulement étaient vérifiables. Les six conditions de sortie manquantes ont été comblées et le vérificateur contrôle désormais la réalité, plus la déclaration.
- Mémoire canonique : nouveau bundle `pr95-precode-gate` (2 sources, intégrité vérifiée, 6 claims tous `approval_eligible: false`), pointeur `current.json` avancé, bundles précédents conservés immuables.
- Verdict : `GWC_ARCHITECTURE_GATE = PASS`. `GWC_RUNTIME_IMPLEMENTATION = NOT_STARTED`. La Phase B exige une observation live de la Governed Task Queue, indisponible depuis cette session.

## 2026-09-17 — Conception d'évolution détaillée GWC-0..GWC-17 et correction de la CI

- Correctif CI : le job `validate` échouait à `docs:check` (`markdown_inventory_drift`, `markdown_count_drift`, declared 211 / actual 214). `docs/governance/markdown-inventory.json` réaligné sur les 3 sources de `docs/gwc/canonical-memory/pr95-ded/`, régénéré avec `scripts/generate-doc-governance-baseline.mjs` : 211 → 214 Markdown suivis, `categories.documentation` 61 → 64.
- `docs/gwc/BLUEPRINTS.md` : ajout des 18 fiches de conception détaillée `GWC-0`…`GWC-17`, de 13 registres transverses, de la matrice centrale des 73 contrats, du traitement des 12 décisions ouvertes, du registre des 33 findings, des 4 audits globaux et du verdict terminal.
- Ajout de `.mcp/gwc-evolution-design.json` : projection machine de la conception, 18 fiches, 73 contrats rattachés, 33 findings, 12 décisions ouvertes, `runtimeTasksCreated: 0`, `promotedToTaskQueue: false`.
- `scripts/gwc-verify.mjs` : ajout de `verifyEvolutionDesign()` — 18 fiches sans doublon ni manquant, couverture et réciprocité des contrats, classifications bornées, aucun `NEW` sans primitive justifiée, aucune primitive déclarée par deux blueprints, findings rattachés et réciproques, `AF-19`/`AF-22`/`AF-30` chez leur propriétaire, `OD-01` à `OD-12` présentes, 13 registres et 4 audits déclarés, verdict borné.
- Findings ajoutés : `AF-31` (deux fichiers de tests exécutés dans aucune étape CI), `AF-32` (trois outils `operational-write` hors porte d'écriture), `AF-33` (affectations de findings sans définition versionnée cohérente).
- `docs/gwc/REVISION_HISTORY.md` : révision `R3-DED`. `docs/gwc/README.md` : contenu, état et contrôles du vérificateur mis à jour.
- Aucun comportement runtime modifié, aucun outil MCP ajouté, aucune Task créée, aucun lock, aucun merge, aucun déploiement.

## 2026-09-16 — Réconciliation R3 du dossier GWC : corps canonique et blueprints

- `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` devient le **corps canonique** : les 73 Contract Design Sheets au modèle A→BA, baseline `GWC_73_CONTRACT_DESIGN_SHEETS_CANONICAL_R1`. Il ne contient plus aucune affirmation historique.
- Ajout de `docs/gwc/REVISION_HISTORY.md` (R1 → R2 → R3), `docs/gwc/DEPRECATED_CLAIMS.md` (DC-01 à DC-11) et `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md` (archive R2 avec bannière non canonique).
- Statut d'architecture : `AWAITING_HUMAN_RATIFICATION` → `READY_FOR_GOVERNED_IMPLEMENTATION`.
- Suppression de `.mcp/gwc-task-seed.json` et de `docs/gwc/BACKLOG.md`, remplacés par `.mcp/gwc-blueprints.json` et `docs/gwc/BLUEPRINTS.md` : 18 blueprints `GWC-0`…`GWC-17`. `TASK BLUEPRINT ≠ GovernedTaskRecord`.
- Suppression de la Task de ratification humaine `TASK-20260916-001` ; aucun human gate générique n'est créé.
- `.mcp/gwc-contracts.json` devient une projection compacte et déterministe de la baseline canonique : `stepId`, `canonicalName`, `contractVersion`, `family`, `profiles`, `executionSemantics`, `integrationClassification`, `canonicalSheetRef`, `blueprintRef`, findings et références de graphe.
- Ajout de `.mcp/gwc-workflow-graph.json` : 80 arêtes, dont 4 à rebours et 7 sauts déclarés. Aucune règle `to > from`.
- Portées de ressource passées au domaine de collision minimal ; aucune portée globale `repository:Patricked-code/MCP`.
- `scripts/gwc-verify.mjs` étendu : contrats, graphe, blueprints, réciprocité des références, propriété architecturale des findings, absence de promotion en Task Queue.
- `docs/governance/markdown-inventory.json` : 208 → 211 Markdown suivis.
- Aucune Task runtime créée, aucune promotion en Task Queue, aucun déploiement, aucune implémentation GWC runtime démarrée.

## 2026-09-16 — Dossier permanent GWC versionné (documentation et données, sans implémentation)

- Ajout de `docs/gwc/` : `README.md` (protocole agent et procédure d'amendement), `ARCHITECTURE_73_CONTRACTS.md` (architecture R2 complète, 73 fiches, AF-01 à AF-30) et `BACKLOG.md` (projection lisible du backlog).
- Ajout de `.mcp/gwc-contracts.json` : les 73 contrats en lecture machine, avec maturité, stratégie d'intégration, nature d'action, autorité principale, slot d'intégration, lot et tâche d'implémentation associée.
- Ajout de `.mcp/gwc-task-seed.json` : 18 tâches candidates au format `TaskRegistrySeed`, en préparation. Ce fichier n'est chargé par aucun code ; seul `.mcp/task-registry.json` est lu par `initializeSeed()`.
- Ajout de `scripts/gwc-verify.mjs` et du script npm `gwc:verify` : vérification déterministe des deux artefacts, avec la même sérialisation canonique que `src/operationalMemory/taskQueue.ts`.
- `docs/governance/markdown-inventory.json` : 205 → 208 Markdown suivis, catégorie `documentation` 55 → 58.
- Aucun comportement runtime modifié, aucun outil MCP ajouté, aucune tâche créée dans la Governed Task Queue, aucun lock, aucun déploiement.

## 2026-09-15 — C2 Repository → Project Resolution fusionnée et déployée

- Ajout additif du resolver C2 `repositoryId → mappingId → projectId` dans le Governed Context existant, avec `RESOLVED/NONE/AMBIGUOUS/UNVERIFIED`.
- Réutilisation de B2 et de l'unique GitRegistry via le candidat V2 dry-run ; aucune activation V2, aucun second registre/store/cache et aucune permission nouvelle.
- Compatibilité historique `Patricked-code/MCP → mcp_bridge` préservée lorsque le mapping porte le `projectId` sans fiche projet dédiée ; toute référence présente mais contradictoire reste fail-closed.
- TDD : RED `f71704db` / CI #933, GREEN `45adc859` / CI #935, RED MCP `6fc9c74b` / CI #937, GREEN `d71ba167` / CI #939, head final `8b71f14f` / CI #943.
- PR #92 fusionnée au merge `46d576e53820eba0360647b6fd96d41dd4a2bbc6`; MCP CI main #944 et Governed Deploy #41 réussis ; GitHub/S1/origin-main/runtime sont alignés sur ce SHA, runtime healthy.
- `TASK-20260915-001` est observée `DEPLOYING` révision 10 avec le même `runtimeRevision`; la réconciliation docs-only reste nécessaire avant `VERIFYING/DONE`.

## Role
Historique factuel des changements du depot MCP.


## 2026-09-13 — AfricaFunds Phase 2 livrée, réconciliation terminale

PR #80 fusionnée depuis le head exact `18355de8d4892685ee4f68b11d1542fb249e838a` au merge `1eac93f631fcf7843d7e768bba7a4125ed00bdbb`; CI PR #841, CI main #842 et Governed Deploy #34 (run `34750625897`) réussis.

Live State `204` : GitHub/S1/origin-main/runtime exact-SHA, S1 propre/read-only et runtime healthy. Le seul DOCUMENTATION_DRIFT exige cette réconciliation descendante des six Markdown via une PR documentaire distincte.

Le dry-run du registre exécuté confirme 1 projet, 5 repositories, 4 mappings, capacités sensibles désactivées et aucune écriture. Aucun code fonctionnel, workflow, secret, permission ou checkout S2 modifié.

#840 à zéro job n'est pas une régression démontrée; #841 est la preuve du head fusionné. Le statut terminal, le checkpoint final, les locks et la fermeture de session restent exclusivement sous Operational Memory; les relire après le déploiement documentaire. Aucun DONE n'est anticipé par cette projection.

Le transport SSH direct indépendant du MCP reste un sujet séparé. La queue runtime doit être relue après clôture; aucune tâche ou permission n'est inférée de la roadmap.

## 2026-09-12 — AfricaFunds Phase 1 compatibility foundation

- `TASK-20260910-001` exécute le design en deux phases approuvé au checkpoint `6ad95c77-fb4b-4abd-bf3f-3a1db74eb142`, sans recréer la tâche après B2.
- La Phase 1 étend l'unique GitRegistry actif avec un champ racine `projects` optionnel et des corrélations mapping optionnelles; l'absence historique reste absente à la lecture/écriture/migration.
- Le candidat GitRegistry V2 dry-run accepte les projets sans être activé et valide identifiants uniques, références repository/mapping et invariants `HISTORICAL_VHOST` non Git/inactif/non déployable.
- RED ciblé : 1 test historique vert et 5 échecs attendus avant code. GREEN : 6/6 ciblés, 363/363 complets, typecheck, build, 204 Markdown gouvernés, cartographie, secrets et diff-check verts.
- PR #78 fusionnée sous garde du head exact `f7800966119601e336c480da6f2f98eafe6e6e70` au merge `b747dfc7f67786a40c19c285dbcdb3a07b78d5c0`; MCP CI #824 `validate` a réussi sur le head exact.
- Live State `175` atteste GitHub/S1/origin-main/runtime exact-SHA, S1 propre/read-only et runtime healthy sur le merge; le blocker restant est uniquement `DOCUMENTATION_DRIFT`.
- Aucun projet AfricaFunds actif n'est encore ajouté, V2 reste dry-run, aucun outil/registre/store/cache/observateur/permission/WRITE gate n'est créé ou élargi et aucun dépôt/checkout/vhost S2 n'est muté.
- Le transport GitHub Actions → SSH → S1 reste un lot séparé et ne fait pas partie de `TASK-20260910-001`.
- Cette modification est la réconciliation strictement Markdown nécessaire avant le gate `FULLY_ALIGNED` et le démarrage de la Phase 2.

## 2026-09-11 — B2 Repository Resolution livré fonctionnellement

- `TASK-20260909-001` implémente le design SLOT-07 approuvé au checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c` depuis `main@efb09ce7eeba85122b01c7fa48d99e967b7cdb7c`.
- Le resolver pur privilégie `ConnectionContext.repository`, utilise seulement owner/repo de GitRegistry V1 en fallback et produit `RESOLVED/NONE/AMBIGUOUS/UNVERIFIED` avec provenance, fraîcheur, reason codes et candidats bornés.
- `src/tools/durableAccounts.ts` expose un batch éphémère réutilisant exactement le credential B1 ; `/repos/{owner}/{repo}` est assaini et ne projette ni token, chemin, scopes, permissions ou erreur brute.
- Le collecteur/cache/service/dashboard Governed Context existant reçoit une projection optionnelle backward-compatible ; cache miss et stale restent fail-closed.
- Un registre V1 absent, corrompu ou structurellement invalide est `UNAVAILABLE`, jamais transformé en faux `NONE`; le lecteur historique reste inchangé.
- La revue TDD a corrigé la priorité des statuts : un 404 est `UNVERIFIED` avec visibilité incertaine, jamais `NONE`.
- La self-review TDD refuse aussi les registres de plus de 1 000 mappings au lieu de créer une fausse résolution par troncature, exige la cohérence `user/organization` avec B1 et dérive les reason codes du statut observé, avec une exception bornée pour distinguer `AUTH_MISSING` d'une indisponibilité API.
- Aucun nouvel outil, registre, store, cache, observateur, Session Manager, permission, Policy V3, activation GitRegistry V2 ou écriture S1 n'est introduit. Le WRITE gate reste `shadow`.
- La branche concurrente incompatible a été neutralisée par un descendant non destructif `3bad842b1bfe8bdcd7289201f6a696fb84168e34`; aucun force-push ni effacement d'historique.
- La première revue indépendante n'a trouvé aucun défaut critique mais a bloqué la livraison sur le cache identity-scoped, les collisions d'inputs invalides, le bornage avant parsing, la conservation de `observedAt` stale et les segments `.`/`..`. Le commit RED `e81e3cd` échoue sur six assertions ciblées (`38/44`) ; le GREEN `ffc4c96` les rend toutes passantes.
- Le second passage indépendant conclut `READY`, sans finding Critical/Important/Minor, avec 76/76 tests ciblés B1/B2/cache. La collecte identité-scopée réobserve désormais les autorités tandis que `getCurrent()` et le cache non scopé conservent leurs contrats historiques.
- Validation locale acquise : 357/357 tests, typecheck, build, secrets, 202 Markdown gouvernés, cartographie et Current-State Evidence sans contradiction. La commande enveloppe `tsx --test` reste interdite par l'IPC de cette sandbox (`EPERM` sur le socket CLI) ; les mêmes tests sont inclus dans la suite complète exécutée avec `node --import tsx --test`.
- La PR #75 a été fusionnée sous garde du head exact `dd2a9a7894f928aa5dac886c79dc269ea3838a7b` au merge `f2c90902a627ee9209d805403e584f3123a0453a`. MCP CI main #811 et MCP Governed Deploy #29 ont réussi sur ce SHA.
- Live State `163` atteste GitHub main, S1 HEAD/origin-main et runtime healthy au SHA exact `f2c90902a627ee9209d805403e584f3123a0453a`, S1 propre/read-only et l'image OCI `sha256:f4873739812999349d57f4dd02337cf2e873c81e9bfd938e53a86bedebb9334a`.
- La réconciliation Governed Context observe B2 `RESOLVED/CURRENT` depuis `ConnectionContext` pour `github:Patricked-code/MCP`, GitHub repository ID `1285534440`, sans reason code, incertitude ni permission dérivée ; B1 reste `RESOLVED/CURRENT` sur le même contexte d'authentification.
- La tâche est passée à `VERIFYING` révision 7 après l'attestation technique, puis est revenue explicitement à `IN_PROGRESS` révision 8 pour la réconciliation descendante strictement documentaire. Aucune clôture `DONE` n'est anticipée avant son CI/merge/déploiement et Live State `FULLY_ALIGNED`.

## 2026-09-09 — B1 GitHub Identity Resolution livré et clôturé

- `TASK-20260907-001` a exécuté le design approuvé sur `mcp/github-identity-resolution-20260907`, PR #73, depuis `main@aa57b07cd3ba514df7b1ceb8cc60ab1587e15620`, puis a été clôturé séparément après sa réconciliation documentaire PR #74.
- `.mcp/identity-policy.json` passe en V2 strictement additive : `goal`, `currentSignals`, `limits`, `s1GithubDeploymentIdentity` et `requiredSuiviFields` restent obligatoires et inchangés sémantiquement ; seul `githubPrincipalBindings` est ajouté.
- Le binding `oauth:wealthtech-mcp-admin` → utilisateur GitHub `Patricked-code` s'applique uniquement au contexte déjà prouvé `Patricked-code/MCP`, avec effet `IDENTITY_ONLY`. Il est non global, non exclusif, réversible et extensible à d'autres comptes ou repositories.
- Le chemin durable existant est réutilisé : `data/github-accounts.json` sélectionne une connexion configurée, le secret storage fournit le credential sans l'exposer, le même observateur borné `GET /user` prouve le principal GitHub, puis le collecteur/cache GitHub existant compose la projection Governed Context.
- Les résultats `RESOLVED`, `NONE`, `AMBIGUOUS` et `UNVERIFIED` sont fail-closed, avec provenance, fraîcheur et reason codes ; un utilisateur authentifié reste distinct des organisations accessibles.
- Aucun `identity-registry.json`, nouveau registre, store, Session Manager, cache, observateur, outil MCP ou permission n'est créé. GitRegistry V2 reste réservé aux mappings repository/projet/serveur/domaine ; les Effective Capabilities restent au SLOT-11 et le WRITE gate reste `shadow`.
- TDD publié : RED purs `8c570f96a94a492846b5df618f6b7383ba36a510`, GREEN purs `bbec96d87c46b9bea398ef5594ba278bfd48142d`, RED intégration `476e0b26d1eeadac30afdee1ec73b5781516c320`, GREEN intégration `7830fb5ad0fdc385332259439600df357ea8ed13`.
- La self-review exact-head a détecté avant merge qu'un futur contexte de compte configuré mais non vérifié pouvait encore être sélectionné. Le RED de revue `a9a0131ae3ce68f1b234448de242d314c8f202df` reproduit cet écart ; la correction fail-closed exige désormais `accountVerified` et retourne `GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED` sinon.
- Le contrôle pré-merge a ensuite bloqué la fusion sur deux findings P2 : un profil public d'organisation pouvait être confondu avec une appartenance authentifiée, et des contextes observés via un autre credential pouvaient être projetés. Les nouveaux RED ciblés reproduisent ces deux écarts. La correction réutilise le même observateur durable : appartenance active `GET /user/memberships/orgs/{owner}`, corrélation opaque limitée à une collecte et filtrage strict au credential sélectionné, sans nouveau store/cache/registre ni permission.
- Validation finale de revue : RED `631b5070f201950d2cdcc73363df8004d4ab5fec`, GREEN `9b1a572ab0362aeefa5e13f425225e1f510704b7`, 43 tests B1 ciblés, 310 tests complets, typecheck, build, documentation (200 Markdown), cartographie, preuve current-state, secrets et diff verts ; MCP CI #777 réussie et les trois threads de la PR #73 résolus.
- PR #73 fusionnée sous garde du head exact `9b1a572ab0362aeefa5e13f425225e1f510704b7` au merge `208b8744810a23e48a4282450786805e7ff18845`; MCP CI main #778 et MCP Governed Deploy #27 ont réussi.
- Live State `96` atteste GitHub main, S1 HEAD/origin-main et runtime healthy sur `208b8744810a23e48a4282450786805e7ff18845`, S1 propre/read-only et image OCI `sha256:4bdb9524dd1ace6d700c95b27dab1c12c19d55cbf6e95aa7e9d671fade437401`.
- La projection runtime résout le binding `oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp` en `RESOLVED` : principal GitHub authentifié `Patricked-code` (`githubUserId=270385782`, type `user`), contexte sélectionné `Patricked-code`, freshness `CURRENT`, aucun reason code et aucune permission dérivée. `chainsolutions-wealthtech` reste un contexte organisationnel accessible distinct, vérifié via le même credential.
- La contradiction documentaire résiduelle a été levée par la PR #74 ; `observedHeadSha` et `runtimeRevision` ont été attestés à `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c`, puis `TASK-20260907-001` a été transitionné à `DONE` révision 19 avant l'enregistrement de B2.
- Rollback : avant merge, fermer/revert la PR ; après merge, revert gouverné exact via PR puis déploiement normal GitHub → S1. Aucun backfill ni migration destructive n'est requis.

## 2026-09-01 — Governed Connection Context minimal

- `TASK-20260901-001` part de `main@184107d5705248427d322922077d18f51e133c15` sur `mcp/project-context-resolution-20260901`, Draft PR #67.
- Ajout d'un `ConnectionContext` strict, versionné, optionnel et sanitizé dans le `GovernedSessionRecord` existant; aucun store, manager, registry ou outil parallèle.
- Les nouvelles sessions OAuth persistent un identifiant logique stable, le principal et le `clientId` déjà assainis; les credentials partagés persistent explicitement `null`; les sessions historiques sans champ restent lisibles et reprenables sans backfill.
- RED `7335e3fdb0812402d4ed3cd570e9909beb74c475` : module absent, 260/261 tests réussis. RED `28b3bf45c903f43f56bd8b90921a34236f707f03` : deux assertions de persistance ciblées échouent tandis que la compatibilité historique passe.
- GREEN `994b71de97beeb14b48cbd8ad501f9844b145764` : création OAuth/partagée validée. `6088a707c8a2e580cc0467adbae06873c73f4265` : stabilité attach/heartbeat/checkpoint/pause/resume et absence de migration implicite validées.
- Head fonctionnel `2f9d752e5c2c9c4eff98138b67a3bd96b6561656` : les surfaces existantes open/get/list/resume exposent le même contexte assaini sans token, transport brut, resume secret ou hash; CI complète réussie.
- Aucun changement d'authentification, serveur MCP, GitRegistry, Governed Context, Bootstrap Receipt, WRITE gate, Autodeploy, S1 ou runtime. Rollback : revert des commits du lot; les enregistrements historiques demeurent valides grâce au champ optionnel.
- `ROADMAP.md` décompose désormais A2 en A2.1 (contexte minimal) et A2.2 (preuve cliente vérifiée), garde les statuts dynamiques dans leurs autorités et interdit de déclarer le lot livré avant l'attestation complète.

### Livraison gouvernée du lot A2.1

- La Draft PR #67 a été fermée sans fusion après l'échec avant mutation de sa transition Ready; la PR #68 a poursuivi la même tâche, branche et portée sans créer d'autorité parallèle.
- La revue PR #68 a identifié un finding P2 : une validation de contexte pouvait échouer après `TransportBindings.bind`. Le RED `f3b4bacd1d8a6975d33c949372cda6f1d1d2d523` a reproduit le binding orphelin comme unique échec (`271/272`).
- Le GREEN `81832e1b702a8dfe10cda5634d6092fb3a177142` construit et valide le contexte avant tout binding; MCP CI #713 passe `272/272` et la revue exact-head ne trouve plus de blocker.
- PR #68 fusionnée au SHA `024f6ad4c047614bdfaea0e317f371b789f60136`; CI main #714/#715 et MCP Governed Deploy #24 réussis.
- GitHub main, S1 HEAD, S1 origin/main et runtime healthy sont attestés au même SHA; aucun changement OAuth, GitRegistry, Bootstrap Receipt, WRITE gate ou chemin de déploiement.
- La réconciliation documentaire PR #70 a été fusionnée depuis `59de3687bf1b2439a24f092257236fb3f559feee` au merge `c87598ddab01131eb8d3b9bad35f9d0cbdc2a5d4`; CI PR #745, CI main #746 et Governed Deploy #25 ont réussi.
- Live State `83` a attesté GitHub/S1/runtime/documentation `FULLY_ALIGNED`, S1 propre et le runtime healthy sur le merge exact. Operational Memory a ensuite clôturé `TASK-20260901-001` à `DONE` révision 10, checkpointé, libéré son lock et fermé sa session.
- `TASK-20260901-002` porte uniquement la projection documentaire finale dans `ROADMAP.md`, `TODO.md`, `TASKS.md`, `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md`. B1 et les lots suivants restent non enregistrés; aucun code, workflow, policy, secret, WRITE gate, S1 ou runtime n'est modifié.

## 2026-08-31 — Automatic Governed Connection Bootstrap stabilisé et déployé

- PR #60 : premier lot de bootstrap automatique fusionné et déployé au SHA `211a7de7940f115aa997f404927a8e0c9ace9055`.
- Une observation runtime a exposé un churn de révision sur transports MCP éphémères : `66 → 67 → 68`, rendant les écritures optimistes inexécutables.
- TDD RED : CI #626 a obtenu `actual RESUMED / expected ATTACHED`; CI #628 a confirmé l'absence du reason code serveur.
- GREEN final : les sessions `OPEN`/`ACTIVE`/`PAUSED` utilisent `ATTACHED` sans mutation durable; `EXPIRED` conserve `RESUMED`; `NONE`, `AMBIGUOUS`, `IN_USE` et le refus des credentials partagés restent fail-closed.
- Le head exact `2e8fa683296f4f1bf53b9875104598696ba9c6e2` a passé la CI PR #645, run `33442649238`, job `99654287301`, avec `258/258` tests, typecheck, build, documentation, gouvernance, secrets et whitespace réussis.
- PR #62 fusionnée sous garde du SHA exact au merge `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`; CI main #646 et MCP Governed Deploy #19 ont réussi.
- Live State `63` atteste GitHub/S1/runtime alignés sur `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`, S1 propre/read-only et Docker healthy. Trois lectures production restent à `sessionRevision=68`.
- La présente modification est la réconciliation docs-only descendante requise avant la clôture Operational Memory. Aucun code, workflow, secret, OIDC, Autodeploy, WRITE gate ou fichier S1 n'est modifié.

## 2026-08-29 — Candidate Unified Operational Work State

- Ajout additif de `src/governance/operationalDecision.ts` pour dériver `CapabilityReality`, `TaskReality` et `GovernanceDecision` à partir des autorités existantes, sans nouveau store ni nouvelle source de vérité.
- Enrichissement de Governed Context et du contexte GitHub avec branche/head de travail, PR, checks exact-head, reviews, threads, ruleset, ownership, activité, fraîcheur/cache, reality projections et décision opérationnelle bornée.
- Ajout de l'observabilité correspondante dans le dashboard sans nouveau collecteur parallèle.
- Observer Before Actor est intégré au chemin réel : une session sans `workBranch` utilise la branche portée par la tâche courante avant le fallback d'entrée, et les reason codes GitHub observés sont propagés à `GovernanceDecision` lorsque l'opération exige GitHub.
- TDD de clôture : le test d'intégration a d'abord exposé la branche non propagée, puis le reason code GitHub manquant; les deux gaps ont été corrigés par deux changements minimaux dans `src/governedContext/service.ts`.
- Validation fonctionnelle fraîche au head `34d51247c021524f4c3e03824c938529bc831743` : MCP CI `33236805556`, job `99059095387`, avec typecheck, build, docs, gouvernance, secrets, read-only safety et whitespace diff tous réussis.
- Compatibilité : WRITE gate toujours `shadow`; aucun nouveau store, aucune migration, aucun changement OIDC/Autodeploy/2FA/`ENABLE_WRITE_TOOLS`/`allow_write`, aucun push direct `main` et aucun contrat historique supprimé ou renommé.
- Rollback : revert des commits du chantier sur la branche gouvernée; les nouvelles projections sont additives et ne remplacent ni Live State, ni Operational Memory, ni Governed Task Queue, ni GitHub.

## 2026-08-28 — Correction PR #52 fusionnée et déployée

- PR #52 fusionnée par squash avec garde `expected_head_sha` au SHA `fff44ff2db386942730a67f3884980c7824cae7f` ; arbre exact `4655f4aaa8b79557bf1fbb23651faa7e72a7021d`.
- CI PR #485 (`33213114008`), CI main #486 (`33214825660`) et Governed Deploy #14 (`33214825772`, job `98996005106`) réussis.
- GitHub, S1, `origin/main`, image OCI et runtime attestés au SHA exact ; S1 propre/read-only, Docker running/healthy, image `sha256:c616dd31923a574ab276805a1f4cd1066399c5858d37f9acbce8ac7cb565d588`.
- Live State `39` expose le catalogue corrigé 111 outils, 2 resources, 68 lectures et 43 écritures ; le seul écart restant avant cette candidate est la réconciliation documentaire.
- Les trois threads tardifs PR #49 ont reçu les preuves de correction et sont résolus.
- WRITE gate toujours `shadow`; aucun changement OIDC, Autodeploy, 2FA, `ENABLE_WRITE_TOOLS`, `allow_write` ou activation `enforce`.

## 2026-08-28 — Candidate corrective Mandatory Agent Bootstrap V1

- Réattribue de manière idempotente les tâches non terminales dont la session propriétaire est `CLOSED`, ou `EXPIRED` au-delà de `resumeGraceSeconds`, en conservant branche, PR et corrélations SHA/runtime.
- Limite `currentTask` à la Governed Session liée au transport appelant, uniquement si la session est utilisable et la tâche non terminale.
- Refuse les mutations de tâche depuis les sessions `CLOSED` ou `EXPIRED`.
- Lit la preuve current-state depuis les blobs Git du `evidenceHead` ; un working tree sale ne peut plus être attribué au commit observé.
- Classe `mcp_get_work_queue` et `mcp_get_governed_task` en `read`, tandis que claim et transitions restent `operational-write`.
- Catalogue candidat : 111 outils, 2 resources, 68 lectures, 43 écritures, digest `cfd5f18490f25ce79b4afbda36a9eda48453a7098237f73b39aa804a4cd43aad`.
- TDD : huit échecs RED ciblés, puis `50/50` ciblés et `228/228` en régression complète ; typecheck, build, docs, cartographie, preuve current-state, secrets et diff réussis.
- Compatibilité : changement additif sans nouveau store ou moteur ; WRITE gate maintenu en `shadow`, OIDC/Autodeploy/2FA/`ENABLE_WRITE_TOOLS`/`allow_write` inchangés.
- Rollback : revert du commit correctif unique ; aucun schéma historique n'est supprimé et les données de tâche existantes restent lisibles.

## 2026-08-28 — Corrections de revue de la Draft PR #52

- Les sessions encore actives ou expirées mais reprenables constituent désormais l'ensemble positif des propriétaires conservables ; une session terminale déjà supprimée rend donc sa tâche réclamable au prochain cycle.
- Un coordinateur mémoire partagé sérialise rétention, reprise, fermeture, expiration et les trois mutations de tâche afin de fermer la course inter-stores sans fusionner les stores.
- Le seed de tâche est initialisé avant l'exposition HTTP/MCP ; les outils `readOnlyHint` et le Current-State Inventory ne déclenchent plus d'écriture.
- Toutes les commandes Git de preuve désactivent les replacement refs et l'horodatage est résolu depuis le SHA capturé dans `evidenceHead`.
- L'audit de tâche reste best-effort conformément au contrat historique : la persistance métier n'échoue pas si le journal échoue, et aucun faux événement rétroactif n'est fabriqué.
- Validation post-review : ciblée `51/51`, complète `234/234`, typecheck, build, cartographie et diff verts ; head fonctionnel GitHub `0a67259195ad90d4e2e945201133de1047b6c553`.
- Rollback : revert du commit post-review ; le coordinateur est en mémoire, sans migration ni schéma persistant.

## 2026-08-22 — Mandatory Agent Bootstrap & Work Orchestration V1

- Catalogue runtime dérivé des registrations MCP : 111 outils, 2 resources, contrats triés et digestés ; `.mcp/function-cartography.json` est généré et vérifié en CI.
- Preuve current-state read-only dérivée du clone Git suivi : modules, imports, routes, Markdown, audits, historique, politiques, Task Registry et digests.
- Live State reçoit des sections additives `capabilities`, `governance`, `auditBaseline` et `inventory` ; `stateVersion` ignore les dates seules et suit les digests.
- Operational Memory reçoit une Task Registry versionnée, une queue atomique, l'ordre priorité/séquence, les dépendances, conflits, claims et transitions optimistes.
- L'acquittement de contexte crée un Bootstrap Receipt sanitizé ; Governed Context compose receipt, current state, queue et prochaine tâche.
- Six surfaces MCP additives exposent l'inventaire et la queue. Le dashboard, l'onboarding réel, le journal et le WRITE gate `shadow` sont enrichis.
- Compatibilité : 92 contrats historiques inchangés ; aucune modification d'OIDC, Autodeploy, 2FA, `ENABLE_WRITE_TOOLS`, `allow_write` ou enforcement bloquant.
- Rollback : revert des commits de la branche unique ; stores et champs nouveaux sont additifs et les sessions historiques sans receipt restent lisibles.

## 2026-08-12 — Redémarrage MCP réellement recréé et santé fail-closed

- `buildMcpRestartCommand()` impose désormais `docker compose up -d --build --force-recreate` afin qu'un bootstrap ne soit plus déclaré redémarré lorsque Compose conserve le conteneur existant.
- Le contrôle local `/health` devient bloquant avec timeout ; l'ancien `|| true` qui masquait un runtime indisponible est supprimé.
- Test de non-régression ajouté au contrat de déploiement runtime.
- Preuves locales : test RED observé sur l'ancienne commande, puis 118/118 tests, typecheck, build, `docs:check`, scan de secrets et `git diff --check` réussis.
- Rollback : rétablir la commande précédente dans `src/tools/mcpRuntimeDeploy.ts` et son test associé ; aucun schéma, secret, remote ou volume n'est modifié.

## 2026-07-09 - Bootstrap documentaire MCP
- Creation progressive des fichiers Markdown racine manquants.
- Conservation des fichiers deja presents sans ecrasement.
- Serveur confirme : /opt/apps/wealthtech-mcp-ssh-bridge.
- Depot attendu : Patricked-code/MCP.
- Branche : main.
- Limite : documentation seulement, aucun secret, aucune suppression, aucun deploiement.

## Regle
Chaque changement visible doit indiquer date, fichier, raison, impact, tests et rollback si applicable.

---

## 2026-07-09 — Validation production MCP GitHub ↔ serveur

- Ajout et validation de la gouvernance GitHub ↔ serveur MCP.
- Commit de référence : `fbc7c97 docs: formalize MCP GitHub production governance and inventory`.
- Validation Docker Compose réussie.
- Validation endpoint local `/health` réussie.
- Validation endpoint public `/health` réussie.
- Validation endpoints OAuth `.well-known` réussie.
- Validation `/mcp` sans token : `401 Unauthorized`, comportement attendu.
- Aucun secret critique ajouté.
- Aucune suppression destructive effectuée.

---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.
Le serveur MCP est la source exécutée.
Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

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

- Durcissement du garde-fou read-only : la commande `cp` est détectée comme commande shell autonome, sans bloquer les chemins ou mots contenant `mcp`.
- Ajout d'un test dédié `test:readonly-safety`.
- Ajout d'une CI GitHub Actions minimale pour PR et branches `mcp/*`.
- Mise à jour documentaire public-safe de l'état courant : `main` et S1 sont alignés sur `f92f621`.
- Traçage de l'exception : `f92f621 fix(oauth): accept Claude and ChatGPT MCP resource aliases` contient aussi `durableAccounts` et semble être arrivé sur `main` sans PR visible. Ce chemin ne doit pas être répété.
- Aucune action production, aucun redémarrage, aucun déploiement, aucun nettoyage, aucun merge de PR #10.

## 2026-07-12 -- Phase 4 correction contrôlée de la PR #11

- VÉRIFIÉ : renforcement du garde-fou read-only contre `cp`, les séparateurs, substitutions, wrappers et shells `-c`, sans bloquer les commandes MCP légitimes inventoriées.
- VÉRIFIÉ : extension des tests à toutes les familles déclarées et aux commandes exactes de scan/recherche.
- VÉRIFIÉ : CI limitée en permissions, temporisée, sans credentials persistants et avec contrôle effectif base/head.
- VÉRIFIÉ : retrait de `MCP_MASTER_REFERENCE.md` pour éviter une nouvelle source documentaire concurrente.
- PARTIELLEMENT VÉRIFIÉ : S1 a restitué le préfixe `f92f621`, pas le SHA complet ; le working tree suivi était propre, mais les fichiers ignorés n'ont pas été audités exhaustivement.
- NON VÉRIFIÉ : identité du commit embarqué dans l'image Docker active.
- NON EXÉCUTÉ : aucune fusion, aucun déploiement, aucun redémarrage et aucune modification serveur.
- Prochaine action unique : nouvelle revue complète de la PR #11 et de sa CI.

## 2026-07-13 -- Outil de synchronisation GitHub vers S1

- PR #11 revue, approuvée et fusionnée dans `main` au commit `38c9990`.
- Ajout de l'outil contrôlé `mcp_sync_from_github_s1`.
- Synchronisation limitée à `Patricked-code/MCP:main`, dépôt propre et fast-forward uniquement.
- Ajout de tests de syntaxe et de garde-fous ; aucune commande destructive ou réécriture d'historique autorisée.
- Build et redémarrage volontairement séparés de la synchronisation Git.
- Aucun déploiement serveur exécuté dans cette branche.

## 2026-08-05 — Préservation du runtime MCP

- Snapshot forensique créé et hashé.
- Baseline `097dac9` testée avec succès.
- Runtime récupéré dans la branche `mcp/recover-runtime-drift-20260805`.
- Commit de récupération : `7c8d9f782ae3195197345257f38fbc400504a848`.
- Build récupéré identique au runtime actif.
- Branche publiée sans modification de main.
- Aucun déploiement ni redémarrage effectué.

## 2026-08-05 — Diagnostic d’autorisation GitHub PR reconstruit

- Ancienne PR #21 conservée comme historique, sans fusion.
- Nouvelle branche : `mcp/github-pr-auth-diagnostics-rebased-20260805` depuis `main@3f79184eb6a647b39596ff408baa50c4a0c23c01`.
- Ajout du module read-only `src/github/authorizationDiagnostics.ts` et de l’outil `github_pr_authorization_diagnostic`.
- Probes séparées : utilisateur authentifié, dépôt, liste des PR et PR ciblée.
- Durcissements : HTTPS obligatoire, allowlist d’hôte, timeout borné, classification correcte des `404` et aucune fuite du credential.
- Tests `tests/githubAuthorization.test.ts` intégrés à `test:readonly-safety`.
- Runbook ajouté sous `docs/runbooks/GITHUB_PR_AUTHORIZATION_DIAGNOSTIC.md`.
- Aucun changement de production, aucun déploiement et aucun redémarrage S1.

## 2026-08-05 — Fondations GitHub MCP terminées

- PR #18 fusionnée : documentation canonique et reprise non destructive.
- PR #25 fusionnée : diagnostic GitHub PR strictement read-only.
- PR #26 fusionnée : catalogues READ et WRITE disjoints et testés.
- PR #27 fusionnée : GitRegistry v2 dual et dry-run uniquement.
- `main` atteint `618f4020ac69801dd53f624e5cd188fc6d76cc24`.
- Ruleset `protect-main` actif ; issue #24 clôturée.
- Anciennes PR #21, #22 et #23 fermées sans fusion après reconstruction.
- CI des PR #25, #26 et #27 entièrement réussie.
- État final consigné dans `docs/audits/2026-08-05/MCP_FOUNDATIONS_FINAL_STATE.md`.
- `PRODUCTION_STATE.json`, `TASKS.md` et `TODO.md` actualisés.
- Aucun changement S1/S2, aucun build ou restart de production, aucun déploiement et aucune migration du registre actif.
- Prochaine action unique : attestation S1 read-only après reconnexion du connecteur `wealthtech_ssh_bridge`.

## 2026-08-09 — Durcissement de l'identité GitHub de déploiement S1

- Remplacement dans `mcp_sync_from_github_s1` de l'alias autorisé
  `github.com-mcp-patricked-rw` par `github.com-mcp-patricked-ro`.
- Refus de toute synchronisation si `remote.origin.pushurl` n'est pas exactement
  `disabled://mcp-s1-read-only`.
- Ajout d'un test comportemental exécutant le préflight Git dans des dépôts
  temporaires : ancien alias refusé, push actif refusé, configuration read-only
  acceptée jusqu'au fetch.
- Ajout d'une procédure de rotation et de rollback sans secret dans
  `docs/runbooks/S1_GITHUB_READ_ONLY_DEPLOY_IDENTITY.md`.
- Mise à jour de `SUIVI.md`, `TASKS.md`, `DECISIONS_LOG.md` et des politiques
  `.mcp`.
- Production non modifiée dans ce commit ; la rotation S1 reste une opération
  post-fusion contrôlée.

## 2026-08-09 — MCP Live State Engine V1 — branche de livraison

- Ajout d'un modèle d'état partagé GitHub/S1/runtime/documentation avec verdict déterministe, contradictions, prochaine action, fraîcheur et `stateVersion` sémantique.
- Ajout du store atomique `/app/data/mcp-live-state.json` en permissions `0600`.
- Ajout de collecteurs GitHub dynamique, Git S1 read-only, Docker borné et signaux documentaires ciblés.
- Ajout d'une réconciliation initiale puis toutes les 60 secondes avec protection contre les exécutions concurrentes et dégradation explicite en cas d'échec.
- Ajout des outils MCP read-only `mcp_get_live_state` et `mcp_reconcile_live_state`.
- Ajout de la provenance OCI : le build Docker reçoit le HEAD S1 et le publie dans `org.opencontainers.image.revision`.
- Réutilisation du déployeur MCP existant ; aucune seconde voie de déploiement n'est créée.
- TDD vérifié par cycles RED/GREEN GitHub Actions pour réconciliation, stockage, collecteurs, provenance, moteur et outils.
- Dernière validation fonctionnelle avant consolidation documentaire : typecheck, build, docs check, scan secrets, suite read-only et `git diff --check` tous réussis.
- Limitation connue : injection directe du résumé dans `get_project_context` différée parce que la mutation de `src/tools/readOnly.ts` a été bloquée par le filtre de sécurité du wrapper ; les deux outils Live State sont néanmoins enregistrés dans le chemin read-only global.
- Aucun déploiement S1/Docker n'est déclaré à ce stade : le connecteur S1 doit être réinvocable et le préflight doit être refait après merge.
- Rollback : précédent commit/image MCP connu bon, sans réécriture d'historique ; le state file runtime peut rester inutilisé.

## 2026-08-12 — Reprise post-fusion et cohérence de l'état de production

- PR #39 confirmée fusionnée au commit `989dcefd90b8820f27af70f2ce18dc4a7685f6e1`.
- CI post-fusion `MCP CI #295` réussie ; workflow de déploiement push correctement gated avec étape réelle `skipped` sous `pushEnabled=false`.
- Préflight S1 strictement read-only : `main@d3bcac0…`, arbre propre, diff vide, fetch read-only, push désactivé, conteneur healthy.
- Écart confirmé : GitHub contient les PR #38/#39, S1 reste au commit de la PR #37 ; révision OCI non attestée.
- Blocage confirmé : `mcp_sync_from_github_s1` existe dans le code S1 mais n'est pas callable depuis le catalogue ChatGPT courant.
- Ajout d'une validation sémantique de `PRODUCTION_STATE.json` à `docs:check`, avec tests RED/GREEN sur les contradictions GitHub/S1/runtime et les snapshots antérieurs à la PR #39.
- Aucun sync, build, restart, patch S1, `workflow_dispatch` ou activation automatique exécuté.

## 2026-08-13 — Bootstrap manuel attesté et activation gouvernée préparée

- Workflow manuel `31655087215` réussi au SHA exact `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- GitHub, S1, `origin/main`, OCI et runtime réattestés égaux ; Docker healthy ; health/OAuth/MCP validés ; rollback `not_needed`.
- Surface Markdown courante : 189 Git + 26 runtime-only = 215 ; photographie historique 209 conservée séparément.
- Correction P2 : polling readiness borné pour `restart_mcp_bridge_s1`, avec RED `31657464793` et GREEN `31657546033`.
- Artefact CI : suppression des sept candidats historiques codés en dur ; parité exacte source/artefact testée, RED `31657669105`, GREEN `31657781749`.
- PR #42 prépare `pushEnabled=true` ; la preuve automatique par push reste en attente de fusion et d’attestation.

## 2026-08-13 — Premier déploiement automatique exact-SHA attesté

- PR #42 fusionnée à tête verrouillée au commit `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` après CI finale `31658220076` entièrement verte.
- Le push sur `main` a déclenché la CI `31658327373` et le déploiement gouverné `31658327435`, tous deux réussis.
- Job GitHub `94317597740` : étapes `Resolve deployment gate` et `Deploy exact main SHA through MCP` exécutées et réussies.
- Job MCP `mcp-s1-31658327435-9be5095cbf72` : SHA exact attesté, health/OAuth/MCP vrais, rollback `not_needed`.
- S1 est resté sur `main`, propre, avec fetch read-only et push désactivé ; OCI/runtime sont alignés sur le merge.
- Le thread P2 de la PR #41 a été résolu après présence de la correction sur `main` et preuve du déploiement.
- Preuve restante avant clôture : fusion et attestation automatique de la seconde PR documentaire gouvernée.

## 2026-08-13 — Seconde preuve Autodeploy attestée et correctif documentaire TDD

- PR #43 fusionnée au SHA `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` ; CI push `31659053828` et deploy push `31659053836` réussis, job `94319801309`.
- Attestation fraîche : GitHub, S1, `origin/main`, OCI et runtime alignés ; S1 propre avec push désactivé ; conteneur running/healthy.
- Nouveau test de non-régression : un SHA GitHub documentaire explicite ancien doit produire `DOCUMENTATION_DRIFT` même si `documentation_requires_revalidation=false`.
- GREEN minimal : `parseDocumentationObservation` compare les SHA déclarés aux SHA observés sans modifier types, enums, `stateVersion`, outils, fallback ou store Live State.
- Fixture littéral des 92 noms/descriptions/schémas d'outils historiques pour interdire renommage, suppression ou changement incompatible.
- Production non modifiée par ce commit de branche ; rollback fonctionnel limité au changement local de comparaison SHA.

## 2026-08-13 — MCP Governed Session Continuity / Operational Memory V1 — candidate de review

- Ajout de `governedSessionId` durable, distinct du `MCP-Session-Id` éphémère, avec reprise par principal OAuth stable ou secret de reprise haché.
- Ajout de stores JSON atomiques stricts, permissions `0700/0600`, révisions optimistes, corruption fail-closed et journal JSONL rotatif à allowlist.
- Ajout des heartbeats, acquittements `stateVersion`, checkpoints, pause/close, expiration et locks gouvernés bornés.
- Ajout de onze outils MCP de session et de deux outils de contexte, plus instructions d'initialisation et resource `mcp://wealthtech/governed-context/current`.
- Ajout d'un collecteur GitHub borné cache/single-flight et d'une composition déterministe Live State/session/locks/PR/checks/reviews.
- Ajout d'un WRITE gate strictement `shadow` qui préserve le handler, le résultat ou l'erreur historique et ne modifie ni `ENABLE_WRITE_TOOLS` ni `allow_write`.
- Ajout d'une maintenance 60 secondes sans collecte GitHub/SSH/Live State et d'une section dashboard authentifiée, échappée et cache/store-only.
- Régression fraîche : 12 tests de gouvernance et 161 tests read-only réussis ; typecheck, build, docs, secrets et invariants réussis ; CI `31675193991` verte sur `38e3ced7…`.
- Aucun merge, déploiement S1, changement runtime, Autodeploy/OIDC ou 2FA n'est inclus ou déclaré.

## 2026-08-13 — Corrections TDD de la première revue de la PR #44

- Reprise de session : l’ancien transport partagé est révoqué après reprise réussie et le transport courant est délié à sa fermeture, sans fermer la governed session.
- WRITE gate : l’évaluation et la journalisation shadow sont détachées du chemin critique ; un observateur bloqué ne retarde plus le résultat ou l’erreur historique.
- Audit : sessions, transports, contexte, checkpoints, locks et réconciliation émettent désormais les événements machine allowlistés prévus.
- Cohérence locks : `session.lockIds` est réparé depuis le store de locks existant après une panne inter-fichiers, sans fusion de stores ni nouvelle autorité.
- GitHub : le détail du seul ruleset actif sélectionné est chargé avec un plafond de sept appels, conformément à l’API REST officielle.
- Feature-off, dashboard et maintenance : aucun store chargé lorsque désactivé, compteur global réel et cycles périodiques single-flight.
- Régression post-review : gouvernance `12/12`, read-only `172/172`, typecheck, build, docs, secret scan et invariants réussis sur le head fonctionnel `6365e13…`.
- PR #44 reste draft ; aucun merge, autodeploy, changement S1/runtime ou 2FA n’est déclaré.

## 2026-08-13 — Corrections TDD de la seconde revue de la PR #44

- La reprise sur le transport déjà lié ne modifie plus la table de bindings avant la réussite du store ; une panne d’écriture conserve store et autorisation antérieurs.
- Les revues GitHub conservent le dernier verdict décisif par reviewer ; `COMMENTED` est non décisif et `DISMISSED` lève explicitement le verdict antérieur.
- La fermeture d’un transport journalise un instantané immuable du binding retiré, sans course avec une reprise ultérieure.
- Le dashboard nomme explicitement son compteur global ; les champs libres du journal sont opaques et les autres valeurs couvrent aussi PAT/JWT/PEM/URI.
- Régression intégrale précédente : `187/187`; tests ciblés, typecheck et secrets verts au head fonctionnel `de8a6df…` avant consolidation documentaire.
- Ultime confirmation différentielle : aucun finding critique ou important, range fonctionnel déclaré mergeable.
- Head consolidé `4eee32b…` : régression locale `187/187` et CI exacte `31681641604` réussies ; PR #44 maintenue draft dans l’attente d’une autorisation humaine.
- PR #44 reste draft ; `main`, S1/runtime, Autodeploy V1, OIDC, `ENABLE_WRITE_TOOLS`, `allow_write` et l’exclusion 2FA restent inchangés.

## 2026-08-15 — Durcissement post-PR #44

- Ajout d'une rétention déterministe des sessions terminales réconciliées avant la borne de 1 000 et d'un échec explicite lorsque la capacité n'est pas supprimable.
- Ajout d'une rétention déterministe des locks inactifs avant la borne de 2 000, sans suppression de lock actif ni masquage de conflit.
- Ajout de la libération des locks actifs avant la fermeture de leur session ; la projection `session.lockIds` est vidée à la fermeture et reste réparable après panne partielle.
- Les sessions terminales portant encore des `lockIds` sont conservées jusqu'à réconciliation.
- Le détecteur documentaire accepte un SHA déclaré ancêtre uniquement lorsque `git diff --name-only` prouve un descendant strictement documentaire ; un changement de code reste en `DOCUMENTATION_DRIFT`.
- TDD : RED `592b8506…` / GREEN `12e52030…`, puis RED `7308d19…` / GREEN `101d4c481caa42568f9c50302ddd891935e86917`.
- CI finale fonctionnelle : `31907348932` et `31907350301`, `12/12 + 184/184` tests, typecheck/build/docs/secrets/diff verts.
- Aucun changement d'Autodeploy, OIDC, outils historiques, `ENABLE_WRITE_TOOLS`, `allow_write`, WRITE gate `shadow` ou 2FA.

## 2026-08-15 — Operational Memory hardening déployé

- PR #45 fusionnée au SHA `bac8779320c8b9529d2a5215dbb1b1f31f828987` après TDD RED/GREEN et double CI exacte.
- Stores sessions et locks désormais bornés par rétention déterministe des seuls enregistrements supprimables, avec erreurs de capacité explicites.
- `closeSession` libère les locks avant fermeture et conserve la réparation inter-stores après panne partielle.
- Le contrôle documentaire accepte un ancêtre uniquement pour un descendant strictement documentaire ; les changements runtime restent en drift.
- CI main `31907827255`, Autodeploy `31907827212` et job `95068288136` réussis.
- S1, OCI/runtime et Docker réattestés ; trois threads tardifs PR #44 résolus.
- Documentation canonique réconciliée ; `TASK-20260813-004` terminée.
- Aucun élargissement d'autorité ni changement d'Autodeploy, OIDC, outils historiques, WRITE gate, 2FA ou écriture directe S1.

## Non publié — correction tardive PR #47

- Préservation des sessions expirées encore reprenables pendant `resumeGraceSeconds`.
- Rétention des locks actifs au TTL écoulé lorsque le store atteint sa capacité, avec événement d'expiration et nettoyage de la projection de session.
- Exception docs-only S1 limitée à la même référence déclarée que GitHub ; des déclarations divergentes restent bloquantes.
- TDD RED `e18f553d7f8423f301fd3f226a14fe835dac8a74` : 3 échecs ciblés sur 187 tests.
- GREEN `fc27e7e342b2ebfdbde4adc830b151a4018f2b4e` : CI `31908660001` et `31908662058`, `12/12 + 188/188`, zéro échec.
- État : PR #47 en validation, non fusionnée et non déployée à cette étape.

## 2026-08-22 — Correction tardive PR #47 déployée et clôture canonique

- Préserve les sessions `EXPIRED` encore reprenables pendant `resumeGraceSeconds`.
- Rend supprimables à capacité les locks `ACTIVE` au TTL écoulé, avec événement `lock.expired` et nettoyage des projections de session.
- Étend l'exception descendant docs-only au S1 déclaré seulement lorsque sa référence est identique à l'ancêtre GitHub déclaré.
- TDD PR #47 : RED `e18f553d7f8423f301fd3f226a14fe835dac8a74` (3/187 échecs ciblés), GREEN final `8dddc5656aa959f4c392d0f1816b5ee0e25709a0` (`12/12 + 188/188`, zéro échec).
- Merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, Autodeploy `32535404345`, job `96935241275`, S1/runtime exact-SHA healthy.
- Trois threads PR #45 résolus ; PR #48 strictement documentaire pour la réconciliation finale.

## 2026-08-22 — Candidate Mandatory Agent Bootstrap & Work Orchestration V1

- Dérivation automatique de la surface MCP, de l'architecture suivie, des routes, documents, audits et politiques au HEAD observé.
- Ajout du Current-State Inventory, des Bootstrap Receipts et de la Governed Task Queue avec ordre priorité/FIFO, dépendances, conflits et révisions optimistes.
- Composition dans Live State, Governed Context, dashboard, onboarding, journal et WRITE gate maintenu en `shadow`.
- Réconciliation de `.mcp/branch-governance.json` : les branches, PR et prochaines tâches dynamiques proviennent désormais de leurs autorités runtime et ne peuvent plus être figées dans la politique statique.
- Remplacement de la section incomplète d'`ARCHITECTURE.md` par la carte actuelle des autorités, composants, relations, stores, surfaces et chemin exact-SHA.
- La task registry conserve la tâche de livraison en `READY` jusqu'à CI, merge, déploiement attesté et réconciliation documentaire ; aucune clôture anticipée n'est déclarée.
- Régression précédente : `218/218`, typecheck, build, docs, cartographie et secrets verts ; une validation fraîche du head consolidé reste obligatoire avant publication.
- Fusion non destructive du cycle TDD concurrent déjà publié sur la même branche : garanties SDK et métadonnées catalogue conservées, extensions `operational-write` intégrées, cartographie régénérée et validation combinée `220/220` verte.
- Intégration du second lot concurrent Current-State/Live State : limites globales d'entrée/sortie, refus des chemins sensibles et symlinks, API de collecte déterministe et test CLI ajoutés à la carte relationnelle existante ; validation combinée `221/221` verte.

## 2026-08-22 — Mandatory Agent Bootstrap V1 déployé

- PR #49 fusionnée au SHA `c944fd9e7c05aad503f9e1d5d21e0ead25747886` depuis le head exact `1c9297d663624e5c348fba687051b649ca3e2a22` après CI `32565936838` réussie.
- Validation consolidée : `222/222`, typecheck, build, gouvernance documentaire `196`, cartographie runtime, preuve current-state, secrets et diff verts.
- Catalogue déployé : 111 outils, 2 resources, 66 lectures, 45 écritures ; 92 contrats historiques inchangés.
- Live State `stateVersion=33` atteste GitHub/S1/runtime exact-SHA, S1 propre et Docker healthy sur l'image `sha256:f6e05d77ed04c342e663c04322029f5233009ee4d75b78a9ebeea12af8027de5`.
- Receipt de bootstrap créé en production avec digests catalogue/gouvernance/task registry et limitations vides.
- Aucun enforcement bloquant, changement OIDC/Autodeploy, secret, 2FA, `ENABLE_WRITE_TOOLS` ou `allow_write` n'a été introduit.

## Non publié — stabilisation du bootstrap OAuth après PR #60

- PR #60 fusionnée et déployée au SHA `211a7de7940f115aa997f404927a8e0c9ace9055` avec auto-binding OAuth, ambiguïté fail-closed, credential partagé fail-closed, redaction transport et ordonnancement du bootstrap.
- Observation runtime post-déploiement : des transports MCP successifs faisaient évoluer la même Governed Session de `sessionRevision=66` à `67`, puis `68`, rendant toute mutation optimiste immédiatement obsolète.
- Cause racine : `resumeSession()` était appelé pour une session unique déjà non terminale à chaque initialisation de transport.
- PR #61 sur la même branche et la même task :
  - RED CI #626 : `RESUMED` au lieu de `ATTACHED`, un seul échec sur 257 ;
  - RED serveur CI #628 : attachement éphémère non distingué ;
  - GREEN `8a0e6fc0903bfdce04f2c476df50bee013fd1b9a`, CI #635 entièrement verte, `257/257`.
- Les sessions `OPEN/ACTIVE/PAUSED` reçoivent désormais un binding éphémère `ATTACHED` sans mutation durable ni hausse de révision.
- Les sessions `EXPIRED` conservent la vraie reprise `RESUMED` et son incrément durable.
- Ajout des reason codes/audits bornés `governed_session_auto_attached` et `bindingResult=attached`.
- Aucun changement de credential partagé, ambiguïté, OIDC, Governed Autodeploy, WRITE gate `shadow`, 2FA, secret ou écriture directe S1.
- État : candidat non encore fusionné ni déployé ; review exact-head et réconciliation docs-only post-déploiement encore requises.


## 2026-09-13 — AfricaFunds Phase 2 project mapping

- Ajout additif dans l'unique GitRegistry V1 de deux mappings AfricaFunds vers les checkouts S2 existants, tous deux en lecture seule et déploiement désactivé.
- Ajout du projet logique `CS-AFRICAFUNDS-001` / `chainsolutions.africafunds`, composé des repositories API et frontend.
- Le modèle `FUND_STATE` conserve séparément `API_SHA`, `FRONTEND_SHA`, `SUIVI_CHECKPOINT` et `PRODUCTION_ATTESTATION`.
- Les deux anciens vhosts sont classés `HISTORICAL_VHOST`, sans repository, non courants et non sources de déploiement.
- TDD : RED exact `5cedc7ac4b32d71ead8c8574c001669f3ff86f4e`/CI #831; GREEN exact `5b296e48b7140e0205a4921a8f9d3e8a35700477`/CI #833.
- Aucune activation V2, permission, capability WRITE, mutation S2 ou synchronisation AfricaFunds.


## 2026-09-13 — C1 GitRegistry V2 activation readiness

- Ajout d'un verdict pur `assessGitRegistryV2ActivationReadiness()` qui retourne `READY` ou `BLOCKED` par mapping avec des reason codes bornés.
- Fail-closed sur statut, realPath, remote, domaine requis, credential repository, migration, health checks et rollback.
- TDD : RED `af4ee0f7` / CI #854 avec deux échecs ciblés ; GREEN `db703454` / CI #855 entièrement verte.
- Le verdict ne mute ni registre, mapping, migration, credential, remote ni capability.
- Aucune activation GitRegistry V2, aucune permission WRITE, aucune migration MCP et aucune écriture directe de code versionné sur S1.
- Livraison : PR #83 fusionnée depuis `424508e244763fa00705b207daf834e7e2bdd1f0` au merge `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e`; CI PR #857, CI main #858 et Governed Deploy #37 réussis.
- Live State 217 atteste l'alignement technique exact-SHA et signale uniquement la projection documentaire à réconcilier avant la suite gouvernée.


## 2026-09-15 — G3 Client Tool Surface Attestation V1 livrée et déployée

- `TASK-20260914-002` livre l'attestation bornée de la surface d'outils client dans le modèle `CapabilityReality` existant, avec provenance `CLIENT_ATTESTATION`; aucun store, registre, cache, queue, autorité de persistance ou service parallèle n'est ajouté.
- Séquence TDD conservée dans `main` : RED `f87baa4e`, GREEN `ae7bec13`, RED P2 `b2955874`, GREEN P2 `289b3b71`. Le merge commit conserve les quatre commits, sans squash ni rebase.
- Correction P2 #1 : `GovernedSessionRecordSchema` rejette fail-closed une attestation dont le `governedSessionId` diffère de la session parente, et dont le `connectionContextId` non nul diffère du `connectionContextId` du `connectionContext` parent quand ce binding existe.
- Correction P2 #2 : `ClientToolSurfaceAttestationSchema` exige `expiresAt > observedAt` et une durée maximale de cinq minutes, en réutilisant les timestamps déjà validés par la frontière existante; aucune nouvelle autorité de temps n'est créée.
- Non-régression : `schemaVersion` reste `1`, `clientToolSurfaceAttestation` reste optionnel, les records historiques sans attestation restent valides, les objets restent stricts, absence/staleness restent `UNKNOWN` et `CLIENT_ATTESTATION` n'implique ni `AUTHORIZED` ni `safeNow`.
- Preuves : `validate` SUCCESS sur le head exact `289b3b71c8352738395bf290bc1ae10dc405ee15` (runs `34918037851`, `34918042001`), MCP CI #920 SUCCESS sur le merge; 13/13 tests G3, 4/4 régressions P2, 335/335 read-only safety, 12/12 governance, 0 échec, 0 skip.
- Livraison : PR #87 fusionnée depuis `289b3b71c8352738395bf290bc1ae10dc405ee15` au merge `dc4698de66b7becfc924ea4fabe8037e089d3336` sous l'autorisation humaine distincte `G3_EXACT_HEAD_MERGE_AUTHORIZATION_V2`; Governed Deploy #39 (run `34919927303`) a attesté l'exact-SHA avec runtimeRevision identique, rollback non requis et health/OAuth/MCP auth sains.
- Live State atteste GitHub/S1/origin-main/runtime au SHA exact du merge, S1 propre/read-only et runtime healthy. La preuve exact-SHA est projetée sur la tâche (`runtimeRevision` = `dc4698de66b7becfc924ea4fabe8037e089d3336`, `deploymentExactShaSuccess` = `true`, `runtimeAligned` = `true`) sans redéploiement; la tâche est observée `DEPLOYING` révision 10 et la seule contradiction restante avant la présente réconciliation est `DOCUMENTATION_DRIFT`.
- Aucun DONE n'est anticipé : le statut terminal, le checkpoint terminal, les locks et la fermeture de session restent exclusivement sous Operational Memory.


## 2026-09-17 — Flux pré-code GWC exécuté jusqu'au gate, réconciliation live `BLOCKED`

- Exécution du flux `GWC-PRE-000` → `GWC-PRE-GATE-01` documenté dans `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt`, sur la branche existante de PR #95. Aucune nouvelle branche, aucune nouvelle PR.
- Les 14 phases d'architecture `A1`…`A14` sont `PASS_WITH_EVIDENCE` avec références de preuve relisibles ; `GWC-PRE-GATE-01 = GWC_ARCHITECTURE_GATE_PASS`.
- `AF-34` ouvert **et corrigé sur ses deux faces**. L'instance : les six conditions de sortie non vérifiables sur le head exact (`A5-01`, `A7-01`, `A7-02`, `A8-03`, `A8-04`, `A11-01`) sont comblées — les 91 arêtes du graphe portent désormais `trigger` et `precondition`, les modèles `EvidenceRef` et `StepAttestation` sont typés, les classes de rejeu et `RecoveryAnchor` sont définies, et le scénario `E2E-22` couvre le dernier cas nommé non couvert. La cause : `scripts/gwc-precode-verify.mjs` ne contrôlait que les compteurs déclarés du gate ; il recoupe maintenant ces compteurs contre `.mcp/gwc-precode-status.json`, refuse un `PASS_WITH_EVIDENCE` sans preuve et refuse un verdict de gate qui contredit le décompte des phases.
- Phase B — réconciliation live de la Governed Task Queue — exécutée dès que le MCP WealthTech est devenu atteignable. Autorités réellement observées : Task Queue `storeRevision 188` (15 tâches, 11 `DONE`, 3 `SUPERSEDED`, 1 `DEPLOYING`), Live State `stateVersion 246` `FULLY_ALIGNED`, 25 sessions gouvernées, aucun lock détenu.
- Résultat de la classification : **aucune tâche GWC n'existe dans la file live** (0 des 18 blueprints) ; `TASK-20260915-001` est classée `CONFLICT` ; `GWC-0` à `GWC-17` sont classés `BLOCKED` car le protocole MCP impose que la première tâche exécutable précède les nouvelles.
- `AF-35` ouvert — la Task Queue déclare `DOCUMENTATION_DRIFT` bloquant à `46d576e5` alors que Live State `246` déclare `documentation: ALIGNED` et 0 contradiction à `d1f30395`, plus récent. Propriétaire `GWC-5`. Non corrigé : la tâche appartient à la session `ACTIVE` d'un autre agent.
- **`RUNTIME_TASKS_CREATED = 0`.** Aucune session ouverte, aucun Bootstrap Receipt demandé, aucun claim, aucun lock, aucune transition, aucun merge, aucun déploiement, aucune mutation serveur, aucun code runtime, aucun secret.
- Portée : documentation et données uniquement. Le runtime GWC reste gelé.


## 2026-09-18 — Réconciliation de la pile candidate (`GWC-PRE-C3`)

- Exécution de `GWC-PRE-C3` du flux pré-code : disposition bornée, capacité par capacité, des cinq pull requests candidates `#85`, `#86`, `#88`, `#89` et `#90`.
- Observation live : les cinq candidates sont inchangées depuis les 2026-09-14/15. `main@d1f30395` enregistre 111 outils dont 6 `github_*`, tous d'inventaire ou de diagnostic — aucune capacité de contrôle GitHub n'existe sur `main`.
- Les 7 contrats classés `CANDIDATE` se réduisent à 4 outils de `#90` : `github_create_branch`, `github_create_pull_request`, `github_mark_pr_ready`, `github_merge_pull_request`. `#88`, racine de la staleness de la pile, n'est requise par aucun des 73 contrats.
- 8 capacités disposées — 3 `SPLIT`, 1 `SUPERSEDE`, 4 `DEFER` ; aucun `KEEP`, aucun `CLOSE`. Partition des 18 outils de `#90` vérifiée exacte et exhaustive.
- Contrainte d'ordonnancement enregistrée : `GWC-9` précède l'atterrissage de tout `SPLIT` portant du `WRITE`, parce que `AF-32` reste ouvert et que `#90` ajoute douze outils `WRITE`.
- `GWC-PRE-C1` (`AF-19`) et `GWC-PRE-C2` (`AF-22`/`AF-30`) restent `PENDING` et sont déclarés tels : hors du périmètre autorisé pour cette session.
- Portée : documentation et données. `PRS_MUTATED = 0`, `RUNTIME_TASKS_CREATED = 0`, aucun merge, aucun déploiement, aucun code runtime, aucun secret.


## 2026-09-18 — Phase B réobservée : `CONFLICT` levé, classification `NEW_TASK`

- Réobservation en lecture seule des autorités runtime après réautorisation du bridge WealthTech, le 2026-09-18T17:08Z.
- `TASK-20260915-001` observée **`DONE`** avec blockers vides (`taskRevision 12`) ; session propriétaire `499b2ea3` **`CLOSED`** après acquittement du `stateVersion 246`. Le `CONFLICT` enregistré sous `AF-35` est **résolu à la source par l'agent propriétaire**, sans aucune action de cette session.
- Task Queue `storeRevision 190` : 15 tâches, 12 `DONE`, 3 `SUPERSEDED`, **aucune non terminale**. 25 sessions, **aucune `ACTIVE`**. Live State `stateVersion 246` `FULLY_ALIGNED`, 0 contradiction.
- Classification mise à jour : `TASK-20260915-001` → `RESOLVED` ; `GWC-0` à `GWC-17` → **`NEW_TASK`**, seule classification autorisant la création d'un `GovernedTaskRecord`.
- `AF-35` passe de « ouvert, bloque la matérialisation » à « résolu ». Les compteurs de findings et le verdict terminal sont mis à jour en conséquence.
- Portée : documentation et données. `RUNTIME_TASKS_CREATED = 0`, aucune session ouverte, aucun Bootstrap Receipt demandé, aucun claim, aucun lock, aucune transition, aucun merge, aucun déploiement, aucun secret. La matérialisation est admissible mais non exécutée : elle exige une governed session et une décision humaine explicite.


## 2026-09-18 — `AF-36` : le pointeur de mémoire canonique est désormais vérifié

- Réconciliation du commit pair `e22214d` sur la branche partagée, après `HEAD_MOVED`. Merge, aucune réécriture d'historique.
- **`AF-36` ouvert et corrigé** : `currentBundlePath` désignait un bundle absent de l'arbre, laissant la mémoire canonique irrésoluble — et la CI restait verte, aucun contrôle ne validant ce pointeur.
- Instance corrigée par le commit pair `3f635e9`, qui repointe vers le bundle le plus récent réellement présent. La même réparation avait été dérivée indépendamment ici ; celle du pair a atterri en premier et a été adoptée telle quelle. Son commit documente également la cause de l'orphelinat : la surface d'écriture GitHub autorisait la mise à jour de fichiers existants mais bloquait la création de nouveaux chemins de mémoire canonique.
- Cause corrigée : `verifyCanonicalMemory()` ajouté à `scripts/gwc-verify.mjs`. Il contrôle la résolution du pointeur, la correspondance du `bundle_id`, l'intégrité `sha256` et la taille de chaque source, `approval_eligible=false` sur chaque claim, et l'existence de chaque bundle précédent déclaré. Éprouvé par 5 défauts injectés, 5 rejets.
- Les blocs `currentPhase` et `continuationPolicy` du commit pair sont **conservés intacts** : cette session ne les arbitre pas et ne s'en autorise pas.
- Portée : documentation, données et vérificateur. Aucun code runtime, `RUNTIME_TASKS_CREATED = 0`, aucun merge, aucun déploiement, aucun secret.


## 2026-09-18 — Frontière restreinte à `PRECODE-only` par le pair, README réaligné

- Réconciliation des commits pairs `68cd082` → `6418833`, qui restreignent la frontière du programme : le runtime reste gelé pendant toute la finalisation PRECODE, même avec le gate d'architecture `PASS`. Sortie requise : `FINAL_PRECODE_VERSION_ACCEPTED`.
- Les phases B→F et `T196→T204` sont reclassées en plan d'intégration futur, non exécutable contre le projet réel. Les autorités runtime restent observables en lecture seule.
- Mes blocs `phaseB` et `phaseC` sont conservés et annotés par le pair (`executionRole`, `currentExecutionAuthority: false`) plutôt que supprimés : la provenance est préservée, le périmètre courant clarifié.
- Correction de deux lignes périmées du README, laissées par moi lors du push `AF-36` : le compteur de findings indiquait 35 alors que le registre machine en porte 36, et la ligne « bundle courant » désignait un bundle supersédé. `current.json` est ajouté au tableau de contenu, puisqu'il est désormais vérifié par `verifyCanonicalMemory()`.
- Portée : documentation. Aucun code runtime, `RUNTIME_TASKS_CREATED = 0`, aucun merge vers `main`, aucun déploiement.

## 2026-09-19 — NEW_INFORMATION_INTAKE #1 enregistré dans la mémoire canonique GWC

- Ajout d'un bundle canonique `pr95-new-information-intake-001` contenant uniquement des insights structurés issus de la conversation ; aucun transcript brut.
- L'intake propose le modèle `GWC ROOT → 8 Macro Contracts → Step Contracts → deterministic functions` et un template commun de conception par étape.
- La différence **72 étapes runtime / 73 Contract Design Sheets** est explicitement réconciliée sans modifier le registre : 72 membres runtime restent compatibles avec `GW-73` hors graphe runtime.
- Aucun blueprint, contrat, source runtime, Task Queue, lock, session runtime, main, S1 ou déploiement n'est modifié.
- `GWC-PRE-B-01` reste `READY`; aucun travail candidate n'est dispatché par cet intake.

## 2026-09-19 — NEW_INFORMATION_INTAKE #2 : instruction de consolidation GWC

- Enregistre la consigne de réconcilier #1 contre les matrices existantes au lieu de créer une matrice parallèle.
- La structure actuelle vérifiée reste cohérente : 73 contrats uniques / 72 runtime / GW-73 hors runtime / 91 arêtes / 18 blueprints / 18 evolution designs.
- La nouvelle couche GWC Root + 8 Macro Contracts doit être une projection additive avec `macroContractRef`, sans remplacer les familles A..I ni les autorités existantes.
- Le Master Construction Crosswalk est défini comme consolidation des bindings existants et alimentation de `GWC-PRE-B-01/B-02/B-03`.
- Aucun contrat, blueprint, graphe, Task Queue, lock, session runtime, main, S1 ou déploiement n'est modifié par cet intake.

## 2026-09-19 — Phase C1 : AF-19 exact-SHA CI gate

- Résolution existing-first de `OD-07` sur l'Integration Slot déjà présent dans `.github/workflows/mcp-deploy.yml`.
- Ajout de la permission minimale `actions: read` et d'une attente bornée de la CI `MCP CI` pour le `GITHUB_SHA` exact avant autodeploy sur `push`.
- Fail-closed : pas de CI exacte, CI non terminée au-delà de la fenêtre, CI échouée ou API indisponible => `enabled=false`.
- `workflow_run` reste absent/interdit ; politique OIDC exact-SHA inchangée ; `workflow_dispatch` conserve son comportement historique.
- TDD : RED CI #1110 @ `757ee2a`; GREEN CI #1112 @ `074f2bd2` entièrement réussi.
- Aucun merge `main`, S1, production ou runtime MCP n'est muté.


### 2026-09-19 — GWC Intake #004 minute-liveness closure

- Finalisation du delta `NEW_INFORMATION_INTAKE-004` après reconstitution des deux claims PRECODE actifs.
- Validation bornée : 6 tests minute-heartbeat PASS dans MCP CI #1252 au head `4f88e8453523bd62f04989bc7d76b1aa3ad3cf65`.
- Les 7 échecs du même run appartiennent exclusivement au RED concurrent `GWC-6`; aucun fichier `GWC-6` n'est modifié par la clôture Intake #004.
- Le claim heartbeat Intake #004 est libéré après constat `STALE` et autorisation humaine explicite ; la staleness seule ne transfère jamais l'ownership.
- Le claim `GWC-6` reste `ACTIVE`; heartbeat manquant => liveness `UNKNOWN`.
- Ajout du checkpoint canonique `pr95-intake-004-minute-liveness-complete`.

## 2026-09-19 — GWC-6 Server Resolver C3

- Ajout/fermeture candidate de `GW-07 SERVER_RESOLUTION` en lecture seule.
- Résolution OD-03 : canonicalisation contre un ensemble explicite et borné de serveurs gérés, conservation des IDs bruts, fail-closed sur alias inconnus, désambiguïsation par hint uniquement sur binding existant, environnement préservé, chemins exclus de l'identité.
- Suppression du faux couplage entre digests de ProjectResolution et digests de la preuve serveur ; ces preuves restent distinctes tant qu'aucun contrat n'impose leur égalité.
- Ordonnancement des alias bruts rendu déterministe et indépendant de la locale.
- GREEN complet MCP CI #1258 sur `087b0a23230c83b6cb1c9069947f48a5d8cc0357`.
- Aucun changement main/S1/production, aucun runtime Task/lock/session et aucune mutation SSH/GitRegistry.

## 2026-09-19 — GWC-7 Runtime Resolver C4 — final GREEN

- Ajout du resolver GW-08 RuntimeBinding borné et read-only.
- Prise en charge explicite de NO_RUNTIME, CHECKOUT_ONLY, DOCKER, DOCKER_COMPOSE, SYSTEMD, PROCESS_MANAGER et PASSENGER, y compris MULTI_RUNTIME.
- Missing/stale/unavailable reste fail-closed ; une déclaration de registry ne remplace jamais l'observation runtime.
- Recovery gouverné du writer stale avec autorisation humaine explicite ; aucun transfert automatique.
- RED CI #1270 ; GREEN CI #1273 ; self-review couverture runtime kinds ; FINAL GREEN CI #1274.

## 2026-09-19 — GWC-8 Domain Resolver C5

- Ajout du resolver `GW-09 DOMAIN_RESOLUTION` en lecture seule.
- Résolution de la surface publique avec rôles FRONTEND/API/OTHER depuis les autorités projet/mapping et l'observation serveur courante.
- `NONE` distingué strictement de `UNVERIFIED`; absence ou staleness d'observation ne devient jamais un faux `NONE`.
- Vhosts historiques exclus de la surface active et exposés comme exclusions ; `protectedDomains` conservé comme safety list uniquement.
- Conflits de domaine pour un même rôle => `AMBIGUOUS`; domaines observés non déclarés ou déclarés non observés => fail-closed.
- Compatibilité préservée pour les mappings GitRegistry V2 historiques sans `componentRole`, sans inventer de rôle concurrent.
- GREEN complet MCP CI #1286 sur `d6240484e387770751d9d3db476ac3b9470c74ce`.
- Aucun changement main/S1/production, aucun runtime Task/lock et aucune mutation SSH/vhost.

## 2026-09-19 — GWC-9 Governance inheritance and effective capabilities

- Ajout du composer read-only GW-10/GW-11 derrière les autorités existantes `CapabilityReality` et `GovernanceDecision`.
- Composition cible bornée, monotoniquement restrictive, sans nouvelle autorité ni persistance.
- UNKNOWN reste fail-closed ; mismatch d'opération ou de capability snapshot => `CONFLICT`.
- AF-32 fermé en shadow : les trois mutations gouvernées Task `operational-write` traversent désormais `decorateScopedWriteServer`.
- Aucun mode enforcing ajouté et aucun changement du résultat historique des handlers.
- Classification des outils inchangée (`operational-write`) ; cartographie/digest conservés et régression verte.
- RED CI #1298 ; GREEN initial #1300 ; self-review fixture-only #1301 ; GREEN final #1302 sur `ff85ab51ae59df044ad179abe0865374e41f2412`.
- Aucun changement main/S1/production et aucun second moteur de gouvernance/capability.

## 2026-09-19 — GWC-10 Multi-repository TargetScope

- Ajout de `TargetContext` et `TargetScope` derrière le modèle projet/composants existant de GitRegistry V2.
- Extension strictement additive de Session, Task, Lock et BootstrapReceipt avec un `TargetScope` optionnel ; aucun backfill des records historiques.
- Généralisation des identifiants repository aux cibles gouvernées sans invalider `Patricked-code/MCP`.
- Ownership Task borné au sous-ensemble exact de composants ; mêmes intents sur composants disjoints restent indépendants.
- Locks composants indépendants, sans élargissement automatique au projet.
- Live State transporte le même `TargetContext` optionnel et incrémente `stateVersion` sur changement sémantique de composant, pas sur simple changement d'`observedAt`.
- BootstrapReceipt multi-composant conserve les SHAs indépendants dans `targetContext` et laisse les champs SHA legacy à `null`.
- Interdiction confirmée de synthétiser un `PROJECT_SHA`.
- RED CI #1314 ; GREEN initial #1328 ; self-review #1329 ; GREEN final #1330 sur `67197cd12e13f450734b403c4b85e26dc9760c60`.
- Aucun changement main/S1/production, aucun second registre projet, store opérationnel ou Live State.

## 2026-09-19 — GWC-11 Authority documents, integration slot and exact baseline

- Généralisation additive de la déclaration de gouvernance documentaire en configuration project-scoped, avec defaults MCP historiquement identiques.
- Ajout du module read-only `src/governedWorkflow/authority/index.ts` pour GW-21, GW-22 et GW-23.
- GW-21 compose les digests/compteurs des autorités documentaires et cartographiques existantes ; drift, stale ou unavailable échouent fermés.
- GW-22 résout seulement des owners déjà présents dans les inventaires Current State et retourne `NONE` plutôt que d'inventer un slot.
- GW-22 bloque sur inventaire stale/unavailable.
- GW-23 lie la baseline au SHA exact de la branche observé pour l'étape courante ; replay pré-step, sous-preuves stale/unavailable et contradictions de head sont refusés.
- Aucun nouvel outil MCP, store, observateur GitHub, inventaire, cartographie ni autorité de permission.
- RED CI #1343 / #1344 ; premier GREEN #1345 ; self-review #1346 ; GREEN final #1348 sur `2a82e278319dd750db2a6d870fc029fe296a66a6`.
- Aucun changement main/S1/production.

## 2026-09-19 — GWC-16 Documentation / terminal closure

- Ajout de `src/governedWorkflow/terminal/index.ts` pour les contrats `GW-58..GW-72`, sans effet de bord direct.
- Les étapes documentaires réutilisent les outils GitHub existants avec leurs schémas exacts ; GW-60 utilise `github_create_commit` pour la réconciliation multi-fichiers.
- GW-68 introduit l'unique terminal verification predicate : Task/session/receipt/stateVersion/CI/deploy/review/locks/Live State/docs doivent converger vers le même head/runtime final avant qu'une preuve terminale soit émise.
- GW-69 refuse tout `DONE` sans preuve GW-68 liée au même task/session/receipt/state/head/runtime ; aucun paramètre non supporté n'est ajouté au payload historique `mcp_transition_governed_task`.
- L'ordre de fermeture reste checkpoint → release locks → close session → queue reconcile après terminal verification/DONE ; la libération des locks ne dépend pas du succès de la Task.
- TDD : RED #1433 ; premier GREEN #1435 ; self-review RED #1437 ; correction de fixture uniquement #1439 ; GREEN final #1440 sur `b8a86c48eb24902f998d4533e6bbeac5144102c6`, 589/589 tests.
- Aucun merge main, S1, production, déploiement ou mutation runtime n'a été effectué par ce PRECODE.

## 2026-09-19 — GWC-17 Universal Acceptance

- Ajout d'un harnais d'acceptance strictement test-only sous `tests/governedWorkflowUniversalAcceptance/` pour `GW-73 UNIVERSAL_ACCEPTANCE`, hors graphe runtime.
- Les scénarios prouvent la compatibilité historique MCP, un second projet réel Stablecoin/S2/Passenger, un projet multi-composants synthétique, l'isolation d'un composant non résolu et les invariants de reprise issus de NEW_INFORMATION_INTAKE-003.
- Le harnais réutilise les primitives existantes TargetContext/TargetScope, runtime/domain resolvers, Lock Service, candidate continuity/recovery, Execution Engine et terminal GW-68 ; aucune API runtime d'acceptance n'est créée.
- Le scan anti-hardcode couvre les chemins gouvernés et dispose d'un contrôle négatif injecté ; aucune branche cible MCP/Stablecoin/S1/S2 n'est tolérée dans le workflow gouverné.
- Les rapports sont fail-closed : aucun scénario SKIPPED ; un scénario en échec produit `FAILED`, un reason code borné et l'ensemble exact des contrats concernés.
- TDD : RED #1451 ; premier GREEN #1454 ; self-review RED #1456 ; GREEN final #1458 sur `9b32bba86e830845ea63d90f37bf304d800b8f12`, 598/598 tests.
- Aucun fichier `src/`, runtime authority, main, S1, production ou déploiement n'est modifié par GWC-17.


## 2026-09-20 — Phase F-06 : paquet d’intégration de la candidate GWC

- Enrichissement de `MIGRATION.md` avec le paquet PR #95 : résolution de `CANDIDATE_HEAD`, `MAIN_BEFORE`, `MERGE_SHA`, `DEPLOY_SHA` et `RUNTIME_SHA`.
- Delta autorisé défini comme le compare GitHub complet après réconciliation, sans cherry-pick partiel ni copie serveur.
- Ajout d’une matrice de drift, de INTEGRATE-01..07, du rollback par phase, des attestations live minimales et du DoD post-intégration.
- `DEPLOYMENT_PRODUCTION.md` distingue explicitement HEAD candidat, SHA de fusion et SHA de déploiement tout en conservant la chaîne exact-SHA existante.
- Aucun nouveau workflow runtime, store, autorité, outil MCP, déploiement, merge `main` ou mutation S1/production.
- Précision F-06 : séparation explicite de `PACKAGE_HEAD_F06` et du `CANDIDATE_HEAD` final afin que le checkpoint terminal soit certifié par CI/réobservation sans auto-référence de SHA.


## 2026-09-20 — PR #95 : correctifs de review P1/P2 avant intégration

- Corrige le worker de déploiement S1 généré afin que `write_attestation()` soit syntaxiquement fermé ; ajout d’un test `bash -n` sur le script généré.
- Corrige `githubLifecycle` pour préserver le mode Git d’un blob existant lors d’un remplacement : `100644`, `100755` et `120000`.
- Un nouveau fichier régulier reste créé en `100644`.
- Un base tree récursif signalé `truncated` est refusé avec `GITHUB_BASE_TREE_TRUNCATED`; un chemin existant non remplaçable comme blob est refusé.
- Preuve TDD : CI #1497 RED avec exactement 3 échecs attendus, puis CI #1499 GREEN avec 604/604 tests.
- Aucun merge de `main`, déploiement ou changement direct sur S1 n’est inclus dans ces correctifs.

## 2026-09-20 — PR #95 : intégration, réattestation standard et réconciliation documentaire

- PR #95 fusionnée sur `main` avec merge SHA exact `9da845822e122cc67fc86ad90243d4e7d6a6d4f4`.
- MCP CI post-merge #1503 / run `35515690847` : SUCCESS.
- Le premier Governed Deploy #44 a exposé un mismatch de bootstrap entre l’ancien runtime et le nouveau payload `push_ci_gate`; aucune mutation S1 n’avait commencé à cet échec.
- Bootstrap one-shot documenté exécuté : fast-forward S1 exact-SHA, typecheck, build, restart, puis GitHub/S1/runtime alignés.
- Governed Deploy #44 relancé en failed-jobs-only après activation du nouveau runtime : attempt 2 / job `106106391469` SUCCESS, étape `Deploy exact main SHA through MCP` SUCCESS.
- Live State 257 confirme GitHub↔S1 et runtime ALIGNED ; seule contradiction restante avant cette PR : `DOCUMENTATION_DRIFT`.
- Réconciliation `GW-59→GW-65` strictement docs-only : mise en tête de l’état courant dans `SUIVI.md`, mise à jour des champs courants de `PRODUCTION_STATE.json`, conservation intégrale des preuves historiques.
- Aucun changement de code runtime, workflow, script, test ou politique dans cette branche documentaire.

## 2026-09-20 — GWC : handoff canonique post-intégration

- Ajoute le bundle canonique `post-integration-terminal-handoff-20260920` avec source SHA-256/bytes vérifiable.
- Repoint `docs/gwc/canonical-memory/current.json` de la candidate PR #95 vers l’état opérationnel post-intégration sur `main`.
- Préserve `pr95-e-gwc17-universal-acceptance-complete` comme bundle historique immuable dans `previousBundles`.
- Remplace le protocole de reprise courant PRECODE par : réobserver Live State/Work Queue, reprendre une tâche compatible ou réconcilier une intention explicite.
- Aucun fichier runtime, workflow, politique, test ou serveur n’est modifié.

## 2026-09-20 — GWC : réconciliation terminale du handoff canonique

- Ajoute une projection Markdown terminale déclarant `21e56dc2ff4f9944b7a8a0c5e376e24c45ddbf15` comme baseline GitHub/S1/runtime attesté après PR #97.
- Enregistre MCP CI #1519 et Governed Deploy #46 comme preuves exact-SHA du handoff canonique fusionné.
- Corrige le dernier `DOCUMENTATION_DRIFT` sans toucher au bundle JSON : le futur merge reste un descendant strictement Markdown et utilise la règle docs-only existante.
- Aucun code, workflow, script, test, politique ou fichier JSON canonique n'est modifié.


## 2026-09-20 — GitHub-first Operational Continuity V1 candidate

- Ajout d'un resolver post-intégration qui fait de GitHub le bootstrap par défaut et n'escalade vers le runtime que pour l'opération bornée qui l'exige.
- Ajout de `.mcp/github-first-operational-policy.json`.
- Ajout du workflow `MCP Read-only Evidence`, déclenchable via une issue GitHub structurée et un GitHub Environment protégé.
- V1 strictement read-only : aucun pull, merge, reset, deploy, restart, scp, rsync, shell arbitraire ou push serveur→GitHub.
- Le Governed Deploy historique n'est pas modifié.

- Le transport primaire de preuve read-only devient GitHub OIDC → `/evidence/github/readonly` → `runReadOnlyCommand`; aucune authentification MCP interactive ni clé SSH GitHub n'est requise dans le chemin normal.
- Le SSH direct via GitHub Environment devient un fallback secondaire uniquement après échec OIDC.

## 2026-09-21 — Stablecoin GitHub-first bounded fast-forward

- Ajoute un workflow GitHub dédié `.github/workflows/stablecoin-fast-forward.yml` et une audience OIDC WRITE distincte du canal read-only.
- Ajoute l'endpoint borné `/deploy/github/stablecoin/s2/fast-forward`.
- L'opération exige les SHA serveur/cible exacts, une branche `main`, un worktree propre, l'origin canonique et une ancestry strictement fast-forward.
- Le diff est contrôlé par allowlist ; tout fichier applicatif bloque avant merge.
- Aucun build, install, restart Passenger/PM2/Docker/systemd, stash, rebase ou reset n'est permis dans ce chemin.
- Les sorties serveur brutes ne sont pas renvoyées ; seules des attestations bornées et reason codes allowlistés sortent de l'endpoint/workflow.
- TDD : RED CI #1594 / run `35568803574`, puis GREEN CI #1599 / run `35569214954`.
- Aucun fast-forward S2 n'est exécuté par le changement de code lui-même ; l'activation reste post-merge/post-deploy exact-SHA.

## 2026-09-21 — GitHub-first : préservation explicite de la surface client

- Renforce la policy `github-first-operational-continuity-v1` avec une règle explicite de préservation de la surface `@GitHub`.
- Interdit de demander `wealthtech_ssh_bridge` pour un simple schéma client stale ou un tool runtime non exposé lorsqu'un fallback GitHub approuvé existe.
- Formalise l'ordre `GITHUB_ONLY → GitHub Actions/OIDC fallback → RUNTIME_REQUIRED`.
- Ajoute l'invariant anti « surface thrashing » GitHub↔bridge.
- Documentation/gouvernance uniquement ; aucun code runtime, workflow de déploiement ou serveur n'est modifié.
