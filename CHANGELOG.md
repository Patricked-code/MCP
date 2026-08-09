# CHANGELOG.md

## Role
Historique factuel des changements du depot MCP.

## 2026-07-09 - Bootstrap documentaire MCP
- Creation progressive des fichiers Markdown racine manquants.
- Conservation des fichiers deja presents sans ecrasement.
- Serveur confirme : /opt/apps/wealthtech-mcp-ssh-bridge.
- Depot attendu : Patricked-code/MCP.
- Branche : main.
- Limite : documentation seulement, aucun secret, aucune suppression, aucun deploiement.

## Regle
Chaque changement visible doit indiquer date, fichier, raison, impact, tests et rollback si applicable.

---

## 2026-07-09 — Validation production MCP GitHub ↔ serveur

- Ajout et validation de la gouvernance GitHub ↔ serveur MCP.
- Commit de référence : `fbc7c97 docs: formalize MCP GitHub production governance and inventory`.
- Validation Docker Compose réussie.
- Validation endpoint local `/health` réussie.
- Validation endpoint public `/health` réussie.
- Validation endpoints OAuth `.well-known` réussie.
- Validation `/mcp` sans token : `401 Unauthorized`, comportement attendu.
- Aucun secret critique ajouté.
- Aucune suppression destructive effectuée.

---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.
Le serveur MCP est la source exécutée.
Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## 2026-07-11 -- Phase 2 hardening read-only / CI / state docs

- Durcissement du garde-fou read-only : la commande `cp` est détectée comme commande shell autonome, sans bloquer les chemins ou mots contenant `mcp`.
- Ajout d'un test dédié `test:readonly-safety`.
- Ajout d'une CI GitHub Actions minimale pour PR et branches `mcp/*`.
- Mise à jour documentaire public-safe de l'état courant : `main` et S1 sont alignés sur `f92f621`.
- Traçage de l'exception : `f92f621 fix(oauth): accept Claude and ChatGPT MCP resource aliases` contient aussi `durableAccounts` et semble être arrivé sur `main` sans PR visible. Ce chemin ne doit pas être répété.
- Aucune action production, aucun redémarrage, aucun déploiement, aucun nettoyage, aucun merge de PR #10.

## 2026-07-12 -- Phase 4 correction contrôlée de la PR #11

- VÉRIFIÉ : renforcement du garde-fou read-only contre `cp`, les séparateurs, substitutions, wrappers et shells `-c`, sans bloquer les commandes MCP légitimes inventoriées.
- VÉRIFIÉ : extension des tests à toutes les familles déclarées et aux commandes exactes de scan/recherche.
- VÉRIFIÉ : CI limitée en permissions, temporisée, sans credentials persistants et avec contrôle effectif base/head.
- VÉRIFIÉ : retrait de `MCP_MASTER_REFERENCE.md` pour éviter une nouvelle source documentaire concurrente.
- PARTIELLEMENT VÉRIFIÉ : S1 a restitué le préfixe `f92f621`, pas le SHA complet ; le working tree suivi était propre, mais les fichiers ignorés n'ont pas été audités exhaustivement.
- NON VÉRIFIÉ : identité du commit embarqué dans l'image Docker active.
- NON EXÉCUTÉ : aucune fusion, aucun déploiement, aucun redémarrage et aucune modification serveur.
- Prochaine action unique : nouvelle revue complète de la PR #11 et de sa CI.

## 2026-07-13 -- Outil de synchronisation GitHub vers S1

- PR #11 revue, approuvée et fusionnée dans `main` au commit `38c9990`.
- Ajout de l'outil contrôlé `mcp_sync_from_github_s1`.
- Synchronisation limitée à `Patricked-code/MCP:main`, dépôt propre et fast-forward uniquement.
- Ajout de tests de syntaxe et de garde-fous ; aucune commande destructive ou réécriture d'historique autorisée.
- Build et redémarrage volontairement séparés de la synchronisation Git.
- Aucun déploiement serveur exécuté dans cette branche.

## 2026-08-05 — Préservation du runtime MCP

- Snapshot forensique créé et hashé.
- Baseline `097dac9` testée avec succès.
- Runtime récupéré dans la branche `mcp/recover-runtime-drift-20260805`.
- Commit de récupération : `7c8d9f782ae3195197345257f38fbc400504a848`.
- Build récupéré identique au runtime actif.
- Branche publiée sans modification de main.
- Aucun déploiement ni redémarrage effectué.

## 2026-08-05 — Diagnostic d’autorisation GitHub PR reconstruit

- Ancienne PR #21 conservée comme historique, sans fusion.
- Nouvelle branche : `mcp/github-pr-auth-diagnostics-rebased-20260805` depuis `main@3f79184eb6a647b39596ff408baa50c4a0c23c01`.
- Ajout du module read-only `src/github/authorizationDiagnostics.ts` et de l’outil `github_pr_authorization_diagnostic`.
- Probes séparées : utilisateur authentifié, dépôt, liste des PR et PR ciblée.
- Durcissements : HTTPS obligatoire, allowlist d’hôte, timeout borné, classification correcte des `404` et aucune fuite du credential.
- Tests `tests/githubAuthorization.test.ts` intégrés à `test:readonly-safety`.
- Runbook ajouté sous `docs/runbooks/GITHUB_PR_AUTHORIZATION_DIAGNOSTIC.md`.
- Aucun changement de production, aucun déploiement et aucun redémarrage S1.

## 2026-08-05 — Fondations GitHub MCP terminées

- PR #18 fusionnée : documentation canonique et reprise non destructive.
- PR #25 fusionnée : diagnostic GitHub PR strictement read-only.
- PR #26 fusionnée : catalogues READ et WRITE disjoints et testés.
- PR #27 fusionnée : GitRegistry v2 dual et dry-run uniquement.
- `main` atteint `618f4020ac69801dd53f624e5cd188fc6d76cc24`.
- Ruleset `protect-main` actif ; issue #24 clôturée.
- Anciennes PR #21, #22 et #23 fermées sans fusion après reconstruction.
- CI des PR #25, #26 et #27 entièrement réussie.
- État final consigné dans `docs/audits/2026-08-05/MCP_FOUNDATIONS_FINAL_STATE.md`.
- `PRODUCTION_STATE.json`, `TASKS.md` et `TODO.md` actualisés.
- Aucun changement S1/S2, aucun build ou restart de production, aucun déploiement et aucune migration du registre actif.
- Prochaine action unique : attestation S1 read-only après reconnexion du connecteur `wealthtech_ssh_bridge`.

## 2026-08-09 — Durcissement de l'identité GitHub de déploiement S1

- Remplacement dans `mcp_sync_from_github_s1` de l'alias autorisé
  `github.com-mcp-patricked-rw` par `github.com-mcp-patricked-ro`.
- Refus de toute synchronisation si `remote.origin.pushurl` n'est pas exactement
  `disabled://mcp-s1-read-only`.
- Ajout d'un test comportemental exécutant le préflight Git dans des dépôts
  temporaires : ancien alias refusé, push actif refusé, configuration read-only
  acceptée jusqu'au fetch.
- Ajout d'une procédure de rotation et de rollback sans secret dans
  `docs/runbooks/S1_GITHUB_READ_ONLY_DEPLOY_IDENTITY.md`.
- Mise à jour de `SUIVI.md`, `TASKS.md`, `DECISIONS_LOG.md` et des politiques
  `.mcp`.
- Production non modifiée dans ce commit ; la rotation S1 reste une opération
  post-fusion contrôlée.

## 2026-08-09 — MCP Live State Engine V1 — branche de livraison

- Ajout d'un modèle d'état partagé GitHub/S1/runtime/documentation avec verdict déterministe, contradictions, prochaine action, fraîcheur et `stateVersion` sémantique.
- Ajout du store atomique `/app/data/mcp-live-state.json` en permissions `0600`.
- Ajout de collecteurs GitHub dynamique, Git S1 read-only, Docker borné et signaux documentaires ciblés.
- Ajout d'une réconciliation initiale puis toutes les 60 secondes avec protection contre les exécutions concurrentes et dégradation explicite en cas d'échec.
- Ajout des outils MCP read-only `mcp_get_live_state` et `mcp_reconcile_live_state`.
- Ajout de la provenance OCI : le build Docker reçoit le HEAD S1 et le publie dans `org.opencontainers.image.revision`.
- Réutilisation du déployeur MCP existant ; aucune seconde voie de déploiement n'est créée.
- TDD vérifié par cycles RED/GREEN GitHub Actions pour réconciliation, stockage, collecteurs, provenance, moteur et outils.
- Dernière validation fonctionnelle avant consolidation documentaire : typecheck, build, docs check, scan secrets, suite read-only et `git diff --check` tous réussis.
- Limitation connue : injection directe du résumé dans `get_project_context` différée parce que la mutation de `src/tools/readOnly.ts` a été bloquée par le filtre de sécurité du wrapper ; les deux outils Live State sont néanmoins enregistrés dans le chemin read-only global.
- Aucun déploiement S1/Docker n'est déclaré à ce stade : le connecteur S1 doit être réinvocable et le préflight doit être refait après merge.
- Rollback : précédent commit/image MCP connu bon, sans réécriture d'historique ; le state file runtime peut rester inutilisé.
