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

- PR #34 à #42 fusionnées selon la gouvernance.
- Live State V1 déployé et attesté.
- Bootstrap manuel exact-SHA réussi : run `31655087215`.
- Politique `pushEnabled=true` fusionnée avec la PR #42.
- Premier déploiement automatique exact-SHA réussi : run `31658327435`, job MCP `mcp-s1-31658327435-9be5095cbf72`, SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`.
- GitHub, S1, `origin/main`, OCI et runtime alignés ; health/OAuth/MCP validés ; rollback non nécessaire.
- Inventaire courant : 189 Git + 26 runtime-only = 215 ; historique 209 conservé séparément.
- P2 readiness polling corrigé en TDD et thread PR #41 résolu.
- Artefact CI des sept documents actifs strictement identique aux sources suivies.

## Tâche active unique

### TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS

- [x] bootstrap S1 exact-SHA ;
- [x] workflow manuel `workflow_dispatch` réussi ;
- [x] attestation post-workflow fraîche et alignée ;
- [x] correction P2 avec polling borné fail-closed ;
- [x] consolidation documentaire post-bootstrap ;
- [x] activation `pushEnabled=true` fusionnée ;
- [x] premier déploiement automatique par push non skipped et attesté ;
- [ ] seconde PR documentaire utile enregistrant cette première preuve ;
- [ ] seconde fusion automatique canonique et attestation finale ;
- [ ] verdict final des six objectifs et gestion conditionnelle des automatisations.

## Interdictions

- aucun push direct sur `main` ;
- aucune branche, écriture ou push GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset/clean/rebase/force pour aligner la production ;
- aucune déclaration d’automatisation complète avant les deux preuves par push.
