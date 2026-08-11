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

Date : 2026-08-09

## Source de vérité GitHub

- dépôt actif : `Patricked-code/MCP` ;
- branche canonique : `main` ;
- base du chantier : `main@cd80665837c1bbf692728d9fbb2c614bb1cb7734`, merge de la PR #38 Live State V1 ;
- branche de travail : `mcp/governed-autodeploy-v1-20260809` ;
- aucune écriture directe sur `main` ;
- aucune preuve S1/runtime courante n'est inventée lorsque le connecteur privé n'est pas invocable.

## Tâche active

`TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS`

Objectif : terminer la chaîne gouvernée GitHub → S1 → Docker avec inventaire documentaire exact, cohérence sémantique CI, authentification GitHub OIDC, déploiement exact-SHA, rollback runtime et attestation.

## État vérifié sur la branche

- inventaire Git Markdown : **189 chemins exacts**, classifiés et verrouillés dans `docs/governance/markdown-inventory.json` ;
- audit historique S1 conservé : 209 Markdown observés à cette date = 183 Git à l'époque + 26 runtime-only ; cette valeur historique n'est pas utilisée comme constante du Git courant ;
- `docs:check` contrôle inventaire exact + cinq autorités `canonical-state` ;
- GitHub OIDC : politique fixe dépôt/IDs/ref/workflow/événement/SHA, RS256/JWKS GitHub, bornes fail-closed ;
- orchestrateur S1 : `flock`, remotes read-only, fetch exact, fast-forward only, image candidate, health/OAuth/MCP, attestation et rollback runtime ;
- routes HTTP : OIDC-only, séparées des sessions web et du bearer MCP ordinaire ;
- workflow `.github/workflows/mcp-deploy.yml` : permissions `contents: read` + `id-token: write`, exact `GITHUB_SHA`, tokens OIDC frais et polling borné ;
- politique bootstrap : `.mcp/autodeploy-policy.json` avec `pushEnabled=false` tant que le premier bootstrap S1 n'est pas attesté ;
- CI complète de branche validée jusqu'au workflow, y compris contrôle de syntaxe shell `bash -n`.

## État S1 / Docker

- état courant S1 : **requires_revalidation** ;
- état courant Docker : **requires_revalidation** ;
- le connecteur privé S1 n'est pas invocable dans cette session ;
- aucun déploiement automatique n'est donc déclaré comme réalisé ;
- `FULLY_ALIGNED` reste interdit sans preuve live.

## Prochaine action unique

1. auditer le diff complet et les garde-fous ;
2. ouvrir une PR Draft unique vers `main` ;
3. exiger CI verte sur le head exact et absence de revue bloquante ;
4. fusionner uniquement le head vérifié ;
5. vérifier CI post-merge et constater que le workflow push est gated/skipped tant que `pushEnabled=false` ;
6. lorsque S1 redevient invocable : préflight live, sync fast-forward gouvernée, build/restart bootstrap de l'endpoint OIDC, health/OAuth/OCI ;
7. lancer `workflow_dispatch` sur le SHA exact et obtenir une attestation réussie ;
8. seulement après cette preuve, passer `pushEnabled=true` par PR et valider un merge inoffensif déclenchant automatiquement GitHub → S1 → Docker.

## Critère de clôture

Le chantier n'est terminé que si une preuve fraîche établit :

`GitHub main SHA = S1 HEAD = requested deploy SHA = Docker OCI revision = deployment attestation SHA`

avec health, OAuth et contrôle d'accès MCP réussis.
