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
Plan opérationnel exécutable du MCP. L'historique détaillé est conservé dans `ACTIVITY_LOG.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, `docs/history/` et les PR GitHub.

## Jalons terminés

- PR #34 : réconciliation des outils scoped opérationnels — fusionnée.
- PR #35 : durcissement des dépendances de production — fusionnée.
- PR #36 : correction finale `@hono/node-server` — fusionnée.
- PR #37 : identité GitHub S1 read-only imposée — fusionnée.
- PR #38 : MCP Live State Engine V1 — fusionnée dans `main@cd80665837c1bbf692728d9fbb2c614bb1cb7734`.
- PR #39 : MCP Governed Autodeploy V1 — fusionnée dans `main@989dcefd90b8820f27af70f2ce18dc4a7685f6e1` ; CI post-fusion réussie et déploiement push correctement bloqué par `pushEnabled=false`.
- `TASK-20260809-002` : partie GitHub Live State terminée ; déploiement/runtime restent à réattester sur S1.

## Tâche active unique

### TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS

Objectif : rendre le processus GitHub → S1 → Docker automatique, reproductible, fail-closed et attesté, sans créer une deuxième source de vérité ni une deuxième voie SSH.

### Blocs GitHub implémentés et validés par TDD

- [x] inventaire exact des Markdown Git et classification déterministe ;
- [x] baseline `docs/governance/markdown-inventory.json` : 189 chemins actuels ;
- [x] contrôle CI des cinq autorités `canonical-state` ;
- [x] vérificateur GitHub OIDC RS256/JWKS, claims fixes et SHA exact ;
- [x] orchestrateur S1 avec `flock`, remotes read-only, propreté, fetch exact, fast-forward only ;
- [x] build Docker candidat avec `org.opencontainers.image.revision` ;
- [x] health, OAuth, contrôle `/mcp` non authentifié et attestation ;
- [x] rollback runtime vers l'image précédente sans réécriture Git ;
- [x] routes HTTP OIDC-only de lancement et statut ;
- [x] câblage serveur avant les surfaces web existantes ;
- [x] workflow GitHub Actions exact-SHA à permissions minimales ;
- [x] politique bootstrap versionnée `pushEnabled=false` ;
- [x] contrôle `bash -n` du shell réel du workflow ;
- [x] validation sémantique de `PRODUCTION_STATE.json` intégrée à `docs:check` ;
- [x] suites typecheck/build/docs/gouvernance/secrets/safety/diff-check vertes sur les blocs implémentés.

### Reste à exécuter

- [x] audit final du diff branche → `main` ;
- [x] PR Draft unique, CI de PR verte, revue et fusion sur head exact ;
- [x] CI post-merge ;
- [x] constater le workflow push gated/skipped avec `pushEnabled=false` ;
- [x] réattester S1 : branche, HEAD, status, diff, fetch remote, push remote, Docker ;
- [ ] rafraîchir l'exposition du connecteur jusqu'à rendre `mcp_sync_from_github_s1` callable ;
- [ ] bootstrap unique via les outils MCP gouvernés existants : sync fast-forward, typecheck/build, rebuild/restart ;
- [ ] attester health/OAuth/OCI ;
- [ ] lancer `workflow_dispatch` sur le SHA exact et obtenir `succeeded/attested` ;
- [ ] PR de suivi : `pushEnabled=true` uniquement après cette preuve ;
- [ ] valider un merge inoffensif déclenchant l'autodeploy réel ;
- [ ] attester `GitHub main = S1 HEAD = Docker revision = attestation` et clôturer les six objectifs.

## Interdictions

- aucun push direct sur `main` ;
- aucune écriture directe du code sur S1 ;
- aucun `reset --hard`, `git clean`, rebase ou force pour aligner la production ;
- aucun secret SSH GitHub Actions ;
- aucun `FULLY_ALIGNED` sans attestation live ;
- aucun passage `pushEnabled=true` avant bootstrap et `workflow_dispatch` réussis.
