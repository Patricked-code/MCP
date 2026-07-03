# Mémo — MCP, GitHub, S1, S2, Claude, ChatGPT

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`

## 1. Serveur MCP

Nom : `wealthtech_ssh_bridge`

URL MCP : `https://mcp.wealthtechinnovations.com/mcp`

Healthcheck : `https://mcp.wealthtechinnovations.com/health`

Mode : `read-only-first`.

Authentification actuelle : jeton d’accès serveur, à conserver uniquement dans `.env` sur S1. Aucun secret complet ne doit être stocké dans GitHub.

## 2. État confirmé

- DNS du MCP OK.
- Healthcheck public OK.
- Endpoint MCP protégé.
- Container Docker `wealthtech_mcp_ssh_bridge` actif.
- SSH S1 OK.
- SSH S2 OK.
- S1 peut pousser vers `Patricked-code/MCP` via Deploy Key read/write.
- Le compte `Wealthtechinnovations` a le rôle `write` sur `Patricked-code/MCP`.
- Branche active : `main`.
- Remote S1 : `git@github.com-mcp-patricked-rw:Patricked-code/MCP.git`.

## 3. Serveurs

S1 : `root@212.227.212.33`

S2 : `root@217.160.249.254`

## 4. Domaines S1 à préserver

- `niakara.com`
- `www.niakara.com`
- `api.niakara.com`
- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `wealthtechinnovation.com`
- `berebytours.com`

## 5. Domaines S2 protégés

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

Ne jamais modifier, supprimer, vider, redémarrer ou casser ces domaines sans instruction explicite et inventaire préalable.

## 6. Outils MCP attendus

- `ping`
- `get_project_context`
- `check_disk_s1`
- `check_disk_s2`
- `pm2_status_s1`
- `pm2_status_s2`
- `docker_status_s1`
- `docker_status_s2`
- `list_domains_s1`
- `list_domains_s2`
- `list_large_files_s1`
- `list_large_files_s2`
- `list_backups_s1`
- `list_backups_s2`
- `curl_domain`

## 7. ChatGPT et Claude

ChatGPT : si l’interface propose une authentification par jeton ou header personnalisé, utiliser le jeton MCP stocké dans `.env` sur S1. Si l’interface impose OAuth, ajouter d’abord OAuth 2.1 au serveur MCP. Ne pas choisir sans authentification pour un MCP qui accède aux serveurs.

Claude Code : ajouter le serveur MCP distant HTTP en utilisant l’URL MCP et le mécanisme d’authentification correspondant. Vérifier ensuite avec `/mcp`.

## 8. GitHub

Dépôt : `Patricked-code/MCP`.

Le serveur S1 dispose d’une Deploy Key read/write. Le compte `Wealthtechinnovations` a été vérifié en permission `write`.

Ne pas stocker : token admin GitHub, token MCP, clé privée SSH, fichier `.env`, dumps SQL, backups privés.

## 9. Commandes utiles côté S1

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge

git remote -v
git status -sb
git log -1 --oneline
ssh -T github.com-mcp-patricked-rw || true
git ls-remote origin HEAD
git push --dry-run origin main
```

## 10. Point de reprise

Synchroniser les fichiers du dépôt `wealthtech_project_memory/memory/` vers le dossier serveur : `/root/wealthtech_project_memory/memory/`.
