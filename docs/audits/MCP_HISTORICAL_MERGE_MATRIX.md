# MCP — Matrice historique de fusion et traçabilité opérationnelle

## Périmètre
Patricked-code/MCP, depuis le premier commit accessible sur main jusqu'au HEAD observé.
La matrice ne confond pas PR, commit SHA, Merge SHA, CI main, Governed Deploy Run et runtime S1.

## Baseline attestée (observation MCP, 2026-11-03)
- GitHub main: `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`
- Runtime revision: `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`
- Live State version: 1202
- Exemple historique communiqué à réconcilier: Merge SHA `6576b5287f23566684005adf6032734e2ecdea50`; CI main `37817792888`; Governed Deploy Run `37817792904`; Runtime `6576b5287f23566684005adf6032734e2ecdea50`. Les identifiants de run doivent encore être rattachés par une preuve source.

## Tables et jointures obligatoires
1. Mandat/programme → chantier → tâche, avec typologie (incident ponctuel, tâche gouvernée, programme).
2. Chantier → root Continuity ID → sous-continuités → E1/E2 et UTL/circuit de tâches.
3. PR → base/head → merge_commit_sha → commit effectivement présent dans main.
4. Merge SHA → workflow GitHub Actions (SHA, nom, event, conclusion, URL).
5. Workflow → Governed Deploy Run via identifiants/références de reçus, jamais par proximité temporelle.
6. Deploy Run → SHA runtime S1 attesté → checkpoint / provenance / statut de réconciliation.
7. Contrôle de complétude : historique paginé sans omission, PR fusionnées y compris squash/rebase et commits directs explicitement distincts.

## Colonnes requises
`date, programme, mandat, chantier, task_id, continuity_root, continuity_child, entry_profile, utl_id, circuit_id, pr_number, pr_url, merge_sha, ci_main_run_id, ci_main_conclusion, governed_deploy_run_id, deploy_conclusion, runtime_sha, runtime_attestation_url, evidence_source, confidence, outstanding_gap`.

## Génération exhaustive à partir de GitHub
Le script read-only `scripts/export_merge_traceability.py` pagine les PR, les commits de main et les Actions. Il écrit trois CSV et un manifest dans `artifacts/merge-traceability/`, sans modifier GitHub.

Ce script établit la **couche GitHub exhaustive**, sous réserve d'un accès complet et d'une pagination réussie. Les relations CI/deploy/runtime et les classifications programme/tâche restent à enrichir par les autorités MCP et preuves de déploiement. Les champs non attestés restent vides : aucun rapprochement fictif.

## Contrôles qualité
- Ne pas enregistrer un run CI de PR comme une CI main.
- Ne pas présumer que chaque commit main est une fusion de PR.
- Ne pas prétendre que les données GitHub prouvent l'état du runtime.
- Respecter le GitHub-first, pas d'écriture directe main, aucune régression.
- Ne pas transformer cet audit documentaire en nouveau chantier d'ingénierie MCP.
