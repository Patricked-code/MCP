# MCP_TOOLS.md — Catalogue des outils MCP

## Outils actifs en version initiale

| Outil | Serveur | Risque | Description |
|---|---:|---:|---|
| `ping` | local | faible | Vérifie que le MCP répond. |
| `get_project_context` | local | faible | Retourne le contexte S1/S2 et les domaines protégés. |
| `check_disk_s1` | S1 | faible | Affiche l’espace disque. |
| `check_disk_s2` | S2 | faible | Affiche l’espace disque. |
| `pm2_status_s1` | S1 | faible | Liste les processus PM2. |
| `pm2_status_s2` | S2 | faible | Liste les processus PM2. |
| `docker_status_s1` | S1 | faible | Liste les conteneurs Docker. |
| `docker_status_s2` | S2 | faible | Liste les conteneurs Docker. |
| `list_domains_s1` | S1 | faible | Liste des dossiers de domaines. |
| `list_domains_s2` | S2 | faible | Liste des dossiers de domaines. |
| `list_large_files_s1` | S1 | faible | Liste les fichiers volumineux. |
| `list_large_files_s2` | S2 | faible | Liste les fichiers volumineux. |
| `list_backups_s1` | S1 | faible | Liste les sauvegardes potentielles. |
| `list_backups_s2` | S2 | faible | Liste les sauvegardes potentielles. |
| `curl_domain` | S1 | faible | Vérifie les en-têtes HTTPS d’un domaine. |

## Outils GitHub read-only contrôlés

Ces outils exposent l’état GitHub au protocole MCP sans publier de token, sans écrire dans GitHub et sans déclencher d’action production.

| Outil | Portée | Risque | Description |
|---|---:|---:|---|
| `github_status` | GitHub/MCP | faible | Retourne le statut public-safe de connexion GitHub du MCP. |
| `github_list_orgs` | GitHub/MCP | faible | Liste les organisations visibles par le token MCP et vérifie l’organisation cible. |
| `github_list_repos` | GitHub/MCP | faible | Liste les repositories visibles pour une organisation donnée ou l’organisation cible. |
| `github_repo_status` | GitHub/MCP | faible | Retourne le statut d’un repo et les fichiers de gouvernance `.mcp` manquants. |
| `github_list_prs` | GitHub/MCP | faible | Liste les pull requests public-safe d’un repo. |
| `github_list_actions` | GitHub/MCP | faible | Liste les derniers runs GitHub Actions public-safe d’un repo. |
| `github_audit_permissions` | GitHub/MCP | faible | Audite les permissions repo, les signaux d’écriture et la politique branch/PR-only. |

## Outils GitHub scoped-write contrôlés

Ces outils ne sont enregistrés que lorsque `ENABLE_WRITE_TOOLS=true`. Même dans ce mode, ils ne permettent pas l’écriture libre.

| Outil | Portée | Risque | Garde-fou |
|---|---:|---:|---|
| `github_create_branch` | GitHub/MCP | moyen contrôlé | Crée uniquement des branches `mcp/*`. |
| `github_commit_files_on_branch` | GitHub/MCP | moyen contrôlé | Commit uniquement sur branche `mcp/*`, bloque `.env`, clés privées et chemins dangereux. |
| `github_open_pr` | GitHub/MCP | moyen contrôlé | Ouvre une PR depuis une branche `mcp/*`, par défaut en draft. |

## Règles de sécurité GitHub MCP

- Aucune écriture directe sur `main` ou `master`.
- Toute écriture passe par une branche `mcp/*`.
- Toute livraison passe par pull request.
- Les outils GitHub ne déclenchent aucune migration serveur, aucun nettoyage, aucun arrêt de service et aucun déploiement.
- Les résultats retournés sont des JSON public-safe.
- Les métadonnées d’audit masquent les champs de type token, secret, password, private key, authorization, cookie ou `.env`.
- Les commits contrôlés refusent les fichiers `.env`, `.pem`, `.key`, `.p12`, `.pfx`, `id_rsa`, `id_ed25519` et `authorized_keys`.

## Outils non actifs au départ

- suppression de sauvegarde ;
- vidage de contenu domaine ;
- arrêt PM2 ;
- redémarrage service hors recette validée ;
- rsync appliqué ;
- import base de données ;
- merge automatique de pull request ;
- modification des secrets GitHub Actions ;
- modification directe des protections de branche.

Ces outils ne doivent être ajoutés qu’après validation du mode read-only, inventaire privé, backup, rollback, tests et approbation opérateur.
