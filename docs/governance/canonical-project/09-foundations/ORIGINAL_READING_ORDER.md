# L9 — Procédure fondatrice pilotée par les documents

[← Fondations](FOUNDING_DOCUMENTS.md) · [Loop Engineering](LOOP_ENGINEERING_METHOD.md) · [INTAKE moderne](../10-orchestration/PROJECT_SELF_WORKFLOW.md)

## Lecture originelle prescrite par le document fondateur

Le texte extrait du DOCX ordonne **avant toute action lourde** de lire, dans l'ordre :

| Ordre | Fichier historique | Objet de contrôle |
| --- | --- | --- |
| 01 | `GPT.md` | Règles permanentes de l'IA et périmètre |
| 02 | `SUIVI.md` | État, décisions et point de reprise |
| 03 | `README.md` | Identité et carte du projet |
| 04 | `README_DEV.md` | Environnement et développement |
| 05 | `ROADMAP.md` | Objectifs et jalons |
| 06 | `TODO.md` | Travaux ouverts |
| 07 | `TASKS.md` | Travaux structurés |
| 08 | `CODE_REVIEW.md` | Revue des changements |
| 09 | `CHANGELOG.md` | Historique des évolutions |
| 10 | `DEPLOYMENT_PRODUCTION.md` | Livraisons et production |
| 11 | `ARCHITECTURE.md` | Composants et relations |
| 12 | `DATABASE.md` | Schémas et risques de données |
| 13 | `MIGRATION.md` | Conditions de migration |
| 14 | `DOCKER.md` | Exécution conteneurisée |
| 15 | `SECURITY.md` | Protections |
| 16 | `AGENTS_ARCHITECTURE.md` | Rôles et frontières d'agents |
| 17 | `AI_SKILLS.md` | Compétences et limites |
| **18** | **`SUIVI.md#POINT DE REPRISE COURANT`** | **Relecture obligatoire du checkpoint** |

Le fondateur demande aussi d'avoir `KUBERNETES_FUTURE.md`, `MONITORING.md` et `BACKUP_RESTORE.md` dans le corpus de 20 documents. L'ordre ci-dessus correspond à la liste séquentielle de lecture du ``6` du DOCX, et non à une nouvelle règle universelle inventée.

## Passage vers la procédure actuelle du projet MCP

Le parcours prescrit aujourd'hui pour **Patricked-code/MCP** est celui de [`AGENTS.md`](https://github.com/Patricked-code/MCP/blob/main/AGENTS.md) : connexion GitHub → lecture des instructions → connexion au MCP selon les besoins → réconciliation GitHub/S1/runtime → découverte des travaux → **point de choix**.

**Raccord sans régression** : appliquer d'abord l'INTAKE courant, puis charger **en complément** les documents fondateurs au niveau adapté à la demande. En cas de contradiction, conserver la provenance et appliquer la gouvernance actuelle et l'autorité propriétaire du domaine ; ne jamais substituer silencieusement une instruction historique à une procédure contemporaine.

## Autorité documentaire : qui écrit quoi ?

| Élément | Entrée | Sortie | Propriétaire |
| --- | --- | --- | --- |
| Mémoire de travail | `SUIVI.md` | Checkpoint documenté | Gouvernance documentaire Git |
| Demandes | `TODO.md` / issues | Travail à instruire | GitHub/mandat |
| Planification | `ROADMAP.md`, programme backlog | Priorité et dépendances | Git versionné / calcul de readiness |
| Tâche runtime | Governed Task Queue | Statut Task exact | Operational Memory (pas fichier Markdown) |
| Décision | `DECISIONS_LOG.md` | Arbitrage avec origine | Historique versionné |
| Implémentation | Branche, PR, CI | Commit et fusion | GitHub |
| Réalité serveur | Live State | SHA et santé observés | Runtime S1 |
| Reprise | `SUIVI.md` + checkpoints certifiés | NEXT_ACTION bornée | Sources d'origine selon domaine |

## Interdiction d'un circuit concurrent

Ce fichier **ne remplace pas** `AGENTS.md` et ne crée ni nouvelle procédure E1/E2, ni nouveau type de session, ni tâche gouvernée. C'est la **restauration traçable de la procédure fondatrice**.
