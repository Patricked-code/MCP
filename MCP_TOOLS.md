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

## `cleanup_plan_s1` et `cleanup_plan_s2` — préparation non destructive (10 novembre 2026)

Ces commandes MCP sans argument inventorient en lecture seule les noms de répertoires observables sur S1 ou S2, consultent l'utilisation disque et produisent une classification pour revue. Elles ne suppriment, ne déplacent, ne vident, ne modifient et ne redémarrent rien.

- Sur **S1**, chaque répertoire ressemblant à un domaine hors liste protégée est classé `DISCOVER_ONLY_NOT_AUTHORIZED`. Cela ne signifie **pas** qu'il est supprimable.
- Sur **S2**, seules les six cibles historiques indiquées dans `Migration/02_PLAN_MIGRATION_ET_SECURITE.md` apparaissent comme `REVIEW_ONLY_NOT_AUTHORIZED`; les huit références historiques de sauvegardes restent des pistes de recherche, sans preuve de présence.
- Les domaines protégés viennent de `src/config/servers.ts`. Les originaux Stablecoin sur S2 doivent rester intacts.
- Un nom de dossier observé n'est **pas** une preuve de mapping Plesk, de chemin exact, d'absence de dépendances ou de permission de nettoyage.
- En cas d'échec SSH ou d'inventaire tronqué, réponse `UNVERIFIED` et blocage conservateur.

**Contrat de sécurité :** `deletionAllowed=false`, `quarantineAllowed=false`, `writesPerformed=false`. Les opérations de purge, de vidage, de nettoyage des sauvegardes, caches, journaux et `node_modules` ne sont pas activées par ces commandes. Toute évolution destructive nécessitera un périmètre exact, des preuves fraîches, sauvegarde et restauration testées, consentement explicite sur la cible, session/claim/locks gouvernés, quarantaine/rollback et contrôles de santé après intervention.

**Traçabilité :** source historique `Migration/02_PLAN_MIGRATION_ET_SECURITE.md`, piste Loop Engineering `memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md`, tests `tests/cleanupPlan.test.ts`. La PR de ce lot constitue la preuve GitHub et le point de reprise ; aucun déploiement S1/S2 n'est implicite.


## `cleanup_cache_preflight_funds_s2` — audit borné d'un cache historique Funds (10 novembre 2026)

Nouvelle commande **strictement read-only** et sans paramètre. Réutilise le connecteur SSH existant pour vérifier le répertoire fixe du frontend historique Funds sous S2, les liens symboliques et chemins canoniques, la présence des marqueurs de build et l'espace disque alloué au seul cache `.next/cache` (`du -sB1`, pas la taille apparente). Cette mesure n'est pas une preuve du nombre d'octets effectivement récupérables.

- Ne lit aucun contenu applicatif, aucun fichier de secret, aucune clé et aucun `.env`.
- Retourne `UNVERIFIED` en cas d'échec/observation tronquée, `BLOCKED_SYMLINK_OR_ESCAPE` si chemin non canonique, `CACHE_ABSENT` si rien à examiner, sinon `INSPECTED_NEEDS_RUNTIME_PROOF`.
- Toutes les réponses comprennent `deletionAllowed=false`, `quarantineAllowed=false`, `writesPerformed=false`. La commande ne prétend pas vérifier les dépendances Plesk/Passenger ni les processus ouvrant des fichiers.
- Aucune suppression ou mise en quarantaine autorisée. Les prérequis de l'issue #3 restent obligatoires avant tout futur outil destructeur.
- Les données observées lors de l'appel sont des preuves privées d'exploitation ; ne pas reproduire l'inventaire brut dans GitHub.


## 2026-11-10 — Exécuteur S2 à autorisation précise (candidat)

Deux outils : `cleanup_s2_leaf_preflight` (lecture seule, cinq chemins enfants) et `cleanup_s2_leaf_quarantine` (écriture gouvernée, déplacement réversible). Le domaine parent `wealthtechinnovations.ci`, les domaines protégés BRVM, Stablecoin, AfricaFunds et les sauvegardes Plesk sont exclus des cibles de mutation.

Preflight : identité root SSH, absence de liens symboliques, chemin réel fixe, absence du domaine dans Plesk, absence de référence dans les configurations Apache/nginx, absence de fichiers ouverts selon `lsof`, empreinte et taille du contenu. Échec ou données incomplètes = refus.

Admission : `ENABLE_WRITE_TOOLS`, `MCP_S2_CLEANUP_EXECUTION_ENABLED=true` (désactivé par défaut), `MCP_S2_CLEANUP_APPROVED_FINGERPRINTS` défini **côté serveur** après contrôle de la cible ; confirmation littérale du domaine ; session OAuth propriétaire *S2_LEGACY_CLEANUP* active et rattachée au transport, contexte acquitté et aligné, lock actif `resource:s2-cleanup/<key>` ; nouvelle vérification SSH sous `flock` immédiatement avant mutation.

Action : `mv -T` vers la quarantaine privée sur le même filesystem ; reçu `state=QUARANTINED`, absence du chemin source vérifiée, opération sans `rm -rf` et sans restart. **La quarantaine ne libère pas d'espace disque**, ne détruit aucune sauvegarde, et exige une restauration possible. Une purge définitive nécessitera un autre lot validé.

Statut : branche/PR candidate ; ne pas déclarer l'outil déployé tant que revue/CI/merge exact SHA et runtime ne sont pas attestés. Aucun privilège attribué par le code seul.


### Revue PR #396 — durcissements de sécurité (10/11/2026)

Les cinq constats ont motivé des corrections candidates : détection des erreurs d'inspection de configuration, Bootstrap Receipt et tâche claimée obligatoires, SHA-256 de contenu, répertoire privé root `0700` et inscription permanente dans SUIVI/CHANGELOG/DECISIONS_LOG. La CI et la revue doivent être renouvelées sur le SHA corrigé. Ne pas assimiler la réussite CI à l'activation serveur. Le mode d'exécution demeure OFF par défaut.


### S2 quarantine — deuxième revue : maintien de lease et état frais (10/11/2026)

L'opération refuse tout Live State STALE, même avec un ancien alignement. Le verrou doit conserver au moins 140 secondes à chaque admission avant SSH ; la session, le Bootstrap Receipt et la tâche sont réobservés après le préflight ; S2 vérifie l'heure et la date limite du lock avant tout déplacement. L'absence d'un domaine dans Plesk n'est acceptée qu'avec code retour grep=1 via here-string sans SIGPIPE. Tout échec de ces contrôles bloque. Aucune suppression exécutée.
