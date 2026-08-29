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

Travaux restant réellement à accomplir. Les états dynamiques de tâche, session, branche et PR sont lus depuis leurs autorités runtime/GitHub et ne sont pas figés ici.

## Governed Autodeploy V1

- [x] Bootstrap manuel et preuves automatiques exact-SHA attestés.
- [x] `pushEnabled=true`, OIDC GitHub et déploiement fail-closed actifs.
- [x] PR #44, #45, #47 et #55 fusionnées et automatiquement déployées.
- [x] S1, OCI, Docker, health et Live State technique réattestés sur les jalons clôturés.

## Governed Session Continuity / Operational Memory V1

- [x] Réaliser la portée initiale, les hardenings PR #45 et la première réconciliation documentaire.
- [x] Reproduire puis corriger les trois findings tardifs PR #45.
- [x] Valider le head PR #47 avec `12/12 + 188/188`, typecheck, build, docs, secrets et diff.
- [x] Fusionner exact-head, attester l'Autodeploy et résoudre les trois threads PR #45.
- [x] Obtenir `FULLY_ALIGNED` par la politique descendant docs-only puis clôturer `TASK-20260813-004`.

## Mandatory Agent Bootstrap & Work Orchestration V1

- [x] Catalogue et cartographie dérivés des registrations réelles.
- [x] Inventaire architecture/documents/audits/politiques dérivé du SHA suivi.
- [x] Live State enrichi, Bootstrap Receipt, Task Registry et Work Queue persistante.
- [x] Governed Context, onboarding, dashboard, audit et verdicts `shadow` enrichis.
- [x] PR #49 fusionnée et déployée exact-SHA.
- [x] Findings tardifs PR #49 et écarts de gate/catalogue corrigés par PR #52.
- [x] PR #52 fusionnée, CI/Autodeploy exact-SHA et GitHub/S1/OCI/runtime attestés au SHA `fff44ff2db386942730a67f3884980c7824cae7f`.
- [x] Réconciliation documentaire fusionnée par PR #54 au SHA `a35280e172e40525689520e1443ccd59e850e91a`; CI main `33222774901` et Governed Deploy `33222774905` réussis.
- [ ] Lire Operational Memory pour attester le checkpoint final, la libération du lock et la fermeture de session sans lock résiduel; ne pas déduire cette preuve depuis GitHub.

## Unified Operational Work State — clôture en cours

- [x] Réutiliser Live State, Current-State Inventory, Operational Memory, Governed Task Queue, GitHub context et scoped WRITE gate; aucun nouveau store global.
- [x] Ajouter `CapabilityReality`, `TaskReality` et `GovernanceDecision` comme projections dérivées et bornées.
- [x] Ajouter l'observation GitHub exacte de la branche/PR/checks/reviews/ruleset/ownership/fraîcheur sans nouveau collecteur concurrent.
- [x] Exposer la réalité unifiée dans Governed Context et le dashboard.
- [x] Préserver la parité du gate `shadow` et les contrats historiques.
- [x] Intégrer Observer Before Actor au chemin réel et ajouter son test de régression complet.
- [x] Corriger la reprise de `currentTask.workBranch` pour les sessions d'intake sans branche.
- [x] Propager les reason codes GitHub vers `GovernanceDecision`.
- [x] Distinguer cache miss, auth manquante/invalide, permission denied, not-found/invisible incertain, timeout, stale, head mismatch, checks pending/failed et review bloquante.
- [x] Prouver qu'une indisponibilité GitHub ne bloque pas artificiellement une opération indépendante de GitHub.
- [x] Observer le HEAD de `workBranch` avant PR lorsque la branche existe, par lecture GitHub bornée et read-only.
- [x] Corriger les quatre findings finaux de PR #55 et valider le head exact `de0030b0df42a693d2e96c87f008c9ffd1c2ce04` par CI `33256403390` / job `99110808499`, avec `250/250` tests.
- [x] Résoudre les threads, satisfaire `protect-main` et fusionner PR #55 sous garde exact-head.
- [x] Attester le merge fonctionnel `2c2dde2bffe62b2685bf2fad94530571762470c8`, CI main `33256566688` et Governed Deploy `33256566695` / job `99111230626`.
- [x] Réattester GitHub main, S1 HEAD/origin-main et runtime healthy sur le même SHA dans Live State `51`.
- [x] Démarrer la réconciliation documentaire post-déploiement sur `mcp/reconcile-unified-operational-work-state-20260829` sans code, workflow, policy ou changement de WRITE gate.
- [ ] Ouvrir la PR docs-only, vérifier son diff, puis obtenir CI/review/ruleset exact-head propres.
- [ ] Fusionner cette réconciliation documentaire sous garde exact-head et laisser l'Autodeploy existant maintenir l'alignement.
- [ ] Réconcilier un Live State frais et vérifier la disparition de `DOCUMENTATION_DRIFT` sans masquer un autre drift.
- [ ] Réconcilier Current State, Governed Context et Task Reality ; faire évoluer `TASK-20260829-001` jusqu'à `DONE` uniquement depuis Operational Memory.
- [ ] Créer le checkpoint final, libérer le lock et préserver/fermer la Governed Session selon son cycle normal.
- [ ] Ensuite seulement enregistrer la première tâche du programme suivant : `Automatic Governed Connection Bootstrap & Conversation Session Binding`.

## Maintenance séparée

- [ ] Migrer dans une PR dédiée les actions GitHub encore exécutées sous compatibilité Node 24.
- [ ] Évaluer un éventuel passage `WRITE gate shadow → enforce` uniquement après GO distinct, décision architecturale, TDD, PR séparée et preuve de parité; ce n'est pas inclus dans le chantier courant.
- La 2FA GitHub reste explicitement exclue.
