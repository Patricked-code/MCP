# DECISIONS_LOG.md

## Role
Journal des decisions structurantes du MCP.

## 2026-07-09 - Documentation racine et logique parent/enfant
Contexte : le MCP doit etre repris par ChatGPT, Claude Code, Codex, le MCP et un humain sans perte de contexte.
Decision : creer les fichiers Markdown racine manquants et utiliser docs/projects/<projet>/ pour la memoire enfant de chaque projet.
Raison : eviter le codage a l'aveugle, les regressions, les oublis et la confusion entre serveur, depot, branche, domaine et agent.
Limite : aucune autorisation de secret, suppression, deploiement ou modification applicative sans audit separe.

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

Contexte : l'audit Phase 1 a confirmé `main@f92f621`, 7 PR ouvertes, issues #2/#3 ouvertes, absence de workflow GitHub Actions et un faux positif read-only autour de `cp`.

Décision : ouvrir une branche unique `mcp/hardening-readonly-ci-state-20260711` depuis `main@f92f621` pour corriger les garde-fous read-only, ajouter la CI minimale et actualiser l'état documentaire public-safe avant toute reprise de PR #10.

Décision complémentaire : le commit direct `f92f621` est documenté comme exception historique à tracer, car il inclut OAuth resource aliases et durable accounts. Les futurs changements doivent suivre branche `mcp/*`, PR draft, validations et revue humaine.

Limites : ne pas merger ou rebaser PR #10 dans cette branche ; ne pas fermer #2/#3 ; ne pas supprimer de branche ; ne pas déclencher restart, déploiement, migration ou cleanup ; ne pas publier d'inventaire privé S1/S2.

## 2026-07-12 -- Phase 4 correction contrôlée de la PR #11

- DÉCIDÉ : conserver le correctif read-only et la CI dans la PR #11, avec les renforcements issus de la revue Phase 3.
- DÉCIDÉ : retirer `MCP_MASTER_REFERENCE.md` sans remplacement ; `SOURCE_OF_TRUTH.md`, `SUIVI.md`, `PRODUCTION_STATE.json` et `DECISIONS_LOG.md` restent les sources canoniques existantes.
- VÉRIFIÉ : le SHA GitHub complet est `f92f621fa495d5728df5fb5befcc3265ff3a1302` ; S1 a directement restitué uniquement `f92f621`.
- PARTIELLEMENT VÉRIFIÉ : dépôt Git suivi S1 propre ; fichiers ignorés non audités.
- NON VÉRIFIÉ : commit embarqué dans l'image Docker active.
- PLANIFIÉ HORS PR #11 : migration Node et modernisation des GitHub Actions dans des PR séparées.
- Prochaine action unique : nouvelle revue complète de la PR #11 et de sa CI, sans fusion automatique.

## 2026-07-13 -- Synchronisation MCP GitHub vers S1

Contexte : après fusion de la PR #11, le MCP déployé ne disposait d'aucun outil autorisé pour synchroniser son propre dépôt depuis GitHub. Les outils existants permettaient seulement lecture, patch contrôlé, typecheck, build et redémarrage.

Décision : ajouter `mcp_sync_from_github_s1` comme opération séparée exigeant `allow_write=true`. L'outil vérifie la branche `main`, le remote `Patricked-code/MCP`, un état totalement propre et l'ascendance avant tout fast-forward. Les hooks Git sont désactivés pendant la synchronisation.

Interdictions : aucun reset, clean, checkout, switch, rebase, stash, push, build ou redémarrage dans l'outil de synchronisation. Les étapes de validation et de déploiement restent indépendantes.

## 2026-08-05 — Alignement serveur vers GitHub sans régression

Contexte : le runtime S1 contenait des fonctions absentes de `Patricked-code/MCP:main`.

Décision : préserver exactement le runtime dans une branche forensique, puis produire des PR indépendantes.

Ordre validé :
1. documentation et état attesté ;
2. séparation lecture / écriture ;
3. Registry V2 ;
4. inventaires ;
5. mappings ;
6. cockpit read-only ;
7. réintroduction progressive des actions.

Interdiction : ne pas fusionner directement la branche forensique dans main.

## 2026-08-05 — Diagnostic séparé des autorisations GitHub PR

Contexte : une lecture de pull request peut renvoyer `401`, `403 FORBIDDEN` ou `404` alors qu’une création antérieure avait fonctionné. Un refus d’autorisation ne doit produire aucun verdict sur l’existence, l’état ou la fusion possible d’une PR.

Décision : reconstruire depuis le `main` protégé un outil strictement read-only nommé `github_pr_authorization_diagnostic`. Il teste séparément l’utilisateur authentifié, la visibilité du dépôt, la liste des PR et une PR facultative.

Périmètre : l’outil diagnostique uniquement le credential GitHub monté dans le runtime MCP. Il ne lit ni ne répare le credential interne du connecteur GitHub natif de ChatGPT.

Sécurité : requêtes `GET` uniquement ; API HTTPS et hostname autorisé ; timeout borné ; aucun token, en-tête `Authorization`, secret ou objet d’erreur réseau retourné.

Interdictions : aucun changement automatique de permissions GitHub, aucun élargissement de rôle, aucun déploiement et aucun redémarrage de production.

## 2026-08-05 — Clôture des fondations GitHub

Contexte : la documentation, le diagnostic GitHub, la séparation READ/WRITE et GitRegistry v2 avaient été préparés dans des PR basées sur plusieurs états successifs de `main`.

Décision : reconstruire chaque fondation depuis le `main` protégé, fermer les anciennes PR sans fusion, exiger une nouvelle CI puis fusionner avec un SHA attendu.

Résultat :

- PR #18 fusionnée : documentation canonique ;
- PR #25 fusionnée : diagnostic GitHub read-only ;
- PR #26 fusionnée : séparation READ/WRITE ;
- PR #27 fusionnée : GitRegistry v2 dry-run ;
- `main` protégé et positionné sur `618f4020ac69801dd53f624e5cd188fc6d76cc24` ;
- issue #24 clôturée comme terminée.

Décision de frontière : les fondations GitHub sont terminées, mais cela ne vaut ni alignement S1, ni déploiement, ni migration du registre actif.

Prochaine action unique : reconnecter `wealthtech_ssh_bridge` et effectuer une attestation strictement read-only de Git S1, Docker, outils et endpoints.

Interdictions jusqu’au verdict : aucun pull, reset, clean, checkout, build ou restart dans le working tree actif ; aucun remplacement du registre ; aucun changement de remote ; aucun déploiement, nettoyage ou suppression.

## 2026-08-09 — Identité GitHub de déploiement S1 strictement read-only

Contexte : le checkout MCP actif sur S1 est aligné avec `main@4228119…`, mais son
remote `origin` utilise l'alias `github.com-mcp-patricked-rw` pour le fetch et le
push. Le code de `mcp_sync_from_github_s1` accepte également cet alias.

Décision : S1 doit utiliser une deploy key dédiée à `Patricked-code/MCP`, créée
avec l'écriture GitHub désactivée. Le fetch doit passer exclusivement par l'alias
`github.com-mcp-patricked-ro`. La configuration Git doit en outre déclarer
`disabled://mcp-s1-read-only` comme push URL afin qu'un push accidentel échoue
avant même toute connexion réseau.

Preuves exigées : lecture de `refs/heads/main` réussie avec la nouvelle identité,
SHA attendu retrouvé, push normal neutralisé localement, push direct `--dry-run`
refusé par GitHub avec la deploy key read-only, working tree propre et runtime
attesté après déploiement.

Ordre de rotation : installer et tester la nouvelle identité en parallèle,
fusionner/déployer le correctif, basculer le remote, vérifier, puis seulement
révoquer l'ancienne identité. Aucune clé privée ou donnée sensible n'entre dans
Git.

## 2026-08-09 — MCP Live State Engine V1 natif et read-only-first

Contexte : l'état opérationnel du MCP est aujourd'hui réparti entre GitHub, le checkout S1, Docker et plusieurs documents. Les documents peuvent devenir périmés après une fusion ou un déploiement, et un nouvel agent doit reconstruire manuellement la situation avant de savoir quoi faire.

Décision : intégrer le Live State Engine directement dans le processus Node/TypeScript `wealthtech_ssh_bridge`, sans second MCP ni microservice. La V1 observe les sources, les compare, persiste un snapshot commun et l'expose aux clients MCP.

Architecture décidée :

- stockage runtime : `/app/data/mcp-live-state.json` ;
- écriture atomique et permissions `0600` ;
- GitHub `main` lu dynamiquement, aucun SHA de production codé en dur ;
- S1 observé uniquement par commandes Git read-only compatibles avec `assertReadOnlyCommand` ;
- runtime observé via l'attestation Docker bornée existante ;
- documentation réduite à des signaux déterministes de tâche/SHA ;
- réconciliation initiale au démarrage puis au plus toutes les 60 secondes ;
- `stateVersion` évoluant uniquement lors d'un changement sémantique ;
- une source indisponible ou périmée dégrade explicitement le verdict ;
- `FULLY_ALIGNED` est interdit sans preuve que GitHub, S1 et la révision runtime sont actuels et égaux ;
- le build Docker reçoit le HEAD S1 dans `org.opencontainers.image.revision` afin de rendre l'attestation runtime vérifiable ;
- outils read-only exposés : `mcp_get_live_state` et `mcp_reconcile_live_state`.

Limites V1 : pas de PostgreSQL, Redis, GitHub App/webhook, locks de tâches, heartbeats, write gates ou concurrence optimiste généralisée. Ces mécanismes appartiennent à V1.5/V2 après validation du moteur d'observation.

Décision de non-duplication : réutiliser le volume `/app/data`, l'SSH read-only, l'attestation Docker et le chemin d'enregistrement MCP existants. Ne pas créer de système systemd parallèle de mémoire vive.

Limitation d'intégration connue : l'injection directe du résumé Live State dans `get_project_context` reste différée car le wrapper de mutation GitHub a bloqué la réécriture de `src/tools/readOnly.ts`, fichier contenant de nombreuses commandes shell historiques. Le moteur et les deux outils Live State sont néanmoins enregistrés dans le chemin read-only existant ; aucun contournement opaque de ce garde-fou n'est autorisé.

## 2026-08-12 — Blocage de bootstrap par catalogue et validation de l'état machine

Contexte : la PR #39 est fusionnée et ses workflows post-fusion sont réussis, mais S1 reste au commit `d3bcac0…`. L'outil `mcp_sync_from_github_s1` est présent dans `src/tools/selfManagement.ts` et dans la politique de registration S1, tandis que le catalogue ChatGPT courant ne le publie pas.

Décision : ne pas contourner cette rupture par `patch_mcp_code_file_s1`, shell libre, modification directe S1 ou détournement d'un hook de build. Le bootstrap reste bloqué jusqu'à exposition réelle de l'outil gouverné. Après rafraîchissement du catalogue, reprendre au préflight complet avant toute mutation.

Décision complémentaire : `docs:check` valide désormais la cohérence de `PRODUCTION_STATE.json` avec l'état canonique et refuse notamment un jalon PR #39 absent, un catalogue non qualifié, un alignement attesté malgré des SHA GitHub/S1 différents ou un runtime `FULLY_ALIGNED` sans révision OCI égale.

## 2026-08-12 — Le redémarrage gouverné doit recréer le conteneur et échouer si la santé échoue

Contexte : sur S1 propre, typecheck et build réussis, `restart_mcp_bridge_s1` a terminé avec un code 0 mais l'uptime Docker est resté à trois jours. `docker compose up -d --build` avait réutilisé l'image et conservé le conteneur. La commande masquait également un échec de santé avec `curl ... || true`.

Décision : le générateur de redémarrage ajoute `--force-recreate` et le contrôle `/health` devient fail-closed avec timeout. Un redémarrage ne peut plus être attesté sur le seul succès de construction ou sur un conteneur préexistant.

Limite : cette correction ne vaut ni exposition du catalogue ChatGPT, ni synchronisation GitHub → S1. Le garde `pushEnabled=false` reste fermé jusqu'au bootstrap exact-SHA et aux attestations complètes.

## 2026-08-13 — Activation automatique autorisée après preuve manuelle, preuve push encore requise

Contexte : le run manuel `31655087215` a exécuté l’étape de déploiement exact-SHA et attesté `8fb075dd55a3b94ed620527f11b2a77f88627188`. La passe post-workflow a confirmé l’égalité GitHub/S1/origin/OCI/runtime, la propreté S1, la santé, OAuth, MCP, Live State sans contradiction et rollback non nécessaire.

Décision : la PR #42 est autorisée à passer `.mcp/autodeploy-policy.json` à `pushEnabled=true`. Cette décision signifie bootstrap terminé, garde-fous validés et activation autorisée ; elle ne signifie pas qu’un futur déclenchement automatique est déjà prouvé.

Décision complémentaire : le thread P2 de la PR #41 est traité par un polling borné fail-closed, vérifié RED/GREEN. L’artefact CI doit être une copie exacte des sept documents actifs, jamais une régénération de snapshots historiques.

Preuve restante : le push de fusion de la PR #42 puis une seconde fusion utile doivent chacun produire un job non skipped, exact-SHA et attesté avant la clôture complète.

