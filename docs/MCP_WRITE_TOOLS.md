# MCP_WRITE_TOOLS.md — Outils d’écriture sécurisés

## Objectif

Ce document décrit la couche d’écriture contrôlée ajoutée au MCP `wealthtech_ssh_bridge`.

Le but est de permettre à un agent IA autorisé de travailler sur les projets WealthTech sans transformer le MCP en console libre.

## Principe de sécurité

Les outils d’écriture sont désactivés par défaut.

Pour les rendre disponibles, il faut activer localement sur le serveur :

```env
ENABLE_WRITE_TOOLS=true
```

Cette activation ne doit pas être poussée dans GitHub avec un fichier `.env` réel.

## Ce qui est volontairement interdit

La couche ajoutée ne crée pas :

- `run_command_s1` ;
- `run_command_s2` ;
- shell libre ;
- accès terminal général ;
- outil de suppression générale ;
- outil de modification SQL libre.

Les opérations restent limitées à des outils nommés, typés et journalisés.

## Outils ajoutés

### `get_write_tools_context`

Affiche le contexte des outils d’écriture disponibles, les projets autorisés et confirme que le shell libre n’est pas exposé.

### `run_sql_readonly_s2`

Exécute uniquement des requêtes SQL qui commencent par `SELECT`.

Protections :

- refus des requêtes multiples ;
- refus des commentaires SQL ;
- refus des mots-clés d’écriture et d’administration ;
- sortie plafonnée ;
- timeout court.

### `exec_repo_script_s2`

Exécute uniquement des scripts explicitement autorisés dans le dépôt API OPCVM.

Scripts autorisés :

```text
scripts/diag/diag_classement_ratios.js
scripts/scraper/indref_admin.js
scripts/scraper/fix_index_tail.js
scripts/scraper/propagate_indref_range.js
scripts/scraper/scrape_indices_daily.js
scripts/recalc/recalc_eur_usd_daily_rate.js
```

Les arguments sont contrôlés par liste blanche.

Les opérations avec intention d’écriture exigent `allow_write=true`.

### `git_status_project_s2`

Affiche l’état Git d’un projet autorisé sur S2.

Projets autorisés :

- `api_opcv` ;
- `front_end_opcvm` ;
- `brvmchainsolution`.

### `git_pull_project_s2`

Met à jour un projet autorisé par `git pull --ff-only`.

Protections :

- exige `allow_write=true` ;
- refuse si l’arbre Git local n’est pas propre ;
- refuse si aucune branche upstream n’est configurée ;
- ne force pas l’historique ;
- ne supprime aucun fichier par commande libre.

### `deploy_project_s2`

Déploie un projet autorisé avec une recette contrôlée.

Protections :

- exige `allow_write=true` ;
- commence par un pull fast-forward uniquement ;
- refuse si l’arbre Git n’est pas propre ;
- utilise une recette spécifique par projet ;
- ne donne pas accès à une commande arbitraire.

### `deploy_brvm_s2`

Alias sécurisé pour déployer uniquement `brvmchainsolution`.

## Projets configurés

### `api_opcv`

Chemin serveur prévu :

```text
/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api
```

### `front_end_opcvm`

Chemin serveur prévu :

```text
/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr
```

### `brvmchainsolution`

Chemin serveur prévu :

```text
/opt/apps/brvmchain/BRVMCHAINSOLUTION
```

## Procédure de déploiement MCP

Après fusion ou mise à jour du dépôt MCP sur S1 :

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge
git pull --ff-only origin main
npm install
npm run typecheck
npm run build
```

Puis activer localement les outils, uniquement dans le `.env` réel du serveur :

```bash
printf '\nENABLE_WRITE_TOOLS=true\n' >> .env
```

Enfin reconstruire le conteneur :

```bash
docker compose up -d --build
curl -s http://127.0.0.1:8787/health
```

## Point important

Après redémarrage du MCP, il faut ouvrir une nouvelle session côté Claude/Codex pour que les nouveaux outils soient visibles.
