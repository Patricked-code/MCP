# ACCESS_MATRIX.md

## Role
Matrice des acces humains, IA, GitHub, MCP et serveurs.

## Principes
- Lecture avant ecriture.
- Ecriture seulement dans le perimetre autorise.
- Validation humaine requise pour actions dangereuses.
- Aucun agent ne peut ecrire de secret.
- Aucun agent ne peut supprimer sans inventaire.

## A completer
Acteur, role, lecture, ecriture, admin, serveur, GitHub, MCP, expiration, validation requise.

## Matrice de base vérifiée

| Acteur | Lecture dépôt | Branche/PR | Serveur | Déploiement | Secrets | Validation |
|---|---:|---:|---:|---:|---:|---|
| ChatGPT | oui | oui | lecture via outil | non | interdit | revue humaine |
| Claude | oui | oui | lecture via outil | non | interdit | revue humaine |
| Codex | oui | oui | lecture via outil | non | interdit | revue humaine |
| Agent audit | oui | non | lecture seule | non | interdit | selon données |
| Humain habilité | selon rôle | oui | selon habilitation | selon procédure | hors Git | explicite |

## Règle de maintenance

Toute permission doit être rapprochée de `.mcp/agents.json` et `.mcp/permissions.json`. Une capacité technique disponible n’est pas une autorisation. Les droits temporaires doivent avoir un approbateur et une expiration.

## Historique

- 2026-07-13 : ajout de la matrice de base et de la règle d’expiration.
