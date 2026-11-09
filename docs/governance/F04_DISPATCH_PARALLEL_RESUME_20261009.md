# MCP — Reprise gouvernée F-04 et dispatch multi-agents (2026-10-09)

> Evidence de planification GitHub-only, **non autoritative**, observée sur `main@44c4bdf671f9b07aedb4e9b2aa45c72fe46edf9a`. Ce document n'est ni un runtime Task, ni un claim, ni un lock, ni un ordre de déploiement. Toute reprise doit réobserver le HEAD et les autorités live.

## Sources canoniques et ordre de reprise

1. `CLAUDE.md`, `AGENTS.md`, `SOURCE_OF_TRUTH.md`, début courant de `SUIVI.md` ;
2. `docs/governance/program-backlog-convergence.json` puis `npm run program:readiness` et `npm run program:next` dans un checkout fiable ;
3. GitHub live : `main`, PR ouvertes, issues `[PROGRAM INTAKE]`, propriétaire, CI ;
4. `mcp_get_current_state_inventory` via le runtime, ou sondes OIDC read-only approuvées : Task Queue, Sessions, Locks et Live State (NEVER infer values from Git);
5. `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` ; collision/ownership check avant runtime task materialization/claim ; respect des consentements et refus ;
6. RED → GREEN → full regression → PR draft → review → CI exacte → merge gouverné → déploiement gouverné → attestations → `SUIVI.md` → readiness recalculée.

## Etat constaté (ne pas projeter comme état live)

- `main@44c4bdf`, fusion et attestation F-04 incrément 1 ; `TB-W3-F-04` reste **READY**, pas DONE. `SUIVI.md` 2026-10-09 et issue #268 sont les points de reprise actuels.
- Six PR ouvertes observées : #207, #90, #89, #88, #86 et #85. #207 porte A3.2/OAuth et **ne doit pas être repris ou écrasé** par un second agent.
- `.mcp/task-registry.json` : deux **seeds historiques DONE** ; **ce n'est pas la Governed Task Queue runtime**. Il est interdit d'en déduire que la queue runtime est vide.
- `src/operationalMemory/taskQueue.ts` implémente `executableTaskCandidates`, `taskEligibleForSession`, `activeScopeConflict`, `foreignLockConflict`, `taskClaimConflict` et la reprise du travail déjà possédé. `src/currentState/service.ts` expose `workQueue`, `firstExecutableTask`, `nextWork` ; le service publie une **projection read-only**, pas un claim.
- L'état *contenu* des Tasks/Sessions/Locks reste **UNKNOWN** depuis cette surface GitHub ; les sondes OIDC précédentes sont marquées SUCCESS mais leurs artefacts ne sont pas lisibles dans la session. Ne déclarer ni zéro tâche ni absence de collisions.
- Le backlog est plus large que F-04 : programme de 41 work items et blueprints W1→W4, GGCC GitHub, OAuth, provisioning, scopes WRITE, présence client, Super Admin Cockpit, acceptation globale. Les métriques statiques du backlog ne remplacent pas `program:next` recalculé.

## Flux parallèles admissibles (sous contrôle des autorités)

| Flux | Périmètre | Règle d'ownership |
| --- | --- | --- |
| F-04 | Domain binding : preuve des domaines Plesk, sous-domaines, `realPath`, puis étapes consenties | Une seule Task/claim/lock réel sur le domaine concerné ; pas de mutation S1/S2 sans gate |
| A3.2 | OAuth refresh-token continuity, PR #207 | Réservé au détenteur gouverné actuel ; observer seulement depuis un autre flux |
| Dispatch | Validation des projections `nextWork` / Task Queue : tâches distinctes avec scopes disjoints, même scope, lock étranger, reprise propriétaire, dépendances et TargetScope | Tests sans nouvelle Task réelle ; ne pas confondre tests et preuve de dispatch live |
| GGCC / Admin / Cockpit | Autres blueprints READY en ordre du programme | Choisir uniquement après readiness, dépendances, capability et collision check live |

### F-04 incrément 2 — plan de code et tests

1. Préserver l'invariant du `src/liveState/servedDomains.ts` : lecture Plesk bornée en lecture seule, absence non déduite d'une panne, `UNAVAILABLE` quand propriété ambiguë.
2. Modéliser la propriété au niveau du **sous-domaine** avec un `realPath` vérifié et des bindings GitRegistry spécifiques au projet ; ne pas déduire un owner d'un `serverPath` déclaré, d'une simple chaîne de domaine ni d'un parent partagé.
3. Tests RED : deux projets sous `chainsolutions.fr` avec sous-domaines distincts ; alias ; nom non déclaré ; chemins non vérifiés ; répertoires imbriqués/ambiguës ; projet multiplement mappé ; faux positif inter-projet interdit.
4. GREEN minimal sans modifier la posture `fail-closed`. Plesk SQL sur S1/S2 doit être **attesté**, ou rester UNKNOWN ; aucun inventaire hypothétique ne devient preuve.
5. Séparer `observe-binding` des étapes à consentement explicite : `backup`, `bind-domain`, `certificate`, `activate`, `health`, `rollback` ; ne pas considérer le blueprint DONE après le seul incrément 2.

### Dispatch : matrice de validation avant toute déclaration « parallèle certifié »

- Deux Tasks READY, dépendances DONE, TargetScopes et `resourceScopes` disjoints, deux sessions gouvernées distinctes, aucun lock étranger : **deux claims atomiques attendus**, chacun par sa session.
- Même scope sur deux tâches : seule une peut être réclamée, autre bloquée (`TASK_RESOURCE_CONFLICT`).
- Lock étranger : refus (`TASK_LOCK_CONFLICT`).
- Révision de store périmée : refus/relecture ; pas de double claim.
- Session ayant un travail `CLAIMED/IN_PROGRESS/REVIEW/MERGE_READY/DEPLOYING/VERIFYING` : reprendre son travail avant nouveau claim.
- Tâche BLOCKED / dépendance non DONE / TargetScope incompatible : ne jamais distribuer.
- L'inventaire est une projection : vérifier les résultats de deux **sessions réelles** avant de conclure que le dispatch multi-exécuteurs fonctionne en production.

## Si queue vide (uniquement après lecture live)

1. Lire la Governed Task Queue runtime (révision exacte, troncature, état des tâches), sessions et locks ; si inaccessible, consigner **UNKNOWN** et ne pas inventer de tâche ni appeler `initializeSeed` pour la « remplir ».
2. Recalculer readiness et intakes. Pour chaque blueprint READY sans Task équivalente, faire une **matérialisation via le mécanisme gouverné existant** depuis une Governed Session autorisée ; recontrôler les collisions et le store revision avant claim.
3. Ne jamais alimenter la queue par écriture directe dans les JSON de Git ou du volume S1 ; pas de nouveau dispatcher, ni d'identifiant/task forgé.
4. Si aucun READY compatible : consigner globalStopReport suivant la règle existante, avec bloqueurs exacts, ou poursuivre le candidat collision-free suivant.

## Checkpoint / reprise

- **Déjà livré** : F-04 incrément 1 PR #267 puis #269, CI et Governed Deploy au SHA de `main`.
- **Encore à coder** : F-04 incrément 2 et suivants. **Encore à prouver** : deux claims concurrent-safe sur deux sessions runtime, contenu live de la queue, SQL Plesk et `realPath`.
- **Prochaine action gouvernée** : `REOBSERVE_HEAD → READ_LIVE_TASKS_SESSIONS_LOCKS → COMPUTE_READY_AND_COLLISION → F04_RED_TESTS → IMPLEMENT → VERIFY → CHECKPOINT`.
- Le fichier `docs/governance/MASTER_RESUME_MEMORY.md` s'arrête au checkpoint 2026-10-05 pour la première section ; la tête courante de `SUIVI.md` prévaut. Ce document de travail ne doit pas écraser la mémoire historique.
- Ne pas utiliser Codex pour cette exécution ; GitHub direct et contrôles du dépôt d'abord. Ne jamais supposer une session Claude ou un exécuteur actifs simplement parce qu'une PR ou une seed existe.
