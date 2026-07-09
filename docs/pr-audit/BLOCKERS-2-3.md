# Blockers #2 et #3 — synthèse exploitable

## Objectif

Ce fichier complète l’audit des PR #1, #4, #5, #7 et #8 en intégrant les issues #2 et #3.

#2 et #3 ne sont pas des PR. Ce sont des issues ouvertes et des blockers actifs.

Elles ne doivent pas être fermées, mergées, marquées résolues ou ignorées sans preuve.

## Issue #2 — GitHub connector / organisation target

### Blocker

`github_connector_not_authorized_on_target_org`

### Bloque réellement

- visibilité du connecteur GitHub/Codex/MCP sur `chainsolutions-wealthtech` ;
- listing et bootstrap des repositories visibles ;
- validation runtime MCP des repos organisation ;
- finalisation complète de l’onboarding organisation.

### Validation humaine nécessaire

Owner/admin de l’organisation `chainsolutions-wealthtech` doit installer ou autoriser le connecteur GitHub/Codex/MCP avec les permissions strictement nécessaires.

### Conditions avant considérer #2 résolu

- le connecteur voit `chainsolutions-wealthtech` ;
- `github_list_orgs` peut voir ou valider `chainsolutions-wealthtech` ;
- `github_list_repos` peut inclure `chainsolutions-wealthtech/.github` ;
- `/git/repos` et l’onboarding MCP ne signalent plus le blocage ;
- aucun token brut ou secret n’est exposé.

## Issue #3 — Inventaire privé serveur / approbation opérateur

### Blocker

`production_actions_require_private_inventory_and_approval`

### Bloque réellement

- cleanup serveur ;
- migration ;
- arrêt service ;
- changement vhost ;
- déploiement production ;
- toute action dépendant d’un inventaire privé S1/S2 ou d’un rollback non documenté hors Git.

### Validation humaine nécessaire

Un opérateur serveur doit valider explicitement le périmètre, la date, les backups, le rollback et les tests dans un emplacement privé hors Git.

### Conditions avant considérer #3 résolu

- inventaire privé S1/S2 hors Git ;
- référence backup/export hors Git ;
- rollback hors Git ;
- approbation opérateur hors Git ;
- tests post-action définis ;
- aucune donnée privée exposée dans Git.

## Impact sur les PR ouvertes

### PR #1

PR #1 dépend fortement de #2 et #3 :

- #2 bloque l’onboarding organisation et repositories ;
- #3 bloque les actions serveur/migration/production ;
- PR #1 ne doit pas être mergée en bloc ;
- ses contenus doivent être découpés selon les blockers.

### PR #4

PR #4 est prioritaire techniquement car elle ajoute les outils GitHub MCP contrôlés nécessaires à la levée ou au diagnostic de #2.

Mais PR #4 ne doit pas être mergée telle quelle, car elle vise une branche intermédiaire et embarque des éléments historiques.

Décision : reconstruire proprement depuis `main`.

Branche recommandée :

`mcp/github-tools-after-governance`

### PR #5

PR #5 doit intégrer les contraintes #2 et #3 dans l’onboarding engine :

- droits GitHub non garantis tant que #2 est ouvert ;
- inventaire serveur privé hors Git tant que #3 est ouvert ;
- routes onboarding public-safe uniquement ;
- pas de token brut ;
- pas d’action production.

## Décision globale

- Garder #2 ouvert.
- Garder #3 ouvert.
- Garder #7 draft comme audit brut.
- Garder #8 draft comme synthèse PR.
- Créer cette branche complémentaire pour documenter #2/#3.
- Prochaine branche technique : `mcp/github-tools-after-governance`.
