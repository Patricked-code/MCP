# DATABASE.md

## Rôle
Documentation des bases de données liées au MCP et aux projets intégrés.

## Règles
- Aucune migration SQL sans sauvegarde et validation.
- SQL autorisé uniquement en lecture lorsque l’outil MCP l’impose.
- Ne jamais écrire de credentials DB dans Git.
- Documenter tables, schémas, migrations, sauvegardes et risques.

## À vérifier
Bases réellement utilisées par le MCP, bases des projets intégrés, scripts de migration, dumps, restauration et politiques de rétention.

## État vérifié au 2026-07-13

Le dépôt MCP ne déclare aucun moteur de base comme dépendance applicative. Il conserve cependant un registre local dans `data/` et expose un outil SQL limité à `SELECT` pour certains projets autorisés. Cela ne prouve pas l’absence de bases sur les projets intégrés.

## Procédure avant toute action données

1. Identifier le projet, le moteur, l’environnement et le propriétaire.
2. Confirmer que la requête est en lecture seule ; sinon exiger une tâche, une approbation et un rollback.
3. Vérifier sauvegarde, restauration testée et fenêtre d’intervention avant toute migration.
4. Masquer les noms sensibles et ne jamais copier de chaîne de connexion dans les rapports.
5. Consigner commande, résultat et limites dans `SUIVI.md`.

## Risques et garde-fous

Une présence de fichier `.sql` ou `.dump` n’autorise ni lecture ni commit. Les chemins sensibles sont interdits par `.mcp/permissions.json`. Les informations par projet appartiennent à `docs/projects/<projet>/DATABASE.md`.

## Historique

- 2026-07-13 : ajout de l’état vérifié et de la procédure de changement.
