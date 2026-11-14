# L12 — Continuité du projet à plusieurs étages : retour vers tout point historique

[← Racine](../README.md) · [Arbre de 133 nœuds](../04-continuity/DEEP_CONVERSATION_NODE_INDEX.md) · [Handoff courant](../08-assurance/CONTINUITY_HANDOFF.md)

## Arbre des identifiants

`Project UID → Corpus/autorité → Programme → Work item/Design → Continuity ID → Session/épisode (si applicable) → Event ID → Checkpoint ID → Evidence ID → NEXT_ACTION`.

Ce n'est **pas une généalogie de droits**. Les liens `parentOf`/`derivedFrom`/`supersedes`/`evidencedBy`/`operatedBy` restent distincts. Un ID de conversation de la PR #373 est **documentaire** ; un `governedSessionId` est **opérationnel**.

## Profondeur et récupération

| Niveau | Point d'interrogation | Autorité |
| --- | --- | --- |
| Racine | `WT-PROJECT-MCP-001` | GitRegistry candidate/identité, dépôt |
| Corpus fondateur | Juillet 2026, auteur/source/version | GitHub `memory/` et historique |
| Document | `GPT/SUIVI/ROADMAP` au SHA/date | GitHub |
| Programme | PCM, GWC, OAuth, GD-U, E2… | Roadmap et issues |
| Conception | Design/version/checkpoint d'approbation | Specs/decisions |
| Chantier | Issue, PR, branche, responsabilité | GitHub / Queue si applicable |
| Continuité | Continuity ID attesté | Issue/events/index existant |
| Événement | Journal d'action / commentaire source | Operational Memory/GitHub |
| Point de reprise | Checkpoint et NEXT_ACTION | Autorité de son domaine |
| Preuve | Commit SHA, run CI, deploy, runtime | GitHub et Live State |

## Exemple de requête en lecture seule

`WT-PROJECT-MCP-001 + view=FOUNDATIONS` : remonter aux fichiers de juillet et restituer leur ordre de lecture.

`WT-PROJECT-MCP-001 + view=CONTINUITY + continuity_id=MCP-PILOT-E2-01-CONT-20261030-ROOT-01` : retrouver l'issue #359 et les preuves E2 correspondantes, sans reprendre une session étrangère.

`WT-PROJECT-MCP-001 + view=CAPABILITIES` : lire le catalogue effectif et ses outils sous droits du principal, sans inférer des permissions.

`WT-PROJECT-MCP-001 + view=RUNTIME` : observer GitHub, S1 et image/health ; refuser toute attestation sur SHA manquant.

Ces requêtes expriment un **contrat cible** ; la fonction paramétrée sur le bridge nécessite encore un lot de code et des tests.

## Handoff permanent

Pour chaque intervention, laisser un événement et un checkpoint dans **l'autorité existante du travail** ; ce dossier Markdown pointe vers la preuve et ses descendants. Ne pas créer un « dernier checkpoint global » qui écrase les points de reprise parallèles. Les IDs restent durables même lorsque les sessions et les branches évoluent. Le périmètre de sources manquantes est toujours rendu explicite.
