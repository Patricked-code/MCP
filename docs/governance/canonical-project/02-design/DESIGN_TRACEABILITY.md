# L2 — Exigences, sorties de conception et registre de design

[← Racine](../README.md) · [Planification →](../03-planning/DEPENDENCIES.md)

## Chaine obligatoire avant une planification d'implementation

`BESOIN → SOURCE ET EXIGENCE → AUDIT EXISTANT → OPTIONS → CONCEPTION → DECISION → SPEC VERSIONNEE → REVUE / APPROBATION → BASELINE DE DESIGN → PLAN D'IMPLEMENTATION`.

Le Master Plan peut planifier **le travail de conception** quand il manque des informations. Il ne peut pas declarer une implementation prete si sa conception requise est non approuvee.

## Registre de sorties de conception — exemples attestes par fichiers

| Perimetre | Design / specification | Plan ou succession | Etat a verifier |
| --- | --- | --- | --- |
| Loop Engineering | [Matrice exigences 20260702](https://github.com/Patricked-code/MCP/blob/main/memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md), [Master Plan](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md) | [Playbook](https://github.com/Patricked-code/MCP/blob/main/memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md) | Fondations historiques, pas approbation courante de tout MCP |
| Governed Sessions | [Design 2026-08-13](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-08-13-mcp-governed-session-continuity-v1-design.md) | [Plan 2026-08-13](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/plans/2026-08-13-mcp-governed-session-continuity-v1.md) | Lire la succession d'implementation/attestation |
| Bootstrap agents | [Design 2026-08-22](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-08-22-mandatory-agent-bootstrap-work-orchestration-v1-design.md) | [Plan 2026-08-22](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/plans/2026-08-22-mandatory-agent-bootstrap-work-orchestration-v1.md) | Alignement historique a reobserver |
| GWC | [Design 2026-09-15](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-09-15-governed-workflow-contract-v1-design.md) | [README GWC](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/README.md), [History](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/REVISION_HISTORY.md) | Differencier architecture canonique, candidate PR #95 et post-integration |
| AfricaFunds mapping (du MCP) | [Design 2026-09-12](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/specs/2026-09-12-africafunds-project-aware-s2-mapping-design.md) | [Plan 2026-09-12](https://github.com/Patricked-code/MCP/blob/main/docs/superpowers/plans/2026-09-12-africafunds-project-aware-s2-mapping.md) | Conception avec checkpoint d'approbation reference dans les documents |
| Canonical Project UID | **Cette tranche documentaire** | [Gates](../08-assurance/ADOPTION_GATES.md) | `CANDIDATE` : pas de binding GitRegistry ou outil runtime en place |

## Contrat minimal pour chaque design

| Champ | Necessite |
| --- | --- |
| `Design ID` et version | Distinguer revisions, ne pas recycler un ID pour un autre design |
| `Requirement IDs` | Remonter aux besoins sources |
| Baseline de code et `observedAt` | Connaitre ce qui a ete analyse |
| Autorites/composants impactes | Prouver reutilisation et absence de seconde autorite |
| Alternatives et decision | Conserver pourquoi une option a ete retenue |
| Invariants / contre-indications | Securite, non-regression, compatibilite |
| Dependances de conception | Quelles autres conceptions sont prerequises |
| Criteres d'acceptation | Verification avant implementation |
| Preuve d'approbation | Gate de sortie et autorite |
| `Continuity ID` ou checkpoint | Reprise depuis le dernier point **applicable** |
| Remplacement | `SUPERSEDED_BY` et lien vers revision successeure |

## Gate de sortie

Un design ne devient `APPROVED` que si une preuve d'approbation applicable existe. Le lien `Design → Plan` est une relation explicite. Le statut reste `UNVERIFIED` lorsque l'approbation ou la version de la spec n'est pas etablie.

Cette page n'est **pas** un nouveau registre de conception authoritatif : elle relie les documents deja ecrits et indique les champs qui manquent eventuellement.
