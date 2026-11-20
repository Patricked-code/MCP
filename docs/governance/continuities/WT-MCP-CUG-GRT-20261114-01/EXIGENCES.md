# Exigences et demandes d'origine — WT-MCP-CUG-GRT-20261114-01

| ID | Exigence | Critère ou limite actuelle |
| --- | --- | --- |
| CUG-E00 | **Intention fondatrice — entrer dans GRT via CUG et le MCP.** Identifier le compte GitHub autorisé et le périmètre, puis orienter vers la création gouvernée, la réutilisation d'un dépôt existant ou la reprise d'un dossier. | Ne pas recréer un dossier à chaque reprise. Le dossier GRT porte son propre identifiant et ses points de reprise. La création (CASE 1) est soumise à ses propres consentements et preuves. [Intake GRT #342](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/issues/342) · [Contrat GRT #343](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/pull/343) · [Admission MCP #401](https://github.com/Patricked-code/MCP/pull/401) |
| CUG-E01 | Une App centrale CUG, couverture de tous les dépôts actuels et futurs des comptes et organisations visés. | Pour chaque propriétaire attendu, séparer état voulu, installation attestée, mode d'accès et dépôts réellement visibles. |
| CUG-E02 | Écouter les changements d'installation, de couverture et de dépôt. | Les familles `installation`, `installation_repositories` et `repository` sont distinctes. Relire GitHub avant de promouvoir un état courant. |
| CUG-E03 | Recenser propriétaire, nom, URL, identifiants et Apps installées, avec noms et IDs. | Dépôt identifié par ID stable. CUG confirmée pour les cibles testées. Pour les autres Apps, inconnu n'est pas absent. |
| CUG-E04 | Registres et structures de données extensibles, avec réutilisation des branchements existants. | Définir source, preuve, champ destinataire, autorité et traitement d'un champ non vérifié. Ne pas créer de deuxième registre serveur. |
| CUG-E05 | Pages dédiées dans le front-end CUG. | La couverture, les dépôts, les événements, leurs effets et les candidats de rapprochement doivent être consultables. Les routes et le dessin exact restent ouverts. |
| CUG-E06 | Rapprochement GitHub–serveur et préparation d'opérations gouvernées. | Observer séparément GitRegistry, remote, chemin, domaine et runtime. Aucun lien ou droit Plesk ne se déduit du webhook seul. |
| CUG-E07 | Traçabilité de l'exécution et non-régression. | GitHub en priorité, préserver le pilote et les parcours existants, vérifier la reprise et les preuves sans intervention directe non requise. |

## Demandes source

Les formulations ci-dessous sont les messages de clarification dans le présent fil. L'interprétation et les critères figurent séparément dans le tableau.

> Mais avant tout partait de cug grt

> D'abord l'idée est que cug s'installe sur tout les repo github.
> Et pour celà il fallait écouter des évènements

> Et cug devait aussi avoir des registres et des pages sur le front end

> Faut aussi  noter tout sur le chantier pour après ensuite les exploiter les ajouter.
> Déjà tu as quoi quoi informations déjà existantes dsnnsle chantier

> Faut que cette documentation soit lié au projet et a sa continuité pour que ce projet ai son fichier de suivi et décisions et aussi l'architecture la roadmap les todo etc.. mais propre au chantier

Les échanges historiques du 14 novembre sont restitués d'après des traces datées, pas comme citations littérales intégrales. [Chronologie et sources](PREUVES.md).
