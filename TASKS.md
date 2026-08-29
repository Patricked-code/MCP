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

## Jalons terminés

- PR #44, #45, #47, #49 et #52 fusionnées selon la gouvernance ; PR #50 fermée sans fusion comme doublon exact de la PR #49.
- PR #44 : merge `3838c3918c3411a3317c6ea81047e77a7b627673`, CI `31684159546`, deploy `31684159586`, job `94396216832`.
- PR #45 : merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255`, deploy `31907827212`, job `95068288136`.
- PR #47 : head `8dddc5656aa959f4c392d0f1816b5ee0e25709a0`, merge `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248`, deploy `32535404345`, job `96935241275`.
- PR #49 : head `1c9297d663624e5c348fba687051b649ca3e2a22`, CI `32565936838`, merge `c944fd9e7c05aad503f9e1d5d21e0ead25747886`; GitHub/S1/OCI/runtime exact-SHA attestés à cette étape.
- PR #52 : head `33a3e424a5fe271cf82c1ee6db8c94785289e3ca`, CI PR `33213114008`, merge `fff44ff2db386942730a67f3884980c7824cae7f`, CI main `33214825660`, deploy `33214825772`, job `98996005106`.
- PR #54 : réconciliation strictement documentaire post-PR #52, fusionnée au SHA `a35280e172e40525689520e1443ccd59e850e91a`; CI main `33222774901` et Governed Deploy `33222774905` réussis.

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

## Tâche précédente — clôture technique acquise, preuve runtime finale distincte

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
- [ ] attester depuis Operational Memory le checkpoint final, la libération du lock et la fermeture de la session sans lock résiduel ; cette preuve ne doit pas être déduite de GitHub.

## Chantier courant — Unified Operational Work State

Le chantier continue sur l'unique branche `mcp/unified-operational-work-state-20260829`, descendante de `main@a35280e172e40525689520e1443ccd59e850e91a`. L'identifiant et l'état runtime de la tâche restent à lire dans la Governed Task Queue; aucun identifiant dynamique n'est figé ici sur la seule base d'une fixture de test.

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
- [x] valider le head fonctionnel `c25ba8c775b5a2a81f84b424ffd01686e833ea0c` par CI #549 (`33238637948`) : typecheck, build, docs, gouvernance, secrets, `247/247` read-only safety et diff verts ;
- [x] réconcilier les documents canoniques sur la branche candidate sans changer le mode `shadow` ni les autorités ;
- [x] ouvrir la Draft PR #55 sur cette même branche, sans nouvelle branche concurrente ;
- [ ] obtenir la CI du head documentaire exact et vérifier le diff final ;
- [ ] passer PR #55 Ready seulement après exact-head CI, reviews/threads et ruleset propres ;
- [ ] obtenir revue et CI exact-head sans finding actionnable ;
- [ ] fusionner seulement sous les gardes de `main`, puis attester l'Autodeploy exact-SHA ;
- [ ] réattester runtime/Live State et réconcilier la documentation post-déploiement avant toute déclaration `DONE`.

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
