# Plan d’intégration après audit PR #1 #4 #5 et blockers #2 #3

## Principe

Ne rien merger directement depuis #1, #4 ou #5.

Ne pas réduire arbitrairement.

Ne pas supprimer arbitrairement.

Ne pas fermer #2 ou #3 sans preuve.

Ne pas modifier `main` directement.

## État actuel

- `main` contient la PR #6.
- PR #7 est l’audit brut et doit rester draft.
- PR #8 est la synthèse propre des PR #1/#4/#5 et doit rester en relecture.
- #2 et #3 sont des blockers ouverts.

## Avant PR #1

À faire :

1. conserver #1 comme source historique ;
2. ne pas merger en bloc ;
3. attendre ou documenter la levée de #2 pour les éléments organisation/repositories ;
4. attendre ou documenter la levée de #3 pour toute partie serveur/migration/production ;
5. découper #1 en PR thématiques.

## Avant PR #4

À faire :

1. créer `mcp/github-tools-after-governance` depuis `main` ;
2. reprendre uniquement les outils GitHub MCP contrôlés ;
3. reprendre les tests sécurité utiles ;
4. ne pas écraser les fichiers `.mcp` de #6 ;
5. ne pas reprendre les gros blocs Migration/* ;
6. garder les scoped-write strictement derrière garde-fous ;
7. documenter que #2 reste ouvert jusqu’à preuve runtime MCP.

## Avant PR #5

À faire :

1. attendre la reconstruction #4 ;
2. créer `mcp/onboarding-docs-after-governance` ;
3. reprendre les specs onboarding utiles ;
4. intégrer le modèle public-safe pour inventaire serveur ;
5. respecter #2 pour les droits GitHub ;
6. respecter #3 pour l’inventaire privé et l’approbation opérateur ;
7. ne pas exposer de token, `.env`, clé privée ou inventaire privé.

## Validations humaines nécessaires

### Pour #2

Owner/admin de `chainsolutions-wealthtech` doit autoriser ou installer le connecteur GitHub/Codex/MCP sur l’organisation avec permissions minimales.

### Pour #3

Opérateur serveur doit valider hors Git : inventaire privé S1/S2, backups, rollback, périmètre, date, tests et autorisation d’action.

## Prochaine branche correcte

`mcp/github-tools-after-governance`

## Objectif de la prochaine branche

Intégrer proprement les outils GitHub MCP contrôlés nécessaires au diagnostic et à la levée de #2, sans déclencher d’action production et sans reprendre les éléments historiques trop larges de #1.
