# Roadmap spécifique de l'exécuteur autonome
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**. 
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

**Source de planification unique :** RG-043…RG-056 du plan de mission parent. Les lignes ci-dessous sont une **vue locale** de ces IDs, pas de nouvelles Task Queue entries.

| Rang | Référence parent | Sortie attendue | Gate | État |
| --- | --- | --- | --- | --- |
| 1 | RG-043–045 | Raccordement P2/UAC/C26, scheduler de tâches autorisées, contrats de reprise | identités, idempotence, locks | INTEGRATION_REQUIRED |
| 2 | RG-046 | Audit capacité S1/UAES U02, isolation, backup/restore, secrets, coûts | environnement réel attesté | BLOCKED/U02_UNATTESTED |
| 3 | RG-047 | Agent host durable, client MCP authentifié, workspaces/LLM configurés | exercice C26 sans bypass | NOT_ATTESTED |
| 4 | RG-048 | Service orchestrateur supervisé, restart, replay, fencing, monitoring | panne et reboot testés | NOT_ATTESTED |
| 5 | RG-049–051 | PR RED/GREEN, revue automatique indépendante, rulesets, OIDC/G1 | SHA exact & policies GitHub | INTEGRATION_REQUIRED |
| 6 | RG-052–054 | Cockpit agents/runs/insights, doc et checkpoints enfant | preuves source et RBAC | INTEGRATION_REQUIRED |
| 7 | RG-055 | Pilote E2E MCP + crash/recovery + C27 | preuves réelles non fixtures | NOT_ATTESTED |
| 8 | RG-056 | Endurance, quotas, rollbacks, extension CUG par cible | health externe + couverture | NOT_ATTESTED |

Le socle Insights RG-036–039 et cartographie RG-040–042 restent dans la mission mère, avec dépendances vers ce chantier. Ne pas bloquer leur lecture seule sur le déploiement du worker.
