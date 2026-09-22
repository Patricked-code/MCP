# Réconciliation des intentions des anciennes PR ouvertes — 2026-09-22

## Objet

Cette note classe les PR ouvertes historiques #85, #86, #88, #89 et #90 contre l'état courant de `main@87deb6311e13a37f09f6570a78c2f502df12a240`.

Elle est une trace de continuité et de backlog, pas une autorité runtime. Elle ne crée aucun `TASK-*`, aucune Governed Session, aucun lock, aucune permission et aucune autorisation de mutation serveur.

## Règle de non-régression

Les cinq PR partent d'une ancienne lignée basée sur `555a51d0648ef796eba4868282942055a2f67a65` et sont aujourd'hui divergées de `main`. Elles ne doivent pas être fusionnées, rebasées ou cherry-pickées en bloc pour récupérer leur intention.

La règle est :

`READ OLD INTENT -> SEARCH CURRENT IMPLEMENTATION -> CLASSIFY -> RE-DERIVE ONLY THE MISSING DELTA FROM CURRENT MAIN`.

Toute capacité déjà matérialisée ou superseded reste protégée contre une réimplémentation parallèle.

## Matrice de réconciliation

| PR | Intention historique | État contre main actuel | Disposition |
| --- | --- | --- | --- |
| #85 | Governed GitHub Actions -> SSH Transport V1 | L'intention GitHub-first a été absorbée par la politique GitHub-first, le fallback OIDC read-only et le bounded-write Stablecoin séparé. | `ABSORBED_AS_HISTORICAL_INTENT`. Ne pas fusionner la PR. Toute nouvelle écriture serveur reste un chantier borné distinct. |
| #86 | Stablecoin S2 sync/deploy gouverné, incluant ff-only puis build/restart | Le besoin de fast-forward non applicatif est remplacé par le chemin GitHub OIDC bounded-write de PR #117. Les issues #118 puis #121 attestent deux fast-forwards SUCCESS jusqu'à `2a8be8219689e6213ce20f13d69b6b45f3693dfe`, avec `applicationFiles=0`. | `SUPERSEDED_FOR_NON_APPLICATION_FAST_FORWARD`. Le build/restart applicatif reste, s'il devient nécessaire, un futur chantier séparé et ne doit pas être réactivé depuis #86. |
| #88 | `github_create_repository` privé, organisation bornée, scoped-write | Le module/outillage de #88 n'est pas présent sur main. GWC-12 classe explicitement cette capacité `DEFER`. | `DEFERRED_VALID_INTENT`. Reconcevoir depuis le main courant avant tout RED/GREEN ; ne pas reprendre le vieux patch. |
| #89 | Fondation Git/GitHub Control Plane + 12 outils READ + manifeste 170 capacités | Les 12 outils READ sont présents dans `src/tools/githubControlPlaneRead.ts`. Le manifeste historique `.mcp/git-github-capabilities.json` est absent et GWC-12 le classe `SUPERSEDED`. | `READ_SPLIT_MATERIALIZED / MANIFEST_SUPERSEDED`. Aucun travail de réimplémentation. |
| #90 | Lifecycle GitHub READ/WRITE étendu | GWC-12 a ré-dérivé et intégré un sous-ensemble depuis l'état courant, puis a explicitement différé le reste. | `PARTIALLY_MATERIALIZED_WITH_EXPLICIT_DEFERRED_SET`. Seuls les deltas différés peuvent devenir de futurs work items, un par collision/safety domain. |

## Sous-ensemble #90 déjà matérialisé

READ :
- `github_get_review_threads`.

WRITE :
- `github_create_branch`;
- `github_create_commit`;
- `github_create_or_update_file`;
- `github_create_pull_request`;
- `github_mark_pr_ready`;
- `github_reply_review_thread`;
- `github_resolve_review_thread`;
- `github_merge_pull_request`.

Ces capacités ne doivent pas être reproposées comme nouveaux chantiers sans nouvelle exigence distincte.

## Sous-ensemble explicitement différé par GWC-12

- `github_create_repository`;
- `github_delete_branch`;
- `github_delete_file`;
- `github_request_review`;
- `github_update_pull_request`;
- `github_get_tree`;
- `github_get_commits`;
- `github_get_commit_diff`;
- `github_get_mergeability`;
- `github_get_required_checks`.

Avant implémentation, chaque capacité doit être comparée aux surfaces actuelles pour éliminer tout doublon sémantique. Les lectures peuvent être regroupées dans un lot read-only si leurs contrats restent distincts. Les mutations de métadonnées, demandes de review, suppressions Git et création de repository restent des lots WRITE séparables ; les opérations DELETE ne doivent pas élargir implicitement le transport actuel.

## Stablecoin : intention résiduelle utile de #86

Le chemin courant de fast-forward volontairement sans build/restart est la bonne autorité pour les deltas non applicatifs.

Si un futur delta Stablecoin contient des fichiers applicatifs, il faut concevoir un chemin séparé qui prouve explicitement :
- target/repository/runtime exacts ;
- dirty/divergence fail-closed ;
- build déterministe ;
- mécanisme de restart borné ;
- health checks avant/après ;
- rollback/recovery ;
- absence de shell arbitraire ;
- aucune écriture serveur de code hors GitHub -> mécanisme gouverné ;
- non-régression du chemin bounded-write non applicatif existant.

Ce futur chantier ne doit jamais être obtenu en réactivant directement le code stale de #86.

## Prochaine séquence candidate

1. Conserver #85/#86/#89 comme provenance historique, sans merge.
2. Pour #88, inventorier les primitives actuelles de création/administration repository avant de décider si `github_create_repository` reste nécessaire.
3. Pour #90 READ différé, faire une matrice de chevauchement avec `githubControlPlaneRead`, Governed Context et les outils GitHub actuels.
4. Ne matérialiser ensuite que les capacités réellement manquantes, en RED -> GREEN -> régression -> exact-head CI.
5. Traiter séparément les WRITE à risque : repository creation, PR metadata/reviewer mutations, file/branch deletion.
6. Préserver `@GitHub` comme surface prioritaire ; aucun bridge interactif n'est requis pour cette réconciliation documentaire.

## Frontières

- aucune fermeture automatique des anciennes PR ;
- aucun merge/rebase/cherry-pick des branches historiques ;
- aucun code runtime modifié ;
- aucun S1/S2/production modifié ;
- aucun nouveau store, registre ou authority ;
- aucun `TASK-*` inventé ;
- aucune permission élargie.
