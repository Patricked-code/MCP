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

## 2026-08-12T10:24:44Z — TASK-20260809-003 — Reprise, préflight et blocage du bootstrap

- GitHub : `main@989dcefd90b8820f27af70f2ce18dc4a7685f6e1`, PR #39 fusionnée ; `MCP CI #295` réussie.
- Gate : run `31480688510` réussi, étape `Deploy exact main SHA through MCP` marquée `skipped` sous `pushEnabled=false`.
- S1 : `main@d3bcac0…`, arbre propre, diff vide, fetch read-only et push `disabled://mcp-s1-read-only`.
- Docker : `wealthtech_mcp_ssh_bridge` actif et healthy ; révision OCI NON VÉRIFIÉE.
- Catalogue : `mcp_sync_from_github_s1` présent dans le code S1 mais absent des outils callables ChatGPT.
- Action : aucune mutation S1 ; ajout local par TDD du contrôle sémantique de `PRODUCTION_STATE.json` et mise à jour du point de reprise.
- Prochaine action : publier la correction documentaire, rafraîchir le catalogue, répéter le préflight, puis seulement exécuter le bootstrap gouverné.

## 2026-08-12T15:35:31Z — TASK-20260809-003 — Recréation réelle du runtime et correction du faux redémarrage

- GitHub : `main@f87bf471d2d62b9586113cd6a91fb411f03cba41` vérifié avant la correction.
- S1 avant action : `main@d3bcac0…`, branche et remotes conformes, arbre propre, diff vide, conteneur healthy depuis trois jours.
- Validation : `mcp_typecheck_s1` et `mcp_build_s1` réussis avec Node 20 ; npm a signalé 0 vulnérabilité.
- Observation : `restart_mcp_bridge_s1` a reconstruit l'image mais n'a pas recréé le conteneur ; uptime inchangé à trois jours.
- Bootstrap réversible : ajout temporaire d'un label Docker public-safe par l'outil borné, reconstruction effective, puis restauration exacte du `Dockerfile`. Après action : conteneur redémarré et healthy, Git S1 propre, diff vide.
- Catalogue : la session ChatGPT conserve encore son ancien catalogue ; `mcp_sync_from_github_s1` reste non callable dans cette session malgré sa présence dans le code S1.
- Correction TDD : test RED reproduisant l'absence de `--force-recreate`, puis commande corrigée et santé fail-closed ; validation complète 118/118 et contrôles CI locaux réussis.
- Aucune synchronisation Git, aucun push S1, aucun secret, aucune suppression et aucune activation de `pushEnabled`.
