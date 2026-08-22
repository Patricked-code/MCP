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

- Référence GitHub et S1 déclarée : `c944fd9e7c05aad503f9e1d5d21e0ead25747886`, merge squash exact-head de la PR #49.
- Head candidat PR #49 : `1c9297d663624e5c348fba687051b649ca3e2a22` ; CI exacte `32565936838` réussie avant fusion.
- Live State `stateVersion=33`, réconcilié le `2026-08-22T09:51:57.351Z`, atteste GitHub `main`, S1, `origin/main` et runtime égaux à `c944fd9e…`.
- S1 : branche `main`, arbre propre, diff vide, fetch read-only et push `disabled://mcp-s1-read-only`.
- Docker : conteneur `wealthtech_mcp_ssh_bridge` running/healthy ; image `sha256:f6e05d77ed04c342e663c04322029f5233009ee4d75b78a9ebeea12af8027de5` ; révision OCI exacte `c944fd9e…`.
- Le déploiement fonctionnel est attesté ; le seul drift observé est documentaire et `nextAction=reconcile_canonical_documentation`.
- La présente branche est strictement documentaire. Après sa fusion, Live State peut accepter `c944fd9e…` comme ancêtre uniquement si tous les chemins descendants restent dans l'allowlist documentaire et si GitHub/S1 déclarent la même référence.

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

`TASK-20260822-001 — Mandatory Agent Bootstrap & Work Orchestration V1 — RÉCONCILIATION DOCUMENTAIRE FINALE`

## Candidate courante

- Branche gouvernée : `mcp/mandatory-agent-bootstrap-v1-20260822`, base exacte `78dade5e103c2ac73727f44c571f99384d6b8798`.
- Session gouvernée : `998292a6-b95f-4f3d-a4b0-b0f4738dea86` ; lock repository acquis avant mutation.
- Cartographie dérivée : 111 outils, 2 resources, 64 modules TypeScript, 188 relations d'import, 23 routes, 196 Markdown et 18 audits.
- Nouveaux contrats : inventaire current-state, receipt de bootstrap, Task Registry/queue et cinq outils de tâche ; les 92 contrats historiques restent inchangés.
- Gate : nouveaux verdicts observés en `shadow`, sans enforcement bloquant ; `ENABLE_WRITE_TOOLS`, `allow_write`, OIDC, Autodeploy et exclusion 2FA restent inchangés.
- Régression fraîche finale : installation de 143 packages, `222/222` tests, zéro échec/cancelled/skipped/todo ; typecheck, build, docs `196`, cartographie, preuve current-state, secrets et diff réussis.
- PR #49 : head exact `1c9297d…`, CI `32565936838` réussie, aucun thread de revue, fusion gardée par `expected_head_sha` au merge `c944fd9e…`.
- État de livraison : code fusionné et Autodeploy exact-SHA attesté ; GitHub/S1/runtime sont alignés et healthy. La queue runtime conserve la tâche `READY` jusqu'à son claim/transition via un connecteur ayant rechargé les cinq nouveaux outils de tâche.

## Prochaine action

Fusionner la PR strictement documentaire, réattester Live State puis, depuis une connexion dont la surface MCP a été rafraîchie, réclamer `TASK-20260822-001` et appliquer ses transitions finales sans recréer de tâche. La maintenance Node 24 demeure séparée ; la 2FA GitHub reste explicitement exclue.
