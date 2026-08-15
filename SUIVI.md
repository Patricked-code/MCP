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

Date : 2026-08-15

## État fonctionnel attesté

- Référence GitHub déclarée : `bac8779320c8b9529d2a5215dbb1b1f31f828987`, merge squash de la PR #45.
- GitHub `main`, dépôt S1, OCI et runtime ont été réattestés ensemble sur cette référence avant la présente réconciliation documentaire.
- CI `main` `31907827255` réussie.
- Autodeploy exact-SHA `31907827212`, job `95068288136` : étape `Deploy exact main SHA through MCP` exécutée et réussie.
- S1 : branche `main`, arbre propre, diff vide, fetch read-only et push `disabled://mcp-s1-read-only`.
- Docker : conteneur `wealthtech_mcp_ssh_bridge` running/healthy ; image `sha256:5a64f24f937718c392ccd2d8ac6387d5ceb1bc0535d2dcc6f3efbb7f7c8e4fc8`.
- La présente PR est strictement documentaire. Après sa fusion, Live State accepte la référence ancêtre ci-dessus uniquement parce que Git prouve que tous les chemins descendants sont documentaires.

## Correctifs Operational Memory déployés

- Sessions : rétention déterministe des plus anciennes sessions terminales réconciliées ; sessions actives et sessions terminales portant encore des `lockIds` conservées.
- Locks : rétention déterministe des plus anciens locks inactifs ; locks actifs et priorité des conflits conservés.
- Capacité : erreurs explicites `SESSION_STORE_CAPACITY_EXCEEDED` et `LOCK_STORE_CAPACITY_EXCEEDED` lorsque rien ne peut être supprimé.
- Fermeture : libération durable des locks avant la transition de session, projection `lockIds` vidée et réconciliation conservée après panne partielle.
- Documentation : tout descendant contenant du code, tout SHA inconnu ou tout signal `requires_revalidation` reste en drift.

## Preuves de non-régression

- RED initial `592b8506c14455e07852091282b918aa2b468730`, run `31906835517` : six échecs attendus.
- GREEN initial `12e52030b5a6ddb4f1120057086b0e5643c6579b`.
- RED de revue `7308d19c2153604dbe231236c6fbcaf46609a21d` : trois échecs attendus.
- GREEN fonctionnel `101d4c481caa42568f9c50302ddd891935e86917`.
- Head final PR #45 `e2b5f590a9af6a0ca6ae35aa99cb18c7e8c2506d` : CI push `31907681047` et PR `31907683383` réussies.
- Suites finales : gouvernance `12/12`, read-only `184/184`, typecheck, build, docs, scan secrets et whitespace diff verts.
- Aucun changement d'Autodeploy V1, GitHub OIDC, outils historiques, `ENABLE_WRITE_TOOLS`, `allow_write`, WRITE gate `shadow` ou exclusion 2FA.

## Revue et clôture

Les trois threads tardifs de la PR #44 (`PRRT_kwDOTJ-y6M6Y3wvB`, `PRRT_kwDOTJ-y6M6Y3wvI`, `PRRT_kwDOTJ-y6M6Y3wvR`) sont résolus avec références à la PR #45 fusionnée et déployée.

## Tâche

`TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — TERMINÉE`

## Prochaine action

Aucune action fonctionnelle ou documentaire restante dans ce périmètre. La maintenance Node 24 demeure une tâche séparée ; la 2FA GitHub reste explicitement exclue.
