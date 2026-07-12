# Centre de pilotage documentaire MCP WealthTech

Date de création : 2026-07-13  
Dépôt : `Patricked-code/MCP`  
Périmètre : conversations, décisions, connexion Codex, inventaires et cartographies du MCP.

## Rôle

Ce dossier est le point d’entrée unique pour comprendre le projet MCP WealthTech sans devoir parcourir à l’aveugle la racine, `docs/`, `memory/`, `Migration/` et les anciennes copies de mémoire.

Il ne remplace pas les sources canoniques. Il les indexe, indique leur statut et fournit un chemin de lecture stable.

## Navigation

1. [Index des conversations](CONVERSATIONS_INDEX.md)
2. [Connexion du MCP à Codex](CODEX_CONNECTION.md)
3. [Inventaire et cartographie serveur](SERVER_INVENTORY_AND_CARTOGRAPHY.md)
4. [Procédure d’import des conversations](imports/README.md)

## Sources de vérité

En cas de contradiction, appliquer cet ordre :

1. état réel du serveur et de Git ;
2. fichiers `.mcp/*.json` ;
3. `SUIVI.md` ;
4. `MCP_REPO_INVENTORY.md` ;
5. `MCP_SERVER_MAPPING.md` ;
6. `docs/` et `memory/` pour l’historique.

Toute contradiction doit être inscrite dans `DECISIONS_LOG.md` avant une action.

## État vérifié lors de la création du hub

- dépôt GitHub : `Patricked-code/MCP` ;
- branche de production : `main` ;
- commit observé sur GitHub et S1 : `f92f621fa495d5728df5fb5befcc3265ff3a1302` côté GitHub, préfixe `f92f621` directement observé sur S1 ;
- dossier serveur : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- état Git S1 : propre, branche `main`, diff suivi vide ;
- conteneur : `wealthtech_mcp_ssh_bridge`, actif sur `127.0.0.1:8787` ;
- URL : `https://mcp.wealthtechinnovations.com/mcp` ;
- mode : lecture seule en premier, avec écritures strictement bornées et conditionnelles ;
- PR #11 : ouverte, draft, non fusionnée et non déployée ;
- PR #12 : présente PR documentaire du hub, ouverte en draft et non fusionnée ;
- la correction du faux positif `cp` se trouve dans la PR #11 et n’est pas encore présente sur S1.

## Règles d’utilisation

- aucune conversation ne doit être considérée comme importée si seul son titre ou son URL est connu ;
- un résumé n’est jamais présenté comme un transcript verbatim ;
- aucun secret, token, mot de passe, clé privée, fichier `.env`, dump ou sauvegarde ne doit être ajouté ;
- toute nouvelle conversation importée reçoit une date, une source, un statut et un chemin ;
- ne jamais écrire directement sur `main` ;
- utiliser une branche `mcp/*`, une PR draft et une revue humaine ;
- vérifier GitHub et le serveur ensemble avant et après toute intervention ;
- ne jamais déployer automatiquement ce dossier documentaire.

## Statuts de conversation

| Statut | Signification |
|---|---|
| `TRANSCRIPT_VERIFIE` | texte intégral disponible et contrôlé |
| `RESUME_STRUCTURE` | synthèse disponible, sans garantie de verbatim |
| `REFERENCE_SEULE` | titre, date ou URL connus, contenu intégral absent |
| `A_IMPORTER` | export nécessaire |
| `ARCHIVE_HISTORIQUE` | conservé pour traçabilité, non applicable comme état courant |
| `REMPLACE` | remplacé par une source plus récente explicitement nommée |

## Limite importante

Le hub centralise les références disponibles dans GitHub et sur S1. Il ne peut pas aspirer automatiquement toutes les conversations privées ChatGPT ou Claude. Les conversations non exportées doivent être fournies en Markdown, texte ou PDF textuel puis intégrées avec la procédure du dossier `imports/`.
