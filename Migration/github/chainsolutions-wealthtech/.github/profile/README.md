# ChainSolutions WealthTech

`chainsolutions-wealthtech` est l'organisation GitHub de gouvernance pour l'ecosysteme ChainSolutions / WealthTech.

Elle centralise progressivement:

- les repositories applicatifs et MCP;
- les archives de migration;
- les documents de gouvernance projet;
- les prompts, consignes et profils d'agents IA;
- les mappings entre repositories GitHub, serveurs, domaines et environnements;
- les historiques de decisions, audits et points de reprise;
- les fichiers de suivi necessaires au Loop Engineering.

## Role du MCP

Le MCP WealthTech est le superviseur central entre GitHub, les serveurs et les agents IA. Il doit:

- identifier les acteurs connectes;
- verifier les droits MCP et GitHub;
- lister les repositories visibles;
- detecter les fichiers `.mcp` manquants;
- lier les repositories aux dossiers serveur autorises;
- creer des profils d'agents ChatGPT, Claude, Codex, audit, serveur et deploiement;
- ecrire uniquement sur branches controlees;
- ouvrir des pull requests;
- auditer les connexions et actions sensibles;
- empecher toute action dangereuse, destructive ou non validee.

## Regles de securite

- Aucun token brut dans Git.
- Aucun secret dans les fichiers `.mcp`.
- Aucune ecriture directe sur `main` pour les changements MCP sensibles.
- Toute action d'ecriture passe par une branche dediee et une pull request.
- Les inventaires serveur bruts et les exports sensibles restent prives.
- Les agents IA ne recoivent pas d'acces SSH libre.

## Objectif

Faire de GitHub la source versionnee officielle, du serveur la source d'execution reelle, et du MCP le lien de gouvernance entre les deux.
