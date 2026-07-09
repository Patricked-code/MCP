# Audit Issue #3 — Private server inventory and operator approval blocker

## Identification

- Numéro : #3
- Type : Issue GitHub, pas Pull Request
- Statut : ouverte
- Titre : `[MCP blocker] Collect private server inventory and operator approval evidence`
- Labels : `mcp-blocker`, `private-inventory`, `operator-approval`
- Rôle propriétaire attendu : opérateur serveur avec approbation humaine explicite

## Nature du blocker

`production_actions_require_private_inventory_and_approval`

Les actions de cleanup serveur, migration, changement de vhost, arrêt de service ou déploiement sont volontairement bloquées tant que l’inventaire privé S1/S2, les sauvegardes, le rollback, les tests et l’approbation opérateur n’existent pas hors Git.

## Ce que #3 bloque

- `collect_private_server_inventory`
- `prepare_server_mapping_without_exposing_private_inventory`
- `execute_migration_steps_with_operator_approval`

## Checklist issue #3

- utiliser `Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md` comme template public-safe ;
- collecter l’inventaire live S1/S2 dans un emplacement opérationnel privé approuvé hors Git ;
- enregistrer les références de backups/exports hors Git ;
- enregistrer les références de rollback hors Git ;
- enregistrer le périmètre et la date d’approbation opérateur sans secret ;
- préparer les tests post-action avant tout cleanup, migration, changement de vhost ou arrêt de service ;
- publier uniquement des synthèses public-safe relues dans Git.

## Critères d’acceptation

- inventaire privé disponible hors Git ;
- référence backup/export disponible hors Git ;
- plan rollback disponible hors Git ;
- périmètre/date d’approbation opérateur enregistrés sans secret ;
- aucune suppression production, migration, arrêt de service ou changement vhost avant approbation.

## Vérifications prévues

- `GET /git/onboarding/server-cards`
- `GET /git/onboarding/tasks`
- `node scripts/check-no-secrets.mjs`
- `node scripts/check-docs.mjs`

## Contraintes sécurité

- ne pas coller de token brut, `.env`, clé privée, recovery code ou inventaire serveur privé dans l’issue ;
- ne pas exécuter d’action production depuis cette issue publique ;
- après changement d’évidence, régénérer les artefacts source/PDF/archive/objective/task/blocker/completion/operator-action et exécuter la gate de non-régression.

## Impact sur PR #1

PR #1 contient beaucoup d’éléments Migration/*, server inventory cards, execution runway, resume gate et operator action pack. Ces éléments ne doivent pas déclencher d’action production tant que #3 reste ouvert.

## Impact sur PR #4

PR #4 concerne principalement les outils GitHub MCP. Elle peut progresser techniquement, mais tout outil d’écriture ou toute action scoped-write doit rester bloqué ou strictement contrôlé si elle dépend d’un état serveur, d’un inventaire privé ou d’une approbation opérateur non vérifiés.

## Impact sur PR #5

PR #5 propose un onboarding engine. Ce moteur doit intégrer le fait que les informations privées serveur et les validations opérateur restent hors Git. Les routes onboarding ne doivent exposer que des synthèses public-safe.

## Décision provisoire

- Ne pas fermer #3.
- Ne pas considérer #3 comme résolu.
- Intégrer #3 comme blocker production/migration actif.
- Ne pas autoriser de cleanup, migration, arrêt service, changement vhost ou action production sans preuve privée hors Git et validation opérateur.
