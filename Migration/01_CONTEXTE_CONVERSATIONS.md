# Contexte consolidé des conversations - Projet Migration WealthTech

## 1. Vision générale

Le projet vise à construire un écosystème WealthTech unifié à partir de plusieurs applications existantes, de deux serveurs, d'un dépôt GitHub MCP et d'un MCP opérationnel. L'objectif n'est pas seulement de déplacer des fichiers : il s'agit de documenter, sécuriser, inventorier, migrer, nettoyer et préparer une architecture durable que des agents IA et des développeurs humains pourront reprendre sans repartir de zéro.

## 2. Serveurs

### S1 - serveur principal / destination / consolidation

- SSH : `root@212.227.212.33`
- Rôle : serveur principal, destination des migrations, serveur de nettoyage, futur socle de consolidation.

Domaines à conserver sur S1 avec contenu, configuration et dépendances nécessaires :

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

Destinations de migration prévues sur S1 :

- `V2.wealthtechinnovations.com`
- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`
- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`

### S2 - serveur source / migration / nettoyage sélectif

- SSH : `root@217.160.249.254`
- Rôle : serveur source pour les migrations, serveur contenant des applications à protéger, serveur à nettoyer sélectivement.

Domaines protégés sur S2, à ne pas modifier :

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

## 3. Migrations prévues

### WealthTech

- Source S2 : `wealthtech.chainsolutions.fr`
- Destination S1 : `V2.wealthtechinnovations.com`

### EVOTE

- Sources S2 : `evote.chainsolutions.fr`, `api.evote.chainsolutions.fr`
- Destinations S1 : `evote.wealthtechinnovations.com`, `api.evote.wealthtechinnovations.com`

### Formation Blockchain / Evaluations

- Sources S2 : `itic4fima.chainsolutions.fr`, `api.itic4fima.chainsolutions.fr`
- Destinations S1 : `evaluations.wealthtechinnovations.com`, `api.evaluations.wealthtechinnovations.com`

### Stablecoin

- Sources S2 : `stablecoin.chainsolutions.fr`, `api.stablecoin.chainsolutions.fr`
- Destinations S1 : `stablecoin.wealthtechinnovations.com`, `api.stablecoin.wealthtechinnovations.com`
- Règle spéciale : copier vers S1 sans supprimer l'original sur S2.

## 4. Ecosystème cible

Les applications suivantes doivent devenir les modules d'un seul écosystème WealthTech :

- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `V2.wealthtechinnovations.com`
- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`
- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`

Architecture cible :

- frontend commun ;
- API backend modulaire ;
- base MySQL commune ou étendue ;
- ClickHouse pour logs, analytics, reporting et requêtes lourdes ;
- Redis pour cache, sessions, files de jobs et workers ;
- Docker pour l'environnement initial ;
- trajectoire Kubernetes future ;
- architecture microservices progressive ;
- modules stablecoin, blockchain, tokenfactory, evote, formation, evaluations ;
- sécurité renforcée ;
- documentation persistante ;
- système de monitoring ;
- logique de non-régression.

Stablecoin est considéré comme la brique fonctionnelle la plus avancée et doit servir de référence stratégique.

## 5. MCP

- Nom : `wealthtech_ssh_bridge`
- Dépôt GitHub : `Patricked-code/MCP`
- Déploiement S1 : `/opt/apps/wealthtech-mcp-ssh-bridge`
- URL publique : `https://mcp.wealthtechinnovations.com/mcp`
- Service Docker : `wealthtech_mcp_ssh_bridge`
- Port local : `127.0.0.1:8787 -> 8787/tcp`

Etat validé dans les fichiers fournis :

- `/health` local répond ;
- `/health` public répond ;
- `/mcp` sans token répond `401 Unauthorized` ;
- `initialize` fonctionne ;
- `mcp-session-id` est créé ;
- `tools/list` fonctionne ;
- `ping` retourne `wealthtech_ssh_bridge_ok` ;
- Docker fonctionne ;
- le conteneur MCP est actif ;
- le port 8787 est actif.

## 6. Audit GitHub / branches / serveurs

Audit global disponible dans les sources :

- comptes GitHub analysés : `Wealthtechinnovations`, `Patricked-code`, `chainsolutions-wealthtech` ;
- serveurs analysés : S1 et S2 ;
- dépôts GitHub trouvés : 21 ;
- branches GitHub trouvées : 46 ;
- Pull Requests trouvées : 20 ;
- branches Claude : 14 ;
- branche GPT/Codex/ChatGPT : 1 ;
- PR Claude : 13 ;
- PR GPT/Codex/ChatGPT : 1 ;
- dépôts Git détectés sur serveurs : 84 ;
- branches Git détectées sur serveurs : 326 ;
- projets applicatifs sans Git détectés : 294 ;
- projets serveur alignés avec GitHub : 13 ;
- projets alignés mais avec modifications locales : 4 ;
- projets avec remote absent ou dépôt non retrouvé : 71.

Branches/projets importants :

- `Wealthtechinnovations/BRVMCHAINSOLUTION` sur S2 : `claude/migrate-from-gcp-Yr9qH`, avec modifications locales.
- `Wealthtechinnovations/api_opcv` sur S2 : `claude/code-review-improvements-ikvuj`, avec modifications locales.
- `Wealthtechinnovations/front_end_opcvm` sur S2 : `claude/code-review-improvements-ikvuj`, propre.
- `Wealthtechinnovations/Chainsolutions` sur S2 : `claude/migrate-from-gcp-ARO6N`, propre.
- `Wealthtechinnovations/bvmac-chainsolutions` sur S2 : `claude/bootstrap-bvmac-governance`, avec modification locale.
- `Wealthtechinnovations/ProfilInvestisseur` sur S2 : `main`, propre.
- `Patricked-code/Stablecoin` sur S2 : `main`, propre.
- `Patricked-code/Stablecoin` contient aussi une branche Codex `codex/wealthtech-mcp-conversation-memory` avec PR ouverte, non déployée sur serveur.
- `Patricked-code/MCP` est utilisé sur S1, avec une distinction entre dossier mémoire propre et dossier MCP actif ayant des modifications locales.

## 7. Règles de mémoire persistante

Fichiers documentaires obligatoires dans les projets concernés :

- `GPT.md`
- `SUIVI.md`
- `README.md`
- `README_DEV.md`
- `ROADMAP.md`
- `TODO.md`
- `TASKS.md`
- `CODE_REVIEW.md`
- `CHANGELOG.md`
- `DEPLOYMENT_PRODUCTION.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `DOCKER.md`
- `KUBERNETES_FUTURE.md`
- `SECURITY.md`
- `MONITORING.md`
- `BACKUP_RESTORE.md`
- `MIGRATION.md`
- `AGENTS_ARCHITECTURE.md`
- `AI_SKILLS.md`

Le fichier `SUIVI.md` doit contenir une section obligatoire :

```md
# POINT DE REPRISE COURANT
```

## 8. Boucle Loop Engineering

La méthode de travail doit être :

1. lire la mémoire projet ;
2. comprendre le point de reprise ;
3. identifier l'objectif de la session ;
4. inventorier l'existant ;
5. évaluer les risques ;
6. planifier l'action ;
7. exécuter prudemment ;
8. tester ;
9. documenter ;
10. mettre à jour la mémoire persistante ;
11. préparer le prochain point de reprise ;
12. recommencer la boucle.
