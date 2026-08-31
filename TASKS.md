# TASKS.md

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

Plan opérationnel exécutable. Les événements détaillés restent dans `ACTIVITY_LOG.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` et les PR GitHub. Les identifiants, propriétaires, branches et états runtime dynamiques restent dérivés de la Governed Task Queue et d'Operational Memory; ce fichier ne remplace pas ces autorités.

`ROADMAP.md` décrit tous les chantiers/lots connus. `TODO.md` contient ce qui reste à accomplir. Ce fichier ne pré-crée pas toutes les tâches futures : une `TASK-...` n'est considérée officielle qu'après son enregistrement dans Operational Memory.

## Jalons terminés

- PR #44, #45, #47, #49, #52 et #55 fusionnées selon la gouvernance ; PR #50 fermée sans fusion comme doublon exact de la PR #49.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- PR #45 : merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255`, deploy `31907827212`, job `95068288136`.
- PR #47 : head `8dddc5656aa959f4c392d0f1816b5ee0e25709a0`, merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, deploy `32535404345`, job `96935241275`.
- PR #49 : head `1c9297d663624e5c348fba687051b649ca3e2a22`, CI `32565936838`, merge `c944fd9e7c05aad503f9e1d5d21e0ead25747886`; GitHub/S1/OCI/runtime exact-SHA attestés à cette étape.
- PR #52 : head `33a3e424a5fe271cf82c1ee6db8c94785289e3ca`, CI PR `33213114008`, merge `fff44ff2db386942730a67f3884980c7824cae7f`, CI main `33214825660`, deploy `33214825772`, job `98996005106`.
- PR #54 : réconciliation strictement documentaire post-PR #52, fusionnée au SHA `a35280e172e40525689520e1443ccd59e850e91a`; CI main `33222774901` et Governed Deploy `33222774905` réussis.
- PR #55 : head `de0030b0df42a693d2e96c87f008c9ffd1c2ce04`, CI exact-head `33256403390` / job `99110808499`, merge `2c2dde2bffe62b2685bf2fad94530571762470c8`, CI main `33256566688`, Governed Deploy `33256566695` / job `99111230626`; GitHub, S1, origin/main et runtime attestés au même SHA.
- PR #60 : premier lot de connexion gouvernée fusionné et déployé au SHA `211a7de7940f115aa997f404927a8e0c9ace9055`.
- PR #62 : head `2e8fa683296f4f1bf53b9875104598696ba9c6e2`, CI PR #645 / run `33442649238` / job `99654287301`, merge `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`, CI main #646 et Governed Deploy #19; GitHub/S1/runtime attestés au même SHA et Docker healthy.
- PR #63 : réconciliation documentaire post-PR #62 fusionnée au SHA `a026616fbf2df47962243bfcff46ac734bed50ba`; elle ne modifie que la documentation canonique et constitue le dernier jalon GitHub connu avant la présente stabilisation de roadmap.

## Tâche clôturée

### TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — TERMINÉE

- [x] portée initiale, PR #44/#45, Autodeploy et première réconciliation canonique ;
- [x] qualification et reproduction RED des trois findings tardifs PR #45 ;
- [x] GREEN PR #47 `12/12 + 188/188` et double CI exacte ;
- [x] préservation de la grâce de reprise des sessions expirées ;
- [x] rétention des locks actifs au TTL écoulé avec audit et nettoyage de projection ;
- [x] exception S1 docs-only limitée à la même référence GitHub déclarée ;
- [x] journaux canoniques synchronisés avant déploiement ;
- [x] PR #47 fusionnée avec garde exact-head et Autodeploy exact-SHA attesté ;
- [x] trois threads tardifs PR #45 résolus après déploiement attesté ;
- [x] réconciliation documentaire finale publiée par PR #48.

## Tâche précédente — preuve runtime finale sous autorité Operational Memory

### TASK-20260822-001 — Mandatory Agent Bootstrap & Work Orchestration V1

- [x] dériver le catalogue complet depuis les registrations MCP et protéger sa fraîcheur en CI ;
- [x] dériver du SHA suivi les modules, imports, routes, documents, audits et politiques sans écriture ;
- [x] enrichir Live State avec catalogue, gouvernance, baseline d'audit et inventaire ;
- [x] ajouter Task Registry, queue persistante, ordre priorité/séquence, dépendances, conflits et révisions optimistes ;
- [x] créer le Bootstrap Receipt sanitizé lors de l'acquittement ;
- [x] exposer l'inventaire courant et les outils de queue MCP ;
- [x] enrichir Governed Context, le dashboard, l'onboarding réel, le journal et le gate `shadow` ;
- [x] conserver les 92 contrats historiques et un diff nul sur OIDC/Autodeploy ;
- [x] corriger les findings tardifs PR #49 et les écarts de gate/catalogue par PR #52 ;
- [x] fusionner PR #52 et attester CI/Autodeploy/GitHub/S1/OCI/runtime au SHA fonctionnel `fff44ff2db386942730a67f3884980c7824cae7f` ;
- [x] fusionner et attester la réconciliation documentaire via PR #54, merge `a35280e172e40525689520e1443ccd59e850e91a` ;
- [ ] lorsqu'une preuve actuelle est requise, lire Operational Memory pour connaître le checkpoint final, les locks et le cycle de session ; ne pas déduire ces états dynamiques de ce fichier.

## Chantier historique — Unified Operational Work State

La livraison fonctionnelle de `TASK-20260829-001` est fusionnée et déployée. Les statuts finaux de tâche, checkpoint, locks et session restent exclusivement sous l'autorité d'Operational Memory.

- [x] composer une réalité opérationnelle à partir des autorités existantes sans second store ni seconde source de vérité ;
- [x] ajouter `CapabilityReality` avec registration, callability, authorization, `safeNow`, reason codes et preuves requises ;
- [x] ajouter `TaskReality` avec phase observée, drift, contradictions et chemin de lifecycle ;
- [x] enrichir le contexte GitHub avec branche/head exact, PR, checks requis, reviews, threads, ruleset, ownership, activité, fraîcheur et provenance de cache ;
- [x] ajouter `GovernanceDecision` comme projection bornée de l'opération, tâche, session, owner, bootstrap, dépendances, scopes, locks, GitHub, runtime et capability ;
- [x] préserver le WRITE gate `shadow` et la parité des contrats historiques ;
- [x] exposer l'observabilité unifiée dans Governed Context et le dashboard sans nouveau collecteur parallèle ;
- [x] intégrer Observer Before Actor dans le chemin réel de Governed Context ;
- [x] pour une session d'intake sans branche, observer la `workBranch` portée par la tâche courante avant le fallback d'entrée ;
- [x] propager les `reasonCodes` GitHub observés vers `GovernanceDecision` afin qu'un check/review bloquant rende la mutation non sûre ;
- [x] distinguer explicitement cache miss, auth manquante/invalide, permission, not-found/invisible, timeout, stale, head mismatch, checks et reviews bloquantes ;
- [x] observer le HEAD read-only de `workBranch` avant la création d'une PR lorsque la branche existe ;
- [x] corriger les quatre findings finaux : SHA de chaque check-run, preuve de déploiement liée au `runtimeRevision` de la tâche, agrégation des rulesets applicables et nombre d'approbations requis ;
- [x] obtenir la CI exact-head de PR #55 : run `33256403390`, job `99110808499`, `250/250` tests, typecheck/build/docs/gouvernance/secrets/diff verts ;
- [x] résoudre tous les threads actionnables et satisfaire le ruleset `protect-main` ;
- [x] fusionner PR #55 avec garde `expected_head_sha` au merge `2c2dde2bffe62b2685bf2fad94530571762470c8` ;
- [x] attester CI main `33256566688` et Governed Deploy `33256566695` / job `99111230626` sur ce SHA exact ;
- [x] réattester GitHub main, S1 HEAD, S1 origin/main et runtime healthy au SHA `2c2dde2bffe62b2685bf2fad94530571762470c8` dans Live State `51` ;
- [ ] si le statut runtime final de `TASK-20260829-001` doit être attesté de nouveau, le lire depuis Operational Memory/Task Reality plutôt que le réécrire ici.

## Chantier livré côté GitHub — TASK-20260829-002 Automatic Governed Connection Bootstrap

- [x] auto-corréler l'identité OAuth authentifiée et le nouveau transport à l'unique Governed Session compatible ;
- [x] conserver `NONE`, `AMBIGUOUS`, `IN_USE` fail-closed et le refus des credentials partagés ;
- [x] redacter `sessionId` et `transportSessionId` dans Pino ;
- [x] câbler `/mcp initialize` avec `req.auth`, `sessionRequestFromToolExtra()` et l'attente du bootstrap ;
- [x] fusionner et déployer le premier lot par PR #60 au SHA `211a7de7940f115aa997f404927a8e0c9ace9055` ;
- [x] reproduire le churn réel `sessionRevision=66 → 67 → 68` et obtenir les RED CI #626/#628 ;
- [x] corriger par `ATTACHED` sans mutation durable pour les sessions non terminales, tout en conservant `RESUMED` pour `EXPIRED` ;
- [x] ajouter la régression anti-vol de session : les bindings actifs existants restent intacts ;
- [x] valider le head `2e8fa683296f4f1bf53b9875104598696ba9c6e2` par CI PR #645, `258/258` tests et tous les gates ;
- [x] fusionner PR #62 sous garde exact-head au SHA `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53` ;
- [x] attester CI main #646, Governed Deploy #19, GitHub/S1/runtime exact-SHA, S1 propre et Docker healthy au jalon fonctionnel ;
- [x] vérifier en production trois lectures successives stables à `sessionRevision=68` au jalon observé ;
- [x] fusionner la réconciliation docs-only par PR #63 au SHA `a026616fbf2df47962243bfcff46ac734bed50ba` ;
- [ ] ne maintenir ici aucun faux statut runtime : `DONE`, checkpoint, locks et cycle de session doivent être lus depuis Operational Memory lorsqu'une attestation actuelle est nécessaire.

## Prochaine tâche candidate — non enregistrée

### Project Context Resolution — Client/GitHub/Repository/Project Binding

Statut documentaire : `PLANNED / NOT_REGISTERED`.

Aucun `TASK-...` n'est attribué ici tant que la Governed Task Queue / Operational Memory ne l'a pas officiellement enregistré.

Objectif borné : prolonger le bootstrap existant sans refaire la session automatique, afin de résoudre progressivement :

```text
principal OAuth
→ Connection Context minimal
→ GitHub identity
→ repository
→ GitRegistry V2 mapping
→ project
→ server/runtime/domain
→ governance héritée
```

Autorités existantes à réutiliser : OAuth, Operational Memory, Governed Session, GitRegistry V2, `.mcp/server-map.json`, Live State, Governed Context, Bootstrap Receipt et permissions existantes.

Interdictions : aucun nouveau Session Manager, aucun second GitRegistry, aucune seconde Task Queue, aucun choix arbitraire en cas d'ambiguïté, aucun secret dans Git, aucune création de ressource dans ce premier lot de résolution.

Les sous-lots, dépendances et lots ultérieurs sont décrits dans `ROADMAP.md`. `TODO.md` porte uniquement le travail restant correspondant.

## Maintenance séparée

- [ ] Migrer dans une PR dédiée les GitHub Actions encore exécutées sous compatibilité Node 24.
- Toute évolution `WRITE gate shadow → enforce` exige un GO, une décision et une PR distincts.
- La 2FA GitHub reste explicitement exclue.

## Interdictions préservées

- aucun push direct sur `main` ;
- aucune écriture ou branche GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset, clean, rebase ou force pour aligner la production ;
- aucune modification de la 2FA ;
- aucun nouveau store d'état global concurrent de Live State, Operational Memory, Governed Task Queue ou GitHub.
