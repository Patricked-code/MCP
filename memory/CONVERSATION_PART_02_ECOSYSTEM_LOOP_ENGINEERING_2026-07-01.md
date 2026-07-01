# Conversation compilée — Partie 02 — Écosystème WealthTech et Loop Engineering

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`

## 1. Écosystème cible

Les domaines suivants ont vocation à former une seule application ou un seul écosystème intégré :

```text
wealthtechinnovations.com
api.wealthtechinnovations.com
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
blockchain.wealthtechinnovations.com
tokenfactory.wealthtechinnovations.com
V2.wealthtechinnovations.com
evote.wealthtechinnovations.com
api.evote.wealthtechinnovations.com
evaluations.wealthtechinnovations.com
api.evaluations.wealthtechinnovations.com
```

La version fonctionnelle la plus avancée est le module Stablecoin. Elle doit servir de référence stratégique et technique.

## 2. Architecture cible

L’objectif est de construire progressivement :

- une application principale unifiée ;
- un frontend harmonisé ;
- une API backend modulaire ;
- une base de données commune ou étendue ;
- une architecture microservices progressive ;
- une conteneurisation Docker ;
- une trajectoire Kubernetes future ;
- Redis pour cache, sessions, queues et workers ;
- ClickHouse pour analytics, logs, reporting et requêtes lourdes ;
- monitoring et journalisation ;
- documentation persistante ;
- processus de non-régression.

Technologies de référence :

```text
Backend : Node.js
Base principale : MySQL
Moteur analytique : ClickHouse
Frontend : Next.js
Architecture : modulaire
Design : Atomic Design
Microservices : progressifs
Conteneurisation : Docker
```

## 3. Documentation obligatoire

Fichiers à maintenir :

```text
GPT.md
SUIVI.md
README.md
README_DEV.md
ROADMAP.md
TODO.md
TASKS.md
CODE_REVIEW.md
CHANGELOG.md
DEPLOYMENT_PRODUCTION.md
SECURITY.md
MCP_TOOLS.md
AGENTS_ARCHITECTURE.md
AI_SKILLS.md
```

`SUIVI.md` est le fichier central. Il doit contenir :

```md
# POINT DE REPRISE COURANT
```

Cette section doit être mise à jour après chaque action importante.

## 4. Ordre de lecture avant intervention

Avant toute action : lire `GPT.md`, `SUIVI.md`, le `POINT DE REPRISE COURANT`, puis les fichiers README, roadmap, tâches, revue de code, changelog, déploiement, sécurité, outils MCP, architecture agents et compétences IA.

## 5. Loop Engineering

Objectif : permettre à des agents IA de travailler durablement sans perdre le contexte, sans recommencer depuis zéro et sans casser la production.

Boucle standard :

```text
1. Lire la mémoire projet.
2. Lire le POINT DE REPRISE COURANT.
3. Identifier l’objectif de session.
4. Identifier le serveur, le domaine et le module.
5. Inventorier l’existant.
6. Évaluer les risques.
7. Appliquer uniquement une action autorisée.
8. Tester.
9. Documenter.
10. Mettre à jour SUIVI.md.
11. Mettre à jour CHANGELOG.md.
12. Mettre à jour TODO.md / TASKS.md.
13. Mettre à jour le POINT DE REPRISE COURANT.
14. Préparer la prochaine action.
```

## 6. Agents IA recommandés

- Agent Architecte Écosystème.
- Agent Migration.
- Agent Sécurité.
- Agent Documentation.
- Agent DevOps / Docker.
- Agent Base de données.
- Agent Blockchain / Stablecoin.
- Agent Audit et Non-Régression.
- Agent Monitoring / Analytics.
- Agent Nettoyage Serveur.

## 7. Règles de prudence

Toute action doit être précédée d’un inventaire et d’une documentation. Les domaines protégés ne doivent pas être modifiés. Les données confidentielles ne doivent pas être ajoutées aux fichiers GitHub.
