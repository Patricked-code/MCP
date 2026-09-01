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

Date : 2026-09-01

## Checkpoint de réconciliation documentaire courant

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

La prochaine tâche candidate n'est pas pré-enregistrée ici. Son objectif borné est de prolonger le bootstrap de session déjà livré avec la résolution du contexte projet :

```text
principal OAuth
→ Connection Context minimal
→ GitHub identity
→ repository
→ GitRegistry V2 mapping
→ project
→ server/runtime/domain
→ gouvernance héritée
```

Les lots ultérieurs (guided intake, provisioning, présence client, tool-surface attestation, tracing, monitoring, dashboard, certifications Claude/ChatGPT et hardening séparé) sont positionnés dans `ROADMAP.md` sans être pré-créés dans la Task Queue.

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
