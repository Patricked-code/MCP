# Runbook activation organisation - chainsolutions-wealthtech

Date: 2026-07-04
Organisation cible: `chainsolutions-wealthtech`
Etat actuel: preparation hors organisation, depuis `Patricked-code/MCP`

## Objectif

Activer l'organisation GitHub `chainsolutions-wealthtech` pour qu'elle devienne le centre officiel de gouvernance ChainSolutions / WealthTech.

Ce runbook ne demande jamais de token brut dans Git. Il sert a passer de l'etat actuel, ou le connecteur MCP ne voit que `Patricked-code`, a un etat ou le MCP peut creer ou mettre a jour directement les depots de l'organisation.

## Description a appliquer a l'organisation

Description courte recommandee:

```text
Centre de gouvernance GitHub/MCP pour l'ecosysteme ChainSolutions WealthTech: migration, documentation, agents IA, mappings repo-serveur et audit securise.
```

Description longue de reference:

```text
chainsolutions-wealthtech centralise, versionne, documente et gouverne l'ecosysteme ChainSolutions / WealthTech. L'organisation rassemble progressivement les repositories, documents, conversations utiles, prompts, consignes, profils d'agents, mappings repo-serveur, historiques de decisions, audits et fichiers de suivi.

Le MCP WealthTech est le superviseur central entre GitHub, les serveurs, les agents IA et la memoire projet. Il relie la source versionnee GitHub a la source d'execution serveur, sans exposer de secrets ni donner d'acces SSH libre aux agents.
```

## Pre-requis

1. Etre connecte a GitHub avec un compte administrateur de `chainsolutions-wealthtech`.
2. Ouvrir les parametres de l'organisation:

```text
https://github.com/organizations/chainsolutions-wealthtech/settings
```

3. Installer ou autoriser l'app GitHub utilisee par Codex/MCP sur cette organisation.
4. Accorder uniquement les permissions necessaires aux operations visees:
   - lecture repositories;
   - lecture pull requests/issues;
   - ecriture contents sur branches dediees;
   - creation de pull requests;
   - metadata repository;
   - administration organisation uniquement si l'objectif est de creer/configurer des depots organisationnels.
5. Ne jamais copier un token personnel dans un fichier du repository.

## Politique double authentification demandee

Decision demandee pour la premiere integration: ne pas imposer la double authentification au niveau de l'organisation `chainsolutions-wealthtech`.

Action owner requise:

1. Ouvrir les parametres de securite de l'organisation:

```text
https://github.com/organizations/chainsolutions-wealthtech/settings/security
```

2. Aller dans `Authentication security`.
3. Verifier que l'option `Require two-factor authentication for everyone in your organization` n'est pas activee.
4. Enregistrer ou confirmer le changement si l'interface GitHub le demande.
5. Ajouter une trace d'audit MCP indiquant que la politique organisationnelle 2FA a ete verifiee, sans publier de capture contenant des donnees personnelles, de recovery codes, de tokens ou d'informations sensibles.

Limites:

- Cette decision desactive seulement l'obligation 2FA imposee par l'organisation.
- Elle ne contourne pas les obligations 2FA imposees directement par GitHub.com a certains comptes contributeurs.
- Ce reglage reduit la securite d'acces; il doit etre compense par des droits minimaux, branches MCP, pull requests, audit et absence de secrets dans Git.
- Le connecteur MCP actuel ne peut ni verifier ni changer ce reglage tant que `chainsolutions-wealthtech` n'est pas accessible avec droits owner/admin organisation.

## Verification attendue apres autorisation

Apres installation de l'app sur l'organisation, le connecteur MCP doit montrer au moins un de ces signaux:

```text
list_installations -> account_login: chainsolutions-wealthtech, account_type: Organization
list_user_orgs -> chainsolutions-wealthtech visible
search/list repositories -> depots chainsolutions-wealthtech visibles
```

Tant que ces signaux ne sont pas presents, Codex ne doit pas affirmer que l'organisation est configuree. Il peut seulement preparer les artefacts et la PR de bootstrap dans `Patricked-code/MCP`.

## Depot special .github

Quand l'organisation est accessible, creer le depot special:

```text
chainsolutions-wealthtech/.github
```

Puis ajouter:

```text
profile/README.md
```

Source deja preparee dans ce repository:

```text
Migration/github/chainsolutions-wealthtech/.github/profile/README.md
```

Ce fichier donne le profil public de l'organisation et resume:

- le role de gouvernance de l'organisation;
- le role central du MCP;
- les regles de securite;
- l'objectif GitHub source versionnee + serveur source d'execution.

## Premiere integration directe apres acces organisation

1. Recontroler l'acces MCP a `chainsolutions-wealthtech`.
2. Verifier manuellement la politique 2FA demandee dans `Authentication security`.
3. Creer ou ouvrir `chainsolutions-wealthtech/.github`.
4. Creer une branche dediee, par exemple:

```text
mcp/org-profile-bootstrap
```

5. Ajouter `profile/README.md` depuis l'artefact prepare.
6. Ouvrir une pull request vers la branche par defaut du repo `.github`.
7. Ne pas pousser directement sur `main`.
8. Ajouter dans la PR:
   - resume de la configuration;
   - verification d'absence de secret;
   - lien vers le runbook;
   - prochaines etapes MCP Onboarding Engine.

## Suite attendue pour le MCP Onboarding Engine

Une fois l'organisation visible par le connecteur, la branche MCP `mcp/migration-governance-setup` pourra continuer vers:

- `src/onboarding/types.ts`;
- `src/onboarding/identity.ts`;
- `src/onboarding/rights.ts`;
- `src/onboarding/questions.ts`;
- `src/onboarding/repoFootprint.ts`;
- `src/onboarding/agents.ts`;
- `src/onboarding/serverMapping.ts`;
- `src/onboarding/audit.ts`;
- `src/onboarding/index.ts`;
- routes `/git/onboarding`, `/git/accounts`, `/git/repos`, `/git/agents`, `/git/audit`;
- documentation `docs/MCP_ONBOARDING_ENGINE.md`, `docs/MCP_SECURITY_MODEL.md`, `docs/MCP_AGENT_ROLES.md`, `docs/MCP_REPO_FOOTPRINT.md`, `docs/MCP_SERVER_MAPPING.md`, `docs/MCP_AUDIT_LOGS.md`.

## Limites de securite

- Aucun token brut dans Git.
- Aucun `.env` reel.
- Aucun inventaire serveur brut dans un depot public.
- Aucun chemin sensible complet dans un profil public.
- Aucune ecriture directe sur `main`.
- Aucune action admin sans validation humaine explicite.
- Aucun deploy sans validation explicite.
