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

## Outils non actifs au départ

- suppression de sauvegarde ;
- vidage de contenu domaine ;
- arrêt PM2 ;
- redémarrage service ;
- rsync appliqué ;
- import base de données.

Ces outils ne doivent être ajoutés qu’après validation du mode read-only.
