# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Carte des autorités documentaires

> Type : index de résolution documentaire **de cette mission uniquement**, non registre de permissions, de tâches ou de projets. Project UID documentaire `WT-PROJECT-MCP-001` **candidat** ; ne pas l'assimiler au ProjectRecord `mcp_bridge`.
> Référence : PR mère #430 ; décisions D05/D32/D35/D37/D38 ; snapshot GitHub `main@7f0ae4d35daec8d85a430b5280abd16eda6a42c8` au 22/11/2026, à revalider à chaque reprise.

## Référentiel de types et autorité de la mission

| Famille | Autorité de la mission | Héritage éventuel / limite |
| --- | --- | --- |
| MISSION / MANDATE | `__MISSION.md` | Mandat R01–R07 ; ne pas confondre avec les mandats enfant |
| SOURCE_OF_TRUTH | `__SOURCE_OF_TRUTH.md` | Index d'autorités, pas copie des états de stores |
| AGENTS / instruction d'arrivée | `__AGENTS.md` | Hérite de `AGENTS.md` / `CLAUDE.md` racine, sans modifier leur gouvernance |
| MEMORY | `__MEMORY.md` | Index des sources et événements ; contenu original sensible hors repo si non publié |
| INTENTIONS | `__INTENTIONS.md` | Intentions **documentaires** de la mission ; événements CUG/Operational Memory restent chez leurs propriétaires |
| DECISIONS | `__DECISIONS.md` | D01…D38 ; versions/ancres conservées |
| CONTINUITY | `__CONTINUITY.md` | Checkpoints successifs append-only et dernière action par scope |
| SUIVI | `__SUIVI.md` | État courant de cette mission, pas le `SUIVI.md` global MCP |
| TODO | `__TODO.md` | Travaux de conception et preuves de la mission, pas tâches runtime |
| TASKS | `__TASKS.md` | Découpage des lots RG et liens vers vrais Task IDs, **jamais inventés** |
| ROADMAP | `__ROADMAP.md` | Phases P01–P17 et projection courante ; les anciennes tables restent historiques |
| IMPLEMENTATION_PLAN | `__IMPLEMENTATION_PLAN.md` | RG-001…RG-056, contrats, implémentation et tests |
| AUDIT / CARTOGRAPHY | `__COVERAGE_AUDIT.md` | Équivalent de cartographie initiale ; ne pas créer `__CARTOGRAPHY.md` dupliqué sans motif |
| ARCHITECTURE / CONVERGENCE | `__CONVERGENCE_MATRICES_LOOP_24X7.md` + `__IMPLEMENTATION_PLAN.md` | Contrats de convergence et architecture cible documentaire ; code live reste autoritaire |
| EVIDENCE_INDEX | `__EVIDENCE_INDEX.md` | Liens vers les preuves immuables ou à revalider |
| SOURCE_READING | `__SOURCE_READING_LOOP_ENGINEERING_20261121.md` | Analyse du DOCX, non transcription intégrale publique |
| Enfant UAES | `subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/` | Ses 13 documents appartiennent au sous-chantier ; pas de récupération implicite dans la mère |

Tous les chemins ci-dessus portant `__` sont relatifs à ce répertoire. **Statut** : les nouveaux documents créés sur PR #444 sont branch-only jusqu'à fusion autorisée ; une ligne dans cette carte n'atteste pas la présence sur `main`.

## Sources opérationnelles : référencer, ne pas recopier

| Type | Source propriétaire | Contrôle de lecture |
| --- | --- | --- |
| Code/PR/CI/rulesets/commits | GitHub live | SHA exact, droits et identité de l'installation |
| GitRegistry / Project Binding | Registres/resolveurs existants | Projet + mapping prouvés, V1/V2, fraîcheur |
| Tâches, claims et transitions | Governed Task Queue, Sessions, Locks | Task ID réel, TargetScope et session autorisée |
| Événements CUG | Registres CUG et reçus authentifiés | Webhook signé, déduplication, installation, dépôt |
| Checkpoints runtime | Operational Memory | Journal et readback, nulle mutation implicite |
| Déploiements S1 et G1 | Live State / Governed Deploy | Attestation HEAD GitHub/S1/runtime/health/G1 |
| Gouvernance programme MCP | `AGENTS.md`, `CLAUDE.md`, `GPT.md`, `SUIVI.md`, `docs/governance/README.md` | Héritage **explicite**, ne pas absorber les tâches d'autres missions |

## Résolveur documentaire cible (P2, NON IMPLÉMENTÉ DE BOUT EN BOUT)

Entrée `continuityId` → vérifier l'identité de mission → consulter cet index → retourner par type `{ownerScope, sourcePath, ref, sha, state, observedAt}` → lire les documents du périmètre uniquement → établir les jointures opérationnelles séparément et fail-closed. `MISSING`, `UNVERIFIED`, `INACCESSIBLE` et `CONFLICT` sont des résultats valides ; aucune recherche de nom similaire ne crée une autorité.

L'index n'a pas vocation à déclarer qu'il sait lire automatiquement toutes les conversations. Une nouvelle source significative doit être capturée depuis un canal réellement accessible, avec provenance et consentements applicables. Tout ajout met à jour la présente carte, les références de mémoire et le checkpoint **après** contrôle de non-duplication.

## 2026-11-22 — D39 : correction des autorités de reprise (successeur)

> Les assertions « #444 branch-only », « D01–D38 seulement » et « résolveur NON IMPLÉMENTÉ » des sections antérieures sont des états historiques, **superseded** pour l'état présent.

- [DECISIONS D01–D39](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__DECISIONS.md) est sur main depuis #444 ; #445 a livré le lecteur MCP et #446 a livré G1. Le premier readback parent/enfant est réel mais PARTIAL, pas une certification des jointures.
- Les treize documents locaux de `WT-MCP-AUTONOMY-24X7-20261121-01` comprennent `MANDATE`, `ARCHITECTURE` et `CARTOGRAPHY`. Les documents `MISSION`, `IMPLEMENTATION_PLAN` et `DOCUMENT_AUTHORITIES` du parent sont des **références héritées**, avec propriétaire parent, non des copies locales enfant. Les intentions, tâches et décisions Dxx du parent ne sont pas locales à l'enfant.
- Source checkpoint : [#7073160993](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7073160993). Vérifier l'existence/auteur/date de la source GitHub, mais traiter les affirmations textuelles qu'elle contient comme DECLARED jusqu'à attestation par leurs autorités.
- PR #447 corrige le lecteur existant sans GitRegistry, Queue ni magasin supplémentaire ; code en Draft, pas déployé. Toute jointure Project Binding/CUG/Task Queue nécessite ses propres preuves.
