# PR #4 — lecture issue-aware

Ce fichier ne remplace pas l’audit détaillé de la PR #4 dans la PR #8.

Il complète l’analyse avec les blockers #2 et #3.

## Décision

PR #4 est la prochaine source technique prioritaire, mais elle ne doit pas être mergée telle quelle.

## Pourquoi

- PR #4 ajoute les outils GitHub MCP contrôlés.
- Ces outils sont nécessaires pour diagnostiquer et lever #2 côté runtime MCP.
- PR #4 vise une branche intermédiaire et embarque de l’historique.
- Les scoped-write doivent rester strictement contrôlés et compatibles avec #3.

## Prochaine branche

`mcp/github-tools-after-governance`

## À reprendre

- outils read-only GitHub MCP ;
- helpers de sécurité anti-secrets ;
- tests `githubMcpTools.test.ts` ;
- documentation MCP tools complémentaire.

## À ne pas reprendre automatiquement

- fichiers `.mcp` qui écrasent la gouvernance de #6 ;
- gros éléments Migration/* ;
- actions production ;
- permissions trop larges.
