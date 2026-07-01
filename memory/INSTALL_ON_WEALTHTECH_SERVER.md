# INSTALLATION — Mémoire projet WEALTHTECH depuis Patricked-code/MCP

Ce guide explique comment mettre le contenu du dépôt `Patricked-code/MCP` dans le dossier serveur :

```bash
/root/wealthtech_project_memory/memory/
```

---

## 1. Connexion au serveur WEALTHTECH

Se connecter au serveur concerné :

```bash
ssh root@IP_DU_SERVEUR_WEALTHTECH
```

Si le serveur WEALTHTECH est S1 :

```bash
ssh root@212.227.212.33
```

Si le serveur WEALTHTECH est S2 :

```bash
ssh root@217.160.249.254
```

---

## 2. Créer le dossier mémoire

```bash
mkdir -p /root/wealthtech_project_memory
cd /root/wealthtech_project_memory
```

---

## 3. Installer depuis GitHub — méthode recommandée

Si le dossier `memory` n’existe pas encore :

```bash
cd /root/wealthtech_project_memory

git clone https://github.com/Patricked-code/MCP.git memory
```

Puis vérifier :

```bash
ls -lah /root/wealthtech_project_memory/memory
ls -lah /root/wealthtech_project_memory/memory/memory
```

Attention : dans cette méthode, le dépôt complet est cloné dans `/root/wealthtech_project_memory/memory/`, et les fichiers projet sont dans :

```bash
/root/wealthtech_project_memory/memory/memory/
```

---

## 4. Installer uniquement le contenu du dossier `memory/` à la racine cible

Si tu veux que les fichiers soient directement ici :

```bash
/root/wealthtech_project_memory/memory/GPT.md
/root/wealthtech_project_memory/memory/SUIVI.md
/root/wealthtech_project_memory/memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md
```

Alors utilise cette méthode :

```bash
rm -rf /tmp/MCP-memory-sync

git clone https://github.com/Patricked-code/MCP.git /tmp/MCP-memory-sync

mkdir -p /root/wealthtech_project_memory/memory

rsync -av --delete /tmp/MCP-memory-sync/memory/ /root/wealthtech_project_memory/memory/

rm -rf /tmp/MCP-memory-sync
```

Vérifier :

```bash
ls -lah /root/wealthtech_project_memory/memory/
```

---

## 5. Mettre à jour plus tard

Pour mettre à jour la mémoire depuis GitHub :

```bash
rm -rf /tmp/MCP-memory-sync

git clone https://github.com/Patricked-code/MCP.git /tmp/MCP-memory-sync

rsync -av --delete /tmp/MCP-memory-sync/memory/ /root/wealthtech_project_memory/memory/

rm -rf /tmp/MCP-memory-sync
```

---

## 6. Préparer le dossier d’audit MCP

```bash
mkdir -p /opt/wealthtech-audit-mcp/{reports,prompts,scripts,logs,exports}

cp /root/wealthtech_project_memory/memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md \
   /opt/wealthtech-audit-mcp/prompts/AUDIT_GLOBAL_S1_S2_MCP.md
```

Vérifier :

```bash
ls -lah /opt/wealthtech-audit-mcp/prompts/
```

---

## 7. Lancer Claude Code

```bash
cd /opt/wealthtech-audit-mcp
claude
```

Dans Claude Code :

```text
/mcp
```

Puis :

```text
Lis le fichier /opt/wealthtech-audit-mcp/prompts/AUDIT_GLOBAL_S1_S2_MCP.md et exécute strictement cette mission via le MCP wealthtech_ssh_bridge.

Tu dois faire uniquement un audit non destructif.
Tu ne dois rien supprimer, rien vider, rien modifier, rien redémarrer, rien migrer, rien déployer.
Tu dois produire les rapports demandés dans /opt/wealthtech-audit-mcp/reports et créer l’archive téléchargeable dans /opt/wealthtech-audit-mcp/exports.
```

---

## 8. Télécharger le rapport

Si le serveur est S1 :

```bash
scp root@212.227.212.33:/opt/wealthtech-audit-mcp/exports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.tar.gz .
```

Si le serveur est S2 :

```bash
scp root@217.160.249.254:/opt/wealthtech-audit-mcp/exports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.tar.gz .
```

Si le serveur MCP est une troisième machine :

```bash
scp root@IP_DU_SERVEUR_MCP:/opt/wealthtech-audit-mcp/exports/AUDIT_GLOBAL_S1_S2_WEALTHTECH.tar.gz .
```

---

## 9. Règle importante

La première mission doit rester un audit non destructif.

Séquence correcte :

1. Installation mémoire.
2. Audit non destructif.
3. Validation humaine.
4. Nettoyage contrôlé.
5. Migration contrôlée.
6. Documentation finale.
