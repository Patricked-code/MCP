# Preuves et provenance — WT-MCP-CUG-GRT-20261114-01

## Sources GitHub

| Référence | Fait soutenu |
| --- | --- |
| [#389, intake et suivi](https://github.com/Patricked-code/MCP/pull/389#issuecomment-6868850153) · [#401](https://github.com/Patricked-code/MCP/pull/401) | Origine documentaire et admission CUG/GRT. Ni récepteur webhook ni preuve de création réelle. |
| [`478e031`](https://github.com/Patricked-code/MCP/commit/478e031ab896ea90d21dfb6e5feea610104a74e5) · [`8f45bf5`](https://github.com/Patricked-code/MCP/commit/8f45bf5968a4e9e5245a0be028faf387de1215b9) · [#403](https://github.com/Patricked-code/MCP/pull/403) | 14 novembre : récepteur signé, puis registre d'entrée v2. Déploiement distinct de l'activation et de la livraison réelle. |
| [#404](https://github.com/Patricked-code/MCP/pull/404) · [deploy](https://github.com/Patricked-code/MCP/actions/runs/43615524390) | Collecteur opérateur UAES distinct et attestation de code sur S1. |
| [#405](https://github.com/Patricked-code/MCP/pull/405) · [#406](https://github.com/Patricked-code/MCP/pull/406) | Réconciliation documentaire distincte du fonctionnement du webhook. |
| [Runbook, pilote A](../../cug-webhook-receiver.md) | Livraison réelle UAES `fa8dc2d0-e47f-11f1-92bf-fd9772b274a6`, `202`, rejeu `204`, reçu unique. Instantané opérateur `11ac25dfd077a1d946cb70e038920622eb6b609873665a10171657e0e05461ea`. |
| [#407](https://github.com/Patricked-code/MCP/pull/407) · [Governed Deploy MCP #206](https://github.com/Patricked-code/MCP/actions/runs/44663633992) | B1 en service sur UAES, contrôle opérateur de la projection privée et arbre Git propre. |
| [#408](https://github.com/Patricked-code/MCP/pull/408) · [#409](https://github.com/Patricked-code/MCP/pull/409) · [#410](https://github.com/Patricked-code/MCP/pull/410) | Réconciliations et exclusion des fiches privées du checkout suivi. Pas de nouvelle couverture ni d'exécution métier en propre. |
| [#411](https://github.com/Patricked-code/MCP/pull/411) · [#412](https://github.com/Patricked-code/MCP/pull/412) | Code B2 et révision de déploiement documentée. Ces liens ne remplacent pas la sortie opérateur de B2. |
| [#414](https://github.com/Patricked-code/MCP/pull/414) · [déploiement](https://github.com/Patricked-code/MCP/actions/runs/44690937822/job/136136290184) | Reprise GRT et consultation des preuves Markdown GRGS en lecture seule. Ne prouve ni la création réelle ni l'adoption de la norme GRGS. |
| [#416](https://github.com/Patricked-code/MCP/pull/416) · [#418](https://github.com/Patricked-code/MCP/pull/418) · [#419](https://github.com/Patricked-code/MCP/pull/419) | Présentation additive de l'admission, guide web séparé sans mouvement de la porte d'entrée, puis réalignement documentaire. Ne prouve ni l'activation de l'admission ni la généralisation de CUG. |

## CUG-B2-01 — baseline de couverture partielle

Relevé du **20 novembre 2026**, contexte de reprise GitHub `main@f08909f5041682f8c36d2a35276bacf8e05e79bf`. Les IDs GitHub des dépôts démontrent leur identité. Seules les preuves de collecte à identité CUG établissent leur visibilité par cette App.

| Propriétaire à qualifier | Identité GitHub du propriétaire | Installation CUG (App `5417646`) | Dépôts prouvés accessibles par CUG | Mode et couverture |
| --- | --- | --- | --- | --- |
| `chainsolutions-wealthtech` | `299685687` | Preuves par dépôt sur l'organisation. Le relevé opérateur B2 cite l'installation `173915815` pour GRT. | `universal-agent-engineering-system` (`1429189311`, preuve UAES) et `Governed-Repository-Template` (`1386478935`, preuve B2 ci-dessous). | Au moins ces deux dépôts observés aux dates des preuves. Mode global et liste exhaustive non vérifiés. |
| `Patricked-code` | `270385782` | Non vérifiée dans ce relevé. | `Patricked-code/MCP` identifié (`1285534440`) mais la lecture GitHub ordinaire ne prouve pas sa visibilité par CUG. | Non vérifié. |
| `Wealthtechinnovations` | `94637590` | Non vérifiée dans ce relevé. | Aucun constat CUG dans les sources consultées. | Non vérifié, pas absent. |

- Le connecteur GitHub a renvoyé des installations pour ces propriétaires, mais sa réponse ne les identifie pas comme appartenant à l'App CUG `5417646`. Son libellé « tous les dépôts » n'est donc pas transposable à CUG.
- Le [collecteur borné existant](https://github.com/Patricked-code/MCP/blob/f08909f5041682f8c36d2a35276bacf8e05e79bf/src/cug/pilotInventory.ts) demande un jeton restreint à un seul dépôt et vérifie sa présence et ses IDs. Ce contrôle prouve l'accès ciblé, pas l'étendue totale de l'installation. La commande opérateur n'a pas été rejouée ici, car elle écrit un instantané privé sans produire l'inventaire multi-installations attendu.
- Il reste à faire corroborer par une source autorisée de l'App CUG le propriétaire, l'ID d'installation, le mode global et les dépôts couverts. Ne pas élargir de droits ni substituer la visibilité d'un autre connecteur. Aucun secret ni liste de dépôts privés n'est publié.

## Traces de conversation et preuve opérateur

- **13 novembre, 22 h 32 Paris** : principe de CUG recevant les événements et d'identification du dépôt.
- **14 novembre, 08 h 17** : demande de webhook central et de collecte propriétaire/nom/URL/Apps. **08 h 53** : demande de registre ou table extensible. Les traces sont datées, sans URL d'origine vérifiée ni transcription intégrale.
- **16 novembre au soir** : tentative de collecte non concluante sur le chemin de clé privée attendu. À ne pas confondre avec le secret du récepteur.
- **19 novembre au soir** : articulation des quatre blocs historiques et conservation de l'existant.
- **20 novembre, 04 h 21 min 55 s Paris** : sortie opérateur B2 partagée par le propriétaire pour `chainsolutions-wealthtech/Governed-Repository-Template`. Résultat `CUG_SCOPED_SNAPSHOT_STORED`. Empreinte `179dbf3c0a9aa5b156168079215b9b7239d452bfb33f9e0ba2d348da27dc5b02`. `NO_NAME_MATCH`, `NOT_VERIFIED`, `provisioningAuthorized=false`. Prouve un instantané privé sur une deuxième cible, pas un test d'automatisation, de rattachement ni de création GRT.

Le suivi global ne répertoriait auparavant que l'action à faire pour ce deuxième dépôt. [SUIVI.md](SUIVI.md) de ce chantier réconcilie cette preuve dans le checkpoint. Aucune pièce privée brute, clé ou configuration de secret n'est incluse.
