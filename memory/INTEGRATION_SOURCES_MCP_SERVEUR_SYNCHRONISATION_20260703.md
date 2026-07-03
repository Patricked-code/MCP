# Integration Sources MCP / Serveur / Synchronisation - 2026-07-03

## Contexte

Recherche ciblee dans les sources locales liees a MCP, GitHub, serveur, synchronisation, `wealthtech_ssh_bridge`, Niakara et WealthTech.

Regles appliquees :

- scan secret sans affichage des lignes sensibles ;
- chemins sensibles ou contenus secret-like masques dans le registre serveur ;
- aucun script execute ;
- aucune modification application, Docker, Plesk, PM2 ou Git ;
- ecriture uniquement memoire/state/report.

## Resultats

- fichiers candidats : 30
- fichiers lus/extraits : 20
- fichiers exclus sensibles ou secret-like : 10

## Sources Importantes Lues

- `C:\Users\Koné ZIé Arouna\Documents\CLAUDE\Scheduled\synchronisation-wealthtech-mcp-github-serveur\SKILL.md`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_030718\RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.md`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_050258\wealthtech_mcp_global_audit.sh`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_050515\wealthtech_mcp_global_audit.sh`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_050829\wealthtech_mcp_global_audit.sh`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_050932\wealthtech_mcp_global_audit.sh`
- `C:\Users\Koné ZIé Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1`
- `C:\Users\Koné ZIé Arouna\Documents\Rapport serveur .txt`
- `C:\Users\Koné ZIé Arouna\Downloads\lancer_audit_wealthtech_mcp.ps1`
- `C:\Users\Koné ZIé Arouna\Documents\📌 WealthTech Innovation1.docx`
- `C:\Users\Koné ZIé Arouna\Downloads\Compte_rendu_CID_WealthTech_Innovations_Version_Amelioree.docx`
- `C:\Users\Koné ZIé Arouna\Documents\WEALTHTECH INNOVATIONS _CHAIN SOLUTIONS.docx`
- `C:\Users\Koné ZIé Arouna\Downloads\compte_rendu_Réunion_CID_WEALTHTECHINNOV.docx`
- `C:\Users\Koné ZIé Arouna\Downloads\CR_CID_WealthTech_Version_Institutionnelle.docx`
- `C:\Users\Koné ZIé Arouna\Downloads\CR_CID_WealthTech_Version_SMQ_Conforme.docx`
- `C:\Users\Koné ZIé Arouna\Documents\📌 WealthTech Innovations.docx`
- `C:\Users\Koné ZIé Arouna\Documents\Serveurs\mise à jours MCP.txt`
- `C:\Users\Koné ZIé Arouna\Documents\instrucion brut site web wealthtech.txt`
- `C:\Users\Koné ZIé Arouna\Downloads\WealthTech_Innovations_Reponse_Question_Avantages_Collaboration_Version_Complete.docx`
- `C:\Users\Koné ZIé Arouna\Documents\MCP2-Fichier\applymcpwrite.sh`

## Apports Nouveaux

### Synchronisation recurrente Claude / WealthTech / MCP / GitHub / Serveur

Source principale : `%USERPROFILE%\Documents\CLAUDE\Scheduled\synchronisation-wealthtech-mcp-github-serveur\SKILL.md`.

Apport :

- confirme l'objectif d'une tache recurrente de synchronisation WealthTech/MCP/GitHub/serveur ;
- mentionne l'espace cible futur `/opt/wealthtech-workspace` ;
- mentionne l'inventaire serveur `/opt/server-projects-inventory` ;
- confirme que la synchronisation doit verifier l'acces GitHub/MCP et produire une trace exploitable ;
- renforce le besoin de ne pas perdre la memoire entre Codex, Claude, ChatGPT et serveur.

### Audits locaux MCP et lanceurs Windows

Sources principales :

- `%USERPROFILE%\Documents\MCP\lancer_audit_wealthtech_mcp.ps1`
- `%USERPROFILE%\Downloads\lancer_audit_wealthtech_mcp.ps1`
- rapports locaux `MCP/audit_20260701_*`

Apport :

- confirme l'audit read-only S1/S2 via serveur MCP ;
- confirme que S1 heberge le MCP ;
- confirme la generation de rapports locaux et serveur ;
- ces scripts sont historiques et ne doivent pas etre rejoues sans validation.

### Outils d'ecriture MCP detectes

Source : `%USERPROFILE%\Documents\MCP2-Fichier\applymcpwrite.sh`.

Apport critique :

- le script vise a ajouter des outils d'ecriture au bridge MCP (`clean_s2`, `deploy_brvm_s2`, `run_command_s1/s2`) ;
- il reconstruit le conteneur du bridge MCP ;
- il est donc hors perimetre read-only et doit etre classe `dangereux_bloque_sans_validation`.

Decision :

- ne pas executer ce script ;
- ne pas activer d'outils d'ecriture MCP pendant le Loop Engineering documentaire ;
- tout outil d'ecriture doit exiger une validation explicite, un rapport de risque, une sauvegarde et un plan rollback.

### Documents WealthTech Institutionnels

Sources lues :

- `%USERPROFILE%\Documents\WEALTHTECH INNOVATIONS _CHAIN SOLUTIONS.docx`
- `%USERPROFILE%\Documents\WealthTech Innovation(s).docx`
- documents CID WealthTech dans Downloads

Apport :

- confirme le positionnement WealthTech Innovations / ChainSolutions comme socle de transformation technologique des societes de gestion ;
- confirme les solutions operationnelles : OPCVM/FundAfrica, BRVM Research, stablecoin/EWARI, reporting, automatisation, donnees ;
- renforce le contenu futur du site principal A4.

## Decisions De Plan

1. Ajouter la source `S21 - Sources MCP/Serveur/Synchronisation 20260703`.
2. Ajouter un gate explicite : `outils_ecriture_mcp_bloques_sans_validation`.
3. Ajouter au track `F0` une future verification des automations/synchronisations, sans execution destructive.
4. Ajouter au track `A4` les documents institutionnels WealthTech/ChainSolutions comme source de contenu site.
5. Maintenir l'exclusion du `package-lock.json` et des backups `src/tools/writeScoped.ts.bak.*` du commit memoire.

## Limites

- 10 fichiers ont ete exclus ou masques pour nom/contenu sensible.
- Les scripts MCP locaux n'ont pas ete executes.
- Les fichiers hors memoire sur le depot MCP ne sont pas traites dans ce travail.
- Le transcript ChatGPT externe reste non importe.
