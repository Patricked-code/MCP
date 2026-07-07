# MCP Server Mapping

## Statut

Le mapping serveur exact du MCP reste `needs_review`.

Ce fichier ne publie volontairement aucun chemin serveur sensible, aucun secret, aucun token et aucun contenu `.env` reel.

## Mapping courant

| Champ | Valeur |
| --- | --- |
| Projet | wealthtech-mcp-ssh-bridge |
| Repository actuel | Patricked-code/MCP |
| Organisation cible | chainsolutions-wealthtech |
| Branche par defaut | main |
| Branche MCP active | mcp/migration-governance-setup |
| Environnement | governance-preparation |
| Chemin serveur | not_published |
| Domaine public | non publie |
| Service Docker | a verifier |

## Verification attendue

Avant d activer une synchronisation serveur:

1. verifier le chemin serveur dans un contexte prive approuve;
2. verifier les fichiers de deploiement;
3. verifier les scripts critiques;
4. confirmer que les secrets restent hors Git;
5. enregistrer une trace d audit MCP;
6. proposer toute modification via une branche MCP et une pull request.
