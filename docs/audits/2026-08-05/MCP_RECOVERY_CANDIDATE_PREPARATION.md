# Phase A — préparation contrôlée du candidat de récupération MCP

Date : 2026-08-05
Branche : `mcp/recovery-candidate-preparation-20260805`
Base : `main@5c349ef7d20eba128a09bac3d4fcae779a48b3f7`
Issue : #32

## Contexte

L’attestation S1 de l’issue #29 a conclu à un NO-GO pour un alignement direct. Le dépôt actif est sale, sa branche et son HEAD diffèrent du `main` protégé et le runtime exécute une dérive qui doit rester récupérable.

L’ancienne issue #17, qui visait la baseline `097dac9`, est fermée comme supersédée. Cette baseline ne doit plus être utilisée comme cible.

## Objet de la phase A

Ajouter un outil write-scoped qui prépare les preuves et un candidat indépendant, sans modifier le working tree actif et sans valider ou démarrer le candidat.

Outil :

```text
mcp_prepare_recovery_candidate_s1
```

Arguments :

```text
expected_main_sha=<SHA complet de 40 caractères>
allow_write=true
```

## Vérifications préalables

L’outil refuse l’exécution lorsque :

- `ENABLE_WRITE_TOOLS` est désactivé ;
- `allow_write` n’est pas explicitement vrai ;
- le chemin actif n’est pas un dépôt Git ;
- le remote actif ne correspond pas à `Patricked-code/MCP` ;
- le SHA demandé ne correspond pas au `main` distant lu avec `git ls-remote` ;
- le répertoire de récupération est un lien symbolique ;
- un dossier du même `run_id` existe déjà.

## Snapshot hors dépôt actif

Racine fixe :

```text
/opt/apps/wealthtech-mcp-recovery/snapshots/<run_id>
```

Contenu :

- HEAD et branche source ;
- statut Git porcelain v2 ;
- bundle Git de tous les refs ;
- patch binaire du working tree ;
- archive des fichiers non suivis autorisés ;
- compte des fichiers exclus ;
- attestation Docker allowlistée ;
- métadonnées du candidat ;
- manifeste SHA-256.

Les permissions sont restreintes avec `umask 077`, dossiers `0700` et retrait des droits groupe/autres.

## Exclusions

Ne sont pas archivés parmi les fichiers non suivis :

- `.env` et variantes ;
- secrets et clés ;
- certificats et formats de clés ;
- dumps SQL ;
- bases SQLite et fichiers DB ;
- logs ;
- `node_modules`, `dist`, `build`, `coverage` ;
- sauvegardes MCP.

Le nombre d’éléments exclus est enregistré sans publier leur contenu dans la sortie MCP.

## Clone candidat

Racine fixe :

```text
/opt/apps/wealthtech-mcp-recovery/candidates/<run_id>
```

Le candidat :

- est initialisé comme dépôt indépendant ;
- utilise uniquement le remote HTTPS canonique ;
- récupère `main` avec les hooks désactivés ;
- exige le SHA exact ;
- effectue son checkout détaché dans le dossier candidat uniquement ;
- doit terminer avec un état propre.

## Interdictions garanties

La commande ne contient pas :

- reset, clean, stash, pull ou checkout dans le dépôt actif ;
- `npm ci`, installation, typecheck ou build ;
- Docker Compose, stop ou restart ;
- systemctl ou PM2 ;
- suppression, déplacement ou purge ;
- modification du remote ou du registre actif.

## Résultat

La sortie indique notamment :

```text
status=prepared
production_modified=false
candidate_validated=false
```

La validation du candidat, le démarrage sur un port isolé et toute bascule restent des phases séparées.

## Statut serveur

Cette PR ne déploie ni n’exécute l’outil sur S1. Le connecteur serveur n’est pas exposé dans la conversation courante.
