# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Journal local des intentions

> Registre **documentaire append-only** des intentions significatives de la mission, non équivalent aux événements CUG, à Operational Memory ou aux Task Records runtime. Les formulations ci-dessous sont des **paraphrases de sources identifiées** et non des citations verbatim de conversations non disponibles. Conserver date, source, classification, ownerScope, RG liée, décision, état et succession. Un nouvel événement ne modifie aucune autorité runtime par sa seule existence.

## Format obligatoire pour toute entrée

`IntentId | ObservedAt/Date | SourceRef | OwnerScope | Class | OriginalAvailable? | Statement/Paraphrase | LinksTo(RG,Decision,Task/PR) | Impact | State | Supersedes | NextActionRef`

Classes : `NEW`, `COMPLEMENT`, `DUPLICATE`, `DECISION`, `CONTRADICTION`, `EVIDENCE`, `OUT_OF_SCOPE`. États : `CAPTURED`, `CLASSIFIED`, `PLANNED`, `IMPLEMENTED_PARTIAL`, `ATTESTED`, `BLOCKED`, `SUPERSEDED`. État des tâches runtime hors de portée.

## Entrées historiques reliées — mission uniquement

| IntentId | Date / source | Objet paraphrasé | Rattachement | État documentaire |
| --- | --- | --- | --- | --- |
| `REG-INT-001` | 21/11/2026, [#7068870350](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350), [MISSION](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__MISSION.md) | Résoudre registres dispersés, relier CUG/GitRegistry/P2/Insights/cockpit sans deuxième autorité | R01–R07, RG-001…035 ; D01–D09 | `IMPLEMENTED_PARTIAL` — #431/#442 livrées, intégration manquante |
| `REG-INT-002` | 21/11/2026, analyse DOCX [SOURCE_READING](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md) | Enrichir même mission par Loop Engineering, graphes, hôte autonome C26/C27 isolé | RG-036…056 ; enfant `WT-MCP-AUTONOMY-24X7-20261121-01` | `PLANNED` — source étudiée, worker non certifié |
| `REG-INT-003` | 21/11/2026, [D32 et ancrage](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__CONTINUITY.md) | Préserver point avant parenthèse G1/E2 et priorité RG ; aucun effacement des jalons | D31/D32 ; RG-001…056 | `ATTESTED` documentaire |
| `REG-INT-004` | 22/11/2026, [D35/#442](https://github.com/Patricked-code/MCP/pull/442) | Reprendre sans consigne à chaque lot admissible ; consigner décisions et checkpoints | D35 ; RG-011/023/034/035 | `CLASSIFIED` — décision versionnée, automatisation universelle non prouvée |
| `REG-INT-005` | 22/11/2026, [checkpoint D37](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071621892) | Chaque projet/sous-projet/mission doit avoir ses tâches, mémoire et NEXT_ACTION propres ; fédération sans mélange | D37 ; RG-008…029/043…054 | `PLANNED` — contrat documentaire, branche #444 |
| `REG-INT-006` | 22/11/2026, [checkpoint D38](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071817713) | Traçabilité des intentions, carte des autorités, recalcul explicable des priorités par mission | D38 ; RG-011/019/023/027/034/042/054 | `PLANNED` — contrat documentaire, branche #444 |
| `REG-INT-007` | 22/11/2026, conversation présente (reçu associé à PR #444) | Structurer immédiatement les fichiers locaux de mission pour suivi, mémoire, intentions, agents, ordre et priorité sans nouveau registre runtime | D38 ; RG-019/023/027/034 | `IMPLEMENTED_PARTIAL` — documents branch-only, CI/revue/merge non attestés |

## Règle de capture des futures demandes

- Identifier le **vrai** périmètre propriétaire avant d'écrire ; si la demande vise l'enfant UAES ou un autre projet, l'inscrire dans son registre, pas ici. La mère ne conserve qu'un lien d'index.
- Conserver le texte original uniquement si accessible et publiable ; sinon paraphraser fidèlement avec source et signaler les limites, sans inventer de verbatim.
- Rechercher doublon et lien vers RG/Task existants. Une instruction **ne devient pas automatiquement une décision**, un Task ID, un droit, une priorité haute ou une action de déploiement.
- Toute contradiction ou changement d'ordre doit enregistrer le **motif et la priorité précédente** dans `__SUIVI.md` et `__ROADMAP.md`. Ne pas écraser les intentions classées `SUPERSEDED`.
- Rendre l'index stable et exploitable par un futur résolveur MCP ; à ce jour, sa mise à jour automatique depuis tous les canaux **n'est pas implémentée**.

**NEXT_ACTION** : qualifier `REG-INT-006`/`007` dans P2, relier la carte des autorités à une projection read-only testée et démontrer la récupération par Continuity ID.
