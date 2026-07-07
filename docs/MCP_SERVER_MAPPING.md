# MCP Server Mapping

## Objectif

Le mapping relie un repository GitHub a un dossier serveur et a son environnement d execution, sans exposer de secret.

## Champs JSON

`.mcp/server-map.json` contient:

- nom du projet;
- owner GitHub;
- repo GitHub;
- branche principale;
- chemin serveur;
- environnement;
- domaine public;
- service Docker eventuel;
- fichiers de deploiement;
- scripts critiques;
- statut de synchronisation;
- derniere verification;
- notes d audit.

## Regles de securite

Ne jamais publier de token, cle privee, dump, mot de passe, `.env`, IP sensible non validee, ou chemin contenant des informations confidentielles.

Les chemins serveur complets doivent etre confirmes avant publication publique. Les inventaires bruts restent dans un espace prive ou protege.

## Exemple sans secret

```json
{
  "version": 1,
  "projectName": "example-api",
  "github": {
    "owner": "chainsolutions-wealthtech",
    "repo": "example-api",
    "defaultBranch": "main"
  },
  "server": {
    "path": "to-be-confirmed",
    "environment": "production",
    "publicDomain": "example.com",
    "dockerService": null
  },
  "syncStatus": "needs_review"
}
```
