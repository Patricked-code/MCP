# TASKS.md

## Role
Plan operationnel executable du MCP.

## Taches immediates
- TASK-20260712-001 — TERMINÉE : revue complète, approbation et fusion de la PR #11 au commit `38c9990`.
- TASK-20260713-001 — TERMINÉE DANS GITHUB, NON DÉPLOYÉE : outil `mcp_sync_from_github_s1` versionné avec garde-fous.
- TASK-20260805-001 — TERMINÉE : documentation canonique de reprise fusionnée par la PR #18.
- TASK-20260805-002 — TERMINÉE : diagnostic GitHub read-only fusionné par la PR #25.
- TASK-20260805-003 — TERMINÉE : séparation stricte des catalogues READ et WRITE fusionnée par la PR #26.
- TASK-20260805-004 — TERMINÉE : fondation GitRegistry v2 dry-run fusionnée par la PR #27.
- TASK-20260805-005 — TERMINÉE : ruleset `protect-main` actif et issue #24 clôturée.
- TASK-20260805-006 — TERMINÉE : connecteur `wealthtech_ssh_bridge` reconnecté ; branche, HEAD, remote, propreté et santé du conteneur attestés.
- TASK-20260805-007 — PARTIELLEMENT ABSORBÉE : l’alignement checkout GitHub ↔ S1 a été observé ultérieurement ; l’attestation runtime finale reste à produire après le prochain déploiement gouverné.
- TASK-20260809-001 — GITHUB TERMINÉ / ATTESTATION RUNTIME RESTANTE : la PR #37 est fusionnée dans `main@d3bcac0cf17608963317a18aa2916a5997916394`. La dernière observation S1 connue montrait le fetch `-ro`, le push neutralisé et le checkout aligné, mais le connecteur S1 n’est pas invocable dans la session courante et le runtime au SHA reste à réattester.
- TASK-20260809-002 — EN COURS : implémenter le MCP Live State Engine V1 natif, read-only-first, avec état persistant, réconciliation ≤ 60 s, provenance runtime, outils MCP et déploiement gouverné.

## Taches futures separees
- TASK-FUTURE-NODE — PLANIFIEE, NON EXECUTEE : préparer la migration du runtime Node dans une PR dédiée.
- TASK-FUTURE-ACTIONS — PLANIFIEE, NON EXECUTEE : moderniser et épingler les GitHub Actions dans une PR dédiée.
- TASK-FUTURE-REGISTRY-WRITE — PLANIFIÉE, NON EXÉCUTÉE : implémenter backup, écriture atomique, rollback et audit v2 avant migration du registre actif.
- TASK-FUTURE-FRONTEND — PLANIFIÉE, NON EXÉCUTÉE : construire le cockpit GitRegistry v2 read-only puis le CRUD gouverné.
- TASK-FUTURE-MODULES — PLANIFIÉE, NON EXÉCUTÉE : réintroduire AMF-UMOA, BRVMDATA, SADIAAF, Nigeria, Funds et Vhosts par PR indépendantes.

## Tâche active unique

### TASK-20260809-002 — MCP Live State Engine V1

Objectif : fournir à tous les clients du MCP une vue opérationnelle partagée et fraîche de `Patricked-code/MCP`, de S1, du runtime Docker et de la documentation canonique, sans mutation des sources observées.

Préconditions :

- base GitHub vérifiée sur `main@d3bcac0cf17608963317a18aa2916a5997916394` avant création de branche ;
- branche dédiée `mcp/live-state-v1-20260809` ;
- aucune modification directe du checkout de production S1 ;
- aucun secret nouveau dans Git ;
- réutilisation du MCP Node/TypeScript, du volume `/app/data`, de l’SSH read-only et de l’attestation runtime existants.

Fichiers principaux concernés :

- `src/liveState/*` ;
- `src/tools/liveState.ts` ;
- `src/tools/mcpRuntimeDeploy.ts` ;
- intégration read-only et démarrage MCP ;
- `Dockerfile` et `docker-compose.yml` pour la provenance OCI ;
- tests Live State et documents de gouvernance.

Risques : faux `FULLY_ALIGNED` si une source est indisponible ; fuite de données si une inspection runtime devient non bornée ; timer concurrent ; état JSON corrompu ; provenance Docker absente ; dérive documentaire ; régression des catalogues read/write.

Garde-fous :

- collecteurs read-only uniquement ;
- runtime inspecté avec l’allowlist existante ;
- écriture atomique de `/app/data/mcp-live-state.json` en `0600` ;
- `FULLY_ALIGNED` interdit sans GitHub = S1 = runtime attesté ;
- une source indisponible produit `DEGRADED` ;
- aucune nouvelle infrastructure PostgreSQL/Redis/service en V1 ;
- aucun push direct sur `main`.

Tests attendus : cycles TDD RED/GREEN pour réconciliation, store, collecteurs et moteur ; suite `test:readonly-safety`, typecheck, build, scan secrets, docs check, `git diff --check`, CI de PR et audit de diff complet.

Résultat attendu : après merge et déploiement, `mcp_get_live_state` et `mcp_reconcile_live_state` exposent un état commun actualisé au plus toutes les 60 secondes, avec `stateVersion`, fraîcheur, alignements, contradictions et prochaine action. Le déploiement final reste interdit tant que S1 ne peut pas être revalidé en lecture live.

## Actions interdites pendant TASK-20260809-002

- push direct sur `main` ;
- écriture directe du code sur S1 ;
- reset/clean/force pour aligner S1 ;
- déclaration `FULLY_ALIGNED` sans attestation runtime ;
- nouvelle base, Redis, microservice ou GitHub App en V1 ;
- exposition de token, clé privée, `.env`, mounts secrets ou Docker inspect non borné.

## Regle
Une tache executable doit indiquer objectif, fichiers concernes, risques, preconditions, tests et resultat attendu.

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

Mise à jour : 2026-08-09
