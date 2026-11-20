# Décisions du chantier CUG — WT-MCP-CUG-GRT-20261114-01

Les décisions du propriétaire, les limites actées dans GitHub et les choix encore ouverts sont distingués. Une option documentaire n'est pas une permission opérationnelle.

| ID | Date | Décision ou limite | Source |
| --- | --- | --- | --- |
| CUG-D01 | 14 novembre | La cible est une App CUG centrale, installée sur chaque propriétaire GitHub visé en mode **Tous les dépôts**. UAES reste le pilote. Ne pas déduire la couverture effective du mode cible. | [Exigences et traces](EXIGENCES.md) |
| CUG-D02 | 14 novembre | S1 héberge le récepteur et le collecteur. Séparer **livraison signée**, **observation** et **état GitHub vérifié**. | [Runbook](../../cug-webhook-receiver.md), [#403](https://github.com/Patricked-code/MCP/pull/403) |
| CUG-D03 | 14 novembre | Journal d'entrée extensible et versionné, compatible avec v1. Une observation v2 ne devient ni autorisation ni ordre d'exécution. | [`8f45bf5`](https://github.com/Patricked-code/MCP/commit/8f45bf5968a4e9e5245a0be028faf387de1215b9) |
| CUG-D04 | 14 novembre | Une installation CUG confirmée ne prouve pas les autres Apps. Une correspondance par nom dans GitRegistry ne prouve ni un remote, ni un chemin, ni Plesk, ni un droit. | [#404](https://github.com/Patricked-code/MCP/pull/404) |
| CUG-D05 | 19–20 novembre | Préserver A, B, C et D comme blocs distincts. Le résultat B2 sur un dépôt GRT est une observation de dépôt, pas l'exécution du parcours de création GRT. | [Suivi](SUIVI.md), [#411](https://github.com/Patricked-code/MCP/pull/411) |
| CUG-D06 | 20 novembre | Les registres extensibles et les pages dédiées font partie du livrable. Réutiliser les branchements actuels. La page d'admission GRT ne remplace pas les vues CUG. | [Exigences](EXIGENCES.md), [#401](https://github.com/Patricked-code/MCP/pull/401) |
| CUG-D07 | 20 novembre | Le chantier possède sa propre documentation liée à son ID. Le runbook et les registres du projet hôte conservent leur autorité ; pas de mémoire runtime parallèle. | [Continuité](CONTINUITY.md), [index gouvernance](../../README.md) |

## Choix encore ouverts

- Le schéma persistant de l'inventaire courant et les champs modulaires réellement nécessaires.
- Les routes et écrans exacts, les branchements à réutiliser et le propriétaire de chaque champ.
- L'autorité et la couverture de la consultation des autres GitHub Apps par dépôt.
- La stratégie de réconciliation multi-installations, la rétention et les règles de réaction aux pertes de couverture.
- Le périmètre exact des comptes et organisations à couvrir, à confronter aux installations effectivement visibles.
