# ROADMAP.md — Feuille de route MCP WealthTech

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence historique, non autorité de l'état courant.** Ce fichier conserve les documents initiaux du projet. Ses tâches, jalons et instructions ne prouvent pas leur état actuel. Pour le **feuille de route**, consulter [le registre racine](../ROADMAP.md) et [les priorités des sources](../SOURCE_OF_TRUTH.md). Pour l'état courant GitHub/S1/runtime, exiger une observation Live State fraîche ; `PRODUCTION_STATE.json` est un instantané versionné pouvant être obsolète. Le contenu historique ci-dessous est intégralement préservé.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Phase 1 — Initialisation GitHub

- Créer le squelette Node.js/TypeScript.
- Créer la mémoire persistante.
- Créer les outils read-only.
- Documenter S1, S2, domaines protégés et objectifs.

## Phase 2 — Vérification locale

- Installer les dépendances.
- Compiler TypeScript.
- Corriger les écarts liés à la version exacte du SDK MCP.
- Tester `ping` et les outils read-only avec un environnement de test.

## Phase 3 — Déploiement S1

- Créer `/opt/apps/wealthtech-mcp-ssh-bridge`.
- Déployer le code.
- Créer `.env` réel sur S1.
- Créer les clés SSH dédiées.
- Configurer PM2 ou Docker.
- Configurer HTTPS sur `mcp.wealthtechinnovations.com`.

## Phase 4 — Ajout dans ChatGPT

- Ajouter l’URL MCP dans l’interface Serveurs MCP.
- Tester l’authentification.
- Tester les outils read-only.

## Phase 5 — Loop Engineering

- Utiliser le MCP pour inventorier S1 et S2.
- Mettre à jour les fichiers de mémoire persistante.
- Préparer les migrations et nettoyages sans action sensible.

## Phase 6 — Outils à confirmation

- Ajouter les outils de migration en mode dry-run.
- Ajouter les outils sensibles uniquement avec confirmation explicite.
- Documenter chaque outil avant activation.

## Phase 7 — Écosystème unifié

- Cartographier WealthTech, Stablecoin, Blockchain, TokenFactory, EVOTE, Évaluations.
- Préparer Docker, Redis, MySQL, ClickHouse et trajectoire Kubernetes.
