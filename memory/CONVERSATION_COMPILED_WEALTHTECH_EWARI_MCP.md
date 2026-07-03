# Compilation structurée — Conversation WealthTech / EWARI / KOREE / MCP

Date de compilation : 2026-07-01
Statut : mémoire projet consolidée, sans secrets complets
Dépôt : `Patricked-code/MCP`
Branche : `main`
Répertoire serveur cible : `/root/wealthtech_project_memory/memory/`

---

## 1. Objet de cette mémoire

Cette mémoire compile les informations essentielles échangées dans la conversation autour de :

- l’écosystème WealthTech ;
- le projet stablecoin EWARI / KOREE / XOF ;
- le partenariat WITTI Finances ;
- la constitution du dossier BCEAO / monnaie électronique ;
- le dossier d’architecture technique ;
- les smart contracts ERC20 et OPCVM ;
- l’architecture MCP `wealthtech_ssh_bridge` ;
- la connexion GitHub / S1 / S2 / Claude / ChatGPT ;
- la logique de Loop Engineering ;
- la mémoire persistante projet.

Cette compilation n’est pas un export brut exhaustif mot à mot de l’interface ChatGPT. Elle est une mémoire opérationnelle structurée, destinée aux agents IA et aux développeurs pour reprendre le projet exactement au bon endroit, sans exposer les secrets.

---

## 2. Principes imposés par l’utilisateur

### Principe 1 — Continuité et contexte

Conserver le contexte global de la conversation, les questions, les réponses, les instructions, les corrections, les objectifs, les détails et les références afin d’éviter toute sortie de contexte.

### Principe 2 — Réponses structurées

Avant toute réponse ou action, relire le contexte utile et répondre de manière structurée, logique et traçable.

### Principe 3 — Précision et vérification

Ne pas inventer. En cas de doute, poser une question ou signaler l’incertitude. Les réponses doivent être exactes, vérifiées et adaptées au code et aux documents réellement fournis.

### Principe 4 — Réponses par blocs si nécessaire

Lorsque la réponse est longue, la structurer en blocs, sections ou étapes. Continuer depuis le point d’arrêt en cas de limite technique.

### Principe 5 — Exhaustivité technique

Fournir des réponses complètes, avec définitions, plans, schémas, code Node.js ou Solidity complet si nécessaire, architecture détaillée et aucun oubli volontaire des échanges importants.

### Principe 6 — Balises et documentation finale

Chaque sujet doit être balisé pour permettre la production d’un document final HTML/Markdown, organisé par sections, avec explications techniques, schémas, tables, relations et chronologie.

---

## 3. Objectif final EWARI / KOREE / XOF

Le projet vise à créer un stablecoin réglementé adossé au Franc CFA d’Afrique de l’Ouest.

Noms utilisés :

- `EWARI`
- `KOREE`
- `XOF`

Ces noms désignent le même projet ou des variantes du même projet selon les documents et périodes.

Caractéristiques centrales :

- parité fixe : `1 FCFA = 1 Koree` ;
- actif numérique non spéculatif ;
- support blockchain ;
- émission envisagée sous forme de monnaie électronique ;
- objectif d’inclusion financière ;
- usage de paiement, transfert, investissement, crowdfunding et services financiers tokenisés ;
- partenariat avec WITTI Finances dans la zone UEMOA.

---

## 4. Top départ projet EWARI

Phrase déclencheur définie par l’utilisateur :

```text
c’est le départ de la conversation sur EWARI*
```

Quand cette phrase est écrite, l’assistant doit :

1. passer en mode projet ;
2. respecter strictement les 6 principes ;
3. présenter un plan de travail chronologique ;
4. reprendre tous les éléments de contexte ;
5. démarrer la rédaction des documents finaux ;
6. ne pas perdre le fil ;
7. structurer la rédaction en parties modifiables.

---

## 5. Documents finaux attendus pour EWARI

### 5.1 Documentation stablecoin / architecture / livre blanc

Document final en trois grandes parties :

1. Présentation, fonctionnement du stablecoin et cas d’usage.
2. Dossier d’architecture technique du stablecoin.
3. Livre blanc du stablecoin.

### 5.2 Dossier de demande BCEAO / monnaie électronique

Documents à rédiger ou préparer :

A. Dispositif de contrôle interne, avec récapitulatif des risques bruts et dispositif de gestion.
B. Dispositifs d’analyse, d’alerte et de suivi des risques de blanchiment de capitaux et de financement du terrorisme.
C. Procédure de gestion de la monnaie électronique.
D. Procédure de gestion de la relation clientèle.
E. Procédure de gestion du réseau de distribution.
F. Procédure de gestion des incidents et réclamations.
G. Formulaire d’enrôlement client.
H. Formulaire de création de monnaie électronique.
I. Formulaire de destruction de monnaie électronique.
J. Présentation détaillée de l’activité de monnaie électronique.
K. Projections financières sur au moins trois ans, avec hypothèses de sensibilité.
L. Investissements prévus.
M. Plan de financement des activités.
N. Politique de coût.
O. Structure tarifaire.
P. Projet de convention des services monnaie électronique.
Q. Projet de convention distributeur.
R. Projet de convention marchand / accepteur.
S. Projet de convention détenteur de monnaie électronique.
T. Projet de convention facturier.

---

## 6. Partenariat WITTI Finances

Le projet prévoit un partenariat avec la microfinance `WITTI Finances`.

Objectif du partenariat :

- permettre l’expérimentation et l’exploitation réglementée du stablecoin ;
- obtenir ou soutenir le dossier d’agrément / autorisation monnaie électronique auprès de la BCEAO ;
- positionner WealthTech Innovations comme fournisseur technique ;
- positionner WITTI Finances comme institution financière partenaire / potentiellement émettrice réglementée.

La correspondance BCEAO mentionne deux recommandations :

1. partenariat avec une banque ou institution de microfinance comme fournisseur de solutions techniques ;
2. constitution d’une société émettrice de monnaie électronique.

L’utilisateur a indiqué que WealthTech se concentre sur la voie du partenariat avec WITTI Finances.

Point à rédiger plus tard : modèle de contrat de partenariat technique entre WITTI Finances et WealthTech Innovations.

---

## 7. Points de vigilance réglementaire

Une distinction doit être clarifiée dans les documents finaux :

- certains échanges anciens décrivent le stablecoin comme une monnaie virtuelle stable sans créance sur l’émetteur ;
- le projet actuel vise aussi une émission sous forme de monnaie électronique réglementée.

Pour un dossier BCEAO cohérent, il faudra harmoniser le discours :

- si le stablecoin est présenté comme monnaie électronique, il doit être traité comme une valeur monétaire émise contre réception de fonds, avec droit au remboursement et dispositif de cantonnement / garantie ;
- le vocabulaire `crypto-actif` ou `actif numérique` doit être utilisé prudemment ;
- le token peut être décrit comme une représentation technique blockchain de monnaie électronique, plutôt qu’un actif spéculatif.

---

## 8. Fonctionnalités de la plateforme EWARI / KOREE

### 8.1 Profils

- Particuliers.
- Corporate / entreprises.
- Sociétés de gestion.
- Institutions financières.
- ONG.
- Mutuelles.
- Associations.
- Administrations ou facturiers.

### 8.2 Services particuliers

- transferts d’argent ;
- paiements de biens et services ;
- paiements de factures ;
- démarches administratives ;
- investissement et épargne ;
- OPCVM tokenisés ;
- crowdfunding ;
- épargne bloquée à taux fixe ;
- épargne à taux fixe ;
- compte courant ;
- compte d’épargne ;
- crédit à la consommation sous conditions ;
- achat en plusieurs mensualités ;
- réception de salaire ;
- autorisation de prélèvement ;
- e-carte de crédit ;
- carte bancaire.

### 8.3 Services entreprises / corporate

- transferts transfrontaliers UEMOA ;
- transferts internationaux ;
- paiement des salaires ;
- paiement des charges d’exploitation ;
- paiement des charges courantes ;
- paiement des frais administratifs ;
- paiement des impôts ;
- paiement fournisseurs en XOF ;
- paiement fournisseurs autres devises ;
- encaissement clients XOF ;
- encaissement clients hors UEMOA ;
- e-commerce et passerelle de paiement ;
- crowdfunding ;
- microcrédit sous conditions ;
- placement de trésorerie à taux fixe ;
- dépôt à terme ;
- fonds monétaire ;
- financement crowdfunding ;
- OPCVM obligataire ;
- compte courant ;
- compte d’épargne ;
- épargne salariale et retraite.

### 8.4 ONG / institutions / mutuelles / associations

- solution d’encaissement ;
- solution de règlement ;
- dispositif d’épargne collectif ;
- passerelles de paiement en ligne.

---

## 9. Business model

Sources de revenus identifiées :

1. abonnements payants particuliers et entreprises ;
2. frais de transaction sur investissements tokenisés ;
3. commissions sur levées de fonds crowdfunding ;
4. frais de transaction sur paiements ;
5. frais de retrait / conversion le cas échéant ;
6. frais marchands ou corporate selon modèle tarifaire ;
7. services premium.

La version business plan mentionne notamment :

- frais de transaction de 0,25 % ;
- frais de retrait de 0,5 % ;
- abonnement mensuel possible de 1 000 FCFA ;
- abonnement annuel possible de 10 000 FCFA.

Ces chiffres doivent être revérifiés et harmonisés avant inclusion définitive dans un document réglementaire.

---

## 10. Smart contract EWARI / E-WARI

Le smart contract fourni est un ERC20 personnalisé basé sur OpenZeppelin, avec :

- `IERC20` ;
- `IERC20Metadata` ;
- `Context` ;
- `Pausable` ;
- `AccessControl` ;
- `Escrow` ;
- `PullPayment` ;
- `IERC20Permit` ;
- `EIP712` ;
- `ECDSA` ;
- `Counters`.

Rôles principaux :

- `DEFAULT_ADMIN_ROLE` ;
- `MINTER_ROLE` ;
- `PAUSER_ROLE` ;
- `BURNER_ROLE` ;
- `ASYNC_ROLE` ;
- `TRANSFER_ROLE` ;
- `TRANSFERFROM_ROLE` ;
- `PERMITER_ROLE` dans `ERC20Permit`.

Point important corrigé dans la conversation :

- la fonction `transfer` est protégée par `whenNotPaused` et `onlyRole(TRANSFER_ROLE)` ;
- la fonction `transferFrom` est protégée par `onlyRole(TRANSFERFROM_ROLE)` ;
- il ne faut donc pas décrire les transferts comme entièrement publics sans contrôle d’accès.

Fonctions importantes :

- `name()` ;
- `symbol()` ;
- `decimals()` retourne `10` ;
- `totalSupply()` ;
- `balanceOf(address)` ;
- `transfer(address,uint256)` ;
- `allowance(address,address)` ;
- `approve(address,uint256)` ;
- `transferFrom(address,address,uint256)` ;
- `increaseAllowance(address,uint256)` ;
- `decreaseAllowance(address,uint256)` ;
- `_transfer` ;
- `_mint` ;
- `mint(uint256)` ;
- `mintFrom(address,uint256)` ;
- `pause()` ;
- `unpause()` ;
- `_burn` ;
- `burn(uint256)` ;
- `burnFrom(address,uint256)` ;
- `_approve` ;
- `_spendAllowance` ;
- `_beforeTokenTransfer` ;
- `_afterTokenTransfer` ;
- `asyncTransfer(address,uint256)` ;
- `permit(...)` ;
- `nonces(address)` ;
- `DOMAIN_SEPARATOR()` ;
- `_useNonce(address)`.

Contrat final :

- `Ewari` hérite de `ERC20` et `ERC20Permit` ;
- constructeur : `ERC20("E-WARI TestB", "EWRITB", 10000000000000)`.

---

## 11. Smart contracts OPCVM

Les documents OPCVM contiennent notamment :

- `OPCVMBase` ;
- `OPCVMVerification` ;
- logique upgradeable UUPS ;
- `AccessControlUpgradeable` ;
- `UPGRADER_ROLE` ;
- gestionnaire ;
- escrow ;
- stablecoinAddress ;
- totalParts ;
- valeurLiquidative ;
- parts ;
- calendrier de valorisation ;
- calendrier dividendes ;
- KYC ;
- fonctions `mintParts`, `burnParts`, `setValeurLiquidative`, `validerKyc`, `invaliderKyc`, etc.

Ces contrats sont pertinents pour la tokenisation des OPCVM et leur intégration dans la plateforme EWARI.

---

## 12. Dossier d’Architecture Technique existant

Un document d’architecture technique `Stablecoin E-WARI` existe avec une table des matières comprenant :

- terminologies ;
- contexte ;
- présentation du projet ;
- architecture technique de la plateforme ;
- schéma global ;
- infrastructure réseau ;
- modèle de données ;
- sécurité ;
- protocoles et contrats partenaires ;
- interopérabilité ;
- conception applicative ;
- services paiement / transfert / investissement / crowdfunding ;
- matrice des flux ;
- gestion utilisateurs ;
- interface web et mobile ;
- exploitation et maintenance ;
- supervision et traçabilité ;
- KYC / AML ;
- sauvegarde ;
- sécurité ;
- PCA / PCO.

Ce DAT doit être complété et harmonisé avec le dossier BCEAO.

---

## 13. MCP wealthtech_ssh_bridge

Serveur MCP :

```text
wealthtech_ssh_bridge
```

URL MCP :

```text
https://mcp.wealthtechinnovations.com/mcp
```

Healthcheck :

```text
https://mcp.wealthtechinnovations.com/health
```

Mode actuel :

```text
read-only-first
```

Authentification actuelle :

```text
Bearer token statique
```

Outils prévus :

- `ping` ;
- `get_project_context` ;
- `check_disk_s1` ;
- `check_disk_s2` ;
- `pm2_status_s1` ;
- `pm2_status_s2` ;
- `docker_status_s1` ;
- `docker_status_s2` ;
- `list_domains_s1` ;
- `list_domains_s2` ;
- `list_large_files_s1` ;
- `list_large_files_s2` ;
- `list_backups_s1` ;
- `list_backups_s2` ;
- `curl_domain`.

État confirmé :

- DNS OK ;
- `/health` OK ;
- `/mcp` sans token retourne 401 ;
- Docker container `wealthtech_mcp_ssh_bridge` actif ;
- SSH S1 OK ;
- SSH S2 OK.

---

## 14. GitHub / MCP / serveurs

Dépôt principal :

```text
Patricked-code/MCP
```

État confirmé :

- S1 peut lire et pousser via Deploy Key read/write ;
- remote Git sur S1 : `git@github.com-mcp-patricked-rw:Patricked-code/MCP.git` ;
- branche : `main` ;
- compte `Wealthtechinnovations` passé en permission `write` ;
- dernier commit connu : `Add MCP access and OAuth documentation` ;
- push dry-run : `Everything up-to-date`.

Ne pas exposer :

- token MCP complet ;
- token GitHub admin ;
- clés SSH privées ;
- `.env`.

---

## 15. Serveurs S1 et S2

S1 :

```text
root@212.227.212.33
```

S2 :

```text
root@217.160.249.254
```

Domaines S1 à conserver :

- `niakara.com` ;
- `www.niakara.com` ;
- `api.niakara.com` ;
- `wealthtechinnovations.com` ;
- `api.wealthtechinnovations.com` ;
- `stablecoin.wealthtechinnovations.com` ;
- `api.stablecoin.wealthtechinnovations.com` ;
- `blockchain.wealthtechinnovations.com` ;
- `tokenfactory.wealthtechinnovations.com` ;
- `wealthtechinnovation.com` ;
- `berebytours.com`.

Domaines S2 protégés :

- `africafunds.chainsolutions.fr` ;
- `api.africafunds.chainsolutions.fr` ;
- `api.stablecoin.chainsolutions.fr` ;
- `stablecoin.chainsolutions.fr` ;
- `brvm.chainsolutions.fr` ;
- `bvmac.chainsolutions.fr` ;
- `chainsolutions.fr` ;
- `Funds.chainsolutions.fr` ;
- `api.funds.chainsolutions.fr`.

---

## 16. Loop Engineering

Règle de travail :

1. lire `GPT.md` ;
2. lire `SUIVI.md` ;
3. lire `README.md` ;
4. lire `README_DEV.md` ;
5. lire `ROADMAP.md` ;
6. lire `TODO.md` ;
7. lire `TASKS.md` ;
8. lire `CODE_REVIEW.md` ;
9. lire `CHANGELOG.md` ;
10. lire `DEPLOYMENT_PRODUCTION.md` ;
11. lire le `POINT DE REPRISE COURANT` ;
12. inventorier avant action ;
13. tester ;
14. documenter ;
15. mettre à jour le point de reprise.

Fichiers à créer dans les projets :

- `GPT.md` ;
- `SUIVI.md` ;
- `README.md` ;
- `README_DEV.md` ;
- `ROADMAP.md` ;
- `TODO.md` ;
- `TASKS.md` ;
- `CODE_REVIEW.md` ;
- `CHANGELOG.md` ;
- `DEPLOYMENT_PRODUCTION.md` ;
- `ARCHITECTURE.md` ;
- `DATABASE.md` ;
- `DOCKER.md` ;
- `SECURITY.md` ;
- `MIGRATION.md` ;
- `AGENTS_ARCHITECTURE.md` ;
- `AI_SKILLS.md`.

---

## 17. Point de reprise courant

Dernier état connu :

- le dépôt `Patricked-code/MCP` est accessible ;
- S1 peut pousser en write ;
- `Wealthtechinnovations` dispose du droit `write` ;
- la mémoire projet doit être ajoutée au dépôt MCP ;
- il faut ensuite synchroniser la mémoire vers `/root/wealthtech_project_memory/memory/` sur S1 ;
- le prochain audit doit utiliser le MCP et le prompt d’audit non destructif.

Prochaine action recommandée :

1. tirer la branche `main` sur S1 ;
2. créer `/root/wealthtech_project_memory/memory/` ;
3. copier les fichiers `wealthtech_project_memory/memory/*` depuis le dépôt vers ce dossier ;
4. protéger les droits ;
5. vérifier le contenu ;
6. lancer ensuite l’audit non destructif.
