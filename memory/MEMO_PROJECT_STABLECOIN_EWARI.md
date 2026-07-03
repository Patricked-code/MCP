# Mémo projet — Stablecoin EWARI / KOREE / XOF

Date : 2026-07-01
Statut : mémoire fonctionnelle et technique consolidée, sans secrets.

## 1. Identité

EWARI, E-WARI, KOREE et XOF désignent le même projet ou la même famille projet. L’objectif est de construire une solution de stablecoin adossée au Franc CFA d’Afrique de l’Ouest avec une parité cible : `1 FCFA = 1 Koree`.

Le projet doit être présenté avec prudence comme une solution de monnaie électronique ou de représentation technique blockchain d’une valeur monétaire, selon le montage réglementaire final avec l’institution partenaire.

## 2. Partenaire financier

Partenaire identifié : WITTI Finances.

Rôle envisagé : institution financière partenaire dans l’UEMOA, support réglementaire, possible porteur ou émetteur selon montage final.

Rôle WealthTech Innovations : fournisseur technique, concepteur plateforme, wallet, blockchain, API, smart contract et intégration.

Document à produire plus tard : modèle de contrat de partenariat technique WealthTech Innovations / WITTI Finances.

## 3. Profils et services

Profils : particuliers, entreprises, sociétés de gestion, institutions financières, ONG, mutuelles, associations, commerçants, facturiers, administrations.

Services particuliers : transfert d’argent, paiement de biens et services, factures, démarches administratives, OPCVM tokenisés, crowdfunding, épargne à taux fixe, compte courant, compte d’épargne, services de carte, réception de salaire et autorisations de prélèvement.

Services entreprises : transferts UEMOA et internationaux, paiement salaires, charges, impôts, fournisseurs, encaissements clients, e-commerce, crowdfunding, placements de trésorerie, produits d’investissement, comptes, épargne salariale.

Services ONG / institutions : encaissements, règlements, épargne collective et passerelles de paiement.

## 4. Modèle économique

Sources identifiées : abonnements, frais de transactions sur investissements, commissions crowdfunding, frais marchands, frais de conversion ou retrait selon modèle final, services premium et corporate.

Chiffres à vérifier avant tout document réglementaire : frais transaction 0,25 %, frais retrait 0,5 %, abonnement mensuel 1 000 FCFA, abonnement annuel 10 000 FCFA.

## 5. Processus wallet

Création : inscription, KYC, validation, création wallet, identifiant unique/adresse wallet.

Alimentation : remise de FCFA via espèces, banque, mobile money, point partenaire ou agence, puis émission équivalente de Koree.

Conversion : demande utilisateur, blocage ou destruction technique des unités correspondantes, remise en FCFA selon canal autorisé. Ce point doit être aligné avec la réglementation applicable.

## 6. Smart contract EWARI

Le contrat fourni est un ERC20 personnalisé basé sur OpenZeppelin avec AccessControl, Pausable, Escrow, PullPayment et Permit/EIP712.

Rôles : DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, BURNER_ROLE, ASYNC_ROLE, TRANSFER_ROLE, TRANSFERFROM_ROLE, PERMITER_ROLE.

Fonctions principales : name, symbol, decimals, totalSupply, balanceOf, transfer, allowance, approve, transferFrom, increaseAllowance, decreaseAllowance, mint, mintFrom, pause, unpause, burn, burnFrom, asyncTransfer, permit, nonces, DOMAIN_SEPARATOR.

Correction importante : `transfer` est protégé par `whenNotPaused` et `onlyRole(TRANSFER_ROLE)`. `transferFrom` est protégé par `onlyRole(TRANSFERFROM_ROLE)`. La documentation ne doit jamais présenter ces transferts comme totalement publics sans contrôle.

## 7. OPCVM tokenisés

Les contrats OPCVM incluent notamment OPCVMBase et OPCVMVerification avec gestionnaire, escrow, stablecoinAddress, parts, valeur liquidative, calendriers, KYC et adéquation investisseur/produit. Ils servent à la tokenisation de parts d’OPCVM et à l’intégration de produits d’investissement dans EWARI.

## 8. Documents à produire

Trois grands ensembles :

1. Présentation, fonctionnement et cas d’usage du stablecoin.
2. Dossier d’architecture technique.
3. Livre blanc.

Dossier BCEAO / monnaie électronique : contrôle interne, risques, KYC/AML, gestion monnaie électronique, relation clientèle, réseau de distribution, incidents/réclamations, formulaires, activité détaillée, projections financières, investissements, financement, coûts, tarifs et conventions.

## 9. Top départ

Ne démarrer la rédaction complète qu’après la phrase exacte :

`c’est le départ de la conversation sur EWARI*`
