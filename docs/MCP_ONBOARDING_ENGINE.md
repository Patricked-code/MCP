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

## Paquet organisation cible

L onboarding expose aussi un paquet de premiere integration pour `chainsolutions-wealthtech`.
Ce paquet contient la description courte de l organisation, la description longue du projet, le repository special attendu `chainsolutions-wealthtech/.github`, le chemin du profil public prepare, le runbook d activation et la branche cible `mcp/org-profile-bootstrap`.

Tant que le connecteur ne voit pas l organisation cible, le mode reste `blocked_until_org_access`. Des que l organisation est accessible, le mode attendu devient `branch_pr_required`: creation ou ouverture du repository `.github`, ajout de `profile/README.md` sur branche MCP, puis pull request vers la branche par defaut.

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
