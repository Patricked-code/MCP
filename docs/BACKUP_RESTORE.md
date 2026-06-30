# BACKUP_RESTORE.md — Sauvegarde et restauration

## Périmètre MCP

Le MCP lui-même contient principalement du code et de la documentation. Les éléments sensibles restent hors Git.

## À sauvegarder côté serveur

- `.env` réel ;
- configuration PM2 ou Docker ;
- configuration reverse proxy ;
- journaux utiles ;
- clés dédiées au MCP selon la politique sécurité.

## À ne pas sauvegarder dans Git

- secrets ;
- clés privées ;
- dumps de bases ;
- anciennes archives volumineuses ;
- fichiers de production sensibles.

## Restauration

Restaurer le code depuis GitHub, recréer `.env`, replacer les clés serveur, relancer le service et tester `/health` puis `ping`.
