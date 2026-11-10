# L4 — Catalogue navigable des racines et points de continuite

[← Hierarchie](HIERARCHY.md) · [Historique](../06-history/HISTORY.md)

> Cette table n'est **pas exhaustive**. Elle regroupe des references dont une source identifiable a ete retrouvee. Statut des PR le 10/11/2026, a reobserver avant decision. Une racine documentaire n'est ni un claim ni un contexte runtime.

| Famille / racine | Ancre verifiable | Portee | Point de reprise de navigation |
| --- | --- | --- | --- |
| Projet MCP global | [Issue #235](https://github.com/Patricked-code/MCP/issues/235), [README](https://github.com/Patricked-code/MCP/blob/main/README.md) | Pilotage et INTAKE | Dernier checkpoint de l'issue + `AGENTS.md` |
| Conversation profonde `MCP-CONV-CONT-20261104-ROOT-01` | [PR #373](https://github.com/Patricked-code/MCP/pull/373) | Arbre conversationnel **draft** | Relecture arbre + dernier evenement |
| Pilot `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` | [Issue #359](https://github.com/Patricked-code/MCP/issues/359), [PR #369](https://github.com/Patricked-code/MCP/pull/369) | E2 pilote | Index E2 et commentaires avec preuve |
| Programme `GD-U-CONT-20261030-ROOT-01` | [Issue #349](https://github.com/Patricked-code/MCP/issues/349) | Gouverned Deploy universel | Reprise du mandat et sous-lots attestes |
| GWC | [Dossier GWC](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/README.md), [PR #354](https://github.com/Patricked-code/MCP/pull/354) | Candidature GWC, histoire PR #95 | `canonical-memory/current.json` + GitHub live |
| Tracabilite UTL | [PR #372](https://github.com/Patricked-code/MCP/pull/372) | Preuves PR→CI→Deploy et UTL, draft | Sources de PR et couverture attestee |
| Architecture globale | [PR #348](https://github.com/Patricked-code/MCP/pull/348) | Carte directrice draft | Dossier architectural candidate |
| Global Work | [PR #374](https://github.com/Patricked-code/MCP/pull/374) | Correspondances inter-programmes, draft | Matrices et revue des revendications |
| Index documentaire | [PR #379](https://github.com/Patricked-code/MCP/pull/379) | 32 sources et 10 perimetres, draft | Index provisoire de sources |
| Historique mergers | [PR #371](https://github.com/Patricked-code/MCP/pull/371) | Etat historique a son checkpoint | Revalider avant de qualifier « integral » |
| OAuth P0 | [PR #207](https://github.com/Patricked-code/MCP/pull/207) | Continuité OAuth et refresh token | Son issue/PR et ownership, ne pas claim |
| Regulatory | [PR #353](https://github.com/Patricked-code/MCP/pull/353) | Admission S1 isolee | L'etat de session runtime n'est pas transfere |

## Le point de reprise exact ne se deduit jamais du titre d'une PR

Pour chaque racine, consulter dans cet ordre : (1) lien canonique explicite, (2) historique append-only et checkpoints, (3) HEAD/PR/CI live, (4) autorites runtime si necessaires, (5) conflit ou gap, (6) `NEXT_ACTION` bornée.

## Index de reprise par niveau

- **Projet entier :** [racine](../README.md) → [registre des registres](../01-authorities/REGISTRY_OF_REGISTRIES.md) → [historique](../06-history/HISTORY.md).
- **Programme/chantier :** [dependances](../03-planning/DEPENDENCIES.md) → issue → Continuity ID → points de preuves.
- **Nœud de discussion :** [PR #373](https://github.com/Patricked-code/MCP/pull/373) → node ID → sources de la conversation.
- **Execution :** [chaine de preuve](../05-execution/PROOF_CHAIN.md) → PR/merge → run → attestation.
- **Session operationnelle :** Operational Memory via outils MCP verifies, **jamais** via cette table seule.
