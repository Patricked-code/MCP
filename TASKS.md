# TASKS.md

## Role
Plan operationnel executable du MCP.

## Taches immediates
- TASK-20260709-001 : finaliser les fichiers Markdown racine manquants.
- TASK-20260709-002 : comparer racine, docs/ et memory/ sans ecrasement.
- TASK-20260709-003 : preparer docs/projects/<projet>/ pour les projets integres.
- TASK-20260709-004 : auditer les fichiers .mcp/*.json.
- TASK-20260709-005 : produire un rapport final et commit documentaire.

## Regle
Une tache executable doit indiquer objectif, fichiers concernes, risques, preconditions, tests et resultat attendu.

## TASK-20260713-001 — Bootstrap de la mémoire documentaire MCP

Statut : prêt pour revue humaine
Priorité : haute
Projet : WealthTech MCP SSH Bridge
Dépôt : `Patricked-code/MCP`
Serveur : S1
Domaine : domaine MCP public, sans action de production
Objectif : vérifier la double présence, combler le fichier racine manquant, enrichir les documents courts, créer le modèle enfant et produire le rapport.
Contexte : audit initial effectué sur GitHub `main` et sur le checkout S1 propre et aligné.
Fichiers concernés : documentation Markdown uniquement ; aucune modification applicative ou `.mcp`.
Risques : information historique prise pour actuelle, modèle projet utilisé sans audit, mélange avec une branche existante.
Préconditions : branche isolée issue de `origin/main`, état S1 propre, lecture des règles et du point de reprise.
Étapes : audit, diagnostic, consolidation, modèle, validation, suivi, rapport.
Tests : fichiers obligatoires, sections modèles, JSON `.mcp`, `docs:check`, scan secrets, `git diff --check`.
Résultat attendu : 49/49 fichiers racine, modèle projet complet, rapport et point de reprise précis.
Décision requise : approuver le diff avant commit/push/PR ; aucun merge ou déploiement automatique.
Lien vers SUIVI.md : `SUIVI.md`


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z
