# README_DEV.md — Développement du MCP WealthTech

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
