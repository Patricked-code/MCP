# L10 — Catalogue des opérations et contrat d'autorisations

[← Orchestration](PROJECT_SELF_WORKFLOW.md) · [Indexation des comptes](../11-persistence/CAPABILITY_INVENTORY.md)

**Distinction de sécurité :** le Project UID **identifie une cible**, il **n'autorise pas une opération**. Cette page contient des **catégories d'opérations déclarées**, jamais un droit préaccordé. Les permissions réelles dépendent du principal vérifié, de la connexion, de GitHub, des outils exposés et des gates runtime du type d'action.

| Domaine | Opérations envisageables | Autorité et garde-fous | Autorisé par seul ID ? |
| --- | --- | --- | --- |
| Identité projet | Lire la fiche et ses documents publics/autorisés | GitHub + manifeste versionné | **Lecture sous accès réel** |
| Gouvernance | Lire instructions, décisions et documents | GitHub et sources historiques | **Lecture sous accès réel** |
| GitHub accounts | Inventorier comptes/installations selon les scopes du demandeur | `github_account_inventory`, `github_durable_accounts_status`, `github_org_inventory` | **Non, observation conditionnelle** |
| Repositories | Lister dépôts accessibles, mappings et droits | Connecteur GitHub, GitRegistry et `github_get_repository_state` | **Non, scopes réels seulement** |
| Capacités MCP | Lire catalogue et fonctionnalités exposées | `mcp_get_current_state_inventory`, `get_project_context` | **Non, connexion MCP requise** |
| Serveur S1 | Lire revision/health et preuves | Live State, contexte approprié | **Non, preuve/accès requis** |
| Continuité | Lire événements/checkpoints visibles | GitHub et Operational Memory | **Non, filtrage obligatoire** |
| Développement | Branche, édition, PR, CI | Droit GitHub write + périmètre/branche/PR autorisés | **Jamais** |
| Session/tâche | Ouvrir, réclamer, verrouiller | Governed Sessions / Task Queue / Locks | **Jamais** |
| Fusion | Fusionner sur main | CI exact-head, revue indépendante, règle branche, owner | **Jamais** |
| Déploiement | Governed Deploy MCP | OIDC, admission, SHA exact, preuves/rollback | **Jamais** |
| Admin/secret | Élever scopes, lire secrets, exécuter arbitraire | Contrats séparés ; pas à exposer dans l'index | **Jamais** |

## Principe de capacité effective

`EffectiveCapability = RequestedOperation ∩ ClientExposedTool ∩ AuthenticatedPrincipal ∩ GitHubPermission ∩ GovernancePolicy ∩ Task/Session/LockIfRequired ∩ FreshEvidence`.

Ce n'est **pas** une nouvelle formule de décision runtime : c'est le contrat de **vérification** attendu du résolveur, les contrôles effectifs restent sous leurs autorités existantes.

### Etats de permission

`AVAILABLE_READONLY` ne signifie ni `WRITE_GRANTED` ni `OWNER_SELECTED`. Une information provenant d'un autre principal ou d'une session (notamment Regulatory) n'est jamais réattribuée au nouvel appelant. Pour les actions write, état initial `NOT_GRANTED_BY_PROJECT_ID`.

## Audit

Chaque verdict devra exposer `operation`, `principalBindingEvidence` (**sans le secret**), `sourceAuthority`, `observedAt`, `effectivePermissionEvidence`, `reasonCodes` et `nextGate`. Il est interdit d'écrire des tokens ou clés dans un Markdown, un snapshot, un événement ou un manifeste.
