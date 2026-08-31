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


Date : 2026-08-31

## TASK-20260829-002 — Automatic Governed Connection Bootstrap & Conversation Session Binding

### Baseline fonctionnelle déployée et attestée

- La PR #60 a fusionné le premier lot fonctionnel au SHA `211a7de7940f115aa997f404927a8e0c9ace9055`.
- GitHub `main`, S1 HEAD, S1 `origin/main` et le runtime OCI sont alignés sur `211a7de7940f115aa997f404927a8e0c9ace9055`; le working tree S1 est propre, le push remote reste `disabled://mcp-s1-read-only` et le conteneur est `running/healthy`.
- Live State `stateVersion=59` confirme l'alignement technique ; le drift restant est documentaire.
- La PR #60 a ajouté l'auto-corrélation OAuth vers l'unique Governed Session compatible, le refus `AMBIGUOUS`, le refus des credentials partagés, la redaction des identifiants de transport et l'attente bornée du bootstrap avant les requêtes MCP suivantes.
- Un finding P1 publié après le merge de la PR #60 demande la présente mise à jour de `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md`.

### Régression découverte après déploiement

- La surface ChatGPT/Codex utilise des transports MCP éphémères successifs. Trois lectures réelles de la même Governed Session ont produit `sessionRevision=66 → 67 → 68`, avec trois `resumedAt` et fingerprints distincts.
- Cause racine : `autoResumeCompatibleSession()` appelait `resumeSession()` pour toute session unique compatible, même déjà `OPEN`, `ACTIVE` ou `PAUSED`. Chaque initialisation remplaçait donc le binding durable et incrémentait la révision avant l'opération suivante.
- Effet : le verrouillage optimiste devenait inexécutable depuis cette surface, car `expectedSessionRevision` était périmé avant d'atteindre le handler.

### Correction gouvernée en cours — PR #61

- Même task et même branche `mcp/automatic-governed-connection-bootstrap-20260829`; aucun nouveau store, moteur de session, chemin de déploiement ou patch S1.
- RED `c1d8bd8112e3df6aa05afc1c42618bd716b78f21`, CI #626 : `actual RESUMED / expected ATTACHED`, exactement un échec sur 257.
- RED serveur `c1ff0aa5f61d61b4d42316dbb672a59b9b223f06`, CI #628 : absence du reason code d'attachement éphémère confirmée.
- GREEN `8a0e6fc0903bfdce04f2c476df50bee013fd1b9a`, CI #635 : typecheck, build, docs, gouvernance, secrets, whitespace et `257/257` tests réussis.
- Nouveau contrat :
  - session OAuth unique non terminale → `ATTACHED`, liaison de transport en mémoire, aucune écriture du store et aucune hausse de `sessionRevision` ;
  - session OAuth unique `EXPIRED` encore reprenable → `RESUMED`, reprise durable et incrément de révision ;
  - zéro candidat → `NONE` ;
  - plusieurs candidats → `AMBIGUOUS`, sans sélection arbitraire ;
  - credential partagé → aucune auto-reprise.
- L'audit distingue `bindingResult=attached` de `resumed`; le serveur journalise `governed_session_auto_attached` sans identifiant de transport brut.

### Gate de clôture

La PR #61 doit encore passer la review exact-head, tous les threads et le ruleset `protect-main`, puis être fusionnée sous garde du SHA exact. Governed Autodeploy doit ensuite aligner GitHub/S1/runtime sur le merge. Une PR docs-only descendante de ce merge déclarera alors ce SHA fonctionnel sans auto-référence. Seulement après `FULLY_ALIGNED`, Operational Memory pourra passer `TASK-20260829-002` à `DONE`, créer le checkpoint final, libérer le lock éventuel et fermer la Governed Session.

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

## Réconciliation documentaire post-déploiement

- La présente branche est une réconciliation docs-only descendante exacte de `main@2c2dde2bffe62b2685bf2fad94530571762470c8`.
- Elle ne modifie ni source TypeScript, tests, workflow, OIDC, Autodeploy, politique `.mcp`, WRITE gate, secret, runtime ou fichier S1.
- Elle met à jour la baseline canonique de `SUIVI.md`, `TASKS.md` et `TODO.md` à partir des preuves GitHub/S1/runtime réellement observées.
- Après fusion de cette réconciliation, un nouveau Live State doit être collecté. `DOCUMENTATION_DRIFT` doit disparaître sans masquer un éventuel autre drift.
- La clôture `DONE`, le checkpoint final, la libération du lock et la pause/fermeture de la Governed Session restent exclusivement des preuves Operational Memory postérieures à cette fusion; elles ne sont pas pré-déclarées ici.

## Prochaine action gouvernée

Valider le head exact de cette réconciliation docs-only, obtenir CI/review/ruleset propres, fusionner avec garde `expected_head_sha`, laisser le Governed Autodeploy existant maintenir GitHub/S1/runtime sur le nouveau commit documentaire, puis réconcilier Live State, Current State, Governed Context et Task Reality. Seulement si ces autorités attestent un état cohérent, faire évoluer `TASK-20260829-001` jusqu'à `DONE`, créer le checkpoint final, libérer le lock et préserver la Governed Session selon son cycle normal. La prochaine tâche du programme de connexion gouvernée ne doit être ajoutée qu'après cette clôture runtime.
