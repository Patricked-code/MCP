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

Plan opérationnel exécutable. Les événements détaillés restent dans `ACTIVITY_LOG.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` et les PR GitHub.

## Jalons terminés

- PR #34 à #44 fusionnées selon la gouvernance.
- Live State V1, Autodeploy V1 et Governed Session Continuity V1 déployés.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- GitHub, S1, `origin/main`, OCI et runtime alignés sur `3838c3918c3411a3317c6ea81047e77a7b627673`; S1 propre et runtime healthy.
- Les trois findings tardifs de la PR #44 sont reproduits et corrigés sur la draft PR #45.
- Le head fonctionnel `101d4c481caa42568f9c50302ddd891935e86917` a passé `12/12 + 184/184` tests, typecheck, build, docs, secrets et diff.

## Tâche active unique

### TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — EN COURS

- [x] conception, TDD initial, PR #44, fusion et Autodeploy exact-SHA ;
- [x] détection des trois findings tardifs P1/P1/P2 ;
- [x] governed session et lock dépôt ouverts pour la correction ;
- [x] RED `592b8506…` puis GREEN `12e52030…` ;
- [x] revue interne RED `7308d19…` puis GREEN final `101d4c481caa42568f9c50302ddd891935e86917` ;
- [x] conservation des sessions terminales non encore réconciliées ;
- [x] règle docs-only descendante sans affaiblir le drift des changements de code ;
- [x] CI push `31907348932` et PR `31907350301` vertes ;
- [ ] consolidation documentaire finale de la PR #45, CI et reverrouillage exact-head ;
- [ ] ready/merge PR #45, Autodeploy et attestation post-merge ;
- [ ] résolution des trois threads PR #44 ;
- [ ] PR documentaire finale, Live State `FULLY_ALIGNED` et clôture.

## Interdictions

- aucun push direct sur `main` ;
- aucune écriture ou branche GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset, clean, rebase ou force pour aligner la production ;
- aucune modification de la 2FA.
