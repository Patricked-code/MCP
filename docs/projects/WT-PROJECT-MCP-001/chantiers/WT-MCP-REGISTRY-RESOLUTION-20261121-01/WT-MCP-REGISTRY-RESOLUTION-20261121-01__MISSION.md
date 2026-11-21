# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Mission de résolution du problème des registres

> Identifiant de continuité : `WT-MCP-REGISTRY-RESOLUTION-20261121-01`\
> Projet logiciel parent : `Patricked-code/MCP` ; Project UID candidat `WT-PROJECT-MCP-001` (voir PR #389, **non promu** en ProjectRecord runtime).\
> Branche de préparation : `mcp/registry-resolution-audit-20261121` ; base GitHub `5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`.\
> Statut : **AUDIT / CANDIDATE DOCS-ONLY / NON DÉPLOYÉ**.\
> Autorité : les registres opérationnels existants ; ce dossier documente leur fédération, **il n'est pas un registre concurrent**.

## Mandat du propriétaire — exigences R01 à R07

- **R01 — Événements → rattachements et tâches :** compléter le parcours CUG webhook → vérification GitHub/API/installation → GitRegistry/project binding → admission d'une intention → Governed Task Queue → registres propres aux chantiers → cockpit. Conserver le reçu signé et ses rejouements idempotents ; jamais d'exécution ou de permission implicite à partir du seul événement.
- **R02 — TODO par projet et cibles multi-dépôts :** la racine TODO.md MCP conserve son rôle de projection globale ; chaque projet/chantier conserve ses TODO et TASKS autoritaires. Qualifier `.mcp/server-map.json`, les TargetMappingIds, l'activation GitRegistry et les autorisations avant de configurer des cibles sur main ; pas de promotion collective sans preuves.
- **R03 — Fédération des identifiants :** projet, dépôt, sous-projet, chantier, continuité, tâche, session, blueprint, PR, checkpoint. Chaque jointure : provenance, observation horodatée, statut VERIFIED/DECLARED/UNVERIFIED/CONFLICT, version/SHA, identité historique conservée.
- **R04 — Cockpit :** fiche projet (identité, composants, documentation, chantiers, tâches, dépendances, mémoire, checkpoints) ; vues globale/dépôt/chantier ; tâches DONE/CANCELLED/SUPERSEDED visibles dans l'historique ; accès selon l'identité et le périmètre autorisés.
- **R05 — Gouvernance :** clarifier `GITHUB_CONTROL_ORG_NOT_ALLOWED` sans contournement ; aucune deuxième autorité Task Queue/GitRegistry ; PR additives, tests de rejouement, droits, conflits de rattachement, historiques, sessions, exact-SHA CI/revue/Governed Deploy.
- **R06 — Résolution de la consolidation :** fédération MCP alimentée par CUG, réutilisant GRT/GRGS, Operational Memory, GitRegistry, Project Binding, GitHub et les registres locaux ; jamais un énorme TODO/TASKS central reconstruit à la main.
- **R07 — Ordre :** audit couverture dans `Patricked-code/MCP` en premier ; construction de la fédération ensuite ; cockpit alimenté par des preuves ensuite ; CUG actualise, GRT admet, UAES/Loop consomment les tâches. Aucun autre dépôt modifié dans cette intervention.

## Autorités à ne pas dupliquer

| Information | Autorité à interroger | Projection de mission |
| --- | --- | --- |
| Dépôt/PR/commit/rulesets | GitHub live | Liens + SHA + timestamp |
| Projets et mappings | GitRegistry / Project Binding existants | Jointures vérifiées, pas de second mapping store |
| Tâches exécutables | Governed Task Queue + Sessions + Locks | Lecture fédérée, pas de claim automatique |
| Backlog de conception | Program Backlog V2 + TODO/TASKS spécifiques | Candidats, pas des tâches runtime par simple lecture |
| Continuity/checkpoints | Operational Memory et continuités existantes | Index de références, pas de réécriture historique |
| Webhook | Registre CUG de reçus immuables | Evidence d'événements, pas d'autorisation |
| Applications / runtime | S1/S2, Live State, Governed Deploy | Preuves fraîches et compartimentées |
| GRT / UAES / Loop | Dépôts propriétaires distincts | Références, sans modifications croisées |

## Points de reprise

- [Audit de couverture](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__COVERAGE_AUDIT.md)
- [Roadmap et critères](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__ROADMAP.md)
- [Décisions / risques](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__DECISIONS.md)
- [Continuité et prochaine action](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__CONTINUITY.md)

Documents connexes : [PR #389](https://github.com/Patricked-code/MCP/pull/389) (Project UID candidat), [CUG/GRT](https://github.com/Patricked-code/MCP/blob/main/docs/governance/cug-webhook-receiver.md), [GRC documentaire](https://github.com/Patricked-code/MCP/blob/main/docs/governance/GRGS_CUG_PROJECT_DOCUMENTATION_AND_LOOP_ENGINEERING.md).

## Portée du présent lot

**Autorisé ici :** observation read-only, qualification, dossier versionné sur branche, PR draft.\
**Non réalisé :** fonctionnalité de corrélation, activation de cibles, nouvelles tâches runtime, modification GitRegistry, changement d'accès, merge, déploiement, modifications des autres dépôts.

La mission doit être reprise sous l'intitulé exact **« mission de résolution du problème des registres »** ou par son ID `WT-MCP-REGISTRY-RESOLUTION-20261121-01` : lire ce dossier, vérifier GitHub HEAD et Live State avant toute opération, classer les évolutions depuis la dernière preuve et conserver la même continuité.
