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

## Baseline intégrée avant le chantier courant

- `main` est au SHA `a35280e172e40525689520e1443ccd59e850e91a`, merge de la PR #54 `docs(governance): reconcile PR 52 deployment state`.
- La PR #54 est une réconciliation strictement documentaire de `TASK-20260822-001`; elle ne modifie ni code source, ni workflow, ni OIDC, ni Autodeploy, ni WRITE gate.
- CI main `33222774901` et MCP Governed Deploy `33222774905` ont réussi sur ce SHA exact.
- La fusion documentaire restant cochée comme non faite dans les anciens `TASKS.md`/`TODO.md` est donc désormais réconciliée comme terminée.
- La preuve finale `checkpoint + libération du lock + fermeture de session sans lock résiduel` reste une preuve Operational Memory runtime : elle ne doit pas être inventée depuis GitHub.

## Chantier courant — Unified Operational Work State

- Branche gouvernée existante conservée : `mcp/unified-operational-work-state-20260829`; aucune nouvelle branche et aucun moteur parallèle n'ont été créés.
- Draft PR existante : #55 `feat(governance): unify operational work state`; elle reste Draft tant que les gardes exact-head/review ne sont pas complètement satisfaites.
- Baseline de branche : `main@a35280e172e40525689520e1443ccd59e850e91a`; la branche reste descendante directe de cette baseline.
- Le chantier compose les autorités existantes dans une décision bornée : Live State, Current-State Inventory, Governed Task Queue, Governed Session, locks, contexte GitHub et catalogue MCP.
- `src/governance/operationalDecision.ts` ajoute `CapabilityReality`, `TaskReality` et `GovernanceDecision` sans nouveau store persistant ni nouvelle source de vérité.
- `src/governedContext/` est enrichi pour exposer la réalité GitHub, la réalité de tâche, la décision gouvernée et l'observabilité/dashboard bornée.
- Observer Before Actor est intégré : une opération qui dépend de GitHub doit observer la branche de travail, le head exact, les checks/reviews/ruleset et leurs reason codes avant d'être considérée sûre.
- Une session d'intake sans `workBranch` reprend désormais la branche de la tâche courante avant tout fallback explicite; la tâche reste l'autorité de continuité lorsque la session n'a pas encore lié la branche.
- Les reason codes GitHub déjà observés sont propagés dans `GovernanceDecision`; un check requis en échec peut donc rendre `mayMutate=false` sans modifier le comportement historique du WRITE gate.
- Le collecteur GitHub observe désormais aussi le HEAD read-only de `workBranch` lorsqu'aucune PR n'existe encore; l'Observer Before Actor ne dépend donc plus de l'existence préalable d'une PR pour connaître le head de travail.
- Le WRITE gate reste `shadow`; `ENABLE_WRITE_TOOLS`, `allow_write`, OIDC, Autodeploy, 2FA et les 92 contrats historiques restent inchangés.

## Validation fonctionnelle fraîche

- Head fonctionnel initial du lot Observer Before Actor : `34d51247c021524f4c3e03824c938529bc831743`, CI MCP `33236805556`, job `99059095387` : success.
- Le dernier test RED de clôture a ensuite exigé l'observation du HEAD de `workBranch` avant toute PR; le RED exact a été attesté au head `25838a2d7265f907705f6febaf23e4878a554589` par CI #547 (`33237579706`), avec un seul échec ciblé sur `workBranchHead=null`.
- GREEN minimal au head fonctionnel `c25ba8c775b5a2a81f84b424ffd01686e833ea0c` : lecture read-only de `/commits/<workBranch>` uniquement lorsqu'aucune PR n'existe, sans nouveau store ni nouvelle autorité.
- CI MCP #549 (`33238637948`), job `99064005788` : success sur `c25ba8c775b5a2a81f84b424ffd01686e833ea0c`.
- Étapes réussies : typecheck, build, docs check, governance tests, secret scan, read-only safety tests (`247/247`) et whitespace diff check.
- Aucun merge, aucun déploiement de ce chantier, aucune écriture directe S1 et aucune activation `enforce` ne sont déclarés à ce stade.

## Prochaine action gouvernée

Valider le head documentaire exact après cette réconciliation, conserver PR #55 sur la même branche, vérifier de nouveau CI exact-head, reviews, threads et ruleset, puis sortir du Draft uniquement si toutes les gardes sont propres. Fusionner ensuite avec garde `expected_head_sha`, laisser l'Autodeploy exact-SHA existant s'exécuter et réattester GitHub/main, S1, OCI/runtime, Live State, Current State et Task Reality avant toute déclaration `DONE`. Toute clôture de tâche/session/lock runtime doit provenir d'Operational Memory, pas d'une déduction GitHub. La migration des GitHub Actions Node et tout passage `shadow → enforce` restent des chantiers séparés.
