# L7 — Appel par ID depuis GitHub ou depuis le bridge MCP

[← Racine](../README.md) · [Identite](../00-project/IDENTITY.md) · [Gates](../08-assurance/ADOPTION_GATES.md)

## A. Depuis un connecteur GitHub — disponible des maintenant

Demander a l'agent : **« Resous `WT-PROJECT-MCP-001` comme projet logiciel MCP, ouvre `docs/governance/canonical-project/README.md` sur sa branche candidate, lis les registres L0→L8, puis reobserve GitHub et les autorites necessaires. Rends les liens de preuves et les NEXT_ACTION par chantier ; lecture seule et sans reprise implicite de Regulatory. »**

Sans l'acces a la branche candidate, l'agent doit annoncer `CANDIDATE_NOT_AVAILABLE_ON_MAIN` ; il doit rester capable d'entrer par `AGENTS.md`. Cette commande **n'est pas** un mot-cle declencheur serveur. Il faut un agent deja invoque et un connecteur autorise.

## B. Depuis l'outil MCP — methode existante en lecture seule

Ordre MCP lorsqu'il est necessaire et disponible : `ping → mcp_reconcile_governed_context → mcp_get_current_state_inventory`, puis `mcp_get_live_state` pour une observation detaillee. `get_project_context` est une vue de serveur/outils, pas encore un resolver canonique de Project UID.

## C. Contrat de resolver cible — NON DEPLOYE

Nom d'API **propose** : `mcp_resolve_canonical_project`, arguments `project_uid`, `view`, `depth`, `at` (optionnel), `continuity_id` (optionnel), `readonly=true` ; rejeter tout ID inconnu. Toutes les donnees sont resolues depuis GitRegistry/GitHub/Operational Memory/Live State selon leurs proprietes, **jamais** depuis un second store universel.

### Vues minimales

| Vue | Sortie | Conditions |
| --- | --- | --- |
| `IDENTITY` | Projet/alias/autorites | Mapping effectif et provenance |
| `REGISTRIES` | Inventaire profond de liens | Respecter l'autorite de chaque source |
| `DESIGN` | Requirements/designs/approbations | Version + preuve d'approbation |
| `PROGRAMS` | Master Plan/roadmap/dependances | Pas de Task creee par projection |
| `CONTINUITIES` | Points de reprise et arcs | IDs attestes seulement |
| `HISTORY` | Chronologie sourcée | Couverture par intervalle |
| `EXECUTION` | PR/tests/CI/deploy/attestations | Exact SHA et statut historique |
| `NEXT` | Actions candidates et blockers | Aucune permission inferee |
| `FULL` | Composition des vues | Pagination et borne de profondeur |

## Securite et gouvernance

- **Lecture sans mutation** du Task Store, Session Store, locks ou GitRegistry.
- Aucune session Regulatory reutilisee par defaut.
- Pas de selection E1/E2 implicite : elle intervient **apres** l'INTAKE et choix explicite.
- Si MCP inaccessible, retourner les vues GitHub avec `runtime: UNVERIFIED`, pas une fausse attestation.
- Les preuves indisponibles et les liens cassés sont visibles dans `coverage`.
- Si deux projets revendiquent le meme ID ou alias, resultat `CONFLICT` et aucune selection silencieuse.

## C'est quoi « rentrer ou on veut » ?

`project_uid + view + (optional continuity_id / node_path / time)` permet de descendre ou remonter. Une requete `node_path` selectionne un **lien prouve** ; elle ne cree pas de chemin de continuite fictif. Le serveur doit paginer pour ne pas exposer toutes les sessions ou archives a un demandeur non autorise.

## Raccordement additif dans get_project_context (candidat PR #389)

Le code candidat ajoute le champ `canonicalMcpProject` au résultat de `get_project_context`, sans changer le nom de l'outil, ses arguments ni ses annotations. La réponse charge un manifeste **copié dans l'image Docker**. `status: DOCUMENTARY_CANDIDATE` signifie **index de routage en lecture seule**, pas autorité GitRegistry et pas ID accepté par un resolver paramétré. Le fichier manquant ou invalide renvoie `CANONICAL_ENTRY_UNAVAILABLE`. Sur le runtime actuellement déployé, ce champ reste **non attesté** jusqu'à fusion, CI, Governed Deploy et vérification.

## C. Navigation directe par Project UID dans un checkout GitHub (candidat)

Le script en lecture seule `scripts/mcp-project-entry.mjs` accepte l'ID et une vue sans demander les chemins des documents :

`node scripts/mcp-project-entry.mjs WT-PROJECT-MCP-001 FOUNDATIONS`

Les vues disponibles sont `FULL`, `FOUNDATIONS`, `READING_ORDER`, `LOOP`, `WORKFLOW`, `AUTHORIZATIONS`, `REGISTRIES`, `CAPABILITIES`, `PERSISTENCE`, `CONTINUITIES`, `HISTORY` et `NEXT`. Le résultat JSON donne le chemin documentaire à lire, la chaîne d'entrée, les références de registre et un statut **DOCUMENTARY_CANDIDATE**. Le script ne contacte pas S1 et ne certifie aucun état live. Un ID inconnu est refusé.
