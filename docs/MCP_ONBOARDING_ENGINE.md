# MCP Onboarding Engine

## Objectif

Le MCP Onboarding Engine transforme le MCP WealthTech en superviseur de gouvernance entre GitHub, les serveurs, les agents IA et le registre local MCP/Git.

Il doit identifier l acteur connecte, verifier les droits disponibles, lister les comptes et repositories connus, detecter les fichiers de gouvernance manquants, proposer un bootstrap de repo et auditer chaque decision sensible.

## Flux de premiere connexion

1. L acteur ouvre `/git/onboarding` ou lance `POST /git/onboarding/start`.
2. Le MCP identifie l acteur sans stocker de token brut.
3. Le MCP lit le statut GitHub et le registre local.
4. Une session d onboarding est creee dans le registre.
5. Un evenement d audit `onboarding.session_started` est ajoute.

## Flux de verification GitHub

Le moteur derive les droits depuis `getGithubConnectionStatus()`:

- compte GitHub lisible;
- organisation cible accessible;
- repos lisibles;
- indice d ecriture repo;
- indice d administration organisation.

Les tests d ecriture destructifs ou directs sont interdits. Les droits d ecriture restent des indices tant qu une branche MCP dediee et une pull request ne sont pas utilisees.

## Flux de questionnaire

`POST /git/onboarding/answer` accepte une question et un choix A, B ou C. Les choix interdits, comme SuperAdmin sans validation du token MCP maitre ou ecriture directe sur branche officielle, sont bloques et audites.

## Flux de bootstrap repo

`POST /git/repos/:owner/:repo/bootstrap` retourne les fichiers prets a copier ou a proposer sur branche `mcp/onboarding-setup`:

- `.mcp/manifest.json`;
- `.mcp/permissions.json`;
- `.mcp/agents.json`;
- `.mcp/server-map.json`;
- `.mcp/onboarding.json`;
- `MCP_PROJECT.md`;
- `MCP_AGENT_RULES.md`;
- `MCP_REPO_INVENTORY.md`;
- `MCP_SERVER_MAPPING.md`.

La version actuelle prepare le contenu et signale la branche requise. Elle ne pousse pas encore automatiquement vers GitHub.
Chaque generation ajoute un evenement `onboarding.repo_bootstrap_prepared` au registre MCP/Git. L evenement conserve les chemins, la branche, le mode et les avertissements, mais pas le contenu des fichiers generes.

## Paquet organisation cible

L onboarding expose aussi un paquet de premiere integration pour `chainsolutions-wealthtech`.
Ce paquet contient la description courte de l organisation, la description longue du projet, le repository special attendu `chainsolutions-wealthtech/.github`, le chemin du profil public prepare, le runbook d activation et la branche cible `mcp/org-profile-bootstrap`.
Il contient aussi la politique 2FA demandee pour la premiere integration: ne pas imposer la double authentification au niveau de l organisation. Ce reglage reste une verification manuelle d owner dans GitHub `Authentication security`; le MCP ne le modifie pas tant que l organisation n est pas accessible et qu une validation explicite n est pas auditee.

Tant que le connecteur ne voit pas l organisation cible, le mode reste `blocked_until_org_access`. Des que l organisation est accessible, le mode attendu devient `branch_pr_required`: creation ou ouverture du repository `.github`, ajout de `profile/README.md` sur branche MCP, puis pull request vers la branche par defaut.

Routes dediees:

- `GET /git/organization` retourne le paquet organisation cible, les signaux d acces et les prochaines actions.
- `POST /git/organization/bootstrap` retourne le plan de premiere integration directe pour `chainsolutions-wealthtech/.github`, incluant `profile/README.md`, le titre/body de PR proposes, la branche `mcp/org-profile-bootstrap`, et un blocage explicite tant que l organisation n est pas accessible.

Chaque appel a `POST /git/organization/bootstrap` ajoute un evenement `onboarding.organization_bootstrap_prepared`, y compris quand l operation reste bloquee par absence d acces organisation.

## Flux d ecriture controlee

Toute ecriture future doit respecter ces invariants:

- jamais sur `main` ou `master`;
- toujours sur une branche MCP dediee;
- pull request obligatoire;
- validation humaine pour les actions sensibles;
- aucun secret dans Git;
- audit de chaque tentative.

## Limitations connues

- L organisation `chainsolutions-wealthtech` n est pas encore visible par l installation GitHub App de cette session.
- Les droits Actions, secrets et admin repo ne sont pas testes par ecriture reelle.
- Le bootstrap distant GitHub est volontairement prepare sans push automatique.

## Prochaines etapes

Installer l app GitHub sur `chainsolutions-wealthtech`, relancer `/git/onboarding`, puis activer les operations de branche/PR uniquement apres verification des droits.
