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

- PR #34 à #43 fusionnées selon la gouvernance.
- Live State V1 déployé et attesté.
- Bootstrap manuel exact-SHA réussi : run `31655087215`.
- Politique `pushEnabled=true` fusionnée avec la PR #42.
- Premier déploiement automatique exact-SHA réussi : run `31658327435`, job MCP `mcp-s1-31658327435-9be5095cbf72`, SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`.
- GitHub, S1, `origin/main`, OCI et runtime alignés ; health/OAuth/MCP validés ; rollback non nécessaire.
- Inventaire courant : 189 Git + 26 runtime-only = 215 ; historique 209 conservé séparément.
- P2 readiness polling corrigé en TDD et thread PR #41 résolu.
- Artefact CI des sept documents actifs strictement identique aux sources suivies.
- Seconde preuve automatique canonique réussie : PR #43 fusionnée à `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`, CI `31659053828`, deploy `31659053836`, job `94319801309`.
- `TASK-20260809-003` terminée : les deux preuves automatiques exact-SHA sont attestées.

## Tâche active unique

### TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — EN COURS

- [x] baseline `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` verrouillée et attestée ;
- [x] spécification approuvée par GO humain le 2026-08-13 ;
- [x] plan TDD détaillé versionné et CI verte (`31669569897`) ;
- [x] RED du SHA documentaire ancien observé localement et en CI (`31669784015`) ;
- [x] GREEN minimal du détecteur documentaire et régression Live State ;
- [x] cycles TDD Operational Memory / governed sessions / locks / contexte ;
- [x] WRITE gate `shadow` non bloquant, sans changement des handlers historiques ;
- [x] régression fraîche complète sur le head fonctionnel `38e3ced7…` et CI `31675193991` verte ;
- [x] draft PR unique #44 créée et première revue indépendante traitée par cycles RED/GREEN ;
- [x] régression locale post-review : gouvernance `12/12`, read-only `172/172`, typecheck/build/docs/secrets/invariants verts ;
- [x] seconde revue du head `90e9ec6…` traitée : deux findings importants et deux mineurs corrigés en TDD ;
- [x] deux findings différentiels supplémentaires traités : commentaires GitHub non décisifs et champs libres du journal opaques ;
- [x] ultime confirmation différentielle : zéro finding critique/important, range fonctionnel déclaré mergeable ;
- [x] régression intégrale locale du head fonctionnel précédent : `187/187`; tests ciblés, typecheck et secrets verts sur `de8a6df…` ;
- [ ] CI et seconde revue du head documentaire exact, puis autorisation ready/merge ;
- [ ] merge autorisé exact-head puis Autodeploy V1 existant et attestation post-merge.

## Interdictions

- aucun push direct sur `main` ;
- aucune branche, écriture ou push GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset/clean/rebase/force pour aligner la production ;
- aucune déclaration d’automatisation complète avant les deux preuves par push.
- aucune activation ni opération GitHub 2FA dans ce chantier.
