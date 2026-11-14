# L11 — Persistance S1, indexation pérenne et réconciliation GitHub

[← Orchestration](../10-orchestration/PROJECT_SELF_WORKFLOW.md) · [Fonctionnalités](CAPABILITY_INVENTORY.md) · [Continuité](../12-continuity/DEEP_CONTINUITY_AND_HANDOFF.md)

## Trois objets de persistance, trois autorités

| Objet | Source canonique | Rôle |
| --- | --- | --- |
| **Manifeste de routage** | `.mcp/canonical-project-entry.json` (candidat dans PR #389) | Références **versionnées** du Project UID, workflow de lecture, registres et outils ; embarqué dans l'image de l'outil si PR fusionnée/déployée |
| **Binding effectif repo ↔ projet ↔ instance S1** | GitRegistry V2 / mapping historique `/app/data/mcp-git-registry.json` | Seule autorité de rattachement opérationnel ; **pas encore modifiée** |
| **Événements, sessions, tâches, checkpoints** | Operational Memory / Governed Task Queue / GitHub selon l'opération | Persistance opérationnelle ; **aucune duplication** |

Le manifeste versionné est le **contrat d'entrée de lecture**, pas un store live. Il doit vivre dans l'image exacte-SHA pour éviter que les outils et les documents n'appartiennent à des révisions différentes. Si l'image ne contient pas le manifeste, renvoyer `CANONICAL_ENTRY_UNAVAILABLE` et ne pas inventer la configuration.

## Quels index pérennes rattacher ?

- **Index GitHub** : comptes et installations auxquels le principal a réellement accès, dépôts, owner, permissions, branch/PR/CI ; les comptes varient, donc **pas de liste globale non filtrée figée** dans Git.
- **Index des capacités MCP** : catalogue des outils et ressources réellement enregistrés, version/digest, observations live, annotations de lecture/écriture.
- **Index des mappings de projet** : GitRegistry V2, repositoryComponents, projectUid, serveur, environnement et statut de validation.
- **Index documentaire** : racine Markdown L0…L12, corpus de juillet, décisions, specs et plans.
- **Index de continuité** : Continuity IDs attestés, issues, PR, checkpoints, événements, locks/sessions visibles.
- **Index runtime S1** : S1 HEAD, runtime OCI SHA, statut health, timestamp, provenance du deploy exact-SHA.

Chaque index dérivé doit avoir `indexedAt`, `sourceVersion`, `sourceDigest`, `principalScope`, `coverage`, `missingSources` et `freshness`. Toute indexation persistée est **un cache ou une projection**, pas une seconde autorité.

## Contrat de stockage futur (non activé)

Une amélioration durable pourra enregistrer des **résumés de provenance, identifiants et empreintes non sensibles** dans les mécanismes de cache/événements existants. Elle devra être :
- bornée par compte/tenant/principal et sans exfiltration transversale ;
- rafraîchie depuis les autorités à intervalle justifié ; invalidée lors des changements d'identité, permission, SHA ou registry revision ;
- réconciliable et traçable sans élever des permissions ;
- sanitisée (pas de tokens, credentials, .env, secrets ou contenus privés dans des artefacts publics) ;
- couverte par tests d'isolation et de dérive.
**Aucune base universelle de tous les comptes** n'est créée par cette tranche.

## Alignement exact du produit

`GitHub main SHA → CI main → Deploy SHA → S1 HEAD → runtime image revision → health → Live State`.

Les documents de la PR #389 ne sont pas déployés tant que la PR n'est pas fusionnée, et ne peuvent justifier un `FULLY_ALIGNED` sur la nouvelle révision avant un Governed Deploy attesté.

## Réversibilité

Toute étape documentée peut être abandonnée par clôture de PR sans écriture serveur. Le manifeste candidat ne modifie aucun enregistrement GitRegistry existant et peut être retiré sans migration de store.
