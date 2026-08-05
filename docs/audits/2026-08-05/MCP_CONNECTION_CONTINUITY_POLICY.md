# Politique de continuité MCP et GitHub

## Objectif

Un compte GitHub reconnu et un mapping validé doivent rester persistants côté MCP entre les
conversations, sans dépendre de la disponibilité temporaire de l'app dans ChatGPT.

## Règles

1. Les comptes durables sont persistés dans `/app/data`.
2. Les secrets restent dans `/app/secrets` et hors Git.
3. Une nouvelle conversation recharge les connexions, dépôts et mappings.
4. Une perte temporaire du connecteur ChatGPT ne supprime aucune donnée.
5. La reconnexion ne modifie aucune permission.
6. L'auto-découverte reste en lecture seule.
7. Un dépôt découvert ne reçoit aucun chemin serveur validé automatiquement.
8. Le contexte peut être résolu par URL GitHub, nom complet, `projectId` ou domaine.
9. Trois états sont affichés séparément :
   - serveur MCP disponible
   - app MCP disponible dans la conversation
   - connexion GitHub live valide
10. Une écriture reste impossible sans mapping actif et capacité explicite.

## Résultats possibles

- `MCP_SERVER_AVAILABLE`
- `MCP_APP_NOT_AVAILABLE_IN_CURRENT_CHAT`
- `GITHUB_CONNECTION_CONFIGURED`
- `GITHUB_CONNECTION_LIVE_VALIDATED`
- `REPOSITORY_RECOGNIZED`
- `SERVER_MAPPING_NOT_VALIDATED`
- `MAPPING_ACTIVE_READ_ONLY`
- `MAPPING_ACTIVE_WRITE_ALLOWED`

La plateforme ChatGPT peut contrôler l'exposition de l'app. Le MCP peut garantir la persistance et la
réhydratation de son propre contexte, mais ne peut pas forcer l'interface à exposer un outil absent.
