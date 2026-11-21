# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Audit de couverture initial (Intervention 01)

> 2026-11-21 (observations UTC de la session). **PARTIEL / READ-ONLY**.  
> Référentiel GitHub `Patricked-code/MCP@5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`.  
> Ne pas confondre les comptages de dépôts visibles, les mappings enregistrés, les projets reconnus et les tâches exécutables.

## A. Inventaire attesté

| Source | Résultat / preuve | Couverture | Limitations |
| --- | --- | --- | --- |
| MCP ping | `wealthtech_ssh_bridge_ok` (2026-11-21) | Connecteur HTTPS joignable | Ne certifie pas tous les droits GitHub/transport |
| Live State `mcp_reconcile_governed_context` | stateVersion=1410 ; GitHub main/S1/runtime = `5bc5e2b4...`; runtime healthy ; arbre S1 propre | Projet MCP opérationnel | `DOCUMENTATION_DRIFT`: docs déclarent `fb0cb474...` |
| `mcp_get_work_queue` | storeRevision=244 ; 21 tâches = 14 DONE + 3 READY + 4 SUPERSEDED ; toutes `repository=Patricked-code/MCP` | File gouvernée MCP visible | Ni inventaire de toutes les tâches documentaires, ni queue globale inter-dépôts |
| Sessions `mcp_get_current_state_inventory` | 31 sessions renvoyées | Historique gouverné accessible | Les sessions ne correspondent pas 1:1 aux tâches |
| `github_registry_v2_dry_run` | V1 ; 3 connexions, 6 repositories, 5 mappings, 2 projects, 1 migration, 4 auditEvents | GitRegistry actif limité | Chemins/credentials non vérifiés ; migration V2 non activée |
| `github_durable_accounts_inventory` | 3 comptes ; repos retournés : 17 (chainsolutions-wealthtech), 31 (Patricked-code), 25 (Wealthtechinnovations) | Visibilité GitHub large et réelle | Listes chevauchantes, non dédupliquées ; pas de classification automatique comme projet |
| `github_durable_accounts_status` | Comptes interrogés HTTP 200, 2 active, 1 pending_s2_token_sync | Identités GitHub joignables | Les droits effectifs d'écriture par opération restent à vérifier |
| GitHub direct via compte Patricked-code | `get_repo` sur Patricked-code/MCP : `admin/pull/push=true` | Accès direct GitHub à MCP | Ce droit ne remplace pas le WRITE gate MCP |
| GitHub via `github_get_repository_state` du Bridge | Rejet `GITHUB_CONTROL_ORG_NOT_ALLOWED` pour Patricked-code/MCP | Route contrôlée non admise dans cette invocation | Politique/mapping/code de contrôle à diagnostiquer, **ne pas contourner** |
| `.mcp/server-map.json` main | `S1.targetProjectIds=[]` | Support TargetContext présent | Aucune cible S1 activée dans cette source documentaire |
| `.mcp/task-registry.json` | 2 seeds `TASK-20260813-004`, `TASK-20260822-001` | Initialisation versionnée | Ne représente pas 21 tâches runtime à elle seule |
| CUG webhook | `docs/governance/cug-webhook-receiver.md` ; registre de reçus et déduplication, pilote UAES | Observation et journalisation événementielle | Pas d'écriture automatique GitRegistry ni Governed Task Queue |
| CUG cockpit existant | `src/cug/page.ts`, capsule GRT et console d'admission documentées | Parcours CUG/GRT partiels | Aucun cockpit fédéral de tous les projets/tâches prouvé |
| Identité projet MCP | PR #389 et documents de la branche correspondante | `WT-PROJECT-MCP-001` candidat | ProjectRecord actif non attesté dans GitRegistry |

## B. Écart de consolidation observé

Les résultats GitHub (17/31/25 par compte, avec doublons) dépassent largement les 6 dépôts et 2 projets du GitRegistry V1. La file MCP contient 21 Task IDs et ne démontre **aucune** agrégation des TODO/TASKS des autres dépôts. Le raccordement CUG→project binding→task admission→cockpit global reste à spécifier et à implémenter ; une observation webhook ne suffit ni à rattacher un projet ni à octroyer une capacité.

## C. Matrice des sources et propriétaires (premier périmètre)

| Source / entité | Source propriétaire | Identifiants à rapprocher | État de preuve |
| --- | --- | --- | --- |
| MCP logiciel | Patricked-code/MCP, GitHub/Live State | repositoryId=`1285534440`, candidate Project UID `WT-PROJECT-MCP-001` | Repo VERIFIED ; UID CANDIDATE (#389) |
| CUG | src/cug + reçus privés + GitHub App | appId=`5417646`, installationId, deliveryId, repositoryId | APP déclarée/documentée ; couverture de chaque dépôt à vérifier |
| GRT | chainsolutions-wealthtech/Governed-Repository-Template | projectId, questionnaire, admissionId, checkpointId | Liens documentés, statut propre à confirmer |
| UAES | chainsolutions-wealthtech/universal-agent-engineering-system | repositoryId=`1429189311`, continuityId | Dépôt pilote dans docs CUG ; pas de promotion en queue |
| AfricaFunds | GitRegistry et dépôts métier | CS-AFRICAFUNDS-001, api_opcv, front_end_opcvm | Mapping historique TASK-20260910-001 DONE ; état courant des repos à revoir |
| Stablecoin | GitRegistry et dépôt métier | TASK-20260920-003 | READY dans queue MCP ; vrai scope du projet non confirmé depuis son autorité |
| GRGS / Loop Engineering | Documents de gouvernance MCP et dépôts propriétaires | standardId, projectId, workstreamId, continuityId | Candidat documentaire ; ne pas appliquer automatiquement |

Ne pas inventer les identifiants absents. Récupérer ID GitHub stable et preuve de connexion avant tout rapprochement par nom.

## D. Chaîne d'événements attendue — sécurité

1. Recevoir le webhook signé, scoper à l'installation CUG admise et persister le reçu immuable (existant).
2. Dédupliquer par `deliveryId`, événement, action et empreinte ; conserver l'état des redeliveries et rejeux.
3. Observer le dépôt par API GitHub sous la **même installation autorisée** ; vérifier owner/repositoryId, visibilité, fraîcheur, renommages/transferts et droits.
4. Résoudre exactement le mapping canonique ; en cas de NONE/AMBIGUOUS/UNVERIFIED produire une **observation à instruire**, jamais un projet activé arbitrairement.
5. Pour un projet prouvé/admis, produire une intention stable de travail, avec type d'événement, clef d'idempotence et dépendances. Une simple activité technique ne déclenche pas de codeur ni de déploiement.
6. Passer l'intention par les contrôles existants `mcp_reconcile_agent_intent` / Program Backlog / session/locks ; n'inscrire une tâche runtime que lorsque la **politique d'admission autorise** l'inscription. La création de tâche ne vaut pas claim ni exécution automatique.
7. Mettre à disposition une projection fédérée **read-only**, puis exposer le résultat du rapprochement dans le cockpit avec des statuts explicites.

Cette séquence respecte la demande d'inscription automatique d'événements **admissibles** tout en évitant les tâches fantômes, doublons, injections de webhook ou opérations non autorisées.

## E. Références vérifiables

- [GitRegistry](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/src/github/registry.ts)
- [Governed Tasks](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/src/tools/governedTasks.ts)
- [TODO global](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/TODO.md)
- [Target map](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/.mcp/server-map.json)
- [Seed des tâches](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/.mcp/task-registry.json)
- [CUG webhook](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/docs/governance/cug-webhook-receiver.md)
- [GRGS / CUG / Loop](https://github.com/Patricked-code/MCP/blob/5bc5e2b4c0b2aa176c1f6131826afbea7af2f164/docs/governance/GRGS_CUG_PROJECT_DOCUMENTATION_AND_LOOP_ENGINEERING.md)
- [Projet MCP candidat, PR #389](https://github.com/Patricked-code/MCP/pull/389)

## F. À vérifier dans les interventions suivantes

- Déduplication exhaustive des dépôts et permissions par installation GitHub, en tenant compte des repos privés et transférés.
- Tous les projets réellement définis dans GitRegistry et Project Binding, noms/ID exacts, prêts/non prêts.
- Autorité et structure des TODO/TASKS/mémoires dans chaque dépôt sans y écrire.
- Origine exacte du refus `GITHUB_CONTROL_ORG_NOT_ALLOWED`, policy et scope, sans ajustement opportuniste.
- Endpoint et modèle d'autorisation du cockpit universel, filtres par identité, pagination et isolation par projet.
- Historique des tâches `SUPERSEDED` et successorId seulement lorsque prouvé.
- Incréments et checkpoints de #389, #401–#407, #414–#425, sans toucher aux périmètres d'autres agents.
- G1 documentaire : écart `fb0cb474...` vs `5bc5e2b4...`, qui bloque toute attestation globale `FULLY_ALIGNED`.

**Verdict Intervention 01 :** suffisamment de faits pour cadrer la fédération, **pas** suffisamment pour activer une synchronisation automatique multi-dépôts ni pour attester un cockpit global en production.
