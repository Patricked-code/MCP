# Premiere integration - chainsolutions-wealthtech

Date: 2026-07-04
Mise a jour directe: 2026-07-05
Statut: premiere integration directe appliquee sur `chainsolutions-wealthtech/.github`; connecteur Codex/MCP encore en attente d'installation sur l'organisation cible.

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
- Description organisation appliquee le 2026-07-05:
  `Centre de gouvernance GitHub/MCP pour l ecosysteme ChainSolutions WealthTech: migration, documentation, agents IA, mappings repo-serveur et audit securise.`
- Obligation 2FA organisation verifiee desactivee: `two_factor_requirement_enabled=false`.
- Depot public special cree: `chainsolutions-wealthtech/.github`.
- Pull request de profil public fusionnee: `https://github.com/chainsolutions-wealthtech/.github/pull/1`.
- Fichier profil public publie: `https://github.com/chainsolutions-wealthtech/.github/blob/main/profile/README.md`.
- Aucune installation GitHub App visible pour `chainsolutions-wealthtech` dans le connecteur Codex/MCP actuel.
- Installation GitHub App visible uniquement pour `Patricked-code`.
- Repo MCP actuel confirme: `Patricked-code/MCP`.
- Routes deja presentes dans le repo MCP: `/login`, `/dashboard`, `/git`, `/git/status`, `/git/connect`, `/github`, `/github/status`, `/github/:account`, `/github/connect`.

## Conditions avant configuration directe de l'organisation

1. Installer ou autoriser l'app GitHub sur `chainsolutions-wealthtech`.
2. Verifier que le connecteur MCP voit l'organisation.
3. Confirmer si le repo MCP officiel doit etre transfere, miroite ou recrée dans `chainsolutions-wealthtech`.
4. Continuer le code uniquement sur branche dediee et via pull request.

## Decision 2FA demandee

Pour la premiere integration, la politique demandee est de ne pas imposer la 2FA au niveau de l'organisation `chainsolutions-wealthtech`.

Cette decision a ete verifiee via GitHub API le 2026-07-05: `two_factor_requirement_enabled=false`. Elle ne contourne pas les obligations 2FA que GitHub.com pourrait imposer directement a certains comptes contributeurs.

## Fichier pret pour le futur profil public

Le contenu directement applicable au depot special `chainsolutions-wealthtech/.github` est prepare ici:

```text
Migration/github/chainsolutions-wealthtech/.github/profile/README.md
```

Le runbook d'activation directe de l'organisation est prepare ici:

```text
Migration/github/chainsolutions-wealthtech/ORG_ACTIVATION_RUNBOOK.md
```

Ce fichier a ete publie dans le repository GitHub special:

```text
chainsolutions-wealthtech/.github
└── profile/
    └── README.md
```

Journal detaille:

```text
Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md
```

## Branche de travail

La branche de cadrage creee est:

```text
mcp/migration-governance-setup
```

Elle doit servir de base aux prochaines modifications de gouvernance MCP et ne doit pas etre confondue avec une publication directe sur `main`.
