# SUIVI.md — Point de reprise courant

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

Date : 2026-08-22

## État fonctionnel attesté

- Référence GitHub déclarée : `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, merge squash de la PR #47.
- S1 HEAD déclaré : `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`.
- GitHub `main`, dépôt S1, OCI et runtime ont été réattestés ensemble sur cette référence avant la présente réconciliation documentaire.
- CI `main` `32535404248`, job `96935241037` : réussie.
- Autodeploy exact-SHA `32535404345`, job `96935241275` : étape `Deploy exact main SHA through MCP` exécutée et réussie.
- S1 : branche `main`, arbre propre, diff vide, fetch read-only et push `disabled://mcp-s1-read-only`.
- Docker : conteneur `wealthtech_mcp_ssh_bridge` running/healthy ; image `sha256:18c66b149e5e044880c3c786ca71ab1a27b4084f3e66cbb23be4fba27440ee75`.
- La présente PR #48 est strictement documentaire. Après sa fusion, Live State accepte la référence ancêtre ci-dessus pour GitHub et S1 uniquement parce que Git prouve que tous les chemins descendants sont documentaires et que les deux déclarations désignent le même ancêtre.

## Correctifs Operational Memory déployés

- Sessions : rétention déterministe des plus anciennes sessions définitivement terminales ; une session `EXPIRED` reste conservée tant que `resumeGraceSeconds` autorise encore sa reprise.
- Locks : rétention déterministe des plus anciens locks inactifs ; un lock `ACTIVE` au TTL écoulé devient supprimable à capacité, produit `lock.expired` et est retiré des projections de session.
- Capacité : erreurs explicites `SESSION_STORE_CAPACITY_EXCEEDED` et `LOCK_STORE_CAPACITY_EXCEEDED` lorsque rien ne peut être supprimé.
- Fermeture : libération durable des locks avant la transition de session, projection `lockIds` vidée et réconciliation conservée après panne partielle.
- Documentation : l'exception descendant docs-only couvre GitHub et le S1 déclaré seulement lorsque les deux références déclarées sont identiques ; tout descendant contenant du code, SHA inconnu, déclaration divergente ou signal `requires_revalidation` reste en drift.

## Preuves de non-régression

- RED initial PR #45 `592b8506c14455e07852091282b918aa2b468730` : six échecs attendus ; RED de revue `7308d19c2153604dbe231236c6fbcaf46609a21d` : trois échecs attendus.
- Head final PR #45 `e2b5f590a9af6a0ca6ae35aa99cb18c7e8c2506d` : CI push `31907681047` et PR `31907683383`, suites `12/12 + 184/184`.
- RED PR #47 `e18f553d7f8423f301fd3f226a14fe835dac8a74` : exactement 3 échecs ciblés sur 187 tests.
- Head final PR #47 `8dddc5656aa959f4c392d0f1816b5ee0e25709a0` : CI push `31909255189` et PR `31909257693`, suites `12/12 + 188/188`, zéro échec.
- Revue Codex exacte du head final sans problème majeur ; les deux fils PR #47 sont résolus.
- Aucun changement d'Autodeploy V1, GitHub OIDC, outils historiques, `ENABLE_WRITE_TOOLS`, `allow_write`, WRITE gate `shadow` ou exclusion 2FA.

## Revue et clôture

- Les trois threads tardifs de la PR #44 (`PRRT_kwDOTJ-y6M6Y3wvB`, `PRRT_kwDOTJ-y6M6Y3wvI`, `PRRT_kwDOTJ-y6M6Y3wvR`) restent résolus avec les preuves PR #45.
- Les trois threads tardifs de la PR #45 (`PRRT_kwDOTJ-y6M6ZiwC5`, `PRRT_kwDOTJ-y6M6ZiwC6`, `PRRT_kwDOTJ-y6M6ZiwC7`) ont reçu les preuves PR #47 fusionnée/déployée puis ont été résolus.
- La session gouvernée fonctionnelle a été checkpointée, son lock libéré et la session fermée ; la présente session documentaire porte uniquement la réconciliation finale.

## Tâche

`TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — TERMINÉE`

## Prochaine action

Aucune action fonctionnelle ou documentaire restante dans ce périmètre après fusion de la présente PR. La maintenance Node 24 demeure une tâche séparée ; la 2FA GitHub reste explicitement exclue.
