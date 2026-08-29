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

Date : 2026-08-29

## Baseline fonctionnelle attestée du chantier courant

- `main` fonctionnel est au SHA `2c2dde2bffe62b2685bf2fad94530571762470c8`, merge de la PR #55 `feat(governance): unify operational work state`.
- S1 HEAD et `origin/main` sont attestés au SHA `2c2dde2bffe62b2685bf2fad94530571762470c8`; working tree propre, diff vide, fetch GitHub read-only et push S1 désactivé.
- Le runtime `wealthtech_mcp_ssh_bridge` est `running/healthy` avec revision OCI/runtime `2c2dde2bffe62b2685bf2fad94530571762470c8`.
- CI main `33256566688` et Governed Deploy `33256566695` / job `99111230626` ont réussi sur ce SHA exact.
- Live State `stateVersion=51` atteste GitHub↔S1 `ALIGNED`, runtime `ALIGNED`, catalogue MCP `111` outils (`68` read-only, `43` write-capable), audit baseline valide et gouvernance courante.
- Le seul écart restant après la livraison fonctionnelle est `DOCUMENTATION_DRIFT`; la prochaine action runtime est `reconcile_canonical_documentation`.
- Le WRITE gate reste `shadow`; aucun passage `shadow → enforce`, aucune modification 2FA, aucun push direct `main`, aucune écriture source directe sur S1.

## Baseline intégrée avant le chantier courant

- La baseline d'entrée du chantier était `main@a35280e172e40525689520e1443ccd59e850e91a`, merge de la PR #54 `docs(governance): reconcile PR 52 deployment state`.
- La PR #54 était une réconciliation strictement documentaire de `TASK-20260822-001`; elle ne modifiait ni code source, ni workflow, ni OIDC, ni Autodeploy, ni WRITE gate.
- CI main `33222774901` et MCP Governed Deploy `33222774905` avaient réussi sur cette baseline.
- La preuve finale `checkpoint + libération du lock + fermeture de session sans lock résiduel` de `TASK-20260822-001` reste une preuve Operational Memory runtime : elle ne doit pas être inventée depuis GitHub.

## Chantier courant — Unified Operational Work State

- La livraison fonctionnelle a été construite sur la branche gouvernée `mcp/unified-operational-work-state-20260829` sans moteur parallèle.
- PR #55 est fusionnée; son dernier head exact vérifié était `de0030b0df42a693d2e96c87f008c9ffd1c2ce04`, puis merge `2c2dde2bffe62b2685bf2fad94530571762470c8`.
- Les quatre threads de review ont été résolus avant fusion; le ruleset `protect-main` exige PR, résolution des conversations et check `validate`, avec `required_approving_review_count=0` observé.
- Les corrections de review sont intégrées : SHA des check-runs lu depuis chaque `check_runs[].head_sha`, preuve de déploiement corrélée au SHA propre de la tâche, agrégation des rulesets actifs applicables à `main`, et prise en compte du nombre minimal d'approbations.
- Le chantier compose les autorités existantes dans une décision bornée : Live State, Current-State Inventory, Governed Task Queue, Governed Session, locks, contexte GitHub et catalogue MCP.
- `src/governance/operationalDecision.ts` ajoute `CapabilityReality`, `TaskReality` et `GovernanceDecision` sans nouveau store persistant ni nouvelle source de vérité.
- `src/governedContext/` expose la réalité GitHub, la réalité de tâche, la décision gouvernée et l'observabilité/dashboard bornée.
- Observer Before Actor est intégré : une opération qui dépend de GitHub observe la branche de travail, le head exact, les checks/reviews/ruleset et leurs reason codes avant d'être considérée sûre.
- Une session d'intake sans `workBranch` reprend la branche de la tâche courante avant tout fallback explicite; la tâche reste l'autorité de continuité lorsque la session n'a pas encore lié la branche.
- Le collecteur GitHub observe aussi le HEAD read-only de `workBranch` lorsqu'aucune PR n'existe encore.
- Le WRITE gate reste `shadow`; `ENABLE_WRITE_TOOLS`, `allow_write`, OIDC, Autodeploy, 2FA et les contrats historiques restent inchangés.

## Validation fonctionnelle et post-merge

- Head fonctionnel intermédiaire `c25ba8c775b5a2a81f84b424ffd01686e833ea0c` : CI MCP #549 (`33238637948`) verte.
- La revue PR #55 a ensuite fait évoluer la branche jusqu'au head exact `de0030b0df42a693d2e96c87f008c9ffd1c2ce04`.
- MCP CI #577 est verte sur ce head; les tests de non-régression passent et les quatre threads de review sont résolus.
- PR #55 est fusionnée au merge SHA `2c2dde2bffe62b2685bf2fad94530571762470c8`.
- Governed Deploy `33256566695` / job `99111230626` est `success` sur ce SHA exact.
- GitHub main, S1 HEAD, S1 origin/main et runtime revision sont tous attestés à `2c2dde2bffe62b2685bf2fad94530571762470c8`; Docker est `running/healthy`.
- La réconciliation documentaire post-déploiement utilise la branche docs-only `mcp/reconcile-unified-work-state-20260829`, créée depuis l'exact merge fonctionnel. Elle ne doit modifier ni code source, ni workflow, ni policies `.mcp`, ni OIDC/Autodeploy, ni WRITE gate.

## Prochaine action gouvernée

Fusionner la réconciliation strictement documentaire seulement après CI exact-head et vérification du diff docs-only. Ensuite forcer un Live State frais : la politique descendant docs-only doit conserver la baseline fonctionnelle/runtime `2c2dde2bffe62b2685bf2fad94530571762470c8` tout en supprimant `DOCUMENTATION_DRIFT`. Réconcilier alors Current State, Governed Context et Task Reality, faire passer `TASK-20260829-001` par `VERIFYING`, puis `DONE` uniquement depuis Operational Memory avec checkpoint final et libération du lock. La migration des GitHub Actions Node, le nouveau Governed Connection Bootstrap et tout passage `shadow → enforce` restent des chantiers séparés.
