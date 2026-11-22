# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Mémoire canonique hiérarchique de mission

> Portée : **la mission de résolution des registres**, pas la mémoire globale MCP ni la mémoire de son sous-chantier. Cette page référence les sources vérifiables, sans recopier des conversations privées ni dupliquer GitRegistry/Operational Memory.

## Identité et ancrage

- `continuityId` : `WT-MCP-REGISTRY-RESOLUTION-20261121-01`.
- `parentProjectRepository` : `Patricked-code/MCP` ; `projectUidCandidate` : `WT-PROJECT-MCP-001`.
- `child` : `WT-MCP-AUTONOMY-24X7-20261121-01`, possède sa propre `__MEMORY.md` et `__CONTINUITY.md`.
- **Ancrage non réécrivable D32** : section de `__CONTINUITY.md` intitulée « ANCRAGE NON RÉÉCRIVABLE — avant la parenthèse G1/E2 » ; source initiale [commentaire PR #430 #7068870350](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350).
- Mandat original : `__MISSION.md` (R01–R07), `__IMPLEMENTATION_PLAN.md` (RG-001…056), `__ROADMAP.md` (P01–P17).
- Fichier documentaire historique reçu `Loop Engineering.docx`, SHA-256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, étudié dans `__SOURCE_READING_LOOP_ENGINEERING_20261121.md` ; **l'original intégral n'est pas publié dans ce dossier**.

## Chronologie retrouvable — points d'appui, pas une transcription complète

| Séquence | Source consultable | Signification et limite |
| --- | --- | --- |
| 21/11 mandat initial + préparation P1 | [PR #430](https://github.com/Patricked-code/MCP/pull/430), commentaire #7068870350 | R01–R07, RG-001…056, P0–P7, couverture de départ, UID et sous-chantier |
| 21/11 fondation fédérée | [PR #431](https://github.com/Patricked-code/MCP/pull/431) | Projection read-only des autorités ; pas d'API mission universelle |
| 21/11 audit P1→P2 | [commentaire #7070637056](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7070637056) | P1 documentaire livrée, exhaustivité runtime non acquise |
| 22/11 rapprochement des identités | [PR #442](https://github.com/Patricked-code/MCP/pull/442) | Crosswalk fail-closed ; aucun ProjectRecord créé |
| 22/11 réconciliation G1 | [PR #443](https://github.com/Patricked-code/MCP/pull/443), [attestation #7071333389](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071333389) | Déploiement vérifié à date ; pas validation des admissions P2 |
| 22/11 instructions complémentaires | [PR #444](https://github.com/Patricked-code/MCP/pull/444), [checkpoint #7071817713](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071817713) | D36 sans Codex/automation suspendue, D37 scopes séparés, D38 mémoire/intention/priority ; **branch-only tant que PR ouverte** |

## Où trouver quoi

- **Ce qui a été demandé** : `__INTENTIONS.md` et pièces sourcées ; seules les intentions réellement accessibles et capturées sont attestées.
- **Ce qui a été décidé** : `__DECISIONS.md` ; références D32–D38.
- **Ce qui s'est passé** : `__SUIVI.md`, `__CONTINUITY.md`, `__EVIDENCE_INDEX.md`.
- **Ce qui doit être fait** : `__TODO.md`, `__TASKS.md`, `__ROADMAP.md` ; autorité des TASK-* runtime = Queue uniquement.
- **Comment rejoindre** : `__AGENTS.md`, `__SOURCE_OF_TRUTH.md` et `__DOCUMENT_AUTHORITIES.md`.

## Garanties et limites de mémoire

Git conserve l'historique des versions et les PR/issues conservent des commentaires tant qu'ils restent accessibles ; aucun mécanisme actuel ne garantit la copie intégrale de toutes les conversations ChatGPT dans GitHub. Une intention nouvellement reçue par un agent disposant d'accès doit être classifiée puis enregistrée avec preuve, sans inventer des échanges absents. Les versions historiques incorrectes sont **datées et superseded**, jamais supprimées. Une preuve à réobserver reste `UNVERIFIED`, même lorsqu'une ancienne attestation mentionne `FULLY_ALIGNED`.

**NEXT_ACTION_LOCAL** : P2 — valider Project Binding/GitRegistry/CUG, puis implémenter et tester le résolveur de documents/intentions/tâches par Continuity ID et les NEXT_ACTION propres à chaque mission ; ne pas réactiver l'automatisation horaire.

## 2026-11-22 — D39 : correction des autorités de reprise (successeur)

- Checkpoint canonique [#7073160993](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7073160993), fusions #444/#445/#446 attestées et SHA GitHub/S1/runtime `b843818df0b00125f9dd319ab2f4b99b169f5892` ; Live State v1458.
- Les deux appels MCP `mcp_rejoin_continuity` ont retourné PARTIAL : mère 17 documents et D01–D39 paginées ; enfant 13 documents et 0 A24 malgré `__DECISIONS.md`. Aucun Task ID réel, ProjectRecord admis ni exécution automatique.
- Correction #447 additivement développée sur sa branche ; niveaux CODE_BRANCH_ONLY, CI et runtime distincts. Le texte des intentions/documentaires n'autorise jamais une Task.
- Les sources D32/D35–D39, la mémoire du parent et celle de l'enfant demeurent séparées et append-only ; aucun état historique n'a été effacé.
