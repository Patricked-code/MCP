# TODO.md

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

Travaux restant réellement à accomplir.

## Governed Autodeploy V1

- [x] Bootstrap manuel et preuves automatiques exact-SHA attestés.
- [x] `pushEnabled=true`, OIDC GitHub et déploiement fail-closed actifs.
- [x] PR #44, #45 et #47 fusionnées et automatiquement déployées.
- [x] PR #47 fusionnée au SHA `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI main `32535404248` et Autodeploy `32535404345` réussis.
- [x] S1, OCI, Docker, health et Live State technique réattestés après PR #47.

## Governed Session Continuity / Operational Memory V1

- [x] Réaliser la portée initiale, les hardenings PR #45 et la première réconciliation documentaire.
- [x] Reproduire puis corriger les trois findings tardifs PR #45.
- [x] Valider le head PR #47 avec `12/12 + 188/188`, typecheck, build, docs, secrets et diff.
- [x] Fusionner exact-head, attester l'Autodeploy et résoudre les trois threads PR #45.
- [x] Fusionner la présente réconciliation strictement documentaire.
- [x] Obtenir `FULLY_ALIGNED` par la politique descendant docs-only puis clôturer `TASK-20260813-004`.

## Maintenance séparée

- [ ] Migrer dans une PR dédiée les actions GitHub encore exécutées sous compatibilité Node 24.
- La 2FA GitHub reste explicitement exclue.

## Mandatory Agent Bootstrap & Work Orchestration V1

- [x] Catalogue et cartographie dérivés des registrations réelles.
- [x] Inventaire architecture/documents/audits/politiques dérivé du SHA suivi.
- [x] Live State enrichi, Bootstrap Receipt, Task Registry et Work Queue persistante.
- [x] Governed Context, onboarding, dashboard, audit et verdicts `shadow` enrichis.
- [x] CI `32565936838` du head exact `1c9297d…`, passage Ready et absence de thread actionnable.
- [x] Merge `c944fd9e…`, Autodeploy exact-SHA et attestation Live State `stateVersion=33` de GitHub/S1/OCI/runtime.
- [x] Réconciliation canonique post-déploiement préparée dans une branche strictement documentaire.
- [x] Reprendre la tâche runtime `TASK-20260822-001` et la Governed Session corrective existantes, sans doublon de tâche ni seconde branche.
- [x] Reproduire par TDD les trois findings tardifs de la PR #49, le défaut de gate des sessions terminales et l'erreur de classification des outils de lecture.
- [x] Corriger la réattribution après session terminale, la projection `currentTask`, la preuve Git au HEAD et la séparation des surfaces read/write.
- [x] Valider localement `12/12 + 216/216`, typecheck, build, docs, cartographie, preuve current-state, secrets et diff.
- [ ] Publier la branche corrective et ouvrir une Draft PR.
- [ ] Obtenir CI et revue vertes sur le head exact, résoudre les trois threads de la PR #49, puis fusionner avec garde exact-head.
- [ ] Attester Autodeploy, GitHub/S1/OCI/runtime et Live State post-merge.
- [ ] Enregistrer le checkpoint final, libérer le lock et fermer la session sans lock résiduel.
