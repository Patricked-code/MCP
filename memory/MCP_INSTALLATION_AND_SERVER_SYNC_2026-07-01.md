# Runbook — Synchronisation mémoire serveur MCP

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`
Branche : `main`
Destination mémoire serveur : `/root/wealthtech_project_memory/memory/`

## Objectif

Récupérer sur le serveur les fichiers de mémoire poussés dans GitHub, puis les placer dans le dossier de mémoire persistante WealthTech.

Cette procédure sert uniquement à synchroniser la documentation et la mémoire projet.

## Étapes recommandées

1. Se connecter au serveur MCP.
2. Vérifier que le dépôt `Patricked-code/MCP` existe dans le dossier projet.
3. Tirer la branche `main`.
4. Copier le dossier `memory/` du dépôt vers `/root/wealthtech_project_memory/memory/`.
5. Copier si nécessaire le dossier `docs/` du dépôt vers `/root/wealthtech_project_memory/docs/`.
6. Vérifier que les fichiers sont présents et lisibles.
7. Relire `docs/GPT.md`, `docs/SUIVI.md` et le `POINT DE REPRISE COURANT`.

## Commandes indicatives

```bash
mkdir -p /root/wealthtech_project_memory/memory
mkdir -p /root/wealthtech_project_memory/docs
mkdir -p /opt/apps/wealthtech-mcp-ssh-bridge
cd /opt/apps/wealthtech-mcp-ssh-bridge
git pull origin main
cp -av memory/*.md /root/wealthtech_project_memory/memory/
cp -av docs/*.md /root/wealthtech_project_memory/docs/
ls -lah /root/wealthtech_project_memory/memory/
ls -lah /root/wealthtech_project_memory/docs/
```

## Fichiers principaux à vérifier

```text
CONVERSATION_COMPILED_INDEX_2026-07-01.md
CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md
CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md
CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md
RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md
```

## Résultat attendu

La mémoire de conversation est disponible sur le serveur dans `/root/wealthtech_project_memory/memory/` et peut être relue par les agents IA avant toute intervention.
