# SUIVI.md

## 2026-09-19 — Intake Continuity / Coherence Gate / Knowledge Revisions

- Extension additive de `candidateContinuity.ts` ; aucune nouvelle Task Queue, Memory DB, session manager ou autorité.
- `registerCandidateIntake()` : séquence monotone et intake borné sans transcript brut.
- `evaluateCandidateIntakeGate()` : compréhension, pertinence, evidence, objectif, relation existante, architecture, autorités, non-régression, impact et existing-first.
- Verdicts : `ACCEPT / ACCEPT_WITH_ADAPTATION / COMPLEMENT / DUPLICATE / DEFER / HOLD_FOR_REVIEW / OUT_OF_SCOPE / REJECT`.
- `reconcileCandidateIntakeBatch()` : uniquement delta contigu, fail-closed sur gap, receipt digesté, revisions canonical/backlog avancées uniquement si effet accepté.
- `assessCandidateKnowledgeFreshness()` : garde `HEAD_SHA + canonicalRevision + backlogRevision`; `HEAD_MOVED` prioritaire ; drift connaissance localisé.
- Règle : `LOCAL_BLOCKER != GLOBAL_STOP`.
- Règle : `INTAKE != CANONICAL MEMORY != CANDIDATE WORK ITEM != RUNTIME TASK`.
- Les intakes déjà enregistrés #001/#002 restent immuables et pending sous le nouveau gate : `latest=2`, `reconciledThrough=0`, `canonicalRevision=1`, `backlogRevision=0`.
- TDD : RED CI #1080 au head `c63beb0ac413824a72647a661640ed599cc867a0`; GREEN CI #1081 au head `f288d3e93eae772dd4e51654a1e4512a822b3dd6`.
- Prochaine action programme : réconcilier #001/#002 par le gate avant de consommer leurs effets dans `GWC-PRE-B-01`.


## 2026-09-19 — Bootstrap PRECODE GitHub-first

- Correction de frontière : pour `claude/ecstatic-edison-v1dyt1`, la connexion candidate se fait par GitHub/branche versionnée, pas par le MCP runtime.
- Nouvelle entrée `bootstrapCandidateConnection()` dans `src/governedContext/candidateContinuity.ts`.
- Résolution/création de `candidateSessionId` branch-local à partir d'identifiants réellement observés ; aucun vrai ID ChatGPT/Claude n'est inventé.
- Ordre de rapprochement : provider conversation ref → GitHub connection ref → connection instance ref → nouvelle session candidate.
- Routage automatique des intentions : `NEW_INFORMATION_INTAKE`, `CONTINUE_PRECODE_WORK`, `NEW_INFORMATION_THEN_CONTINUE_PRECODE`; question à 3 choix seulement si ambigu.
- Les modes de continuation réutilisent le dispatcher dependency-safe/collision-safe existant.
- Non-régression : anciennes sessions sans `connectionInstanceRef` toujours lisibles, enrichies au prochain resume.
- TDD : RED #1061 `a992bc0...`; correction compatibilité #1062 `44e1928...`; GREEN #1063 `2264b3d...`.
- Aucun runtime MCP/Governed Session/Task Queue/lock/S1/prod activé.
- `GWC-PRE-B-01` reste le prochain work item programme.


## 2026-09-19 — Continuité automatique multi-agent + intake conversation PRECODE

- Branche : `claude/ecstatic-edison-v1dyt1`; aucune mutation `main`/S1/prod.
- Intégration existing-first dans `Governed Context` : `src/governedContext/candidateContinuity.ts`; aucune seconde Operational Memory, Task Queue, session ou lock authority.
- `dispatchCandidateWork()` : reprise du claim actif de la même candidate session, sinon sélection du prochain work item READY dont les dépendances sont DONE et les collision domains libres ; ordre priorité décroissante puis séquence croissante ; ambiguïté fail-closed.
- Claims PRECODE : projection branch-local `.mcp/gwc-precode-status.json > candidateCoordination.activeClaims`; relecture obligatoire du HEAD avant claim, `HEAD_MOVED` => redispatch.
- `reconcileConversationIntake()` : la nouvelle conversation est comprise par l'agent puis projetée en insights bornés ; classification `DUPLICATE / COMPLEMENT / DECISION / FINDING / TASK / CONTRADICTION / MEMORY`.
- Aucun transcript brut persisté par ce mécanisme. Les contradictions/supersessions restent en `HOLD_FOR_REVIEW`.
- Une information non conflictuelle peut enrichir la mémoire canonique, une décision, un finding, un work item existant ou proposer un nouveau work item candidate.
- TDD : RED CI #1046 au head `9f6e14df2939e5e4b062e2861dfd5af507d6b157`; GREEN CI #1048 SUCCESS au head `138d392942591f8ba0270757bc5df859fdd4b7cb`.
- Bundle canonique courant : `docs/gwc/canonical-memory/pr95-candidate-continuity-ready`.
- NEXT_ACTION : `GWC-PRE-B-01` reste READY ; dériver le backlog candidate complet en utilisant désormais ce protocole de continuité/intake.
 — Point de reprise courant

## GWC PR #95 — candidate évoluée complète sur branche Claude

- Interprétation canonique corrigée : PRECODE = **pré-intégration de la candidate évoluée**, pas documentation seulement.
- Branche de construction unique : `claude/ecstatic-edison-v1dyt1`.
- Architecture exhaustive A1→A14 : `PASS_WITH_EVIDENCE`; gate : `GWC_ARCHITECTURE_GATE_PASS`.
- Après ce gate, le code candidate est autorisé et attendu sur la branche : `src/**`, tests, workflows, scripts, types, wrappers, généralisations, extensions, migrations additives et corrections de findings.
- Séquence candidate active : `B backlog complet → C safety/foundations → D/E implémentation GWC-0..17 → F acceptance candidate`.
- Premier work item courant : `GWC-PRE-B-01`.
- Gouvernance candidate : work items PRECODE, sessions/checkpoints/handoffs GitHub ; **aucune** Governed Task runtime, aucun runtime lock/claim.
- `main`, S1, production et déploiement restent gelés jusqu'à `FINAL_PRECODE_VERSION_ACCEPTED`.
- Bundle canonique courant : `docs/gwc/canonical-memory/pr95-candidate-build-ready`.
- Sorties finales : `FINAL_PRECODE_VERSION_ACCEPTED` puis `EVOLVED_CANDIDATE_READY_FOR_INTEGRATION`.
- Après seulement : réobservation du projet réel, réconciliation du drift, puis intégration de la candidate déjà construite.
- NEXT_ACTION : exécuter `GWC-PRE-B-01` et synthétiser le backlog complet d'implémentation candidate depuis les 18 blueprints, 73 contrats, findings, décisions et code existant.

## PRECODE — preuves serveur sans OAuth/bridge

- Le PRECODE ne dépend pas de l'OAuth du serveur MCP ni de `wealthtech_ssh_bridge`.
- Sources prioritaires : audits versionnés `docs/audits/**` / `docs/history/**` / canonical-memory, puis GitHub live et artefacts CI exact-head.
- Les audits déjà disponibles incluent notamment attestations runtime read-only, recovery, catalogue runtime, état des foundations et snapshots `live-authorities.json`.
- Si une preuve serveur réellement fraîche manque, le design retenu est un **read-only evidence mirror** indépendant du MCP/OAuth : identité serveur dédiée/forced-command, commandes allowlistées, sortie JSON redacted + digest, publication GitHub Actions artifact.
- Ce miroir est **DESIGNED_NOT_IMPLEMENTED** pendant PRECODE. Il ne doit disposer d'aucune mutation, restart, deploy, Governed Session, task claim ou lock.
- Si la preuve n'existe pas ou est stale : `UNKNOWN` / `STALE`, jamais ouverture d'une session runtime par défaut.

## Point courant — GWC PR #95 : finalisation PRECODE stricte

- Branche unique : `claude/ecstatic-edison-v1dyt1`; aucune écriture `main`, S1 ou runtime dans cette phase.
- Programme canonique : `T00→T204` (205 tâches macro) décrit intégralement ; `T00→T195` constitue la construction/canonicalisation PRECODE courante, `T196→T204` reste un plan futur d'intégration.
- A1→A14 : `PASS_WITH_EVIDENCE`; architecture gate : `GWC_ARCHITECTURE_GATE_PASS`.
- Travail courant rouvert : `T195 / A14` — aligner mémoire canonique, SUIVI et décisions après dérive prématurée vers des sémantiques Task Queue/runtime.
- Mémoire courante : `docs/gwc/canonical-memory/current.json` recentrée sur `pr95-precode-gate`.
- Gouvernance multi-agent : `PROGRAM → PRECODE_PHASE → WORK_ITEM → SESSION → ACTION → EVIDENCE → CHECKPOINT → HANDOFF → NEXT_ACTION`; un seul writer par collision domain, head online relu avant chaque écriture.
- Interdictions actuelles : aucune Governed Task GWC, aucun runtime lock, aucun code runtime GWC, aucune mutation main/S1, aucun deploy.
- Sortie de cette phase : `FINAL_PRECODE_VERSION_ACCEPTED`.
- NEXT_ACTION : vérifier l'alignement complet des artefacts PRECODE sur le head exact, exécuter les vérificateurs/CI, puis seulement déclarer la version PRECODE finale acceptée.

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

Date : 2026-09-15

## Point courant — C2 Repository → Project Resolution fusionnée et déployée

- GitHub main, S1 HEAD, S1 origin/main et runtime OCI sont observés au SHA exact `46d576e53820eba0360647b6fd96d41dd4a2bbc6`; S1 est sur `main`, propre/read-only, fetch `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`, push `disabled://mcp-s1-read-only`, runtime running/healthy.
- PR #92 a été fusionnée depuis le head exact `8b71f14f9a4884d57699e093853f4ccfb84080ef` au merge `46d576e53820eba0360647b6fd96d41dd4a2bbc6`; le merge commit conserve comme parents `a533eeca5ca9e37fcad51ded161a2f1c8736c7fd` et `8b71f14f9a4884d57699e093853f4ccfb84080ef`.
- TDD conservé dans l'historique : RED initial `f71704db` / CI #933, GREEN `45adc859` / CI #935, RED compatibilité MCP `6fc9c74b` / CI #937, GREEN `d71ba167` / CI #939, puis head documentaire/whitespace final `8b71f14f` / CI #943.
- MCP CI main #944 et Governed Deploy #41 (run `34925946935`) sont `SUCCESS` sur le merge exact `46d576e53820eba0360647b6fd96d41dd4a2bbc6`. Le déploiement est la conséquence gouvernée du merge via `pushEnabled: true`; aucun deploy, sync ou restart manuel n'a été exécuté.
- C2 résout `repositoryId → mappingId → projectId` avec `RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`, en réutilisant B2 et l'unique GitRegistry existant. Le candidat GitRegistry V2 reste dry-run et aucune activation V2, permission, credential, serverPath ou capability de déploiement n'est ajoutée.
- La compatibilité historique `Patricked-code/MCP → mcp_bridge` est conservée même sans fiche `projects[]` dédiée : le `projectId` porté par le mapping suffit à C2 ; une fiche projet présente mais incohérente reste fail-closed `UNVERIFIED`.
- `activationReadiness` C1 reste séparée de l'identité C2 : un mapping peut être C2 `RESOLVED` tout en restant opérationnellement `BLOCKED`, avec ses reason codes visibles et sans autorisation implicite.
- Operational Memory observe `TASK-20260915-001` en `DEPLOYING` révision 10, `runtimeRevision=46d576e53820eba0360647b6fd96d41dd4a2bbc6`, GitHub/S1/runtime alignés et healthy. Le seul blocker restant avant cette réconciliation descendante est `DOCUMENTATION_DRIFT`.
- La présente branche `mcp/c2-terminal-documentation-20260915` est strictement documentaire. Elle ne pré-déclare ni `VERIFYING`, ni `DONE`, ni fermeture de session : ces états restent exclusivement sous Operational Memory après merge, autodeploy et nouvelle observation Live State.

## Historique — G3 Client Tool Surface Attestation V1 fusionnée et déployée

- GitHub main, S1 HEAD, S1 origin/main et runtime OCI sont observés au SHA exact `dc4698de66b7becfc924ea4fabe8037e089d3336`; S1 est sur `main`, propre/read-only, fetch `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`, push `disabled://mcp-s1-read-only`, runtime running/healthy.
- PR #87 a été fusionnée depuis le head exact revu `289b3b71c8352738395bf290bc1ae10dc405ee15` au merge `dc4698de66b7becfc924ea4fabe8037e089d3336`, sous l'autorisation humaine distincte et bornée `G3_EXACT_HEAD_MERGE_AUTHORIZATION_V2`. Le merge commit a pour parents `555a51d0` et `289b3b71`.
- Séquence TDD conservée dans `main` par merge commit : RED `f87baa4e`, GREEN `ae7bec13`, RED P2 `b2955874`, GREEN P2 `289b3b71`. Aucun squash ni rebase n'a été appliqué.
- Preuves exact-head : `validate` SUCCESS sur `289b3b71` (runs `34918037851` et `34918042001`), MCP CI #920 SUCCESS sur le merge; 13/13 tests G3, 4/4 régressions P2, 335/335 read-only safety, 12/12 governance, 0 échec, 0 skip, typecheck, build, docs/cartographie, secret scan et whitespace verts.
- Les deux findings P2 sont corrigés dans `src/operationalMemory/types.ts` : une attestation est rejetée fail-closed si son `governedSessionId` diffère de la session parente ou si, quand le contrat parent porte un `connectionContext`, son `connectionContextId` diffère; l'intervalle de validité exige `expiresAt > observedAt` et une durée maximale de cinq minutes. `schemaVersion` reste `1`, l'attestation reste optionnelle, les records historiques restent valides et `CLIENT_ATTESTATION` reste une provenance de callability qui n'implique ni `AUTHORIZED` ni `safeNow`.
- Governed Deploy #39 (run `34919927303`) a attesté l'exact-SHA `dc4698de66b7becfc924ea4fabe8037e089d3336` avec runtimeRevision identique, rollback non requis, health/OAuth/MCP auth sains. `pushEnabled: true` dans `.mcp/autodeploy-policy.json` est intentionnel : un merge autorisé déclenche l'autodeploy gouverné comme conséquence connue, jamais comme déploiement manuel.
- Checkpoints enregistrés sur Live State `228` avec Bootstrap Receipt `9a20b8cb-6191-49ad-935d-e5bc81a81bdf` : `d959f2c8-2e54-49d0-95c7-539b71216b0f` (`G3_REVIEW_PASS_PR_READY`), `df002af4-7427-4518-9b66-e55417576cfa` (`G3_MERGE_READY_PRECONDITIONS_REVALIDATED`) et `759d2395-f2fc-4d2a-b2bf-6c6ba440908e` (`G3_MERGED_EXACT_HEAD`).
- `TASK-20260914-002` reste sous Operational Memory au statut observé `DEPLOYING`, révision 10, Governed Session `c4f08e5c-aeba-4297-b711-5e6808227225`; statut, révision, locks et session doivent être relus dans les autorités runtime, jamais déduits de ce Markdown. Aucun DONE n'est anticipé par cette projection.
- La preuve de déploiement exact-SHA est désormais projetée sur la tâche : `runtimeRevision` vaut `dc4698de66b7becfc924ea4fabe8037e089d3336`, `deploymentExactShaSuccess` vaut `true` et `runtimeAligned` vaut `true`. Cette projection a été obtenue sans redéploiement, conformément à la règle selon laquelle la tâche doit enregistrer elle-même son `runtimeRevision` pour empêcher qu'un déploiement ultérieur sans rapport vérifie rétroactivement une tâche.
- Contradiction restante observée avant la présente réconciliation : `DOCUMENTATION_DRIFT` uniquement.
- La présente réconciliation descendante remplace uniquement la projection canonique C1 par le merge fonctionnel G3 attesté. Aucun code fonctionnel, registre, workflow, permission, secret ni remote n'est modifié.


## Historique — C1 GitRegistry V2 verification gate déployé

- GitHub main, S1 HEAD, S1 origin/main et runtime OCI ont été observés au SHA exact `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e`; S1 est sur `main`, propre/read-only, fetch `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`, push `disabled://mcp-s1-read-only`, runtime running/healthy.
- PR #83 `feat(registry): add fail-closed C1 activation readiness` a été fusionnée depuis le head exact `424508e244763fa00705b207daf834e7e2bdd1f0` au merge `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e`.
- Preuves : RED `af4ee0f7` / CI #854, GREEN `db703454` / CI #855, head documentaire `424508e2` / CI #856, CI PR #857, CI main #858 et Governed Deploy #37 (run `34779240457`) réussis.
- Deploy #37 a attesté l'exact-SHA `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e` avec runtimeRevision identique, rollback non requis, health/OAuth/MCP auth sains.
- `assessGitRegistryV2ActivationReadiness()` est déployé comme verdict pur et fail-closed `READY|BLOCKED`; il ne mute ni registre, mapping, migration, credential, remote ni capability.
- Live State `217` confirme l'alignement technique GitHub/S1/runtime mais retourne encore `RECONCILIATION_REQUIRED` avec l'unique contradiction `DOCUMENTATION_DRIFT`, car la baseline documentaire déclarait encore le merge fonctionnel AfricaFunds.
- La présente réconciliation descendante remplace uniquement cette projection canonique par le merge fonctionnel C1 attesté. Aucun code fonctionnel, registre, workflow, permission ou remote n'est modifié.
- `TASK-20260913-002` reste sous Operational Memory en phase de vérification; son statut, sa révision, ses locks et sa session doivent être relus dans les autorités runtime, jamais déduits de ce Markdown.
- Les gates d'activation V2 restent ouverts : credential Wealthtechinnovations non vérifié, preuves path/remote/domain incomplètes et migration MCP encore `migration_pending`. Aucune activation V2 n'est autorisée par cette livraison.

## Historique — AfricaFunds Phase 2 déployée, réconciliation terminale

- GitHub main, S1 HEAD, S1 origin/main et runtime OCI ont été attestés au SHA exact `1eac93f631fcf7843d7e768bba7a4125ed00bdbb` dans Live State `204`; S1 propre/read-only, push désactivé, runtime running/healthy.
- PR #80 fusionnée depuis le head exact `18355de8d4892685ee4f68b11d1542fb249e838a` au merge `1eac93f631fcf7843d7e768bba7a4125ed00bdbb`; CI PR #841, CI main #842 et Governed Deploy #34 (run `34750625897`) réussis.
- Image attestée : `sha256:f736b0573615fc12a73318093ff9049e15fbe164ad3b9f1004b33b684b89b998`.
- Checkpoint post-déploiement : `bbd274c2-d5e5-4bb6-83ec-8006616f08cb`. Seule contradiction : `DOCUMENTATION_DRIFT`; cette réconciliation descendante vise à la lever par le flux GitHub normal.
- Registre actif : projet `CS-AFRICAFUNDS-001`, deux composants S2 read-only/non déployables, quatre champs FUND_STATE indépendants, deux vhosts historiques non Git. Dry-run runtime : 1 projet, 5 repositories, 4 mappings, `written=false`; V2 reste non activé.
- #840 avait zéro job; #841 a fourni la preuve CI du head exact fusionné. Aucun RED/GREEN fonctionnel n'a été rejoué sans finding.
- Branche documentaire : `mcp/africafunds-terminal-documentation-20260913`, issue du merge attesté; seuls les six Markdown canoniques sont réconciliés.
- Le statut terminal, le checkpoint final, les locks et la fermeture de session restent exclusivement sous Operational Memory; les relire après le déploiement documentaire. Aucun DONE n'est anticipé par cette projection.
- Reprise : PR documentaire, CI exact-head, revue, fusion gardée, Governed Deploy et Live State `FULLY_ALIGNED`; ensuite clôture tâche/session/locks et relecture de la queue.
- Aucun code fonctionnel, workflow, permission ou checkout S2 modifié. Le transport SSH direct indépendant du MCP reste distinct.

## Historique — AfricaFunds Phase 1 déployée, réconciliation documentaire en cours

- GitHub `main`, S1 HEAD, S1 `origin/main` et runtime healthy sont observés au SHA exact `b747dfc7f67786a40c19c285dbcdb3a07b78d5c0`; S1 est propre/read-only et le runtime porte l'image `sha256:2fbcc62113380ce9384bb282f5fdd45d31b878bf961606ff3213b39a319a7429`.
- Tâche gouvernée courante : `TASK-20260910-001`, statut `DEPLOYING`, révision 11 au checkpoint `be2c734f-88d6-4ad6-808c-fa84b2db9ca6`; Governed Session `39ff2377-f4c2-4ca2-99ee-beff54a2f2d4`. Ces valeurs dynamiques doivent être relues avant mutation.
- Design utilisateur approuvé : checkpoint `6ad95c77-fb4b-4abd-bf3f-3a1db74eb142`. L'exécution reste strictement en deux phases : fondation de compatibilité, attestation complète, puis seulement mapping AfricaFunds.
- Phase 1 TDD : le RED ciblé obtenait 1 test historique vert et 5 échecs attendus parce que `projects` était éliminé/non validé. Le GREEN conserve l'absence historique, préserve les projets/corrélations optionnels et valide identifiants, références et vhosts historiques fail-closed.
- Livraison Phase 1 : PR #78 fusionnée sous garde du head exact `f7800966119601e336c480da6f2f98eafe6e6e70` au merge `b747dfc7f67786a40c19c285dbcdb3a07b78d5c0`; MCP CI #824, job `validate`, a réussi sur le head exact.
- Preuves : 363/363 tests complets, typecheck, build, secrets, 204 Markdown gouvernés, cartographie et diff-check verts. Live State `175` atteste GitHub/S1/origin-main/runtime exact-SHA, S1 propre/read-only et runtime healthy; le seul blocker est `DOCUMENTATION_DRIFT`.
- Autorité : l'unique GitRegistry V1 reste la persistance active; GitRegistry V2 reste un candidat dry-run. Aucun registre, store, cache, observateur, outil ou moteur parallèle n'est ajouté.
- Frontières : aucune donnée AfricaFunds active n'est encore écrite, aucune permission/capability n'est déduite, aucun WRITE gate n'est changé, aucun checkout/repository/vhost S2 n'est muté et le transport séparé GitHub Actions → SSH → S1 n'entre pas dans cette tâche.
- Réconciliation documentaire : branche `mcp/africafunds-phase1-documentation-20260912`, strictement limitée aux six projections canoniques.
- Prochaine action : publier/revoir/fusionner/déployer cette réconciliation exact-head, exiger `FULLY_ALIGNED`, checkpoint Phase 1, puis seulement rebaseliner et commencer les RED de Phase 2.

## Baseline précédente — B2 Repository Resolution livré et clôturé

- `TASK-20260909-001` est `DONE` révision 18. Sa PR fonctionnelle #75 a été fusionnée au SHA `f2c90902a627ee9209d805403e584f3123a0453a`; B2 y est attesté `RESOLVED/CURRENT` pour `github:Patricked-code/MCP` sans permission dérivée.
- Les PR documentaires #76 puis #77 ont réconcilié et finalisé la fermeture de session; `main`, S1 et runtime ont été attestés `FULLY_ALIGNED` sur `fa563c6e21d6fa07bf5b33a58626ceae1cdedc13` avant la reprise distincte d'AfricaFunds.
- Le design B2 reste le checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`; GitRegistry V2 est resté dry-run et aucun mapping aval ni permission n'a été absorbé par SLOT-07.

## Baseline précédente — B1 GitHub Identity Resolution

- Jalon fonctionnel attesté : GitHub `main`, S1 HEAD, S1 `origin/main` et runtime healthy sont alignés sur `208b8744810a23e48a4282450786805e7ff18845`; S1 est propre/read-only et l'image active est `sha256:4bdb9524dd1ace6d700c95b27dab1c12c19d55cbf6e95aa7e9d671fade437401`.
- État terminal acquis : `TASK-20260907-001` est `DONE` révision 19 ; la PR documentaire #74 porte `observedHeadSha` et `runtimeRevision` `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c`. La session, les locks et le checkpoint terminal restent sous Operational Memory.
- Décision utilisateur acquise : binding `oauth:wealthtech-mcp-admin` → utilisateur GitHub `Patricked-code` uniquement pour le contexte déjà prouvé `Patricked-code/MCP`, effet `IDENTITY_ONLY`, moindre privilège, non global/non exclusif/réversible et extensible multi-compte.
- Design et plan : `docs/superpowers/specs/2026-09-07-b1-github-identity-resolution-design.md` et `docs/superpowers/plans/2026-09-07-b1-github-identity-resolution.md`.
- TDD publié : RED pur `8c570f96a94a492846b5df618f6b7383ba36a510`, GREEN pur `bbec96d87c46b9bea398ef5594ba278bfd48142d`, RED intégration `476e0b26d1eeadac30afdee1ec73b5781516c320`, GREEN fonctionnel `7830fb5ad0fdc385332259439600df357ea8ed13`.
- Self-review : le RED exact `a9a0131ae3ce68f1b234448de242d314c8f202df` prouve qu'un compte configuré mais `accountVerified=false` pouvait encore être déclaré `RESOLVED`. La correction fail-closed retourne désormais `GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED` sans principal ni contexte sélectionné.
- Revue pré-merge : deux nouveaux P2 ont ramené la tâche gouvernée en `IN_PROGRESS`. Les RED ciblés prouvent qu'un profil public `/orgs/{owner}` ne suffit pas à établir une appartenance et qu'une projection ne doit jamais agréger les contextes d'un autre credential. La correction exige une appartenance active `/user/memberships/orgs/{owner}` et une corrélation opaque, éphémère, non persistée/non projetée, bornée au credential sélectionné.
- Preuves exact-head : RED `631b5070f201950d2cdcc73363df8004d4ab5fec`, GREEN `9b1a572ab0362aeefa5e13f425225e1f510704b7`, 43 tests B1 ciblés, 310 tests complets et MCP CI #777 verte ; les trois threads de la PR #73 sont résolus.
- Livraison : PR #73 fusionnée sous garde du head exact `9b1a572ab0362aeefa5e13f425225e1f510704b7` au merge `208b8744810a23e48a4282450786805e7ff18845`; MCP CI main #778 et MCP Governed Deploy #27 réussis.
- Preuve runtime Live State `96` : GitHub/S1/runtime exact-SHA et healthy ; B1 retourne `RESOLVED` pour le binding `oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp`, principal GitHub authentifié `Patricked-code` (`githubUserId=270385782`, type `user`), contexte sélectionné `Patricked-code`, freshness `CURRENT`, aucun reason code et aucune permission dérivée.
- Intégration : Identity Policy V2 additive, connexions/secret storage existants, preuve live `GET /user`, collecteur/cache Governed Context existants ; aucun `identity-registry.json`, registre, store, Session Manager, cache, observateur ou outil parallèle.
- Frontières : utilisateur GitHub distinct des organisations accessibles ; OAuth principal, Human Identity, Agent Role et repository context distincts ; aucune permission ou Effective Capability B1 ; GitRegistry V2 inchangé ; WRITE gate `shadow` ; aucune écriture directe S1.
- Clôture acquise : la réconciliation strictement Markdown a été fusionnée par PR #74, déployée selon GitHub → S1 et B1 a été transitionné à `DONE` avant B2.
- B2 a ensuite été approuvé et enregistré séparément sous `TASK-20260909-001`; C1+ restent seulement cartographiés.

Les statuts dynamiques, propriétaires, locks, checkpoints et SHA courants doivent toujours être relus dans GitHub, Live State, Operational Memory et la Governed Task Queue. Ce checkpoint documentaire ne remplace pas ces autorités.

## Baseline précédente — A2.1 livré et clôturé

- Clôture documentaire : merge `c87598ddab01131eb8d3b9bad35f9d0cbdc2a5d4` de la PR #70, fusionnée depuis le head exact `59de3687bf1b2439a24f092257236fb3f559feee`; MCP CI PR #745, CI main #746 et Governed Deploy #25 réussis.
- Baseline fonctionnelle A2.1 : PR #68 fusionnée depuis `81832e1b702a8dfe10cda5634d6092fb3a177142` au merge `024f6ad4c047614bdfaea0e317f371b789f60136`; MCP CI PR #713 (`272/272`), CI main #714/#715 et Governed Deploy #24 réussis.
- Live State `83` a attesté GitHub `main`, S1 HEAD, S1 `origin/main`, image OCI, runtime healthy et documentation `FULLY_ALIGNED` sur `c87598ddab01131eb8d3b9bad35f9d0cbdc2a5d4`; S1 est propre et son push reste désactivé.
- Operational Memory a transitionné `TASK-20260901-001` à `DONE` en révision 10, enregistré le checkpoint final, libéré le lock puis fermé la session.
- La queue observée à cette clôture avait six tâches toutes `DONE`, sans `currentTask` ni `firstExecutableTask`. A2.2 et B1+ étaient alors des candidats distincts non enregistrés.
- `TASK-20260901-002 — Final A2.1 documentation reconciliation` porte uniquement la présente projection descendante dans six Markdown canoniques. Son statut courant, sa branche, sa PR, ses locks et sa session doivent être relus dans les autorités runtime/GitHub.
- Aucun TypeScript, test, OAuth, GitRegistry, Bootstrap Receipt, WRITE gate, workflow, secret, S1 ou runtime n'est modifié par ce lot.

Ce checkpoint A2.1 documente une baseline fonctionnelle immuable; il ne remplace pas les autorités courantes B1.

## Historique pré-merge — TASK-20260901-001 — Connection Context minimal sur la Draft PR #67

- Baseline GitHub `main` : `184107d5705248427d322922077d18f51e133c15`.
- S1 HEAD et runtime observés avant le chantier : `184107d5705248427d322922077d18f51e133c15`.
- Governed Session : `73044653-61b5-4030-912c-1b6e07f2dd41`; branche `mcp/project-context-resolution-20260901`; Draft PR #67.
- Spécification approuvée : `docs/superpowers/specs/2026-09-01-governed-connection-context-minimal-design.md`.
- Plan TDD exécuté : `docs/superpowers/plans/2026-09-01-governed-connection-context-minimal.md`.
- Intégration additive : `ConnectionContext` OAuth strict, versionné et sanitizé dans le même `GovernedSessionRecord`; credential partagé à `null`; champ optionnel pour les sessions historiques.
- RED 1 : `7335e3fdb0812402d4ed3cd570e9909beb74c475`, échec unique `ERR_MODULE_NOT_FOUND` du contrat ajouté, avec 260 tests historiques réussis.
- RED 2 : `28b3bf45c903f43f56bd8b90921a34236f707f03`, deux échecs ciblés car `openSession` ne persistait encore ni objet OAuth ni `null` partagé; le test de lecture historique réussissait déjà.
- GREEN fonctionnel : `994b71de97beeb14b48cbd8ad501f9844b145764`; stabilité de continuité validée à `6088a707c8a2e580cc0467adbae06873c73f4265`; surfaces existantes validées à `2f9d752e5c2c9c4eff98138b67a3bd96b6561656`.
- Invariants confirmés : aucun backfill implicite, aucun nouveau store/manager/outil, aucun changement OAuth, GitRegistry, Bootstrap Receipt, WRITE gate, workflow de déploiement, S1 ou runtime.
- Roadmap réconciliée additivement : A2 est décomposé en A2.1 `Connection Context minimal` et A2.2 `Verified Client Evidence`; aucun statut `LIVRÉ` n'est anticipé avant merge, déploiement et attestation.
- État à ce checkpoint historique : l'implémentation n'était pas encore fusionnée; la livraison ultérieure est décrite dans le point courant placé en tête de ce document.

## Historique — checkpoint de réconciliation documentaire de TASK-20260831-001

- GitHub `main` baseline de réconciliation : `3b33086caf8e043624a126521f0d2b4804be3e66`.
- S1 HEAD et révision runtime observés avant cette correction documentaire : `3b33086caf8e043624a126521f0d2b4804be3e66`.
- Cette valeur est la baseline immuable d'entrée de la réconciliation `docs_only`, pas une tentative de remplacer GitHub ou Live State comme autorité dynamique du SHA courant.
- Périmètre : `TASK-20260831-001`, correction de `SUIVI.md` uniquement ; aucun code fonctionnel, workflow, secret, WRITE gate, store ou runtime n'est modifié.

## Stabilisation du pilotage documentaire

### Baseline historique de départ

- La stabilisation du pilotage a été préparée depuis `main@a026616fbf2df47962243bfcff46ac734bed50ba`, merge de la PR #63.
- La PR #64 `docs(governance): stabilize roadmap and governed program planning` a ensuite fusionné la nouvelle organisation documentaire sur `main`.
- Le SHA GitHub courant ne doit pas être figé ici comme une valeur auto-référentielle : à chaque reprise, il doit être lu directement depuis GitHub/Live State. Cette règle évite qu'un commit documentaire rende immédiatement `SUIVI.md` obsolète.

### Nouvelle organisation de pilotage

- `ROADMAP.md` porte la vision complète des chantiers et lots connus, leurs dépendances, points d'intégration et règles anti-régression.
- `TODO.md` porte uniquement le travail réellement restant dérivé de la roadmap.
- `TASKS.md` porte les tâches historiques/actuelles et au plus la prochaine candidate ; aucun `TASK-...` futur n'est inventé avant son enregistrement officiel dans Operational Memory.
- `SUIVI.md` reste le point de reprise humain/documentaire et ne remplace ni Live State, ni Operational Memory, ni Governed Task Queue, ni GitHub.

### Autorités dynamiques préservées

Les valeurs suivantes ne sont pas maintenues comme vérités statiques dans ce document :

- SHA GitHub courant ;
- `DONE`/statut runtime des tasks ;
- checkpoints ;
- locks ;
- owners ;
- Governed Session active ;
- état de la queue ;
- alignement GitHub/S1/runtime.

Lorsqu'une attestation actuelle est nécessaire, ces données doivent être lues depuis GitHub, Operational Memory, Governed Task Queue, Live State, Current State et Governed Context selon leur autorité respective.

### Programme suivant — orientation documentaire

Le programme global prolonge le bootstrap de session déjà livré avec la chaîne de résolution ci-dessous. `TASK-20260901-001` a couvert uniquement A2.1 et est clôturée ; B1 a ensuite été enregistré séparément sous `TASK-20260907-001`, livré puis clôturé `DONE` révision 19. B2 est la tâche gouvernée courante distincte.

```text
principal OAuth
→ A2.1 Connection Context minimal [livré par TASK-20260901-001]
→ clôture et attestation A2.1 [acquises]
→ B1 GitHub identity [livré et clôturé]
→ B2 repository [TASK-20260909-001 en cours]
→ C1/C2 GitRegistry V2 mapping / project [futures tâches distinctes]
→ C3/C4/C5 server / runtime / domain [futures tâches distinctes]
→ D1/D2/D3 gouvernance héritée [futures tâches distinctes]
```

B1 n'est pas une extension implicite de `TASK-20260901-001` : il a été livré et clôturé sous sa tâche distincte. B2 a ensuite été enregistré individuellement après approbation de son design ; C1+ restent des candidats du programme soumis à leurs dépendances et autorités runtime. Les lots ultérieurs (guided intake, provisioning, présence client, tool-surface attestation, tracing, monitoring, dashboard, certifications Claude/ChatGPT et hardening séparé) restent positionnés dans `ROADMAP.md` sans être pré-créés dans la Task Queue.

### Règle de reprise

À chaque nouvelle reprise :

1. lire l'état GitHub `main` réel ;
2. lire les autorités runtime nécessaires ;
3. vérifier s'il existe déjà une tâche gouvernée active ou exécutable ;
4. ne créer la prochaine tâche candidate que si la queue et les dépendances l'autorisent ;
5. ne jamais utiliser `ROADMAP.md`, `TODO.md`, `TASKS.md` ou `SUIVI.md` comme substitut aux autorités dynamiques.

---

## Historique — TASK-20260829-002 — Automatic Governed Connection Bootstrap & Conversation Session Binding

Date : 2026-08-31

### Baseline fonctionnelle déployée et attestée

- La PR #62 a fusionné la correction finale au SHA `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`, depuis le head exact `2e8fa683296f4f1bf53b9875104598696ba9c6e2`.
- GitHub `main`, S1 HEAD, S1 `origin/main` et la révision OCI du runtime sont alignés sur `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`; le working tree S1 est propre, le push remote reste `disabled://mcp-s1-read-only` et le conteneur est `running/healthy`.
- La CI PR #645 (run `33442649238`, job `99654287301`), la CI main #646 (run `33442929136`) et MCP Governed Deploy #19 (run `33442929180`) ont réussi.
- Live State `stateVersion=63` confirme l'alignement technique exact-SHA. Le seul écart restant à cette observation est `DOCUMENTATION_DRIFT`, car la baseline documentaire déclarait encore `211a7de7940f115aa997f404927a8e0c9ace9055`.
- La PR #60 reste le premier lot historique : auto-corrélation OAuth, `NONE`/`AMBIGUOUS` fail-closed, refus des credentials partagés, redaction du transport et attente du bootstrap serveur.

### Régression découverte puis corrigée

- La surface ChatGPT/Codex utilise des transports MCP éphémères successifs. Avant correction, trois lectures réelles de la même Governed Session produisaient `sessionRevision=66 → 67 → 68`.
- Cause racine : `autoResumeCompatibleSession()` appelait `resumeSession()` pour toute session unique compatible, même déjà `OPEN`, `ACTIVE` ou `PAUSED`. Chaque initialisation remplaçait donc le binding durable et périmait la révision optimiste.
- Les RED `c1d8bd8112e3df6aa05afc1c42618bd716b78f21` / CI #626 et `c1ff0aa5f61d61b4d42316dbb672a59b9b223f06` / CI #628 ont reproduit exactement le défaut et l'absence du reason code serveur.
- Le contrat final est :
  - session OAuth unique non terminale → `ATTACHED`, liaison de transport en mémoire, aucune écriture du store et aucune hausse de `sessionRevision` ;
  - session OAuth unique `EXPIRED` encore reprenable → `RESUMED`, reprise durable ;
  - zéro candidat → `NONE` ;
  - plusieurs candidats → `AMBIGUOUS`, sans sélection arbitraire ;
  - credential partagé → aucune auto-reprise.
- L'audit distingue `bindingResult=attached` de `resumed`; le serveur journalise `governed_session_auto_attached` sans identifiant de transport brut.
- Après déploiement, trois lectures successives ont toutes retourné `sessionRevision=68`, le même `resumedAt` et le même fingerprint durable : le churn n'est plus reproduit.

### Réconciliation documentaire et gate de clôture — checkpoint historique

- La branche `mcp/automatic-governed-connection-bootstrap-20260829` avait été fast-forwardée depuis `main@878a1646fc7e5928cdb7951a3d2ad1f0639a1d53` pour une réconciliation strictement Markdown.
- Cette réconciliation ne modifiait ni TypeScript, tests, workflow, OIDC, Autodeploy, politique `.mcp`, WRITE gate, secret, runtime ou fichier S1.
- Cette réconciliation a depuis été fusionnée par PR #63 au SHA `a026616fbf2df47962243bfcff46ac734bed50ba`.
- Les états runtime de clôture de `TASK-20260829-002` restent exclusivement des preuves Operational Memory et ne sont pas réinterprétés depuis ce checkpoint documentaire.

---

## Historique — TASK-20260829-001 au moment de sa réconciliation

Date : 2026-08-29

## Baseline historique alors déployée

- GitHub `main` est au SHA `2c2dde2bffe62b2685bf2fad94530571762470c8`, merge de la PR #55 `feat(governance): unify operational work state`.
- S1 HEAD et `origin/main` sont au SHA exact `2c2dde2bffe62b2685bf2fad94530571762470c8`; le working tree S1 est propre et le push remote reste `disabled://mcp-s1-read-only`.
- L'image/runtime actif expose `org.opencontainers.image.revision=2c2dde2bffe62b2685bf2fad94530571762470c8`; le conteneur `wealthtech_mcp_ssh_bridge` est `running` et `healthy`.
- CI main `33256566688` et MCP Governed Deploy `33256566695`, job `99111230626`, ont réussi sur ce SHA exact; l'étape `Deploy exact main SHA through MCP` est `success`.
- Live State `stateVersion=51` atteste GitHub/S1/runtime alignés au SHA exact; la seule contradiction observée avant la présente réconciliation est `DOCUMENTATION_DRIFT` avec `nextAction=reconcile_canonical_documentation`.
- Audit baseline et Current-State Inventory sont valides sur `2c2dde2bffe62b2685bf2fad94530571762470c8`; catalogue MCP inchangé à 111 outils, 68 lectures et 43 écritures, WRITE gate toujours `shadow`.

## TASK-20260829-001 — Unified Operational Work State

- La tâche reste gouvernée par Operational Memory et la Governed Task Queue; ce document ne remplace pas leur statut, leur owner, leurs locks, checkpoints ou révisions.
- Branche fonctionnelle utilisée et conservée dans l'historique : `mcp/unified-operational-work-state-20260829`.
- PR fonctionnelle #55 fusionnée avec garde `expected_head_sha` au head exact `de0030b0df42a693d2e96c87f008c9ffd1c2ce04`.
- CI PR exact-head #577, run `33256403390`, job `99110808499` : `success`; typecheck, build, docs check, governance tests, secret scan, read-only safety `250/250` et whitespace diff sont verts.
- Quatre findings de review ont été corrigés additivement puis résolus avec preuve GREEN : SHA lu sur chaque `check_runs[]`, preuve de déploiement liée au `runtimeRevision` de la tâche, agrégation de tous les rulesets actifs applicables à `main`, et prise en compte du nombre d'approbations exigé.
- Le ruleset réel `protect-main` reste l'autorité GitHub : PR requise, check `validate`, résolution des threads, `required_approving_review_count=0` à l'observation de clôture fonctionnelle.
- Le merge #55 est `2c2dde2bffe62b2685bf2fad94530571762470c8`; l'Autodeploy exact-SHA est attesté par `33256566695` / `99111230626` et le runtime est aligné sur ce même SHA.
- `CapabilityReality`, `TaskReality` et `GovernanceDecision` restent des projections des autorités existantes; aucun nouveau store, orchestrateur, chemin GitHub/S1 ou mécanisme d'enforcement n'a été créé.
- `deploymentExactShaSuccess` exige désormais que le `runtimeRevision` enregistré par la tâche corresponde simultanément à GitHub main, S1 HEAD, S1 `origin/main` et au runtime healthy; un déploiement ultérieur sans rapport ne peut plus vérifier rétroactivement une tâche.
- L'observation GitHub utilise les SHA des check-runs individuels et agrège tous les rulesets actifs applicables à `main`; les règles non applicables et les rulesets `evaluate` ne deviennent pas artificiellement bloquants.
- Le WRITE gate reste `shadow`; OIDC, Governed Autodeploy, 2FA, `ENABLE_WRITE_TOOLS`, `allow_write`, secrets et règle d'absence de push direct sur `main` restent inchangés.

## Réconciliation documentaire post-déploiement — checkpoint historique

- Cette section décrit le checkpoint documentaire descendant de `main@2c2dde2bffe62b2685bf2fad94530571762470c8` au moment où il a été produit.
- Elle ne modifiait ni source TypeScript, tests, workflow, OIDC, Autodeploy, politique `.mcp`, WRITE gate, secret, runtime ou fichier S1.
- Les statuts `DONE`, checkpoint final, libération de lock et cycle de Governed Session restent exclusivement sous autorité Operational Memory et ne sont pas pré-déclarés ici.


## Historique pré-PR #80 — AfricaFunds Phase 2 fonctionnelle prête pour PR

- Autorités rebaselinées sur MCP main/S1/runtime `740e62a248a804ed73babedc7b3869b3a28ef612`; branche Phase 2 existante `mcp/africafunds-registry-phase2-20260912`.
- Observations sans mutation : API GitHub `ff133efaa36d7bc36cabd6061e1b3d235f16b968`, S2 `79b40d13e` avec fichiers non suivis conservés; frontend GitHub `55191a74c8d581adb383123ce1d9f5bea98dc267`, S2 `cac9f1d` propre.
- RED exact `5cedc7ac4b32d71ead8c8574c001669f3ff86f4e`, CI #831 échouée uniquement dans la suite read-only sur l'absence attendue du mapping.
- GREEN : deux mappings V1 corrélés, `allowedAccess=read`, `deployEnabled=false`; projet unique `CS-AFRICAFUNDS-001` / `chainsolutions.africafunds`; état `FUND_STATE` à quatre champs indépendants; deux vhosts historiques non Git/inactifs/non déployables.
- Correction de non-régression des compteurs du test V2 au head `5b296e48b7140e0205a4921a8f9d3e8a35700477`; CI #833 complète verte.
- Aucune permission, capability WRITE, activation V2, mutation AfricaFunds/S2, synchronisation de checkout ou nouveau chemin de déploiement.
- Prochaine action : Draft PR Phase 2, revue exacte, CI, fusion gardée, Autodeploy MCP, attestation Live State, puis réconciliation documentaire terminale.


## 2026-09-13 — C1 GitRegistry V2 verification gates — candidat non publié

- Autorité runtime : `TASK-20260913-002` reste `IN_PROGRESS`; Operational Memory et la Governed Task Queue restent seules autorités de statut.
- Branche gouvernée : `mcp/c1-gitregistry-v2-verification-20260913`.
- Design fail-closed approuvé au checkpoint `ce434de7-f21c-4ed4-a963-a49a70c275f8`.
- TDD RED : `af4ee0f7`, MCP CI #854 ; exactement deux nouveaux tests C1 échouent parce que le verdict d'activation n'existe pas encore, tandis que les 320 tests historiques passent.
- TDD GREEN : `db703454`, MCP CI #855 entièrement verte, incluant typecheck, build, docs, gouvernance, secret scan, read-only safety et whitespace.
- `assessGitRegistryV2ActivationReadiness()` est une dérivation pure et non mutante : chaque mapping reste `BLOCKED` tant que statut, realPath, remote, domaine requis, credential, migration, health checks ou rollback ne sont pas suffisamment prouvés.
- Aucun mapping réel n'est activé, aucune capability WRITE n'est ajoutée, aucun remote n'est modifié, aucune migration n'est exécutée et aucun code versionné n'est écrit directement sur S1.
- Les gates techniques encore ouverts sont : credential Wealthtechinnovations non vérifié, preuves path/remote/domain incomplètes et migration MCP encore pending.
- Prochaine action : revue/PR exacte de ce socle de vérification, puis collecte séparée des preuves ; une activation V2 restera interdite tant que les gates ne sont pas satisfaits.

## 2026-09-16 — Dossier permanent GWC versionné, préparation de la file gouvernée

- Source de vérité de l'observation : GitHub live. `REF = main`, `OBSERVED_SHA = d1f303955c4d368950da2307dda41d826fc85d0a`. Clone local utilisé comme cache de lecture uniquement, SHA identique et worktree propre au moment de l'écriture.
- Ajout de `docs/gwc/` (3 Markdown), `.mcp/gwc-contracts.json` (73 contrats), `.mcp/gwc-task-seed.json` (18 tâches candidates) et `scripts/gwc-verify.mjs`.
- `node scripts/gwc-verify.mjs` recalcule les empreintes avec la sérialisation canonique du runtime et échoue sur divergence. Câbler ce contrôle dans la CI fait partie du LOT 0, après ratification.
- Le backlog est en préparation et n'est chargé par aucun code. La promotion vers `.mcp/task-registry.json` est une étape humaine explicite.
- Findings de sécurité consignés et non corrigés : AF-19 (le SHA de squash déployé n'est pas le SHA validé par le check requis, et le déploiement se termine avant la fin de la CI du SHA déployé — 21 s sur `d1f3039`, 16 s sur `39662171`) et AF-22 / AF-30 (`parseReviews` ignore `review.commit_id`).
- Non vérifié ici : le contenu exact du ruleset `protect-main`. Aucun outil ruleset dans la surface utilisée. À VÉRIFIER.
- Aucun comportement runtime modifié, aucune tâche créée, aucun lock pris, aucun déploiement déclenché.
- Prochaine action : ratification humaine de l'architecture, puis AF-19, puis AF-22, puis disposition de la pile de PR ouvertes.

## 2026-09-16 — R3 : réconciliation du dossier GWC sur la PR #95 existante

- `SOURCE = GITHUB_LIVE` · `REPOSITORY = Patricked-code/MCP` · `REF = main` · `OBSERVED_SHA = d1f303955c4d368950da2307dda41d826fc85d0a` · `OBSERVED_AT = 2026-09-16T23:23:04Z`.
- PR #95 réobservée live avant travail : ouverte, draft, `mergeable_state = clean`, head `36fe3b11be7a74d8190d0954a4dcae0052b5b5ba`, base `main@d1f3039`. Aucune nouvelle branche, aucune nouvelle PR.
- Clone local utilisé uniquement comme tampon d'écriture, après preuve `LOCAL_HEAD == origin/claude/ecstatic-edison-v1dyt1 == 36fe3b11` et worktree propre. `LOCAL_CLONE_USED_FOR_CANONICAL_REVALIDATION = NO` : les fichiers du dépôt analysés ont été lus depuis GitHub live au SHA exact.
- Corps canonique remplacé par les 73 Contract Design Sheets A→BA ; R2 archivée sous `docs/gwc/archive/` avec bannière non canonique ; affirmations remplacées consignées dans `DEPRECATED_CLAIMS.md`.
- Statut d'architecture : `READY_FOR_GOVERNED_IMPLEMENTATION`. Aucune Task de ratification humaine.
- 18 blueprints `GWC-0`…`GWC-17` en registre machine, jamais promus en Task Queue.
- Findings conservés : `AF-19` propriétaire `GWC-15`, `AF-22` et `AF-30` propriétaire `GWC-14`. Priorité d'implémentation : AF-19, puis AF-22/AF-30, puis réconciliation #88/#89/#90 (`GWC-12`), puis `GWC-0`.
- Non vérifié ici : contenu exact du ruleset `protect-main`. Aucun outil ruleset dans la surface utilisée. À VÉRIFIER.
- PR #95 reste ouverte, draft et non fusionnée : AF-19 est une faiblesse vivante de l'autodeploy `main`, et un merge déclencherait le déploiement automatique existant.
- Aucune implémentation GWC runtime démarrée, aucune Task créée, aucun lock, aucun déploiement.

## 2026-09-17 — Conception d'évolution détaillée GWC-0..GWC-17 sur la PR #95 existante

- `SOURCE = GITHUB_LIVE` · `REPOSITORY = Patricked-code/MCP` · `REF = main` · `OBSERVED_SHA = d1f303955c4d368950da2307dda41d826fc85d0a` · `OBSERVED_AT = 2026-09-17T03:47Z`.
- PR #95 réobservée live avant écriture : ouverte, draft, non fusionnée, head `715393a549e9fae09021b073a50d243007a09346`, base `main@d1f3039`. Aucune nouvelle branche, aucune nouvelle PR.
- Clone local synchronisé sur le head live avant écriture, `DirtyCount = 0` après synchronisation. Le clone n'a servi que de tampon d'écriture.
- **CI rouge traitée en premier.** Le job `validate` échouait à l'étape `docs:check` avec `markdown_inventory_drift` puis `markdown_count_drift` (declared 211, actual 214) : trois sources du bundle `docs/gwc/canonical-memory/pr95-ded/` avaient été ajoutées sans réalignement de l'inventaire. Corrigé avec `scripts/generate-doc-governance-baseline.mjs`, diff réduit aux 3 entrées manquantes et aux deux compteurs.
- 18 fiches de conception détaillée écrites, `GWC-0` à `GWC-17`, chacune couvrant l'existant sur trois plans, l'écart exact, la classification d'intégration, la décision `REUSE → WRAP → GENERALIZE → EXTEND → NEW`, les impacts, le plan TDD et la clôture.
- 13 registres transverses, matrice centrale des 73 contrats générée depuis `.mcp/gwc-contracts.json`, et 4 audits globaux.
- Trois findings découverts et enregistrés : `AF-31` deux fichiers de tests exécutés dans aucune étape CI ; `AF-32` trois outils `operational-write` ne traversant aucune porte d'écriture ; `AF-33` deux affectations de findings du registre machine sans définition versionnée cohérente.
- `OD-07` réduit sur preuve : l'option `workflow_run` pour `AF-19` est éliminée parce que la politique OIDC gelée n'autorise que `push` et `workflow_dispatch` et exige `tokenSha === requestedSha`. Trois options compatibles restent ouvertes.
- `.mcp/gwc-evolution-design.json` ajouté ; `scripts/gwc-verify.mjs` étendu par `verifyEvolutionDesign()`, prouvé mordant sur 13 défauts distincts injectés un par un.
- Verdict : `DETAILED_EVOLUTION_DESIGN_READY_FOR_TASK_RECONCILIATION`, avec trois réserves énoncées — sept contrats dépendent de capacités non fusionnées, les définitions `AF-01` à `AF-27` ne sont versionnées que dans l'archive non canonique, et la Governed Task Queue runtime n'est pas observable depuis cette mission.
- Non vérifié ici : contenu exact du ruleset `protect-main`, et état de la Governed Task Queue runtime. À VÉRIFIER.
- Aucune implémentation runtime, aucune Task créée ou claimée, aucun lock, aucun merge, aucun déploiement, aucune mutation serveur, aucun secret. PR #95 reste ouverte, draft et non fusionnée.

## 2026-09-17 — Exécution du flux pré-code GWC : P0 → A14, gate BLOQUÉ

- `SOURCE = GITHUB_LIVE` · `REPOSITORY = Patricked-code/MCP` · `REF = main` · `MAIN_SHA = d1f303955c4d368950da2307dda41d826fc85d0a` · `PR95_HEAD = 58d71959488a012564f5fc6bf53fc64a038cadd9` · `OBSERVED_AT = 2026-09-17T13:23:01Z`.
- Session d'architecture `GWC-PRE-SESSION-20260917-CLAUDE-58d71959`, agent Claude. Head relu avant écriture, pas de `HEAD_MOVED`, `DirtyCount = 0`.
- **`GWC-PRE-000`** — autorités observées. GitHub : PR #95 `OPEN/DRAFT/NOT_MERGED`, `mergeable_state = clean`, MCP CI run 1000 `SUCCESS` sur le head exact, 0 review, 0 thread. **Rulesets `UNKNOWN`** : aucun outil ruleset dans la surface GitHub disponible. **Autorités runtime `UNKNOWN`** : Operational Memory, Governed Task Queue, Governed Sessions, Lock Service, Bootstrap Receipt, Live State, Capability Reality et Task Reality ne sont pas atteignables depuis cette session — le serveur MCP WealthTech n'est pas dans la surface d'outils. Aucune substitution par de la mémoire historique.
- **Écart de procédure relevé** : le « Canonical Memory Verifier » prescrit par `CLAUDE.md §8` et par `current.json` n'existe pas dans le dépôt. La vérification équivalente a été exécutée à la main : bundle `pr95-precode-architecture-complete`, 3/3 sources conformes en `sha256` et en taille, 13 claims tous `approval_eligible = false`.
- **`GWC-PRE-001`** — baseline établie. Digest `PRECODE_ACTION_TASK_FLOW.txt` == projection == gate. Une seule dérive, attendue et auto-déclarée : `observedHeadBeforeMemoryProjection = 73359454` contre head courant `58d71959`.
- **Phases `PASS_WITH_EVIDENCE` (10/14)** : `A1` inventaire, `A2` 73/73 mappings, `A3` 73/73 fiches canoniques (ancres résolues), `A4` 18/18 fiches DED, `A6` autorités et contrats de données, `A9` fail-closed et sécurité, `A10` compatibilité ascendante, `A12` séquence gelée, `A13` audit croisé, plus `P0`.
- **Phases bloquées (4)** : `A5` — 0/91 arêtes portent `trigger`/`precondition` alors que `A5-01` l'exige ; `A7` — aucun modèle `EvidenceRef` ni `StepAttestation` typé ; `A8` — classes de rejeu `PURE`/`READ_ONLY`/`IDEMPOTENT_MUTATION`/`NON_REPLAYABLE_MUTATION` non nommées et `RecoveryAnchor` non défini ; `A11` — 15/19 scénarios nommés couverts, manquent `governance missing`, `duplicate task`, `deploy failure`, `concurrent agents`. `A14` dépend des quatre.
- **`AF-19`, `AF-31` et `AF-32` confirmés** sur preuve exacte du head courant, pas réaffirmés depuis la mémoire.
- **`AF-34` ouvert** : `.mcp/gwc-precode-gate.json` déclare `architecturePhases.satisfied = 14`, la vérification en donne 10. `scripts/gwc-precode-verify.mjs` passe malgré tout, parce qu'il contrôle les compteurs déclarés du gate et les tailles des registres, jamais les conditions de sortie des phases. Propriétaire `GWC-0`.
- **Verdict du gate** : `GWC_ARCHITECTURE_GATE_BLOCKED` · `GWC_RUNTIME_IMPLEMENTATION = BLOCKED`. Aucun code runtime GWC ne peut démarrer.
- Statut par phase consigné dans `.mcp/gwc-precode-status.json`, projection non autoritative : ni Operational Memory, ni Governed Task Queue, ni lock runtime.
- Non vérifié ici : contenu exact du ruleset `protect-main`, et état de la Governed Task Queue runtime. À VÉRIFIER.
- Aucune Task créée ou claimée, aucun lock, aucun merge, aucun déploiement, aucune mutation serveur, aucun code runtime, aucun secret.
- `NEXT_ACTION` : lever les blocages `A5-01`, `A7-01`, `A7-02`, `A8-03`, `A8-04` et `A11-01` par conception, puis réévaluer `A14` et le gate.

## 2026-09-17 — Flux pré-code : blocages levés, `GWC_ARCHITECTURE_GATE = PASS`

- Suite de la session d'architecture `GWC-PRE-SESSION-20260917-CLAUDE-58d71959`. Head relu avant chaque écriture, aucun `HEAD_MOVED`.
- **Quatre phases débloquées par conception**, sans une ligne de code runtime :
  - `A5-01` — les 91 arêtes du graphe portent désormais un `trigger` typé et une `precondition` explicite : 70 `POSTCONDITION_PASS`, 16 `SKIP_CONDITION` motivées une par une, 4 `REOBSERVE_REQUIRED`, 1 `POSTCONDITION_FAIL`. Aucune transition implicite.
  - `A7-01` / `A7-02` — modèles `M1 EvidenceRef` et `M2 StepAttestation` spécifiés. `M2` porte l'`attestationId` dont l'absence constituait `AF-29`.
  - `A8-03` / `A8-04` — modèle `M3` nommant les quatre classes de rejeu, et modèle `M4 RecoveryAnchor` avec `duplicateInvocationRule = REOBSERVE_THEN_DECIDE`. Merge et déploiement sont classés `NON_REPLAYABLE_MUTATION`.
  - `A11-01` — `E2E-22` ajouté pour la résolution de finding de revue.
- **Deux de mes propres contrôles étaient fautifs et ont été corrigés** : le test d'ancres `A3` échouait 73/73 à cause d'un algorithme de slug erroné, pas d'ancres cassées ; et trois des quatre scénarios `A11` déclarés manquants étaient des faux négatifs d'une recherche textuelle naïve — seul `review finding` manquait réellement.
- **Défaut de mon propre correctif attrapé par mon test d'injection** : le contrôle de précondition d'arête avait été ajouté dans `validateEdgeShape()`, qui ne sert qu'à une sonde synthétique et n'est jamais appliquée aux arêtes réelles. Corrigé : la boucle de validation réelle l'invoque désormais.
- **`AF-34` corrigé sur ses deux faces.** L'instance : les 14 phases sont `PASS_WITH_EVIDENCE` avec preuves relisibles. La cause : `scripts/gwc-precode-verify.mjs` recoupe maintenant les compteurs déclarés du gate contre `.mcp/gwc-precode-status.json`, refuse un `PASS_WITH_EVIDENCE` sans preuve, refuse un verdict contredisant le décompte, et exige le head exact observé. Éprouvé par injection : quatre défauts, quatre rejets.
- **Mémoire canonique rafraîchie** : nouveau bundle `pr95-precode-gate`, intégrité 2/2 sources vérifiée, 6 claims tous `approval_eligible = false`, pointeur `current.json` mis à jour. Les trois bundles précédents restent immuables.
- **Verdict** : `GWC_ARCHITECTURE_GATE = PASS`. La seule suite légitime est la **Phase B — réconciliation live de la Governed Task Queue**.
- **Le runtime reste gelé**, et pas seulement par politique : la Governed Task Queue live n'est pas observable depuis cette session, donc aucune classification `NEW_TASK` ne peut être établie. `GWC_RUNTIME_IMPLEMENTATION = NOT_STARTED`.
- Non vérifié ici : ruleset `protect-main`, et l'ensemble des autorités runtime. À VÉRIFIER.
- Aucune Task créée ou claimée, aucun lock, aucun merge, aucun déploiement, aucune mutation serveur, aucun code runtime, aucun secret.
- `NEXT_ACTION` : Phase B exige une observation live de la Governed Task Queue, indisponible depuis cette session — l'exécution s'arrête ici sur un blocker gouverné réel, pas sur une fin de sous-tâche.

## 2026-09-17 — Phase B : réconciliation live de la Governed Task Queue — `BLOCKED`

- Le MCP WealthTech est devenu atteignable. `ping = wealthtech_ssh_bridge_ok`. Les autorités runtime, jusque-là `UNKNOWN`, ont été réellement observées.
- **Autorités observées** — Task Queue `storeRevision 188`, 15 tâches (11 `DONE`, 3 `SUPERSEDED`, 1 `DEPLOYING`), `nextSequence 16` · Live State `stateVersion 246`, `freshness CURRENT`, `global FULLY_ALIGNED`, `documentation ALIGNED`, 0 contradiction, GitHub = S1 = runtime = `d1f30395` · 25 sessions gouvernées (1 `ACTIVE`, 1 `EXPIRED`, 23 `CLOSED`) · **aucun lock détenu par aucune session**.
- **`GWC-PRE-B-01` réobservation : faite.**
- **`GWC-PRE-B-02` classification :**
  - **Aucune tâche GWC n'existe dans la file live.** 0 des 18 blueprints n'a de `GovernedTaskRecord`. Ni `CONTINUATION` ni `DUPLICATE` ne s'appliquent.
  - **`TASK-20260915-001` → `CONFLICT`.** La file la déclare `DEPLOYING` avec blocker `DOCUMENTATION_DRIFT` à `46d576e5`. Live State `stateVersion 246` déclare `documentation: ALIGNED`, `global: FULLY_ALIGNED` et 0 contradiction à `d1f30395`, plus récent. Les deux autorités se contredisent.
  - **`GWC-0` à `GWC-17` → `BLOCKED`.** Le protocole MCP impose que la première tâche exécutable précède les nouvelles. Enregistrer un `NEW_TASK` GWC avant résolution de `TASK-20260915-001` reviendrait à doubler la file.
- **`AF-35` ouvert** — contradiction Task Queue contre Live State. Propriétaire `GWC-5`. La session propriétaire `499b2ea3` appartient à l'agent *ChatGPT GPT-5.6 Sol*, a acquitté `stateVersion 233` contre 246 en live, et n'a pas battu depuis le 2026-09-16T22:52Z : son Bootstrap Receipt est périmé. Son propre `nextAction` est obsolète — il demande de fusionner PR #92 au head `8b71f14f`, alors que PR #92 est fusionnée et que `main` a avancé.
- **Pourquoi je n'ai pas résolu le `CONFLICT`** : `TASK-20260915-001` est possédée par une session `ACTIVE` qui n'est pas la mienne. Toute transition exigerait son `governedSessionId` et son `expectedSessionRevision`. Agir à sa place violerait la règle « un seul writer par domaine de collision » et l'interdiction d'écraser un travail concurrent. Deux voies seulement : l'agent propriétaire clôture, ou une décision humaine fait expirer ou superséder la tâche.
- **`RUNTIME_TASKS_CREATED = 0`.** Aucune session ouverte, aucun Bootstrap Receipt demandé, aucun claim, aucun lock, aucune transition. L'observation seule a suffi à produire la classification.
- `NEXT_ACTION` : résoudre le `CONFLICT` sur `TASK-20260915-001` avant toute matérialisation GWC.
- **Checkpoint durable** — bundle canonique `pr95-phase-b-live-reconciliation` créé (2 sources, intégrité sha256/taille vérifiée, 9 claims tous `approval_eligible: false`, 2 supersessions motivées). Le pointeur `docs/gwc/canonical-memory/current.json` est avancé et porte désormais `currentPhase` avec le blocker et le `NEXT_ACTION`. Les quatre bundles précédents restent immuables, conformément à `CLAUDE.md` §8. `clm_authorities_unknown` et `clm_taskqueue` sont explicitement supersédés : l'`UNKNOWN` n'a jamais été substitué entre-temps, il a été levé par observation réelle.

## 2026-09-18 — Phase C3 : réconciliation de la pile candidate — `PASS_WITH_EVIDENCE`

- Exécution de `GWC-PRE-C3`. `C1` (`AF-19`) et `C2` (`AF-22`/`AF-30`) **non exécutés** : ils touchent au chemin de déploiement et au gating de revue, hors du périmètre autorisé pour cette session. Enregistrés `PENDING`, pas passés sous silence.
- **Réobservation live** — les cinq candidates `#85`, `#86`, `#88`, `#89`, `#90` sont inchangées depuis les 2026-09-14/15, mêmes heads exacts qu'au 2026-09-17T03:47Z. Aucune rebase, reprise ni fermeture entre-temps.
- **`main` ne porte aucune capacité de contrôle GitHub.** Ses 111 outils comptent 6 `github_*`, tous d'inventaire ou de diagnostic. « Already implemented ? » = **non** pour l'intégralité des capacités candidates.
- **Fait décisif** : les **7 contrats `CANDIDATE`** (`GW-24`, `GW-34`, `GW-38`, `GW-43`, `GW-59`, `GW-61`, `GW-63`) ne dépendent que de **4 outils** de `#90` — `github_create_branch`, `github_create_pull_request`, `github_mark_pr_ready`, `github_merge_pull_request`. La pile pèse plus de 5 500 lignes ; ce qui bloque réellement GWC en est une fraction. Et `#88`, **racine** de la staleness, n'est requise par **aucun** des 73 contrats.
- **8 capacités disposées** : 3 `SPLIT`, 1 `SUPERSEDE`, 4 `DEFER`. Aucun `KEEP` — toutes sont stale. Aucun `CLOSE` — fermer la PR d'autrui n'est pas une disposition que cette session exécute.
- **Partition vérifiée exacte** : les 18 outils de `#90` sont répartis 4 + 5 + 9, sans doublon, sans manquant, sans outil étranger ; `WRITE` 4 + 4 + 4 = 12.
- **Contrainte d'ordonnancement dérivée** : `GWC-9` précède l'atterrissage de tout `SPLIT` portant du `WRITE`. `AF-32` établit que 3 mutations de `main` ne traversent aucune porte d'écriture ; `#90` en ajoute 12. Faire atterrir du `WRITE` avant `GWC-9` élargirait le trou d'un facteur quatre. `C-89.2`, `READ` seul, en est exempt.
- **Deux réserves du verdict mises à jour** — celle des sept contrats est **réduite** (disposition bornée désormais établie) ; celle de la Task Queue non observable est **levée** par la Phase B du 2026-09-17.
- **`PRS_MUTATED = 0`.** Aucune PR fusionnée, rebasée, fermée ni modifiée. Exécuter un `SPLIT` est une matérialisation de tâche, donc soumise à la Phase B, qui reste `BLOCKED`.
- `NEXT_ACTION` inchangé : résoudre le `CONFLICT` sur `TASK-20260915-001`.

## 2026-09-18 — Phase B réobservée : le `CONFLICT` est levé, `NEW_TASK` devient admissible

- Le bridge WealthTech a été réautorisé. `ping = wealthtech_ssh_bridge_ok`. Réobservation en **lecture seule** à `2026-09-18T17:08Z`, conformément à la règle : la classification Phase B est une observation datée, jamais un fait acquis.
- **L'agent propriétaire a pris la voie (a).** `TASK-20260915-001` est passée de `DEPLOYING` à **`DONE`**, blockers `DOCUMENTATION_DRIFT` → **vides**, `taskRevision 12`, `updatedAt 2026-09-17T20:27:08Z`, `observedHeadSha` = `runtimeRevision` = `d1f30395`. La session `499b2ea3` est **`CLOSED`** depuis `2026-09-17T20:27:22Z`, après avoir acquitté le `stateVersion 246` — elle n'était donc plus périmée au moment de clôturer.
- **Autorités observées** — Task Queue `storeRevision 190`, 15 tâches : **12 `DONE`, 3 `SUPERSEDED`, 0 non terminale** · Live State `stateVersion 246`, `FULLY_ALIGNED`, 0 contradiction, `documentation.drift = false`, `activeTask = null`, runtime `healthy` à `d1f30395` · 25 sessions, **0 `ACTIVE`**, 24 `CLOSED`, 1 `EXPIRED`.
- **`AF-35` est résolu à la source**, pas par cette session. Les deux autorités concordent désormais. C'est exactement la voie (a) annoncée dans le `SESSION_HANDOFF` : l'agent propriétaire était le mieux placé, et le blocker `DOCUMENTATION_DRIFT` était bien périmé plutôt que réel.
- **Nouvelle classification** — `TASK-20260915-001` → `RESOLVED` ; **`GWC-0` à `GWC-17` → `NEW_TASK`**. Le raisonnement : aucune tâche GWC n'existe (donc ni `CONTINUATION` ni `DUPLICATE`), le `CONFLICT` est levé, et le motif `BLOCKED` tombe puisque plus aucune tâche non terminale ne précède les nouvelles. Il ne reste que `NEW_TASK`.
- **`RUNTIME_TASKS_CREATED = 0`.** `NEW_TASK` rend la matérialisation **admissible, pas automatique**. Créer une Governed Task exige une governed session et un Bootstrap Receipt, hors du périmètre autorisé pour cette session. Et `TASK BLUEPRINT ≠ GovernedTaskRecord` interdit d'en créer dix-huit en bloc : l'ordre prescrit est celui de la Phase E, à partir de `GWC-0`, avec la contrainte `C3` — `GWC-9` précède tout `SPLIT` portant du `WRITE`.
- `NEXT_ACTION` : créer la Governed Task de `GWC-0` via les primitives gouvernées existantes, **après décision humaine explicite**. Aucune création en bloc.

## 2026-09-18 — `HEAD_MOVED` : réconciliation du commit pair `e22214d`, `AF-36` ouvert et corrigé

- Un commit que je n'ai pas poussé est apparu sur la branche partagée : `e22214d` « docs(gwc): make canonical continuation automatic ». Conformément à `PRECODE_MULTI_AGENT_COORDINATION.md`, écriture suspendue, lecture du travail intervenu, compréhension, puis réconciliation. Merge, jamais de rebase ni de force-push.
- **Faits vérifiés contre les autorités, pas contre le commit.** `TASK-20260918-001` **existe réellement** dans la file live : `READY`, séquence 16, créée à `17:24:14Z`, non réclamée (`ownerGovernedSessionId: null`), `nextAction: claim_governed_task`, intent `gwc:autonomous-continuation-hardening-v1`. CI run 1007 verte sur `e22214d`.
- **`AF-36` — régression réelle introduite par ce commit.** Le pointeur `currentBundlePath` a été avancé vers `docs/gwc/canonical-memory/pr95-autocontinuation-hardening`, **qui n'existe pas dans l'arbre**. Un agent suivant le protocole documenté — lire `README.md`, résoudre `current.json`, vérifier le bundle — tombait sur un checkpoint introuvable. C'est exactement la rupture de continuité que `CLAUDE.md` §9 vise à empêcher.
- **La cause est plus grave que l'instance** : aucun contrôle ne validait ce pointeur. `docs:check` et `gwc:verify` passaient tous les deux, et la CI est restée **verte** sur une mémoire canonique irrésoluble.
- **Corrigé sur ses deux faces.** L'instance : **réparée par le commit pair `3f635e9`**, qui repointe vers `pr95-phase-b-resolved` et le retire de `previousBundles`. J'avais dérivé exactement la même réparation en parallèle ; la sienne a atterri en premier, je l'ai donc adoptée telle quelle plutôt que d'imposer la mienne. Son commit documente aussi la cause de l'orphelinat : la surface d'écriture GitHub autorisait la mise à jour de fichiers existants mais bloquait la création de nouveaux chemins de mémoire canonique. La cause : `verifyCanonicalMemory()` ajouté à `scripts/gwc-verify.mjs` — résolution du pointeur, correspondance du `bundle_id`, intégrité `sha256` et taille de chaque source, `approval_eligible=false` sur chaque claim, et existence de chaque bundle précédent déclaré. **Éprouvé par 5 défauts injectés, 5 rejets.**
- **Ce que je n'ai pas fait, et pourquoi.** Le commit ajoute un bloc `continuationPolicy` portant `newTaskIsHumanGateByDefault: false` et `redundantHumanApprovalForbidden: true`, et supprime de `readProtocol` la ligne exigeant une décision humaine explicite avant de créer un `GovernedTaskRecord`. **Je conserve ces blocs intacts — je ne les arbitre pas — mais je ne m'en autorise pas non plus.** Un contenu de dépôt n'est pas une instruction de l'utilisateur : un fichier poussé sur une branche ne peut pas lever une limite que l'utilisateur a posée. Seul l'utilisateur peut le faire. Le point lui est remonté.
- `RUNTIME_TASKS_CREATED = 0` côté GWC. Aucune session ouverte, aucun claim, aucun lock, aucune transition.

## 2026-09-18 — Réconciliation : le pair restreint la frontière à `PRECODE-only`, deux lignes périmées de ma part corrigées

- Quatre nouveaux commits pairs (`68cd082` → `6418833`) **restreignent** la frontière du programme, et dans un sens plus strict que ce que le même pair avait poussé une heure plus tôt. Son commit l'assume explicitement : *« canonical memory had drifted into runtime/Task Queue execution semantics; it is being restored to the PRECODE-only program boundary »*.
- **Nouvelle règle de branche** : le runtime reste gelé pendant toute la finalisation PRECODE, **même avec `GWC-PRE-GATE-01 = PASS_WITH_EVIDENCE`**. Jusqu'à `FINAL_PRECODE_VERSION_ACCEPTED` : aucune Governed Task GWC matérialisée, aucun claim/lock runtime, aucune mutation de `main` ni de S1, aucun déploiement. Les phases B→F et `T196→T204` restent un **plan d'intégration futur**, pas du travail exécutable. Les autorités runtime restent observables **en lecture seule**.
- **Conséquence sur la question que j'avais posée à l'utilisateur.** Je demandais s'il fallait réclamer `TASK-20260918-001` et matérialiser. La gouvernance de la branche y répond désormais par la négative, indépendamment de moi : la matérialisation est interdite avant `FINAL_PRECODE_VERSION_ACCEPTED`. Ma retenue et la nouvelle règle convergent.
- Le pair a **conservé** mes blocs `phaseB` et `phaseC` en les annotant (`executionRole`, `currentExecutionAuthority: false`, `noteForPrecodeFinalization`) plutôt qu'en les supprimant. Provenance préservée, périmètre courant clarifié. Bonne pratique, adoptée telle quelle.
- **Deux lignes périmées du README, et elles sont de moi** : en poussant `AF-36` j'avais mis à jour `BLUEPRINTS.md` et `.mcp/gwc-evolution-design.json` mais laissé le README à « 35 findings — `AF-01`…`AF-35` », en contradiction avec le registre machine qui en porte 36. Et la ligne « bundle courant » désignait encore `pr95-phase-b-live-reconciliation` alors que le pointeur vise `pr95-phase-b-resolved`. Le pair avait simplement préservé mes lignes ; il ne les a pas introduites. Corrigées, avec ajout de `current.json` au tableau de contenu puisqu'il est désormais vérifié.
- État : head `6418833` mergé, `gwc:verify` 36 findings tous rattachés, pré-code `PASS`, `RUNTIME_TASKS_CREATED = 0`.

## 2026-09-19 — NEW_INFORMATION_INTAKE #1 : architecture GWC racine / macro-contrats / modèle commun des étapes

- Connexion GitHub-first sur `claude/ecstatic-edison-v1dyt1` et réobservation du head exact `32133ec56ece4d4530ddfa270eb2b668845148f2`.
- Mode déduit explicitement : `NEW_INFORMATION_INTAKE`. L'utilisateur apporte de l'information à analyser ; il n'a pas demandé la continuation automatique du candidate build dans ce message.
- Intake borné enregistré sous `docs/gwc/canonical-memory/pr95-new-information-intake-001/sources/new-information-intake-001.json` ; aucun transcript brut n'est persisté.
- Information principale : proposition d'un `GWC ROOT` orchestrant **8 macro-contrats** puis les Step Contracts et leurs fonctions déterministes ; proposition d'un template commun de spécification pour chaque étape.
- Réconciliation importante : le langage conversationnel parle de **72 étapes chronologiques runtime** ; la branche conserve **73 Contract Design Sheets**, dont **72 membres du runtime graph** et `GW-73` hors graphe runtime. Aucun contrat n'est renuméroté, supprimé ou fusionné par cet intake.
- Les 8 macro-contrats sont enregistrés comme couche conceptuelle à mapper contre les **18 blueprints existants**, pas comme remplacement automatique.
- Les invariants déjà présents — réutilisation des autorités existantes, pas d'autorité parallèle, transition graph, evidence/attestation — sont préservés et doivent être réutilisés avant toute extension.
- Aucun `candidateSessionId` n'est inventé : aucun provider conversation ID ni connectionInstanceRef client n'a été exposé par la surface courante. Aucun claim candidate n'est requis pour cet intake information-only.
- `GWC-PRE-B-01` reste `READY` ; `candidateWorkDispatched = false` ; `RUNTIME_TASKS_CREATED = 0`.
- `NEXT_ACTION` programme inchangée : lors d'une future continuation, utiliser `NEW_INFORMATION_INTAKE-001` comme entrée bornée de réconciliation pour le backlog candidate, puis reprendre le premier work item dependency-safe/collision-safe.

## 2026-09-19 — NEW_INFORMATION_INTAKE #2 : réconciliation de #1 contre les matrices GWC existantes

- Head observé avant écriture : `a15406fe126732e25292e06f462caffcc40f50f6`.
- Vérification lecture seule préalable : 73 contrats uniques, 72 membres runtime, `GW-73` hors runtime, 91 arêtes sans référence inconnue, 18 blueprints, 18 Detailed Evolution Designs, 0 contrat sans blueprint et 0 mismatch reverse blueprint↔contrat.
- Consigne utilisateur : **ne pas recréer une matrice générique**. Confronter `NEW_INFORMATION_INTAKE #1` aux matrices/registries/design sheets déjà présents et ne produire que les colonnes/bindings manquants.
- Couche manquante à traiter additivement : `GWC ROOT` + `MC-A..MC-H` + `macroContractRef` + Master Construction Crosswalk consolidé. Les familles canoniques `A..I`, les 73 IDs `GW-01..GW-73`, les 18 blueprints et le graphe existant restent inchangés tant qu'une réconciliation ultérieure ne prouve pas un besoin borné.
- Le Master Crosswalk doit consolider, sans nouvelle autorité, les bindings déjà dispersés : Step/GW, famille, macro, blueprint, graphe, classification, integration slot, fichiers/types/fonctions/tests existants, autorités, I/O, préconditions/invariants, actions, dépendances, RED/GREEN/régression, evidence/attestation, findings/décisions, collision domains, DoD, build order et runtime order.
- Ordre prévu : `GWC-PRE-B-01` synthétise le backlog complet à partir de #1/#2 + 18 blueprints + 73 contrats + findings + decisions + code existant ; `B-02` lie précisément les work items aux integration slots/dépendances/tests/preuves ; `B-03` audite trous, doublons, orphelins, conflits d'ownership et bindings manquants.
- Règle existing-first maintenue : `REUSE -> WRAP -> GENERALIZE -> EXTEND -> NEW`.
- Cet intake n'exécute pas B-01 : `candidateWorkDispatched=false`, `RUNTIME_TASKS_CREATED=0`.

## 2026-09-19 — GWC-PRE-C1 DONE / reprise automatique vers C2

- Head GREEN validé : `074f2bd21eef6e23811512453d34670bfecc7485`.
- `GWC-PRE-C1 / AF-19` est fermé sur la branche candidate par extension du gate existant.
- RED : `757ee2a525741eef5cbb36796fc69c62c85a47b2`, MCP CI #1110, échec attendu dans les tests de sûreté.
- GREEN : workflow `a92f8d4dfe2cbf7eeab3603a06e26009cda0243e`, final head `074f2bd21eef6e23811512453d34670bfecc7485`, MCP CI #1112 SUCCESS complet.
- `OD-07` n'est plus un blocker humain : résolue automatiquement par existing-first vers l'option B, sans nouvelle autorité.
- Invariants préservés : OIDC exact-SHA, aucune activation live, aucune mutation main/S1/prod, aucun runtime Task/lock/session.
- `GWC-PRE-C2` devient `READY`.
- `NEXT_ACTION` : réobserver HEAD exact, claim branch-local C2, implémenter AF-22/AF-30 exact-head review evidence + stale-head invalidation en RED -> GREEN -> régression, puis continuer automatiquement.


## 2026-09-19 — Intake #004 minute-liveness — clôture contrôlée

- Branche : `claude/ecstatic-edison-v1dyt1`.
- Head réobservé avant mutation : `4f88e8453523bd62f04989bc7d76b1aa3ad3cf65`.
- Autorisation humaine durable : PR #95 commentaire `5739730790`.
- Deux claims `ACTIVE` ont été reconstitués :
  - `candidate-minute-liveness-20260919T042806Z` / `GWC-PRE-E-GWC-4` : heartbeat #14 à `2026-09-19T04:49:36Z`, âge 3290 s à l'observation => `STALE`. Le claim est libéré et la candidate session clôturée uniquement sous l'autorisation humaine explicite ; aucune propriété n'est transférée automatiquement.
  - `candidate-7afc131430c64c6fe34bcfea` / `GWC-PRE-E-GWC-6` : aucun heartbeat minute utilisable => `UNKNOWN/MISSING_HEARTBEAT`. Claim, session et collision domains conservés `ACTIVE` sans mutation.
- CI #1252 au head `4f88e8453523bd62f04989bc7d76b1aa3ad3cf65` :
  - 6/6 tests spécifiques minute-heartbeat : PASS ;
  - 7 échecs globaux : exclusivement tests RED de `GWC-6`.
- Verdict Intake #004 : `PASS_WITH_EVIDENCE_SCOPE_GREEN_EXTERNAL_GWC6_RED`.
- Aucun fichier source/test de GWC-6 modifié par cette clôture.
- Aucun merge main, S1, runtime, lock, Governed Task ou déploiement.
- NEXT_ACTION : réobserver la session/claim/heartbeat GWC-6 avant toute écriture GWC-6 ; heartbeat absent = liveness UNKNOWN, jamais permission de voler/libérer le claim.

- Checkpoint self-correction : CI #1253 a correctement rejeté le premier bundle de clôture pour `sha256` source divergent ; cause = ordre de clés JSON différent entre le calcul préparatoire et le contenu réellement sérialisé. Empreinte recalculée sur le contenu Git exact et corrigée sans toucher à GWC-6.

## 2026-09-19 — GWC-6 Server Resolver C3 — GREEN fonctionnel, checkpoint en validation

- Work item : `GWC-PRE-E-GWC-6`; claim existant `candidate-7afc131430c64c6fe34bcfea` repris sans transfert d'ownership après réobservation du HEAD et de la fermeture d'Intake #004.
- RED initial : `7d7f7d2acc2d79b0b0a8bd268b7d8e6eb4a972d6`, MCP CI #1243.
- Correction 1 : `d616849f` retire un faux couplage entre les digests du ProjectResolution et ceux de la preuve serveur ; CI #1255 fait passer 6/7 des RED restants.
- Correction 2 : `616fd993` rend l'ordre des alias bruts déterministe et indépendant de la locale ; CI #1256 rend la suite fonctionnelle GWC-6 entièrement verte, avec seulement un gate whitespace externe.
- Normalisation EOF sans changement fonctionnel : `28d0c1e3` et `087b0a23`.
- GREEN final exact-head : MCP CI #1258 SUCCESS sur `087b0a23230c83b6cb1c9069947f48a5d8cc0357` — typecheck, build, docs, governance, GWC verifier, secrets, read-only safety et whitespace tous verts.
- OD-03 : l'identité serveur canonique provient exclusivement de l'ensemble borné `canonicalServerIds`; les variantes de casse peuvent s'y normaliser, l'ID brut reste preuve, alias inconnu => `UNVERIFIED`, le hint ne peut que désambiguïser un serveur déjà lié au projet, les chemins ne deviennent jamais identité et l'environnement reste préservé.
- Frontière d'autorité : resolver `READ_ONLY`; aucune mutation GitRegistry, SSH, main, S1, production, Task/lock runtime ou autorisation implicite.
- Bundle canonique : `docs/gwc/canonical-memory/pr95-e-gwc6-server-resolver-complete`.
- Le claim GWC-6 reste `ACTIVE` jusqu'au SUCCESS de la CI du checkpoint ; ensuite seulement : release et dispatch `GWC-PRE-E-GWC-7`.

## 2026-09-19 — GWC-7 Runtime Resolver — recovery et GREEN final

- GWC-7 a été repris après heartbeat STALE uniquement après autorisation humaine explicite (PR #95 comment 5739928009) et réobservation du HEAD/claim/RED.
- Ancienne session candidate-7afc131430c64c6fe34bcfea fermée ; claim GWC-7 libéré explicitement ; replacement candidate-52e3b52226bf3462e7b112de en reprend exactement le collision domain.
- RED de référence : CI #1270 @ 2855d0e0a4033feb3670b3d3c71315b2ac83c7e6, échec attendu car runtime.ts absent.
- RuntimeBinding ajouté en lecture seule : NO_RUNTIME, CHECKOUT_ONLY, DOCKER, DOCKER_COMPOSE, SYSTEMD, PROCESS_MANAGER, PASSENGER ; cardinalité NO/SINGLE/MULTI_RUNTIME.
- Vérité runtime = observation serveur ; Live State = projection réconciliée ; déclaration registry = cross-check non overriding ; missing/stale => UNVERIFIED.
- Premier GREEN complet : CI #1273 @ dffc5c3a73814c97b2a3728826fd2719bddf34dc.
- Self-review : couverture explicite DOCKER/SYSTEMD ajoutée sans élargir le comportement.
- FINAL GREEN : CI #1274 @ 9a25bf544769e448e15c17b9006720212b5b888d.
- Aucun restart, SSH/runtime mutation, Task runtime, lock runtime, main/S1/production/deploy.
- Checkpoint canonique GWC-7 en validation ; claim conservé jusqu'à CI exact-head SUCCESS.

## 2026-09-19 — GWC-8 Domain Resolver C5 — GREEN final, checkpoint en validation

- Récupération gouvernée : le claim `candidate-52e3b52226bf3462e7b112de` était stale mais non libéré automatiquement. Après réobservation du HEAD `4d887146...` et autorisation humaine explicite (PR #95 comment 5740053066), il a été libéré et transféré uniquement pour GWC-8 à `candidate-gwc8-recovery-4d887146-20260919`.
- La projection de récupération a été validée par MCP CI #1278 SUCCESS sur `755a75bcdc80bc7f74554d25885a7f84684ab7cc`.
- RED : MCP CI #1282 FAILURE attendu sur `54a108d591801f9895309476c81cf350883ee122`, 10 tests GWC-8 échouant uniquement par absence du module Domain Resolver.
- Premier GREEN : MCP CI #1283 SUCCESS sur `197248bd7ebb4d8d3a2a00bc99799c0b72d12f41`.
- Self-review : compatibilité réelle GitRegistry V2 — `componentRole` est optionnel sur des mappings historiques. CI #1284 a prouvé l'incompatibilité de schéma ; CI #1285 a ensuite isolé l'invention incorrecte d'un rôle `OTHER` dupliqué.
- Correction finale : une preuve mapping sans rôle explicite fusionne avec une déclaration projet existante du même domaine, sans créer une nouvelle autorité de rôle.
- GREEN final : MCP CI #1286 SUCCESS sur `d6240484e387770751d9d3db476ac3b9470c74ce` — typecheck, build, docs, governance, GWC verifier, secrets, read-only safety et whitespace tous verts.
- Politique GW-09 : `NONE` seulement si déclarations et observation courante prouvent l'absence de surface ; observation manquante/stale => `UNVERIFIED`; historicalVhosts exclus explicitement ; conflits de rôle => `AMBIGUOUS`; `protectedDomains` reste une safety list et non un registre.
- Frontière : resolver `READ_ONLY`; aucune mutation vhost/SSH, aucun probe déclenché, aucune autorisation implicite, aucune écriture main/S1/production.
- Bundle canonique : `docs/gwc/canonical-memory/pr95-e-gwc8-domain-resolver-complete`, source SHA-256 `d9c420197de25d17198f86687aa56b558755b8996cd7d99b703882602323537c`.
- Le claim GWC-8 reste `ACTIVE` jusqu'au SUCCESS de la CI exacte du checkpoint ; ensuite seulement : release et dispatch GWC-9.

## 2026-09-19 — GWC-9 Governance inheritance / effective capabilities — GREEN final, checkpoint en validation

- RED CI #1298 sur `e1d9caf1ee8704328113524348f273b689b67ecf` : 9 échecs attendus, dont AF-32 (les 3 mutations Task `operational-write` ne traversaient pas le shadow gate) et 8 échecs car le composer GW-10/GW-11 n'existait pas.
- GREEN initial CI #1300 sur `2cfab21e393bf4f070b725aaf9bcf2360f8dc1b4` : composer existant-first + wiring shadow AF-32 intégralement verts.
- Self-review : ajout d'une preuve runtime que `wouldBlock=true` reste non bloquant en mode shadow. CI #1301 a échoué uniquement car le nouveau fixture ne définissait pas les variables d'environnement de test requises ; aucun défaut produit.
- GREEN final CI #1302 sur `ff85ab51ae59df044ad179abe0865374e41f2412` : typecheck, build, docs, gouvernance, GWC verifier, secret scan, read-only safety, cartographie et whitespace tous verts.
- GW-10/GW-11 réutilisent strictement `CapabilityReality`, `GovernanceDecision` et `Scoped Write Gate`; aucun second moteur de gouvernance ni seconde autorité de capacité.
- Sécurité : UNKNOWN ne devient jamais permission ; composition monotoniquement restrictive ; conflit entre snapshot capability et capability utilisée par GovernanceDecision => `CONFLICT`; une attestation client ne peut pas écraser une réalité serveur contradictoire.
- AF-32 fermé en shadow : `mcp_reconcile_agent_intent`, `mcp_claim_next_governed_task`, `mcp_transition_governed_task` traversent désormais le même `decorateScopedWriteServer`.
- Aucun mode enforcing ajouté ; le résultat historique des handlers reste inchangé.
- La classification catalogue reste `operational-write`, donc le digest/cartographie ne change pas ; la régression `functionCartography` est verte.
- Bundle canonique : `docs/gwc/canonical-memory/pr95-e-gwc9-governance-capabilities-complete`, source SHA-256 `1df2c7b9a971b2583d041efeb938d492180e97565844beebe8a26921c7cae843`.
- Claim GWC-9 retenu jusqu'au SUCCESS exact-head du checkpoint.

## 2026-09-19 — GWC-10 Multi-repository TargetScope — GREEN final, checkpoint en validation

- RED CI #1314 sur `5c297b6bf229198296dec51651ca0080af9ab6ef` : 8 échecs GWC-10 attendus ; 2 contrôles de compatibilité historique déjà verts.
- GREEN complet initial CI #1328 sur `d150dc52b49b1cb74ab2063be5445d5e826f1673`.
- Self-review CI #1329 : un seul défaut réel détecté — l'égalité de `TargetScope` dépendait de l'ordre du tableau de composants. Les scénarios tâches disjointes, locks composants disjoints, Receipt multi-SHA et stabilité Live State étaient déjà verts.
- GREEN final CI #1330 sur `67197cd12e13f450734b403c4b85e26dc9760c60` après canonicalisation de l'égalité de scope.
- `TargetScope` et `TargetContext` sont les seuls nouveaux primitives ; GitRegistry V2, Operational Memory et Live State restent les autorités existantes.
- Session / Task / Lock / BootstrapReceipt gagnent un `TargetScope` **optionnel**. L'absence conserve exactement la sémantique historique mono-repository ; elle ne signifie jamais « tous les composants » et aucun backfill n'est effectué.
- Une Task possède le sous-ensemble exact de composants de son `TargetScope` ; `ownerGovernedSessionId` reste l'owner de Task. Deux scopes composants disjoints restent indépendants.
- Les locks composants sont minimaux (`component:<targetId>:<mappingId>`) et n'élargissent jamais automatiquement au projet.
- `TargetContext` conserve les SHAs GitHub/runtime indépendants par composant. Aucun `PROJECT_SHA` n'est synthétisé.
- Un BootstrapReceipt multi-composant conserve le `TargetContext` scoped et met les champs SHA legacy `githubHead` / `runtimeRevision` à `null` au lieu de fabriquer un SHA projet.
- Un composant non résolu reste `UNVERIFIED` localement et ne rend pas ses composants frères faux.
- Bundle canonique : `docs/gwc/canonical-memory/pr95-e-gwc10-multi-repository-target-scope-complete`, source SHA-256 `5461517162540bdcffc070759da63edea4aa35f2b1e24e932d488c5ae9795ebe`.
- Claim GWC-10 retenu jusqu'au SUCCESS exact-head du checkpoint.

## 2026-09-19 — GWC-11 Authority docs / Integration slot / exact GitHub baseline — GREEN final, checkpoint en validation

- La gouvernance documentaire est désormais **project-scoped** tout en conservant exactement la déclaration MCP historique par défaut : mêmes documents canoniques, mêmes clés canonical-state, même CI `docs:check`.
- GW-21 `AUTHORITY_DOCUMENT_READ` réutilise les digests existants d'inventaire documentaire, de déclaration et de cartographie ; aucune copie de contenu documentaire n'est érigée en nouvelle autorité.
- GW-22 `INTEGRATION_SLOT_RESOLUTION` est le seul primitive réellement nouveau : resolver pur sur les inventaires Current State existants (modules / Markdown / tools). Il retourne `NONE` plutôt que d'inventer un owner.
- GW-23 `EXACT_GITHUB_BASELINE` réutilise le `GithubOperationalContext` existant et lie la baseline au SHA exact de la branche observé **après** le début de l'étape.
- Les preuves stale/unavailable échouent fermées : GW-22 ne résout aucun slot depuis un inventaire stale ; GW-23 refuse une baseline replayée d'une étape précédente, une sous-preuve GitHub stale/unavailable ou un head contradictoire.
- Aucun nouveau store, observateur GitHub, inventaire documentaire, cartographie, droit ou mutation.
- RED documentaire CI #1343 sur `faded07fa88873093afe1ea6bca0ab2607a964ef`.
- RED runtime CI #1344 sur `34fb4cf3959a3d7f101a984b4fd9e6476ead242f` : governance tests verts et exactement 7 tests GW-21/22/23 rouges car module absent.
- Premier GREEN CI #1345 sur `0cdc2e01436351f41b144a7a45f5b7b15590ae9d`.
- Self-review CI #1346 sur `ac9aad1f3e73fb60e8a102ff46d86fecb29a09d4` : deux vrais fail-open de fraîcheur détectés puis corrigés.
- GREEN final CI #1348 sur `2a82e278319dd750db2a6d870fc029fe296a66a6`.
- Bundle canonique : `docs/gwc/canonical-memory/pr95-e-gwc11-authority-baseline-complete`, source SHA-256 `2dacb7e9fc2fe2dd80280e5730e80463803c1ce35c8d801c63e7eddc43d5c627`.
- Claim GWC-11 retenu jusqu'au SUCCESS exact-head du checkpoint.

## 2026-09-19 — GWC-16 Documentation and closure — GREEN final, checkpoint en préparation

- Work item : `GWC-PRE-E-GWC-16`; contrats `GW-58..GW-72`; claim candidate `candidate-gwc8-recovery-4d887146-20260919` conservé ACTIVE jusqu'au SUCCESS du checkpoint exact-head.
- RED initial : MCP CI #1433 sur `c504f22277fa3b5b8dd5fa8ae9a8f79f86f1e906` — 588 tests, 573 PASS, exactement 15 échecs attendus `ERR_MODULE_NOT_FOUND` pour le module terminal absent.
- Premier GREEN : MCP CI #1435 sur `476f676817500f7c7d520933d32cd9022e03c3fb` — 588/588 PASS.
- Self-review RED : MCP CI #1437 sur `f8ab3ce16132a74248516d805b5cadd233d08af0` — 589 tests, 582 PASS, exactement 7 échecs sur GW-59/60/61/63/68/69. Deux écarts réels ont été prouvés : payloads EffectPlan GitHub non encore conformes aux schémas exacts des outils existants, et matrice de preuve terminale GW-68 incomplète.
- Correction existing-first : les plans GitHub utilisent désormais les schémas réels `github_create_branch`, `github_create_commit`, `github_create_pull_request`, `github_merge_pull_request`; GW-60 réutilise le commit multi-fichiers existant au lieu d'inventer une mutation documentaire parallèle.
- Hard gate GW-68 : `NO_FALSE_DONE` exige une cohérence unique entre Task VERIFYING, owner session, Bootstrap Receipt/stateVersion, CI exacte, déploiement exact, review, locks, Live State courant, documentation alignée et SHA/runtime final. Un conflit de session, SHA, CI/deploy, review ou lock étranger bloque la terminalité.
- GW-69 ne planifie `DONE` qu'à partir d'une preuve GW-68 liée au même task/session/receipt/state/head/runtime ; son digest de preuve est conservé dans le résultat du planner, tandis que le payload envoyé à `mcp_transition_governed_task` reste strictement compatible avec l'outil existant.
- Ordre de fermeture préservé : VERIFYING → terminal verification → DONE → checkpoint → release locks → close session → queue reconcile. Les locks sont libérables indépendamment du succès métier dès lors que le checkpoint terminal existe.
- CI #1439 sur `77fcd4e85317939b7a24afad2d29630e2504eed5` : 588/589 PASS ; seul le fixture stale GW-63 omettait le nouveau `mergeMethod`, sans défaut produit. Fixture corrigé sans relâcher l'implémentation.
- GREEN final : MCP CI #1440 SUCCESS sur `b8a86c48eb24902f998d4533e6bbeac5144102c6` — 589/589 PASS, 0 skipped, discoveredTests=75, runnerTests=74, dedicatedTests=1 ; typecheck/build/docs/governance/GWC/secrets/read-only/whitespace verts.
- Frontière : aucun merge main, aucune mutation S1/production, aucun déploiement, aucune Task/lock/session runtime exécutée par le PRECODE ; `src/governedWorkflow/terminal/index.ts` reste une couche pure d'évaluation/EffectPlan et ne crée aucune seconde autorité.
- NEXT_ACTION : matérialiser le checkpoint canonique GWC-16, valider sa CI sur le HEAD exact, puis seulement libérer le claim et dispatcher `GWC-PRE-E-GWC-17`.

## 2026-09-19 — GWC-17 Universal Acceptance — GREEN final, checkpoint en préparation

- Work item : `GWC-PRE-E-GWC-17`; contrat `GW-73 UNIVERSAL_ACCEPTANCE`, explicitement hors du graphe runtime nominal. Le claim PRECODE reste ACTIVE jusqu'au SUCCESS du checkpoint exact-head.
- Périmètre volontairement **tests-only** : `tests/governedWorkflowUniversalAcceptance/`; aucun fichier `src/` n'a été modifié par GWC-17 et le harnais n'est importé par aucun code runtime.
- RED initial : MCP CI #1451 sur `0b55d140a6b32be82d81192d2df12c3cabd8a893` — 597 tests, 589 historiques PASS, exactement 8 échecs attendus par absence du harnais.
- Premier GREEN : MCP CI #1454 sur `cf9f62f4b36ccf8eac6f477becb7c45505053174` — 597/597 PASS.
- Self-review RED : MCP CI #1456 sur `da1ea9fb30d056bf21761dcfe3fa818de9c2c70e` — 598 tests, 595 PASS, exactement 3 échecs attendus : binding du gate GW-68 au Contract Registry canonique, contrôle négatif du détecteur anti-hardcode et attribution des contrats défaillants.
- GREEN final : MCP CI #1458 SUCCESS sur `9b32bba86e830845ea63d90f37bf304d800b8f12` — 598/598 PASS, 0 skipped, discoveredTests=76, runnerTests=75, dedicatedTests=1.
- Scénario MCP historique : l'absence de TargetScope conserve strictement `LEGACY_SINGLE_REPOSITORY / Patricked-code/MCP`; aucun branchement MCP spécifique n'existe dans les chemins gouvernés.
- Scénario réel Stablecoin : fixture sourcée depuis PR #86, projet `CS-STABLECOIN-001`, frontend `Patricked-code/Stablecoin`, S2, runtime PASSENGER, domaine/public API déclarés, backend conservé `LIVE_DISCOVERY_REQUIRED` sans repository inventé.
- Scénario multi-composants synthétique : SHAs GitHub/runtime indépendants, aucun `PROJECT_SHA`, locks composants distincts et isolation locale d'un composant UNVERIFIED.
- Recovery Intake #003 : stale/missing heartbeat ne transfère ni ownership ni autorisation ; existing claim repris en CONTINUE ; plan runner déterministe, acknowledgement obligatoire, stale envelope refusée, intake dédupliqué, recovery anchor `REOBSERVE_THEN_DECIDE`, déploiement sans attestation bloqué par GW-68, aucun transcript brut/secret persisté.
- Anti-hardcode : scan des chemins gouvernés sans littéraux cible MCP/Stablecoin/Chainsolutions/S1/S2 et contrôle négatif injectant volontairement des littéraux interdits pour prouver que le détecteur échoue bien.
- Fail-closed : un scénario forcé en échec rend le rapport GW-73 `FAILED` et expose l'ensemble exact des `failedContracts`; aucun scénario n'est silencieusement SKIPPED.
- Frontière : aucune mutation main/S1/production, aucun déploiement, aucune Task/Session/Lock runtime et aucune nouvelle autorité.
- NEXT_ACTION : matérialiser le checkpoint canonique GWC-17, valider sa CI exact-head, libérer GWC-17 seulement après SUCCESS puis lire les autorités Phase F / final candidate gate avant toute intégration.


## 2026-09-20 — Phase F-06 Integration Package Audit — paquet matérialisé, validation exact-head requise

- `GWC-PRE-F-05` est clôturé par MCP CI #1484 SUCCESS sur `0fd7d9cc1758ae5a2b4e19697af76189c977053a` : 76 fichiers de tests découverts, 601/601 tests runner PASS, 13/13 governance PASS, zéro test historique supprimé, typecheck/build/docs/GWC/secrets/whitespace verts.
- `GWC-PRE-F-06` est le dernier work item du gate candidat ; claim branch-local `candidate-gwc8-recovery-4d887146-20260919`, sans Task/Session/Lock runtime.
- Audit : `DEPLOYMENT_PRODUCTION.md` possédait déjà la chaîne exact-SHA et le rollback runtime ; `PRECODE_ACTION_TASK_FLOW.txt` possédait déjà INTEGRATE-01..07 ; `MIGRATION.md` ne reliait pas encore de bout en bout delta main, drift, rollback, attestations live et DoD post-intégration.
- Correction existing-first : enrichissement de `MIGRATION.md` et liaison depuis `DEPLOYMENT_PRODUCTION.md`, sans nouveau moteur, outil, store ni workflow.
- `CANDIDATE_HEAD` certifie la PR avant fusion ; `MERGE_SHA` est la réalité GitHub après fusion ; `DEPLOY_SHA` doit être exactement `MERGE_SHA`. Aucune égalité HEAD candidat/merge SHA n’est supposée.
- Si `main` ou la candidate évolue, réconcilier sur la branche et rejouer les preuves affectées ; conflit/UNKNOWN/stale/ownership concurrent échoue fermé.
- Rollback : avant merge aucune mutation prod ; après merge Git est revert/fix-forward via PR, jamais réécrit ; échec runtime = rollback d’image existant puis réconciliation GitHub/runtime.
- Frontière : aucun merge `main`, aucune mutation S1/production et aucun déploiement avant attestation finale F-06.
- Preuve SHA sans auto-référence : `PACKAGE_HEAD_F06` est le head du paquet validé ; le futur `CANDIDATE_HEAD` est le HEAD de PR réobservé après le commit de clôture F-06 et doit lui-même avoir une CI exact-head verte. Le commit de clôture ne tente pas d’encoder son propre SHA.
- NEXT_ACTION : valider la CI exacte du paquet F-06 ; si verte, enregistrer la preuve finale, libérer le claim et émettre seulement alors `FINAL_PRECODE_VERSION_ACCEPTED / EVOLVED_CANDIDATE_READY_FOR_INTEGRATION`.


## 2026-09-20 — PR #95 INTEGRATE-04 — findings Codex P1/P2 corrigés en TDD

- Le passage de la PR #95 en `Ready for review` a déclenché une review Codex sur le HEAD `938a7f01b4404c7980711b372746d08c3861f6f7`.
- P1 confirmé : `src/deploy/s1Deploy.ts` générait un worker Bash où `write_attestation()` n’était pas fermé avant `http_code()`. Conséquence : `bash -n` échouait et un déploiement pouvait rester en polling jusqu’au timeout.
- P2 confirmé : `src/tools/githubLifecycle.ts` forçait `mode: 100644` lors d’un remplacement de fichier Git, pouvant retirer `100755` à un exécutable ou casser la sémantique d’un symlink `120000`.
- TDD RED : MCP CI #1497 sur `849e73eba7744413925e9ed79461e7b4fe08999e` — 604 tests, 601 PASS, exactement 3 échecs attendus : syntaxe du worker, préservation `100755/120000`, refus d’un base tree tronqué.
- GREEN source : MCP CI #1499 SUCCESS sur `a8a32547c05a25da900dc2417f37b6ef3da4f8a8` — 604/604 PASS, 0 skipped ; typecheck, build, docs, gouvernance, GWC, secrets et whitespace verts.
- Correctif P1 : fermeture explicite de `write_attestation()`; le worker généré est désormais validé par `bash -n`.
- Correctif P2 : lecture du base tree Git, conservation des modes blob remplaçables `100644`, `100755`, `120000`, défaut `100644` uniquement pour un nouveau chemin et échec fermé `GITHUB_BASE_TREE_TRUNCATED` si GitHub signale un tree tronqué.
- Les chemins existants non remplaçables comme blob échouent fermé via `GITHUB_EXISTING_PATH_NOT_REPLACEABLE_BLOB`.
- Gouvernance : `TASK-20260920-001` reste bloquée jusqu’au HEAD documentaire final vert et à la résolution explicite des deux review threads. Aucun merge `main`, aucune mutation S1/runtime et aucun déploiement n’ont été effectués.
- NEXT_ACTION : valider le HEAD final après traçabilité documentaire, répondre/résoudre les deux threads P1/P2, réobserver `main` + ruleset + check `validate`, puis seulement réouvrir l’admission de merge.
