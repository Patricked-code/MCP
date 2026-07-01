# SUIVI MÉMOIRE — WealthTech / EWARI / MCP

Date de création : 2026-07-01
Dépôt : `Patricked-code/MCP`
Branche : `main`
Répertoire serveur cible : `/root/wealthtech_project_memory/memory/`

---

## Historique

### 2026-07-01 — Création mémoire projet

Création d’une mémoire projet structurée pour centraliser :

- la conversation WealthTech / EWARI / KOREE / XOF ;
- le contexte stablecoin ;
- le contexte WITTI Finances ;
- le contexte BCEAO ;
- le contexte smart contract ;
- le contexte OPCVM ;
- le contexte MCP ;
- le contexte GitHub ;
- le contexte serveurs S1/S2 ;
- le contexte Loop Engineering.

---

# POINT DE REPRISE COURANT

Date : 2026-07-01

Serveur principal : S1

Dépôt GitHub : `Patricked-code/MCP`

Branche : `main`

État actuel :

- le dépôt MCP est accessible ;
- S1 peut pousser vers GitHub via Deploy Key read/write ;
- le compte `Wealthtechinnovations` est en permission `write` sur `Patricked-code/MCP` ;
- les documents MCP/OAuth ont déjà été ajoutés ;
- la mémoire projet est maintenant ajoutée au dépôt dans `wealthtech_project_memory/memory/` ;
- il faut synchroniser ces fichiers vers `/root/wealthtech_project_memory/memory/` sur S1.

Dernière action terminée :

- compilation structurée de la mémoire de conversation ;
- création des fichiers de mémoire dans GitHub.

Action suivante recommandée :

1. se connecter à S1 ;
2. aller dans `/opt/apps/wealthtech-mcp-ssh-bridge` ;
3. exécuter `git pull --ff-only origin main` ;
4. créer `/root/wealthtech_project_memory/memory/` ;
5. copier les fichiers `wealthtech_project_memory/memory/` du dépôt vers ce dossier ;
6. vérifier les permissions ;
7. lire `README.md` et ce fichier ;
8. lancer ensuite l’audit non destructif via le prompt prévu.

Domaines à ne pas toucher :

- tous les domaines S2 protégés listés dans `MEMO_MCP_GITHUB_SERVER_ACCESS.md` ;
- les domaines S1 à conserver listés dans le même fichier.

Risques connus :

- ne pas exposer les secrets GitHub et MCP ;
- ne pas pousser `.env` ;
- ne pas mélanger les discours réglementaires `monnaie virtuelle stable` et `monnaie électronique` sans clarification ;
- ne pas oublier que le smart contract contrôle aussi les transferts via rôles.

Décision de reprise :

- synchroniser la mémoire sur S1 ;
- utiliser cette mémoire comme base de reprise pour Claude, ChatGPT, Codex ou tout agent IA ;
- ne pas effectuer d’action destructive avant audit.
