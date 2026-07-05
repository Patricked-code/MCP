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

Ces fichiers ne publient pas les textes bruts ni les secrets. Ils servent de preuve de lecture/indexation et de garde-fou avant toute ingestion plus exhaustive.
