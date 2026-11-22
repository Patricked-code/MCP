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

## 2026-11-21 — Admission documentaire de l'étude externe « Loop Engineering.docx »

La source remise par le propriétaire a été **lue intégralement** (39 pages, 637 paragraphes, 12 tableaux ; SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`). Son analyse sourcée figure dans [la lecture intégrale et la matrice de convergence](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md).

La partie B proposait `WT-MCP-AUTONOMY-24X7-20261121-01` en précisant qu'il n'avait pas été créé : **il est désormais réservé ici comme sous-chantier documentaire**, fils de **cette même mission** et non comme nouveau projet/queue. Son [mandat](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__MANDATE.md), son [architecture](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__ARCHITECTURE.md), ses [décisions](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__DECISIONS.md) et sa [continuité](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__CONTINUITY.md) ne transfèrent ni les autorités runtime MCP ni les droits du dépôt UAES.

**Mandat maintenu :** achever R01–R07 puis les RG-001…056 sans reprendre à zéro ; l'autonomie est l'exécution de Loop Engineering sur un hôte UAES durable et isolé, pas le fait de mettre davantage de prompts dans ChatGPT. Les statuts restent séparés : BRANCH_ONLY, MERGED_MAIN, DEPLOY_WORKFLOW, RUNTIME_ATTESTED, FULLY_ALIGNED et 24X7_HOST_CERTIFIED.

## Point d'entrée mission-scopé — D35/D37/D38 (ajout PR #444)

Cette mission conserve **sa propre autorité de pilotage**, distincte des travaux globaux MCP et du sous-chantier UAES. À la reprise, lire dans l'ordre :
1. [Instructions locales AGENTS](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__AGENTS.md) et [SOURCE_OF_TRUTH](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_OF_TRUTH.md), héritant des règles GitHub/AGENTS/CLAUDE globales.
2. [Carte des autorités documentaires](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__DOCUMENT_AUTHORITIES.md) et [index MEMORY](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__MEMORY.md).
3. [Registre INTENTIONS](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__INTENTIONS.md), [DECISIONS](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__DECISIONS.md), [CONTINUITY](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__CONTINUITY.md) et [SUIVI](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SUIVI.md).
4. [ROADMAP](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__ROADMAP.md), [TASKS locaux](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__TASKS.md), [TODO local](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__TODO.md), [plan d'implémentation](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__IMPLEMENTATION_PLAN.md) et [preuves](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__EVIDENCE_INDEX.md).

Les documents préfixés appartiennent à **cette mission** : ils n'ajoutent pas de GitRegistry, Task Queue, session, permission ou admission runtime. Les sources historiques, les tâches du programme principal MCP et les 13 fichiers du sous-chantier UAES conservent leurs autorités. Une intention doit être classifiée, rattachée aux opérations RG existantes, puis provoquer si nécessaire une **réévaluation traçable** de l'ordre propre à la mission ; elle n'autorise jamais un WRITE par sa seule existence.

**État à la création :** les nouveaux fichiers appartiennent à la branche de la PR Draft #444, non à `main` tant que la fusion et la réattestation ne sont pas effectuées. La résolution automatique par Continuity ID et le réordonnancement fonctionnel restent à développer/tester en P2.
