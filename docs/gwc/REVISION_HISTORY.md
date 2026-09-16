# GWC — historique des révisions

Le corps canonique `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` ne contient que l'architecture
retenue courante. Tout ce qui relève de l'histoire de l'analyse vit ici.

| Révision | Date | Baseline | Source d'observation | Statut |
| --- | --- | --- | --- | --- |
| `R1` | 2026-09-15 | `docs/superpowers/specs/2026-09-15-governed-workflow-contract-v1-design.md` | clone local à `main@d1f3039` | superseded |
| `R2` | 2026-09-16 | architecture dérivée, 73 fiches + AF-01 à AF-30 | clone local + GitHub live partiel | superseded, archivée |
| `R3` | 2026-09-16 | `GWC_73_CONTRACT_DESIGN_SHEETS_CANONICAL_R1` | `GITHUB_LIVE` | **canonique** |

## R1 — design d'origine

Fusion du design et des 73 identifiants dans un seul document de spécification. Pose les
familles A→I, les invariants globaux, le concept d'attestation bornée et l'incrément
d'intégration. Aucun runtime.

## R2 — architecture confrontée au code

Préparation architecturale read-only : 73 fiches, 27 puis 30 findings, matrices d'autorité, de
mutation, de concurrence, de rejeu, de défaillance et de menaces, inventaire des hardcodes,
séquence d'implémentation.

Apports conservés :

- les findings de sécurité `AF-19`, `AF-22` et `AF-30`, démontrés depuis GitHub live ;
- le principe « les identifiants sont un espace de noms, pas une séquence » ;
- le refus de toute seconde autorité ;
- la reclassification de `GW-56` en `DERIVE` suivi d'une persistance atomique par `GW-57` ;
- la reclassification de C3 et C5 en généralisation plutôt qu'en création.

Limites reconnues :

- `LOCAL_CLONE_USED = yes` — les conclusions correspondantes ne suffisent pas à une
  certification et ont été revalidées depuis `GITHUB_LIVE` en R3 ;
- le corps du document mêlait architecture retenue, affirmations historiques et amendements
  ajoutés plus loin, ce qui exposait un agent à lire une conclusion invalidée comme actuelle ;
- confusion entre la Governed Task Queue et le futur Execution Engine ;
- modèle `task seed` confondant blueprint et `GovernedTaskRecord`.

Archive : `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md`.

## R3 — réconciliation canonique

Réconciliation du mandat R3 original avec la conception canonique plus récente, menée
intégralement sur la PR existante `#95` et sa branche `claude/ecstatic-edison-v1dyt1`.

Ce qui change :

1. Le corps canonique devient la version longue A→BA des 73 Contract Design Sheets.
2. Les affirmations historiques sortent du corps actif vers `REVISION_HISTORY.md`,
   `DEPRECATED_CLAIMS.md` et l'archive.
3. Le statut d'architecture passe de `AWAITING_HUMAN_RATIFICATION` à
   `READY_FOR_GOVERNED_IMPLEMENTATION`.
4. La Task de ratification humaine est supprimée ; aucun human gate générique n'est créé.
5. `.mcp/gwc-task-seed.json` est remplacé par `.mcp/gwc-blueprints.json` — 18 blueprints
   `GWC-0`…`GWC-17`, jamais chargés par `initializeSeed()`.
6. `.mcp/gwc-contracts.json` devient une projection compacte et déterministe de la baseline
   canonique, sans autorité métier.
7. `.mcp/gwc-workflow-graph.json` matérialise le graphe, arêtes à rebours et sauts déclarés.
8. Les portées de ressource passent au domaine de collision minimal.
9. `scripts/gwc-verify.mjs` contrôle désormais contrats, graphe, blueprints, réciprocité des
   références, propriété architecturale des findings et absence de promotion en Task Queue.

Ce qui ne change pas :

- aucune implémentation runtime GWC n'a démarré ;
- aucune Governed Task n'a été créée ;
- `#95` reste ouverte, draft et non fusionnée ;
- les identifiants `GW-01`…`GW-73` sont inchangés, ni renumérotés, ni supprimés, ni fusionnés.

## R3 — correction du graphe après audit live indépendant

Un audit GitHub live indépendant de la PR `#95` au head `29c46f3c827426b00c1c8901625090414b3e492a`
a confirmé l'essentiel de la réconciliation et relevé un défaut réel dans la matérialisation du
WorkflowGraph. Le défaut a été reproduit puis corrigé sur la même branche et la même PR.

| Finding | Correction |
| --- | --- |
| 69 contrats sur 73 atteignables ; `GW-13`, `GW-14`, `GW-15`, `GW-73` inatteignables | graphe reconstruit en union exacte des deux sens de routage, notations de plage développées — 72 contrats runtime, tous atteignables |
| `GW-72` sans successeur alors que `terminal = GW-73` | `runtimeTerminal = GW-72` et `GW-73` explicitement dans `outOfRuntimeGraph` avec motif et ancres |
| `graph.predecessors` / `successors` du registre contredisant le graphe | champs supprimés au profit de `graphProjection`, projection exacte vérifiée, et de `canonicalRouting`, prose tracée |
| `gwc-verify` passait malgré le défaut | atteignabilité, orphelins, culs-de-sac, terminal, exactitude de projection et statut hors runtime désormais contrôlés |
| `gwc:verify` absent de la CI | étape `GWC dossier check` ajoutée au job `validate` |

Voir `DEPRECATED_CLAIMS.md` DC-12, DC-13 et DC-14.

## Propriété architecturale des findings

| Finding | Propriétaire architectural | Priorité d'implémentation |
| --- | --- | --- |
| `AF-19` — le SHA de squash déployé n'est pas le SHA validé par le check requis | `GWC-15` | prérequis de sûreté, traité en premier |
| `AF-22` + `AF-30` — `ReviewEvidence` non liée au head exact | `GWC-14` | prérequis d'intégrité de preuve, traité en second |
| Pile de PR `#88` → `#89` → `#90` | `GWC-12` | traité en troisième |
| Multi-repository `TargetScope` | `GWC-10` | selon le graphe de dépendances |

La priorité d'implémentation est volontairement plus précoce que la position du blueprint
propriétaire dans le graphe. Cela ne crée pas d'architecture parallèle : la propriété
architecturale reste inchangée.
