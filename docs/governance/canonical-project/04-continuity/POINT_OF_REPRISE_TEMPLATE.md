# L4 — Contrat Markdown de checkpoint profond et de handoff

[← Hierarchie](HIERARCHY.md) · [Racines](ROOTS_AND_CHECKPOINTS.md) · [Handoff courant](../08-assurance/CONTINUITY_HANDOFF.md)

## Contrat minimal d'une fiche de point d'arret

| Champ | Sens |
| --- | --- |
| `projectUid` / `repository` | Projet racine, cle candidate signalee tant que non adoptee |
| `continuityId` | ID **reellement observe** ou `null/UNVERIFIED` |
| `parentNodeIds` / `childNodeIds` | Liens verifies ; ne pas generer de filiation imaginaire |
| `entryProfile` | Type d'entree *si choisi* ; ne pas inventer E1/E2 |
| `sourceAuthority` | URL GitHub, Operational Memory, Live State, etc. |
| `observedAt` / `headSha` | Fraicheur et reference exacte |
| `designRef` / `programRef` / `workRef` | Origine du travail si etablie |
| `ownerEvidence` | Identity/mandat/ownership verifie, pas simple mention |
| `completedAction` / `result` | Ce qui a ete effectivement termine et prouve |
| `tests` / `ci` / `reviews` / `deploy` | References de validation disponibles |
| `blockers` / `gaps` / `conflicts` | Obstacles et informations manquantes |
| `nextAction` / `acceptanceGate` | Prochain geste admissible et sa condition |
| `supersedes` | Checkpoint precedent, sans l'effacer |

## Modele de saisie lisible par tout agent

### Point de reprise — `[Continuity ID source]` / `[Node ID]`

- **Projet :** `WT-PROJECT-MCP-001` (ID candidat tant que non adopté)
- **Contexte :** `[issue/PR/design/program]`
- **Autorite :** `[URL ou service reel]`
- **Observation :** `[UTC + HEAD exact]`
- **Parent(s) :** `[references ou UNKNOWN]`
- **Dernier geste prouve :** `[...]`
- **Preuves :** `[URL test/CI/PR/Run/attestation]`
- **Decisions et conflits :** `[...]`
- **Statut :** `VERIFIED / PARTIAL / UNVERIFIED / CONFLICT`
- **NEXT_ACTION :** `[...]`
- **Gate de reprise :** `[...]`
- **Successeur :** `[id ou non cree]`

## Regles fondamentales

1. Append-only pour les evenements ou journal source ; jamais de remplacement silencieux.
2. Un resume Markdown est une **projection** : il renvoie a l'evenement durable et non l'inverse.
3. La reprise ne promeut pas un lien historico-documentaire en autorisation d'ecriture.
4. Les derniers points par chantier sont independants : pas de dernier `NEXT_ACTION` global qui efface les autres.
5. Une session `STALE` n'est pas un mandat de takeover. Une absence de heartbeat ne vaut pas libération.
6. Les liens cross-PR ne prouvent pas que les PR ont ete fusionnees.
7. Les fichiers Markdown ne doivent jamais contenir secrets, jetons ni prompts bruts prives.
