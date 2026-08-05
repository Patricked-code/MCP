# SUIVI.md — Point de reprise courant

Date : 2026-08-05
Projet : WealthTech MCP SSH Bridge
Dépôt actif : `Patricked-code/MCP`
Branche officielle : `main`
Chemin serveur déclaré : `/opt/apps/wealthtech-mcp-ssh-bridge`

## État GitHub de référence avant la présente PR

```text
main : 5c349ef7d20eba128a09bac3d4fcae779a48b3f7
protection main : active
contrôle obligatoire : validate
```

Fondations et correctifs fusionnés :

- PR #18 — documentation canonique et reprise forensique ;
- PR #25 — diagnostic GitHub PR strictement read-only ;
- PR #26 — séparation des catalogues READ et WRITE ;
- PR #27 — fondation GitRegistry v2 duale et dry-run ;
- PR #30 — redaction P1 des identifiants et query strings OAuth dans les logs ;
- PR #31 — attestation read-only bornée du conteneur et de l’image Docker.

PR #19 : snapshot forensique conservé avec statut `DO NOT MERGE`.

## Attestation S1 terminée

L’issue #29 est clôturée avec un verdict **NO-GO pour alignement direct**.

Écarts attestés :

- branche S1 différente de `main` ;
- HEAD S1 ancien ;
- working tree suivi et non suivi sale ;
- runtime actif divergent du dépôt canonique ;
- provenance d’image initialement incomplète ;
- aucune autorisation de pull, build, restart ou nettoyage direct.

L’ancienne issue #17 ciblant `097dac9` est fermée comme supersédée.

## Phase active

Issue P0 : #32 — préparation d’un candidat isolé depuis le `main` protégé.

Branche de travail :

```text
mcp/recovery-candidate-preparation-20260805
```

Outil préparé :

```text
mcp_prepare_recovery_candidate_s1
```

Il doit uniquement :

1. vérifier le SHA exact du `main` distant ;
2. créer un snapshot forensique hors dépôt actif ;
3. conserver bundle, patch, archive autorisée, attestation Docker et manifeste SHA-256 ;
4. créer un clone candidat indépendant au SHA demandé ;
5. retourner `production_modified=false` et `candidate_validated=false`.

## État S1 et production

```text
S1 aligné avec main             : non
working tree S1 propre          : non
snapshot phase A exécuté        : non
clone candidat créé sur S1      : non
candidat validé                 : non
runtime candidat démarré        : non
production modifiée             : non
registre actif migré            : non
```

Le connecteur `wealthtech_ssh_bridge` n’est pas exposé dans la conversation courante. Le code de préparation est donc versionné et testé côté GitHub uniquement ; aucune action serveur n’est prétendue exécutée.

## Étape suivante après fusion de la phase A

Reconnecter le connecteur serveur, exécuter d’abord les contrôles read-only, puis invoquer la préparation avec :

```text
expected_main_sha=<SHA complet du main alors courant>
allow_write=true
```

La sortie devra être publiée sous forme public-safe dans l’issue #32 avant la phase B de validation du candidat.

## Interdictions permanentes jusqu’au verdict du candidat

- aucun pull, reset, clean, checkout, switch, rebase ou stash dans le working tree actif ;
- aucun build ou restart depuis le dossier actif sale ;
- aucun remplacement du registre ;
- aucun changement de remote ;
- aucun déploiement, migration, quarantaine, purge ou suppression ;
- aucune confusion entre candidat préparé, candidat validé et candidat déployable.

## Sources associées

- `PRODUCTION_STATE.json` ;
- `TASKS.md` ;
- `TODO.md` ;
- `DECISIONS_LOG.md` ;
- `CHANGELOG.md` ;
- `docs/audits/2026-08-05/MCP_RECOVERY_CANDIDATE_PREPARATION.md` ;
- `docs/history/SUIVI_PRE_FOUNDATIONS_20260805.md` pour l’historique antérieur.
