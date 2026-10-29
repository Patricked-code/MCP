# 5–31 août 2026 — construction et première activation du Governed Deploy historique, puis mémoire opérationnelle

**Portée** : ce document retrace la **genèse du mécanisme de livraison du MCP lui-même**, puis les services d'autorité nécessaires au provisioning universel ultérieur. Il ne suppose pas que le MCP savait déjà déployer une application arbitraire.

Les dates indiquées sont les `created_at` des PR ou issues GitHub. Chaque état de CI/deploy tiré du corps d'une PR est **déclaré dans cette pièce primaire** et mérite un contrôle croisé de run/merge à SHA exact. Les pièces complètes sont accessibles par leurs URL.

## 2026-08-05T09:14:27Z — PR #31 — provenance OCI en lecture seule
https://github.com/Patricked-code/MCP/pull/31

Introduit le candidat `mcp_runtime_image_attestation_s1`, ciblant le conteneur MCP avec inspect Docker allowlisté, sans exposer environnements, mounts ou logs. Le HEAD candidat `1fc26c979244a946d7a66d7dd0966a2801fed3e9` n'est pas une attestation d'exécution sur S1 à lui seul. La provenance Docker était un préalable à la garantie GitHub→runtime exact-SHA.

## 2026-08-05T09:19:33Z — issue #32 — récupération S1 isolée exigée
https://github.com/Patricked-code/MCP/issues/32

Mandat de snapshot forensique avant réalignement depuis main protégé `5c349ef7d20eba128a09bac3d4fcae779a48b3f7`. Le candidat doit préserver les modifications locales et image Docker, être isolé du checkout en service, et ne pas déclencher de suppression/force checkout arbitraires. Issue OPEN lors de l'observation.

## 2026-08-05T09:31:29Z — PR #33 — snapshot et candidat isolés
https://github.com/Patricked-code/MCP/pull/33

Candidat `mcp_prepare_recovery_candidate_s1` : snapshot hors production, bundle Git, patch binaire, archive filtrée, manifeste SHA-256, clone séparé, SHA GitHub exact. Baseline `5c349ef7d20eba128a09bac3d4fcae779a48b3f7`, head `dbb89f3d65e1bb6ac81e39e9911f9a7241233e06`. **Une implémentation de préparation ne prouve pas qu'une bascule du runtime a eu lieu**.

## 2026-08-05T10:49:08Z — PR #34 — réconciliation des modules opérationnels
https://github.com/Patricked-code/MCP/pull/34

Réintègre sélectivement des outils issus de la dérive S1, via clone isolé et branche propre, notamment legacy vhosts, projets Nigeria/SADIAAF et accès BRVM read-only. L'alias caché de mutation `curl_domain` n'est pas réintroduit. Commit déclaré `b5fa3ed3224e0349b617667a634c6ad00174c80f`. Ces modules métiers ne doivent pas devenir une source implicite d'autorisation de provisioning.

## 2026-08-06T13:29:55Z — PR #35 — dépendances de production
https://github.com/Patricked-code/MCP/pull/35

Épinglage des dépendances et lockfile pour reproductibilité. Le scan déclaré signale une vulnérabilité moderate résiduelle, non présentée comme résolue.

## 2026-08-06T17:34:26Z — PR #36 — correction supplémentaire de la dépendance Hono
https://github.com/Patricked-code/MCP/pull/36

Poursuit #35 : propose l'override `@hono/node-server` 2.0.12 et une validation complète avant fusion. Cette PR est une correction candidate jusqu'à preuve des contrôles requis.

## 2026-08-09T10:00:59Z — PR #37 — l'identité Git S1 devient strictement read-only
https://github.com/Patricked-code/MCP/pull/37

Abandon de l'alias de fetch/push à droits d'écriture `github.com-mcp-patricked-rw`, exigence de fetch `github.com-mcp-patricked-ro` et de push interdit par `disabled://mcp-s1-read-only`. Décision : l'application déployée sur S1 ne doit pas pousser du code retour vers GitHub ; la livraison reste GitHub-first.

## 2026-08-09T13:04:08Z — PR #38 — Live State Engine V1
https://github.com/Patricked-code/MCP/pull/38

Base `d3bcac0cf17608963317a18aa2916a5997916394`. Crée une observation partagée de GitHub `main`, checkout S1, image OCI, état Docker et documentation. Version sémantique `stateVersion`, frais/stale, stockage atomique, période 60 secondes, dégradation explicite. Les outils `mcp_get_live_state` et `mcp_reconcile_live_state` fournissent l'observation, sans être une permission d'écriture.

**Contribution décisive** : l'attestation d'un déploiement ne peut être déduite du seul workflow GitHub ; elle exige la corrélation main/S1/runtime. Ce moteur sera réutilisé par les lots ultérieurs.

## 2026-08-09T14:40:39Z — PR #39 — PREMIÈRE CONSTRUCTION EXPLICITE DE L'AUTODEPLOY GOUVERNÉ EXACT-SHA
https://github.com/Patricked-code/MCP/pull/39

Titre primaire : `feat(deploy): add governed exact-SHA MCP autodeploy`.

**Baseline déclarée** : `main@cd80665837c1bbf692728d9fbb2c614bb1cb7734`, branche `mcp/governed-autodeploy-v1-20260809`.

**Travaux techniques annoncés** :
- gouvernance documentaire déterministe : inventaire des 189 Markdown suivis, cohérence des états `canonical-state`, refus d'inventaire silencieusement dérivé ;
- frontière GitHub Actions → MCP par GitHub OIDC, RS256/JWKS et validations bornées de l'issuer, audience, repo, repo ID, owner, ref, workflow, événement et SHA complet exact ;
- orchestration S1 exact-SHA, rollback et health fail-closed ;
- routes OIDC-only et permissions GitHub Actions minimales.

**Portée historique** : la PR #39 constitue un ancêtre technique central de **Governed Deploy du MCP lui-même**, bien avant le provisioning PB-F et l'issue #349. Le corps de #39 stipule explicitement qu'aucun déploiement S1/Docker n'est réalisé par la PR seule.

## 2026-08-12T10:37:24Z — PR #40 — blocage du bootstrap après fusion de #39
https://github.com/Patricked-code/MCP/pull/40

Source observée à cette date : GitHub main `989dcefd...`, S1 `d3bcac0...`, conteneur healthy mais OCI non vérifié, outil `mcp_sync_from_github_s1` présent dans le code mais non callable dans le catalogue. La gouvernance refuse `FULLY_ALIGNED` pour des SHAs divergents. **Le merge de #39 n'est donc pas une preuve d'activation effective à cette étape**.

## 2026-08-12T15:37:54Z — PR #41 — correction du faux redémarrage
https://github.com/Patricked-code/MCP/pull/41

Défaut identifié : `docker compose up -d --build` pouvait conserver l'ancien conteneur et signaler succès ; le `/health` était absorbé par `|| true`. Correction : `--force-recreate`, health fail-closed/timeout, tests 118/118 annoncés. La PR elle-même ne prétend pas à l'alignement GitHub/S1/OCI.

## 2026-08-13T01:21:49Z — PR #42 — bootstrap manuel réussi, activation automatique préparée
https://github.com/Patricked-code/MCP/pull/42

**Preuve de bootstrap manuel déclarée** : GitHub Actions run `31655087215` avec déploiement exact-SHA `8fb075dd55a3b94ed620527f11b2a77f88627188`. À cette observation, GitHub/S1/origin/OCI/runtime étaient décrits alignés et Live State `FULLY_ALIGNED`.

**Durcissement** : polling readiness borné en remplacement de `sleep 5`, parité du contenu des artefacts CI, `.mcp/autodeploy-policy.json` avec `pushEnabled=true`.
**TDD** : RED P2 run `31657464793`, GREEN `31657546033`, RED artefact `31657669105`, GREEN `31657781749`, HEAD candidat `077485b457f01943bda88209a07076ba40461df3` CI `31658220076` SUCCESS déclarée.
**Limite** : bootstrap manuel réussi ≠ première exécution automatique push réussie, laquelle doit encore être mesurée après fusion.

## 2026-08-13T01:48:53Z — PR #43 — PREMIÈRE ATTESTATION DE DÉPLOIEMENT AUTOMATIQUE DU MCP
https://github.com/Patricked-code/MCP/pull/43

Cette PR consigne une chaîne historique **à conserver séparée de la configuration de #42** :
- bootstrap manuel antérieur : run `31655087215`, job GitHub `94307689798` ;
- PR #42 CI finale `31658220076`, merge exact-head `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` ;
- première CI déclenchée par push sur main : `31658327373` ;
- **premier Governed Deploy automatique push** : run `31658327435`, job `94317597740` ; job MCP `mcp-s1-31658327435-9be5095cbf72` ;
- étape `Deploy exact main SHA through MCP` annoncée réussie, GitHub main/S1/origin/OCI/runtime alignés sur le même commit, Docker healthy, rollback non nécessaire.

**Décision historique** : PR #43 ne prétend pas que le **deuxième** push automatique était déjà attesté. Ne pas remplacer cette première preuve par les runs ultérieurs de fin août/octobre.

## 2026-08-13T06:54:19Z — PR #44 — Governed Session Continuity / Operational Memory V1
https://github.com/Patricked-code/MCP/pull/44

Base `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`, head `bba56ac802ac952bf8a6211dc982a6eced732f44`, CI `31681870406` SUCCESS déclarée. Ajoute sessions gouvernées durables, heartbeat, checkpoints, locks, audit JSONL, identity sanitize, contexte composé et dashboard. WRITE gate reste **`shadow`** et Live State/Autodeploy/OIDC sont conservés. Les sessions gouvernées ne sont pas de nouvelles sessions navigateur ou connexions GitHub.

## 2026-08-15T20:30:17Z — PR #45 — correction de rétention Operational Memory
https://github.com/Patricked-code/MCP/pull/45

Traite capacités de rétention 1000 sessions / 2000 locks, fermeture et libération durable, garde de sessions actives. RED `592b8506c14455e07852091282b918aa2b468730`, CI `31906835517` ; GREEN `12e52030b5a6ddb4f1120057086b0e5643c6579b`, CI `31906965949` / `31906967911`. Les corrections tardives ne doivent pas être effacées des traces.

## 2026-08-15T20:59:19Z — PR #46 — attestation post-déploiement de #45
https://github.com/Patricked-code/MCP/pull/46

Merge #45 `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI main `31907827255`, Autodeploy `31907827212` job `95068288136` et GitHub/S1/OCI/runtime exact-SHA healthy déclarés. PR documentaire sans code/runtime.

## 2026-08-15T21:06:39Z — PR #47 — corrections additionnelles après revue
https://github.com/Patricked-code/MCP/pull/47

Régression sur restauration session expirée, lock TTL et exception docs-only. RED `e18f553d7f8423f301fd3f226a14fe835dac8a74`, CI `31908513401` ; GREEN `fc27e7e342b2ebfdbde4adc830b151a4018f2b4e`, CI `31908660001` ; head consolidé `8dddc5656aa959f4c392d0f1816b5ee0e25709a0`, CI `31909255189`. Tests et documents cohérents mais pas de déploiement par le RED/GREEN lui-même.

## 2026-08-21T23:09:21Z — PR #48 — attestation post-déploiement de #47
https://github.com/Patricked-code/MCP/pull/48

Merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, Autodeploy `32535404345` job `96935241275`, alignement GitHub/S1/OCI/runtime et Docker healthy. Réconciliation stricte des documents sans changement code.

## 2026-08-22T09:48:34Z — PR #49 — Mandatory Agent Bootstrap & Work Orchestration V1
https://github.com/Patricked-code/MCP/pull/49

Ajoute une façade sur les autorités préexistantes : Bootstrap Receipt lié à session/Live State/digests, **Task Queue durable**, tâches et dépendances, ownership, locks, transitions, reconnaissance `CONTINUATION / NEW_TASK / DUPLICATE / CONFLICT / BLOCKED / OUT_OF_SCOPE`, Governed Context et contrôles de version optimistes ; WRITE reste en shadow. C'est un **précurseur majeur de la coordination multi-agents sans collision**, pas un nouveau moteur concurrent de provisioning.

## 2026-08-22T09:51:38Z — PR #50 — doublon exact de #49 conservé
https://github.com/Patricked-code/MCP/pull/50

Création concurrente alors que #49 vient d'avancer à main. Merge SHA #49 `c944fd9e7c05aad503f9e1d5d21e0ead25747886`, arbre de main et candidat #50 identiques `cc8c973c960f463e51e7b15cb54d7a0e400999ce`; fermeture sans deuxième merge. Exemple daté de traitement d'un doublon **avec preuve Git plutôt qu'effacement**.

## 2026-08-22T10:00:11Z — PR #51 — réconciliation du bootstrap déployé
https://github.com/Patricked-code/MCP/pull/51

Rappelle le merge `c944fd9e7c05aad503f9e1d5d21e0ead25747886`, Live State 33, GitHub/S1/OCI/runtime alignés, Docker healthy, 222/222 tests ; Task `TASK-20260822-001` restait `READY` tant que nouveaux outils n'étaient pas rechargés. Ne pas assimiler fusion, exposition côté client et complétion d'une tâche gouvernée.

## 2026-08-28T21:13:48Z — PR #52 — corrections du cycle de tâches gouvernées
https://github.com/Patricked-code/MCP/pull/52

Corrige races inter-stores (coordinateur FIFO partagé), attribution de tâches de sessions closes, lecture `currentTask` bornée au transport propriétaire, refus de muter depuis session CLOSED/EXPIRED et calcul des preuves à partir du HEAD d'évidence. **La Task Queue et ses locks constituent l'autorité d'ownership ; une PR documentaire ne la remplace pas**.

## 2026-08-28T22:07:29Z — PR #53 — premier support documentaire de #52
https://github.com/Patricked-code/MCP/pull/53

Déclare PR #52 fusionnée sur `fff44ff2db386942730a67f3884980c7824cae7f`, CI main `33214825660`, Governed Deploy #14 run `33214825772` job `98996005106`, Docker healthy, Live State 39 avec drift documentaire. Son ascendance est déclarée problématique plus tard : **ce support historique n'est pas la branche documentaire propre retenue**.

## 2026-08-28T22:51:42Z — PR #54 — reconstruction documentaire propre de #53
https://github.com/Patricked-code/MCP/pull/54

Part de `main@fff44ff2db386942730a67f3884980c7824cae7f` et évite explicitement l'ascendance polluée #53. Limite le diff à huit documents, sans changement code, policy, runtime ni write gate.

## 2026-08-29T05:51:16Z — PR #55 — Unified Operational Work State
https://github.com/Patricked-code/MCP/pull/55

Compose `CapabilityReality`, `TaskReality`, `GovernanceDecision`, observateur avant acteur, GitHub HEAD pré-PR et Governed Context existants. Un test RED ciblé sur `workBranchHead` fail `33237579706`, GREEN `c25ba8c775b5a2a81f84b424ffd01686e833ea0c` CI `33238637948` ; aucune nouvelle Task Queue, aucun nouveau Live State.

## 2026-08-29T14:10:46Z — PR #56 — réconciliation d'unification
https://github.com/Patricked-code/MCP/pull/56

Déclare merge #55 `2c2dde2bffe62b2685bf2fad94530571762470c8`, CI main `33256566688`, Governed Deploy `33256566695`, runtime/S1 exact-SHA healthy, seule contradiction documentaire. WRITE gate `shadow`.

## 2026-08-29T14:22:21Z — PR #57 — support draft fermé, reprise sans écrasement
https://github.com/Patricked-code/MCP/pull/57

Même réconciliation que #56 : PR #55 exact HEAD `de0030b0df42a693d2e96c87f008c9ffd1c2ce04`, CI `33256403390` 250/250, fusion `2c2dde2bffe62b2685bf2fad94530571762470c8`, déploiement `33256566695`. Décrit une panne GitHub de transformation Draft→Ready (champ GraphQL `Repository.fullDatabaseId`) : fermeture support, reprise par une PR non-draft au même HEAD, sans modifier le code. #58 doit être contrôlée pour établir cette succession complète.

## 2026-08-29T14:55:28Z — PR #59 — bootstrap automatique à l'initialisation du transport OAuth
https://github.com/Patricked-code/MCP/pull/59

Lie le transport MCP existant à la session gouvernée compatible, avec `NONE` si aucune, `AMBIGUOUS` si plusieurs, et refus pour credential partagé non lié. Explique que le client ne fournit pas forcément un `conversationBindingId` durable : ne pas inventer une corrélation client ↔ conversation.

## 2026-08-31T18:48:30Z — PR #60 — continuation technique de #59
https://github.com/Patricked-code/MCP/pull/60

Fermeture du support #59 à cause de Draft→Ready ; reprise sur même branche/head, aucun nouveau service/Task Queue, WRITE gate shadow, CI HEAD conditionnelle. Cette décision est un ancêtre des politiques de bifurcation ultérieures.

## 2026-08-31T21:27:51Z — PR #61 — attachement sans écraser les révisions de session
https://github.com/Patricked-code/MCP/pull/61

Prouve un défaut : appels MCP successifs incrémentaient `sessionRevision=66→67→68`, invalidant le verrou optimiste. Corrige la distinction `ATTACHED` (sans mutation durable) pour session OAuth ouverte vs `RESUMED` (mutation contrôlée) pour session expirée pendant sa grâce. RED `c1d8bd8112e3df6aa05afc1c42618bd716b78f21` CI #626, autre RED `c1ff0aa5f61d61b4d42316dbb672a59b9b223f06` CI #628 ; GREEN `2e8fa683296f4f1bf53b9875104598696ba9c6e2` CI #644, 258/258 déclarés.

## 2026-08-31T21:41:46Z — PR #62 — continuation finale de #61, attestation ultérieure par #63
https://github.com/Patricked-code/MCP/pull/62

PR #61 fermée pour bug Draft→Ready du connecteur ; #62 réutilise le même HEAD et même branche. La PR #63 documente ensuite son merge `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`, PR CI #645 `33442649238`, main CI #646 `33442929136`, Governed Deploy #19 `33442929180` et alignement exact-SHA S1/runtime.

## Lacunes / distinction des niveaux de preuve

La PR #58 n'a pas pu être consultée dans ce passage (erreur de connexion GitHub). Les CI et attestations indiquées ci-dessus sont les événements **déclarés dans les corps des PR** ; vérifier individuellement leurs runs et résolutions avant certification. Chaque date de création, commit, merge et déploiement constitue un événement distinct. La chronologie commence avant #39, mais les **premières attestations explicites du mécanisme Governed Deploy historique** étudiées ici sont #42/#43 ; elles ne prouvent ni le premier commit absolu du repo, ni la première capacité de déployer des apps externes.


## Complément append-only : PR #58 retrouvée après une erreur de lecture transitoire

**2026-08-29T14:24:11Z — PR #58** https://github.com/Patricked-code/MCP/pull/58 — `docs(governance): reconcile PR 55 deployment state`.

Le premier essai d'interrogation avait échoué sur un problème de connexion ; un nouvel appel GitHub a fourni le corps exact. #58 reprend **la même branche et le même HEAD documentaire** que la PR draft #57 fermée sans fusion à cause du bug `Repository.fullDatabaseId` : `mcp/reconcile-unified-operational-work-state-20260829@62c95ec406b6653ef07337d04d4a79244a568732`, base `2c2dde2bffe62b2685bf2fad94530571762470c8`. CI documentaire `33257428471`, job `99113481222`, SUCCESS déclarée ; `protect-main` rapportait alors PR et `validate` obligatoires, résolution des fils et zéro approbation obligatoire. **La fermeture de #57 n'a donc pas effacé le travail ni créé une autre tâche** : la succession canonique est #55 → #57 (draft non fusionnée) → #58 (même HEAD). Ce complément remplace uniquement l'état « non consultable » de la première collecte, sans altérer la vérité de l'erreur transitoire à ce moment.
