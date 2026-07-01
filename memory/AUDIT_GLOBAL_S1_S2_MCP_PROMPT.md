# PROMPT — AUDIT GLOBAL NON DESTRUCTIF S1 + S2 VIA MCP

## 0. Mission

Tu es Claude Code connecté au MCP `wealthtech_ssh_bridge` ou à un MCP équivalent capable d’accéder à :

- S1 : `root@212.227.212.33`
- S2 : `root@217.160.249.254`

Tu dois réaliser un audit global, détaillé, commenté, non destructif, enregistré et téléchargeable.

Tu ne dois rien modifier. Tu dois uniquement lire, inventorier, vérifier, comparer, diagnostiquer, commenter et produire un rapport.

---

## 1. Interdictions absolues

Ne pas exécuter :

- `rm`
- `mv` en production
- `truncate`
- `systemctl restart`
- `systemctl stop`
- `pm2 stop`
- `pm2 delete`
- `docker stop`
- `docker rm`
- `docker compose down`
- `DROP`
- `DELETE`
- `UPDATE`
- `plesk bin domain --remove`
- `certbot delete`

Ne pas :

- supprimer ;
- vider ;
- modifier ;
- redémarrer ;
- migrer ;
- déployer ;
- nettoyer ;
- installer ;
- modifier Plesk ;
- modifier Nginx ;
- modifier Apache ;
- modifier PM2 ;
- modifier Passenger ;
- modifier Docker ;
- modifier MySQL ;
- modifier `.env` ;
- afficher des secrets.

---

## 2. Commandes de lecture autorisées

```bash
hostname
whoami
date
uptime
uname -a
cat /etc/os-release
df -h
df -ih
free -h
lsblk
ss -tulpn
systemctl status nginx --no-pager || true
systemctl status apache2 --no-pager || true
systemctl status httpd --no-pager || true
systemctl status mysql --no-pager || true
systemctl status mariadb --no-pager || true
systemctl status docker --no-pager || true
pm2 list || true
pm2 jlist || true
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" || true
docker compose ls || true
plesk version || true
plesk bin domain --list || true
plesk bin subscription --list || true
mysql -e "SHOW DATABASES;" || true
curl -k -I -L --max-time 15 https://DOMAINE || true
```

---

## 3. Domaines S1 à conserver

Vérifier et protéger :

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

---

## 4. Domaines S1 futurs ou de migration

Vérifier existence ou état de préparation :

- `V2.wealthtechinnovations.com`
- `evote.wealthtechinnovations.com`
- `api.evote.wealthtechinnovations.com`
- `evaluations.wealthtechinnovations.com`
- `api.evaluations.wealthtechinnovations.com`

---

## 5. Domaines S2 protégés

Ne jamais modifier :

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

---

## 6. Domaines S2 à nettoyer plus tard, pas maintenant

Inventorier seulement :

- `api.pccet.wealthtechinnovations.ci`
- `api.wealthtechinnovations.ci`
- `evote.wealthtechinnovations.ci`
- `pccet.wealthtechinnovations.ci`
- `wealthtechinnovations.ci`
- `opcvm.chainsolutions.fr`

---

## 7. Migrations à vérifier

- `wealthtech.chainsolutions.fr` vers `V2.wealthtechinnovations.com`.
- `evote.chainsolutions.fr` vers `evote.wealthtechinnovations.com`.
- `api.evote.chainsolutions.fr` vers `api.evote.wealthtechinnovations.com`.
- `itic4fima.chainsolutions.fr` vers `evaluations.wealthtechinnovations.com`.
- `api.itic4fima.chainsolutions.fr` vers `api.evaluations.wealthtechinnovations.com`.
- `stablecoin.chainsolutions.fr` vers `stablecoin.wealthtechinnovations.com`, copie uniquement.
- `api.stablecoin.chainsolutions.fr` vers `api.stablecoin.wealthtechinnovations.com`, copie uniquement.

Ne jamais supprimer les originaux Stablecoin sur S2.

---

## 8. Inventaire attendu

Pour chaque serveur :

- hostname ;
- OS ;
- kernel ;
- uptime ;
- CPU/RAM/SWAP ;
- disque ;
- inodes ;
- services ;
- ports ouverts ;
- Plesk ;
- PM2 ;
- Passenger ;
- Docker ;
- bases de données ;
- certificats ;
- fichiers `.env` présents sans contenu ;
- sauvegardes ;
- logs ;
- fichiers volumineux ;
- `node_modules` ;
- caches ;
- dumps ;
- archives.

Pour chaque domaine :

- serveur ;
- domaine ;
- statut ;
- dossier ;
- taille ;
- technologie ;
- process ;
- port ;
- base probable ;
- HTTP ;
- HTTPS ;
- SSL ;
- logs ;
- risques ;
- recommandations.

---

## 9. Documentation à vérifier

Vérifier l’existence de :

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

Vérifier si `SUIVI.md` contient :

```md
# POINT DE REPRISE COURANT
```

---

## 10. Rapports à créer sur le serveur MCP

Créer :

```bash
/opt/wealthtech-audit-mcp/reports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.md
/opt/wealthtech-audit-mcp/reports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.html
/opt/wealthtech-audit-mcp/reports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.txt
/opt/wealthtech-audit-mcp/reports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.json
/opt/wealthtech-audit-mcp/reports/AUDIT_GLOBAL_S1_S2_WEALTHTECH_COMMANDS.log
/opt/wealthtech-audit-mcp/exports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.tar.gz
```

---

## 11. Rapport final attendu

À la fin, donner :

- chemin du rapport Markdown ;
- chemin du rapport HTML ;
- chemin du rapport JSON ;
- chemin de l’archive ;
- commande SCP ;
- résumé S1 ;
- résumé S2 ;
- risques ;
- écarts ;
- prochaines actions ;
- confirmation qu’aucune action destructive n’a été exécutée.
