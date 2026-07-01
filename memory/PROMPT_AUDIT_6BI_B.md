# Prompt Codex — Étape 6BI-B

## Titre

Audit métier pré-transaction Wallet / Relayer / Abonnement / Rôle / Commission — sans transaction.

## Contexte

Le relayer OpenZeppelin fonctionne techniquement sur le projet Stablecoin E-WARI. Une transaction minimale a déjà été confirmée on-chain. La prochaine étape ne doit pas être une nouvelle transaction UX, mais un audit métier pour vérifier si le système contrôle déjà les droits d’utilisation du relayer, les abonnements, les rôles, les quotas, les commissions et l’historique.

Wallet réel :

```text
https://stablecoin.chainsolutions.fr/profil/wallet/
```

Ne pas utiliser comme Wallet :

```text
https://stablecoin.chainsolutions.fr/profil/portefeuille/
```

## Objectif

Préparer et exécuter une étape audit-only nommée :

```text
6BI-B — AUDIT METIER PRE-TRANSACTION WALLET / RELAYER / ABONNEMENT / ROLE / COMMISSION SANS TRANSACTION
```

## Contraintes absolues

- Aucune transaction.
- Aucune modification de code.
- Aucun build.
- Aucun restart.
- Aucun commit.
- Aucun push.
- Aucun secret affiché.
- Ne jamais afficher `.env.local` complet.
- Ne jamais afficher de token Bearer.
- Ne jamais afficher de clé OpenZeppelin Relayer.
- Ne jamais utiliser `/profil/portefeuille/` comme route Wallet de référence.
- Utiliser `/profil/wallet/` comme route Wallet réelle.

## Vérifications préalables attendues

Le script doit vérifier :

```text
- branche locale
- commit local
- remote origin
- commit origin/main
- git status
- build local .next/BUILD_ID
- build public depuis HTML
- HTTP accueil
- HTTP /profil/wallet/
- HTTP /profil/historique/stablecoin/
- HTTP /api/metaTransfer/ GET = 405
- POST no-auth /api/metaTransfer/ = 401 AUTH_TOKEN_MISSING
```

Commit attendu :

```text
6216755d318677ed9a56c36731a57531d02bf751
```

Build attendu :

```text
qCotQPq7AlEarYmuz0wu4
```

## Recherches code attendues

Rechercher et cartographier dans le code :

```text
abonnement
subscription
subscribe
quota
commission
commissions
fee
fees
frais
tarif
tarifs
relayer
relay
role
roles
hasRole
AccessControl
merchant
marchand
ecommerce
e-commerce
payment
paiement
transactionType
typeTransaction
type_transaction
historical
historique
addHistorical
mint
burn
cash
mobile
mobile money
wallet
metaTransfer
```

## Fichiers prioritaires à auditer

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

Note : `pages/profil/portefeuille.js` doit être audité seulement pour préparer sa suppression ou redirection future. Il ne doit pas être considéré comme Wallet réel.

## Questions auxquelles le rapport doit répondre

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
17. Le backend `/api/metaTransfer/` vérifie-t-il seulement auth/from/solde/RELAYER_ROLE ou aussi l’abonnement ?
18. Le Wallet affiche-t-il les erreurs métier correctement ?
19. La page historique stablecoin peut-elle afficher la transaction testée ?
20. Quelles parties sont implémentées, partielles, absentes, risquées ou à refactorer ?

## Livrables attendus

Créer dans `/root/ewari-uups-deploy/logs` :

```text
business-pretransaction-audit-6bi-b-<timestamp>.log
business-pretransaction-source-map-6bi-b-<timestamp>.txt
business-pretransaction-source-map-6bi-b-<timestamp>.json
business-pretransaction-decision-6bi-b-<timestamp>.md
```

Le rapport final doit contenir :

```text
- ce qui existe déjà
- ce qui est partiel
- ce qui manque
- les risques
- les fichiers concernés
- les endpoints concernés
- les fonctions concernées
- décision : test UX manuel possible ou barrière métier à créer d’abord
- prochaine étape recommandée
```

## Décision attendue en fin d’audit

Choisir une des deux conclusions :

```text
CAS A — On peut faire un test UX manuel depuis /profil/wallet/ avec petit montant, car les contrôles métier minimaux existent ou sont explicitement neutralisés temporairement.
```

ou

```text
CAS B — On ne doit pas encore faire de test UX manuel, car il manque une barrière métier serveur avant /api/metaTransfer/ : abonnement, autorisation relayer, quota, type de transaction ou commission.
```

## Rappel méthode

Garder la méthode déjà validée :

- étape numérotée ;
- audit avant modification ;
- scripts copiables ;
- aucune transaction sans confirmation ;
- aucun secret affiché ;
- contrôle Git avant/après ;
- contrôle build public ;
- contrôle routes HTTP ;
- logs systématiques ;
- conclusion de décision.
