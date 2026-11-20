# Feuille de route CUG — WT-MCP-CUG-GRT-20261114-01

La feuille de route ne crée pas de tâche runtime ni de permission. Les états concernent des preuves, pas simplement des PR ouvertes ou fusionnées.

| Lot | État documentaire | Sortie attendue ou preuve | Dépendance et risque |
| --- | --- | --- | --- |
| A — pilote UAES | Attesté | Collecte réelle, webhook `202`, rejeu `204` et reçu unique | Ne pas rejouer sans raison |
| B1 — projection automatique UAES | Attesté | Fiche privée automatiquement produite et corrélée au reçu | Reste strictement UAES |
| B2 — collecteur hors pilote | Tranche opérateur attestée | Une deuxième cible explicitement vérifiée et une preuve privée | Ne prouve pas la couverture de tous les dépôts |
| B2 — couverture et automatisation multi-installations | Ouvert | Inventaire natif des propriétaires, installations et dépôts, traitement des événements et réconciliation | Définir identité, retrait, reprise et rétention avant élargissement |
| Inventaire courant et front-end CUG | À cadrer dans le chantier | Matrice champs/destinations, registres réutilisés, pages de couverture, dépôts, événements et rapprochements | Distinguer données vérifiées, états inconnus et preuves historiques |
| C — rapprochement GitHub et S1/S2 | Non attesté de bout en bout | Preuves de remote, chemin et rattachement corrélées ; décision séparée pour toute écriture | Dépend des preuves serveur et des autorités existantes |
| D — création gouvernée GRT | Parcours distinct | Validation via ses propres consentements, dossier, ID et preuves | Ne pas l'inférer du test B2 sur le dépôt GRT |

L'action à reprendre est maintenue dans [SUIVI.md](SUIVI.md). Les critères de sortie détaillés sont dans [TODO.md](TODO.md).
