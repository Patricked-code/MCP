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

- PR #34 à #47 fusionnées selon la gouvernance ; la présente PR #48 est la réconciliation strictement documentaire finale.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- PR #45 : merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255`, deploy `31907827212`, job `95068288136`.
- PR #47 : head `8dddc5656aa959f4c392d0f1816b5ee0e25709a0`, merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, deploy `32535404345`, job `96935241275`.
- S1 propre/read-only, Docker running/healthy et OCI/runtime réattestés sur le merge de la PR #47.
- Les trois findings tardifs PR #45 sont corrigés, testés, déployés et leurs fils sont résolus.

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
- [x] réconciliation documentaire finale publiée par la présente PR #48.

## Tâche courante

### TASK-20260822-001 — Mandatory Agent Bootstrap & Work Orchestration V1 — EN COURS

- [x] dériver le catalogue complet depuis les registrations MCP et protéger sa fraîcheur en CI ;
- [x] dériver du SHA suivi les modules, imports, routes, documents, audits et politiques sans écriture ;
- [x] enrichir Live State avec catalogue, gouvernance, baseline d'audit et inventaire ;
- [x] ajouter Task Registry, queue persistante, ordre priorité/séquence, dépendances, conflits et révisions optimistes ;
- [x] créer le Bootstrap Receipt sanitizé lors de l'acquittement ;
- [x] exposer l'inventaire courant et les outils de queue MCP ;
- [x] enrichir Governed Context, le dashboard, l'onboarding réel, le journal et le gate `shadow` ;
- [x] conserver les 92 contrats historiques et un diff nul sur OIDC/Autodeploy ;
- [ ] publier le head consolidé, obtenir les CI exactes et la revue ;
- [ ] fusionner, attendre l'Autodeploy exact-SHA, réattester et réconcilier les références canoniques.

## Interdictions préservées

- aucun push direct sur `main` ;
- aucune écriture ou branche GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset, clean, rebase ou force pour aligner la production ;
- aucune modification de la 2FA.
