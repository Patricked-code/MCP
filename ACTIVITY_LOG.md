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

## 2026-08-13T00:38:34.1662564Z — TASK-20260809-003 — Workflow manuel exact-SHA attesté

- Run GitHub : `31655087215`, job `94307689798`.
- Job MCP : `mcp-s1-31655087215-8fb075dd55a3`.
- SHA demandé et attesté : `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- Contrat final : `succeeded/attested`, health/OAuth/MCP vrais, rollback `not_needed`.

## 2026-08-13T01:17:25.976Z — TASK-20260809-003 — Attestation post-workflow et inventaire courant

- GitHub main, S1 HEAD, origin/main, OCI et runtime égaux au SHA manuel.
- S1 : `main`, propre, diff vide, fetch read-only, push désactivé.
- Docker : running/healthy ; image `sha256:6f05aeffc4d5b57bc179f50c33e555dd39545fc828c636ef93f3abfdafb5dd50`.
- Live State : CURRENT, FULLY_ALIGNED, contradictions vides, prochaine action nulle.
- Markdown : 189 Git ; 33 miroir runtime dont 7 suivis et 26 runtime-only ; surface courante 215 ; historique 209 conservé séparément.

## 2026-08-13 — TASK-20260809-003 — PR #42, corrections TDD et activation candidate

- Branche : `mcp/finalize-governed-autodeploy-20260813`, base `main@8fb075dd55a3b94ed620527f11b2a77f88627188`.
- P2 polling : commit RED `979f22a5044d0d93adbd90cf555656dfd57cf5b1`, run `31657464793` en échec attendu ; correction `8827966e60178f65e9daccef8bc0d9150dff82c0`, run `31657546033` réussi.
- Artefact documentaire : test RED `263fdcc72c6ac2932eca9a416089c75410617765`, run `31657669105` en échec attendu ; générateur corrigé, run `31657781749` réussi après correction du diff-check.
- Politique : activation `pushEnabled=true` candidate ; aucune preuve de push automatique n’est encore déclarée.
- Aucune écriture directe sur S1, aucun push S1, aucun secret et aucune suppression.

## 2026-08-13T01:38:43.9747634Z — TASK-20260809-003 — Premier déploiement automatique par push attesté

- PR #42 fusionnée à tête verrouillée au SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`.
- CI push : run `31658327373`, job `94317597260`, tous les contrôles critiques réussis.
- Déploiement push : run `31658327435`, job `94317597740`, conclusion `success`.
- Étape `Resolve deployment gate` : exécutée et réussie.
- Étape `Deploy exact main SHA through MCP` : exécutée et réussie.
- Job MCP : `mcp-s1-31658327435-9be5095cbf72` ; message final d’attestation du SHA exact.
- État post-déploiement : GitHub/S1/origin/OCI/runtime égaux ; S1 propre ; runtime running/healthy ; image `sha256:1a3cc55d8ae7579e5e7c328e4ef925dee44d149b84ba7e6a09722711404bbb49`.
- Live State `2026-08-13T01:42:36.744Z` : CURRENT, FULLY_ALIGNED, contradictions vides, `nextAction=null`.
- Thread P2 PR #41 répondu puis résolu après fusion et attestation.
- Prochaine action : seconde PR documentaire gouvernée, puis second déploiement automatique canonique.

## 2026-08-13T05:19:31.979Z — TASK-20260813-004 — GO, plan TDD et défaut documentaire reproduit

- GO humain : spécification Governed Session Continuity / Operational Memory V1 approuvée le 2026-08-13.
- Branche unique : `mcp/session-continuity-v1-20260813` ; plan versionné au head corrigé `7e45ba2f3dd0df9500bc693f3190be4e6ed44933`, CI `31669569897` réussie.
- Baseline immuable : GitHub/S1/origin/OCI/runtime `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` ; S1 propre/read-only ; runtime running/healthy.
- RED documentaire : commit `eedc0f88cb396f4149921e28731f4c1d48147339`, CI `31669784015` en échec attendu uniquement à l'étape read-only safety ; localement un seul test échoue avec `false !== true`.
- Défaut runtime reproduit : Live State `stateVersion=9` déclare encore le SHA documentaire `9be5095…` et retourne `documentation=ALIGNED` malgré GitHub `eb61b97…`.
- Aucun changement de `main`, aucune écriture S1, aucune modification runtime, Autodeploy/OIDC ou 2FA.

## 2026-08-13T06:50:43Z — TASK-20260813-004 — Cycles TDD terminés et candidate prête pour draft PR

- Branche : `mcp/session-continuity-v1-20260813`, 27 commits réversibles depuis `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`.
- Head fonctionnel : `38e3ced7ff61119b1e8fd8d0228bf032972ecca9` ; GitHub Actions `31675193991` terminé `success`.
- Livraison de branche : correctif SHA documentaire, mémoire atomique, journal sanitizé, governed sessions durables, reprise, lifecycle/checkpoints, locks, identité OAuth sanitizée, outils MCP, contexte composé, resource/instructions, WRITE gate shadow, maintenance et dashboard.
- Installation fraîche : `npm --cache=/tmp/mcp-task13-npm-cache ci`, 143 packages, code 0. Le premier essai sans cache explicite a échoué localement avant les tests sur l'accès interdit à `/root/.npm`; aucune source n'a été modifiée par cet incident.
- Régression fraîche : `12/12` gouvernance et `161/161` read-only, zéro fail/cancelled/skipped/todo ; typecheck, build, docs check, secret scan et diff check réussis.
- Invariants : `origin/main=eb61b97e…`; 18/18 fichiers de test historiques conservés, 30 au total ; aucun fichier supprimé ; Autodeploy/OIDC/deploy inchangés ; `ENABLE_WRITE_TOOLS` et `allow_write` conservés ; aucun transport brut persisté.
- S1/runtime : aucune écriture ni modification. Merge, Autodeploy et attestation de cette branche : NON OBSERVÉS.
- Prochaine action : commit de consolidation, CI du head exact, puis unique draft PR et review.

## 2026-08-13T09:38:26Z — TASK-20260813-004 — Première revue corrigée, seconde revue requise

- Draft PR #44 créée vers `main` à base exacte `eb61b97e…`; CI initiales push `31675502633` et PR `31675612349` réussies.
- Première revue indépendante : verdict initial `non mergeable`, avec deux findings critiques, quatre importants et deux mineurs.
- Corrections TDD sur la branche unique : révocation/déliaison transport, shadow non bloquant en cas d’observateur suspendu, audit machine câblé, réparation `session.lockIds`, détail ruleset actif, feature-off inerte, compteur dashboard global et maintenance single-flight.
- Proposition de document unique pour sessions+locks non retenue car incompatible avec la conception approuvée ; alternative additive appliquée en conservant le store de locks comme autorité et `session.lockIds` comme projection réparée.
- Régression fraîche au head fonctionnel `6365e13…` : gouvernance `12/12`, read-only `172/172`, zéro fail/cancelled/skipped/todo ; typecheck, build, docs, secrets, diff et invariants réussis.
- `origin/main` reste `eb61b97e…`; Autodeploy/OIDC/deploy inchangés ; aucune écriture S1/runtime et aucune 2FA.
- Prochaine action : consolidation documentaire, CI du head exact et seconde revue indépendante avant toute autorisation ready/merge.
