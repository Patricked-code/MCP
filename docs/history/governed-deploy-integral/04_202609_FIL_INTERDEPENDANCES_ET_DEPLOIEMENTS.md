# 1er–29 septembre 2026 — filiation exacte de l'identité, GitRegistry, GitHub et transport de déploiement

Cette série de pièces est l'antécédent opérationnel du provisioning universel d'octobre. Les PR renvoient aux corps originaux intégraux ; chaque mesure citée conserve sa période et son niveau de preuve. Le statut GitHub CLOSED/OPEN ne prouve pas à lui seul une fusion ou un déploiement.

## 2026-09-01T00:17:52Z — PR #67 — Connection Context, premier support
Source https://github.com/Patricked-code/MCP/pull/67.
Task `TASK-20260901-001`; session `73044653-61b5-4030-912c-1b6e07f2dd41`; baseline `184107d5705248427d322922077d18f51e133c15`; HEAD candidat `33384bf03752bc16d5317658822741067b3cd729`.
Introduit un modèle `ConnectionContext` versionné dans les **sessions gouvernées existantes**, sans second store : création pour OAuth authentifié, `null` sur credentials partagés, préservation à travers attache/heartbeat/checkpoint/reprise et des anciennes sessions. La PR #67 est le support historique de ce premier lot.

## 2026-09-01T06:09:54Z — PR #68 — continuation sans seconde tâche
Source https://github.com/Patricked-code/MCP/pull/68.
La PR #67 avait été fermée à la suite d'un défaut de mutation Draft→Ready du connecteur GitHub, avant mutation ; #68 poursuit la même tâche, session et branche, sans nouvelle autorité. **Cette bifurcation explique la succession de deux PR distinctes pour une seule livraison**.

## 2026-09-01T17:59:51Z — PR #69 — preuve de déploiement A2.1
Source https://github.com/Patricked-code/MCP/pull/69.
- HEAD fonctionnel PR #68 : `81832e1b702a8dfe10cda5634d6092fb3a177142`.
- Merge/runtime `024f6ad4c047614bdfaea0e317f371b789f60136`.
- CI PR #713, 272/272 ; CI main #714/#715 ; Governed Deploy #24 : SUCCESS déclarés.
- GitHub, S1 et runtime réputés alignés sur le même SHA au checkpoint.
- Correction documentaire `DOCUMENTATION_DRIFT` séparée de la fonctionnalité.
Portée : livraison du contexte gouverné, pas une installation applicative arbitraire.

## 2026-09-07T19:58:18Z — PR #73 — GitHub Identity Resolution
Source https://github.com/Patricked-code/MCP/pull/73.
Task `TASK-20260907-001`, session `72017a9c-f31c-4cde-acac-64d8e001f168`, base `aa57b07cd3ba514df7b1ceb8cc60ab1587e15620`, HEAD candidat `9b1a572ab0362aeefa5e13f425225e1f510704b7`.
Résolution de l'identité GitHub contextuelle par preuve live `GET /user`, borne sur le dépôt/principal observé ; aucun lien global arbitraire entre identité OAuth et organisation.

## 2026-09-11T23:36:57Z — PR #75 — Repository Resolution
Source https://github.com/Patricked-code/MCP/pull/75.
Task `TASK-20260909-001`, session `98e9aee8-20c0-404f-807f-6630ffbb1a1c`, design checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`; base `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c`, candidat `dd2a9a7894f928aa5dac886c79dc269ea3838a7b`.
Produit des verdicts `RESOLVED/NONE/AMBIGUOUS/UNVERIFIED` ; GitHub `GET /repos` lié au contexte authentifié, pas de 404 transformé en preuve d'inexistence.

## 2026-09-11T23:48:13Z — PR #76 — livraison B2 attestée
Source https://github.com/Patricked-code/MCP/pull/76.
Merge fonctionnel B2 `f2c90902a627ee9209d805403e584f3123a0453a`, GitHub main/S1/origin/runtime alignés à Live State 163, S1 clean, runtime healthy. CI main #811 et Governed Deploy associé mentionnés ; réconciliation documentaire séparée d'une remise en production.

## 2026-09-12T05:08:46Z — PR #78 — compatibilité GitRegistry projet
Source https://github.com/Patricked-code/MCP/pull/78.
Task `TASK-20260910-001`, session `39ff2377-f4c2-4ca2-99ee-beff54a2f2d4`, checkpoint `6ad95c77-fb4b-4abd-bf3f-3a1db74eb142`, Bootstrap Receipt `b20599e2-a89a-4bb4-b5c5-c0e859d239a3`.
Base `fa563c6e21d6fa07bf5b33a58626ceae1cdedc13`, head `f7800966119601e336c480da6f2f98eafe6e6e70`.
Étend le GitRegistry existant avec corrélations projet optionnelles et compatibilité historique : ni second registre, ni activation V2 forcée.

## 2026-09-13T09:55:24Z — PR #80 — mapping AfricaFunds (pilote historique de projet)
Source https://github.com/Patricked-code/MCP/pull/80.
Task `TASK-20260910-001` phase 2, checkpoint `1d792e3f-c9e9-4296-8fa4-41f3fc4613ef`. Mapping projet `CS-AFRICAFUNDS-001` et composants frontend/API ; S2 reste `deployEnabled=false`, registres V2 en dry-run, vhosts legacy non exploitables pour déploiement.
RED commit `5cedc7ac4b32d71ead8c8574c001669f3ff86f4e` CI #831 ; GREEN `5b296e48b7140e0205a4921a8f9d3e8a35700477` CI #833 ; CI #840 `startup_failure` et **ne vaut ni échec fonctionnel ni succès**.

## 2026-09-13T19:55:13Z — PR #83 — readiness GitRegistry V2
Source https://github.com/Patricked-code/MCP/pull/83.
Task `TASK-20260913-002`. RED `af4ee0f7387cbc52fa6005bbcf4c962a8ec2fa59`, CI #854 ; GREEN `db7034540e0fcdb033ec7a35a9db7cc1c5566b7d` CI #855 ; head doc `424508e244763fa00705b207daf834e7e2bdd1f0` CI #856.
L'évaluateur retourne READY/BLOCKED avec codes liés à mapping, chemin réel, remote, domaine, credentials, santé et rollback, **sans activer les mappings V2**.

## 2026-09-13T20:02:26Z — PR #84 — livraison C1 réconciliée
Source https://github.com/Patricked-code/MCP/pull/84.
CI PR #857 et main #858 SUCCESS déclarées, merge `1a3af33054dc4b5429b0e36de4ee25efc3a9f88e`, Governed Deploy #37 SUCCESS, Live State 217 aligné et drift documentaire à résoudre ; PR documentaire n'ajoute pas de droit GitRegistry.

## 2026-09-14T20:41:49Z — PR #85 — transport GitHub Actions SSH, plan non activé
Source https://github.com/Patricked-code/MCP/pull/85.
Candidat `Governed GitHub Actions → SSH Transport V1`, OPEN ; explicitement **plan** et non capacité activée. Préserve la chaîne historique `Actions → OIDC → MCP → SSH`, exige parité d'attestation et absence de shell arbitraire.

## 2026-09-14T23:09:12Z — PR #86 — recette S2 Stablecoin/E-WARI, non déclarée déployée
Source https://github.com/Patricked-code/MCP/pull/86.
Prépare une synchronisation S2 bornée au frontend `stablecoin_frontend` ; remote/branche exacts, fast-forward, build Next.js/Passenger et health, backend marqué `LIVE_DISCOVERY_REQUIRED`, projets legacy conservés read-only. PR OPEN au moment de consultation : **ne pas la présenter comme livrée en production**.

## 2026-09-15T01:41:35Z — PR #88 — création bornée de dépôt GitHub
Source https://github.com/Patricked-code/MCP/pull/88.
Capacité `github_create_repository` candidat pour organisation `GITHUB_ORG` ; dépôt privé vide, vérification idempotente, `shadow_ready` et `ENABLE_WRITE_TOOLS` ; RED `8e9ef1d975642904490f2972b4cb45d95e6a729a` CI #900, GREEN `d5eb87c46b458f0c061d2b4dc3af0e7ba2d51993` CI #903. PR OPEN : ne pas inférer que l'outil était exposé en production.

## 2026-09-15T02:01:25Z — PR #89 — fondation Git/GitHub Control Plane
Source https://github.com/Patricked-code/MCP/pull/89.
Dépendance #88 ; manifeste de 170 capacités candidates, première vague de 12 READ, RED `5449bbe4e730ddff55f3131c30c7b04f7e794b19` CI #908 ; GREEN `0571b175df91069c76e989328d6fc47f27178f3a` CI #914 ; documentation `5bc82c175311a76c2b70ec1b55ecc659ac692549` CI #915. Ne pas confondre catalogue de capacités et outils opérationnels.

## 2026-09-15T02:11:52Z — PR #90 — cycle GitHub branches/commits/PR/reviews/merge
Source https://github.com/Patricked-code/MCP/pull/90.
PR empilée sur #89, base `5bc82c175311a76c2b70ec1b55ecc659ac692549`. Six READ et douze WRITE proposés, fermeture fail-closed des validations SHA, ruleset et CI ; aucune API GitHub brute ni shell libre. Le statut OPEN maintient la distinction entre code candidat et capacités réellement enregistrées.

## 2026-09-15T03:27:46Z — PR #92 — résolution repository→project C2
Source https://github.com/Patricked-code/MCP/pull/92.
Task `TASK-20260915-001`, relation `repositoryId → mappingId → projectId`. RED `f71704dbfd2ad3fe2ba7c8545fa157435e97de7e` CI #933, GREEN `45adc85925bf819b8c71df4621315e95bc3154ca` CI #935 ; cas compatibilité historique RED `6fc9c74b3a405a69f23e13d80c4557fa1d5b4538` CI #937, GREEN `d71ba1671adcadf94f263f00ec6eef02d915663f` CI #939 ; head final `8b71f14f9a4884d57699e093853f4ccfb84080ef` CI #943. C1 readiness distinct de C2 identité, GitRegistry V2 non activé.

## 2026-09-15T03:45:10Z — PR #93 — état terminal C2 documentaire
Source https://github.com/Patricked-code/MCP/pull/93.
Baseline fonctionnelle `46d576e53820eba0360647b6fd96d41dd4a2bbc6` ; ne pré-déclare pas DONE sans fermeture de l'autorité tâche. Cette distinction explique les divergences ultérieures entre Task Queue et Live State.

## 2026-09-16T22:49:19Z — PR #95 — GWC pré-code et intégration candidate
Source https://github.com/Patricked-code/MCP/pull/95.
PR d'un autre chantier, mais trace les conflits potentiels avec #88/#89/#90 et l'autorité Task Queue existante. Corps de PR mis à jour le 20 septembre ; HEAD candidat `015dc3ebde69aa52aaa55514ef9494b83a76713a`, CI #1502 annoncée SUCCESS, 604/604, sans attestation de déploiement du candidat à cette étape. Ne pas absorber la PR dans le programme universel : **lien transversal, non identité de chantier**.

## 2026-09-24T16:40:47Z — PR #168 — déploiement UAC du MCP et documentation
Source https://github.com/Patricked-code/MCP/pull/168.
Après PR #154 et déploiement, documente la baseline fonctionnelle `ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4`. Les preuves runtime S1/Docker et les attestations doivent être liées à ce SHA plutôt qu'au titre de la PR documentaire.

## 2026-09-25T11:09:43Z — PR #188 — certificat SSH éphémère gouverné
Source https://github.com/Patricked-code/MCP/pull/188.
Certificat SSH issu d'un GitHub Actions OIDC borné repo/ref/workflow, clé Ed25519 éphémère, durée <=600s, restrictions de commande ; mutation serveur non ouverte par simple émission du certificat. RED run `36123311069`, GREEN `ce8bc23af4b322bda46a48740a50173350c35f30`, CI `36124712392` SUCCESS annoncée.

## 2026-09-26T16:27:13Z — PR #193 — preuve E2E transport SSH pilote
Source https://github.com/Patricked-code/MCP/pull/193.
PR fonctionnelle #191 : HEAD `b121b867c948c4981912a3b79e57252514e88467`, merge `0eb55a511c821bb4082e147325cf211404a8e5f6`, CI PR `36254828240`, main `36255009457`, Governed Deploy `36255009423`, CA bootstrap `36130501105`, pilote Gouvern E2E `36255238655` : SUCCESS déclarés. Test sous certificat éphémère, `mutationAllowed=false`, état `WAITING_FOR_SETUP_ANSWER / Q_DOMAIN_BINDING`. **Ce pilote n'est pas un provisionnement complet en production.**

## 2026-09-29T19:53:36Z — PR #202 — TLS bloque un déploiement de capacités gouvernées
Source https://github.com/Patricked-code/MCP/pull/202.
PR #200 fusionnée au SHA `d53b9de48617920eae7a0bba46f5a7387bc11ab8`, main CI #2102 SUCCESS, mais Governed Deploy #85 a échoué deux fois à la vérification HTTPS du endpoint `/deploy/github/s1` à cause d'un certificat expiré ; sans bypass TLS. La PR distingue clairement **code fusionné ≠ outil déployé ≠ preuve runtime**.

## Relations conservées
#67→#68→#69 ; #73→#75→#76 ; #78→#80 ; #83→#84 ; #88→#89→#90 (pile candidate, non nécessairement fusionnée) ; #92→#93 et GWC #95 (conflit de lecture et d'autorité) ; #188→#191→#193 ; #200→#202 (incident de déploiement).

## Restant à instruire
PR #70–#74, #77, #79, #81/#82, #87, #91, #94, #96–#167, #169–#187, #189–#201 non inventoriées individuellement ici ; tous les runs sont des preuves déclarées dans les corps de PR et non des téléchargements d'artefacts Actions.
