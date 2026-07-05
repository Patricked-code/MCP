# MCP Project

## Objectif

Ce repository contient le MCP WealthTech actuellement utilise comme point de preparation pour la gouvernance GitHub/MCP de l ecosysteme ChainSolutions / WealthTech.

Il doit permettre de centraliser, versionner, documenter et gouverner:

- les connexions GitHub et MCP;
- les agents ChatGPT, Claude, Codex, audit, serveur et deploiement;
- les mappings entre repositories GitHub et environnements serveur;
- les fichiers de gouvernance `.mcp`;
- les archives de migration;
- les traces d audit et points de reprise.

## Role dans chainsolutions-wealthtech

La cible finale est l organisation GitHub `chainsolutions-wealthtech`. Tant que le connecteur GitHub ne voit pas cette organisation, `Patricked-code/MCP` reste le repository de staging technique.

La premiere integration directe attendue est:

1. autoriser l app GitHub ou un token explicitement scope sur `chainsolutions-wealthtech`;
2. creer ou ouvrir `chainsolutions-wealthtech/.github`;
3. creer la branche `mcp/org-profile-bootstrap`;
4. ajouter `profile/README.md` depuis `Migration/github/chainsolutions-wealthtech/.github/profile/README.md`;
5. ouvrir une pull request vers la branche par defaut.

## Regles d intervention

- Ne jamais ecrire directement sur `main`.
- Ne jamais stocker de token brut dans Git, les logs, les audits ou les fichiers `.mcp`.
- Utiliser une branche MCP dediee pour toute proposition.
- Exiger une validation humaine pour les actions sensibles.
- Ne jamais deduire le role SuperAdmin d un token GitHub seul.
