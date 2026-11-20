# GRGS / CUG — gouvernance documentaire par périmètre et raccordement Loop Engineering

> État : CANDIDATE / PR #414 / NON DÉPLOYÉ. Source de politique proposée : GRT PR #344, STD-GITHUB-DOC-GOV-001. Cette fiche est un **index de chantier**, pas une autorité concurrente de GitRegistry, des documents de gouvernance MCP ou des registres de projet.

## Périmètres et autorités

| Périmètre | Identité / autorité | Rôle |
| --- | --- | --- |
| MCP logiciel | `Patricked-code/MCP` / AGENTS.md, SUIVI.md, DECISIONS_LOG.md, gouvernance existante | Code, CI, déploiement gouverné, état du runtime |
| GRT control plane | `chainsolutions-wealthtech/Governed-Repository-Template` / CP-ARCH-001, CP-GOVMODEL-001 | Modèle de gouvernance et stratégie d'adoption, GMC-G01 |
| CUG | Modules `src/cug/`, GitHub App ID 5417646, registres CUG existants | Installation GitHub, événements, inventaires et preuves |
| GRGS | `STD-GITHUB-DOC-GOV-001` **proposé** | Projection de conformité documentaire, jamais nouvelle source de vérité |
| UAES | `chainsolutions-wealthtech/universal-agent-engineering-system` | Dépôt pilote sous autorisation distincte |
| MCP clean | `chainsolutions-wealthtech/MCP` / branche `Mcpprojet` | Documentation de projet distincte de la production MCP |

Chaque grand projet, sous-projet et chantier possède son identifiant stable, son autorité de suivi, son registre de décisions et ses checkpoints. Le parent référence les enfants ; il n'absorbe pas leurs historiques. Les fichiers conventionnels README.md, AGENTS.md, CLAUDE.md, SUIVI.md, ROADMAP.md, TASKS.md, TODO.md, DECISIONS.md, ARCHITECTURE.md et CONTINUITY.md **restent à leur chemin existant**. Un nouveau fichier ne doit être créé que si aucun document autoritaire équivalent n'existe, et après inventaire.

## Parcours documentaire opérationnel (Loop Engineering / Open Engineering à qualifier)

1. INTAKE : recevoir la demande, identifier projet / sous-projet / chantier et continuité, préserver le texte original de l'intention.
2. OBSERVE : vérifier GitHub, installation CUG, GitRegistry, SHA, autorité, branches, PR, runtime si nécessaire ; marquer les inconnus UNVERIFIED.
3. CLASSIFY : rattacher la demande et les fichiers à une entité, identifier les dépendances et les propriétaires ; ne pas confondre déclaration et preuve.
4. MAP : actualiser **par proposition contrôlée** cartographie, architecture actuelle et architecture cible ; identifier les consommateurs et collisions.
5. PLAN : proposer roadmap, décisions, TODO/TASKS, ordre, critères d'acceptation, risques et point de reprise dans les autorités existantes.
6. EXECUTE : transmettre au codeur une tâche bornée avec entrées, dépendances, HEAD, contraintes et tests ; le codeur n'invente ni nouvelle architecture ni nouveau mandat.
7. VERIFY : tests ciblés, CI complète, revue indépendante, approbations, fusion autorisée, Governed Deploy MCP existant.
8. ATTEST : constater séparément GitHub main, S1 HEAD, image/runtime, health, OAuth, webhooks et résultats CUG ; enregistrer preuves et NEXT_ACTION.

Ce parcours est un **contrat d'orchestration proposé**, pas un moteur d'agents déjà actif. Loop Engineering, UAES et les workflows MCP existants doivent être rapprochés avant toute automatisation de tâches. Aucun agent ou cron nouveau n'est créé ici.

## Projection GRGS existante sur la branche candidate

- `src/cug/grgsDocumentPolicy.ts` : classification lexicale pure ; pas de mutation.
- `src/cug/grgsInventoryProjection.ts` : projection déterministe de chemins avec installation, dépôt et SHA fournis ; ne collecte pas elle-même GitHub.
- `src/cug/pilotInventory.ts` : collecteur pilote existant ; ne pas le modifier ni généraliser son attestation mono-repo à une installation entière sans nouvelle preuve.
- `src/cug/discoveryRegister.ts` : registre de découverte existant ; ne pas créer un deuxième registre autoritaire.
- `src/github/registry.ts` : autorité de mapping serveur ; un nom correspondant n'est pas une preuve de liaison serveur.

## Préconditions du raccordement automatique

- Identifier l'App ID 5417646 dans chaque installation cible, ses permissions et la sélection réelle des dépôts.
- Traiter `repository`, `installation`, `installation_repositories` à partir de webhooks authentifiés, dédupliqués, sans confiance implicite dans le payload.
- Vérifier par GitHub API l'appartenance et l'identité de chaque dépôt, gérer pagination et limites de débit ; les inventaires mono-repo ne prouvent pas une couverture globale.
- Pour lire des documents, obtenir un token de lecture restreint à l'installation et au dépôt, une révision SHA vérifiée, des bornes de taille et de nombre de chemins, et une stratégie de reprise sur échec.
- Réconcilier les autorités documentaires sans écriture automatique ni renommage massif ; publier les écarts comme propositions.
- Tester rejets de permissions, forks, dépôts archivés, renommages, webhooks rejoués, doublons, échecs API, absence de secrets, non-régression et restauration.
- Valider GRT GMC-G01, CI, revue indépendante et règles de branche avant fusion.

## Déploiement exact et arrêt

Le seul pipeline MCP est `.github/workflows/mcp-deploy.yml` (OIDC, endpoint `/deploy/github/s1`). `.mcp/autodeploy-policy.json` peut activer le déclenchement sur push main : **ne pas lancer un second déploiement concurrent**. Après fusion explicitement autorisée, attendre la CI de `main` sur SHA exact, le job Governed Deploy et son attestation, puis exécuter `ping` → `mcp_reconcile_governed_context` → `mcp_get_current_state_inventory`. Une CI de branche n'est pas une preuve de déploiement.

**NEXT_ACTION :** terminer le raccordement CUG en lecture seule sur la PR #414 avec tests, puis faire examiner la politique GRT #344 et la PR MCP #414 avant toute fusion. État des livrables et preuves : consulter les PR GitHub, ne jamais déduire une autorisation d'une fiche documentaire.
