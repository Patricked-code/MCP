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

- PR #34 à #52 fusionnées selon la gouvernance ; PR #52 porte la correction tardive de Mandatory Agent Bootstrap V1 et la présente candidate porte sa réconciliation strictement documentaire.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- PR #45 : merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255`, deploy `31907827212`, job `95068288136`.
- PR #47 : head `8dddc5656aa959f4c392d0f1816b5ee0e25709a0`, merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, deploy `32535404345`, job `96935241275`.
- S1 propre/read-only, Docker running/healthy et OCI/runtime réattestés sur le merge de la PR #47.
- Les trois findings tardifs PR #45 sont corrigés, testés, déployés et leurs fils sont résolus.
- PR #49 : head `1c9297d663624e5c348fba687051b649ca3e2a22`, CI `32565936838`, merge `c944fd9e7c05aad503f9e1d5d21e0ead25747886` ; GitHub/S1/OCI/runtime exact-SHA, S1 propre et Docker healthy.
- PR #52 : head `33a3e424a5fe271cf82c1ee6db8c94785289e3ca`, CI PR `33213114008`, merge `fff44ff2db386942730a67f3884980c7824cae7f`, CI main `33214825660`, deploy `33214825772`, job `98996005106` ; GitHub/S1/OCI/runtime exact-SHA, S1 propre et Docker healthy.
- Les trois findings tardifs PR #49 sont corrigés, déployés et leurs threads sont résolus.

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

### TASK-20260822-001 — Mandatory Agent Bootstrap & Work Orchestration V1 — RÉCONCILIATION DOCUMENTAIRE FINALE

- [x] dériver le catalogue complet depuis les registrations MCP et protéger sa fraîcheur en CI ;
- [x] dériver du SHA suivi les modules, imports, routes, documents, audits et politiques sans écriture ;
- [x] enrichir Live State avec catalogue, gouvernance, baseline d'audit et inventaire ;
- [x] ajouter Task Registry, queue persistante, ordre priorité/séquence, dépendances, conflits et révisions optimistes ;
- [x] créer le Bootstrap Receipt sanitizé lors de l'acquittement ;
- [x] exposer l'inventaire courant et les outils de queue MCP ;
- [x] enrichir Governed Context, le dashboard, l'onboarding réel, le journal et le gate `shadow` ;
- [x] conserver les 92 contrats historiques et un diff nul sur OIDC/Autodeploy ;
- [x] publier le head consolidé, obtenir la CI exacte et vérifier l'absence de thread actionnable ;
- [x] fusionner avec garde exact-head, attendre l'Autodeploy exact-SHA et réattester GitHub/S1/OCI/runtime ;
- [x] publier les références et preuves canoniques dans une branche strictement documentaire ;
- [x] reprendre la tâche runtime et la Governed Session correctives existantes sur l'unique branche `mcp/fix-mandatory-bootstrap-review-20260822` ;
- [x] reproduire les trois findings tardifs PR #49 et les deux écarts de gate/catalogue ;
- [x] réattribuer les tâches non terminales lorsque leur session propriétaire devient définitivement terminale ;
- [x] limiter `currentTask` à la session appelante, aux statuts de session admissibles et aux tâches non terminales ;
- [x] dériver la preuve current-state des blobs du `evidenceHead`, sans attribuer les modifications locales au commit ;
- [x] refuser les mutations de tâche depuis une session `CLOSED` ou `EXPIRED` ;
- [x] classifier les deux lectures de queue comme `read` et conserver les trois mutations en `operational-write` ;
- [x] récupérer aussi les tâches dont la session propriétaire a déjà été supprimée par rétention ;
- [x] sérialiser rétention/reprise/fermeture/expiration et mutations de tâche avec un coordinateur mémoire partagé ;
- [x] rendre les lectures de queue réellement sans écriture et initialiser le seed avant exposition du serveur ;
- [x] neutraliser les replacement refs et lier l'horodatage au `evidenceHead` ;
- [x] valider localement `234/234`, typecheck, build, docs, cartographie, preuve current-state, secrets et diff ;
- [x] publier le head fonctionnel `0a672591…` et ouvrir la Draft PR #52 ;
- [x] obtenir CI/revue sur le head documentaire exact de la PR #52 ;
- [x] résoudre les trois threads PR #49 après preuve de correction ;
- [x] fusionner avec garde exact-head et attester Autodeploy, GitHub/S1/OCI/runtime au SHA `fff44ff2db386942730a67f3884980c7824cae7f` ;
- [ ] fusionner et attester la présente réconciliation strictement documentaire ;
- [ ] checkpoint final, lock libéré et session fermée sans lock résiduel.

## Interdictions préservées

- aucun push direct sur `main` ;
- aucune écriture ou branche GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset, clean, rebase ou force pour aligner la production ;
- aucune modification de la 2FA.
