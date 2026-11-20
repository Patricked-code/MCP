# Backlog et critères de sortie — WT-MCP-CUG-GRT-20261114-01

Ce registre documentaire ne se substitue pas à une Task Queue et ne déclare pas de claim. Le [point de reprise](SUIVI.md) indique l'unique action à reprendre.

| ID | Travail | Critère de sortie |
| --- | --- | --- |
| CUG-B2-01 | En lecture seule, relever les propriétaires attendus, les installations CUG effectivement attestées, le mode et les dépôts accessibles | Baseline datée avec IDs, preuve, couverture et état inconnu explicite par propriétaire, sans élargissement des droits |
| CUG-B2-02 | Définir traitement par type/action, réconciliation périodique, et comportement lors d'un retrait ou transfert | Vérifications et critères de reprise par cas, pas de suppression d'état à partir d'un échec |
| CUG-B2-03 | Définir rétention et reprise avant automatisation multi-installations | Capacité, redélivrance, doublons, saturation, signaux de perte et preuves après relance documentés |
| CUG-DATA-01 | Inventorier les branchements aval et attribuer source/autorité à chaque champ | Matrice événement → vérification → champ → registre → vue, distinguant GitHub, état serveur et décision |
| CUG-DATA-02 | Identifier comment confirmer les autres GitHub Apps par dépôt | Source autorisée et périmètre vérifiés, séparation entre absence confirmée et non vérifié |
| CUG-UI-01 | Cartographier le front-end existant et les vues CUG à raccorder | Navigation et critères de lecture des installations, dépôts, événements et rapprochements, distincts de l'admission GRT |
| CUG-C-01 | Préparer les rapprochements GitHub ↔ GitRegistry ↔ S1/S2 | Correspondance par identité et preuves serveur, sans écrire ni autoriser Plesk par déduction |
| CUG-D-01 | Relier par référence le pilote de création GRT, sans l'activer depuis CUG | Dossier GRT séparé et preuves propres ; aucun retraitement du pilote webhook |

Déjà attestés et à ne pas refaire sans motif : A sur UAES, B1 sur UAES et la collecte opérateur du deuxième dépôt B2. [Preuves](PREUVES.md).
