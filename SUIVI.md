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

## Production attestée après la PR #44

- GitHub `main`, S1 `HEAD`, S1 `origin/main` et révision OCI/runtime : `3838c3918c3411a3317c6ea81047e77a7b627673`.
- PR #44 fusionnée le 2026-08-13 ; CI push `31684159546` et Autodeploy `31684159586` réussis.
- Job de déploiement `94396216832` : étape `Deploy exact main SHA through MCP` exécutée et réussie.
- S1 : branche `main`, arbre propre, diff vide, fetch read-only et push `disabled://mcp-s1-read-only`.
- Docker : conteneur `wealthtech_mcp_ssh_bridge` running/healthy ; image `sha256:644fbbc9c7c5a856cb33390ee6a11277047e074189d7b9f793ecbf06064c1581`.
- Live State frais observé le 2026-08-15 : `stateVersion=14`, GitHub/S1/runtime alignés, mais documentation encore en `DOCUMENTATION_DRIFT` avant la passe finale post-hardening.

## Findings tardifs de la PR #44

Trois threads publiés après la fusion restaient ouverts :

- P1 : saturation du store sessions à 1 000 enregistrements historiques ;
- P1 : saturation du store locks à 2 000 enregistrements historiques ;
- P2 : locks actifs non libérés lors de la fermeture de leur session.

Aucun incident immédiat n'était présent lors de l'attestation : aucune session active et aucun lock actif.

## Draft PR #45 — durcissement Operational Memory

- Branche gouvernée unique : `mcp/harden-operational-memory-retention-20260815`.
- Draft PR : #45, base exacte `3838c3918c3411a3317c6ea81047e77a7b627673`.
- Head fonctionnel avant consolidation documentaire : `101d4c481caa42568f9c50302ddd891935e86917`.
- RED initial : `592b8506c14455e07852091282b918aa2b468730`, CI `31906835517`, six échecs attendus et discriminants.
- GREEN initial : `12e52030b5a6ddb4f1120057086b0e5643c6579b`, CI push/PR réussies.
- Revue interne RED : `7308d19c2153604dbe231236c6fbcaf46609a21d`, trois échecs attendus pour session terminale encore réconciliable et réconciliation documentaire post-merge.
- GREEN final : `101d4c481caa42568f9c50302ddd891935e86917`, CI push `31907348932` et PR `31907350301` réussies.
- Régression exacte : gouvernance `12/12`, read-only `184/184`, zéro fail ; typecheck, build, docs, secrets et `git diff --check` réussis.
- Sessions : conservation de toutes les sessions actives et de toute session terminale portant encore des `lockIds`; purge déterministe des plus anciennes sessions terminales réconciliées ; échec explicite si aucune entrée n'est supprimable.
- Locks : conservation de tous les locks actifs ; purge déterministe des plus anciens locks inactifs ; conflit toujours prioritaire ; échec explicite si la capacité est réellement active.
- Close : libération durable des locks avant transition de session, projection `lockIds` vidée dans l'écriture de fermeture et réconciliation conservée après panne partielle.
- Live State documentaire : un SHA déclaré différent reste en drift, sauf si ce SHA est prouvé ancêtre et que le diff descendant est strictement limité aux fichiers documentaires allowlistés.
- Aucun thread/review GitHub n'est présent sur la PR #45 au moment de cette consolidation.

## Invariants préservés

Autodeploy V1, GitHub OIDC, les outils historiques, `ENABLE_WRITE_TOOLS`, `allow_write`, le WRITE gate `shadow`, les deux stores existants et l'exclusion 2FA restent inchangés. Aucun patch, build, restart ou déploiement direct n'a été exécuté sur S1.

## Tâche active

`TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — EN COURS`

## Prochaine action unique

Valider la CI du head documentaire exact de la PR #45, reverrouiller la base et le head, passer la PR ready puis fusionner uniquement cette tête verte. Laisser Autodeploy V1 déployer, réattester GitHub/S1/OCI/runtime, résoudre les trois threads de la PR #44, puis effectuer une PR strictement documentaire finale déclarant le merge SHA de la PR #45.
