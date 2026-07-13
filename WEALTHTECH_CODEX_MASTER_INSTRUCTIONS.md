# WEALTHTECH_CODEX_MASTER_INSTRUCTIONS.md

## 1. Rôle du fichier

Point d’entrée durable pour toute intervention Codex sur le MCP WealthTech et ses projets intégrés.

## 2. Objectif

Permettre une reprise sûre : identifier la source de vérité, le dépôt, la branche, le serveur, le point de reprise, les droits et les risques avant toute action.

## 3. Périmètre

- dépôt versionné : `Patricked-code/MCP` ;
- branche officielle : `main` ;
- serveur exécuté : S1 ;
- chemin serveur : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- documentation racine, `docs/`, `memory/`, `docs/projects/` et `.mcp/`.

## 4. Source de vérité

Appliquer l’ordre défini dans `SOURCE_OF_TRUTH.md`. GitHub est la source versionnée ; l’état réel de S1 est la source exécutée. La synchronisation doit être vérifiée, jamais supposée.

## 5. Informations connues

Le MCP fonctionne en mode `read-only-first`. Les écritures autorisées passent par une branche contrôlée, une revue humaine et une PR. Les règles machine sont dans `.mcp/*.json`.

## 6. Informations à vérifier avant chaque intervention

- `git status`, branche, remote et dernier commit des deux côtés ;
- `# POINT DE REPRISE COURANT` dans `SUIVI.md` ;
- permissions de `.mcp/permissions.json` et rôles de `.mcp/agents.json` ;
- mapping de `.mcp/server-map.json` ;
- fichiers `AGENTS.md`, `PROJECT_RULES.md`, `NO_REGRESSION_POLICY.md` et documents techniques concernés ;
- domaines, services, logs, sauvegardes et tests réellement concernés.

## 7. Règles applicables

- ne jamais coder à l’aveugle ni écrire de secret dans Git ;
- ne jamais pousser directement sur `main`, forcer un push ou supprimer sans inventaire ;
- ne pas mélanger documentation et code applicatif non revu ;
- ne pas toucher à la production, aux permissions ou aux migrations sans autorisation explicite et procédure dédiée ;
- préserver l’existant, consigner les contradictions et demander une décision humaine lorsqu’elles ont un impact sensible.

## 8. Procédure obligatoire

1. Lire `SUIVI.md`, `AGENTS.md`, `CODEX.md` et les sources de vérité.
2. Auditer GitHub et S1 en lecture seule.
3. Classer chaque information comme vérifiée, historique, hypothèse ou contradiction.
4. Travailler sur une branche `mcp/*` ou `codex/*` propre.
5. Modifier uniquement le périmètre autorisé.
6. Exécuter les contrôles proportionnés au risque.
7. Mettre à jour `TASKS.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` et `SUIVI.md`.
8. Proposer une PR ; ne pas merger ou déployer sans validation humaine.

## 9. Risques

Confusion S1/S2, documentation obsolète, branches divergentes, fuite de secret, écriture sur un domaine protégé, mélange code/documentation et reprise depuis un ancien point.

## 10. À maintenir à jour

Mettre à jour ce fichier lorsque l’ordre des sources, les règles de branche, les rôles, les permissions ou la procédure de reprise changent.

## 11. Historique des mises à jour

- 2026-07-13 : création après audit GitHub `main` et S1, sans modification applicative ni secret.
