# INTEGRATION_WORKSPACE_LOCAL_WEALTHTECH_20260702

Date UTC : 2026-07-02T16:39:44.422795+00:00
Mode : lecture/indexation/documentation uniquement.

## Sources lues
- Workspace local : `C:\Users\Koné ZIé Arouna\Documents\GLOBAL (1)\wealthtech-workspace`
- Documents Markdown workspace : 14
- Scripts MCP locaux indexes par lignes clefs : 4
- Fichier volontairement non lu : `C:\Users\Kon? ZI? Arouna\Documents\API chatGPT.txt` ; raison : Filename suggests API credential or secret; not read.

## Conclusions
- Le workspace local `wealthtech-workspace` est un centre de pilotage non destructif destine a centraliser GitHub, serveur, Codex, MCP, inventaires et mapping.
- Il prevoit une cible serveur `/opt/wealthtech-workspace` et `/opt/server-projects-inventory`, mais aucune creation serveur n est faite dans cette boucle.
- Il confirme la doctrine de non-regression: ne pas supprimer, ne pas modifier `.env`, Plesk, Docker, bases ou production sans validation.
- Il demande un mapping GitHub <-> clone <-> production <-> domaine <-> Docker <-> port <-> doc <-> statut <-> prochaine action.
- Il contenait un etat ancien indiquant `wealthtech_ssh_bridge` non connecte; cet etat est depasse par les verifications actuelles S1/S2 via SSH direct.
- Il confirme que l inventaire GitHub reste une etape ouverte, a traiter par bridge/gh ou connecteur GitHub dedie.
- Les scripts MCP locaux sont des outils d audit/inventaire read-only ou de generation Word; ils ne sont pas des sources metier, mais confirment les listes S1/S2 et la politique de ne jamais afficher les cles privees.

## Inventaire documents workspace
| Fichier | Lignes | Taille | SHA256 court | Role extrait |
|---|---:|---:|---|---|
| `CHANGELOG.md` | 15 | 1013 | `e1bd8a97d52ddfd9` | - Ré-vérification des accès MCP : GitHub toujours absent du registre ; bridge SSH `wealthtech_ssh_bridge` toujours non c |
| `CODE_REVIEW.md` | 11 | 336 | `876f93d5a5bc8719` | - Portée : _(fichiers/zones)_ |
| `CODEX_WEALTHTECH.md` | 21 | 623 | `cac9f8f4b83544a6` | Projet WEALTHTECH initié dans Codex. Objectif, périmètre, état actuel : _(à compléter)_. |
| `DEPLOYMENT_MAP.md` | 7 | 322 | `1a74491c82135623` |  |
| `GITHUB_REPOSITORIES.md` | 15 | 716 | `d725f533396505f6` | WEALTHTECH · BRVM · OPCVM · MCP · Codex · IA · Automatisation · Infrastructure · |
| `GLOBAL_INDEX.md` | 27 | 1349 | `af580822448580c7` | Légende : ✅ prêt · 🟡 template à compléter · ⏳ en attente d'un accès |
| `MCP_CONNECTIONS.md` | 36 | 1783 | `fba3797cb96efda8` | Dernière vérification : 2026-07-02 (re-vérifié lors du run récurrent — état inchangé) |
| `PROJECTS_MAPPING.md` | 9 | 486 | `5a3883aec9b9e447` |  |
| `README.md` | 49 | 2203 | `7a8c0d256a74ff35` | Espace local central, propre, documenté et **non destructif** pour piloter tous les |
| `ROADMAP.md` | 27 | 1533 | `45448c4d539e3e5b` | Vérifier accès serveur + GitHub, `whoami`, droits `/opt`, présence Docker/Nginx/Plesk. STOP validation. |
| `SECURITY_NOTES.md` | 37 | 1830 | `24c033326fef19f1` | Jamais exécuter sans accord clair : `rm -rf`, `mv` sur projets existants, |
| `SERVER_PROJECTS.md` | 20 | 612 | `2200330dff345dec` | _(à remplir)_ |
| `SUIVI.md` | 33 | 2239 | `6cbd5364b5849570` | Date : 2026-07-02 09:07 CEST |
| `TASKS.md` | 18 | 687 | `b0810b2a8d203cb9` | - [~] Générer le squelette local du workspace + script bootstrap (Phase 5 partielle) |

## Points operationnels extraits
- Ordre de lecture workspace : `SUIVI.md`, `MCP_CONNECTIONS.md`, `ROADMAP.md`, `PROJECTS_MAPPING.md`.
- Phases workspace : pre-vol read-only, inventaire GitHub, scan serveur, clones controles, mapping, documentation/reprise.
- Commandes dangereuses interdites sans validation : rm/mv sur projets, docker stop/rm/down/prune, git reset/clean/checkout destructif, git push/pull prod, installs prod, migrations BDD, modification `.env`, Nginx/Apache/Plesk/Docker.
- Politique secrets : lister seulement les noms de variables `.env`, jamais les valeurs.

## Scripts MCP locaux indexes
### generer_inventaire_ssh_vps_word (1).ps1
- Chemin : `C:\Users\Koné ZIé Arouna\Documents\MCP\generer_inventaire_ssh_vps_word (1).ps1`
- Lignes : 346 ; taille : 12447 ; SHA : `71cff201afc185ef`
- L1: # Génère un fichier Word sur le Bureau avec les informations SSH de chaque VPS.
- L3: # Le script n'affiche jamais les clés privées SSH en clair.
- L8: # 1) SERVEURS À INVENTORIER
- L13: Nom = "wealthtech-s1"
- L17: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L20: Nom = "wealthtech-s2"
- L24: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L28: $OutputPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Inventaire_SSH_VPS_WealthTech.docx"
- L33: $RemoteScript = @'
- L36: SSHD_T="$(sudo -n sshd -T 2>/dev/null || sshd -T 2>/dev/null || true)"
- L37: SSH_PORT="$(printf '%s\n' "$SSHD_T" | awk '/^port / {print $2; exit}')"
- L38: PUBKEY_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^pubkeyauthentication / {print $2; exit}')"
- L39: PASSWORD_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^passwordauthentication / {print $2; exit}')"
- L40: ROOT_LOGIN="$(printf '%s\n' "$SSHD_T" | awk '/^permitrootlogin / {print $2; exit}')"
- L41: SSH_SERVICE="$(systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || echo inconnu)"
- L47: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L49: AUTH_KEYS_COUNT="$(grep -cv '^#\|^$' "$HOME/.ssh/authorized_keys" 2>/dev/null || echo 0)"
- L54: echo "__FIELD__PortSSHDetecte=${SSH_PORT:-22}"
- L58: echo "__FIELD__PasswordAuthentication=${PASSWORD_AUTH:-inconnu}"
- L60: echo "__FIELD__ServiceSSH=$SSH_SERVICE"
- L65: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L66: nl -ba "$HOME/.ssh/authorized_keys" 2>/dev/null
- L72: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L74: echo "$key" | grep -qE '^(ssh-rsa|ssh-ed25519|ecdsa-sha2-)' && echo "$key" | ssh-keygen -lf - 2>/dev/null
- L75: done < "$HOME/.ssh/authorized_keys"
- L80: echo "__SECTION__SSH_FILES"
- L81: if [ -d "$HOME/.ssh" ]; then
- L82: find "$HOME/.ssh" -maxdepth 1 -type f 2>/dev/null | sort | while read -r file; do
- L86: echo "Fichier public/non secret : $file"
- L92: echo "Autre fichier SSH : $file"
- L97: echo "Aucun dossier .ssh trouvé pour cet utilisateur."
- L105: return "Aucun chemin de clé indiqué. SSH utilisera la configuration/agent local ou demandera un mot de passe."
- L109: return "Clé privée locale non trouvée à ce chemin : $KeyPath. SSH utilisera éventuellement la configuration/agent local ou demandera un mot de passe."
- L117: $fingerprint = (& ssh-keygen -lf $pubPath 2>$null) -join "`n"
- L119: $pub = (& ssh-keygen -y -f $KeyPath 2>$null) -join "`n"
### generer_inventaire_ssh_vps_word.ps1
- Chemin : `C:\Users\Koné ZIé Arouna\Documents\MCP\generer_inventaire_ssh_vps_word.ps1`
- Lignes : 346 ; taille : 12447 ; SHA : `71cff201afc185ef`
- L1: # Génère un fichier Word sur le Bureau avec les informations SSH de chaque VPS.
- L3: # Le script n'affiche jamais les clés privées SSH en clair.
- L8: # 1) SERVEURS À INVENTORIER
- L13: Nom = "wealthtech-s1"
- L17: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L20: Nom = "wealthtech-s2"
- L24: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L28: $OutputPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Inventaire_SSH_VPS_WealthTech.docx"
- L33: $RemoteScript = @'
- L36: SSHD_T="$(sudo -n sshd -T 2>/dev/null || sshd -T 2>/dev/null || true)"
- L37: SSH_PORT="$(printf '%s\n' "$SSHD_T" | awk '/^port / {print $2; exit}')"
- L38: PUBKEY_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^pubkeyauthentication / {print $2; exit}')"
- L39: PASSWORD_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^passwordauthentication / {print $2; exit}')"
- L40: ROOT_LOGIN="$(printf '%s\n' "$SSHD_T" | awk '/^permitrootlogin / {print $2; exit}')"
- L41: SSH_SERVICE="$(systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || echo inconnu)"
- L47: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L49: AUTH_KEYS_COUNT="$(grep -cv '^#\|^$' "$HOME/.ssh/authorized_keys" 2>/dev/null || echo 0)"
- L54: echo "__FIELD__PortSSHDetecte=${SSH_PORT:-22}"
- L58: echo "__FIELD__PasswordAuthentication=${PASSWORD_AUTH:-inconnu}"
- L60: echo "__FIELD__ServiceSSH=$SSH_SERVICE"
- L65: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L66: nl -ba "$HOME/.ssh/authorized_keys" 2>/dev/null
- L72: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L74: echo "$key" | grep -qE '^(ssh-rsa|ssh-ed25519|ecdsa-sha2-)' && echo "$key" | ssh-keygen -lf - 2>/dev/null
- L75: done < "$HOME/.ssh/authorized_keys"
- L80: echo "__SECTION__SSH_FILES"
- L81: if [ -d "$HOME/.ssh" ]; then
- L82: find "$HOME/.ssh" -maxdepth 1 -type f 2>/dev/null | sort | while read -r file; do
- L86: echo "Fichier public/non secret : $file"
- L92: echo "Autre fichier SSH : $file"
- L97: echo "Aucun dossier .ssh trouvé pour cet utilisateur."
- L105: return "Aucun chemin de clé indiqué. SSH utilisera la configuration/agent local ou demandera un mot de passe."
- L109: return "Clé privée locale non trouvée à ce chemin : $KeyPath. SSH utilisera éventuellement la configuration/agent local ou demandera un mot de passe."
- L117: $fingerprint = (& ssh-keygen -lf $pubPath 2>$null) -join "`n"
- L119: $pub = (& ssh-keygen -y -f $KeyPath 2>$null) -join "`n"
### generer_inventaire_ssh_vps_word_CORRIGE.ps1
- Chemin : `C:\Users\Koné ZIé Arouna\Documents\MCP\generer_inventaire_ssh_vps_word_CORRIGE.ps1`
- Lignes : 352 ; taille : 12602 ; SHA : `978e0701b4a295d7`
- L1: ﻿# Génère un fichier Word sur le Bureau avec les informations SSH de chaque VPS.
- L3: # Le script n'affiche jamais les clés privées SSH en clair.
- L8: # 1) SERVEURS À INVENTORIER
- L13: Nom = "wealthtech-s1"
- L17: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L20: Nom = "wealthtech-s2"
- L24: KeyPath = "$env:USERPROFILE\.ssh\wealthtech_codex"
- L28: $OutputPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Inventaire_SSH_VPS_WealthTech.docx"
- L33: $RemoteScript = @'
- L36: SSHD_T="$(sudo -n sshd -T 2>/dev/null || sshd -T 2>/dev/null || true)"
- L37: SSH_PORT="$(printf '%s\n' "$SSHD_T" | awk '/^port / {print $2; exit}')"
- L38: PUBKEY_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^pubkeyauthentication / {print $2; exit}')"
- L39: PASSWORD_AUTH="$(printf '%s\n' "$SSHD_T" | awk '/^passwordauthentication / {print $2; exit}')"
- L40: ROOT_LOGIN="$(printf '%s\n' "$SSHD_T" | awk '/^permitrootlogin / {print $2; exit}')"
- L41: SSH_SERVICE="$(systemctl is-active ssh 2>/dev/null || systemctl is-active sshd 2>/dev/null || echo inconnu)"
- L47: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L49: AUTH_KEYS_COUNT="$(grep -cv '^#\|^$' "$HOME/.ssh/authorized_keys" 2>/dev/null || echo 0)"
- L54: echo "__FIELD__PortSSHDetecte=${SSH_PORT:-22}"
- L58: echo "__FIELD__PasswordAuthentication=${PASSWORD_AUTH:-inconnu}"
- L60: echo "__FIELD__ServiceSSH=$SSH_SERVICE"
- L65: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L66: nl -ba "$HOME/.ssh/authorized_keys" 2>/dev/null
- L72: if [ -f "$HOME/.ssh/authorized_keys" ]; then
- L74: echo "$key" | grep -qE '^(ssh-rsa|ssh-ed25519|ecdsa-sha2-)' && echo "$key" | ssh-keygen -lf - 2>/dev/null
- L75: done < "$HOME/.ssh/authorized_keys"
- L80: echo "__SECTION__SSH_FILES"
- L81: if [ -d "$HOME/.ssh" ]; then
- L82: find "$HOME/.ssh" -maxdepth 1 -type f 2>/dev/null | sort | while read -r file; do
- L86: echo "Fichier public/non secret : $file"
- L92: echo "Autre fichier SSH : $file"
- L97: echo "Aucun dossier .ssh trouvé pour cet utilisateur."
- L105: return "Aucun chemin de clé indiqué. SSH utilisera la configuration/agent local ou demandera un mot de passe."
- L109: return "Clé privée locale non trouvée à ce chemin : $KeyPath. SSH utilisera éventuellement la configuration/agent local ou demandera un mot de passe."
- L117: $fingerprint = (& ssh-keygen -lf $pubPath 2>$null) -join "`n"
- L119: $pub = (& ssh-keygen -y -f $KeyPath 2>$null) -join "`n"
### lancer_audit_wealthtech_mcp.ps1
- Chemin : `C:\Users\Koné ZIé Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1`
- Lignes : 1149 ; taille : 36709 ; SHA : `42c5c2693e485d56`
- L3: # LANCEUR WINDOWS -> SERVEUR MCP -> AUDIT READ-ONLY S1 + S2
- L6: # C:\Users\KonÃ© ZIÃ© Arouna\Documents\MCP\lancer_audit_wealthtech_mcp.ps1
- L10: # - se connecte au serveur MCP hÃ©bergÃ© sur S1 ;
- L11: # - crÃ©e sur le MCP un script Bash d'audit ;
- L12: # - lance un audit lecture seule de S1 et S2 ;
- L13: # - crÃ©e un rapport Markdown + HTML + archive ;
- L15: # - tÃ©lÃ©charge les rapports dans ton dossier Windows MCP.
- L18: # - aucune suppression ;
- L20: # - aucune modification destructive sur S1/S2 ;
- L21: # - aucun affichage du contenu des fichiers .env ;
- L22: # - audit lecture seule uniquement.
- L31: # Serveur qui hÃ©berge le MCP.
- L32: # D'aprÃ¨s ta derniÃ¨re prÃ©cision, le serveur MCP est S1.
- L33: $McpSsh = "root@212.227.212.33"
- L35: # Dossier local Windows oÃ¹ les rapports seront enregistrÃ©s.
- L38: # Serveurs Ã  auditer depuis le MCP.
- L39: $S1Ssh = "root@212.227.212.33"
- L40: $S2Ssh = "root@217.160.249.254"
- L42: # Dossiers distants sur le serveur MCP.
- L43: $RemoteReportBase = "/root/wealthtech_audit_reports"
- L44: $RemoteMemoryBase = "/root/wealthtech_project_memory"
- L45: $RemoteScriptPath = "/root/wealthtech_mcp_global_audit.sh"
- L46: $RemoteLastPaths = "/root/wealthtech_audit_reports/LAST_AUDIT_PATHS.env"
- L48: # Options SSH.
- L49: $SshOptions = @(
- L65: $LocalRunDir = Join-Path $LocalRoot "audit_$RunId"
- L68: $LocalRemoteScript = Join-Path $LocalRunDir "wealthtech_mcp_global_audit.sh"
- L70: $LocalPathInfo = Join-Path $LocalRunDir "chemins_rapport_$RunId.txt"
- L83: throw "Commande introuvable : $CommandName. Active OpenSSH Client dans Windows."
- L87: Ensure-Command "ssh"
- L91: Write-Step "Serveur MCP configurÃ© : $McpSsh"
- L92: Write-Step "S1 configurÃ© : $S1Ssh"
- L93: Write-Step "S2 configurÃ© : $S2Ssh"
- L96: # 3. SCRIPT BASH DISTANT Ã€ CRÃ‰ER SUR LE SERVEUR MCP
- L99: $RemoteBashScript = @'

## Contradictions / etat courant
- `MCP_CONNECTIONS.md` local dit bridge non connecte pour cette ancienne session; etat courant verifie dans Codex : S1 `crazy-mendel` et S2 `priceless-mayer` accessibles via SSH direct/cle MCP.
- Le workspace local indique GitHub absent; etat courant MCP : depot MCP deja pousse precedemment au commit `cfaa9cd...`, mais les nouveaux fichiers de cette passe ne sont pas commit/push.
- Decision : utiliser ces docs comme source de methode, pas comme etat serveur actuel.
