# ACTIVITY_LOG.md — Journal chronologique append-only

## Rôle

Journal chronologique factuel des interventions significatives sur le MCP. Ce fichier complète `SUIVI.md` sans le remplacer : `SUIVI.md` décrit le point de reprise courant, tandis que `ACTIVITY_LOG.md` conserve la trace des événements.

## Règles

- append-only : ne pas réécrire l'historique pour le rendre plus favorable ;
- utiliser un horodatage ISO 8601 provenant d'une preuve lorsqu'il existe ;
- associer l'action à la tâche concernée ;
- ne jamais inclure de token, clé privée, mot de passe, `.env` ou secret ;
- distinguer action GitHub, état S1, état runtime, CI et documentation ;
- une absence de preuve doit rester explicitement `NON VÉRIFIÉE` ;
- les futures sessions gouvernées pourront ajouter automatiquement `sessionId`, agent, `stateVersion`, résultat et prochaine action.

---

## 2026-08-09T12:38:11Z — TASK-20260809-002 — Design Live State V1 matérialisé

- Agent : ChatGPT via connecteur GitHub gouverné.
- Branche : `mcp/live-state-v1-20260809`.
- Base vérifiée lors de la création : `main@d3bcac0cf17608963317a18aa2916a5997916394`.
- Commit : `30e9d62201a7a131adc21c49a07917a65437ecc7` — `docs: specify MCP Live State V1`.
- Résultat : architecture V1 formalisée avant le code ; réutilisation du MCP existant, `/app/data`, SSH read-only et attestation runtime ; aucune infrastructure parallèle.
- S1/runtime : aucune mutation ; le connecteur S1 n'est pas invocable dans cette session.

## 2026-08-09T12:57:32Z — TASK-20260809-002 — Contrat fonctionnel Live State validé sur branche

- Agent : ChatGPT via connecteur GitHub gouverné.
- Commit : `53846974c3b47764c9e0f205b6b76c62d407eae9` — `test(live-state): verify read-only integration and summary`.
- État fonctionnel présent sur la branche : modèle/reconciliation, store atomique, collecteurs, provenance OCI, moteur 60 s, outils `mcp_get_live_state` et `mcp_reconcile_live_state`.
- GitHub Actions : run `31314581950`, job `validate`, terminé avec succès après ce commit.
- Validation observée : typecheck PASS, build PASS, docs check PASS, secret scan PASS, suite read-only PASS, whitespace diff check PASS.
- Méthode : cycles TDD RED/GREEN précédents confirmés par CI ; les RED provenaient des modules volontairement absents avant implémentation.
- Production : NON DÉPLOYÉE à ce stade.

## 2026-08-09T13:01:53Z — TASK-20260809-002 — Consolidation documentaire avant PR

- Agent : ChatGPT via connecteur GitHub gouverné.
- Commit : `c54d8da97c9c96515493eb300a4fdc7dee714c64` — `docs: add Live State V1 changelog entry`.
- Documents réconciliés sur la branche : `TASKS.md`, `SUIVI.md`, `TODO.md`, `DECISIONS_LOG.md`, `CHANGELOG.md`.
- `TASK-20260809-001` reclassée : GitHub terminé, attestation runtime restante.
- `TASK-20260809-002` reste EN COURS jusqu'à PR/merge puis déploiement/attestation.
- Limitation documentée : injection directe du résumé dans `get_project_context` différée car la mutation de `src/tools/readOnly.ts` a été bloquée par le filtre de sécurité du wrapper ; aucun contournement opaque n'a été utilisé.
- Prochaine action : audit complet du diff, CI finale, PR Draft, revue, merge conditionnel, puis S1 uniquement après préflight live.
