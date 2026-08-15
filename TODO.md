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

- [x] Bootstrap manuel et deux preuves automatiques exact-SHA attestés.
- [x] `pushEnabled=true`, OIDC GitHub et déploiement fail-closed actifs.
- [x] PR #44 fusionnée et automatiquement déployée au SHA `3838c3918c3411a3317c6ea81047e77a7b627673`.
- [x] S1, OCI, Docker, health, OAuth, MCP et Live State technique réattestés après PR #44.

## Governed Session Continuity / Operational Memory V1

- [x] PR #44 fusionnée et déployée.
- [x] Reproduire en RED les deux saturations et la non-libération des locks.
- [x] Ajouter une rétention déterministe sans supprimer sessions ou locks actifs.
- [x] Refuser explicitement l'ouverture/acquisition lorsque la capacité n'est pas supprimable.
- [x] Libérer les locks lors de `closeSession` et conserver la réconciliation inter-stores.
- [x] Protéger les sessions terminales portant encore des `lockIds`.
- [x] Rendre possible une réconciliation post-merge uniquement pour un descendant strictement documentaire.
- [x] Obtenir les CI vertes `31907348932` et `31907350301` sur `101d4c481caa42568f9c50302ddd891935e86917`.
- [ ] Valider la CI du head documentaire final de la PR #45 et fusionner exact-head.
- [ ] Attester l'Autodeploy exact-SHA de la PR #45 sans écriture directe S1.
- [ ] Résoudre les trois threads tardifs de la PR #44 avec les références de correction.
- [ ] Ouvrir et fusionner une PR strictement documentaire déclarant le merge SHA de la PR #45.
- [ ] Obtenir un Live State final `FULLY_ALIGNED` puis clôturer `TASK-20260813-004`.

## Maintenance séparée

- Migrer dans une PR dédiée les actions GitHub encore exécutées sous compatibilité Node 24.
- La 2FA GitHub reste explicitement exclue.
