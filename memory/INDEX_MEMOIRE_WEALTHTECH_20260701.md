# INDEX_MEMOIRE_WEALTHTECH_20260701.md

Date UTC : 2026-07-01
Projet : WEALTHTECH / MCP / Stablecoin / EWARI / KOREE
Destination serveur : `/root/wealthtech_project_memory/memory/`

## Objet

Ce fichier classe les fichiers de memoire afin qu'un agent IA puisse comprendre l'objectif, la demarche, les actions deja faites et les prochaines etapes sans repartir de zero.

## Lecture rapide obligatoire

Ordre minimal avant toute intervention :

1. `README.md`
2. `SUIVI_MEMORY.md`
3. `CODEX_AUTO_ANALYSIS_REQUEST.md`
4. `CONVERSATIONS_POUSSEES_20260701.md`
5. `LOOPBACK_WEALTHTECH_CURRENT.md`
6. `LOOP_ENGINEERING_WEALTHTECH_20260701.md`
7. `SUIVI.md`

## Comprendre l'objectif general

- `WEALTHTECH_CONVERSATION_COMPILED.md` : objectif global, architecture cible, serveurs, migrations et Loop Engineering.
- `WEALTHTECH_PROJECT_MEMORY.md` : memoire WealthTech / OPCVM / MCP, priorites FundAfrica/OPCVM, regles sans regression.
- `GPT.md` : role permanent de l'IA et regles absolues.
- `README.md` : carte courte des fichiers et priorites.

## Comprendre les conversations poussees

- `CONVERSATIONS_POUSSEES_20260701.md` : liste centrale des conversations importees ou reintegrees.
- `CONVERSATION_COMPILED_INDEX_2026-07-01.md` : index original des conversations compilees.
- `CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md` : MCP, S1, S2, migrations.
- `CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md` : ecosysteme cible et methode Loop Engineering.
- `CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md` : EWARI / KOREE / Stablecoin.
- `CONVERSATION_20260701_LOOP_ENGINEERING.md` : note Codex issue de la lecture du DOCX Loop Engineering.

## Comprendre Stablecoin E-WARI

- `2026-05-05-stablecoin-ewari-conversation-memory.md` : memoire stablecoin detaillee.
- `CODEX_HANDOFF_STABLECOIN_EWARI.md` : reprise operationnelle.
- `PROMPT_AUDIT_6BI_B.md` : prochaine etape stablecoin : audit metier pre-transaction, sans transaction.

Regles Stablecoin majeures :

- vraie route Wallet : `/profil/wallet/` ;
- faux miroir a traiter plus tard : `/profil/portefeuille/` ;
- prochaine etape : 6BI-B audit metier pre-transaction ;
- aucune transaction sans validation explicite ;
- ne jamais supprimer les originaux Stablecoin sur S2.

## Comprendre OPCVM / FundAfrica

- `WEALTHTECH_PROJECT_MEMORY.md` : contexte OPCVM et priorites metier.
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md` : audit OPCVM sans regression.

Priorites OPCVM :

- exhaustivite des VL ;
- crons ;
- coherence des donnees ;
- ratios et performances ;
- multi-devises ;
- affichages ;
- aucune regression sur la production.

## Comprendre MCP et synchronisation serveur

- `MCP_INSTALLATION_AND_SERVER_SYNC_2026-07-01.md` : runbook de synchronisation memoire serveur MCP.
- `INSTALL_MCP_WEALTHTECH_MEMORY.md` : installation/synchronisation historique.
- `INSTALLATION_MCP_WEALTHTECH.md` : installation complete et sync automatique.
- `INSTALL_ON_WEALTHTECH_SERVER.md` : installation depuis le serveur.
- `manifest.json` : manifeste initial de la memoire.
- `CODEX_AUTO_ANALYSIS_REQUEST.md` : demande automatique d'analyse Codex apres sync.
- `SUIVI_MEMORY.md` : suivi des synchronisations MCP vers serveur.

## Comprendre audit S1/S2

- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md` : prompt d'audit global non destructif S1/S2.
- `RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md` : review globale a lire avant action.

Regles S1/S2 :

- S1 : `212.227.212.33`, serveur cible.
- S2 : `217.160.249.254`, serveur source/protege.
- audit avant modification ;
- nettoyage uniquement apres inventaire ;
- pas de restart, build, commit, push ni suppression sans validation explicite.

## Fichiers crees par cette boucle Codex

- `CONVERSATIONS_POUSSEES_20260701.md`
- `INDEX_MEMOIRE_WEALTHTECH_20260701.md`
- `INVENTAIRE_FICHIERS_CREES_20260701.md`
- `CODEX_AUTO_ANALYSIS_RESPONSE_20260701.md`
- `LOOP_ENGINEERING_WEALTHTECH_20260701.md`
- `LOOPBACK_WEALTHTECH_CURRENT.md`

## Prochaine lecture logique

Pour continuer sans regression :

1. Lire `LOOPBACK_WEALTHTECH_CURRENT.md`.
2. Choisir le track : audit global, stablecoin 6BI-B, ou OPCVM.
3. Executer uniquement des commandes lecture seule tant qu'une action dangereuse n'est pas explicitement validee.
