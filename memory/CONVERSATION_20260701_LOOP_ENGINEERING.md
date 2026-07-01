# CONVERSATION_20260701_LOOP_ENGINEERING.md

Date UTC : 2026-07-01
Projet : WEALTHTECH
Contexte : lecture du fichier local "Loop Engineering Instructions.docx" et integration de la conversation dans la memoire persistante.

## Demande utilisateur

L'utilisateur demande de lire le document "Loop Engineering Instructions.docx", de proposer un plan d'action et les etapes pour commencer, en tenant compte du fait que Codex a un acces direct aux serveurs.

L'utilisateur demande aussi d'ajouter cette conversation au projet WEALTHTECH.

## Lecture du document

Le document impose une methode de travail appelee Loop Engineering pour l'ecosysteme WealthTech.

Principes principaux :
- ne jamais recommencer depuis zero ;
- lire la memoire projet avant toute action lourde ;
- identifier le point de reprise courant ;
- inventorier avant toute modification ;
- proteger les domaines critiques ;
- executer prudemment ;
- tester apres action ;
- documenter chaque intervention ;
- mettre a jour le point de reprise apres chaque boucle.

## Serveurs identifies

S1 :
- IP : 212.227.212.33
- Role : serveur principal, destination des migrations, serveur cible de l'ecosysteme.
- Hostname observe : crazy-mendel.

S2 :
- IP : 217.160.249.254
- Role : serveur source, migration et nettoyage selectif.
- Hostname observe : priceless-mayer.
- Acces confirme via les cles du service wealthtech_ssh_bridge.

## Domains S1 a conserver

- niakara.com
- www.niakara.com
- api.niakara.com
- wealthtechinnovations.com
- api.wealthtechinnovations.com
- stablecoin.wealthtechinnovations.com
- api.stablecoin.wealthtechinnovations.com
- blockchain.wealthtechinnovations.com
- tokenfactory.wealthtechinnovations.com
- wealthtechinnovation.com
- berebytours.com

## Domaines S2 proteges

- africafunds.chainsolutions.fr
- api.africafunds.chainsolutions.fr
- api.stablecoin.chainsolutions.fr
- stablecoin.chainsolutions.fr
- brvm.chainsolutions.fr
- bvmac.chainsolutions.fr
- chainsolutions.fr
- Funds.chainsolutions.fr
- api.funds.chainsolutions.fr

## Migrations prevues

- wealthtech.chainsolutions.fr vers V2.wealthtechinnovations.com
- evote.chainsolutions.fr vers evote.wealthtechinnovations.com
- api.evote.chainsolutions.fr vers api.evote.wealthtechinnovations.com
- itic4fima.chainsolutions.fr vers evaluations.wealthtechinnovations.com
- api.itic4fima.chainsolutions.fr vers api.evaluations.wealthtechinnovations.com
- stablecoin.chainsolutions.fr vers stablecoin.wealthtechinnovations.com
- api.stablecoin.chainsolutions.fr vers api.stablecoin.wealthtechinnovations.com

Important : stablecoin sur S2 doit etre copie vers S1, jamais supprime sur S2.

## Etat technique observe avant cette note

S1 :
- acces SSH direct confirme ;
- Plesk Obsidian present ;
- api-niakara en ligne via PM2 ;
- wealthtech_ssh_bridge actif dans Docker sur 127.0.0.1:8787 ;
- disque autour de 74%.

S2 :
- acces confirme via la cle du bridge ;
- Plesk Obsidian present ;
- disque autour de 92%, nettoyage prioritaire ;
- PM2 contient api-monolith, fundafrique-frontend, worker-data-import, worker-recalculation ;
- Docker contient brvm_app, chainsolutions, profil-investisseur, bvmac_app, bases Postgres et relayer OpenZeppelin ;
- certains conteneurs sont unhealthy et un Redis relayer redemarre en boucle.

## Decision de reprise

La prochaine boucle doit commencer par la stabilisation documentaire et l'inventaire controle :

1. Lire la memoire projet.
2. Consolider le point de reprise courant.
3. Verifier l'inventaire S1/S2.
4. Prioriser le nettoyage S2 car le disque est a 92%.
5. Ne supprimer aucune application avant inventaire detaille.
6. Ne jamais toucher les domaines proteges S2.
7. Preparer ensuite la migration WealthTech vers V2.wealthtechinnovations.com.
