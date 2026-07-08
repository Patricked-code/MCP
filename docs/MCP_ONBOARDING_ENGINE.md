# MCP Onboarding Engine

## Objectif

Le **MCP Onboarding Engine** transforme le MCP en superviseur central entre GitHub, les serveurs S1/S2, les dossiers projet et les agents IA. Il ne se limite pas à vérifier qu'un token GitHub est valide : il doit identifier qui se connecte, vérifier les droits, tracer la connexion, documenter les repositories, lier les repositories aux dossiers serveur, créer les profils d'agents et proposer les prochaines actions.

## Entrées principales

- Token MCP validé via `/login`.
- Identité déclarée au premier accès : `ChatGPT`, `ConfigCloud`, `Claude`, `Codex`, humain/admin, service automatique ou autre.
- Token GitHub fourni explicitement par l'utilisateur ou par une future GitHub App/OAuth.
- Dossier/repository connecté depuis ConfigCloud ou depuis le portail MCP.

## Règle de première connexion

Après validation du token MCP, le MCP doit demander :

```text
Qui êtes-vous ?
A. ChatGPT
B. ConfigCloud
C. Autre agent / service
```

Le choix détermine le workflow :

- **ChatGPT** : supervision, architecture, analyse, planification, documentation proposée, aucune écriture directe sans validation.
- **ConfigCloud** : connexion d'un répertoire, détection du repository Git, mapping repo ↔ serveur, vérification des fichiers `.mcp`, proposition de bootstrap.
- **Autre agent / service** : identification, droits minimaux par défaut, audit obligatoire, questions complémentaires.

## Workflow global

1. Vérifier le token MCP.
2. Créer une session web privée signée.
3. Identifier l'acteur connecté.
4. Vérifier si l'acteur est déjà connu du registre MCP.
5. Vérifier la présence d'un token GitHub.
6. Valider le token GitHub sans l'écrire dans Git ni dans les logs.
7. Détecter le compte GitHub, les organisations et les repositories visibles.
8. Tester les droits lecture/écriture/admin par repository.
9. Vérifier si chaque repository contient les fichiers de gouvernance MCP.
10. Vérifier si chaque repository est lié à un dossier serveur.
11. Créer ou mettre à jour le registre MCP local.
12. Poser uniquement les questions manquantes.
13. Générer les fichiers `.mcp` et Markdown sur une branche MCP dédiée si l'écriture est autorisée.
14. Préparer ou ouvrir une pull request.
15. Ne jamais écrire directement sur `main` sans validation.

## Routes à créer ou compléter

```text
GET  /git/onboarding
POST /git/onboarding/start
POST /git/onboarding/answer
GET  /git/accounts
GET  /git/accounts/:account
GET  /git/repos
GET  /git/repos/:owner/:repo
POST /git/repos/:owner/:repo/bootstrap
GET  /git/agents
POST /git/agents/create
GET  /git/audit
```

## Modules à créer

```text
src/onboarding/types.ts
src/onboarding/identity.ts
src/onboarding/rights.ts
src/onboarding/questions.ts
src/onboarding/repoFootprint.ts
src/onboarding/agents.ts
src/onboarding/serverMapping.ts
src/onboarding/audit.ts
src/onboarding/index.ts
```

## Questionnaire minimal

Chaque question doit avoir trois choix au maximum.

1. Qui se connecte ?
   - A. Humain / propriétaire
   - B. Agent IA : ChatGPT, Claude, Codex
   - C. Service automatique MCP

2. Quel rôle donner ?
   - A. Lecture seule
   - B. Gestion projet avec écriture contrôlée
   - C. SuperAdmin MCP

3. Que faire avec ce compte GitHub ?
   - A. Enregistrer seulement
   - B. Lier aux repos visibles
   - C. Lier repos + serveurs + agents

4. Que faire avec les repos visibles ?
   - A. Inventaire seulement
   - B. Vérifier et documenter
   - C. Vérifier, documenter et créer les mappings serveur

5. Si le repo est incomplet ?
   - A. Ne rien faire
   - B. Créer une branche de proposition
   - C. Corriger directement

6. Si un dossier serveur n'a pas de repo lié ?
   - A. Ignorer
   - B. Proposer un repo existant
   - C. Créer un nouveau repo GitHub

7. Qui peut écrire ?
   - A. Personne sans validation humaine
   - B. Agents autorisés sur branche MCP uniquement
   - C. Agents autorisés sur branche officielle

8. Quel agent doit documenter le projet ?
   - A. ChatGPT
   - B. Claude
   - C. Codex / agent technique

## État attendu d'une V1

La V1 doit être non destructive : elle doit lire, auditer, proposer, générer sur branche dédiée et demander validation humaine avant toute action sensible.
