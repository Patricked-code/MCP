# Premiere integration - chainsolutions-wealthtech

Date: 2026-07-04
Statut: preparation sur branche MCP, en attente d'installation GitHub App sur l'organisation cible.

## Intention

Cette premiere integration prepare l'organisation GitHub `chainsolutions-wealthtech` comme futur centre de controle de l'ecosysteme ChainSolutions / WealthTech.

Elle ne remplace pas encore le repo MCP actuel `Patricked-code/MCP`. Elle documente la transition attendue vers l'organisation cible et les conditions a verifier avant de publier ou migrer des contenus plus sensibles.

## Ce qui est compris

Le projet `chainsolutions-wealthtech` doit centraliser, versionner, documenter et gouverner:

- les repos applicatifs;
- le MCP WealthTech;
- les conversations et exports utiles;
- les prompts et consignes;
- les agents ChatGPT, Claude, Codex, audit, serveur et deploiement;
- les regles d'intervention;
- les mappings repo-serveur;
- les historiques de decisions;
- les audits;
- les fichiers de suivi et points de reprise.

Le MCP est le noyau technique de gouvernance. Le dossier `Migration/` est le noyau documentaire. GitHub devient la source versionnee officielle. Les serveurs restent la source d'execution reelle.

## Etat courant verifie

- Organisation publique: `https://github.com/chainsolutions-wealthtech`.
- Aucun depot public visible sur cette organisation au moment du controle.
- Aucun membership organisation visible dans le connecteur MCP actuel.
- Aucune installation GitHub App visible pour `chainsolutions-wealthtech` dans le connecteur MCP actuel.
- Installation GitHub App visible uniquement pour `Patricked-code`.
- Repo MCP actuel confirme: `Patricked-code/MCP`.
- Routes deja presentes dans le repo MCP: `/login`, `/dashboard`, `/git`, `/git/status`, `/git/connect`, `/github`, `/github/status`, `/github/:account`, `/github/connect`.

## Conditions avant configuration directe de l'organisation

1. Installer ou autoriser l'app GitHub sur `chainsolutions-wealthtech`.
2. Verifier que le connecteur MCP voit l'organisation.
3. Confirmer si le repo MCP officiel doit etre transfere, miroite ou recrée dans `chainsolutions-wealthtech`.
4. Creer le repo special `.github` dans l'organisation pour le profil public.
5. Appliquer le README de profil propose dans `docs/CHAINSOLUTIONS_WEALTHTECH_ORG_BOOTSTRAP.md`.
6. Continuer le code uniquement sur branche dediee et via pull request.

## Branche de travail

La branche de cadrage creee est:

```text
mcp/migration-governance-setup
```

Elle doit servir de base aux prochaines modifications de gouvernance MCP et ne doit pas etre confondue avec une publication directe sur `main`.
