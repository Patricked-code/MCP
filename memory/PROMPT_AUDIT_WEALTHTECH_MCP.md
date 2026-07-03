# Prompt d’audit — WealthTech MCP

Date : 2026-07-01
Objectif : audit de lecture seule de l’écosystème WealthTech via le serveur MCP.

## Mission

Réaliser un état des lieux complet de l’écosystème WealthTech, du serveur MCP et des deux serveurs déclarés dans la mémoire projet. L’audit doit être limité à la lecture, au diagnostic, à l’inventaire et à la documentation.

## Règles

- Ne pas modifier la production.
- Ne pas changer les configurations.
- Ne pas interrompre les services.
- Ne pas afficher de secret.
- Ne pas pousser de code pendant l’audit.
- Utiliser uniquement les outils MCP de consultation.

## Contexte à intégrer

Lire d’abord les fichiers de mémoire dans ce dossier, en particulier :

1. `README.md`
2. `SUIVI_MEMORY.md`
3. `CONVERSATION_COMPILED_WEALTHTECH_EWARI_MCP.md`
4. `MEMO_MCP_GITHUB_SERVER_ACCESS.md`
5. `MEMO_PROJECT_STABLECOIN_EWARI.md`

## Audit demandé

Produire un rapport Markdown avec :

1. état du MCP ;
2. état GitHub ;
3. état des serveurs ;
4. état Docker ;
5. état PM2 ;
6. état domaines ;
7. état documentation ;
8. état mémoire persistante ;
9. risques ;
10. anomalies ;
11. recommandations ;
12. prochain point de reprise.

## Fichiers de mémoire à vérifier

Vérifier la présence de :

- `GPT.md`
- `SUIVI.md`
- `README.md`
- `README_DEV.md`
- `ROADMAP.md`
- `TODO.md`
- `TASKS.md`
- `CODE_REVIEW.md`
- `CHANGELOG.md`
- `DEPLOYMENT_PRODUCTION.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `DOCKER.md`
- `SECURITY.md`
- `MIGRATION.md`
- `AGENTS_ARCHITECTURE.md`
- `AI_SKILLS.md`

Vérifier aussi la section : `POINT DE REPRISE COURANT`.

## Rapport attendu

Créer un rapport dans :

```text
/root/wealthtech_project_memory/reports/
```

Le rapport doit préciser ce qui est prêt, ce qui manque, ce qui est à risque, ce qui est protégé, et les prochaines actions recommandées.
