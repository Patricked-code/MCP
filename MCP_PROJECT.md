# MCP Project — ChainSolutions WealthTech

Ce dépôt contient le serveur MCP WealthTech.

Il sert de pont entre ChatGPT, Claude, Codex, GitHub, S1, S2 et les agents d’audit, migration, documentation et déploiement.

## Organisation GitHub cible

`chainsolutions-wealthtech`

## Objectif prioritaire

Mettre en place le `MCP Onboarding Engine`.

Le moteur doit identifier l’acteur connecté, vérifier les droits GitHub, enregistrer les comptes, inventorier les repos, créer les fichiers `.mcp/`, préparer des branches de configuration, ouvrir des Pull Requests et documenter les mappings serveur.

---

<!-- MCP-SAFE-BOOTSTRAP:NO-REGRESSION -->

## Gouvernance permanente MCP — sans régression

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble.

Règles permanentes :

- conserver l’existant ;
- compléter sans écraser ;
- créer uniquement les fichiers manquants ;
- ne jamais écrire de secret, token, mot de passe, clé privée ou variable sensible ;
- travailler sans régression ;
- chercher l’amélioration continue ;
- documenter toute modification dans `SUIVI.md` ;
- inscrire `À vérifier` lorsque l’information n’est pas confirmée.

Références :

- dépôt : `Patricked-code/MCP` ;
- branche officielle : `main` ;
- serveur : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- domaine : `https://mcp.wealthtechinnovations.com`.

Ajout vérifié le 2026-07-09T18:47:20Z.
