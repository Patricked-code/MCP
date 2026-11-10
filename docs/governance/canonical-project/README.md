# MCP — racine de navigation canonique et continuite profonde

> **Etat : CANDIDATE_DOCUMENTAIRE, PR non fusionnee.** Cette page est un **index de references**, non une nouvelle source de verite, Task Queue, session, permission, moteur de deploy ou memoire runtime. **Project UID propose : `WT-PROJECT-MCP-001`** ; son adoption machine dans GitRegistry et dans un outil MCP reste a valider. Ne pas presenter ce projet UID comme deja resolu par le serveur.

## L'identite d'entree

- **Projet logiciel** : MCP WealthTech SSH Bridge, code source `Patricked-code/MCP` sur `main`.
- **Produit deploye** : `wealthtech_ssh_bridge` sur S1, checkout `/opt/apps/wealthtech-mcp-ssh-bridge`, runtime Docker.
- **Distinct de l'outil** : ce depot produit le MCP ; ses outils peuvent aussi administrer *d'autres* projets. `MCP_SELF` signifie travailler **sur ce depot**, pas intervenir sur AfricaFunds, UAES, Regulatory ou un autre service.
- **Niveau de preuve** : la racine est une proposition documentaire. Les SHA, permissions, sessions et attributions sont a reobserver avant chaque action.

## Naviguer par profondeur

| Niveau | Registre Markdown | Question |
| --- | --- | --- |
| L0 | [Identite et alias](00-project/IDENTITY.md) | Quel projet exact, quels alias et quelle instance ? |
| L1 | [Registre des registres](01-authorities/REGISTRY_OF_REGISTRIES.md) | Ou se trouvent les sources et qui fait autorite ? |
| L1 | [Priorite et fraicheur des sources](01-authorities/SOURCE_PRIORITY.md) | Que peut-on croire et revalider ? |
| L2 | [Exigences, conceptions et decisions](02-design/DESIGN_TRACEABILITY.md) | Qu'est-ce qui a ete concu, approuve et remplace ? |
| L3 | [Programmes, roadmap et dependances](03-planning/DEPENDENCIES.md) | Pourquoi ce travail et quels prerequis ? |
| L4 | [Hierarchie des continuities](04-continuity/HIERARCHY.md) | Comment descendre jusqu'a un point precis ? |
| L4 | [133 nœuds de conversation (projection PR #373)](04-continuity/DEEP_CONVERSATION_NODE_INDEX.md) | Explorer les niveaux profonds existants sans detenir leur autorite |
| L4 | [Racines de continuite observees](04-continuity/ROOTS_AND_CHECKPOINTS.md) | Quels identifiants ont de vraies ancres ? |
| L4 | [Fiche de point de reprise](04-continuity/POINT_OF_REPRISE_TEMPLATE.md) | Comment conserver un arret sans perte ? |
| L5 | [Chaine d'execution et de preuves](05-execution/PROOF_CHAIN.md) | Quelle modification et quelle preuve de livraison ? |
| L6 | [Historique et limites de couverture](06-history/HISTORY.md) | D'ou vient le projet et quelles archives ? |
| L7 | [Appels GitHub et MCP](07-entry/GITHUB_AND_MCP_ENTRY.md) | Comment interroger depuis chaque connecteur ? |
| L8 | [Gates d'adoption](08-assurance/ADOPTION_GATES.md) | Que faut-il valider avant de declarer la methode active ? |
| L8 | [Handoff de cette tranche](08-assurance/CONTINUITY_HANDOFF.md) | Quelle est la prochaine action sure ? |

## Contrat de navigation bidirectionnelle

`Project UID → registre des registres → source → programme / conception → chantier → Continuity ID → evenement → checkpoint → preuve → NEXT_ACTION`. Chaque lien doit etre reversible dans la mesure ou la source le permet. Un lien absent n'est pas invente. Un checkpoint historique ne vaut pas attestation live. Les preuves vivant dans GitHub ou S1 restent chez leurs autorites.

## Entree universelle deja existante

Le protocole officiel actuellement applicable demeure [`AGENTS.md`](https://github.com/Patricked-code/MCP/blob/main/AGENTS.md) (INTAKE GitHub → MCP → point de choix), avec [`README.md`](https://github.com/Patricked-code/MCP/blob/main/README.md) et [l'issue #235](https://github.com/Patricked-code/MCP/issues/235). Cette racine ne les remplace pas : elle fournit le **sommaire profond** a charger pendant leur lecture.

## Ce que ce lot n'a pas realise

Aucun `mcp_resolve_canonical_project` n'est encore enregistre dans le catalogue runtime ; aucun mapping `Project UID` MCP n'est encore certifie ; aucune modification S1, session ou queue ; aucune fusion `main`. Consulter [les gates](08-assurance/ADOPTION_GATES.md).
