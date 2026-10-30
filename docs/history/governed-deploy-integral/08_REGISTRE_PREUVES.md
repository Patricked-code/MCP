# Registre des preuves, vérifications et lacunes

| Objet | Référence | Type | État de vérification |
|---|---|---|---|
| Reprise initiale | PR #15 | Document GitHub | Corps PR consulté ; premiers commits du dépôt non contrôlés |
| GitRegistry V2 | PR #23/#27 | Documents GitHub | Corps consultés ; décisions de supersession explicites |
| GitHub resolution | PR #75 | Document GitHub | Session/Task/checkpoint mentionnés ; runtime historique à recouper |
| GitHub control plane | PR #89 | Document GitHub | CI citées ; branche OPEN observée |
| Contrats provisioning | PR #257/#258 | Documents GitHub | RED/GREEN documentés ; clôture et deploy à contrôler au run |
| Runtime absent | PR #259 | Document GitHub | Préflight et contrat documentés |
| Executor | PR #260 | Document GitHub | RED/GREEN et Governed Deploy #134 déclarés |
| Surface E3 | PR #261/#263 | Documents GitHub | CI #2309/#2310 et Governed Deploy #136 déclarés |
| Plesk observation | PR #267/#271 | Documents GitHub | F-04 non attesté terminal |
| Programme universel | Issue #349 | Mandat GitHub | Issue et commentaires consultés |
| Plesk extension | PR #350 | Document et checkpoint | Merge, CI et déploiement MCP déclarés à SHA exact |
| Pilote Regulatory | PR #352/#353 | Documents GitHub | Préflight/CI ; écriture réelle NON attestée |
| Conflit URL | Regulatory issue #3 | Référence croisée | ADR et résolution à vérifier |
| Extension GD-U | PR #355 | Document GitHub | OPEN ; B3i fail-closed |
| ID global | aucun trouvé | Recherche limitée | NON ATTESTÉ |

## Lacunes non résolues
- Premier commit et première exécution du workflow Governed Deploy du MCP.
- Exhaustivité de tous les commits, reviews, CI, merges et déploiements PR #1 à #355.
- Horodatage exact et auteur de chaque commentaire/commit, hors ceux déjà relevés.
- Versions S1/S2 successives et écarts documentaire/runtime.
- État actuel de chaque tâche/claim/lock et de chaque branche concurrente.
- Chaîne Regulatory bout-en-bout : pas d'attestation de mise en production.
- Confirmation d'un continuity ID global préexistant.
- Intégralité des commentaires et pièces jointes d'autres issues et PR.

## Règle
Ne jamais remplacer « non vérifié » par « terminé » à partir d'un titre de PR ou d'une CI historique.
