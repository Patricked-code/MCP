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
Liste des travaux restant réellement à accomplir. Les éléments devenus exécutables sont reflétés dans `TASKS.md`.

## Governed Autodeploy V1

- [x] Verrouiller l'inventaire Markdown Git exact et la cohérence canonique CI.
- [x] Distinguer l'ancien constat S1 `209 = 183 Git + 26 runtime-only` de la baseline Git actuelle de 189 chemins.
- [x] Implémenter la vérification GitHub OIDC fail-closed.
- [x] Implémenter l'orchestrateur S1 exact-SHA et rollback runtime.
- [x] Rendre l'image Compose explicitement sélectionnable pour candidate/rollback.
- [x] Implémenter les routes HTTP OIDC-only.
- [x] Câbler ces routes avant les surfaces web/MCP historiques.
- [x] Implémenter le workflow GitHub Actions exact-SHA avec permissions minimales.
- [x] Ajouter une politique bootstrap versionnée `pushEnabled=false`.
- [x] Tester la syntaxe du shell réel du workflow avec `bash -n`.
- [x] Auditer le diff complet pour secrets, shell non borné, Git destructif, duplication de voie de déploiement et assertions runtime inventées.
- [x] Ouvrir la PR Draft unique, obtenir CI/revue verte et fusionner le head exact.
- [x] Vérifier la CI `main` post-merge et le comportement gated du workflow.
- [x] Réattester S1 en lecture live dès que le connecteur privé est invocable.
- [x] Étendre `docs:check` à la cohérence de `PRODUCTION_STATE.json`.
- [ ] Rafraîchir/reconnecter le catalogue ChatGPT afin d'exposer `mcp_sync_from_github_s1`, déjà présent dans le code S1.
- [ ] Effectuer le bootstrap unique : sync fast-forward, typecheck/build, rebuild/restart MCP.
- [ ] Vérifier health, OAuth, contrôle d'accès MCP et révision OCI.
- [ ] Exécuter `workflow_dispatch` sur le SHA exact et récupérer l'attestation finale.
- [ ] Activer `pushEnabled=true` uniquement par PR après preuve du bootstrap.
- [ ] Valider un déploiement automatique réel sur un merge de suivi sans risque.
- [ ] Clôturer seulement après `GitHub main = S1 HEAD = Docker OCI revision = attestation`.

## Travaux futurs séparés

- migration GitRegistry v2 active avec backup/rollback/audit ;
- cockpit GitRegistry read-only puis CRUD gouverné ;
- éventuels write-gates/locks distribués V1.5/V2 si plusieurs instances MCP deviennent concurrentes ;
- migration/modernisation Node et GitHub Actions dans des PR dédiées, jamais mélangées au bootstrap autodeploy.
