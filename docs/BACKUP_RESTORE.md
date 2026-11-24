# BACKUP_RESTORE.md — Sauvegarde et restauration

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **sauvegardes**, commencer par [le document racine](../BACKUP_RESTORE.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

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
