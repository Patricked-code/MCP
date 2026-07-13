# MCP_AUDIT_LOG_POLICY.md

## Rôle
Politique d’audit log MCP.

## À journaliser
- Connexions agents.
- Actions d’écriture.
- Changements Git.
- Échecs sécurité.
- Déploiements.
- Restarts.
- Scans secrets.
- Décisions humaines.

## Règle
Les logs ne doivent jamais exposer de secret. Les valeurs sensibles doivent être masquées.

## Schéma minimal

Horodatage UTC, acteur, rôle, projet, serveur, outil, intention, paramètres publics sûrs, résultat, code de sortie, objet Git/PR/tâche, approbation, corrélation et politique de rétention.

## Intégrité et accès

Les journaux doivent être append-only autant que possible, accessibles au moindre privilège, protégés contre la modification silencieuse et séparés des secrets. Une absence de log pour une action sensible est un incident.

## Rétention

À vérifier : durée, stockage, rotation, sauvegarde, suppression réglementaire et responsable. Ne pas inventer de durée avant validation.

## Historique

- 2026-07-13 : ajout du schéma minimal et des exigences d’intégrité.
