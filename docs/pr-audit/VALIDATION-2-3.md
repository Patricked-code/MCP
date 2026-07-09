# Validation des blockers #2 et #3

## #2 — validation minimale

- [ ] Connecteur GitHub/Codex/MCP autorisé sur `chainsolutions-wealthtech`.
- [ ] `github_list_orgs` peut voir ou valider l’organisation cible.
- [ ] `github_list_repos` peut inclure `chainsolutions-wealthtech/.github`.
- [ ] `/git/repos` ne signale plus l’accès organisation comme bloqué.
- [ ] Aucun token brut ou secret exposé.

## #3 — validation minimale

- [ ] Inventaire privé S1/S2 disponible hors Git.
- [ ] Référence backup/export hors Git.
- [ ] Plan rollback hors Git.
- [ ] Approbation opérateur hors Git.
- [ ] Tests post-action définis.
- [ ] Aucune action production avant preuve.

## Décision

Tant que ces cases ne sont pas validées, #2 et #3 restent ouverts et bloquants.
