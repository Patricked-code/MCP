# Bootstrap organisation GitHub - chainsolutions-wealthtech

Date de cadrage: 2026-07-04
Organisation cible: `chainsolutions-wealthtech`
Repo MCP actuel: `Patricked-code/MCP`
Branche de travail: `mcp/migration-governance-setup`

## Statut verifie

L'organisation GitHub `chainsolutions-wealthtech` existe publiquement, mais elle ne presente actuellement aucun depot public et aucun membre public visible.

Dans la session MCP actuelle:

- le connecteur GitHub est authentifie comme `Patricked-code`;
- l'installation GitHub App visible est limitee au compte utilisateur `Patricked-code`;
- aucune organisation n'est retournee par les endpoints MCP `list_user_orgs` et `list_user_org_memberships`;
- la recherche de repositories installes ne retourne aucun depot `chainsolutions-wealthtech`;
- le connecteur peut ecrire dans `Patricked-code/MCP`, mais ne peut pas encore configurer directement l'organisation `chainsolutions-wealthtech`.

Conclusion: la premiere configuration officielle de l'organisation doit commencer par l'installation/autorisation de l'app GitHub sur `chainsolutions-wealthtech`, ou par un token GitHub explicitement fourni avec droits organisationnels adaptes. Aucun token brut ne doit etre stocke dans Git.

## Description courte proposee pour GitHub

Centre de gouvernance GitHub/MCP pour l'ecosysteme ChainSolutions WealthTech: migration, documentation, agents IA, mappings repo-serveur et audit securise.

## Description longue du projet

`chainsolutions-wealthtech` doit devenir le centre de controle versionne de l'ecosysteme ChainSolutions / WealthTech. L'organisation doit rassembler progressivement les repositories, documents, conversations utiles, prompts, consignes, profils d'agents, mappings repo-serveur, historiques de decisions, audits et fichiers de suivi.

Le MCP WealthTech agit comme superviseur central entre GitHub, les serveurs, les agents IA et la memoire projet. Il doit permettre a ChatGPT, Claude, Codex et aux agents MCP de comprendre l'historique, retrouver les decisions, savoir quel repository correspond a quel environnement, appliquer les regles d'intervention, produire les fichiers de gouvernance manquants, ouvrir des branches controlees et eviter toute regression.

## README public de profil propose

Ce contenu est destine au futur depot special `chainsolutions-wealthtech/.github`, fichier `profile/README.md`.

```markdown
# ChainSolutions WealthTech

`chainsolutions-wealthtech` est l'organisation GitHub de gouvernance pour l'ecosysteme ChainSolutions / WealthTech.

Elle centralise progressivement:

- les repositories applicatifs et MCP;
- les archives de migration;
- les documents de gouvernance projet;
- les prompts, consignes et profils d'agents IA;
- les mappings entre repositories GitHub, serveurs, domaines et environnements;
- les historiques de decisions, audits et points de reprise;
- les fichiers de suivi necessaires au Loop Engineering.

## Role du MCP

Le MCP WealthTech est le superviseur central entre GitHub, les serveurs et les agents IA. Il doit:

- identifier les acteurs connectes;
- verifier les droits MCP et GitHub;
- lister les repositories visibles;
- detecter les fichiers `.mcp` manquants;
- lier les repositories aux dossiers serveur autorises;
- creer des profils d'agents ChatGPT, Claude, Codex, audit, serveur et deploiement;
- ecrire uniquement sur branches controlees;
- ouvrir des pull requests;
- auditer les connexions et actions sensibles;
- empecher toute action dangereuse, destructive ou non validee.

## Regles de securite

- Aucun token brut dans Git.
- Aucun secret dans les fichiers `.mcp`.
- Aucune ecriture directe sur `main` pour les changements MCP sensibles.
- Toute action d'ecriture passe par une branche dediee et une pull request.
- Les inventaires serveur bruts et les exports sensibles restent prives.
- Les agents IA ne recoivent pas d'acces SSH libre.

## Objectif

Faire de GitHub la source versionnee officielle, du serveur la source d'execution reelle, et du MCP le lien de gouvernance entre les deux.
```

## Premiere integration directe attendue

1. Installer l'app GitHub MCP/Codex sur `chainsolutions-wealthtech`.
2. Confirmer que le connecteur liste l'organisation dans `list_user_orgs` ou `list_installations`.
3. Creer le depot special `.github` dans l'organisation si absent.
4. Ajouter `profile/README.md` avec le contenu public propose ci-dessus.
5. Creer ou migrer le repo MCP officiel dans l'organisation, ou definir explicitement que `Patricked-code/MCP` reste temporairement le repo MCP source.
6. Creer une branche dediee `mcp/migration-governance-setup` pour toute modification MCP.
7. Ajouter la structure `Migration/` et les index assainis, sans publier les archives sensibles brutes.
8. Ajouter progressivement le module `src/onboarding/` et les routes d'onboarding decrites dans le cadrage.
9. Ouvrir une pull request; ne pas ecrire directement sur `main`.

Runbook d'activation directe prepare:

```text
Migration/github/chainsolutions-wealthtech/ORG_ACTIVATION_RUNBOOK.md
```

## Frontiere publique / privee

A publier dans GitHub public:

- descriptions de projet;
- architecture logique;
- roles d'agents;
- modeles `.mcp` sans secrets;
- index assainis;
- documentation du modele de securite.

A garder hors depot public ou dans un depot prive:

- tokens, cles, `.env` reels;
- inventaires serveur bruts;
- chemins sensibles detailles;
- exports ZIP/PDF contenant des donnees operationnelles non revues;
- dumps SQL, sauvegardes, logs et fichiers de production.
