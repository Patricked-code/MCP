# SUIVI.md — Journal vivant du projet MCP WealthTech

## 2026-07-01 — Initialisation du dépôt MCP

Création du squelette initial du projet `wealthtech_ssh_bridge` dans le dépôt GitHub `Patricked-code/MCP`.

État initial :

- dépôt GitHub trouvé : `Patricked-code/MCP` ;
- dépôt public ;
- branche par défaut : `main` ;
- objectif : créer un serveur MCP Node.js/TypeScript pour interagir avec S1/S2 via SSH contrôlé ;
- mode initial : read-only ;
- aucun secret réel ajouté ;
- aucune clé SSH ajoutée ;
- aucun fichier `.env` réel ajouté.

## Actions réalisées

- Création du manifeste Node.js.
- Création de la configuration TypeScript.
- Création de `.gitignore`.
- Création de `.env.example`.
- Création de Dockerfile et Docker Compose.
- Création de la configuration serveurs S1/S2.
- Création du client SSH read-only.
- Création des premiers outils MCP read-only.
- Création de la documentation initiale.

---

## 2026-07-01 — Connexion GitHub et préparation audit serveur

### Contexte

Connexion au compte GitHub `Patricked-code` et inspection des dépôts liés au projet WealthTech / EWARI / Stablecoin.

### Dépôts identifiés

- `Patricked-code/Stablecoin` : dépôt applicatif principal Stablecoin / EWARI / KOREE.
- `Patricked-code/MCP` : dépôt du serveur MCP `wealthtech_ssh_bridge`.

### Serveurs confirmés

- S1 : `root@212.227.212.33`.
- S2 : `root@217.160.249.254`.

### Règle confirmée

Le MCP reste en mode `read-only first`.

Aucune action destructive n’est autorisée à ce stade :

- aucune suppression ;
- aucun redémarrage ;
- aucun vidage de dossier ;
- aucune migration destructive ;
- aucun affichage de secrets ;
- aucun contenu `.env` réel dans GitHub ou dans les rapports.

---

## 2026-07-01 — Création et exécution du script local d’audit

### Fichier local concerné

`C:\Users\Koné ZIé Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1`

### Configuration SSH utilisée

- MCP : `root@212.227.212.33`.
- S1 : `root@212.227.212.33`.
- S2 : `root@217.160.249.254`.

### Erreur 1 rencontrée

Le premier lancement a échoué car le fichier PowerShell n’existait pas encore dans le dossier local.

Erreur :

```text
Le terme « .\lancer_audit_wealthtech_mcp.ps1 » n'est pas reconnu comme nom d'applet de commande, fonction, fichier de script ou programme exécutable.
```

### Correction 1

Création du fichier `lancer_audit_wealthtech_mcp.ps1` dans le dossier local `Documents\MCP`.

### Erreur 2 rencontrée

Le script utilisait un chemin Windows écrit en dur contenant des accents. PowerShell a mal interprété les caractères accentués dans certains affichages et a tenté de créer un chemin incorrect.

Erreur :

```text
New-Item : L'accès au chemin d'accès 'Documents' est refusé.
```

### Correction 2

Remplacement de la ligne :

```powershell
$LocalRoot = "C:\Users\Koné ZIé Arouna\Documents\MCP"
```

par :

```powershell
$LocalRoot = $PSScriptRoot
```

Cette correction permet au script d’utiliser automatiquement le dossier où se trouve le fichier `.ps1`.

### Erreur 3 rencontrée

Le fichier Bash envoyé sur le serveur MCP contenait un BOM UTF-8 au début du fichier, ce qui empêchait Linux d’interpréter correctement le shebang.

Erreur :

```text
/root/wealthtech_mcp_global_audit.sh: line 1: ´╗┐#!/usr/bin/env: No such file or directory
```

### Correction 3 appliquée sur le serveur MCP

Commande exécutée :

```powershell
ssh root@212.227.212.33 "perl -0777 -pi -e 's/^\xEF\xBB\xBF//; s/\r\n/\n/g; s/\r/\n/g' /root/wealthtech_mcp_global_audit.sh && chmod +x /root/wealthtech_mcp_global_audit.sh && head -n 1 /root/wealthtech_mcp_global_audit.sh"
```

Résultat attendu obtenu :

```bash
#!/usr/bin/env bash
```

### Audit direct lancé depuis le serveur MCP

Commande exécutée :

```powershell
ssh root@212.227.212.33 "S1_SSH='root@212.227.212.33' S2_SSH='root@217.160.249.254' REMOTE_REPORT_BASE='/root/wealthtech_audit_reports' REMOTE_MEMORY_BASE='/root/wealthtech_project_memory' /root/wealthtech_mcp_global_audit.sh"
```

### Résultat

Audit MCP terminé avec génération des chemins suivants :

```text
RUN_ID=20260701_030718
OUT_DIR=/root/wealthtech_audit_reports/audit_20260701_030718
REPORT_MD=/root/wealthtech_audit_reports/audit_20260701_030718/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.md
REPORT_HTML=/root/wealthtech_audit_reports/audit_20260701_030718/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.html
ARCHIVE=/root/wealthtech_audit_reports/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.tar.gz
MEMORY_DIR=/root/wealthtech_project_memory
DOCS_DIR=/root/wealthtech_project_memory/docs
MEMORY_STATE_DIR=/root/wealthtech_project_memory/memory
AGENTS_DIR=/root/wealthtech_project_memory/agents
LAST_PATHS=/root/wealthtech_audit_reports/LAST_AUDIT_PATHS.env
```

### Avertissement non bloquant observé

```text
tr: range-endpoints of '_-.' are in reverse collating sequence order
```

Cet avertissement vient de la fonction Bash de nettoyage de noms de fichiers. Il faut remplacer :

```bash
tr -cd '[:alnum:]_-.'
```

par :

```bash
tr -cd '[:alnum:]_.-'
```

Le tiret doit être placé à la fin pour ne pas être interprété comme une plage de caractères.

### Rapport téléchargé localement

Dossier local créé :

```text
C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_030718
```

Fichiers téléchargés :

```text
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.md
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.html
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.tar.gz
```

Tailles observées localement :

```text
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.html : 10690 octets
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.md   : 10014 octets
RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.tar.gz : 7076 octets
```

### Correction locale commencée

Correction locale lancée dans `lancer_audit_wealthtech_mcp.ps1` pour remplacer le motif `tr -cd '[:alnum:]_-.'` par `tr -cd '[:alnum:]_.-'`.

À vérifier avant le prochain lancement :

```powershell
Select-String -Path ".\lancer_audit_wealthtech_mcp.ps1" -SimpleMatch "tr -cd"
```

Le résultat doit contenir :

```bash
tr -cd '[:alnum:]_.-'
```

### Point d’attention

La tentative de correction directe distante avec une commande `perl` imbriquant plusieurs guillemets a échoué à cause d’un problème d’échappement PowerShell/Bash.

Erreur :

```text
bash: -c: line 0: unexpected EOF while looking for matching `"'
bash: -c: line 1: syntax error: unexpected end of file
```

Cette erreur n’a pas d’impact sur les rapports déjà téléchargés.

---

# POINT DE REPRISE COURANT

## Date de mise à jour

2026-07-01

## Serveur concerné

- Serveur MCP / S1 : `root@212.227.212.33`.
- Serveur S2 : `root@217.160.249.254`.

## Projet concerné

`wealthtech_ssh_bridge` — dépôt `Patricked-code/MCP`.

## Domaine concerné

Domaine cible prévu : `mcp.wealthtechinnovations.com`.

## Dernière action terminée

Audit direct lancé depuis le serveur MCP/S1 et rapport téléchargé localement dans :

```text
C:\Users\Koné ZIé Arouna\Documents\MCP\audit_20260701_030718
```

## État actuel

Le rapport Markdown, le rapport HTML et l’archive `.tar.gz` ont été téléchargés localement.

Le script PowerShell local doit encore être vérifié pour confirmer que :

1. `$LocalRoot = $PSScriptRoot` est bien présent ;
2. l’écriture du Bash distant se fait en UTF-8 sans BOM ;
3. la ligne Bash utilise bien `tr -cd '[:alnum:]_.-'`.

## Action suivante recommandée

1. Vérifier le contenu local du script PowerShell.
2. Relancer le script complet après correction.
3. Vérifier que le script télécharge automatiquement un nouveau rapport complet.
4. Envoyer ou analyser le rapport Markdown.
5. Préparer un plan d’action de nettoyage/migration sans suppression immédiate.

## Domaines à ne pas toucher

Voir `GPT.md` et les fichiers de mémoire serveur.

## Domaines en cours de migration

Aucune migration exécutée à ce stade.

## Domaines à nettoyer

Aucun nettoyage exécuté à ce stade.

## Bases de données concernées

Aucune base modifiée.

## Processus PM2 / Docker / Passenger concernés

Aucun processus redémarré ou arrêté.

## Fichiers modifiés

- Fichier local Windows : `lancer_audit_wealthtech_mcp.ps1`.
- Script distant temporaire : `/root/wealthtech_mcp_global_audit.sh`.
- Dossier rapport distant : `/root/wealthtech_audit_reports/audit_20260701_030718`.
- Dossier mémoire distant : `/root/wealthtech_project_memory`.

## Tests réalisés

- Test SSH MCP : OK.
- Envoi du script Bash vers S1/MCP : OK.
- Correction BOM distante : OK.
- Audit direct distant : OK.
- Téléchargement Markdown : OK.
- Téléchargement HTML : OK.
- Téléchargement archive : OK.

## Résultats des tests

Un rapport a été généré et téléchargé. Sa taille est faible, donc il faut vérifier son contenu pour savoir si l’audit est complet ou partiel.

## Erreurs rencontrées

1. Fichier `.ps1` absent au premier lancement.
2. Chemin local Windows avec accents mal géré par le script initial.
3. BOM UTF-8 au début du script Bash distant.
4. Avertissement `tr` sur la plage `_-.'`.
5. Échec d’une commande distante de correction à cause de guillemets imbriqués.

## Risques connus

- Si le script PowerShell réécrit à nouveau le Bash distant avec BOM, l’erreur `´╗┐#!/usr/bin/env` peut revenir.
- Si la ligne `tr -cd '[:alnum:]_-.'` reste dans le script, PowerShell peut arrêter la session sur erreur native.
- Le rapport de 10 Ko peut être incomplet ; il doit être ouvert et analysé avant toute décision.

## Rollback possible

Aucun rollback serveur nécessaire, car aucune modification fonctionnelle n’a été faite sur S1/S2. Les fichiers de rapport et de mémoire peuvent être conservés comme traces d’audit.

## Décision de reprise

Corriger définitivement le script local, relancer l’audit complet, puis analyser le rapport Markdown avant toute action de nettoyage, migration ou modification serveur.
