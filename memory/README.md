# Mémoire projet WealthTech / MCP

Ce dossier contient la mémoire persistante lisible par Codex, ChatGPT ou tout agent MCP intervenant sur les projets WealthTech.

## Fichiers déjà présents

1. `2026-05-05-stablecoin-ewari-conversation-memory.md`  
   Mémoire consolidée de la conversation et du travail validé sur le projet Stablecoin E-WARI.

2. `CODEX_HANDOFF_STABLECOIN_EWARI.md`  
   Contexte prêt à copier dans Codex pour reprendre le travail sans perdre le fil.

3. `PROMPT_AUDIT_6BI_B.md`  
   Prompt de prochaine étape : audit métier pré-transaction Wallet / Relayer / Abonnement / Rôle / Commission, sans transaction.

4. `INSTALL_MCP_WEALTHTECH_MEMORY.md`  
   Instructions historiques pour cloner ou synchroniser ce dépôt dans `/root/wealthtech_project_memory/memory/` sur le serveur.

## Fichiers ajoutés pour OPCVM / FundAfrica / WealthTech

5. `WEALTHTECH_PROJECT_MEMORY.md`  
   Mémoire consolidée de la conversation et des règles projet WealthTech / OPCVM / MCP.

6. `INSTALLATION_MCP_WEALTHTECH.md`  
   Procédure actuelle pour synchroniser le dossier `memory/` vers `/root/wealthtech_project_memory/memory/` sur le serveur.

7. `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`  
   Prompt d’audit OPCVM/FundAfrica sans régression : VL, crons, performances, ratios, classements, catégories, moyennes, affichages, devises et anomalies.

## Règle obligatoire

Avant toute intervention sur un projet WealthTech, lire au minimum ce README et les fichiers de mémoire correspondant au module concerné.

Pour le module OPCVM/FundAfrica, lire impérativement :

- `WEALTHTECH_PROJECT_MEMORY.md` ;
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md` ;
- la documentation applicative du projet réel : `CLAUDE.md`, `SUIVI.md`, `README_DEV.md`, `ROADMAP.md`, `TASKS.md`, `TODO.md`, `CODE_REVIEW.md`, `CHANGELOG.md`, `DEPLOYMENT_PRODUCTION.md` ;
- le `POINT DE REPRISE COURANT` dans `SUIVI.md`.

## Règles de prudence

- Ne pas stocker de paramètres sensibles dans ce dossier.
- Ne pas stocker de fichiers d’environnement réels.
- Ne pas stocker de sauvegardes serveur ou de dumps de base.
- Utiliser ces fichiers comme mémoire de travail, documentation et point de reprise.
- Mettre à jour ces fichiers dès qu’une consigne structurante est ajoutée.

## Emplacement serveur cible

```text
/root/wealthtech_project_memory/memory/
```

## Priorité actuelle OPCVM

La priorité actuelle est l’audit OPCVM/FundAfrica sans régression :

- exhaustivité des VL par pays de 2021 à 2026 au minimum ;
- vérification des crons ;
- validation des insertions ;
- recalcul des performances ;
- recalcul des ratios ;
- recalcul des classements nationaux et régionaux ;
- cohérence des catégories et positionnements ;
- moyennes de catégories ;
- comparaisons entre fonds ;
- cohérence des onglets devise locale, EUR et USD ;
- affichages front-end ;
- barres visuelles bleues ;
- gestion propre des valeurs `null`, `NaN`, `Infinity` et non calculables.

---

## Ajouts Codex du 2026-07-01

Codex a cree les fichiers de reprise suivants pour demarrer le Loop Engineering WEALTHTECH :

- `CONVERSATIONS_POUSSEES_20260701.md`
- `INDEX_MEMOIRE_WEALTHTECH_20260701.md`
- `INVENTAIRE_FICHIERS_CREES_20260701.md`
- `CODEX_AUTO_ANALYSIS_RESPONSE_20260701.md`
- `LOOP_ENGINEERING_WEALTHTECH_20260701.md`
- `LOOPBACK_WEALTHTECH_CURRENT.md`

Pour reprendre sans contexte oral, lire d'abord :

1. `INDEX_MEMOIRE_WEALTHTECH_20260701.md`
2. `CONVERSATIONS_POUSSEES_20260701.md`
3. `LOOPBACK_WEALTHTECH_CURRENT.md`
4. `LOOP_ENGINEERING_WEALTHTECH_20260701.md`
