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

## Traces de conversation et preuve opérateur

- **13 novembre, 22 h 32 Paris** : principe de CUG recevant les événements et d'identification du dépôt.
- **14 novembre, 08 h 17** : demande de webhook central et de collecte propriétaire/nom/URL/Apps. **08 h 53** : demande de registre ou table extensible. Les traces sont datées, sans URL d'origine vérifiée ni transcription intégrale.
- **16 novembre au soir** : tentative de collecte non concluante sur le chemin de clé privée attendu. À ne pas confondre avec le secret du récepteur.
- **19 novembre au soir** : articulation des quatre blocs historiques et conservation de l'existant.
- **20 novembre, 04 h 21 min 55 s Paris** : sortie opérateur B2 partagée par le propriétaire pour `chainsolutions-wealthtech/Governed-Repository-Template`. Résultat `CUG_SCOPED_SNAPSHOT_STORED`. Empreinte `179dbf3c0a9aa5b156168079215b9b7239d452bfb33f9e0ba2d348da27dc5b02`. `NO_NAME_MATCH`, `NOT_VERIFIED`, `provisioningAuthorized=false`. Prouve un instantané privé sur une deuxième cible, pas un test d'automatisation, de rattachement ni de création GRT.

Le suivi global ne répertoriait auparavant que l'action à faire pour ce deuxième dépôt. [SUIVI.md](SUIVI.md) de ce chantier réconcilie cette preuve dans le checkpoint. Aucune pièce privée brute, clé ou configuration de secret n'est incluse.
