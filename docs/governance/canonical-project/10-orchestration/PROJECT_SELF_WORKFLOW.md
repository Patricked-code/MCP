# L10 — Orchestration d'entrée : Project UID → GitHub → MCP S1 → travail

[← Racine](../README.md) · [Autorisation](AUTHORIZATION_CONTRACT.md) · [Indexation](../11-persistence/S1_GITHUB_INDEXATION.md)

## Déclencheur logique (non autonome)

`WT-PROJECT-MCP-001` désigne **l'évolution du projet logiciel du bridge**, sur `Patricked-code/MCP`. Il ne signifie pas « exécute un outil sur une application cliente », ni « active Regulatory », ni « ouvre une session ». Le client doit **invoquer** un agent ou une fonction ; l'existence de l'ID n'est pas un scheduler.

## Séquence déterministe commune à deux points d'entrée

| Gate | Opération | Source de preuve | Résultat |
| --- | --- | --- | --- |
| P0 | Résoudre l'ID et ses alias historiques | GitRegistry/mapping + version du manifeste | Identité MCP_SELF, ou conflit |
| P1 | Identifier GitHub/compte et permissions effectives | Connecteur GitHub / OAuth / GitHub App | `VERIFIED` ou `UNVERIFIED` |
| P2 | Lire `README.md`, `AGENTS.md`, `CLAUDE.md` et gouvernance | GitHub exact SHA | Instructions applicables |
| P3 | Rattacher les règles Loop Engineering et les 20 docs historiques | [Corpus fondateur](../09-foundations/FOUNDING_DOCUMENTS.md) | Historique disponible, limites |
| P4 | Charger conception, architecture, programmes, backlog | Registres existants et PR candidates | Graphe de navigation sourcé |
| P5 | Si besoin runtime, connecter le bridge S1 : `ping` → `mcp_reconcile_governed_context` → `mcp_get_current_state_inventory` | MCP, Live State | État GitHub/S1/runtime et outils |
| P6 | Découvrir GitHub accounts, repositories et catalogue **à la demande**, sous droits du principal | GitHub inventories, GitRegistry, catalogue MCP | Index filtrés et datés |
| P7 | Retrouver Continuity IDs, checkpoints, issues/PR et blockers | GitHub/Operational Memory selon scopes | Points de reprise **multiples** |
| P8 | Vérifier les conflits, la fraîcheur, la provenance et les collisions | Source de chaque autorité | `FULLY_ALIGNED` si prouvé, sinon état borné |
| P9 | Exposer `PROJECT_CONTEXT_READY` et point de choix NOUVEAU/REPRISE | Reçus de lecture | **STOP sans écriture** |
| P10 | Si et seulement si le propriétaire choisit un chantier, appliquer son admission E1 ou E2 **selon mandat** | Sessions/Task Queue/ownership ou GitHub | Exécution gouvernée séparée |

Le socle fondateur du document d'origine reste [Loop Engineering](../09-foundations/LOOP_ENGINEERING_METHOD.md). Pour les changements de code, utiliser la chaîne commune existante et non un nouveau pipeline.

## Entrée GitHub

L'agent ayant accès à `Patricked-code/MCP` reçoit l'ID, lit les documents et suit `AGENTS.md`. Si le runtime n'est pas accessible, il rend `RUNTIME_UNVERIFIED`, peut utiliser les moyens GitHub/read-only autorisés et **n'infère pas E2**. La PR candidate est [#389](https://github.com/Patricked-code/MCP/pull/389).

## Entrée MCP (sur S1)

L'outil existant `get_project_context` pourra exposer l'objet `canonicalMcpProject` depuis le manifeste versionné **après fusion, déploiement et vérification**. Cet objet est une **projection persistante de configuration**, pas un binding GitRegistry actif, pas un checkpoint du jour et pas une autorisation.

La future fonction paramétrée `mcp_resolve_canonical_project(project_uid,view)` et le binding durable GitRegistry nécessitent design/validation et une tranche d'implémentation distincte. Ne pas annoncer ces fonctions comme exposées sur le runtime actuel.

## Principe des deux entrées

ChatGPT/Claude peuvent lire GitHub directement et interroger le MCP séparément. **Ne jamais construire une dépendance obligatoire IA → MCP → GitHub**. Le cycle d'exécution gouvernée reste commun après le choix du travail.

## Tests d'acceptation

- L'ID retourne toujours la même **identité** et les mêmes références de provenance, mais **pas le même SHA historique** sans observation fraîche.
- Les alias historiques ne sélectionnent pas silencieusement un autre dépôt.
- La lecture du projet ne modifie ni GitRegistry, ni session, ni Task Queue.
- Un autre compte GitHub non autorisé voit seulement les références auxquelles il a droit.
- Toute entrée sans source retourne un état `UNVERIFIED` et non des données inventées.
