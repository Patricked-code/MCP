# L9 — Corpus fondateur Loop Engineering (juillet 2026)

[← Racine](../README.md) · [Ordre documentaire original](ORIGINAL_READING_ORDER.md) · [Boucle d'origine](LOOP_ENGINEERING_METHOD.md)

> **COLLECTION HISTORIQUE SOURCÉE.** Le corpus fondateur original porte sur **l'écosystème WealthTech** et non uniquement sur le projet logiciel MCP. Le Project UID candidat `WT-PROJECT-MCP-001` doit lier ces documents, mais **ne doit pas réinterpréter les anciennes priorités multi-projets comme mandat actif d'intervention sur S1/S2**. Les références ci-dessous proviennent de `main` ; leur contenu et leur SHA doivent être recontrôlés lors d'une révision.

## A. Les quatre pièces fondatrices centrales

| Rôle | Pièce conservée dans le dépôt | Contribution historique |
| --- | --- | --- |
| **Document fondateur** | [`memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md) | Extraction de **669 paragraphes** du Word `Loop Engineering Instructions.docx` ; discipline, ordre de lecture, mémoire permanente, 10 phases et agents |
| **Master Plan** | [`memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md) | Objectifs, contraintes et tracks historiques |
| **Playbook** | [`memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md) | Entrée, séquence de reprise, définition de DONE par boucle et risques |
| **Traçabilité sources → exigences → tracks** | [`memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md) | 15 exigences R01…R15 reliées aux sources, non assimilées à des fonctionnalités livrées |

L'original Word local est **une provenance historique**, pas une pièce accessible automatiquement aux agents via GitHub ; la version Markdown extraite dans le dépôt est le **point de lecture reproductible**. Le SHA256 conservé dans l'en-tête de l'extraction est une provenance du document local, pas un hash du runtime.

## B. Documents d'amorçage et mémoire persistentielle

| Source vérifiable | Pourquoi la lire |
| --- | --- |
| [`memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md`](https://github.com/Patricked-code/MCP/blob/main/memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md) | Index initial des conversations, documents et premier ordre de reprise |
| [`memory/LOOP_ENGINEERING_WEALTHTECH_20260701.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_20260701.md) | Méthode initiale mise en forme |
| [`memory/CONVERSATION_20260701_LOOP_ENGINEERING.md`](https://github.com/Patricked-code/MCP/blob/main/memory/CONVERSATION_20260701_LOOP_ENGINEERING.md) | Trace de lecture/élaboration |
| [`memory/INTEGRATION_DOCS_AGENTS_LOOP_ENGINEERING_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/INTEGRATION_DOCS_AGENTS_LOOP_ENGINEERING_20260702.md) | Recensement initial : **20 documents** et **9 fiches d'agents**, alors principalement génériques |
| [`memory/LECTURE_CONSOLIDEE_SOURCES_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LECTURE_CONSOLIDEE_SOURCES_20260702.md) | Inventaire des pièces lues |
| [`memory/LOOPBACK_WEALTHTECH_CURRENT.md`](https://github.com/Patricked-code/MCP/blob/main/memory/LOOPBACK_WEALTHTECH_CURRENT.md) | Point de retour historique — **pas l'état live** |
| [`memory/SUIVI_MEMORY.md`](https://github.com/Patricked-code/MCP/blob/main/memory/SUIVI_MEMORY.md) | Journal de mémoire initial |
| [`memory/manifest.json`](https://github.com/Patricked-code/MCP/blob/main/memory/manifest.json) | Inventaire historique de fichiers mémorisés |
| [`memory/INTEGRATION_MEMOIRE_ROOT_ONLY_20260702.md`](https://github.com/Patricked-code/MCP/blob/main/memory/INTEGRATION_MEMOIRE_ROOT_ONLY_20260702.md) | Intégration des sources historiques côté serveur, à revalider avant toute opération actuelle |

## C. Les 20 documents pilotes de la procédure initiale

Le corpus recensé le 02/07 comprenait `GPT.md`, `SUIVI.md`, `README.md`, `README_DEV.md`, `ROADMAP.md`, `TODO.md`, `TASKS.md`, `CODE_REVIEW.md`, `CHANGELOG.md`, `DEPLOYMENT_PRODUCTION.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DOCKER.md`, `KUBERNETES_FUTURE.md`, `SECURITY.md`, `MONITORING.md`, `BACKUP_RESTORE.md`, `MIGRATION.md`, `AGENTS_ARCHITECTURE.md`, `AI_SKILLS.md`. Leurs versions sous [`docs/`](https://github.com/Patricked-code/MCP/tree/main/docs) restent consultables.

**Ne pas confondre** ces documents de démarrage avec les documents de même nom situés à la racine du MCP, modifiés ultérieurement : qualifier explicitement le chemin et la révision. [Ordre original et fonctions](ORIGINAL_READING_ORDER.md).

## D. Périmètre de fidélité

- **Preserve** l'ordre de lecture, les interdictions historiques, la mémoire de reprise, les preuves et la boucle.
- **Ne réactive pas** les consignes historiques de suppression, migration ou déploiement ; ces actes demandent audit, ownership, sécurité et autorisation actuels.
- **N'assimile pas** l'historique du projet WealthTech à l'histoire exhaustive du code MCP ; plusieurs projets coexistaient dans le corpus.
- **Ne réécrit pas** les 669 paragraphes dans cet index : lire la source primaire, vérifier son intégrité et conserver sa provenance.
- **Ne promet pas** de récupérer les échanges externes jamais capturés : documenter les lacunes.
