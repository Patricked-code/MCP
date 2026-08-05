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
