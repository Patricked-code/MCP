# MCP Audit Logs

## Objectif

Les journaux d'audit MCP doivent permettre de comprendre qui s'est connecté, quel compte GitHub a été utilisé, quels droits ont été détectés, quelles actions ont été proposées, exécutées ou refusées, et pourquoi.

## Événements à tracer

- connexion MCP ;
- déconnexion MCP ;
- identification acteur ;
- création agent ;
- modification rôle agent ;
- connexion GitHub ;
- remplacement token GitHub ;
- vérification droits ;
- inventaire repositories ;
- analyse repo footprint ;
- création mapping serveur ;
- démarrage onboarding ;
- réponse questionnaire ;
- génération fichiers `.mcp` ;
- création branche ;
- préparation pull request ;
- refus d'action ;
- erreur technique ;
- action de déploiement préparée ou exécutée.

## Structure d'un événement

```json
{
  "id": "audit_20260708_000001",
  "at": "2026-07-08T00:00:00.000Z",
  "actorId": "mcp_agent_chatgpt",
  "actorName": "ChatGPT",
  "actorType": "ai_agent",
  "mcpTokenId": "hash_non_reversible",
  "githubLogin": "Patricked-code",
  "githubOrg": "chainsolutions-wealthtech",
  "repo": "Patricked-code/MCP",
  "action": "github.rights.checked",
  "result": "success",
  "rights": {
    "read": true,
    "write": true,
    "admin": false,
    "orgAdmin": false
  },
  "warnings": [],
  "errors": [],
  "metadata": {}
}
```

## Règles de sécurité

- Ne jamais stocker le token brut.
- Ne jamais stocker de mot de passe.
- Ne jamais stocker de clé privée.
- Hasher les identifiants de tokens.
- Limiter les métadonnées à ce qui est utile pour l'audit.
- Les logs doivent être lisibles, structurés et exportables.

## Rétention

La V1 peut stocker l'audit dans le registre JSON local. Le fichier doit être limité par rotation logique, par exemple les 500 ou 1000 derniers événements. Une future version pourra migrer vers SQLite ou PostgreSQL.

## Interface

La route `GET /git/audit` doit afficher :

- les événements récents ;
- des filtres par acteur ;
- des filtres par compte GitHub ;
- des filtres par repo ;
- des filtres par type d'action ;
- des filtres par statut.

## Comportement d'erreur

Un échec d'audit ne doit jamais exposer un secret. Une action sensible ne doit pas continuer si l'audit obligatoire ne peut pas être écrit.
