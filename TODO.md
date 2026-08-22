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
- [ ] Sur la prochaine connexion ayant rechargé les nouveaux outils, reprendre et clôturer la tâche runtime `TASK-20260822-001` déjà présente en `READY`, sans nouvelle tâche ni nouvelle branche.
