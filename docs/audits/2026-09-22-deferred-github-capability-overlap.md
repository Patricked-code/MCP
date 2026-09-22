# Audit current-first des capacités GitHub différées par GWC-12 — 2026-09-22

## Baseline

- repository : `Patricked-code/MCP`
- code analysé : `main@87deb6311e13a37f09f6570a78c2f502df12a240`
- source historique : PR #88/#90 et checkpoint canonique GWC-12
- règle : aucune capacité différée n'est présumée manquante avant comparaison avec la surface actuelle.

## Verdict par capacité

| Capacité historique | Verdict current-first | Motif | Suite |
| --- | --- | --- | --- |
| `github_create_repository` | `MISSING_UNIQUE_ADMIN_WRITE` | Aucun `githubAdmin.ts` / `repositoryAdmin.ts` ni outil équivalent n'est présent sur main. | Conserver comme candidat séparé. Reconcevoir depuis les autorités actuelles ; private-only, org-bounded, idempotent et fail-closed. |
| `github_delete_branch` | `MISSING_DESTRUCTIVE_WRITE` | Aucun outil courant ne supprime une ref. Le transport GitHub serveur actuel n'autorise que GET/POST/PATCH/PUT. | Lot destructif séparé. Ne pas élargir implicitement le transport à DELETE. Exiger head exact, branche non-default et postconditions. |
| `github_delete_file` | `MISSING_DESTRUCTIVE_WRITE` | `github_create_commit` et `github_create_or_update_file` ne portent que des blobs avec contenu ; aucune suppression de path n'est exposée. | Lot destructif séparé. Préférer une généralisation interne du commit Git tree fail-closed plutôt qu'un endpoint Contents DELETE ad hoc. |
| `github_request_review` | `MISSING_PR_WRITE` | Aucun outil courant ne demande un reviewer. | Candidat WRITE borné, avec relecture du PR head exact avant mutation et déduplication/allowlist des reviewers. |
| `github_update_pull_request` | `MISSING_BUT_OLD_CONTRACT_TOO_BROAD` | L'ancien #90 permettait title/body/state/base sans liaison au head exact. Le modèle courant exige exact-head pour les mutations PR. | Ne pas cherry-pick. Scinder au minimum metadata non terminale et changements sensibles (state/base), ou réduire le scope. |
| `github_get_tree` | `MISSING_UNIQUE_READ` | Le tree est lu en interne par `createCommitInternal()` mais n'est pas exposé en READ. | Bon candidat read-only : arbre borné, sans blobs, statut `truncated` explicite. |
| `github_get_commits` | `MISSING_UNIQUE_READ` | `github_get_commit_state` lit un commit et `github_compare_refs` une plage, mais aucune liste récente de commits n'est exposée. | Bon candidat read-only borné/paginé. |
| `github_get_commit_diff` | `COMPOSABLE_NO_NEW_PRIMITIVE_REQUIRED` | `github_get_commit_state` fournit les parents ; `github_compare_refs(parent, commit)` fournit la liste bornée des fichiers et changements sans patch brut. | Ne pas créer un outil doublon tant qu'aucun besoin atomique non composable n'est prouvé. |
| `github_get_mergeability` | `DUPLICATE_CURRENT_TOOL` | `github_get_pull_request_state` retourne déjà `headSha`, `draft`, `merged`, `mergeable` et `mergeableState`. | Retirer du backlog d'implémentation ; garder seulement la provenance historique. |
| `github_get_required_checks` | `MISSING_COMPLEMENTARY_READ` | `github_get_commit_checks` observe les runs d'un commit et `github_get_rulesets` résume les rulesets ; aucun outil READ autonome ne projette les checks requis applicables à une branche arbitraire. Governed Context sait le dériver pour son contexte gouverné, mais ce n'est pas une surface générale de lecture. | Candidat read-only à dériver des mêmes autorités GitHub, sans nouvelle autorité. |

## Séquence technique recommandée

### Lot R1 — READ sans nouvelle autorité

Candidats :
- `github_get_commits`;
- `github_get_tree`;
- `github_get_required_checks`.

Règles :
- reuse de `githubJsonRequestWithServerCredential`;
- organisation bornée à `GITHUB_ORG`;
- sorties bornées et sanitizées ;
- aucune permission dérivée ;
- aucune mutation ;
- tests RED -> GREEN + cartographie + régression.

Ne pas ajouter :
- `github_get_mergeability` : doublon ;
- `github_get_commit_diff` : composable avec les primitives actuelles.

### Lot W1 — mutations PR non destructives

Candidats :
- demande de review ;
- update PR réduit/adapté.

Obligations :
- `ENABLE_WRITE_TOOLS=true`;
- scoped write gate `shadow_ready`;
- PR/head exact relu immédiatement avant mutation ;
- payload borné ;
- aucune transition terminale cachée ;
- aucun changement de base ou fermeture dans le même contrat qu'une simple édition title/body sans décision explicite.

### Lot A1 — création de repository

`github_create_repository` reste distinct car la cible repository n'existe pas encore au moment de la mutation. Le design doit donc préciser comment l'autorité de target scope est établie sans inventer un repository context préexistant.

Minimum :
- organisation exacte configurée ;
- private-only ;
- `auto_init=false` ;
- relecture idempotente avant création ;
- collision publique ou type inattendu => fail-closed ;
- aucune permission nouvelle accordée implicitement ;
- aucune création de ruleset/webhook/project par effet de bord.

### Lot D1 — suppressions

`github_delete_file` et `github_delete_branch` restent séparés des autres WRITE.

Pour un fichier :
- branch head exact ;
- path exact et existant ;
- idéalement blob SHA attendu ;
- commit Git standard, non force ;
- métadonnées/tree fail-closed.

Pour une branche :
- head exact ;
- interdiction default branch ;
- vérifier les dépendances PR/merge pertinentes ;
- transport DELETE explicitement gouverné s'il devient nécessaire ;
- aucun force-push/reset.

## Décision anti-doublon

Sur les dix éléments différés GWC-12 :
- 1 est un doublon pur : `github_get_mergeability`;
- 1 est composable sans nouvelle primitive : `github_get_commit_diff`;
- 3 sont des READ complémentaires : commits, tree, required checks ;
- 2 sont des mutations PR à redessiner current-first : request review, update PR ;
- 1 est une mutation admin distincte : create repository ;
- 2 sont destructives et restent isolées : delete file, delete branch.

Aucune de ces conclusions n'autorise une implémentation runtime par elle-même.
