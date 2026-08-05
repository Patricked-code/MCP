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
- TASK-20260805-006 — BLOQUÉE PAR CONNECTEUR : reconnecter `wealthtech_ssh_bridge` et effectuer l’attestation S1 strictement read-only.
- TASK-20260805-007 — EN ATTENTE DU VERDICT : préparer l’alignement GitHub ↔ S1 ↔ Docker dans une copie propre isolée, avec rollback.

## Taches futures separees
- TASK-FUTURE-NODE — PLANIFIEE, NON EXECUTEE : préparer la migration du runtime Node dans une PR dédiée.
- TASK-FUTURE-ACTIONS — PLANIFIEE, NON EXECUTEE : moderniser et épingler les GitHub Actions dans une PR dédiée.
- TASK-FUTURE-REGISTRY-WRITE — PLANIFIÉE, NON EXÉCUTÉE : implémenter backup, écriture atomique, rollback et audit v2 avant migration du registre actif.
- TASK-FUTURE-FRONTEND — PLANIFIÉE, NON EXÉCUTÉE : construire le cockpit GitRegistry v2 read-only puis le CRUD gouverné.
- TASK-FUTURE-MODULES — PLANIFIÉE, NON EXÉCUTÉE : réintroduire AMF-UMOA, BRVMDATA, SADIAAF, Nigeria, Funds et Vhosts par PR indépendantes.

## Tâche active unique

### TASK-20260805-006 — Attestation S1 read-only

Précondition : connecteur `wealthtech_ssh_bridge` réellement invocable.

Contrôles obligatoires :

1. ping MCP ;
2. `git status` complet avec fichiers non suivis ;
3. branche, HEAD, remote et `origin/main` ;
4. image Docker active, ID, digest, date et labels ;
5. catalogue des outils réellement exposés ;
6. health checks local et public ;
7. comparaison avec `main@618f4020ac69801dd53f624e5cd188fc6d76cc24` ;
8. rapport Go, Go avec corrections ou No-Go.

Résultat attendu : preuve suffisante pour décider d’une procédure d’alignement séparée. Cette tâche n’autorise aucun changement serveur.

## Actions interdites avant clôture de TASK-20260805-006

- pull, reset, clean, checkout, switch, rebase ou stash dans le working tree actif ;
- build ou restart depuis le dossier actif sale ;
- remplacement du registre ;
- modification de remote ;
- déploiement, migration, quarantaine, purge ou suppression.

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
