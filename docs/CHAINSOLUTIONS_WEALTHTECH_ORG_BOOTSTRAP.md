# Bootstrap organisation GitHub - chainsolutions-wealthtech

Date de cadrage: 2026-07-04
Organisation cible: `chainsolutions-wealthtech`
Repo MCP actuel: `Patricked-code/MCP`
Branche de travail: `mcp/migration-governance-setup`

## Statut verifie

L'organisation GitHub `chainsolutions-wealthtech` existe publiquement. La premiere configuration directe a ete appliquee le 2026-07-05 via GitHub CLI authentifie comme `Wealthtechinnovations`.

Dans la session MCP actuelle:

- le connecteur GitHub est authentifie comme `Patricked-code`;
- l'installation GitHub App visible est limitee au compte utilisateur `Patricked-code`;
- aucune organisation n'est retournee par les endpoints MCP `list_user_orgs` et `list_user_org_memberships`;
- la recherche de repositories installes ne retourne aucun depot `chainsolutions-wealthtech`;
- le connecteur peut ecrire dans `Patricked-code/MCP`, mais ne peut pas encore configurer directement l'organisation `chainsolutions-wealthtech`.

Etat direct verifie:

- description GitHub appliquee;
- obligation 2FA organisation desactivee: `two_factor_requirement_enabled=false`;
- depot public `chainsolutions-wealthtech/.github` cree;
- PR de profil public fusionnee: `https://github.com/chainsolutions-wealthtech/.github/pull/1`;
- fichier publie: `https://github.com/chainsolutions-wealthtech/.github/blob/main/profile/README.md`.

Conclusion: la configuration publique initiale de l'organisation est appliquee. La limite restante est l'installation/autorisation de l'app GitHub Codex/MCP sur `chainsolutions-wealthtech`, afin que le connecteur voie aussi directement l'organisation. Aucun token brut ne doit etre stocke dans Git.

## Politique 2FA demandee

Decision ajoutee au cadrage: ne pas imposer la double authentification au niveau de l'organisation `chainsolutions-wealthtech` pour les utilisateurs directs pendant la premiere integration.

Ce que cela signifie:

- l'option organisationnelle `Require two-factor authentication for everyone in your organization` doit rester desactivee;
- le reglage doit etre verifie manuellement par un owner dans `Settings` > `Authentication security`;
- le MCP doit auditer la verification, mais ne doit pas publier de capture, recovery code, token ou information personnelle;
- cette decision ne contourne pas une obligation 2FA globale imposee par GitHub.com a certains comptes contributeurs;
- ce choix reduit la securite d'acces et doit etre compense par des droits minimaux, branches dediees, PR obligatoires et audit.

Statut actuel: verifie via GitHub API le 2026-07-05, `two_factor_requirement_enabled=false`. Le connecteur Codex/MCP ne voit pas encore `chainsolutions-wealthtech`, donc la verification reste consignée dans le journal de configuration directe.

Routes MCP preparees:

- `GET /git/organization/security` expose la politique attendue et les etapes owner.
- `POST /git/organization/security/verify` enregistre l'assertion manuelle owner avec `ownerConfirmed: true` et `twoFactorRequirementEnabled: false`.

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

## Premiere integration directe appliquee

1. Description appliquee sur l'organisation.
2. 2FA organisation verifiee desactivee.
3. Depot special `.github` cree.
4. Branche `mcp/org-profile-bootstrap` creee.
5. `profile/README.md` ajoute via pull request.
6. PR `chainsolutions-wealthtech/.github#1` fusionnee.

Suite restante:

1. Installer l'app GitHub MCP/Codex sur `chainsolutions-wealthtech`.
2. Confirmer que le connecteur liste l'organisation dans `list_user_orgs` ou `list_installations`.
3. Creer ou migrer le repo MCP officiel dans l'organisation, ou definir explicitement que `Patricked-code/MCP` reste temporairement le repo MCP source.
4. Continuer toute modification MCP sur branche dediee et pull request.

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
