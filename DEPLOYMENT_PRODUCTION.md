# DEPLOYMENT_PRODUCTION.md

## État canonique structurel

```canonical-state
{
  "repository": "Patricked-code/MCP",
  "branch": "main",
  "s1Root": "/opt/apps/wealthtech-mcp-ssh-bridge",
  "fetchRemote": "git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",
  "pushRemote": "disabled://mcp-s1-read-only",
  "container": "wealthtech_mcp_ssh_bridge"
}
```

## Rôle

Procédure de production MCP gouvernée et exact-SHA.

## Chaîne autorisée

`push main → GitHub Actions → OIDC éphémère → MCP gouverné → fetch read-only S1 → fast-forward exact-SHA → build candidat → Docker → health/OAuth/MCP → attestation`.

## Invariants

- CI verte sur le head exact avant fusion.
- GitHub Actions : `contents: read`, `id-token: write`, aucun secret SSH longue durée.
- S1 : branche `main`, arbre propre, fetch read-only, push désactivé.
- `FETCH_HEAD` doit être le SHA demandé et le mouvement doit être fast-forward.
- Image candidate étiquetée `org.opencontainers.image.revision=<SHA>`.
- Health 200, deux métadonnées OAuth 200 et `/mcp` sans jeton 401.
- Succès uniquement si l'attestation retourne le SHA exact et `rollbackStatus=not_needed`.
- En cas d'échec runtime réel, restauration de l'image précédente selon le runbook ; aucune réécriture Git.

## État d'activation

Le bootstrap manuel est attesté par le run `31655087215`. L'activation de la PR #42 a produit le premier déploiement automatique `31658327435`, puis la PR #43 la preuve canonique `31659053836`. La chaîne reste inchangée.

## Contrôles après chaque déploiement

Réattester GitHub main, dépôt S1, propreté, remotes, Docker, image ID, OCI revision, runtime revision, Live State, health/OAuth/MCP et rollback.

## Attestation PR #44

La PR #44 a fusionné `3838c3918c3411a3317c6ea81047e77a7b627673`. La CI `31684159546` et le déploiement `31684159586`, job `94396216832`, ont réussi avec l'étape exact-SHA exécutée.

## Attestation PR #45

La PR #45 a été reverrouillée sur le head `e2b5f590a9af6a0ca6ae35aa99cb18c7e8c2506d` après réussite des CI push `31907681047` et PR `31907683383`. Elle a fusionné au SHA `bac8779320c8b9529d2a5215dbb1b1f31f828987`.

Le push de fusion a réussi la CI `31907827255` et l'Autodeploy `31907827212`. Le job `95068288136` a exécuté avec succès `Deploy exact main SHA through MCP`. L'attestation indépendante a confirmé dépôt S1 propre, remote push désactivé, Docker running/healthy, image `sha256:5a64f24f937718c392ccd2d8ac6387d5ceb1bc0535d2dcc6f3efbb7f7c8e4fc8` et révision OCI/runtime égale au merge.

## Réconciliation documentaire

La présente PR ne modifie que les huit documents canoniques. La référence fonctionnelle déclarée est le merge PR #45. Après fusion, Live State ne tolère l'écart descendant que si `git merge-base --is-ancestor` réussit et si `git diff --name-only` ne contient que des chemins documentaires allowlistés. Tout changement de code reste bloquant.

## Attestation PR #47

La PR #47 a été reverrouillée sur le head `8dddc5656aa959f4c392d0f1816b5ee0e25709a0` après réussite des CI push `31909255189` et PR `31909257693` (`12/12 + 188/188`, zéro échec). Elle a fusionné au SHA `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`.

Le push de fusion a réussi la CI `32535404248`, job `96935241037`, et l'Autodeploy `32535404345`. Le job `96935241275` a exécuté avec succès `Deploy exact main SHA through MCP`. L'attestation indépendante a confirmé dépôt S1 propre, remote push désactivé, Docker running/healthy, image `sha256:18c66b149e5e044880c3c786ca71ab1a27b4084f3e66cbb23be4fba27440ee75` et révision OCI/runtime égale au merge.

## Réconciliation documentaire finale post-PR #47

La présente PR #48 ne modifie que `SUIVI.md`, `TODO.md`, `TASKS.md`, `ACTIVITY_LOG.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, `DEPLOYMENT_PRODUCTION.md` et `PRODUCTION_STATE.json`. La référence fonctionnelle déclarée est le merge PR #47. Après fusion, Live State ne tolère l'écart descendant GitHub/S1 que si `git merge-base --is-ancestor` réussit, si le diff est strictement documentaire et si les références déclarées GitHub et S1 sont identiques. Tout changement de code reste bloquant.
