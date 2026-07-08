# MCP Security Model

## Principes non négociables

1. Le token MCP maître porte le rôle SuperAdmin MCP.
2. Un token GitHub ne devient jamais automatiquement SuperAdmin MCP.
3. Le MCP ne demande pas de mot de passe GitHub.
4. Le MCP accepte uniquement un token GitHub explicitement fourni ou une future GitHub App/OAuth.
5. Aucun token brut ne doit être stocké dans Git, les logs, l'audit ou la documentation.
6. Toute écriture Git doit passer par une branche MCP dédiée.
7. `main` reste protégé par défaut.
8. Toute action sensible est auditée.
9. Les actions destructives sont interdites en V1.
10. Le déploiement serveur exige une validation explicite.

## Séparation des secrets

- **Token MCP** : authentifie l'accès au portail MCP et aux API MCP.
- **Token GitHub** : donne des droits GitHub au MCP pour lire, auditer, créer une branche ou proposer une pull request.
- **Tokens internes d'agents** : identifient ChatGPT, Claude, Codex, ConfigCloud, agent serveur, agent audit, etc.

Le registre MCP peut stocker :

```json
{
  "tokenId": "hash_non_reversible",
  "tokenFile": "/app/secrets/github_token",
  "lastCheckedAt": "2026-07-08T00:00:00.000Z",
  "expiresAt": null
}
```

Il ne doit jamais stocker la valeur brute du token.

## Modèle de droits

Droits MCP :

- `mcp.read`
- `mcp.audit`
- `mcp.configure`
- `mcp.agent.create`
- `mcp.repo.bootstrap`
- `mcp.server.map`
- `mcp.deploy.prepare`
- `mcp.deploy.execute`
- `mcp.superadmin`

Droits GitHub détectés :

- lecture compte ;
- lecture organisations ;
- lecture repositories ;
- lecture branches ;
- lecture fichiers ;
- création branche ;
- écriture branche MCP ;
- ouverture pull request ;
- lecture Actions ;
- métadonnées secrets si autorisé ;
- administration repo ;
- administration organisation.

## Branches autorisées

Par défaut, les écritures sont limitées aux branches :

```text
mcp/onboarding-setup
mcp/setup-<repo>
mcp/docs-<repo>
mcp/audit-<repo>
```

Toute écriture directe sur `main`, `master`, `production`, `prod` ou `release` doit être bloquée sauf validation SuperAdmin explicite.

## Audit obligatoire

Chaque événement doit être tracé :

- connexion MCP ;
- identification acteur ;
- connexion GitHub ;
- vérification de droits ;
- liste de repos ;
- onboarding ;
- création agent ;
- génération fichier ;
- tentative d'écriture ;
- création branche ;
- création pull request ;
- erreur ou refus.

## Comportement sans session privée

Sans session privée MCP valide :

- exécution : non ;
- écriture : non ;
- déploiement : non ;
- création agent : non ;
- affichage public : minimal ;
- redirection vers `/login`.

## Comportement avec session privée

Avec session privée MCP valide :

- lire le registre ;
- lister les droits ;
- afficher les repos ;
- connecter un token GitHub ;
- créer un agent interne ;
- préparer un onboarding ;
- écrire seulement sur branche MCP si les droits sont confirmés.
