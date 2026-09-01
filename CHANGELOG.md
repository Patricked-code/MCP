# CHANGELOG.md

## Role
Historique factuel des changements du depot MCP.

## 2026-09-01 — Governed Connection Context minimal

- `TASK-20260901-001` part de `main@184107d5705248427d322922077d18f51e133c15` sur `mcp/project-context-resolution-20260901`, Draft PR #67.
- Ajout d'un `ConnectionContext` strict, versionné, optionnel et sanitizé dans le `GovernedSessionRecord` existant; aucun store, manager, registry ou outil parallèle.
- Les nouvelles sessions OAuth persistent un identifiant logique stable, le principal et le `clientId` déjà assainis; les credentials partagés persistent explicitement `null`; les sessions historiques sans champ restent lisibles et reprenables sans backfill.
- RED `7335e3fdb0812402d4ed3cd570e9909beb74c475` : module absent, 260/261 tests réussis. RED `28b3bf45c903f43f56bd8b90921a34236f707f03` : deux assertions de persistance ciblées échouent tandis que la compatibilité historique passe.
- GREEN `994b71de97beeb14b48cbd8ad501f9844b145764` : création OAuth/partagée validée. `6088a707c8a2e580cc0467adbae06873c73f4265` : stabilité attach/heartbeat/checkpoint/pause/resume et absence de migration implicite validées.
- Head fonctionnel `2f9d752e5c2c9c4eff98138b67a3bd96b6561656` : les surfaces existantes open/get/list/resume exposent le même contexte assaini sans token, transport brut, resume secret ou hash; CI complète réussie.
- Aucun changement d'authentification, serveur MCP, GitRegistry, Governed Context, Bootstrap Receipt, WRITE gate, Autodeploy, S1 ou runtime. Rollback : revert des commits du lot; les enregistrements historiques demeurent valides grâce au champ optionnel.

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
