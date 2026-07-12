# Connecter WealthTech MCP à Codex

Vérification : 2026-07-13.  
Serveur : `wealthtech_ssh_bridge`.  
Transport : Streamable HTTP.  
URL : `https://mcp.wealthtechinnovations.com/mcp`.

Documentation officielle Codex :

- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/config-reference

## Option recommandée : OAuth

Le serveur expose actuellement :

- `/.well-known/oauth-protected-resource` ;
- `/.well-known/oauth-authorization-server` ;
- `/oauth/authorize` ;
- `/oauth/token`.

Il utilise Authorization Code avec PKCE S256 et émet des access tokens temporaires. Le token MCP administrateur n’est pas transmis à Codex comme access token OAuth.

### Codex CLI

Exécuter sur l’ordinateur où Codex est installé :

```bash
codex mcp add wealthtech_ssh_bridge --url https://mcp.wealthtechinnovations.com/mcp
codex mcp login wealthtech_ssh_bridge
codex mcp list
```

Pendant la connexion OAuth, le navigateur est redirigé vers l’autorisation WealthTech. L’administrateur doit s’authentifier sur l’écran MCP autorisé.

Dans l’interface terminal Codex, utiliser :

```text
/mcp
```

Puis tester :

```text
Utilise wealthtech_ssh_bridge et appelle ping.
Utilise wealthtech_ssh_bridge et appelle get_project_context.
Utilise wealthtech_ssh_bridge et appelle mcp_git_status_s1.
```

### Configuration TOML manuelle

Configuration utilisateur : `~/.codex/config.toml`.  
Configuration limitée au dépôt : `.codex/config.toml`, chargée uniquement si le projet est approuvé comme fiable.

```toml
[mcp_servers.wealthtech_ssh_bridge]
url = "https://mcp.wealthtechinnovations.com/mcp"
auth = "oauth"
enabled = true
startup_timeout_sec = 20
tool_timeout_sec = 120
default_tools_approval_mode = "writes"
```

Après modification, redémarrer Codex ou l’extension puis exécuter :

```bash
codex mcp login wealthtech_ssh_bridge
codex mcp list
```

Le mode `writes` demande une approbation pour les outils qui ne sont pas déclarés en lecture seule. Les garde-fous du MCP restent applicables en plus des approbations Codex.

## Application de bureau et extension IDE

Sur le même hôte Codex, l’application de bureau, Codex CLI et l’extension IDE partagent la configuration MCP.

1. ouvrir Settings ou le menu engrenage ;
2. ouvrir MCP servers ;
3. sélectionner Add server ;
4. choisir Streamable HTTP ;
5. nommer le serveur `wealthtech_ssh_bridge` ;
6. saisir `https://mcp.wealthtechinnovations.com/mcp` ;
7. enregistrer et redémarrer ;
8. sélectionner Authenticate si OAuth est demandé ;
9. vérifier le serveur avec `/mcp` ou le panneau MCP.

## Repli administrateur : Bearer token

Utiliser cette voie seulement pour un client ou un diagnostic qui ne peut pas terminer OAuth. Ne jamais écrire la valeur du token dans Git, dans `config.toml` ou dans une commande conservée dans l’historique.

Définir le secret dans l’environnement du processus Codex :

```bash
export WEALTHTECH_MCP_TOKEN="valeur-fournie-par-l-administrateur"
```

Puis configurer uniquement le nom de la variable :

```toml
[mcp_servers.wealthtech_ssh_bridge]
url = "https://mcp.wealthtechinnovations.com/mcp"
bearer_token_env_var = "WEALTHTECH_MCP_TOKEN"
enabled = true
default_tools_approval_mode = "writes"
startup_timeout_sec = 20
tool_timeout_sec = 120
```

## ChatGPT Web / Work Mode

ChatGPT Web ne lit pas le fichier local `~/.codex/config.toml`. Dans Work Mode, l’accès passe par le plugin ou connecteur installé. Le serveur est actuellement exposé comme plugin `wealthtech_ssh_bridge`, ce qui permet des appels tels que `@wealthtech_ssh_bridge`.

## Tests attendus

| Test | Résultat attendu |
|---|---|
| `ping` | `wealthtech_ssh_bridge_ok` |
| `get_project_context` | contexte S1/S2 sans secret |
| `mcp_git_status_s1` | branche et état Git |
| `/health` | 200 |
| `/mcp` sans authentification | 401 |
| racine du domaine | redirection 302 vers `/dashboard` |

## Dépannage

1. vérifier `codex mcp list` ;
2. exécuter `codex mcp login wealthtech_ssh_bridge` ;
3. vérifier que le navigateur termine l’autorisation ;
4. redémarrer Codex ou l’extension ;
5. utiliser `/mcp` pour contrôler les outils chargés ;
6. appeler `ping` ;
7. si `401`, refaire OAuth ou vérifier que la variable Bearer existe dans l’environnement du processus ;
8. si le serveur n’apparaît pas, vérifier la confiance accordée au dépôt pour une configuration `.codex/config.toml` ;
9. si une politique d’entreprise désactive le serveur, demander à l’administrateur d’autoriser exactement le nom et l’URL du MCP.

## Distinction à conserver

`codex mcp add` connecte Codex comme client à WealthTech MCP.  
`codex mcp-server` fait l’inverse : il expose Codex lui-même comme serveur MCP pour un autre orchestrateur. Ce second mode n’est pas nécessaire pour la connexion décrite ici.
