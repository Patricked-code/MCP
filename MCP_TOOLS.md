# MCP_TOOLS.md

## Rôle
Catalogue des outils MCP disponibles.

## Catégories
- Read-only : statut, inventaire, logs, scan.
- Write-scoped : écriture contrôlée de fichiers autorisés.
- Projet : pull, build, deploy uniquement sur projets autorisés.
- SQL : SELECT uniquement.
- Sécurité : scan secrets, masquage.

## Règle
Chaque outil doit documenter arguments, résultat, droits requis, risques et interdictions.

## `github_pr_authorization_diagnostic`

Objectif : tester en lecture seule l’authentification GitHub du serveur MCP, la visibilité d’un dépôt, la liste des pull requests et, facultativement, une pull request précise.

Arguments :

- `owner` : propriétaire GitHub ;
- `repo` : nom du dépôt ;
- `pullRequestNumber` : numéro de PR facultatif.

Résultat :

- probes HTTP séparées pour l’utilisateur authentifié, le dépôt, la liste des PR et la PR ciblée ;
- classification publique des erreurs `401`, `403` et `404` ;
- permissions GitHub acceptées lorsque l’en-tête correspondant est fourni ;
- `X-GitHub-Request-Id` pour la traçabilité ;
- recommandations limitées au dépôt ciblé.

Garde-fous :

- requêtes GitHub `GET` uniquement ;
- API HTTPS et hostname explicitement autorisé ;
- timeout réseau borné ;
- aucun token ou en-tête `Authorization` retourné ;
- aucun corps brut non borné ;
- aucune écriture GitHub, Git ou serveur ;
- aucune conclusion sur l’état d’une PR lorsque l’autorisation échoue ;
- le diagnostic concerne le credential du serveur MCP, pas le token interne du connecteur GitHub natif de ChatGPT.

Runbook : `docs/runbooks/GITHUB_PR_AUTHORIZATION_DIAGNOSTIC.md`.

## `github_registry_v2_dry_run`

Objectif : valider le registre Git existant et construire **uniquement en mémoire** un candidat GitRegistry v2.

Argument :

- `include_candidate=false` par défaut ; lorsque `true`, inclut le candidat validé dans la réponse pour revue.

Résultat :

- version du schéma source et cible ;
- hash canonique de la source ;
- hash canonique du candidat ;
- compte des connexions, dépôts, mappings, migrations et événements ;
- avertissements sur les chemins non vérifiés et les migrations en attente ;
- candidat v2 facultatif.

Garde-fous :

- lecture du fichier registre uniquement ;
- aucune écriture de fichier ;
- aucun remplacement du registre actif ;
- aucune activation automatique de mapping ou de capacité sensible ;
- consolidation de `Patricked-code/MCP` comme dépôt actif et `chainsolutions-wealthtech/MCP` comme cible `migration_pending` ;
- aucun token ou credential copié ;
- validation des identifiants uniques et rejet des signaux de credential.

Ce dry-run ne constitue ni une migration exécutée ni une autorisation de modifier un remote, un chemin serveur ou la production.

## `mcp_runtime_image_attestation_s1`

Objectif : attester en lecture seule le conteneur MCP actif sur S1 et l’image Docker qu’il référence.

Arguments : aucun. Le conteneur est fixé dans le code à `wealthtech_mcp_ssh_bridge`.

Résultat borné :

- nom et ID complet du conteneur ;
- date de création et date de démarrage ;
- statut et santé ;
- référence et ID complet de l’image ;
- date de création de l’image ;
- tags et digests du dépôt ;
- labels Docker Compose sélectionnés ;
- labels OCI sélectionnés : création, révision, source et version.

Garde-fous :

- commandes `docker inspect` et `docker image inspect` avec `--format` uniquement ;
- aucune variable d’environnement retournée ;
- aucun mount, HostConfig, réseau, commande, entrypoint, argument ou path retourné ;
- aucun log Docker lu ;
- aucun label arbitraire ou objet JSON complet retourné ;
- aucune commande `docker exec`, stop, restart, compose ou mutation ;
- aucune écriture serveur.

Cet outil fournit une preuve de provenance. Il n’autorise ni build, ni restart, ni déploiement, ni alignement GitHub → S1.

## `mcp_prepare_recovery_candidate_s1`

Objectif : préparer hors du dépôt actif un snapshot forensique local et un clone candidat indépendant au SHA exact du `main` GitHub distant.

Arguments obligatoires :

- `expected_main_sha` : SHA Git complet de 40 caractères ;
- `allow_write=true` : validation explicite de l’opérateur.

Préconditions :

- `ENABLE_WRITE_TOOLS=true` ;
- dépôt actif sous `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- remote actif limité à `Patricked-code/MCP` ;
- SHA demandé identique à `refs/heads/main` lu directement sur le remote canonique ;
- répertoire de récupération fixe, non symbolique et extérieur au dépôt actif.

Snapshot créé sous `/opt/apps/wealthtech-mcp-recovery/snapshots/<run_id>` :

- branche, HEAD et statut Git ;
- bundle Git de tous les refs ;
- patch binaire du working tree hors chemins sensibles/générés ;
- archive des fichiers non suivis autorisés ;
- nombre de fichiers non suivis exclus, sans publier leur contenu ;
- attestation bornée du conteneur et de l’image Docker ;
- manifeste `SHA256SUMS` et hash du manifeste.

Candidat créé sous `/opt/apps/wealthtech-mcp-recovery/candidates/<run_id>` :

- dépôt Git indépendant ;
- remote HTTPS canonique ;
- fetch de `main` avec hooks désactivés ;
- checkout détaché uniquement dans le candidat ;
- vérification stricte du SHA, du remote et d’un état propre.

Exclusions des fichiers non suivis : `.env`, secrets, clés, dumps, bases locales, logs, `node_modules`, `dist`, `build`, `coverage` et sauvegardes MCP.

Interdictions :

- aucun checkout, reset, clean, stash, rebase ou pull dans le dépôt actif ;
- aucun build, `npm ci`, restart ou démarrage de conteneur ;
- aucun changement du runtime actif, du registre ou du remote ;
- aucune suppression, purge ou quarantaine ;
- aucune conclusion de validation ou de déployabilité.

La sortie porte explicitement `production_modified=false` et `candidate_validated=false`. La validation du candidat est une phase séparée.

## `mcp_sync_from_github_s1`

Objectif : synchroniser `/opt/apps/wealthtech-mcp-ssh-bridge` avec `Patricked-code/MCP:main` sans écraser ni réécrire l'historique.

Argument obligatoire :

- `allow_write=true` après validation explicite de l'opérateur.

Garde-fous :

- `ENABLE_WRITE_TOOLS` doit être actif ;
- branche serveur obligatoirement `main` ;
- remote `origin` limité au dépôt `Patricked-code/MCP` ;
- dépôt totalement propre, y compris les fichiers non suivis ;
- avance rapide uniquement après vérification d'ascendance ;
- hooks Git désactivés pendant le fetch et le fast-forward ;
- contrôle du commit final et nouvel état propre obligatoire.

L'outil n'exécute ni build, ni redémarrage, ni reset, ni clean, ni rebase, ni stash, ni push. Le build et le redémarrage restent des opérations séparées afin de conserver des points de contrôle explicites.

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
