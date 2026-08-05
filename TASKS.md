# TASKS.md

## Rôle
Plan opérationnel exécutable du MCP.

## Tâches immédiates

- TASK-20260712-001 — TERMINÉE : revue et fusion de la PR #11.
- TASK-20260713-001 — TERMINÉE DANS GITHUB, NON DÉPLOYÉE : outil `mcp_sync_from_github_s1` versionné avec garde-fous.
- TASK-20260805-001 — TERMINÉE : documentation canonique fusionnée par la PR #18.
- TASK-20260805-002 — TERMINÉE : diagnostic GitHub read-only fusionné par la PR #25.
- TASK-20260805-003 — TERMINÉE : séparation READ/WRITE fusionnée par la PR #26.
- TASK-20260805-004 — TERMINÉE : GitRegistry v2 dry-run fusionné par la PR #27.
- TASK-20260805-005 — TERMINÉE : protection de `main`, issue #24 clôturée.
- TASK-20260805-006 — TERMINÉE AVEC NO-GO : attestation S1 de l’issue #29 ; alignement direct interdit.
- TASK-20260805-007 — TERMINÉE : correction P1 des logs OAuth fusionnée par la PR #30.
- TASK-20260805-008 — TERMINÉE : outil d’attestation Docker read-only fusionné par la PR #31.
- TASK-20260805-009 — EN COURS CÔTÉ GITHUB : préparer un snapshot externe et un clone candidat indépendant, issue #32.
- TASK-20260805-010 — EN ATTENTE : exécuter la phase A sur S1 après déploiement contrôlé de l’outil et reconnexion du connecteur.
- TASK-20260805-011 — EN ATTENTE : valider le candidat isolé par `npm ci`, typecheck, build, documentation, scan de secrets et tests.
- TASK-20260805-012 — EN ATTENTE : démarrer un runtime candidat sur `127.0.0.1:8788`, sans remplacer la production.
- TASK-20260805-013 — EN ATTENTE : comparer candidat, runtime actif et snapshot, puis produire un verdict.

## Tâche active unique

### TASK-20260805-009 — Préparation contrôlée du candidat

Branche :

```text
mcp/recovery-candidate-preparation-20260805
```

Outil :

```text
mcp_prepare_recovery_candidate_s1
```

Objectifs :

1. exiger `ENABLE_WRITE_TOOLS=true` et `allow_write=true` ;
2. exiger un SHA complet identique au `main` distant ;
3. vérifier le remote actif sans le modifier ;
4. créer un snapshot sous `/opt/apps/wealthtech-mcp-recovery/snapshots/<run_id>` ;
5. produire bundle Git, patch binaire, archive non suivie autorisée, attestation Docker et manifeste SHA-256 ;
6. créer un dépôt candidat indépendant sous `/opt/apps/wealthtech-mcp-recovery/candidates/<run_id>` ;
7. vérifier SHA, remote et état propre du candidat ;
8. ne lancer aucun build, restart ou déploiement.

Tests obligatoires :

- SHA court refusé ;
- catalogue WRITE exact ;
- absence de reset, clean, stash, pull et checkout actif ;
- absence de build, Docker Compose, stop, restart et suppression ;
- exclusions de secrets, dumps, bases et artefacts ;
- attestation Docker bornée ;
- typecheck, build, docs, scan de secrets et suite de tests GitHub verts.

Résultat attendu côté GitHub : PR fusionnable avec CI verte.

Résultat attendu côté S1, ultérieurement :

```text
status=prepared
production_modified=false
candidate_validated=false
```

## Actions interdites avant la phase B

- modifier le working tree actif ;
- pull, reset, clean, checkout, switch, rebase ou stash dans le dépôt actif ;
- build ou restart depuis le dépôt actif ;
- démarrer un candidat sur le port de production ;
- remplacer le registre ou le remote ;
- supprimer, purger ou déplacer la dérive ;
- déclarer le candidat validé ou déployable après la seule phase A.

## Tâches futures séparées

- TASK-FUTURE-NODE — PLANIFIÉE : migration du runtime Node dans une PR dédiée.
- TASK-FUTURE-ACTIONS — PLANIFIÉE : modernisation et épinglage des GitHub Actions.
- TASK-FUTURE-REGISTRY-WRITE — PLANIFIÉE : backup, écriture atomique, rollback et audit v2 avant migration du registre actif.
- TASK-FUTURE-FRONTEND — PLANIFIÉE : cockpit GitRegistry v2 read-only puis CRUD gouverné.
- TASK-FUTURE-MODULES — PLANIFIÉE : réintroduction progressive d’AMF-UMOA, BRVMDATA, SADIAAF, Nigeria, Funds et Vhosts.

## Règle permanente

GitHub est la source versionnée. Le serveur est la source exécutée. Les deux doivent être vérifiés ensemble avant et après toute intervention.

Une tâche exécutable doit indiquer objectif, périmètre, risques, préconditions, tests, résultat attendu et rollback.
