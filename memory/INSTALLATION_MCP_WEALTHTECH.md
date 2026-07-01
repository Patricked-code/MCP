# INSTALLATION_MCP_WEALTHTECH.md — Installation et synchronisation mémoire MCP WealthTech

Date : 2026-07-01  
Dépôt : `Patricked-code/MCP`  
Branche : `main`  
Dossier mémoire dans GitHub : `memory/`  
Dossier mémoire cible sur serveur : `/root/wealthtech_project_memory/memory/`

---

## 1. Objectif

Ce document explique comment récupérer sur le serveur WEALTHTECH les fichiers de mémoire créés dans le dépôt GitHub `Patricked-code/MCP`, puis les placer dans :

```text
/root/wealthtech_project_memory/memory/
```

Les fichiers concernés sont :

- `memory/WEALTHTECH_PROJECT_MEMORY.md`
- `memory/INSTALLATION_MCP_WEALTHTECH.md`
- `memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`
- `memory/README.md`

Ces fichiers servent de mémoire projet pour les agents IA, le MCP, les audits serveur et les interventions futures sans régression.

---

## 2. Règles de sécurité

Avant toute installation :

- ne pas pousser de secret dans GitHub ;
- ne pas copier de `.env` réel vers GitHub ;
- ne pas copier de clé SSH privée ;
- ne pas copier de dump SQL sensible ;
- ne pas supprimer de fichiers serveur ;
- ne pas redémarrer de service sans nécessité ;
- ne pas modifier la production applicative depuis cette commande ;
- se limiter à récupérer les fichiers de mémoire.

Cette procédure est volontairement non destructive.

---

## 3. Commande SSH complète recommandée

Depuis ton ordinateur local, tu peux exécuter ce flux complet pour installer ou mettre à jour la mémoire sur S1.

```bash
ssh root@212.227.212.33 <<'EOF'
set -Eeuo pipefail

echo "=== WealthTech MCP memory sync — début ==="
date
hostname
whoami

REPO_URL="https://github.com/Patricked-code/MCP.git"
APP_DIR="/opt/apps/wealthtech-mcp-ssh-bridge"
TARGET_BASE="/root/wealthtech_project_memory"
TARGET_MEMORY_DIR="$TARGET_BASE/memory"
BACKUP_BASE="$TARGET_BASE/backups"
RUN_ID="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$TARGET_MEMORY_DIR" "$BACKUP_BASE"

if [ -d "$TARGET_MEMORY_DIR" ] && [ "$(find "$TARGET_MEMORY_DIR" -maxdepth 1 -type f 2>/dev/null | wc -l)" -gt 0 ]; then
  BACKUP_DIR="$BACKUP_BASE/memory_backup_$RUN_ID"
  echo "Sauvegarde de la mémoire existante vers : $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  cp -a "$TARGET_MEMORY_DIR"/. "$BACKUP_DIR"/
fi

if [ -d "$APP_DIR/.git" ]; then
  echo "Dépôt MCP déjà présent : $APP_DIR"
  cd "$APP_DIR"
  git status --short || true
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
else
  echo "Clonage du dépôt MCP vers : $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch main "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "Dernier commit local MCP :"
git log -1 --oneline

echo "Synchronisation des fichiers memory/ vers $TARGET_MEMORY_DIR"
mkdir -p "$TARGET_MEMORY_DIR"
rsync -a --delete "$APP_DIR/memory/" "$TARGET_MEMORY_DIR/"

chmod -R u=rwX,go-rwx "$TARGET_MEMORY_DIR"

cat > "$TARGET_BASE/LAST_MEMORY_SYNC.env" <<SYNCENV
RUN_ID=$RUN_ID
SYNC_DATE=$(date -Iseconds)
REPO_URL=$REPO_URL
BRANCH=main
APP_DIR=$APP_DIR
TARGET_MEMORY_DIR=$TARGET_MEMORY_DIR
LAST_COMMIT=$(git rev-parse HEAD)
SYNCENV

chmod 600 "$TARGET_BASE/LAST_MEMORY_SYNC.env"

echo "=== Fichiers mémoire installés ==="
find "$TARGET_MEMORY_DIR" -maxdepth 1 -type f -printf '%f\n' | sort

echo "=== État de synchronisation ==="
cat "$TARGET_BASE/LAST_MEMORY_SYNC.env"

echo "=== WealthTech MCP memory sync — terminé ==="
EOF
```

---

## 4. Vérification rapide après installation

Après la commande, vérifier que les fichiers sont bien présents :

```bash
ssh root@212.227.212.33 "ls -la /root/wealthtech_project_memory/memory && sed -n '1,80p' /root/wealthtech_project_memory/memory/README.md"
```

---

## 5. Commande de lecture du prompt d’audit OPCVM sur serveur

```bash
ssh root@212.227.212.33 "sed -n '1,220p' /root/wealthtech_project_memory/memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md"
```

---

## 6. Commande de lecture de la mémoire consolidée

```bash
ssh root@212.227.212.33 "sed -n '1,260p' /root/wealthtech_project_memory/memory/WEALTHTECH_PROJECT_MEMORY.md"
```

---

## 7. Mise à jour ultérieure

Pour mettre à jour ultérieurement les fichiers mémoire depuis GitHub, relancer simplement le flux SSH principal ci-dessus.

La commande :

- récupère `main` ;
- sauvegarde l’ancienne mémoire locale si elle existe ;
- synchronise `memory/` vers `/root/wealthtech_project_memory/memory/` ;
- écrit `LAST_MEMORY_SYNC.env` ;
- n’effectue aucune action destructive sur les applications.

---

## 8. Rappel MCP

Le MCP WealthTech doit rester contrôlé, documenté et sécurisé.

Il doit permettre d’inventorier et diagnostiquer les serveurs sans devenir une console root libre.

Les outils destructifs ne doivent être ajoutés qu’après validation explicite.
