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

Le bootstrap manuel est attesté par le run `31655087215` au SHA `8fb075dd55a3b94ed620527f11b2a77f88627188`. La PR #42 a fusionné `pushEnabled=true` au SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`. Le push de cette fusion a exécuté le run de déploiement `31658327435`, job `94317597740`, avec l’étape exacte non skipped et réussie ; le job MCP `mcp-s1-31658327435-9be5095cbf72` a attesté ce même SHA avec health/OAuth/MCP vrais et rollback `not_needed`.

Cette première preuve valide l’activation. La clôture canonique exige encore une seconde fusion documentaire utile suivie d’un nouveau run automatique exact-SHA et d’une attestation indépendante.

## Redémarrage générique

`restart_mcp_bridge_s1` recrée le conteneur et sonde `/health` par polling borné. Une readiness tardive n’est plus confondue avec un échec immédiat ; l’épuisement des essais reste bloquant.

## Contrôles après chaque déploiement

Réattester GitHub main, S1 HEAD, S1 origin/main, propreté, remotes, Docker, image ID, OCI revision, runtime revision, Live State, health/OAuth/MCP et rollback.

## Attestation PR #44 et séquence de durcissement

La PR #44 a fusionné `3838c3918c3411a3317c6ea81047e77a7b627673`. La CI push `31684159546` et le déploiement `31684159586` ont réussi ; le job `94396216832` a exécuté l'étape exact-SHA. L'attestation du 2026-08-15 confirme S1 propre, Docker running/healthy et OCI/runtime sur ce même SHA.

La draft PR #45 ne doit être déployée qu'après CI du head documentaire exact et fusion verrouillée. La fusion doit déclencher l'Autodeploy existant ; aucune synchronisation, construction ou relance directe sur S1 n'est autorisée. Une PR strictement documentaire post-déploiement déclarera ensuite le merge SHA de la PR #45 et sera acceptée par Live State seulement si son diff descendant reste intégralement documentaire.

