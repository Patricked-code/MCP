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

Date : 2026-08-12

## Source de vérité GitHub

- dépôt actif : `Patricked-code/MCP` ;
- branche canonique : `main` ;
- PR #38 Live State V1 fusionnée au commit `cd80665837c1bbf692728d9fbb2c614bb1cb7734` ;
- PR #39 Governed Autodeploy V1 fusionnée au commit `989dcefd90b8820f27af70f2ce18dc4a7685f6e1` ;
- PR #40 de qualification du blocage S1 fusionnée au commit `f87bf471d2d62b9586113cd6a91fb411f03cba41` ;
- `main` vérifié le 2026-08-12 : identique à `f87bf471d2d62b9586113cd6a91fb411f03cba41` avant la correction du redémarrage ;
- branche de correction : `mcp/fix-restart-force-recreate-20260812` ;
- aucune écriture directe sur `main` ;
- aucune preuve S1/runtime courante n'est inventée lorsque le connecteur privé n'est pas invocable.

## Tâche active

`TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS`

Objectif : terminer la chaîne gouvernée GitHub → S1 → Docker avec inventaire documentaire exact, cohérence sémantique CI, authentification GitHub OIDC, déploiement exact-SHA, rollback runtime et attestation.

## État vérifié GitHub et local

- inventaire Git Markdown : **189 chemins exacts**, classifiés et verrouillés dans `docs/governance/markdown-inventory.json` ;
- audit historique S1 conservé : 209 Markdown observés à cette date = 183 Git à l'époque + 26 runtime-only ; cette valeur historique n'est pas utilisée comme constante du Git courant ;
- `docs:check` contrôle inventaire exact, cinq autorités `canonical-state` et cohérence interne de `PRODUCTION_STATE.json` ;
- GitHub OIDC : politique fixe dépôt/IDs/ref/workflow/événement/SHA, RS256/JWKS GitHub, bornes fail-closed ;
- orchestrateur S1 : `flock`, remotes read-only, fetch exact, fast-forward only, image candidate, health/OAuth/MCP, attestation et rollback runtime ;
- routes HTTP : OIDC-only, séparées des sessions web et du bearer MCP ordinaire ;
- workflow `.github/workflows/mcp-deploy.yml` : permissions `contents: read` + `id-token: write`, exact `GITHUB_SHA`, tokens OIDC frais et polling borné ;
- politique bootstrap : `.mcp/autodeploy-policy.json` avec `pushEnabled=false` tant que le premier bootstrap S1 n'est pas attesté ;
- CI post-fusion `MCP CI #295`, run `31480688497` : succès complet ;
- workflow post-fusion `MCP Governed Deploy #1`, run `31480688510` : succès du gate et étape de déploiement `skipped`, conformément à `pushEnabled=false` ;
- worktree de reprise propre, sans commit local devant ou derrière le `main` observé avant la présente correction documentaire.

## État S1 / Docker

- préflight read-only du 2026-08-12 : S1 sur `main@d3bcac0…`, working tree propre et diff vide ;
- remote fetch : `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git` ;
- remote push : `disabled://mcp-s1-read-only` ;
- Docker : `wealthtech_mcp_ssh_bridge` actif et healthy ; révision OCI courante non attestée ;
- `mcp_sync_from_github_s1` est présent et enregistré dans le code S1, mais absent du catalogue callable de la session ;
- les routes `/deploy/github/s1/*` de la PR #39 ne sont pas présentes dans le checkout S1 `d3bcac0…` ;
- typecheck et build S1 exécutés le 2026-08-12 : succès, 0 vulnérabilité npm signalée ;
- le premier appel `restart_mcp_bridge_s1` n'a pas recréé le conteneur car Compose a réutilisé l'image et l'uptime est resté à trois jours ;
- un bootstrap contrôlé et réversible a forcé une reconstruction réelle, puis restauré le `Dockerfile` original ; le conteneur est reparti à zéro et reste healthy, tandis que Git S1 est revenu propre avec diff vide ;
- le catalogue de la conversation courante est resté mis en cache après ce redémarrage réel ; `mcp_sync_from_github_s1` n'est donc toujours pas callable dans cette session ;
- GitHub et S1 ne sont pas alignés ; aucun déploiement automatique n'est déclaré comme réalisé ;
- `FULLY_ALIGNED` reste interdit sans preuve live.

## Prochaine action unique

Fusionner après CI la correction qui impose `--force-recreate` et rend l'échec de `/health` bloquant, puis rafraîchir ou reconnecter le catalogue du connecteur `wealthtech_ssh_bridge` jusqu'à ce que `mcp_sync_from_github_s1` soit réellement callable. Ensuite seulement : répéter le préflight, synchroniser en fast-forward vers le SHA `main` exact, typecheck/build/rebuild-restart, attester health/OAuth/OCI, lancer `workflow_dispatch`, puis activer `pushEnabled=true` par une PR séparée après preuve réussie.

## Critère de clôture

Le chantier n'est terminé que si une preuve fraîche établit :

`GitHub main SHA = S1 HEAD = requested deploy SHA = Docker OCI revision = deployment attestation SHA`

avec health, OAuth et contrôle d'accès MCP réussis.
