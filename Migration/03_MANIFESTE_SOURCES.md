# Manifeste des sources disponibles - Migration WealthTech

## 1. Sources chargees dans l'environnement

Les fichiers suivants etaient disponibles dans `/mnt/data` lors de la creation du dossier `Migration` :

| Fichier | Role |
|---|---|
| `Branche - Migration.txt` | Synthese conversationnelle principale sur serveurs S1/S2, migrations, MCP, securite, documentation et vision ecosysteme. |
| `Branche - Branche - GIT chansolution welathtech.txt` | Analyse des branches GitHub, correspondance serveurs, Claude/Codex, MCP et stabilite des branches. |
| `21_22_resume_branch_links.txt` | Resume des liens branches GitHub / serveurs et matrice de deploiement. |
| `00_resume_global.txt` | Resume global audit GitHub + MCP + S1 + S2. |
| `RSULTATS COMMANDES.txt` | Logs PowerShell/audit, commandes, resultats d'inventaire et synthese globale. |
| `raw_S2.txt` | Inventaire brut S2. |
| `Migration comprehension.txt` | Comprehension complementaire du projet Migration. |
| `Audit.zip` | Archive contenant les fichiers CSV/TXT d'audit GitHub/S1/S2/MCP. |

## 2. Contenu connu de l'archive d'audit

L'archive audit contenait notamment :

- `00_resume_global.txt`
- `01_github_repositories.csv`
- `02_github_branches.csv`
- `03_github_pull_requests.csv`
- `10_server_git_repositories.csv`
- `11_server_git_branches.csv`
- `12_server_projects_without_git.csv`
- `13_server_runtime_inventory.csv`
- `14_mcp_status.csv`
- `20_alignment_github_server_report.csv`
- `21_22_resume_branch_links.txt`
- `21_github_branch_deployment_matrix.csv`
- `22_server_branch_links.csv`
- `raw_S1.txt`
- `raw_S2.txt`
- `RSULTATS COMMANDES.txt`

## 3. Donnees reprises dans ce dossier GitHub

Ce dossier reprend dans GitHub :

- le contexte consolide ;
- les serveurs S1/S2 ;
- les domaines a proteger ;
- les domaines a conserver ;
- les migrations prevues ;
- la vision ecosysteme WealthTech ;
- la methode Loop Engineering ;
- les regles de securite ;
- le statut MCP ;
- la cartographie GitHub / branches / serveurs ;
- les limites de publication GitHub concernant les elements sensibles et les conversations non accessibles.

## 4. Limite documentaire

Les fichiers bruts volumineux et l'archive ZIP ont ete utilises pour generer le PDF complet local et la consolidation textuelle. Les elements sensibles reels ne doivent pas etre publies dans GitHub. Les fichiers d'audit indiquent une logique lecture seule, sans suppression, sans publication distante, sans duplication non controlee et sans lecture du contenu de configuration confidentielle.

## 5. Prochaine amelioration recommandee

Creer ulterieurement un dossier `Migration/sources/` contenant tous les fichiers bruts audites, si et seulement si un controle de securite confirme qu'aucun element confidentiel reel n'est present. Pour une publication exhaustive automatisee des fichiers binaires et gros fichiers, utiliser un environnement Git local authentifie ou une GitHub Action dediee.
