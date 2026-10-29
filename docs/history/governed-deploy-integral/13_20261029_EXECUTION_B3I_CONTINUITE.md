# 29 octobre 2026 — B3i, revue, pairing OAuth/E3, corrections de sécurité et découverte live

**Autorité documentaire** : issue #349. **PR de code** : #355. **Branche de code externe à ce dossier** : `mcp/universal-github-plesk-server-capabilities-20261028`. **Continuity ID fille déjà enregistrée** : `GD-U-02D-CONT-20261029-B3I-ROOT-01`. **Branche de cette archive** : `docs/governed-deploy-integral-history-20261029` (PR #356). Ces deux branches ne doivent jamais être confondues.

Les événements restent ordonnés selon leur place dans les commentaires originaux de #349, avec précision UTC lorsqu'elle figure dans la source. Chaque commentaire conserve son URL primaire et son statut historique. Toutes les preuves de CI sont **rapportées par le commentaire**, non requalifiées en permissions de production.

## #6504903629 — mandat et refus de déclarer une revue tierce fictive
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6504903629
Le mandat de revue indépendante, l'admission E3/OAuth et l'écriture Plesk apparaissent comme objectifs. Le commentaire distingue la demande du propriétaire de ce qui a effectivement été accordé par les autorités et règles de sécurité. Aucun avis `APPROVED` ne peut être inventé.

## #6505015571 — identification du relecteur de la PR #355
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6505015571
Le suivi consigne une demande de revue sur GitHub. Une demande de revue ne vaut pas revue soumise, et une revue COMMENTED n'est pas une APPROVED.

## #6506065178 — sept constats de sécurité réparés avec tests
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506065178
**Baseline historique déclarée** : PR #355 OPEN/READY_FOR_REVIEW, HEAD `7b427c3c25a57289d94d3a8a64aa9e30a9573146`, 126 commits ahead / 0 behind et 49 fichiers changés. Ne pas promouvoir ce HEAD ancien au statut actuel.

Les sept constats sont individuellement référencés dans le commentaire :
1. Résolution `package.json` entre code source et code compilé pour le probe live Plesk — thread `discussion_r4397495626`.
2. Preuve d'accès GitHub App liée au dépôt exact, non seulement à une installation — thread `discussion_r4397495634`.
3. Ticket HMAC E3 réel Base64URL (43 caractères), et non un motif hexadécimal inventé — thread `discussion_r4397571618`.
4. Relecture de l'expiration du lock avant consommation atomique — thread `discussion_r4397648347`.
5. Échantillonnage de l'horloge fiable **après** lecture asynchrone des preuves CI — thread `discussion_r4397789675`.
6. Refus d'un `CHANGES_REQUESTED` toujours actif malgré une autre APPROVED — thread `discussion_r4398205930`.
7. Préflight Plesk lié au couple exact `serverId + parentDomain` — thread `discussion_r4398205936`.

Le huitième thread devenu outdated `discussion_r4397648357` est conservé pour la logique COMMENTED / APPROVED / DISMISSED. Les tests de non-régression et les CI intermédiaires se consultent dans le texte source ; aucune permission Plesk n'en découle.

## #6506328959 — continuité B3i enregistrée, raccordement partiel
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506328959
Continuity ID exact : `GD-U-02D-CONT-20261029-B3I-ROOT-01`. Commit `8248fc86679a2e4cacb4a81168513d7f349b11c5`.
Le vrai `src/server.ts` appelle le garde `inspectPleskHttpToMcpAdmissionFromRuntime`, mais aucune association de transport OAuth MCP authentifiée au cookie web n'est encore prouvée : `trustedMcpTransport:null`, `runtimeWriteAuthorized:false`, consommation E3 refusée. Le consentement fonctionnel du propriétaire est conservé **sans être rebaptisé approbation de sécurité indépendante**.

## #6506342426 — attestation CI sur ce HEAD partiel
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506342426
SHA `8248fc86679a2e4cacb4a81168513d7f349b11c5`, MCP CI #40940191848, run https://github.com/Patricked-code/MCP/actions/runs/40940191848, completed/SUCCESS 24/24 étapes selon source. **Verdict historique** : intégration partielle, aucune écriture Plesk.

## #6506921320 — pairing navigateur E3 ↔ transport OAuth MCP réellement développé
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506921320

Raccordements techniques déclarés dans la PR #355 :
- `src/provisioning/pleskWebTransportPairing.ts` : preuve aléatoire à usage unique, TTL maximal 180s, capacité 64, liaison à session/transport/principal/serveur/domaine/label/racine exacts ; rejet du rejeu, de la cible étrangère, de l'usurpation et des pièces expirées.
- Matériel OAuth transitoire chiffré en mémoire via AES-256-GCM ; aucun jeton persistant dans Git, les logs ou le registre documentaire.
- `pleskMcpPairingTool.ts` : outil d'émission de preuve à partir du contexte MCP authentifié, enregistré dans la classification opérationnelle existante, non un arbitre de permissions supplémentaire.
- `pleskWebRoutes.ts` : preuve optionnelle `mcp_pair_proof`; mode `requireMcpPairing:true` en production, avec cookie web, ticket E3, Same-Origin et confirmation du FQDN exact.
- `src/server.ts` : intégration au serveur réel, sans serveur parallèle ; `runtimeWriteAuthorized:false` et `consumeGovernedConsent:async()=>false` encore conservés.
- Tests unitaires et d'intégration Express vérifiant refus sans preuve, bonne association, non-rejeu et **zéro appel SSH**. CI #40943442169 annoncée SUCCESS 24/24.

**Distinction capitale** : pairing authentifié développé et testé ≠ consommation E3 B3d branchée au chemin réel d'écriture ≠ permission Plesk ≠ déploiement.

## #6506944034 — contre-revue technique et CI au HEAD final de pairing
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506944034
HEAD historique `917dd5cd2148a23f87d56f63d99da253534aefef`, 138 commits, 55 fichiers, CI #40944377862 completed/SUCCESS, 24/24 étapes selon commentaire ; doc de contre-revue `docs/governance/gd-u-02d-b3i-authenticated-mcp-web-pairing-20261029.json`.
Statut déclaré : `B3I_PAIRING_INTEGRATED_CI_GREEN / PLESK_WRITE_HOLD`. **Aucune review indépendante APPROVED au HEAD**, ni droit d'admin Plesk attesté, ni merge, ni S1 write, ni déploiement.

## #6507968135 — réconciliation live read-only du 29 octobre à 20:47 UTC
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6507968135
Main GitHub, S1 checkout, origin et runtime réconciliés à `48a529889517aa1c11974802d23acc3f35e0f187`, Docker healthy, StateVersion 1150, taskStoreRevision 244. **Dérive documentaire** : SHAs déclarés `ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4` différents du code réellement observé. La PR #355 HEAD historique `917dd5cd...` n'est pas fusionnée. Les CI #40944377862 et #40944368499 passent sur la branche, mais aucun `APPROVED` ou consentement Plesk n'est déduit de cela.

## #6508142985 — premier checkpoint B3i-b, correction de contrôle CI/PR
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6508142985
Le moteur `observeGithubReviewAndCi.ts` vérifiait un SHA de workflow sans recouper son numéro de PR. Deux tests nouveaux échouent au RED `a9e94a597e3e4ff7dcaada97ddd0cf41ceec5de9`, CI #40952808253 (échec attendu) ; le GREEN `583791dfafa1f2adc5be81060f175916336dcbbe` exige `pull_requests[].number === input.pullRequestNumber`, CI #40953063430 completed/SUCCESS. Les éléments du registre précédent conservent leur vérité historique ; ce correctif produit de nouvelles preuves, non une réécriture rétroactive.

## #6508271503 — deuxième checkpoint B3i-b, sécurité de l'horloge Plesk
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6508271503
Thread `discussion_r4416982377`, race entre `req.now` fourni par la demande et l'instant réel de mutation. RED `b03dc60030b2f14dc310d1c9ff5579367aa107a6`, CI #40953571139, **3 échecs ciblés attendus** et 1226 tests positifs. GREEN `01b8ef55b328df1d111f81bf3b1ee02a8cb012ba`, CI #40954012862 completed/SUCCESS 24 étapes, **1229/1229 tests read-only safety**. Horloge serveur échantillonnée après les opérations asynchrones, relecture autorité/lock après préflight SSH et avant le guarded write.
**Limite restante explicitée** : simple relecture ≠ transaction atomique ; une concurrence entre dernière lecture et mutation doit être couverte lors de l'intégration réelle. `PLESK_WRITE_HOLD`, `NO_MERGE`, `NO_DEPLOY` restent actifs au checkpoint.

## #6508299718 — découverte S1/S2 read-only et périmètre Regulatory
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6508299718
- `list_domains_s1` : arborescence `/var/www/vhosts/wealthtechinnovations.com/` observée, aucun droit d'admin inféré.
- `list_domains_s2` : arborescence `/var/www/vhosts/chainsolutions.fr/` observée, aucune extrapolation de permission S1→S2.
- `get_project_context` : serveur et cibles observés read-only, sans droit de provisionnement.
- Diagnostic credential MCP pour PR #355 : probes GitHub HTTP 200, sans permission Plesk.
- Réconciliation `2026-10-29T21:04:32.783Z` : main/S1/runtime toujours `48a529889517aa1c11974802d23acc3f35e0f187`, healthy ; `DOCUMENTATION_DRIFT` subsiste.
- #355 HEAD `01b8ef55b328df1d111f81bf3b1ee02a8cb012ba` et CI #40954012862 SUCCESS, aucun merge ni mutation.
- Regulatory demande **un sous-chemin** `/regulatory`, non une création de sous-domaine ; la capacité de provisionnement de sous-domaine Plesk ne prouve pas la faisabilité du sous-chemin.

## Frontière et prochain jalon, tels qu'observés
À ce stade : `READ_ONLY_DISCOVERY_OBSERVED / PLESK_PERMISSION_UNKNOWN / PLESK_WRITE_HOLD / NO_CLAIM / NO_DEPLOY`. La suite requiert consommation E3 atomique, Task/Session/Lock vérifiés à l'instant de mutation, CI/revue, permission Plesk réelle, isolation Regulatory et rollback, puis fusion/déploiement gouvernés. Ne jamais laisser l'archive documentaire provoquer ces actions.
