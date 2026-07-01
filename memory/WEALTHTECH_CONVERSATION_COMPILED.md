# WEALTHTECH / MCP / STABLECOIN — Conversation compilée et mémoire projet

Date de compilation : 2026-07-01
Dépôt GitHub : `Patricked-code/MCP`
Branche : `main`
Dossier cible serveur : `/root/wealthtech_project_memory/memory/`

---

## 1. Objet du document

Ce document compile la conversation de pilotage du projet WEALTHTECH / STABLECOIN / EWARI / KOREE / MCP afin de créer une mémoire persistante utilisable par Claude Code, Codex, les agents IA et le serveur MCP.

L’objectif est que l’IA ne recommence pas toujours depuis zéro et puisse reprendre les instructions, les serveurs, les domaines, les règles de sécurité, la stratégie de migration, l’architecture cible et les prochaines actions depuis un point central.

---

## 2. Projet global

Le projet vise à créer et consolider un écosystème WealthTech complet autour de :

- stablecoin ;
- monnaie électronique ;
- blockchain POA ;
- paiements ;
- transferts d’argent ;
- wallets ;
- TokenFactory ;
- EVOTE ;
- formations / évaluations blockchain ;
- OPCVM tokenisés ;
- crowdfunding ;
- épargne ;
- services financiers digitaux ;
- architecture microservices ;
- documentation persistante ;
- agents IA travaillant en boucle.

Le projet EWARI, KOREE et Stablecoin sont à considérer comme des noms ou versions historiques d’un même projet stratégique.

---

## 3. Stack technique cible

- Backend : Node.js.
- Frontend : Next.js.
- Base principale : MySQL.
- Analytics / requêtes lourdes : ClickHouse.
- Cache / queues / workers : Redis.
- Conteneurisation : Docker et Docker Compose.
- Architecture : modulaire, évolutive, microservices progressifs.
- Frontend design : Atomic Design.
- Blockchain : smart contracts, stablecoin, TokenFactory, POA.
- Infrastructure future : trajectoire Kubernetes documentée, mais pas nécessairement immédiate.
- Serveur / DevOps : Plesk, PM2, Passenger, Docker, Nginx / Apache selon l’existant.

---

## 4. Serveurs concernés

### 4.1 Serveur S1

```text
S1 = root@212.227.212.33
```

Rôle : serveur principal, destination des migrations, serveur à nettoyer, futur serveur cible de l’écosystème WealthTech.

Domaines à conserver sur S1 avec contenu, configuration et dépendances :

- `niakara.com`
- `www.niakara.com`
- `api.niakara.com`
- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `wealthtechinnovation.com`
- `berebytours.com`

Domaines à créer ou recevoir sur S1 :

- `V2.wealthtechinnovations.com`
- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`
- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`

### 4.2 Serveur S2

```text
S2 = root@217.160.249.254
```

Rôle : serveur source, serveur de migration, serveur à nettoyer sélectivement.

Domaines protégés sur S2 à ne jamais toucher :

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

Toute action pouvant modifier, casser, redémarrer, vider, supprimer ou désactiver un élément lié à ces domaines doit être abandonnée.

---

## 5. Nettoyage demandé

### 5.1 Nettoyage S1

Sur S1, seuls les domaines explicitement listés comme conservés doivent rester avec leur contenu. Tout le reste doit être inventorié, classé, puis pourra être vidé ou supprimé après validation humaine.

Objectif : libérer le maximum d’espace possible sans casser les domaines conservés.

Éléments à inventorier :

- domaines Plesk ;
- sous-domaines ;
- dossiers web ;
- vhosts ;
- apps Node ;
- PM2 ;
- Passenger ;
- Docker ;
- bases de données ;
- certificats SSL ;
- sauvegardes Plesk ;
- dumps SQL ;
- logs ;
- caches ;
- builds ;
- `node_modules` inutiles ;
- fichiers `.zip`, `.tar`, `.tar.gz`, `.tgz`, `.gz`, `.bak`, `.old`, `.sql`, `.dump`.

### 5.2 Domaines S1 précédemment identifiés comme non conservés

- `api.fan-token.wealthtechinnovations.com`
- `api.sadiaaf.wealthtechinnovations.com`
- `apiv3.liquidity.wealthtechinnovations.com`
- `dapps.liquidity.wealthtechinnovations.com`
- `liquidity.wealthtechinnovations.com`
- `lys.wealthtechinnovations.com`
- `sadiaaf.wealthtechinnovations.com`
- `pnci.wealthtechinnovations.com`
- `api.pnci.wealthtechinnovations.com`
- `awards.pnci-ci.wealthtechinnovations.com`
- `liquidity-test.wealthtechinnovations.com`
- `liquidityv1.wealthtechinnovations.com`

### 5.3 Nettoyage S2 futur

Applications S2 à vider ou supprimer plus tard, après audit :

- `api.pccet.wealthtechinnovations.ci`
- `api.wealthtechinnovations.ci`
- `evote.wealthtechinnovations.ci`
- `pccet.wealthtechinnovations.ci`
- `wealthtechinnovations.ci`
- `opcvm.chainsolutions.fr`

Sauvegardes S2 à nettoyer plus tard :

- `fantokenafrica.club`
- `api.fantokenafrica.club`
- `lysfc.fantokenafrica.club`
- `iso20022.chainsolutions.fr`
- `mutualfunds.chainsolutions.fr`
- `opcvm.chainsolutions.fr`
- `robot.funds.chainsolutions.fr`
- `api-mutualfunds.chainsolutions.fr`

---

## 6. Migrations prévues de S2 vers S1

### 6.1 WealthTech

Source S2 :

- `wealthtech.chainsolutions.fr`

Destination S1 :

- `V2.wealthtechinnovations.com`

### 6.2 EVOTE

Sources S2 :

- `evote.chainsolutions.fr`
- `api.evote.chainsolutions.fr`

Destinations S1 :

- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`

### 6.3 Formation Blockchain / Évaluations

Sources S2 :

- `itic4fima.chainsolutions.fr`
- `api.itic4fima.chainsolutions.fr`

Destinations S1 :

- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`

### 6.4 Stablecoin

Sources S2 :

- `stablecoin.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`

Destinations S1 :

- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`

Règle absolue : copier vers S1, ne jamais supprimer les originaux sur S2.

---

## 7. Écosystème cible WealthTech

Les domaines suivants doivent devenir les modules d’un seul écosystème cohérent :

- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `V2.wealthtechinnovations.com`
- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`
- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`

La version stablecoin est considérée comme la plus avancée et doit servir de référence technique et fonctionnelle.

Modules cibles :

- Auth ;
- Users ;
- Organizations ;
- KYC ;
- Wallet ;
- Stablecoin ;
- Payments ;
- Blockchain ;
- TokenFactory ;
- EVOTE ;
- Training ;
- Evaluations ;
- Notifications ;
- Reporting ;
- Audit ;
- Admin.

---

## 8. Fichiers de documentation obligatoires

À créer et maintenir :

- `GPT.md`
- `SUIVI.md`
- `README.md`
- `README_DEV.md`
- `ROADMAP.md`
- `TODO.md`
- `TASKS.md`
- `CODE_REVIEW.md`
- `CHANGELOG.md`
- `DEPLOYMENT_PRODUCTION.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `DOCKER.md`
- `KUBERNETES_FUTURE.md`
- `SECURITY.md`
- `MONITORING.md`
- `BACKUP_RESTORE.md`
- `MIGRATION.md`
- `AGENTS_ARCHITECTURE.md`
- `AI_SKILLS.md`

`SUIVI.md` doit contenir :

```md
# POINT DE REPRISE COURANT
```

---

## 9. Loop Engineering

Boucle obligatoire :

1. Lire la mémoire projet.
2. Lire le point de reprise courant.
3. Identifier le serveur, le domaine, le module et l’objectif.
4. Inventorier.
5. Évaluer les risques.
6. Planifier.
7. Exécuter prudemment.
8. Tester.
9. Documenter.
10. Mettre à jour `SUIVI.md`, `CHANGELOG.md`, `TASKS.md`, `TODO.md`.
11. Mettre à jour le `POINT DE REPRISE COURANT`.
12. Recommencer.

---

## 10. Agents IA à documenter

- Agent Architecte Écosystème.
- Agent Migration.
- Agent Nettoyage Serveur.
- Agent Sécurité / Secrets.
- Agent Base de Données.
- Agent DevOps / Docker.
- Agent Blockchain / Stablecoin.
- Agent Documentation.
- Agent Tests / Non-régression.

---

## 11. MCP

Le serveur MCP doit permettre à Claude Code d’accéder aux deux serveurs S1 et S2 via `wealthtech_ssh_bridge` ou un pont équivalent.

Première mission recommandée : audit global non destructif.

L’audit doit produire :

- Markdown ;
- HTML ;
- TXT ;
- JSON ;
- log des commandes ;
- archive `.tar.gz` téléchargeable.

Chemin recommandé :

```bash
/opt/wealthtech-audit-mcp/
```

---

## 12. EWARI / KOREE / Stablecoin

Le stablecoin XOF est adossé au Franc CFA de l’Afrique de l’Ouest. Il est envisagé comme monnaie électronique ou actif numérique stable dans un cadre réglementaire avec une institution financière partenaire.

Partenaire mentionné : WITTI FINANCES.

Rôle : WITTI FINANCES comme institution financière partenaire, WealthTech comme partenaire technique / fournisseur de solution.

Services :

- transferts d’argent ;
- paiements ;
- factures ;
- démarches administratives ;
- e-commerce ;
- OPCVM tokenisés ;
- crowdfunding ;
- épargne ;
- compte courant ;
- compte d’épargne ;
- crédit ;
- cartes ;
- paiements entreprises ;
- encaissements ;
- paiements fournisseurs ;
- impôts ;
- placements de trésorerie ;
- épargne salariale ;
- dispositifs ONG / institutions / mutuelles / associations.

---

## 13. Dossier BCEAO / agrément EME

Documents à produire :

A. Dispositif de contrôle interne.
B. Dispositif LCB/FT.
C. Procédure de gestion de la monnaie électronique.
D. Procédure relation clientèle.
E. Procédure réseau de distribution.
F. Procédure incidents et réclamations.
G. Formulaire d’enrôlement client.
H. Formulaire de création de monnaie électronique.
I. Formulaire de destruction de monnaie électronique.
J. Présentation détaillée de l’activité.
K. Projections financières sur 3 ans.
L. Investissements prévus.
M. Plan de financement.
N. Politique de coût.
O. Structure tarifaire.
P. Convention services monnaie électronique.
Q. Convention distributeur.
R. Convention marchand / accepteur.
S. Convention détenteur.
T. Convention facturier.

---

## 14. Smart contract stablecoin

Le contrat inclut notamment :

- ERC20 ;
- AccessControl ;
- Pausable ;
- EIP712 / Permit ;
- Escrow ;
- PullPayment ;
- `MINTER_ROLE` ;
- `PAUSER_ROLE` ;
- `BURNER_ROLE` ;
- `ASYNC_ROLE` ;
- `TRANSFER_ROLE` ;
- `TRANSFERFROM_ROLE` ;
- `PERMITER_ROLE`.

Point très important : le contrôle d’accès s’applique aussi aux transferts :

- `transfer` exige `TRANSFER_ROLE` ;
- `transferFrom` exige `TRANSFERFROM_ROLE`.

Toute documentation future doit corriger explicitement les versions incomplètes qui avaient omis ce point.

---

## 15. Point de reprise courant

Dernière action : compilation de la conversation dans `Patricked-code/MCP` sur `main`.

Action suivante : récupérer ce dépôt dans `/root/wealthtech_project_memory/memory/` sur le serveur WEALTHTECH, puis lancer l’audit MCP non destructif.
