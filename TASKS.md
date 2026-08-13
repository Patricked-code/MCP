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

- PR #34 à #41 fusionnées selon leur gouvernance.
- Live State V1 déployé et attesté.
- Governed Autodeploy V1 bootstrappé sur S1.
- Workflow manuel exact-SHA `31655087215` réussi au SHA `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- GitHub, S1, `origin/main`, OCI et runtime alignés ; health/OAuth/MCP validés ; rollback non nécessaire.
- Inventaire courant réattesté : 189 Git + 26 runtime-only = 215 ; historique 209 conservé séparément.
- P2 de readiness polling reproduit par test RED puis corrigé avec CI GREEN.
- Artefact CI des sept documents actifs rendu strictement identique aux sources suivies.

## Tâche active unique

### TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS

- [x] bootstrap S1 exact-SHA ;
- [x] workflow manuel `workflow_dispatch` réussi ;
- [x] attestation post-workflow fraîche et alignée ;
- [x] correction P2 avec polling borné fail-closed ;
- [x] consolidation documentaire post-bootstrap ;
- [x] autorisation conditionnelle de `pushEnabled=true` dans la PR #42 ;
- [ ] CI finale verte sur le head documentaire exact ;
- [ ] PR #42 ready puis fusion locked-head ;
- [ ] premier déploiement automatique déclenché par le push de fusion, non skipped et attesté ;
- [ ] seconde PR utile enregistrant la première preuve ;
- [ ] seconde fusion automatique canonique et attestation finale ;
- [ ] verdict final des six objectifs et gestion conditionnelle des automatisations.

## Interdictions

- aucun push direct sur `main` ;
- aucune branche, écriture ou push GitHub depuis S1 ;
- aucun patch direct du code versionné sur S1 ;
- aucun reset/clean/rebase/force pour aligner la production ;
- aucune déclaration d’automatisation complète avant les deux preuves par push.
