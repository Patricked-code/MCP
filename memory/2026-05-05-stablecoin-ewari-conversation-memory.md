# Mémoire consolidée — Stablecoin E-WARI / WealthTech

Date de consolidation : 2026-05-05  
Dépôt mémoire : `Patricked-code/MCP`  
Dossier cible serveur souhaité : `/root/wealthtech_project_memory/memory/`

> Cette mémoire compile le fil de travail, les décisions, les validations et la prochaine étape logique. Elle n’est pas un dump brut des secrets ou tokens. Elle doit être lisible par un autre Codex pour reprendre proprement.

---

## 1. Projet concerné

Projet applicatif : **Stablecoin E-WARI / WealthTech**  
Dépôt applicatif : `Patricked-code/Stablecoin`  
URL publique : `https://stablecoin.chainsolutions.fr`  
Chemin serveur applicatif : `/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin`

Le projet n’est pas seulement un wallet. Il vise une plateforme stablecoin administrée avec :

- wallet utilisateur ;
- relayer OpenZeppelin ;
- rôles smart contract ;
- autorisations applicatives ;
- abonnements ;
- quotas ;
- commissions ;
- paiements marchands ;
- e-commerce ;
- dépôt cash / Mobile Money ;
- retrait cash / Mobile Money ;
- mint après confirmation d’encaissement ;
- burn ou retrait après validation ;
- historique applicatif ;
- panels d’administration ;
- futur portefeuille d’investissement OPCVM tokenisé.

---

## 2. Routes importantes

Route Wallet réelle :

```text
https://stablecoin.chainsolutions.fr/profil/wallet/
```

Ancienne fausse route / faux miroir à ne plus considérer comme Wallet de référence :

```text
https://stablecoin.chainsolutions.fr/profil/portefeuille/
```

Décision : `/profil/portefeuille/` devra être auditée puis supprimée ou redirigée proprement plus tard. Elle ne doit plus guider les tests Wallet.

Autres routes utiles :

```text
https://stablecoin.chainsolutions.fr/
https://stablecoin.chainsolutions.fr/profil/historique/stablecoin/
https://stablecoin.chainsolutions.fr/profil/transfer/
https://stablecoin.chainsolutions.fr/profil/abonnement/
https://stablecoin.chainsolutions.fr/api/metaTransfer/
```

La route API canonique est :

```text
/api/metaTransfer/
```

Le slash final est important, car la configuration Next.js utilise `trailingSlash: true`.

---

## 3. État Git applicatif validé

Dépôt applicatif :

```text
https://github.com/Patricked-code/Stablecoin.git
```

Branche : `main`

Commit validé actuel :

```text
6216755d318677ed9a56c36731a57531d02bf751
```

Commit précédent important, lié au refactor frontend metaTransfer :

```text
27642842bd4e13be035da3a54a3a1e2a260efa72
```

Build public actif validé :

```text
qCotQPq7AlEarYmuz0wu4
```

Règle : avant toute action, vérifier que Git est propre, que `origin/main` est aligné, et que le build public actif correspond au build attendu.

---

## 4. Correction metaTransfer déjà réalisée

### Problème initial

Le frontend faisait ou contenait des traces d’appels directs à `metaTransfer`, notamment via :

```text
contract.metaTransfer
contractStablecoin.metaTransfer
estimateGas.metaTransfer
encodeFunctionData("metaTransfer")
```

Cette logique était mauvaise côté navigateur, car le frontend ne doit pas manipuler directement les fonctions contractuelles sensibles ou des secrets.

### Décision validée

Le frontend doit appeler uniquement :

```text
/api/metaTransfer/
```

Le backend API prépare et relaie ensuite l’appel vers OpenZeppelin Relayer.

### Résultat validé

Audit 6BH-FIX1 :

```text
Direct metaTransfer interdit FRONTEND     : 0
Direct metaTransfer autorisé BACKEND      : 4
Direct metaTransfer interdit JS public    : 0
API canonique /api/metaTransfer/ source   : 4
Fetch sans slash frontend                 : 0
addHistorical détecté                     : 2
executeMetaTransferViaBackend détecté     : 5
callBackendMetaTransfer détecté           : 8
tokenEnCours détecté                      : 8
Bearer détecté                            : 8
```

Conclusion : frontend nettoyé ; backend autorisé à contenir l’encodage et l’appel contractuel sécurisé.

---

## 5. Backend `/api/metaTransfer/`

Fichier principal :

```text
pages/api/metaTransfer.js
```

Fonctions et responsabilités déjà validées :

- refuser les méthodes non autorisées ;
- refuser les POST sans token ;
- vérifier l’utilisateur authentifié ;
- vérifier que l’adresse `from` correspond à l’adresse blockchain de l’utilisateur ;
- vérifier le contrat E-WARI ;
- vérifier le rôle relayer côté contrat ;
- vérifier le solde ;
- encoder l’appel `metaTransfer` ;
- envoyer via OpenZeppelin Relayer ;
- retourner `txHash`, `relayerTransactionId`, statut, contrat, relayer, from, to, value.

Un POST sans token doit répondre :

```json
{"ok":false,"code":"AUTH_TOKEN_MISSING","message":"Token d'authentification manquant."}
```

Le GET `/api/metaTransfer/` doit répondre `405`.

---

## 6. Correction runtime `.env.local` / Passenger

Le fichier `.env.local` applicatif n’était pas lisible par l’utilisateur Passenger.

Utilisateur Passenger détecté :

```text
chainsolutions.fr_b8xwfuozw6
```

Correction appliquée :

```text
chown chainsolutions.fr_b8xwfuozw6:root .env.local
chmod 400 .env.local
```

Variables sensibles concernées, à ne jamais afficher :

```text
OPENZEPPELIN_RELAYER_API_KEY
OPENZEPPELIN_RELAYER_ID
OPENZEPPELIN_RELAYER_ADDRESS
OPENZEPPELIN_RELAYER_API_BASE_URL
OPENZEPPELIN_RELAYER_URL
EWARI_RELAYER_MODE
```

Ne jamais pousser `.env.local` ni secrets dans GitHub.

---

## 7. OpenZeppelin Relayer

Relayer local :

```text
ewari-openzeppelin-relayer
```

Redis :

```text
ewari-openzeppelin-relayer-redis
```

Port local :

```text
127.0.0.1:18080
```

Le relayer renvoie `401` sans authentification : normal.  
Il renvoie `200` avec la clé API locale.

Important Docker : forcer :

```bash
export DOCKER_API_VERSION=1.43
```

car le client Docker peut tenter une version API trop récente pour le daemon.

---

## 8. Transaction réelle minimale déjà validée

Une transaction réelle minimale a été effectuée et confirmée.

Montant brut :

```text
1
```

Token :

```text
EWRITEA
```

Décimales :

```text
10
```

From :

```text
0xBA32bBD4D8fad86aB5F95f3e99EE59a8121d63a6
```

To de test technique minimal :

```text
0x0000000000000000000000000000000000000002
```

Contrat proxy E-WARI :

```text
0xe2C51e1da04F23ef214eD45Dac84Bd49c8D7aa64
```

Anciennes adresses à ne plus utiliser comme référence :

```text
0xB7Ef9f8CB3C46143952f388F46e1CF1FAEB85D8F
0xb9dD86a5D87bB221261865da0701DA528246250b
```

Relayer address :

```text
0x87E792E9064568361D88F8738221F8e659B0abB1
```

txHash :

```text
0xb3a686345418e2f42cea46b4b7a4059f1c3ccd6aa312bf836ec0cd8438ccb0f1
```

Relayer transaction ID :

```text
8236afa5-06c4-47fb-b5a1-673ea41f10a0
```

Relayer status :

```text
confirmed
```

Confirmed at :

```text
2026-05-05T06:26:58.137658167+00:00
```

Blockchain : Moonbase  
Explorer :

```text
https://moonbase.moonscan.io/tx/0xb3a686345418e2f42cea46b4b7a4059f1c3ccd6aa312bf836ec0cd8438ccb0f1
```

Receipt status :

```text
1
```

Block :

```text
16167539
```

Balances après test :

```text
From balance raw : 1999999999999
To balance raw   : 1
```

Conclusion : la chaîne technique `Wallet/backend API -> OpenZeppelin Relayer -> contrat -> blockchain` fonctionne.

---

## 9. Destinataire applicatif vérifié pour futur test UX

Un destinataire applicatif réel a été vérifié sans transaction.

Adresse :

```text
0xCBe776742C383647765cE6C61c776fF47dcFf9dC
```

Résultat recherche : HTTP 200, utilisateur détecté.

Données retournées :

```text
id            : 5
email         : contact@wealthtechinnovations.com
code          : IE569505
address       : 0xCBe776742C383647765cE6C61c776fF47dcFf9dC
codeTypeProfil: entCom
nom/entreprise: jijiojoijio jjjiiojijijo
```

Ce destinataire peut servir à un futur test UX manuel depuis `/profil/wallet/`, mais aucune transaction réelle ne doit être envoyée sans confirmation explicite.

---

## 10. Gouvernance métier à auditer

Le relayer marche techniquement, mais cela ne suffit pas. La plateforme doit administrer l’usage du stablecoin.

Avant toute vraie transaction utilisateur, il faut vérifier progressivement :

1. utilisateur authentifié ;
2. adresse `from` appartenant à l’utilisateur ;
3. solde suffisant ;
4. relayer doté du rôle contractuel requis ;
5. adresse utilisatrice autorisée à solliciter le relayer ;
6. abonnement actif ou quota disponible ;
7. période de validité ;
8. nombre de transactions autorisées ;
9. type de transaction ;
10. commission ou gratuité ;
11. adresse de commission ;
12. historique applicatif avant/après transaction ;
13. journalisation admin.

Types de transactions à distinguer :

- transfert simple ;
- paiement marchand ;
- paiement e-commerce ;
- dépôt cash / mobile money ;
- retrait cash / mobile money ;
- mint après confirmation d’encaissement ;
- burn / retrait ;
- opérations d’administration ;
- opérations futures OPCVM tokenisées.

---

## 11. Modules futurs à ne pas traiter immédiatement

À ne pas implémenter maintenant, mais à garder en mémoire :

- dépôt cash / Mobile Money déclenchant mint ou transfert après confirmation de réception ;
- retrait cash / Mobile Money ;
- paiement marchand ;
- paiement e-commerce ;
- commissions marchands/intermédiaires ;
- frais variables selon abonnement ;
- panel admin abonnement et quotas relayer ;
- portefeuille d’investissement OPCVM tokenisé ;
- publication de valeur de part OPCVM ;
- calcul portefeuille OPCVM = nombre de parts x valeur de part.

---

## 12. Prochaine étape logique

Ne pas faire immédiatement une nouvelle transaction UX.

Prochaine étape :

```text
6BI-B — Audit métier pré-transaction Wallet / Relayer / Abonnement / Rôle / Commission, sans transaction.
```

Objectif : comprendre ce qui existe déjà dans le code avant de décider si on peut faire un test UX réel ou s’il faut d’abord ajouter une barrière métier.

Contraintes :

- aucune transaction ;
- aucune modification code ;
- aucun build ;
- aucun restart ;
- aucun commit ;
- aucun push ;
- aucun secret affiché ;
- logs dans `/root/ewari-uups-deploy/logs` ;
- route Wallet de référence uniquement `/profil/wallet/` ;
- `/profil/portefeuille/` seulement pour dette technique, pas comme Wallet.

---

## 13. Questions que 6BI-B doit résoudre

1. Quand un utilisateur initie un transfert depuis `/profil/wallet/`, quelles fonctions exactes sont appelées ?
2. La transaction passe-t-elle bien par `/api/metaTransfer/` ?
3. Où est appelée `addHistorical` ?
4. L’historique est-il créé avant ou après retour relayer ?
5. Quels endpoints applicatifs sont appelés avant, pendant et après transfert ?
6. Existe-t-il une vérification abonnement avant transfert ?
7. Existe-t-il une vérification quota de transactions ?
8. Existe-t-il une vérification autorisation relayer côté utilisateur/adresse ?
9. Existe-t-il une vérification rôle utilisateur côté frontend ou backend ?
10. Existe-t-il une vérification type de transaction ?
11. Existe-t-il une logique commission/frais ?
12. Existe-t-il une adresse de commission ?
13. Existe-t-il une table, endpoint ou composant admin pour les abonnements ?
14. Existe-t-il une table, endpoint ou composant admin pour les commissions ?
15. Existe-t-il une table, endpoint ou composant admin pour les rôles ?
16. Existe-t-il une table, endpoint ou composant admin pour l’autorisation relayer ?
17. Le backend `/api/metaTransfer/` vérifie-t-il seulement `auth/from/solde/RELAYER_ROLE` ou aussi l’abonnement ?
18. Le Wallet affiche-t-il les erreurs métier correctement ?
19. La page historique stablecoin peut-elle afficher le test ?
20. Quelles parties sont implémentées, partielles, absentes, risquées ou à refactorer ?

---

## 14. Fichiers à auditer en priorité

```text
pages/profil/wallet/index.js
components/profil/Portefeuille/AccueilPortefeuille.js
pages/api/metaTransfer.js
pages/profil/historique/stablecoin.js
components/profil/Historique/Stablecoin.js
components/profil/Abonnement/AccueilAbonnement.js
pages/profil/abonnement.js
components/admin/Wealthtech/Stablecoin/Roles/AssignRole.js
components/admin/Wealthtech/Stablecoin/MintBurn/ActionMintBurn.js
pages/admin/wealthtech/stablecoin/roles/attribuer-roles.js
pages/admin/wealthtech/stablecoin/abonnement/tarifs.js
pages/admin/wealthtech/stablecoin/abonnement/liste-abonnes.js
pages/admin/wealthtech/stablecoin/comme-moyen-paiement/*
pages/profil/portefeuille.js
```

`pages/profil/portefeuille.js` doit être audité uniquement pour préparer sa suppression/redirection future.

---

## 15. Méthode de travail à conserver

L’utilisateur souhaite conserver la méthode déjà utilisée :

- étapes numérotées ;
- audit avant modification ;
- scripts copiables ;
- aucune transaction sans confirmation ;
- aucun secret affiché ;
- contrôle Git avant/après ;
- contrôle build public ;
- contrôle routes HTTP ;
- logs systématiques ;
- rapport clair ;
- conclusion de décision ;
- modification uniquement après validation ;
- commit/push seulement quand propre et validé.

---

## 16. Note sur les fichiers expirés

Certains fichiers uploadés dans les conversations précédentes ne sont plus accessibles. S’ils sont nécessaires, demander à l’utilisateur de les renvoyer.
