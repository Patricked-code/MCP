# Installation / synchronisation de la mémoire projet sur S1

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`
Répertoire cible serveur : `/root/wealthtech_project_memory/memory/`

---

## 1. Objectif

Ce fichier explique comment récupérer les fichiers de mémoire poussés dans GitHub et les installer sur le serveur dans :

```text
/root/wealthtech_project_memory/memory/
```

---

## 2. Commande rapide sur S1

À lancer sur S1 :

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge

git pull --ff-only origin main

mkdir -p /root/wealthtech_project_memory/memory
mkdir -p /root/wealthtech_project_memory/reports
mkdir -p /root/wealthtech_project_memory/logs
mkdir -p /root/wealthtech_project_memory/scripts

rsync -av --delete \
  /opt/apps/wealthtech-mcp-ssh-bridge/wealthtech_project_memory/memory/ \
  /root/wealthtech_project_memory/memory/

chmod 700 /root/wealthtech_project_memory
chmod 700 /root/wealthtech_project_memory/memory
chmod 700 /root/wealthtech_project_memory/reports
chmod 700 /root/wealthtech_project_memory/logs
chmod 700 /root/wealthtech_project_memory/scripts

find /root/wealthtech_project_memory/memory -type f -name '*.md' -exec chmod 600 {} \;

ls -lah /root/wealthtech_project_memory/memory
```

---

## 3. Vérification

```bash
cat /root/wealthtech_project_memory/memory/README.md
cat /root/wealthtech_project_memory/memory/SUIVI_MEMORY.md
```

---

## 4. Utilisation par un agent IA

Avant toute intervention, lire dans cet ordre :

1. `/root/wealthtech_project_memory/memory/README.md`
2. `/root/wealthtech_project_memory/memory/SUIVI_MEMORY.md`
3. `/root/wealthtech_project_memory/memory/CONVERSATION_COMPILED_WEALTHTECH_EWARI_MCP.md`
4. `/root/wealthtech_project_memory/memory/MEMO_MCP_GITHUB_SERVER_ACCESS.md`
5. `/root/wealthtech_project_memory/memory/MEMO_PROJECT_STABLECOIN_EWARI.md`
6. `/root/wealthtech_project_memory/memory/PROMPT_AUDIT_WEALTHTECH_MCP.md`

---

## 5. Mise à jour future

Après modification d’un fichier de mémoire dans GitHub :

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge
git pull --ff-only origin main
rsync -av --delete wealthtech_project_memory/memory/ /root/wealthtech_project_memory/memory/
```

---

## 6. Sécurité

Ne pas copier dans ce dossier :

- tokens complets ;
- fichiers `.env` ;
- clés privées ;
- dumps SQL ;
- sauvegardes privées ;
- fichiers contenant des mots de passe.
