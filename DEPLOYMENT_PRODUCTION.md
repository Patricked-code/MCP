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
- Succès uniquement si l’attestation retourne le SHA exact et `rollbackStatus=not_needed`.
- En cas d’échec runtime réel, restauration de l’image précédente selon le runbook ; aucune réécriture Git.

## État d’activation

Le bootstrap manuel a été attesté par le run `31655087215` au SHA `8fb075dd55a3b94ed620527f11b2a77f88627188`. La PR #42 peut donc activer `pushEnabled=true`. Cette activation n’est pas une preuve anticipée du chemin automatique : la fusion doit encore produire un run `push` non skipped et une attestation exacte, puis une seconde fusion ultérieure doit fournir la preuve canonique reproductible.

## Redémarrage générique

`restart_mcp_bridge_s1` recrée le conteneur et sonde `/health` par polling borné. Une readiness tardive n’est plus confondue avec un échec immédiat ; l’épuisement des essais reste bloquant.

## Contrôles après chaque déploiement

Réattester GitHub main, S1 HEAD, S1 origin/main, propreté, remotes, Docker, image ID, OCI revision, runtime revision, Live State, health/OAuth/MCP et rollback.
