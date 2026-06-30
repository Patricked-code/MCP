# MONITORING.md — Observabilité

## Objectif

Suivre l’état du MCP et des opérations read-only réalisées sur S1/S2.

## À surveiller

- disponibilité `/health` ;
- erreurs MCP ;
- erreurs SSH ;
- latence des outils ;
- refus d’authentification ;
- volume des logs ;
- espace disque serveur ;
- disponibilité des domaines protégés.

## Journalisation

Les logs doivent masquer les secrets et indiquer le serveur cible, l’outil appelé et le résultat.
