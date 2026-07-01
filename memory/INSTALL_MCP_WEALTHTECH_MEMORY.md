# Installation / synchronisation mémoire MCP WealthTech

Objectif : rendre la mémoire du projet lisible par Codex ou un autre agent sur le serveur dans :

```text
/root/wealthtech_project_memory/memory/
```

Dépôt source :

```text
https://github.com/Patricked-code/MCP.git
```

---

## Option A — Cloner le dépôt complet dans `/root/wealthtech_project_memory`

À exécuter sur le serveur WealthTech :

```bash
mkdir -p /root/wealthtech_project_memory
cd /root/wealthtech_project_memory

if [ ! -d .git ]; then
  git clone https://github.com/Patricked-code/MCP.git .
else
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
fi

ls -la /root/wealthtech_project_memory/memory
```

Les fichiers seront disponibles ici :

```text
/root/wealthtech_project_memory/memory/README.md
/root/wealthtech_project_memory/memory/2026-05-05-stablecoin-ewari-conversation-memory.md
/root/wealthtech_project_memory/memory/CODEX_HANDOFF_STABLECOIN_EWARI.md
/root/wealthtech_project_memory/memory/PROMPT_AUDIT_6BI_B.md
/root/wealthtech_project_memory/memory/INSTALL_MCP_WEALTHTECH_MEMORY.md
```

---

## Option B — Mettre à jour uniquement si le dossier existe déjà

```bash
cd /root/wealthtech_project_memory || exit 1
git fetch origin main
git checkout main
git pull --ff-only origin main
find /root/wealthtech_project_memory/memory -maxdepth 1 -type f -print
```

---

## Option C — Copier seulement le dossier `memory/` vers un autre emplacement

Si le MCP est installé ailleurs :

```bash
mkdir -p /root/wealthtech_project_memory
cd /root/wealthtech_project_memory

if [ ! -d MCP ]; then
  git clone https://github.com/Patricked-code/MCP.git MCP
else
  cd MCP
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
  cd ..
fi

mkdir -p /root/wealthtech_project_memory/memory
rsync -av --delete /root/wealthtech_project_memory/MCP/memory/ /root/wealthtech_project_memory/memory/
```

---

## Commande de lecture rapide pour Codex

```bash
cat /root/wealthtech_project_memory/memory/README.md
cat /root/wealthtech_project_memory/memory/CODEX_HANDOFF_STABLECOIN_EWARI.md
cat /root/wealthtech_project_memory/memory/PROMPT_AUDIT_6BI_B.md
```

Puis lire la mémoire complète :

```bash
less /root/wealthtech_project_memory/memory/2026-05-05-stablecoin-ewari-conversation-memory.md
```

---

## Règles de sécurité

Ne pas ajouter dans ce dépôt ou dans ce dossier :

- `.env` ;
- `.env.local` ;
- clés privées ;
- clés OpenZeppelin Relayer ;
- tokens Bearer ;
- mots de passe ;
- dumps SQL ;
- sauvegardes serveur ;
- exports contenant des secrets.

---

## Commande de vérification

```bash
cd /root/wealthtech_project_memory && \
  git status --short && \
  git rev-parse HEAD && \
  find memory -maxdepth 1 -type f -print | sort
```
