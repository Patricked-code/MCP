# Modèle de reconnaissance connexions MCP/Git

<!-- MCP-CONNECTION-IDENTITY-MODEL -->

## Objectif

Ce fichier définit comment reconnaître qui est connecté au MCP ou au repo Git, et comment coordonner les humains et agents IA.

## Acteurs

- humain SSH ;
- ChatGPT superviseur ;
- Claude Code ;
- Codex ;
- MCP ;
- GitHub PR/commit ;
- automatisation cron/script/action.

## Signaux actuellement disponibles

- outil MCP appelé ;
- serveur ciblé ;
- intention de l’outil ;
- horodatage ;
- branche Git ;
- auteur de commit ;
- auteur de PR ;
- chemin serveur ;
- logs MCP masqués ;
- utilisateur SSH visible côté serveur.

## Limites actuelles

Le MCP peut reconnaître la session technique, l’outil, le serveur, la branche et l’intention, mais ne garantit pas seul l’identité humaine réelle derrière chaque client.

## Règle de coordination

Toute action structurante doit documenter :

Date :
Acteur :
Outil :
Serveur :
Projet :
Branche :
Objectif :
Risque :
Sauvegarde :
Tests :
Résultat :
Point de reprise :

## À améliorer ensuite

- créer .mcp/identity-registry.json ;
- relier GitHub user à rôle projet ;
- relier agent IA à permissions ;
- ajouter une matrice d’approbation ;
- produire un audit log structuré exploitable.

## Identité de déploiement GitHub S1

Identité cible : `S1_MCP_GITHUB_DEPLOY_READ_ONLY`.

```text
Type             : GitHub deploy key SSH
Dépôt            : Patricked-code/MCP uniquement
Usage            : fetch de refs/heads/main
Contents read    : oui
Contents write   : non
Push             : interdit côté GitHub et neutralisé côté Git
Alias SSH        : github.com-mcp-patricked-ro
Push URL locale  : disabled://mcp-s1-read-only
Secret           : clé privée locale S1, jamais lisible par le MCP ni versionnée
```

Le fingerprint public, la date de création, la date de rotation et l'identifiant
GitHub de la deploy key doivent être consignés sans inclure la clé privée.
