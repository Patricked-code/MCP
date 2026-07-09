# SECURITY.md

## Role
Politique de securite generale du MCP.

## Regles absolues
- Aucun secret, token, mot de passe, cle privee, fichier .env ou credential ne doit etre ecrit dans Git.
- Toute action serveur sensible exige inventaire, justification et trace dans SUIVI.md.
- Les droits agents doivent etre verifies dans AGENTS.md, MCP_AGENT_RULES.md et .mcp/permissions.json.
- Aucun deploiement, suppression, migration ou modification de production sans procedure dediee.

## A verifier
Fichiers sensibles, tokens MCP, tokens GitHub, cles SSH, variables d'environnement, journaux d'audit et acces serveurs.
