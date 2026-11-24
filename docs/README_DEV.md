# README_DEV.md — Développement du MCP WealthTech

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **développement**, commencer par [le document racine](../README_DEV.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Pré-requis

- Node.js 20 ou supérieur.
- npm.
- Accès au dépôt GitHub `Patricked-code/MCP`.
- Accès SSH serveur uniquement après création de clés dédiées.

## Installation

Étapes locales : installer les dépendances, copier `.env.example` vers `.env`, compléter les valeurs locales, compiler TypeScript, puis démarrer le service.

## Structure

- `src/config` : configuration et validation d’environnement.
- `src/ssh` : client SSH et garde-fous.
- `src/tools` : outils MCP exposés.
- `docs` : mémoire persistante projet.
- `scripts` : contrôles de documentation et sécurité.

## Règle de développement

Le projet commence en lecture seule. Toute action sensible doit rester absente ou désactivée jusqu’à validation explicite.

## Conventions

- TypeScript strict.
- Aucun secret dans Git.
- Documentation mise à jour après chaque changement.
- Tout nouvel outil MCP doit être ajouté dans `docs/MCP_TOOLS.md`.
