# DECISIONS_LOG.md

## Role
Journal des decisions structurantes du MCP.

## 2026-08-29 — Unified Operational Work State sans autorité parallèle

Contexte : Live State, Current-State Inventory, Operational Memory, Governed Task Queue et le collecteur GitHub savent déjà observer leurs domaines, mais aucune projection unique ne relie encore capability, tâche, session, owner, dépendances, locks, GitHub, runtime et opération proposée pour répondre de manière bornée à « que peut-on faire maintenant ? ».

Décision d'architecture : ajouter `CapabilityReality`, `TaskReality` et `GovernanceDecision` comme projections dérivées dans le processus existant. Aucun store, service persistant ou moteur current-state concurrent n'est créé. GitHub reste autorité des PR/checks/reviews, Live State de l'alignement exact-SHA, Operational Memory des sessions/checkpoints/locks/receipts, Governed Task Queue des tâches et registrations MCP des capabilities.

Décision Observer Before Actor : une opération dépendante de GitHub ne peut ignorer l'état GitHub déjà observé. La branche de travail est résolue par priorité `session.workBranch`, puis `currentTask.workBranch`, puis branche d'entrée explicite. Les reason codes GitHub sont propagés dans `GovernanceDecision` uniquement lorsque l'opération exige cette preuve; ils ne doivent pas bloquer une opération indépendante de GitHub.

Décision de réalité de tâche : l'état déclaré ne remplace jamais la preuve observée. `TaskReality` signale les états en avance, en retard, incomplets ou contradictoires; `VERIFIED` exige les preuves de livraison nécessaires et ne doit pas être déduit d'un simple commit ou merge.

Décision de compatibilité : le WRITE gate reste `shadow`. Les décisions nouvelles sont observables et testables mais ne remplacent pas les contrats WRITE historiques. Tout passage à `enforce` reste hors périmètre et exige un GO, une décision et une PR distincts. OIDC, Autodeploy, 2FA, `ENABLE_WRITE_TOOLS` et `allow_write` restent invariants.

Preuve fonctionnelle : le head `34d51247c021524f4c3e03824c938529bc831743` a passé la CI `33236805556`, job `99059095387`, avec typecheck, build, docs, gouvernance, secrets, read-only safety et diff tous verts. Le test d'intégration Observer Before Actor a exposé successivement deux gaps réels — branche de tâche non propagée puis reason code GitHub non propagé — corrigés par deux changements minimaux sans refonte.

Gate de livraison : documenter ce chantier sur la même branche, obtenir CI du head documentaire exact, ouvrir une Draft PR, exiger revue et checks exact-head, fusionner uniquement sous les protections de `main`, puis attester Autodeploy/runtime/Live State avant toute clôture. La migration Node GitHub Actions et l'enforcement restent des chantiers séparés.

## 2026-08-28 — Clôture fonctionnelle de la correction Mandatory Bootstrap

Décision de livraison : accepter la PR #52 après validation `234/234`, CI exacte et revue indépendante sans Critical/Important/Minor, puis fusionner uniquement le head `33a3e424a5fe271cf82c1ee6db8c94785289e3ca` par `expected_head_sha`.

Décision d'attestation : retenir `fff44ff2db386942730a67f3884980c7824cae7f` comme baseline fonctionnelle seulement après succès de la CI main, de l'Autodeploy et des preuves GitHub/S1/OCI/runtime. Le SHA déclaré reste la baseline fonctionnelle lorsqu'une PR descendante modifie uniquement Markdown, `PRODUCTION_STATE.json` et l'inventaire documentaire autorisé.

Décision de revue : résoudre les trois threads PR #49 uniquement après publication des preuves de correction fusionnées et déployées. Les trois threads sont désormais résolus.

Décision de périmètre : la réconciliation finale reste strictement documentaire sur la branche gouvernée existante. Le WRITE gate reste `shadow`; aucun `enforce`, changement OIDC/Autodeploy/2FA ou nouveau moteur persistant n'est autorisé.

## 2026-08-28 — Cycle de vie de tâche, preuve Git et surface de queue

Contexte : trois threads tardifs de la PR #49 montrent qu'une tâche pouvait rester détenue par une session définitivement terminale, que `currentTask` pouvait provenir d'une autre session ou être terminale, et que la preuve current-state associait le contenu du working tree au `evidenceHead`. La cartographie classait aussi les deux lectures de queue comme écritures et les mutations n'écartaient pas les sessions terminales.

Décision de cycle de vie : la maintenance réattribue les tâches non terminales d'une session `CLOSED` immédiatement et d'une session `EXPIRED` seulement après le dépassement strict de `resumeGraceSeconds`. La transition conserve les corrélations branche/PR/SHA/runtime, incrémente les révisions et journalise `task.transitioned`. Elle est idempotente.

Décision de contexte : `currentTask` est une projection de la seule Governed Session liée au transport appelant. Une session non `OPEN`, `ACTIVE` ou `PAUSED`, ou une tâche `DONE`, `CANCELLED` ou `SUPERSEDED`, ne produit aucun `currentTask`.

Décision de preuve : les fichiers attribués au `evidenceHead` sont énumérés par `git ls-tree` et lus par `git cat-file`. Les plafonds, refus de symlink et limitations public-safe existants sont conservés ; les modifications locales ne changent plus la preuve du commit.

Décision de surface : `mcp_get_work_queue` et `mcp_get_governed_task` sont enregistrés comme `read`; les trois mutations restent `operational-write`. Toute mutation exige en outre une session non terminale avec receipt valide.

Gate : aucune fusion avant validation complète, Draft PR, CI et revue du head exact. Aucun `enforce`, changement OIDC/Autodeploy, écriture directe S1 ou modification 2FA n'est autorisé par cette décision.

## 2026-08-28 — Fermeture des gaps de revue PR #52

Décision d'orphelin : la queue ne dépend plus de l'existence durable d'un enregistrement terminal. Elle conserve l'ownership uniquement pour les sessions actives ou expirées encore reprenables ; tout owner absent, fermé ou définitivement expiré est réattribué au prochain cycle de maintenance, normalement dans les 60 secondes. Les blockers de l'ancien owner sont effacés lors du retour `READY`, car ils ne sont pas distinguables de limitations propres à la session disparue ; les corrélations branche/PR/SHA/runtime restent conservées.

Décision de concurrence : ajouter un coordinateur FIFO en mémoire, partagé par les services existants, autour de l'ouverture avec rétention, la reprise, la fermeture, l'expiration, la réattribution et les trois mutations de tâche. Ce verrou ferme le TOCTOU sans fusionner les stores ni créer une autorité persistante.

Décision read-only : le seed est persisté avant que le serveur n'expose ses routes. Les deux outils de lecture de queue et le Current-State Inventory lisent ensuite seulement le store ; leur classification `read` correspond donc au comportement effectif.

Décision de preuve : `GIT_NO_REPLACE_OBJECTS=1` s'applique à toutes les lectures Git et `generatedAt` est dérivé du SHA capturé, non d'une seconde résolution de `HEAD`.

Décision d'audit : conserver le modèle best-effort déjà appliqué aux mutations de tâche. Une indisponibilité du journal ne bloque jamais la persistance et le retry idempotent ne fabrique pas un événement rétroactif. Un outbox transactionnel modifierait le schéma et l'autorité de persistance ; il reste hors périmètre tant qu'une exigence exactly-once distincte n'est pas approuvée.

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

## 2026-08-13 — Première preuve automatique acceptée, seconde preuve canonique requise

Contexte : la PR #42 a activé `pushEnabled=true` et a fusionné le SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` après CI verte. Le push a produit la CI `31658327373` et le déploiement `31658327435`; l’étape exact-SHA a réussi et S1/OCI/runtime ont convergé vers ce SHA.

Décision : accepter ce run comme première preuve réelle du chemin automatique et résoudre le P2 de la PR #41, la correction étant fusionnée, testée et déployée.

Décision complémentaire : conserver le chantier ouvert jusqu’à la fusion d’une seconde PR documentaire utile et à l’attestation indépendante du second push automatique. Aucun succès final ni changement d’automatisation n’est déclaré avant cette seconde preuve.

## 2026-08-13 — Seconde preuve automatique acceptée et passage au plan Governed Session V1

Contexte : la PR #43 a fusionné le SHA `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`. Son push a produit la CI `31659053828` et le déploiement `31659053836`, job `94319801309`, tous réussis. La lecture fraîche du bridge confirme GitHub/S1/origin/OCI/runtime égaux, S1 propre et read-only, Docker running/healthy.

Décision : clôturer `TASK-20260809-003` sur ces deux preuves automatiques exact-SHA et verrouiller `eb61b97e…` comme baseline immuable de `TASK-20260813-004`.

Décision complémentaire : corriger en premier, par TDD additif, le détecteur documentaire qui autorise encore un SHA déclaré ancien avec `documentation=ALIGNED`. L'extension Governed Session conserve tous les contrats existants, sépare `governedSessionId` de `MCP-Session-Id` et démarre le nouveau WRITE gate en `shadow` non bloquant. Toute nécessité de remplacer une mécanique validée impose STOP. Aucune action 2FA n'est autorisée dans ce chantier.

## 2026-08-13 — Governed Session Continuity V1 prête pour review sans nouvelle autorité

Contexte : les cycles RED/GREEN de la branche unique sont terminés au head fonctionnel `38e3ced7ff61119b1e8fd8d0228bf032972ecca9`. La CI `31675193991` et la régression locale fraîche sont vertes ; `main` reste sur la baseline `eb61b97e…`.

Décision : conserver Live State V1 comme source opérationnelle existante et lui composer, sans le remplacer, la session durable, les locks, le contexte GitHub borné et la vue dashboard. Le transport MCP reste une liaison éphémère ; seul `governedSessionId` est l'identité de continuité.

Décision complémentaire : partager un journal opérationnel unique dans le processus, démarrer une seule maintenance à intervalle 60 secondes et limiter ses événements aux compteurs d'expiration. Le dashboard utilise `getCurrent` cache/store-only et ne force aucune collecte GitHub/SSH.

Limites : le WRITE gate demeure `shadow` non bloquant ; aucune mutation existante n’est retirée ou durcie en V1. Aucun merge, déploiement ou état runtime de cette branche n’est déclaré avant preuve exacte ; aucune action 2FA n’est permise.

## 2026-08-13 — Résolution additive de la première revue de la PR #44

Contexte : la première revue a identifié des liaisons transport survivant à une reprise, un shadow qui attendait l’observation, un journal insuffisamment câblé, une fenêtre de divergence entre les deux stores, une lecture erronée des résumés de rulesets, un feature-off incohérent et deux défauts mineurs de dashboard/maintenance.

Décision : corriger chaque point par test RED puis GREEN sur la branche unique. Le transport précédent est révoqué, le shadow devient best-effort hors chemin critique, l’audit reçoit uniquement des objets de domaine typés/sanitizés, et le collecteur GitHub charge le détail d’un seul ruleset actif.

Décision de compatibilité : ne pas fusionner les stores sessions et locks, car cela remplacerait une mécanique approuvée. Le store de locks reste l’autorité des locks actifs ; `session.lockIds` demeure une projection dénormalisée réparée par la maintenance existante après toute panne partielle.

Limites : la PR reste draft jusqu’à CI et seconde revue du head exact. `main`, S1/runtime, Autodeploy V1, GitHub OIDC, `ENABLE_WRITE_TOOLS`, `allow_write` et l’exclusion 2FA restent inchangés.

## 2026-08-13 — Résolution additive de la seconde revue de la PR #44

Contexte : la seconde revue a confirmé une compensation mémoire incorrecte lors d’une reprise sur le même transport, une agrégation historique des reviews GitHub, une course de preuve lors d’un unbind et un libellé dashboard ambigu. La confirmation différentielle a ajouté deux cas : `COMMENTED` effaçait le verdict décisif antérieur et la redaction par motifs laissait des PAT/URI/JWT/PEM dans des champs libres.

Décision : différer le rebinding jusqu’au succès durable, agréger uniquement le dernier verdict décisif par reviewer avec `DISMISSED` explicite, conserver un instantané éphémère sanitizé de chaque binding retiré et nommer le compteur global. Les champs libres du journal deviennent systématiquement `[REDACTED]`; les autres valeurs conservent une défense PAT/JWT/PEM/Bearer/URI.

Décision de compatibilité : conserver toutes les APIs/outils existants, la table de bindings dans le même service et le journal unique déjà validé. Aucun store, service, gate ou collecteur parallèle n’est introduit.

Limites : la PR reste draft jusqu’à confirmation différentielle et CI du head exact. Aucun merge, Autodeploy, S1/runtime ou 2FA n’est exécuté ; `ENABLE_WRITE_TOOLS`, `allow_write`, Live State V1 et OIDC restent invariants.

Confirmation : l’ultime revue différentielle ne relève aucun finding critique ou important et juge le range fonctionnel `fd0b1d8…de8a6df` mergeable. Cela ne vaut pas autorisation de fusion ; la CI du head documentaire exact reste exigée.

Preuve de clôture de review : le head consolidé `4eee32b…` a passé la régression locale `187/187` et la CI exacte `31681641604`. La PR #44 reste volontairement draft. La prochaine mutation autorisée est uniquement son passage ready/merge après GO humain, reverrouillage du SHA et CI verte de la tête proposée.

## 2026-08-15 — Rétention bornée et clôture documentaire post-merge

Contexte : trois findings publiés après la fusion de la PR #44 rendent à terme l'ouverture de sessions et l'acquisition de locks indisponibles, et la fermeture d'une session peut conserver un lock actif jusqu'à son TTL.

Décision : conserver toutes les sessions actives, toutes les sessions terminales portant encore des `lockIds` et tous les locks actifs. À la borne, retirer uniquement les plus anciens enregistrements terminaux/inactifs selon un ordre horodatage puis identifiant. Si le nombre d'entrées supprimables est insuffisant, échouer explicitement avec `SESSION_STORE_CAPACITY_EXCEEDED` ou `LOCK_STORE_CAPACITY_EXCEEDED`.

Décision de cycle de vie : libérer durablement les locks dans leur store avant de fermer la session, puis vider `session.lockIds` dans l'écriture atomique de fermeture. Si la seconde étape échoue, aucun lock actif ne subsiste et la réconciliation existante répare la projection ; les stores restent séparés.

Décision documentaire : l'égalité stricte entre le SHA déclaré dans un fichier et le SHA du commit contenant ce même fichier est auto-référente et inexécutable. Un SHA déclaré différent n'est accepté que s'il est un ancêtre Git et si tous les chemins descendants appartiennent à l'allowlist documentaire. Toute modification de code, tout SHA inconnu et tout signal `requires_revalidation` restent en drift.

Limites : cette décision n'élargit aucune autorité, ne modifie aucun outil historique, ne remplace aucun store et ne touche ni Autodeploy/OIDC, ni `ENABLE_WRITE_TOOLS`, `allow_write`, le gate `shadow` ou la 2FA.

## 2026-08-15 — Clôture de TASK-20260813-004

Décision : accepter la correction Operational Memory uniquement après double CI du head exact, fusion gardée par `expected_head_sha`, Autodeploy exact-SHA et attestation indépendante GitHub/S1/OCI/runtime.

Décision : résoudre les findings tardifs de la PR #44 seulement après déploiement attesté du merge `bac8779320c8b9529d2a5215dbb1b1f31f828987`. Les trois threads P1/P1/P2 ont suivi cette séquence.

Décision : la clôture canonique est portée par une PR séparée ne modifiant que huit documents. Elle déclare le merge fonctionnel comme ancêtre ; Live State n'accepte le descendant que si Git prouve une portée strictement documentaire. Cette exception ne couvre jamais un changement de code, un SHA inconnu ou un état nécessitant revalidation.

Résultat : `TASK-20260813-004` est terminée, sans modification d'Autodeploy/OIDC, des outils historiques, de `ENABLE_WRITE_TOOLS`, `allow_write`, du gate `shadow` ou de la 2FA.

## 2026-08-15 — Gate de revue tardive PR #47

Décision : une session `EXPIRED` n'est définitivement supprimable que lorsque la condition de refus de `resumeSession` est vraie, soit un dépassement strict de `resumeGraceSeconds` ou un horodatage inexploitable.

Décision : à capacité, un lock `ACTIVE` dont `expiresAt` est écoulé est logiquement inactif. Sa suppression en rétention produit une preuve `lock.expired` et retire sa projection de session dans la mise à jour inter-store ; la réconciliation existante reste le filet après panne partielle.

Décision : la dérogation docs-only au mismatch S1 exige que le SHA S1 déclaré soit identique au SHA GitHub déclaré ancêtre. Cette contrainte évite de masquer deux déclarations canoniques divergentes.

Gate : aucune fusion de la PR #47 avant mise à jour des journaux canoniques, CI exacte du nouveau head, revue sans thread non résolu, Autodeploy post-merge et réconciliation documentaire finale.

## 2026-08-22 — Clôture de la correction tardive Operational Memory

Décision : une session `EXPIRED` reste conservée exactement pendant la fenêtre où `resumeSession` autorise encore sa reprise ; sa suppression n'est permise qu'après dépassement strict de la grâce ou horodatage inexploitable.

Décision : un lock `ACTIVE` dont le TTL est écoulé est logiquement inactif à capacité. Sa rétention produit `lock.expired`, nettoie les projections de session et conserve la réconciliation comme filet après panne partielle.

Décision : la dérogation descendant docs-only couvre le mismatch S1 uniquement si le SHA S1 déclaré est égal au SHA GitHub déclaré ancêtre. Toute divergence, tout code descendant ou `requires_revalidation` reste bloquant.

Gate satisfait : PR #47 fusionnée au SHA `3fb5a1bce040113f9d2f2f16e508a76a10ffe7dc`, CI/Autodeploy exact-SHA réussis, S1/runtime réattestés, trois threads PR #45 résolus. La PR #48 est limitée aux huit documents canoniques et clôt `TASK-20260813-004` sans élargissement d'autorité.

## 2026-08-22 — Bootstrap obligatoire et orchestration sans moteur parallèle

Décision : compléter Live State, Governed Context et Operational Memory au lieu de créer une nouvelle autorité. Le catalogue provient des registrations réelles ; l'architecture, les routes, documents, audits et politiques proviennent du clone Git suivi au SHA observé.

Décision de queue : une nouvelle instruction est projetée sous forme bornée, classifiée de manière déterministe puis ajoutée après le backlog existant. `claimNextTask` choisit la première tâche exécutable par priorité puis séquence ; dépendances, scopes, ownership et transitions restent fail-closed sous révisions optimistes.

Décision de bootstrap : l'acquittement de Live State crée un receipt sanitizé lié à la session, au stateVersion et aux digests. Les surfaces MCP et le dashboard réutilisent cette même projection. Aucun prompt brut, token, transport ou secret de reprise n'est journalisé.

Décision de compatibilité : le gate reste `shadow`. Les nouveaux verdicts observent receipt, tâche et baseline d'audit, mais le handler historique reste exécuté exactement une fois. L'enforcement bloquant exigera une décision et une PR distinctes.

Décision anti-staleness : `.mcp/branch-governance.json` ne porte plus aucun numéro de PR, branche de travail ou prochaine branche dynamique. GitHub, Operational Memory, Governed Task Queue et Live State restent les autorités ; le collecteur current-state signale toute réintroduction d'une valeur dynamique persistée.

Décision de clôture : la tâche seed `TASK-20260822-001` reste `READY` jusqu'à la preuve CI du head exact, le merge, l'Autodeploy exact-SHA, l'attestation GitHub/S1/runtime et la réconciliation canonique. Le déploiement du code ne doit pas fabriquer rétrospectivement un état `DONE` non attesté.

## 2026-08-22 — Clôture en deux preuves et reprise obligatoire de la queue runtime

Décision : accepter la PR #49 uniquement après `222/222`, CI exacte `32565936838`, absence de thread actionnable et fusion gardée par `expected_head_sha`. Le merge fonctionnel retenu est `c944fd9e7c05aad503f9e1d5d21e0ead25747886`.

Décision : considérer l'Autodeploy attesté uniquement après un nouveau Live State prouvant GitHub, S1, `origin/main` et runtime égaux, arbre S1 propre et conteneur healthy. Cette preuve est `stateVersion=33` ; la documentation est ensuite réconciliée dans une branche séparée strictement documentaire.

Décision de queue : ne pas contourner la state machine et ne pas modifier directement le store. Le connecteur de cette conversation ayant figé son catalogue avant le déploiement, `TASK-20260822-001` reste volontairement `READY`. La prochaine connexion doit charger les nouveaux outils, reprendre cette tâche existante et appliquer les transitions gouvernées jusqu'à `DONE`, sans créer de doublon.
