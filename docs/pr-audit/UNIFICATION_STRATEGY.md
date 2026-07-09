# Stratégie d’unification PR #1 #4 #5 avec blockers #2 #3

## Point de départ

`main` contient déjà la PR #6 : gouvernance anti-dispersion, manuel MCP, cartographie fonctionnelle, modèle d’identité MCP/Git, mode d’utilisation intelligent et fichiers `.mcp` de gouvernance.

La PR #7 conserve l’audit brut complet avec les fichiers `*.merge-tree.txt`.

La PR #8 constitue une première synthèse propre sans fichiers `*.merge-tree.txt`.

Ce complément ajoute les issues #2 et #3 dans l’analyse, car elles sont mentionnées par PR #1 et bloquent une partie de l’objectif.

## Statut de #2 et #3

- #2 : issue ouverte / blocker GitHub connector / external action.
- #3 : issue ouverte / blocker private inventory / operator approval.

Ce ne sont pas des Pull Requests.

Elles ne doivent pas être fermées ou marquées résolues sans preuve.

## Conséquence stratégique

L’intégration ne doit pas être pensée seulement par PR. Elle doit être pensée par dépendances :

1. Gouvernance déjà intégrée par #6.
2. Synthèse PR propre dans #8.
3. Blockers #2/#3 à intégrer dans les conditions de suite.
4. Reconstruction technique ciblée de #4.
5. Reconstruction documentaire/technique ciblée de #5.
6. Découpage progressif de #1.

## PR #1

PR #1 est trop large pour être mergée directement : 31 commits, 98 fichiers, plus de 30 000 insertions.

Elle contient des éléments utiles : Migration/*, gates, source registry, resume gate, execution runway, operator action pack, objective traceability, server inventory cards.

Mais elle dépend des blockers #2 et #3.

Décision : ne pas merger #1 ; découper en sous-PR thématiques après traitement des blockers.

## PR #4

PR #4 est prioritaire pour la prochaine intégration technique.

Elle apporte les outils GitHub MCP contrôlés nécessaires pour diagnostiquer et lever #2 :

- `github_status`
- `github_list_orgs`
- `github_list_repos`
- `github_repo_status`
- `github_audit_permissions`
- helpers de sécurité anti-secrets
- tests dédiés

Décision : reconstruire depuis `main` dans une branche propre, sans reprendre les fichiers `.mcp` ou Migration historiques déjà couverts ou bloqués.

Branche recommandée :

`mcp/github-tools-after-governance`

## PR #5

PR #5 apporte l’onboarding engine : docs, routes, droits, identité, audit, repo footprint et server mapping.

Elle doit venir après #4, car l’onboarding dépend des outils GitHub MCP contrôlés et de la visibilité connecteur.

Décision : ne pas merger #5 maintenant ; préparer plus tard :

`mcp/onboarding-docs-after-governance`

## Redondances à éviter

Ne pas écraser :

- `.mcp/agents.json`
- `.mcp/manifest.json`
- `.mcp/onboarding.json`
- `.mcp/permissions.json`
- `.mcp/server-map.json`
- la gouvernance déjà intégrée par #6
- les règles non-régression
- les fichiers de cartographie et identité MCP/Git

## Blockers à respecter

### #2

Aucune validation finale de visibilité organisation/repo tant que le runtime MCP ne confirme pas que le connecteur voit `chainsolutions-wealthtech` et ses repos.

### #3

Aucune action production, migration, cleanup, vhost ou service stop tant que l’inventaire privé hors Git et l’approbation opérateur ne sont pas établis.

## Prochaine décision

Créer une branche technique depuis `main` :

`mcp/github-tools-after-governance`

Objectif : intégrer uniquement les outils GitHub MCP contrôlés et leurs tests, en respectant les blockers #2/#3.
