# Index Migration

Ce repertoire contient les index de navigation et de reprise.

Il doit permettre a un agent ou a un humain de retrouver rapidement:

- les conversations sources;
- les documents de reference;
- les decisions;
- les prompts;
- les agents;
- les mappings serveur;
- les actions GitHub en attente;
- les prochaines etapes de l onboarding MCP.

## Registre des sources

- `SOURCE_REGISTRY.json` : inventaire genere des ressources locales, fichiers de migration et memoires deja presentes dans le depot.
- `SOURCE_INGESTION_STATUS.md` : synthese lisible du statut d ingestion, des doublons, des fichiers lus en texte et des fichiers qui exigent une extraction complementaire.
- `PDF_TEXT_AUDIT.json` : audit genere d extraction texte PDF, incluant les PDF directs et les PDF contenus dans les archives ZIP, sans texte brut.
- `PDF_TEXT_AUDIT_STATUS.md` : synthese lisible de l audit PDF, des pages/mots extraits, des doublons et des signaux d objectifs.
- `ARCHIVE_TEXT_AUDIT.json` : audit genere des entrees texte/DOCX/CSV/JSON/Markdown contenues dans les archives ZIP, sans texte brut.
- `ARCHIVE_TEXT_AUDIT_STATUS.md` : synthese lisible de la couverture texte des archives ZIP, des doublons, des mots extraits et des signaux de secrets.
- `OBJECTIVE_TRACEABILITY_MATRIX.json` : matrice generee des objectifs compris, preuves locales, signaux sources, blocages et prochaines actions.
- `OBJECTIVE_TRACEABILITY_MATRIX.md` : synthese lisible de la matrice objectifs/actions pour revue humaine et reprise MCP.
- `MCP_EXECUTION_TASKS.json` : plan genere de taches executables MCP, dependances, blocages, preuves attendues et commandes de verification.
- `MCP_EXECUTION_TASKS.md` : synthese lisible des taches pretes, bloquees et des gates de non-regression.
- `BLOCKER_RESOLUTION_RUNBOOK.json` : runbook genere de resolution des blocages restants, criteres d acceptation et commandes de reprise.
- `BLOCKER_RESOLUTION_RUNBOOK.md` : synthese lisible des blocages, actions externes, preuves attendues et commandes apres resolution.
- `BLOCKER_EVIDENCE_GATE.json` : gate public-safe des preuves de resolution des blocages, etat des issues, criteres couverts et raisons manquantes.
- `BLOCKER_EVIDENCE_GATE.md` : synthese lisible des preuves attendues avant qu un blocage soit considere leve par l audit de completude.
- `../evidence/README.md` : consignes operateur pour publier une preuve public-safe sans fuite de secrets ou inventaire prive.
- `../evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json` : gabarit a copier vers `PUBLIC_SAFE_BLOCKER_EVIDENCE.json` lorsque les preuves operateur existent.
- `COMPLETION_AUDIT.json` : audit genere de completude objectif par objectif, avec preuves, statuts, blocages et decision de cloture.
- `COMPLETION_AUDIT.md` : synthese lisible de ce qui est prouve, partiel, bloque ou non encore clos.
- `OPERATOR_ACTION_PACK.json` : paquet genere d actions operateur et corps d issues publics pour lever les blocages restants.
- `OPERATOR_ACTION_PACK.md` : synthese lisible des actions operateur, checklists, criteres d acceptation et regles de securite.
- `OPERATOR_ACTION_ISSUE_LOG.json` : journal public-safe des issues GitHub creees pour suivre les actions operateur.
- `OPERATOR_ACTION_ISSUE_LOG.md` : synthese lisible des issues de suivi, etat, URLs et regles de securite.
- `RESUME_GATE.json` : gate genere indiquant si les travaux MCP bloques peuvent reprendre selon issues, blocages, taches et completude.
- `RESUME_GATE.md` : synthese lisible de la decision de reprise, raisons, checks et commandes lorsque les blocages seront leves.
- `EXECUTION_RUNWAY.json` : sequence publique-safe des phases d application, taches, prerequis, preuves de sortie et blocages.
- `EXECUTION_RUNWAY.md` : synthese lisible des etapes executables maintenant, bloquees ou dependantes du gate de reprise.

Ces fichiers ne publient pas les textes bruts ni les secrets. Ils servent de preuve de lecture/indexation et de garde-fou avant toute ingestion plus exhaustive.

## Commande de regeneration

- `npm run migration:governance` : regenere les index publics, synchronise l etat des issues operateur, puis lance les tests et controles de non-regression.
- `npm run migration:governance:list` : affiche l ordre exact des etapes sans les executer.
