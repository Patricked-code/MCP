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

Date : 2026-08-28

## Baseline production avant correction

- GitHub `main`, S1 `HEAD`, S1 `origin/main` et runtime sont attestés au SHA `4d17e972ea04624fc41f90fbb908dc0f70b34430`.
- Live State `stateVersion=36` est `FULLY_ALIGNED`, sans contradiction ; S1 est propre/read-only et Docker est running/healthy.
- Image active : `sha256:7e5853df7d0951ccdfc4eadb0f9a3a7db94f042a21cd94e30035f6ee00c96ba0`.
- Le WRITE gate reste en mode `shadow`. Aucun changement d'Autodeploy V1, GitHub OIDC, `ENABLE_WRITE_TOOLS`, `allow_write` ou exclusion 2FA n'est autorisé dans ce correctif.

## Tâche corrective courante

`TASK-20260822-001 — TDD correction of terminal-session mutation gate and governed-task catalogue surfaces`

- Branche gouvernée unique : `mcp/fix-mandatory-bootstrap-review-20260822`, créée depuis le SHA exact de production.
- Governed Session : `913048d7-1128-4179-b0bb-3d961730c3f8`, reprise et acquittée sur Live State `36`.
- Lock repository exclusif : `671d2c8c-abaf-455b-8e47-163cf79f2782`, renouvelé par heartbeat avant mutation.
- Trois threads tardifs de la PR #49 sont traités :
  - `PRRT_kwDOTJ-y6M6bYAMT` : réattribution des tâches détenues par une session terminale ;
  - `PRRT_kwDOTJ-y6M6bYAMV` : `currentTask` limité à la session appelante et aux tâches non terminales ;
  - `PRRT_kwDOTJ-y6M6bYAMY` : preuve current-state lue depuis les blobs du `evidenceHead`, indépendamment du working tree.
- Le gate de mutation des tâches refuse désormais les sessions `CLOSED` et `EXPIRED`.
- Les deux outils de lecture de queue sont classés `read`; les trois mutations restent `operational-write`.
- La maintenance réattribue de façon idempotente les tâches non terminales : fermeture immédiatement, expiration après la grâce de reprise seulement.

## Preuves locales de la candidate

- TDD RED : huit échecs ciblés sur les garanties manquantes.
- GREEN ciblé élargi : `50/50`.
- Régression complète : gouvernance `12/12`, autres suites `216/216`, total `228/228`.
- Typecheck, build, documentation `196`, cartographie, preuve current-state, scan de secrets et contrôle du diff réussis avant consolidation documentaire.
- Catalogue candidat : 111 outils, 2 resources, 68 lectures, 43 écritures ; digest `cfd5f18490f25ce79b4afbda36a9eda48453a7098237f73b39aa804a4cd43aad`.
- Aucun commit, push, PR corrective, merge, déploiement ou changement runtime n'est encore déclaré à ce jalon.

## Prochaine action

Valider le diff consolidé, committer et publier la branche gouvernée, ouvrir une Draft PR, exiger la CI et la revue du head exact, puis seulement fusionner et attester l'Autodeploy exact-SHA. Après attestation, checkpoint final, libération du lock et fermeture de la session. L'activation d'`enforce` reste hors périmètre et exige un GO distinct.
