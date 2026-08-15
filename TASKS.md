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

- PR #34 à #45 fusionnées selon la gouvernance.
- Live State V1, Autodeploy V1 et Governed Session Continuity / Operational Memory V1 déployés.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- PR #45 : head verrouillé `e2b5f590a9af6a0ca6ae35aa99cb18c7e8c2506d`, merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255`, deploy `31907827212`, job `95068288136`.
- S1 propre/read-only, Docker running/healthy et OCI/runtime réattestés sur le merge de la PR #45.
- Les trois findings tardifs P1/P1/P2 de la PR #44 sont corrigés, testés et résolus.
- La présente réconciliation canonique est strictement documentaire et ne change aucun invariant d'autorité.

## Tâche active unique

### TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — CORRECTION TARDIVE EN COURS

- [x] portée initiale, PR #44/#45, Autodeploy et première réconciliation canonique ;
- [x] qualification des trois threads tardifs PR #45 ;
- [x] RED `e18f553d7f8423f301fd3f226a14fe835dac8a74` : 3 échecs ciblés sur 187 tests ;
- [x] GREEN `fc27e7e342b2ebfdbde4adc830b151a4018f2b4e` : `12/12 + 188/188`, double CI verte ;
- [x] préservation de la grâce de reprise des sessions expirées ;
- [x] rétention des locks actifs au TTL écoulé avec audit et nettoyage de projection ;
- [x] exception S1 docs-only limitée à la même référence GitHub déclarée ;
- [x] journaux canoniques mis à jour avant déploiement ;
- [ ] valider la CI et la revue du head canonique consolidé ;
- [ ] fusionner PR #47 avec garde exact-head et attester l'Autodeploy ;
- [ ] résoudre les trois threads tardifs PR #45 après déploiement attesté ;
- [ ] publier la réconciliation documentaire finale et refermer la tâche.

## Interdictions préservées

- aucun push direct sur `main` ;
- aucune écriture ou branche GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset, clean, rebase ou force pour aligner la production ;
- aucune modification de la 2FA.
