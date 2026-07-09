# SUIVI.md — Journal vivant et point de reprise

## 1. Rôle du fichier

Ce fichier contient le POINT DE REPRISE COURANT et trace les actions, décisions, tests et prochaines étapes.

## 2. Contexte MCP

Projet : WealthTech MCP SSH Bridge
Dépôt GitHub attendu : Patricked-code/MCP
Branche officielle : main
Chemin serveur validé : /opt/apps/wealthtech-mcp-ssh-bridge

Règles transversales :
- ne jamais coder à l’aveugle ;
- lire SUIVI.md et les fichiers de mémoire avant action ;
- ne jamais écrire de secrets, tokens, mots de passe, clés privées ou .env dans Git ;
- ne jamais écraser un fichier existant sans lecture préalable ;
- ne jamais supprimer sans inventaire ;
- documenter toute action importante dans SUIVI.md, CHANGELOG.md et DECISIONS_LOG.md ;
- conserver la logique parent/enfant : racine MCP globale, puis docs/projects/<projet>/ pour chaque projet intégré.


## 3. Fonctionnement attendu

Ce fichier doit être utilisé comme une pièce de mémoire opérationnelle. Il doit informer, contraindre, guider et tracer. Il ne doit pas être vide et ne doit pas servir de simple placeholder.

## 4. Règles applicables

- Lire ce fichier avec `SUIVI.md` avant les actions liées à son périmètre.
- Conserver les informations existantes lorsqu’un équivalent existe dans `docs/` ou `memory/`.
- Ne jamais transformer une hypothèse en certitude.
- Écrire `À vérifier` lorsqu’une donnée n’a pas été confirmée.
- Lier les tâches exécutables à `TASKS.md`.
- Lier les décisions à `DECISIONS_LOG.md`.
- Lier les changements visibles à `CHANGELOG.md`.

## 5. Informations à vérifier

- Cohérence avec `docs/SUIVI.md` si ce fichier existe.
- Cohérence avec `memory/SUIVI.md` si ce fichier existe.
- Cohérence avec les fichiers `.mcp/*.json`.
- Cohérence avec le dépôt GitHub `Patricked-code/MCP`.
- Cohérence avec le serveur `/opt/apps/wealthtech-mcp-ssh-bridge`.

## 6. Mise à jour

Ce fichier doit être enrichi au fur et à mesure de l’intégration des projets, de l’audit des dépôts, des changements d’agents et des décisions humaines.

# POINT DE REPRISE COURANT

Date : 2026-07-09
Serveur : S1
Dépôt : Patricked-code/MCP
Branche : main
Chemin serveur : /opt/apps/wealthtech-mcp-ssh-bridge
État actuel : création progressive des fichiers Markdown racine MCP avec écriture contrôlée via wealthtech_ssh_bridge.
Dernière action terminée : vérification du statut Git et inventaire des fichiers utiles du dépôt MCP.
Action suivante recommandée : continuer la création des fichiers racine manquants, puis consolider docs/ et memory/ sans écrasement.
Fichiers déjà présents à ne pas écraser sans lecture : README.md, MCP_PROJECT.md, MCP_AGENT_RULES.md, MCP_REPO_INVENTORY.md, MCP_SERVER_MAPPING.md, .mcp/*.json, docs/*.md, memory/*.md.
Risques connus : deux modifications locales non commitées existent déjà dans data/mcp-git-registry.json et src/github/registry.ts ; ne pas toucher au code applicatif dans cette passe documentaire.
Décision de reprise : limiter cette opération aux fichiers de documentation autorisés, sans secrets, sans suppression, sans déploiement.

## 7. Historique

- 2026-07-09 : création racine par écriture contrôlée MCP, sans secret, sans suppression et sans modification applicative.
