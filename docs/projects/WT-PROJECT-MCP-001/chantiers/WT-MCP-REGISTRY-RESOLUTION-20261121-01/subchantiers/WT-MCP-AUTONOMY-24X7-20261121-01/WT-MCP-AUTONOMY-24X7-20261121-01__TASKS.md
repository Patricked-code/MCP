# Registre documentaire des unités — pas une file d'exécution
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**. 
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

| Groupe documentaire | Références parent | Autorité d'exécution future | Dépendances | État |
| --- | --- | --- | --- | --- |
| AUTH_AND_PLANNING | RG-043–045 | Governed Task Queue, UAC, Sessions, Locks | CUG Project Binding vérifié | SPECIFIED_ONLY |
| HOST_PREPARATION | RG-046–047 | UAES U02 + hôte autorisé, non MCP runtime | capacités S1, secrets et backups | BLOCKED_U02 |
| DAEMON_SUPERVISION | RG-048 | Exécuteur UAES, supervision indépendante | HOST_PREPARATION | NOT_IMPLEMENTED_ATTESTED |
| GOVERNED_DELIVERY | RG-049–051 | GitHub rulesets + Actions + Deploy OIDC + G1 | daemon + mandat et CI | INTEGRATION_REQUIRED |
| COCKPIT_AND_MEMORY | RG-052–054 | Project/UI projection + documents propriétaires | P08 et preuves agents | INTEGRATION_REQUIRED |
| CERTIFICATION_AND_SCALE | RG-055–056 | C27, UAES/Live State, CUG per-installation | toutes gates précédentes | NOT_ATTESTED |

**Jamais** inventer un identifiant `TASK-YYYYMMDD...` dans ce fichier. Il doit être renvoyé par la Task Queue autoritaire après admission contrôlée ; on le référencera ici comme `taskId` sourcé. Une PR GitHub et un document source ne sont pas un claim.
