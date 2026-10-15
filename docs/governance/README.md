# Gouvernance documentaire MCP


## Index de reprise — audit, programme et traçabilité (observation du 2026-10-15)

**Point d'entrée documentaire, non nouvelle source de vérité.** L'agent commence par `CLAUDE.md` et `AGENTS.md`, puis consulte :

1. **Architecture cible et pacte** — `ARCHITECTURE.md`, `ROADMAP.md`, `CLAUDE.md §7.1–7.5`, `.mcp/github-first-operational-policy.json` et [issue #235](https://github.com/Patricked-code/MCP/issues/235).
2. **Audit de l'histoire depuis #65** — `architecture-chronology-issue65-20261009.json` (78 issues, 130 PR), `architecture-comments-batch01..06-20261009.json` et les archives de décisions.
3. **Revues complémentaires GWB-02** — `gwb02-inline-pr-review-comments-20261015.json`, `gwb02-pr-review-submissions-batch01..09-20261015.json`, `gwb02-pr-review-submissions-postbaseline-20261015.json`, `gwb02-review-coverage-manifest-20261015.json` : 282 commentaires inline, 215 soumissions sur 135 PR ; commentaires directs sur commits encore non vérifiés.
4. **Triage GWB-03** — `gwb03-pr-review-findings-triage-20261015.json` : 158 remarques historiques P1/P2, 3 vérifications ciblées de code/tests ; leur statut de résolution **reste non certifié**.
5. **Matrice GWB-04** — `gwb04-94-blueprint-source-test-trace-20261015.json` : existence de chemins sources/tests pour 94 blueprints, pas une preuve d'acceptation fonctionnelle.
6. **Plan gouverné des travaux successifs** — `governed-audit-continuation-workblock-20261009.json` : GWB-00..09 et leurs dépendances ; ses `PLANNED_NOT_RUNTIME_TASK` sont intentionnels, son `currentCheckpoint` n'a pas autorité live.
7. **Ordre et état de planification** — `program-backlog-convergence.json`, `TASKS.md`, `SUIVI.md` ; `npm run program:readiness` puis `npm run program:next` après lecture et réconciliation. Le Program Backlog ne crée pas de task.
8. **Preuves et journaux** — [PR #290](https://github.com/Patricked-code/MCP/pull/290), [#291](https://github.com/Patricked-code/MCP/pull/291), [#292](https://github.com/Patricked-code/MCP/pull/292), GitHub Actions, `CHANGELOG.md`, `DECISIONS_LOG.md`, et commentaires de l'[issue #235](https://github.com/Patricked-code/MCP/issues/235).
9. **Mémoire maître historique** — `MASTER_RESUME_MEMORY.md` conserve aussi le snapshot du 5 octobre. **Ne pas reprendre ses nombres et son NEXT_ACTION comme courants** sans relecture de l'état ci-dessus.

**À la date d'observation** : `main@b187953de89d8f6529e2af97abc1de4570c53146` et CI/Governed Deploy du SHA réussis ; 94 blueprints : 36 DONE, 18 READY, 28 BLOCKED, 5 CONDITIONAL, 7 DEFERRED (projection seulement). L'issue #207 OAuth est DRAFT/dirty, propriétaire et autorisations à préserver ; GitHub Actions/OIDC reste le chemin de continuité prioritaire.

**NEXT_ACTION de l'audit** : vérifier contre le code et les tests actuels les constats de la PR #261 (GWB03-01), puis ceux de #267 (GWB03-02), et approfondir GWB-04 sur les 18 READY et les 36 DONE ; classifier uniquement les écarts prouvés, reprendre GWB-05..09 via l'architecture et les autorités existantes. Après chaque étape : preuves, checkpoint, recalcul, prochain travail admissible. Ne jamais considérer `GLOBAL_MCP_COMPLETE` comme atteint sans acceptation backend + clients + cockpit.


## Objet

Ce répertoire contrôle déterministement les Markdown de `Patricked-code/MCP` et distingue les fichiers Git des miroirs runtime-only.

## Surface courante réattestée

La passe read-only post-workflow a observé :

- 204 Markdown suivis par Git et classifiés individuellement dans `markdown-inventory.json` ;
- 33 Markdown sous `wealthtech_project_memory/memory/` sur S1 ;
- 7 de ces 33 également suivis par Git ;
- 26 Markdown runtime-only ;
- surface Git gouvernée actuelle : 204 Markdown ; la composante runtime-only doit
  être réobservée avant tout nouveau total combiné.

## Historique 209

L’ancienne photographie reste `183 Git + 26 runtime-only = 209`. Elle ne doit jamais être substituée au courant. L’évolution Git est `183 → 196`, soit treize Markdown supplémentaires. Les anciens chemins différentiels exacts ne sont pas affirmés sans l’ancien snapshot individuel.

## Catégories Git

Chaque Markdown suivi appartient à exactement une catégorie déterministe : `canonical`, `root-documentation`, `documentation`, `history`, `engineering-plan`, `engineering-spec`, `migration-history`, `memory` ou `runtime-mirror-tracked`.

## Baseline et CI

`markdown-inventory.json` contient les 204 chemins et catégories exacts. La CI échoue sur ajout, disparition, catégorie divergente, document non classifié ou contradiction `canonical-state`.

L’artefact `mcp-autodeploy-governance` copie désormais exactement les sept documents actifs suivis ; il ne génère plus d’anciens candidats codés en dur.

## Limite de preuve

GitHub Actions contrôle Git. La surface runtime-only exige toujours une lecture S1 fraîche pour une déclaration courante ; la présente valeur 26 provient d’une telle lecture gouvernée, mais devra être réattestée lors d’un futur rapport si elle est alors utilisée comme état courant.
