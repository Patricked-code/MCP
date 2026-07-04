# MCP GitHub Guardian

Ce module prépare puis pilote la connexion entre le MCP WealthTech, GitHub, les serveurs S1/S2 et les projets.

## Vision retenue

Le MCP doit devenir le gardien central GitHub + serveurs + mémoire IA.

Principes :

- GitHub est la source de vérité du code et de la mémoire projet.
- Le MCP est la passerelle sécurisée entre GitHub, les serveurs et les agents IA.
- Les agents IA ne reçoivent pas d'accès SSH libre.
- Les agents IA passent par les outils MCP autorisés.
- Un projet doit avoir une branche officielle de travail, de préférence `main` ou `final`.
- Le MCP doit éviter la création de branches dispersées.
- Le MCP doit maintenir la correspondance entre repo GitHub, chemin serveur, état de production et fichiers mémoire.

## État serveur connu

### S1 — serveur MCP

- Rôle : héberger le bridge MCP WealthTech.
- Dossier MCP : `/opt/apps/wealthtech-mcp-ssh-bridge`.
- Conteneur : `wealthtech_mcp_ssh_bridge`.
- Port local : `127.0.0.1:8787`.
- Domaine cible prévu : `https://mcp.wealthtechinnovations.com`.
- Health attendu : `read-only-plus-scoped-write` avec `writeToolsEnabled=true`.

### S2 — projets production

#### BRVMCHAINSOLUTION

- Repo source actuel : `Wealthtechinnovations/BRVMCHAINSOLUTION`.
- Clé projet MCP : `brvmchainsolution`.
- Chemin serveur : `/opt/apps/brvmchain/BRVMCHAINSOLUTION`.
- Branche actuelle : `claude/migrate-from-gcp-Yr9qH`.
- Déploiement : Docker Compose.
- Conteneurs attendus : `brvm_app`, `brvm_db`.

#### FundAfrica API OPCVM

- Repo source actuel : `Wealthtechinnovations/api_opcv`.
- Clé projet MCP : `api_opcv`.
- Chemin serveur : `/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api`.
- Branche actuelle : `claude/code-review-improvements-ikvuj`.
- Déploiement : PM2.
- Process PM2 : `api-monolith`.

#### FundAfrica Frontend OPCVM

- Repo source actuel : `Wealthtechinnovations/front_end_opcvm`.
- Clé projet MCP : `front_end_opcvm`.
- Chemin serveur : `/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend`.
- Branche actuelle : `claude/code-review-improvements-ikvuj`.
- Déploiement : PM2.
- Process PM2 : `fundafrique-frontend`.

## Connexion GitHub

Le MCP doit pouvoir être connecté à un compte ou à une organisation GitHub.

Organisation cible initiale : `chainsolutions-wealthtech`.

Le secret GitHub ne doit jamais être commité. Il doit être stocké hors Git, sur le serveur MCP, puis monté dans le conteneur.

Exemple de configuration attendue dans `.env` côté serveur :

```env
GITHUB_ORG=chainsolutions-wealthtech
GITHUB_TOKEN_FILE=/app/secrets/github_token
GITHUB_API_BASE=https://api.github.com
MCP_GITHUB_BOOTSTRAPPED=true
```

Le vrai token reste dans un fichier secret côté serveur. Son contenu ne doit jamais apparaître dans Git, dans les fichiers Markdown, dans le code ou dans une conversation IA.

## Interface web demandée

L'interface cible est :

- `/login` : page de connexion MCP.
- `/github` : vue générale GitHub Guardian.
- `/github/status` : statut JSON de la connexion GitHub.
- `/github/:account` : page dédiée à un compte ou une organisation GitHub connecté.

La page `/login` doit être protégée par le token MCP. Les pages GitHub ne doivent pas être accessibles en clair sans session MCP valide.

À terme, l'URL publique sera :

- `https://mcp.wealthtechinnovations.com/login`
- `https://mcp.wealthtechinnovations.com/github`
- `https://mcp.wealthtechinnovations.com/github/Patricked-code`
- `https://mcp.wealthtechinnovations.com/github/chainsolutions-wealthtech`

## Informations à afficher par compte GitHub

Pour chaque compte ou organisation connecté, le MCP doit afficher :

- compte GitHub détecté ;
- organisation cible ;
- date d'expiration du token si GitHub la communique ;
- droits probables : lecture, écriture, administration ;
- nombre de repos visibles ;
- repos liés au MCP ;
- repos liés à un chemin serveur ;
- projets pouvant déployer ;
- paramètres par repo ;
- fichiers mémoire présents ou manquants ;
- actions possibles et actions interdites.

## Questions guidées à poser après connexion

Après première connexion GitHub, le MCP doit demander :

1. Faut-il gérer seulement un repo, un compte ou toute une organisation ?
2. Le MCP doit-il avoir lecture seule, écriture repo, administration repo ou administration organisation ?
3. Faut-il inventorier S1 et S2 ?
4. Faut-il lier un repo existant à un dossier serveur ?
5. Faut-il créer un nouveau repo GitHub ?
6. Faut-il importer ou miroiter un projet serveur existant ?
7. Quelle branche unique est officielle : `main` ou `final` ?
8. Quels fichiers mémoire doivent être installés ?
9. Quels projets peuvent écrire sur le serveur ?
10. Quels projets peuvent seulement lire le serveur ?

## Étapes suivantes du code MCP

À ajouter progressivement :

- `github_org_inventory` ;
- `github_repo_rights_check` ;
- `github_link_repo_to_server_path` ;
- `github_bootstrap_project_memory` ;
- `mcp_server_inventory` ;
- `mcp_loopback_prepare` ;
- registre multi-comptes GitHub ;
- tableau de bord par repo ;
- notification lorsqu'un nouveau compte ou repo GitHub est détecté.
