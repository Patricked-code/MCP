# CODE_REVIEW.md

## Rôle
Journal de revue technique et dette du MCP.

## Points initiaux
- Deux fichiers applicatifs étaient déjà modifiés avant la passe documentaire : data/mcp-git-registry.json et src/github/registry.ts.
- Ne pas les mélanger avec le commit documentaire sans revue spécifique.
- Vérifier CODEX.md après écriture pour corriger toute anomalie d’encodage ou typo.

## À documenter
Risques, dette, fichiers critiques, corrections faites, corrections restantes et tests.

## 2026-08-28 — Verdict final et attestation PR #52

- Revue indépendante du head final : zéro Critical, zéro Important, zéro Minor ; les cinq findings initiaux sont confirmés résolus.
- Arbres local et GitHub identiques : `4655f4aaa8b79557bf1fbb23651faa7e72a7021d` ; head GitHub final `33a3e424a5fe271cf82c1ee6db8c94785289e3ca`.
- Validation fraîche avant fusion : `234/234`, typecheck, build, docs `196`, cartographie, preuve current-state, secrets et diff réussis ; CI PR `33213114008` réussie.
- Fusion protégée au SHA `fff44ff2db386942730a67f3884980c7824cae7f` ; CI main `33214825660` et deploy `33214825772` réussis.
- Attestation post-déploiement : GitHub/S1/OCI/runtime exact-SHA, S1 propre/read-only, Docker healthy ; les trois threads PR #49 sont résolus.
- Dette explicitement conservée : audit de tâche best-effort, sans outbox ni garantie exactly-once ; ce choix est hors du périmètre de la correction et couvert par les tests.
- Aucun risque Critical/Important connu ne reste ouvert pour cette livraison `shadow`; l'enforcement demeure hors périmètre.

## 2026-08-28 — Findings tardifs PR #49

- `PRRT_kwDOTJ-y6M6bYAMT` (P1) : une tâche non terminale restait détenue après fermeture ou expiration définitive de sa session. Correction : réattribution maintenance idempotente, avec grâce de reprise préservée et corrélations conservées.
- `PRRT_kwDOTJ-y6M6bYAMV` (P2) : `currentTask` choisissait la première tâche d'une session active quelconque et pouvait projeter une tâche terminale. Correction : résolution par transport/session appelante et filtre des statuts terminaux.
- `PRRT_kwDOTJ-y6M6bYAMY` (P2) : l'inventaire annonçait `evidenceHead` mais lisait le working tree. Correction : `git ls-tree` + `git cat-file` sur le commit observé.
- Écarts associés : les outils de lecture de queue étaient `operational-write`; les mutations acceptaient une session `CLOSED` ou `EXPIRED`. Les registrations sont séparées et le bootstrap terminal est refusé.
- Preuve RED : huit échecs ciblés reproduisent exactement les garanties absentes.
- Preuve GREEN : `50/50` ciblés, puis gouvernance `12/12` et autres suites `216/216`, soit `228/228`; typecheck, build, docs `196`, cartographie, current-state, secrets et diff verts.
- Risque restant avant fusion : la réattribution dépend du cycle de maintenance périodique, borné à 60 secondes ; la fermeture n'effectue pas une écriture inter-store supplémentaire. Cette latence est préférée à une nouvelle autorité ou transaction distribuée.
- Gate restant : Draft PR, CI et revue du head exact, puis attestation post-merge. Aucun runtime n'est encore déclaré modifié.

## 2026-08-28 — Revue indépendante du head initial PR #52

- Verdict initial : aucun Critical, cinq Important, un Minor documentaire ; head initial non prêt à fusionner.
- Rétention : corrigée en considérant requeueable tout propriétaire absent du store, avec test de session déjà supprimée.
- TOCTOU : corrigé par un coordinateur FIFO partagé avec tests d'interleaving et de couverture ouverture/reprise/fermeture/expiration.
- Read-only : corrigé par initialisation du seed avant exposition et tests prouvant que les handlers de lecture n'appellent pas `ready()`.
- Preuve Git : corrigée avec `GIT_NO_REPLACE_OBJECTS=1`, horodatage par `evidenceHead` et fixture de replacement ref.
- Audit : suggestion d'outbox non retenue dans cette PR, car elle changerait le schéma et le contrat historique best-effort. La limitation est désormais explicite et couverte par un test d'échec/retry.
- Documentation : la réattribution n'est plus qualifiée d'immédiate ; délai annoncé au prochain cycle normalement inférieur à 60 secondes.
- Validation du head fonctionnel `0a672591…` : ciblée `51/51`, complète `234/234`, typecheck/build/cartographie/diff verts.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

## 2026-08-13 — PR #42 — Polling readiness MCP et artefact documentaire

- Thread source : PR #41, `PRRT_kwDOTJ-y6M6YoQ5j`, P2 ouvert et non obsolète au début du traitement.
- Cause : `sleep 5` suivi d’un unique `curl` ; `--max-time` borne une tentative mais ne retente pas un refus de connexion.
- Correction : jusqu’à 20 tentatives, requête bornée à 5 secondes, pause de 2 secondes, échec final non masqué.
- Test : RED `31657464793`, GREEN `31657546033`.
- Dette documentaire associée : le générateur d’artefact codait sept anciens snapshots ; il copie désormais les sources actives et la parité est testée.
- Résolution : correction fusionnée sur `main` par la PR #42 au SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` ; CI finale `31658220076` verte ; premier déploiement automatique `31658327435` attesté ; thread répondu et résolu.
- Risque restant : la preuve canonique ultérieure dépend encore d’une seconde fusion documentaire utile et de son déploiement exact-SHA.
