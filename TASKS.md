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
- TASK-20260805-007 — EN ATTENTE DU VERDICT : préparer l’alignement GitHub ↔ S1 ↔ Docker dans une copie propre isolée, avec rollback.
- TASK-20260809-001 — EN COURS : remplacer l'identité GitHub S1 par une deploy key read-only, neutraliser le push et attester le refus d'écriture.

## Taches futures separees
- TASK-FUTURE-NODE — PLANIFIEE, NON EXECUTEE : préparer la migration du runtime Node dans une PR dédiée.
- TASK-FUTURE-ACTIONS — PLANIFIEE, NON EXECUTEE : moderniser et épingler les GitHub Actions dans une PR dédiée.
- TASK-FUTURE-REGISTRY-WRITE — PLANIFIÉE, NON EXÉCUTÉE : implémenter backup, écriture atomique, rollback et audit v2 avant migration du registre actif.
- TASK-FUTURE-FRONTEND — PLANIFIÉE, NON EXÉCUTÉE : construire le cockpit GitRegistry v2 read-only puis le CRUD gouverné.
- TASK-FUTURE-MODULES — PLANIFIÉE, NON EXÉCUTÉE : réintroduire AMF-UMOA, BRVMDATA, SADIAAF, Nigeria, Funds et Vhosts par PR indépendantes.

## Tâche active unique

### TASK-20260809-001 — Identité GitHub S1 read-only

Préconditions :

- `main`, S1 et `origin/main` alignés sur `4228119…` avant travaux ;
- checkout S1 propre ;
- nouvelle branche créée depuis ce SHA ;
- aucune clé privée exposée ou versionnée.

Fichiers concernés :

- `src/tools/mcpGitSync.ts` ;
- `tests/mcpGitSync.test.ts` ;
- documents et politiques de gouvernance associés.

Risques : coupure du fetch si l'alias SSH ou la deploy key sont incorrects ; voie
d'écriture persistante si l'ancien credential n'est pas révoqué ; faux sentiment
de sécurité si seul le nom de l'alias est changé.

Tests attendus : test ciblé RED/GREEN, suite read-only complète, typecheck, build,
scan de secrets, contrôle documentaire, CI GitHub, `git fetch` réussi avec la
nouvelle identité et deux preuves de push refusé.

Résultat attendu : S1 peut récupérer uniquement `Patricked-code/MCP:main`, ne peut
pas pousser vers GitHub, et le runtime au SHA fusionné reste sain.

## Actions interdites pendant TASK-20260809-001

- push direct sur `main` ;
- écriture directe de code dans le checkout actif S1 ;
- stockage de clé privée dans Git ou dans un rapport ;
- révocation de l'ancienne identité avant validation de la nouvelle ;
- fusion ou déploiement sans CI, revue et SHA attendu.

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

Mise à jour : 2026-08-05
