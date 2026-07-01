# Conversation compilée — Partie 03 — EWARI / KOREE / Stablecoin

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`

## 1. Identité du projet

EWARI, E-WARI, KOREE, Koree, Stablecoin et XOF désignent le même projet ou le même continuum projet.

Objectif : créer un stablecoin appelé XOF / Koree, adossé au Franc CFA de l’Afrique de l’Ouest, avec une parité cible :

```text
1 FCFA = 1 Koree
```

Le stablecoin est présenté comme stable, non spéculatif, intégré dans une solution de paiement et de transfert d’argent, et utilisable dans une plateforme de services financiers.

POC mentionné :

```text
https://stablecoin.wealthtechinnovations.com
```

## 2. Partenariat WITTI Finances

Le projet implique un partenariat avec la microfinance WITTI Finances.

Objectif : permettre l’obtention ou le portage du cadre monnaie électronique auprès de la BCEAO, WITTI Finances étant l’institution financière et WealthTech Innovations le partenaire technique.

Le partenariat doit clarifier :

- rôles et responsabilités ;
- émission de Koree ;
- réserve en FCFA ;
- KYC et conformité ;
- obligations techniques ;
- confidentialité ;
- propriété intellectuelle ;
- disponibilité de la plateforme ;
- continuité d’activité ;
- sécurité ;
- reporting ;
- contrôle interne ;
- droits d’audit ;
- réversibilité ;
- partage économique éventuel.

## 3. Prestations générales

```text
Prestataire de service de paiement
Portefeuille de paiement en ligne
Portefeuille électronique
Solution de paiement en ligne
```

## 4. Profils utilisateurs

```text
Particuliers
Corporate / entreprises
Société de gestion
Institution financière
ONG
Institutions
Mutuelles
Associations
```

## 5. Services particuliers

- transferts d’argent ;
- paiement de biens et services en ligne et chez les commerçants ;
- paiement de factures ;
- paiement de démarches administratives ;
- investissement et épargne ;
- OPCVM tokenisés ;
- crowdfunding ;
- épargne bloquée à taux fixe ;
- épargne à taux fixe ;
- compte courant ;
- compte d’épargne ;
- crédit à la consommation sous conditions ;
- achat en plusieurs mensualités ;
- réception du salaire ;
- autorisation de prélèvements ;
- cartes et moyens de paiement.

## 6. Services entreprises

- transferts transfrontaliers UEMOA ;
- transferts internationaux ;
- paiement des salaires ;
- paiement des charges d’exploitation ;
- charges courantes ;
- frais administratifs ;
- impôts ;
- fournisseurs XOF ;
- fournisseurs autres devises ;
- encaissements clients XOF ;
- encaissements clients hors UEMOA ;
- e-commerce ;
- crowdfunding ;
- microcrédit sous conditions ;
- placement de trésorerie rémunéré ;
- dépôt à terme ;
- fonds monétaire ;
- OPCVM obligataire ;
- comptes bancaires ;
- épargne salariale et retraite.

## 7. Services ONG / institutions

- solution d’encaissement et de règlement ;
- dispositif d’épargne collectif ;
- passerelles de paiement en ligne.

## 8. Smart contract EWARI

Le contrat fourni est un contrat Solidity fondé sur ERC20 avec OpenZeppelin.

Rôles identifiés :

```text
DEFAULT_ADMIN_ROLE
MINTER_ROLE
PAUSER_ROLE
BURNER_ROLE
ASYNC_ROLE
TRANSFER_ROLE
TRANSFERFROM_ROLE
PERMITER_ROLE
```

Fonctions principales :

```text
name
symbol
decimals
totalSupply
balanceOf
transfer
allowance
approve
transferFrom
increaseAllowance
decreaseAllowance
mint
mintFrom
pause
unpause
burn
burnFrom
asyncTransfer
permit
nonces
DOMAIN_SEPARATOR
```

Point critique rappelé : l’accès contrôle concerne aussi les transferts. `transfer` est protégé par le rôle de transfert et `transferFrom` par le rôle de transfert délégué.

## 9. Documents BCEAO / monnaie électronique à produire

- dispositif de contrôle interne ;
- analyse, alerte et suivi des risques BC/FT ;
- procédure de gestion de la monnaie électronique ;
- procédure de relation clientèle ;
- procédure réseau de distribution ;
- procédure incidents et réclamations ;
- formulaire d’enrôlement client ;
- formulaire de création de monnaie électronique ;
- formulaire de destruction de monnaie électronique ;
- présentation détaillée de l’activité ;
- projections financières sur au moins trois ans ;
- investissements prévus ;
- plan de financement ;
- politique de coûts ;
- structure tarifaire ;
- convention services monnaie électronique ;
- convention distributeur ;
- convention marchand / accepteur ;
- convention détenteur ;
- convention facturier ;
- modèle de contrat de partenariat technique WITTI / WealthTech.

## 10. Business plan — points clés

La blockchain est le socle technologique : traçabilité, sécurité, immutabilité, tokenisation, smart contracts et réduction des coûts de transfert.

Création wallet Koree : téléchargement application, KYC, scan document officiel, validation, attribution adresse wallet.

Approvisionnement : versement FCFA à WITTI Finances, émission de Koree dans le wallet.

Retrait : demande de retrait, destruction des Koree, versement équivalent FCFA.

Paiement : transfert de Koree wallet à wallet.

Sources de revenus historiques : frais transaction 0,25 %, frais retrait 0,5 %, abonnement particulier mensuel 1 000 FCFA, abonnement annuel 10 000 FCFA.

Investissements prévus : 150 millions FCFA sur 3 ans, avec recrutement de 2 ingénieurs blockchain seniors et 2 chargés d’affaires.

## 11. Top départ documentaire

Le top départ demandé par l’utilisateur est :

```text
c’est le départ de la conversation sur EWARI
```

À ce moment, il faut passer en mode projet et produire un plan chronologique de rédaction.

Objectif final :

```text
Partie 1 — Présentation et fonctionnement du stablecoin.
Partie 2 — Dossier d’architecture technique.
Partie 3 — Livre blanc du stablecoin.
```
