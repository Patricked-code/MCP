# SUIVI.md — Point de reprise courant

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

Date : 2026-09-11

## Point courant — B2 Repository Resolution livré fonctionnellement, réconciliation documentaire en cours

- GitHub `main`, S1 HEAD, S1 `origin/main` et runtime healthy sont observés au SHA exact `f2c90902a627ee9209d805403e584f3123a0453a` ; S1 est propre/read-only et l'image active est `sha256:f4873739812999349d57f4dd02337cf2e873c81e9bfd938e53a86bedebb9334a`.
- Governed Session : `98e9aee8-20c0-404f-807f-6630ffbb1a1c`, active ; tâche `TASK-20260909-001` `VERIFYING` révision 7. Le blocker unique de Live State `163` est `DOCUMENTATION_DRIFT`, porté par les déclarations pré-merge encore présentes dans les projections canoniques.
- Livraison fonctionnelle : PR #75 fusionnée sous garde du head exact `dd2a9a7894f928aa5dac886c79dc269ea3838a7b` au merge `f2c90902a627ee9209d805403e584f3123a0453a`; MCP CI main #811 et MCP Governed Deploy #29 ont réussi sur ce SHA exact.
- Réconciliation finale strictement documentaire préparée sur `mcp/b2-final-documentation-20260911`; elle ne modifie aucun TypeScript, test, workflow, secret, WRITE gate, registre, store, S1 ou runtime.
- Design approuvé : checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`, spec/plan sous `docs/superpowers/`.
- Conflit réconcilié : le lot distant concurrent mélangeait Policy V3, permissions/access levels, routage global et observateur credential parallèle. Il a été annulé sans force-push ; son historique demeure auditable mais son arbre n'est pas livré.
- Implémentation additive locale : resolver pur `src/github/repositoryResolution.ts`, vue d'évidence dans GitRegistry V1 existant, batch éphémère dans `src/tools/durableAccounts.ts`, projection dans le collecteur/cache/service/dashboard existant.
- Preuves acquises : baseline 310/310 ; suite complète locale 357/357 ; typecheck, build, secrets, documentation gouvernée (202 Markdown), cartographie et Current-State Evidence verts, sans contradiction.
- Correctifs de self-review : les statuts HTTP explicites sont évalués avant la fraîcheur afin qu'un 404 reste `UNVERIFIED/GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE` avec visibilité incertaine ; un registre de plus de 1 000 mappings est refusé plutôt que tronqué ; le type de propriétaire doit correspondre au contexte B1 ; les reason codes échoués sont dérivés du statut observé tout en conservant l'absence de credential comme `AUTH_MISSING`.
- Autorités préservées : contexte exact A2.1, identité B1, connexions et secret storage existants, GitHub API live, GitRegistry V1 fallback read-only, Governed Context projection ; GitRegistry V2 reste dry-run jusqu'à C1.
- Frontières : aucune permission/capability, aucun projet/serveur/runtime/domaine, aucune nouvelle authority/registry/store/cache/session/observer/tool, aucun changement WRITE gate ou workflow de déploiement, aucune écriture directe S1.
- Revue indépendante : le premier passage a refusé la livraison sans finding critique, puis six assertions RED ciblées ont reproduit les écarts de cache, validation et bornage (`38/44` au commit `e81e3cd`). Le GREEN `ffc4c96` les corrige ; le second passage conclut `READY`, sans finding Critical/Important/Minor, avec 76/76 tests B1/B2/cache ciblés.
- Prochaine action : publier et revoir la réconciliation documentaire exact-head, la fusionner par le chemin protégé GitHub → S1, exiger Live State `FULLY_ALIGNED`, puis seulement checkpoint, `DONE`, libération des locks et réconciliation de queue.

Les valeurs dynamiques restent à relire dans GitHub, Operational Memory et Live
State avant chaque mutation. B3/C1 et les lots aval restent cartographiés mais ne
sont pas précréés dans la Task Queue.

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
