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

- [x] Classifier les 189 Markdown Git et contrôler leur cohérence par CI.
- [x] Réattester 33 Markdown du miroir runtime : 7 suivis, 26 runtime-only.
- [x] Conserver séparément l’historique `209 = 183 + 26` et la surface courante `215 = 189 + 26`.
- [x] Terminer le bootstrap S1 et le workflow manuel exact-SHA.
- [x] Vérifier health, OAuth, MCP 401, OCI, Live State et rollback.
- [x] Corriger le polling P2 avec TDD puis résoudre le thread après fusion.
- [x] Garantir la parité exacte des candidats documentaires CI avec les sources.
- [x] Activer `pushEnabled=true` via la PR #42.
- [x] Attester le premier déploiement automatique par push.
- [ ] Créer puis fusionner la seconde PR documentaire utile.
- [ ] Attester le second déploiement automatique canonique.
- [ ] Émettre le verdict final des six objectifs.
- [ ] Réactiver les deux automatisations métier seulement après clôture intégrale.
- [ ] Désactiver la surveillance bootstrap seulement après le rapport final et les réactivations attestées.

## Maintenance séparée

- Migrer les actions GitHub encore exécutées sous compatibilité Node 24 dans une PR dédiée.
- Activer l’authentification à deux facteurs du compte avant le 18 août 2026.
