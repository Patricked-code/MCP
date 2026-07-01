# Document public — Accès MCP WealthTech

Date de génération : 2026-07-01 01:58:57 UTC

Ce document ne contient aucun secret complet. Il peut être copié dans la documentation projet ou partagé à un développeur sans exposer le token MCP.

---

## 1. Identité du serveur MCP

| Élément | Valeur |
|---|---|
| Nom MCP | wealthtech_ssh_bridge |
| Domaine | mcp.wealthtechinnovations.com |
| URL MCP | https://mcp.wealthtechinnovations.com/mcp |
| Healthcheck | https://mcp.wealthtechinnovations.com/health |
| Serveur d’hébergement | S1 |
| IP S1 | 212.227.212.33 |
| Serveur secondaire accessible | S2 |
| IP S2 | 217.160.249.254 |
| Transport | Streamable HTTP MCP |
| Authentification | Bearer token |
| Mode initial | read-only-first |

---

## 2. État technique actuel

### DNS

| Type | Valeur |
|---|---|
| A public | 212.227.212.33  |
| AAAA public | aucun |

### Healthcheck

| Test | Résultat |
|---|---|
| HTTP code /health | 200 |
| Body /health | {"ok":true,"service":"wealthtech_ssh_bridge","mode":"read-only-first"} |
| HTTP code /mcp sans token | 401 |

### Docker

```text
NAMES                       STATUS       PORTS
wealthtech_mcp_ssh_bridge   Up 2 hours   127.0.0.1:8787->8787/tcp
```

### SSH

| Test | Résultat attendu | Résultat réel |
|---|---|---|
| S1 via clé MCP | S1_OK | S1_OK |
| S2 via clé MCP | S2_OK | S2_OK |

---

## 3. Configuration ChatGPT

### Valeurs à saisir

| Champ | Valeur |
|---|---|
| Nom du serveur | wealthtech_ssh_bridge |
| URL | https://mcp.wealthtechinnovations.com/mcp |
| Type d’authentification | Bearer token |
| Header | Authorization |
| Valeur | Bearer <MCP_AUTH_TOKEN> |

### Permission recommandée

Pour le premier usage, utiliser un mode prudent :

- lecture automatique autorisée ;
- demander confirmation avant toute action sensible ;
- ne pas activer d’actions destructives ;
- conserver uniquement les outils read-only au départ.

### Test depuis ChatGPT

Demande à ChatGPT :

```text
Utilise le serveur MCP wealthtech_ssh_bridge et lance l’outil ping.
```

Puis :

```text
Utilise le serveur MCP wealthtech_ssh_bridge et récupère le contexte projet.
```

Puis :

```text
Utilise le serveur MCP wealthtech_ssh_bridge et vérifie l’espace disque de S1.
```

Puis :

```text
Utilise le serveur MCP wealthtech_ssh_bridge et vérifie l’espace disque de S2.
```

---

## 4. Configuration Claude ou autre client MCP compatible

### Configuration générique remote MCP

```json
{
  "mcpServers": {
    "wealthtech_ssh_bridge": {
      "type": "http",
      "url": "https://mcp.wealthtechinnovations.com/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

### Variante avec nom explicite

```json
{
  "name": "wealthtech_ssh_bridge",
  "transport": {
    "type": "streamable_http",
    "url": "https://mcp.wealthtechinnovations.com/mcp",
    "headers": {
      "Authorization": "Bearer <MCP_AUTH_TOKEN>"
    }
  }
}
```

### Test générique

Un client MCP compatible doit pouvoir appeler l’outil :

```text
ping
```

Réponse attendue :

```text
wealthtech_ssh_bridge_ok
```

---

## 5. Outils MCP actuellement prévus

Outils read-only initiaux :

- ping
- get_project_context
- check_disk_s1
- check_disk_s2
- pm2_status_s1
- pm2_status_s2
- docker_status_s1
- docker_status_s2
- list_domains_s1
- list_domains_s2
- list_large_files_s1
- list_large_files_s2
- list_backups_s1
- list_backups_s2
- curl_domain

Actions destructives non activées au départ :

- suppression de sauvegardes ;
- vidage de domaines ;
- arrêt de services ;
- redémarrage de services ;
- migration appliquée ;
- suppression de fichiers ;
- import/export base de données destructif.

---

## 6. GitHub — accès lecture seule

Dépôt cible :

```text
Patricked-code/MCP
```

### Option recommandée

Créer un fine-grained personal access token limité au dépôt nécessaire.

Permissions minimales :

| Permission GitHub | Niveau |
|---|---|
| Repository access | Only selected repositories |
| Repository | Patricked-code/MCP |
| Contents | Read-only |
| Metadata | Read-only |
| Expiration | 90 jours ou moins |

Lien de création prérempli :

```text
https://github.com/settings/personal-access-tokens/new?name=wealthtech-mcp-readonly&description=Acces+lecture+seule+pour+MCP+WealthTech&target_name=Patricked-code&expires_in=90&contents=read
```

Utilisation :

```bash
export GITHUB_TOKEN_READONLY="COLLER_ICI_LE_TOKEN_READONLY"

curl -sS \
  -H "Authorization: Bearer $GITHUB_TOKEN_READONLY" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/Patricked-code/MCP
```

---

## 7. GitHub — accès lecture et modification

Permissions minimales pour modifier le code du dépôt :

| Permission GitHub | Niveau |
|---|---|
| Repository access | Only selected repositories |
| Repository | Patricked-code/MCP |
| Contents | Read and write |
| Pull requests | Read and write |
| Issues | Read and write, optionnel |
| Workflows | Write, uniquement si modification de GitHub Actions |
| Expiration | 30 à 90 jours |

Lien de création prérempli :

```text
https://github.com/settings/personal-access-tokens/new?name=wealthtech-mcp-readwrite&description=Acces+lecture+et+modification+pour+MCP+WealthTech&target_name=Patricked-code&expires_in=90&contents=write&pull_requests=write&issues=write
```

Utilisation API simple :

```bash
export GITHUB_TOKEN_WRITE="COLLER_ICI_LE_TOKEN_WRITE"

curl -sS \
  -H "Authorization: Bearer $GITHUB_TOKEN_WRITE" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/Patricked-code/MCP
```

Utilisation Git HTTPS :

```bash
git clone https://github.com/Patricked-code/MCP.git
cd MCP
git remote set-url origin https://x-access-token:${GITHUB_TOKEN_WRITE}@github.com/Patricked-code/MCP.git
git status
```

Important : ne jamais écrire le token dans un fichier versionné, dans un README public, dans une URL affichée publiquement ou dans un dépôt GitHub.

---

## 8. Emplacement sécurisé des secrets

Sur S1, les secrets doivent rester dans :

```text
/opt/apps/wealthtech-mcp-ssh-bridge/.env
```

Fichiers à ne jamais pousser :

```text
.env
.env.*
keys/
*.pem
*.key
*.sql
*.dump
*.bak
*.tar
*.tar.gz
*.zip
```

---

## 9. Commandes utiles S1

### Vérifier le MCP

```bash
curl -sS https://mcp.wealthtechinnovations.com/health
```

### Voir le conteneur

```bash
docker ps --filter "name=wealthtech_mcp_ssh_bridge" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Voir les logs

```bash
docker logs -f wealthtech_mcp_ssh_bridge
```

### Voir le token localement sur S1

```bash
grep '^MCP_AUTH_TOKEN=' /opt/apps/wealthtech-mcp-ssh-bridge/.env
```

---

## 10. Statut attendu avant usage

| Élément | Statut attendu |
|---|---|
| DNS A | 212.227.212.33 |
| DNS AAAA | vide |
| /health | 200 OK |
| /mcp sans token | 401 ou erreur contrôlée |
| Docker | Up |
| S1 SSH | OK |
| S2 SSH | OK |
| ChatGPT | serveur activé |
| Claude/autre client | URL + Bearer token configurés |

