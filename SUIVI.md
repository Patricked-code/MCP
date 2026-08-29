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
- Baseline de branche : `main@a35280e172e40525689520e1443ccd59e850e91a`; la branche reste descendante directe de cette baseline.
- Le chantier compose les autorités existantes dans une décision bornée : Live State, Current-State Inventory, Governed Task Queue, Governed Session, locks, contexte GitHub et catalogue MCP.
- `src/governance/operationalDecision.ts` ajoute `CapabilityReality`, `TaskReality` et `GovernanceDecision` sans nouveau store persistant ni nouvelle source de vérité.
- `src/governedContext/` est enrichi pour exposer la réalité GitHub, la réalité de tâche, la décision gouvernée et l'observabilité/dashboard bornée.
- Observer Before Actor est intégré : une opération qui dépend de GitHub doit observer la branche de travail, le head exact, les checks/reviews/ruleset et leurs reason codes avant d'être considérée sûre.
- Une session d'intake sans `workBranch` reprend désormais la branche de la tâche courante avant tout fallback explicite; la tâche reste l'autorité de continuité lorsque la session n'a pas encore lié la branche.
- Les reason codes GitHub déjà observés sont propagés dans `GovernanceDecision`; un check requis en échec peut donc rendre `mayMutate=false` sans modifier le comportement historique du WRITE gate.
- Le WRITE gate reste `shadow`; `ENABLE_WRITE_TOOLS`, `allow_write`, OIDC, Autodeploy, 2FA et les 92 contrats historiques restent inchangés.

## Validation fonctionnelle fraîche

- Head fonctionnel avant la présente réconciliation documentaire : `34d51247c021524f4c3e03824c938529bc831743`.
- CI MCP `33236805556`, job `99059095387` : success.
- Étapes réussies : typecheck, build, docs check, governance tests, secret scan, read-only safety tests et whitespace diff check.
- Le test d'intégration `branchless intake session observes task branch and propagates operation evidence into one decision` est passé après deux corrections minimales : branche de tâche puis propagation des reason codes GitHub.
- Aucun merge, aucun déploiement de ce chantier, aucune écriture directe S1 et aucune activation `enforce` ne sont déclarés à ce stade.

## Prochaine action gouvernée

Valider le head documentaire exact, ouvrir une Draft PR depuis la branche existante, exiger CI et revue du head exact, traiter tout finding sans élargir le scope, puis seulement si les gardes sont vertes effectuer la fusion gouvernée et laisser l'Autodeploy exact-SHA s'exécuter. Après fusion, réattester GitHub/main, déploiement, runtime et Live State; toute clôture de tâche/session/lock runtime doit provenir d'Operational Memory, pas d'une déduction GitHub. La migration des GitHub Actions Node et tout passage `shadow → enforce` restent des chantiers séparés.
