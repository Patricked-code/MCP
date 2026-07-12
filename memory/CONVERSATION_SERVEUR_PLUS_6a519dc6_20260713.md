# Conversation SERVEUR++++ — mémoire consolidée

Date d’intégration : 2026-07-13

Conversation source : `chatgpt-conversation://6a519dc6-4fec-83ed-a0f5-45916c992686`

Titre source : `SERVEUR++++`

Mode d’import : consolidation structurée du transcript fourni à Codex

Statut : mémoire de contexte ; les états GitHub et serveur doivent toujours être revérifiés en direct

## 1. Objet

Cette conversation retrace la stabilisation du serveur MCP WealthTech, la formalisation de la gouvernance GitHub ↔ serveur, la politique de non-régression, l’anti-dispersion multi-acteurs, l’audit des anciennes PR et la préparation d’outils GitHub contrôlés.

Elle doit permettre à un humain, ChatGPT, Claude, Codex ou au MCP de reprendre le travail sans perdre les décisions déjà prises.

## 2. Règles maîtresses confirmées

- Toujours conserver l’existant avant d’ajouter.
- Ne jamais écraser, nettoyer ou supprimer sans inventaire, sauvegarde, justification et validation.
- GitHub est la source versionnée ; le serveur MCP est la source exécutée.
- Vérifier les deux avant et après toute intervention.
- `main` est la branche stable et la référence de production après validation.
- Les travaux MCP passent par une branche `mcp/*`, une PR draft, des tests et une validation.
- Aucun agent ne travaille isolément : chaque branche doit être reliée à un acteur, un objectif, un dépôt, un serveur, une PR, une tâche et un point de reprise.
- Si `DirtyCount > 0`, ne pas pull, merge, reset, deploy, déplacer ou nettoyer avant classification des changements.
- Ne jamais committer `.env`, token, mot de passe, clé privée, dump, journal privé ou inventaire serveur sensible.
- Le MCP reste `read-only-first` avec des outils d’écriture limités ; aucun shell libre.
- Toute action significative met à jour `SUIVI.md`, `TASKS.md`, `CHANGELOG.md` et, si nécessaire, `DECISIONS_LOG.md`.

## 3. Références opérationnelles

- Dépôt : `Patricked-code/MCP`
- Branche stable : `main`
- Serveur MCP : S1
- Dossier exécuté : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Conteneur : `wealthtech_mcp_ssh_bridge`
- Port local : `127.0.0.1:8787`
- Domaine : `https://mcp.wealthtechinnovations.com`
- Santé attendue : `/health` retourne `200 OK`
- Protection attendue : `/mcp` sans jeton retourne `401 Unauthorized`

## 4. Chronologie consolidée

### 4.1 Stabilisation initiale

- Le projet a été construit avec Node 20 et Docker Compose.
- Le conteneur MCP a été démarré et vérifié.
- Des fichiers locaux de gouvernance non suivis et des modifications de code ont été inventoriés sans suppression.
- Des sauvegardes locales ont été créées avant intégration.
- Les secrets locaux ont été identifiés et exclus du périmètre Git.
- Les tests TypeScript, build, documentation et contrôles Git ont été exécutés avant commit.

### 4.2 Gouvernance GitHub ↔ serveur

Les commits de référence historiques mentionnés dans la conversation sont :

- `fbc7c97` — formalisation de la gouvernance et de l’inventaire MCP ;
- `4619588` — enregistrement de la validation finale de production ;
- `a647c46` — non-régression et liaison serveur ;
- `4ae1124` — manuel anti-dispersion et cartographie fonctionnelle, issu de la PR #6 ;
- `f92f621` — alias OAuth Claude/ChatGPT et intégration de `durableAccounts`, arrivé sur `main` comme exception de traçabilité à documenter.

### 4.3 Documentation et cartographie

La conversation a conduit à l’ajout ou au renforcement de :

- `MCP_ANTI_DISPERSION_GOVERNANCE.md`
- `MCP_FUNCTIONS_AND_TOOLS_MANUAL.md`
- `MCP_FUNCTIONAL_CARTOGRAPHY.md`
- `MCP_CONNECTION_IDENTITY_MODEL.md`
- `MCP_INTELLIGENT_USAGE_MODE.md`
- `.mcp/branch-governance.json`
- `.mcp/function-cartography.json`
- `.mcp/identity-policy.json`
- `PRODUCTION_STATE.json`
- scripts de diagnostic, synchronisation et contrôle de gouvernance

### 4.4 Audit des PR et issues

- PR #1 : historique d’onboarding très large ; ne pas fusionner globalement, extraire les apports utiles.
- Issues #2 et #3 : blockers ouverts, pas des PR.
  - #2 : visibilité/autorisation du connecteur GitHub, Codex et MCP sur `chainsolutions-wealthtech`.
  - #3 : inventaire privé, backup, rollback et approbation opérateur avant actions serveur ou production.
- PR #4 : outils GitHub MCP contrôlés, mais base intermédiaire ; à reconstruire depuis le `main` courant.
- PR #5 : spécification d’onboarding engine, à comparer avec la gouvernance déjà intégrée.
- PR #6 : gouvernance anti-dispersion et manuel, fusionnée dans `main`.
- PR #7 : audit brut avec preuves `merge-tree`, à conserver sans fusion automatique.
- PR #8 : synthèse propre des PR #1/#4/#5.
- PR #9 : complément de synthèse pour les blockers #2/#3.
- PR #10 : reconstruction des outils GitHub après gouvernance ; à rendre compatible avec `f92f621` et `durableAccounts`.
- PR #11 : hardening annoncé par Codex sur `mcp/hardening-readonly-ci-state-20260711`, commit `d816b97`, à vérifier avant fusion.

Les numéros et états ci-dessus reflètent la conversation ; ils doivent être vérifiés sur GitHub avant décision.

## 5. Capacités MCP documentées

### Lecture et diagnostic

- ping et contexte projet ;
- état disque, PM2 et Docker sur S1/S2 ;
- inventaire domaines, gros fichiers et sauvegardes ;
- état Git, diff masqué, lecture et recherche de fichiers MCP ;
- scan prudent de secrets ;
- logs du conteneur MCP ;
- tests HTTPS contrôlés.

### Écriture limitée

- patch de fichiers MCP autorisés avec validation explicite ;
- typecheck et build via Node 20 ;
- redémarrage contrôlé du bridge ;
- opérations Git et déploiement uniquement sur projets explicitement autorisés ;
- requêtes SQL `SELECT` uniquement.

### Durable GitHub accounts

`f92f621` a introduit ou consolidé :

- `MCP_DURABLE_ACCOUNT_MANAGEMENT.md`
- `src/tools/durableAccounts.ts`
- `registerDurableAccountReadOnlyTools(server)`
- montages Docker `./data:/app/data` et `./secrets:/app/secrets`
- outils `github_durable_accounts_status` et `github_durable_accounts_inventory`

Les secrets restent hors Git et ne doivent jamais être affichés.

## 6. Incidents et enseignements

- Plusieurs collages shell longs ont été interrompus par des heredocs incomplets ; toujours vérifier le retour à l’invite avant de relancer.
- `git diff --check` a correctement bloqué plusieurs commits à cause de lignes vides ou espaces finaux.
- Un faux positif de sécurité détectait `cp` à l’intérieur de `.mcp` ou `MCP`; la correction et des tests dédiés ont été annoncés dans la PR #11.
- `main` n’était pas protégé et a reçu `f92f621` sans PR visible ; cette exception doit rester tracée et ne pas se reproduire.
- Des outils MCP ont été utilisés sur BRVM/S2. Le dépôt BRVM présentait des fichiers non suivis, dont `.env`; toute nouvelle action BRVM reste bloquée jusqu’à classification privée.
- Les rapports bruts `merge-tree` sont conservés dans une branche d’audit et ne doivent pas alourdir `main`.

## 7. État de reprise issu de la conversation

Dernier état serveur rapporté :

- branche `main` ;
- dépôt propre et aligné sur `origin/main` ;
- commit `f92f621` ;
- conteneur MCP actif ;
- `/health` à `200` ;
- `/mcp` sans jeton à `401`.

Cet état est historique et doit être revérifié avant action.

## 8. Prochaines étapes ordonnées

1. Auditer la PR #11 : fichiers, diff, correction `cp`, CI, tests, secrets et périmètre.
2. Fusionner PR #11 uniquement après validation humaine et checks réussis.
3. Synchroniser ensuite le serveur avec `main` par fast-forward, tester et vérifier les endpoints.
4. Rebaser ou reconstruire PR #10 sur le nouveau `main` sans perdre `durableAccounts`.
5. Valider les outils GitHub contrôlés : branche `mcp/*`, commit autorisé, push de branche et PR draft, jamais de merge automatique.
6. Stabiliser la CI puis protéger `main` : PR obligatoire, checks obligatoires, force-push et suppression interdits.
7. Résoudre l’issue #2 avec preuves runtime du connecteur et des permissions, sans exposer les jetons.
8. Préparer l’issue #3 hors Git public : inventaire privé, backup, rollback et approbation opérateur.
9. Traiter BRVM/S2 dans un chantier distinct, sans `git add .`, sans toucher à `.env` et sans déploiement avant classification.
10. Après consolidation, fermer ou archiver proprement les anciennes PR/branches remplacées, uniquement après décision documentée.

## 9. Contrôle minimal avant toute reprise

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge
git status -sb
git branch --show-current
git log --oneline -n 10
git remote -v
docker compose ps
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/health
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/mcp
```

Si le dépôt n’est pas propre, s’arrêter et inventorier avant toute autre action.

## 10. Limites de cette mémoire

Ce fichier est une consolidation fidèle des décisions et résultats fournis dans la conversation. Il ne remplace pas :

- le transcript source accessible par son URI ;
- les PR et issues GitHub ;
- les rapports serveur horodatés ;
- la vérification en direct de GitHub, S1, S2 et des services.

Les secrets potentiellement apparus dans des sorties historiques ne sont volontairement pas reproduits.
