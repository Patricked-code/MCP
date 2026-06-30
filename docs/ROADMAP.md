# ROADMAP.md — Feuille de route MCP WealthTech

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
