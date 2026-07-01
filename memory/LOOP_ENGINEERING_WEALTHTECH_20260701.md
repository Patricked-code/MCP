# LOOP_ENGINEERING_WEALTHTECH_20260701.md

Date UTC : 2026-07-01
Projet : WEALTHTECH / MCP / Stablecoin / EWARI / KOREE / OPCVM
Statut : premiere implementation documentaire du Loop Engineering.

## Objectif

Creer une boucle permanente qui permet a Codex, Claude Code, ChatGPT ou tout agent MCP de reprendre le projet sans repartir de zero.

La boucle doit :

- lire la memoire ;
- comprendre le point de reprise ;
- inventorier ;
- analyser les risques ;
- proposer une action minimale ;
- executer uniquement ce qui est autorise ;
- tester ;
- documenter ;
- preparer la prochaine reprise.

## Regles absolues

- Ne jamais supprimer sans inventaire.
- Ne jamais modifier les domaines proteges S2.
- Ne jamais supprimer les originaux Stablecoin sur S2.
- Ne jamais afficher ni pousser de secrets.
- Ne jamais envoyer de transaction sans validation explicite.
- Ne jamais build, restart, commit ou push sans validation explicite quand la demande auto l'interdit.
- Toujours distinguer S1, S2, MCP, GitHub et applications.
- Toujours documenter la decision de reprise.

## Boucle 0 - Ingestion memoire

1. Lire `README.md`.
2. Lire `SUIVI_MEMORY.md`.
3. Lire `CODEX_AUTO_ANALYSIS_REQUEST.md`.
4. Lire `INDEX_MEMOIRE_WEALTHTECH_20260701.md`.
5. Lire `CONVERSATIONS_POUSSEES_20260701.md`.
6. Lire `LOOPBACK_WEALTHTECH_CURRENT.md`.
7. Lire le fichier metier correspondant au track choisi.

Sortie obligatoire :

- nouveaux elements detectes ;
- impact sur le plan ;
- impact sur le suivi ;
- risques ;
- prochaine etape sans regression.

## Boucle 1 - Audit global MCP / S1 / S2

Source principale :

- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`

Objectif :

- verifier l'etat S1/S2 sans modification ;
- classer domaines, dossiers, PM2, Docker, Passenger, Plesk, bases, backups, logs et ports ;
- produire un rapport sur le serveur MCP.

Interdictions :

- pas de suppression ;
- pas de restart ;
- pas de migration ;
- pas de modification Plesk ;
- pas de secrets affiches.

## Boucle 2 - Stablecoin E-WARI / 6BI-B

Sources principales :

- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `CODEX_HANDOFF_STABLECOIN_EWARI.md`
- `PROMPT_AUDIT_6BI_B.md`

Objectif :

- auditer le parcours Wallet avant transaction ;
- confirmer les fonctions appelees depuis `/profil/wallet/` ;
- verifier le passage par `/api/metaTransfer/` ;
- analyser abonnements, roles, quotas, commissions, limites, historiques et guards.

Interdictions :

- aucune transaction ;
- aucune modification code ;
- aucune interaction blockchain reelle ;
- ne pas utiliser `/profil/portefeuille/` comme route Wallet de reference.

## Boucle 3 - OPCVM / FundAfrica sans regression

Sources principales :

- `WEALTHTECH_PROJECT_MEMORY.md`
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`

Objectif :

- auditer exhaustivite VL ;
- verifier crons et donnees ;
- verifier performances, ratios, classements, categories, moyennes, devises et affichages ;
- produire un diagnostic sans regression.

Interdictions :

- pas de correction opportuniste ;
- pas de migration base ;
- pas de modification production sans validation.

## Boucle 4 - GitHub / MCP / audit trail

Objectif :

- garder une trace serveur et GitHub de la memoire ;
- synchroniser `Patricked-code/MCP` avec le serveur MCP ;
- preparer plus tard un depot prive `Patricked-code/WEALTHTECH` si valide.

Regle :

- les documents d'audit peuvent etre prepares ;
- aucun push ne doit etre fait si la demande automatique exige une validation explicite.

## Boucle 5 - Nettoyage / migration

Objectif :

- uniquement apres audit ;
- classer conserver / migrer / nettoyer ;
- commencer par ce qui est sans risque et documente.

Interdictions :

- pas de nettoyage S2 protege ;
- pas de suppression Stablecoin S2 ;
- pas de suppression de base sans validation et sauvegarde.

## Agents logiques

- Agent Memoire : lit, classe, met a jour le point de reprise.
- Agent Audit : inventorie sans modifier.
- Agent Stablecoin : audite 6BI-B sans transaction.
- Agent OPCVM : audite les donnees financieres sans regression.
- Agent DevOps : analyse PM2/Docker/Plesk sans restart.
- Agent Securite : verifie secrets et interdictions.
- Agent Documentation : met a jour index, suivi, registre.

## Point de reprise courant

La boucle actuelle est :

- Boucle 0 terminee : ingestion memoire et classement.
- Boucle suivante recommandee : choisir entre audit Stablecoin 6BI-B en lecture seule, audit global S1/S2 non destructif, ou audit OPCVM sans regression.
