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

## Modèle de confiance vérifié

Le dépôt versionne uniquement des références aux variables sensibles. Les secrets réels restent hors Git. Les clés montées dans le conteneur le sont en lecture seule. Les agents déclarés peuvent lire les repos et préparer branche/PR, mais ne peuvent pas déployer sans validation humaine.

## Contrôles avant PR

- exécuter le contrôle de secrets du dépôt ;
- vérifier que `.env`, clés, dumps, logs et sauvegardes ne sont ni suivis ni ajoutés ;
- examiner les changements de `.mcp/permissions.json`, `.mcp/agents.json` et des chemins interdits ;
- documenter toute exception, son approbateur et sa date d’expiration.

## Gestion d’incident

Ne pas recopier la valeur suspecte. Isoler le fichier, révoquer ou faire tourner le secret par un opérateur autorisé, vérifier l’historique Git, consigner un résumé public sûr puis décider de la remédiation.

## Risques ouverts

À vérifier : protections effectives de branche, durée de vie des accès, rétention des audit logs et séparation opérationnelle lecture/écriture/admin.

## Historique

- 2026-07-13 : ajout du modèle de confiance et de la réponse à incident.
