# UTL reconciliation — offline evidence database (PR #372)

## Purpose and authority

This branch contains a reproducible **read-only SQLite analytical reconciliation**, anchored to historical PR [#370](https://github.com/Patricked-code/MCP/pull/370) and [#371](https://github.com/Patricked-code/MCP/pull/371). It is **not** an additional MCP operational registry, Task Queue, GitRegistry, lock/session/claim authority, pipeline or deployment mechanism. It neither opens tasks nor grants write privileges.

**Historical cutoff:** 2026-11-03, GitHub main `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`. Newer branches, unmerged PRs and unreachable commits are not part of this historical baseline. Sources are frozen copies of five files, pinned to their original Git blob SHA in `source_manifest_and_links.json`. No API token or network is required for reconstruction.

## Rebuild and validate

From repository root, Python 3.10+ (stdlib only):

```bash
python3 -m unittest discover -s tests -p 'test_utl_reconciliation.py' -v
python3 scripts/build_utl_reconciliation.py \
  --out /tmp/mcp-utl-reconciliation.sqlite \
  --report /tmp/mcp-utl-reconciliation-report.json
```

The existing **MCP CI** pipeline runs these checks and uploads the rebuilt SQLite and JSON report as the `mcp-utl-reconciliation` artifact. It will not overwrite an existing SQLite output. It only reads version-controlled snapshots and writes to its explicit output path.

Input files:
- PR #370 merged-PR CSV (`PR370_MERGED_PRS_20261103.csv`);
- PR #371 merged-PR, CI, governed-deploy, historical-runtime SQL;
- PR #371 all-main-commits SQL partitions P01/P02 (including parent SHA lists);
- PR #371 completeness manifest (counts, bounds and classification).

All five inputs are byte-pinned by original Git blob SHA. A digest mismatch or disagreement of the 186 PR records, SHA, timestamps or sequence stops the build. All 2,151 main-reachable Git commits, the 186 known merge SHA, and CI/deploy counts are checked; `PRAGMA integrity_check` and `foreign_key_check` must pass.

## Database model

Preserved historical tables from PR #371:
`registry_metadata`, `merged_prs`, `workflow_evidence`, `runtime_evidence`, `main_commits`, and original views.

Analytical UTL overlay:
`utl_source_documents`, `utl_mandates`, `utl_work_items`, `utl_circuits`, `utl_item_circuits`, `utl_continuities`, `utl_item_continuities`, `utl_pr_links`, `utl_runtime_observations`, `utl_reconciliation_runs`, `utl_candidate_refs`, and views `v_utl_pr_reconciliation`, `v_utl_work_history`, `v_utl_evidence_gaps`.

The curated work-item links are intentionally narrow:
- PR #261 → task `TB-W3-F-03` (direct PR title witness);
- PR #355 → work `GD-U-01` (direct PR title witness);
- PR #360 → pilot `PILOT-E2-01`, Entry E2 and canonical root `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` (PR title + issue #359).

These are **work-item identifiers**, not newly invented canonical UTL IDs. The tool does not assume that every PR maps to a unique UTL or that title matches certify ownership. Identifiers mentioned elsewhere in commit and PR titles are stored as `CANDIDATE_ONLY`, not authoritative links. The remaining PRs are explicitly surfaced as unresolved.

## Queries

```sql
SELECT * FROM v_utl_pr_reconciliation WHERE pr_number=261;
SELECT * FROM v_utl_work_history WHERE work_item_id='PILOT-E2-01';
SELECT * FROM v_utl_evidence_gaps ORDER BY pr_number,gap_type;
SELECT * FROM main_commits WHERE sha_classification='OTHER_MAIN_REACHABLE_COMMIT_PR_ASSOCIATION_NOT_VERIFIED';
SELECT * FROM utl_candidate_refs WHERE work_item_candidate LIKE 'TB-%';
SELECT * FROM utl_runtime_observations ORDER BY observed_at DESC;
```

## Interpretation

- 186 merge SHAs are known from PR API evidence. The other 1,965 main-reachable commits are **NOT** classified as direct pushes: PR association is not verified.
- 185 CI-main runs, 171 Governed Deploy runs (165 success) are matched in the **PR #371 archived GitHub workflow observations**, not re-queried by this offline build.
- Missing workflow evidence means `NOT_FOUND`, not `FAILED`.
- GitHub workflow success is not runtime S1 attestation. Historical runtime evidence stays at its archived provenance level; PR #261 is owner-reported, not independently re-attested.
- The separate MCP live observation on 2026-11-04 confirms that main/runtime then both reported `05dbb66...`; it **does not** attest intermediate historical production deployments.
- Candidate relationships require validation against canonical Issue, PR, GitHub continuity checkpoints, and existing MCP authorities. They never become new runtime Task/Session/Lock claims.

## Completion boundary / next safe enrichment

After CI checks pass, use the existing E2/GD-U registries, issue checkpoints and Governed Deploy receipts to approve further specific UTL/Task/Continuity relationships, without assuming that a shared label is a one-to-one mapping. Update curated mapping with exact source URL and record why the authority is sufficient. Keep source snapshots intact; a fresh historical export requires a new explicit snapshot and regression audit, not silent replacement.

## PR372 registre des preuves de déploiement (complément historique V0.1 — 2026-11-05)

Ce registre répond aux améliorations préexistantes **IMP-372-001 à IMP-372-011** sans créer d'ID de déploiement canonique, de second worker ni de canal de mutation. La source SQL d'origine **PR #371** et les historiques **PR #370** restent immuables.

- [PR372_DEPLOYMENT_EVENT_REGISTRY_V01.json](utl-reconciliation/PR372_DEPLOYMENT_EVENT_REGISTRY_V01.json) : **171 événements de workflow Governed Deploy MCP** indexés par **run ID** (et non par SHA) ; **165 SUCCESS**, **6 FAILURE**, **15 PR fusionnées sans observation Deploy dans ce snapshot**.
- **7 événements sur 165 SUCCESS** disposent à ce stade d'une **preuve de job terminal exact-SHA dans les logs GitHub** : PR #58, #95, #261, #300, #350, #365, #367. Les 158 autres restent `GITHUB_WORKFLOW_SUCCESS_ONLY` sans attestation de job vérifiée individuellement.
- `GITHUB_JOB_LOG_TERMINAL_ATTESTED_NOT_INDEPENDENT_S1_RECHECK` confirme le message final et l'ID de job observés dans GitHub Actions, **mais pas** la lecture indépendante historique des fichiers `status.state` et `attestation.json` sur S1. **Aucune** entrée n'est déclarée `PRODUCTION_MODIFICATION_PROVEN` à ce niveau.
- Les six workflows en échec sont archivés explicitement (PR #99, #200, #202, #272, #273, #274) et l'absence d'un run n'est jamais qualifiée d'échec. Le type d'effet réel (nouveau SHA, redéploiement du même SHA, rollback, no-op) reste `UNKNOWN` faute d'état serveur précédent.
- Couverture **MCP Governed Deploy sur S1** issue du snapshot PR #371 ; aucune prétention de couverture exhaustive des applications S1/S2, opérations manuelles, Plesk, migrations de base ou modifications de configuration. Les workflows et tentatives multiples d'un même PR ne sont pas exhaustifs dans le snapshot PR #371.

### Reconstituer le registre SQLite analytique

Commande sans accès réseau, avec Python 3.10+ et les fichiers figés du dépôt :

```bash
python3 -m unittest discover -s tests -p 'test_utl_deploy_event_registry.py' -v
python3 scripts/build_utl_deploy_event_registry.py \
  --out /tmp/mcp-deployment-evidence.sqlite \
  --report /tmp/mcp-deployment-evidence-report.json
```

**Tables et vues de consultation :**

```sql
SELECT pr_number, merged_sha, deploy_run_id, github_job_id, server_job_id,
       evidence_class, attested_at_utc
FROM production_deploy_event
ORDER BY pr_number;

SELECT * FROM v_deploy_workflow_success;
SELECT * FROM v_deploy_terminal_log_correlated;
SELECT * FROM v_production_modification_independently_proven;
```

L'index `deploy_run_id` est unique dans le snapshot, `merged_sha` est délibérément **non unique**, et l'ID d'attestation natif ainsi que `run_attempt` restent `NULL` lorsqu'ils sont inconnus. La base reconstruit une **projection documentaire analytique**, jamais un registre runtime autoritatif. Le build effectue réconciliation exacte avec le SQL historique, vérifications de cardinalité, intégrité SQLite et clés étrangères ; une altération du source SHA ou des preuves est refusée. Le workflow de la PR #372 fabrique et publie l'artefact SQLite + JSON de contrôle **uniquement en CI**, sans écriture sur la production.

**Observation indépendante courante S1 — 5 novembre 2026** : [PR372_S1_CURRENT_RUNTIME_IMAGE_SNAPSHOT_20261105.json](utl-reconciliation/PR372_S1_CURRENT_RUNTIME_IMAGE_SNAPSHOT_20261105.json). `mcp_runtime_image_attestation_s1` + `mcp_git_status_s1` établissent à la date de lecture un runtime `healthy`, l'image `sha256:2e949ce3998a2316064f28b23c94c33914e6d441792226870ddc98ebf11e0059` créée le 31 octobre, et le SHA `05dbb66ed81aa4e7443655c89d10c0c390ff0f10` présent sur GitHub main, checkout S1 et label de l'image. Ce SHA est celui de la PR #367 / Deploy #41171370599. Ce constat prouve **l'état S1 actuel** mais n'est **pas** une relecture des anciennes attestations de job, ni la preuve d'une différence de production avant/après chaque deploy.

**Prochaine preuve à acquérir** : relecture S1 strictement allowlistée des attestations historiques lorsque le canal officiel existe ; réindexation des `run_attempt` et déploiements hors PR #371 ; corrélation `avant/après` pour identifier les *modifications* effectives, et intégration séparée de Governed Deploy Applications. Aucune action d'écriture, aucun merge sur `main` sans accord propriétaire.
