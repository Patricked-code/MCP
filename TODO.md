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
- [x] PR #44 fusionnée et automatiquement déployée.
- [x] PR #45 fusionnée au SHA `bac8779320c8b9529d2a5215dbb1b1f31f828987`, CI `31907827255` et Autodeploy `31907827212` réussis.
- [x] S1, OCI, Docker, health et Live State technique réattestés après PR #45.

## Governed Session Continuity / Operational Memory V1

- [x] Reproduire en RED les deux saturations et la non-libération des locks.
- [x] Ajouter une rétention déterministe sans supprimer sessions ou locks actifs.
- [x] Refuser explicitement l'ouverture/acquisition lorsque la capacité n'est pas supprimable.
- [x] Libérer les locks lors de `closeSession` et conserver la réconciliation inter-stores.
- [x] Protéger les sessions terminales portant encore des `lockIds`.
- [x] Rendre la réconciliation post-merge sûre pour un descendant strictement documentaire.
- [x] Valider le head exact de la PR #45 avec `12/12 + 184/184` tests et tous les contrôles CI.
- [x] Fusionner exact-head et attester l'Autodeploy sans écriture directe S1.
- [x] Résoudre les trois threads tardifs de la PR #44 avec les preuves de correction.
- [x] Fusionner la réconciliation documentaire canonique.
- [x] Clôturer `TASK-20260813-004`.

## Maintenance séparée

- [ ] Migrer dans une PR dédiée les actions GitHub encore exécutées sous compatibilité Node 24.
- La 2FA GitHub reste explicitement exclue.
