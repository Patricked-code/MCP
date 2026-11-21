# Cartographie événements, données, registres et vues — WT-MCP-CUG-GRT-20261114-01

Les reçus et fiches privées sont existants. Les destinations métier et noms de vues ci-dessous sont des **candidats à valider**, pas des pages livrées.

| Signal ou source | Information présente aujourd'hui | Vérification cible | Registre ou vue candidat |
| --- | --- | --- | --- |
| Périmètre déclaré | Propriétaires cités dans les échanges, sans liste canonique attestée | Comparer les propriétaires attendus aux installations CUG réellement observées | Installations et écarts de couverture |
| `installation` | Signal relatif à l'installation pilote | Installation, propriétaire, mode, suspension ou retrait et fraîcheur | Installations CUG |
| `installation_repositories` | Signal pilote, pas de liste retenue des dépôts ajoutés/retirés | Diff de couverture attesté par installation et ID dépôt ; distinguer retrait et indisponibilité | Couverture et changements |
| `repository` | Reçu et observation sur UAES, si données cohérentes | Identité, propriétaire, nom, URL, branche par défaut, visibilité, statut archivé ou fork | Dépôts et historique |
| Collecte autorisée des Apps | CUG confirmée pour la cible ; autres Apps non vérifiées | Choisir une source qui confirme nom, App ID et installation avec couverture explicite | Apps et preuve de couverture |
| Traitement B1 | Projection privée liée au reçu UAES | Relier livré, dédupliqué, vérifié, en échec et champs effectivement modifiés | Événements CUG |
| GitRegistry et preuves serveur | Candidat par nom, nombre de correspondances et empreinte du registre | Vérifier remote, chemin et preuves S1/S2 indépendamment des métadonnées GitHub | Rapprochements gouvernés |

## Contrat de raccordement à compléter

Pour chaque champ, conserver **événement/action, source qui fait foi, identifiant de jointure, valeur vérifiée et heure, registre et champ destinataires, acteur ou permission, règle en cas d'échec et vue**. Éviter la duplication : une page peut agréger plusieurs sources et plusieurs vues peuvent lire le même registre. Distinctions indispensables : non vérifié ≠ absent, reçu ≠ traité, nom correspondant ≠ serveur rattaché, branche par défaut ≠ branche ou SHA déployé.

Critère de reprise : documenter le cas réel UAES comme premier exemple de bout en bout jusqu'à la preuve privée, puis le cas B2 comme vérification sur demande. Aucun des deux ne démontre encore toutes les destinations du front-end.
