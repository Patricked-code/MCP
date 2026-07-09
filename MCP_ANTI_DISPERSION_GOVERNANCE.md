# Gouvernance anti-dispersion MCP

<!-- MCP-ANTI-DISPERSION-GOVERNANCE -->

## Objectif

Ce fichier fixe la gouvernance anti-dispersion du MCP WealthTech.

La règle centrale est simple : aucun agent IA, humain, outil MCP, Claude, Codex ou ChatGPT ne doit travailler dans son coin.

Chaque action doit être reliée à un dépôt, un serveur, une branche, une PR, une tâche, une documentation et un point de reprise.

## Branches

main est la branche stable, référence et production après validation.

Pour le MCP, les branches de travail doivent être sous mcp/.

Les branches docs/ et feature/ sont à éviter pour le MCP si elles ne sont pas rattachées à une PR, un serveur et un point de reprise.

Les branches claude/ restent réservées aux travaux Claude déjà reliés aux serveurs.

Les branches codex/ restent réservées aux travaux Codex en PR.

## Règle absolue

Ne jamais travailler directement sur main ou master.

Ne jamais pousser directement sur main ou master.

Ne jamais forcer un push.

Ne jamais merger automatiquement.

Ne jamais déclencher une action production depuis une branche non validée.

## Anti-dispersion

Une branche MCP n’a de valeur que si elle est reliée à :

1. un dépôt GitHub précis ;
2. un serveur réel ;
3. une base connue ;
4. une PR draft ;
5. un objectif documenté ;
6. un point de reprise ;
7. une règle de merge ;
8. une trace dans SUIVI.md, CHANGELOG.md, TASKS.md ;
9. une correspondance avec le dossier serveur.

## Double présence

Tout changement important doit exister dans deux réalités :

A. GitHub :
- branche ;
- commit ;
- PR ;
- documentation ;
- fichiers de suivi.

B. Serveur MCP :
- dossier réellement déployé ;
- branche réellement checkout ;
- état dirty ou clean ;
- documentation locale ;
- SUIVI.md ;
- point de reprise ;
- mapping serveur vers dépôt GitHub.

## DirtyCount

Si DirtyCount est supérieur à zéro :

- ne pas pull ;
- ne pas merge ;
- ne pas reset ;
- ne pas deploy ;
- ne pas déplacer ;
- ne pas nettoyer ;
- lister les fichiers modifiés ;
- comprendre l’origine ;
- sauvegarder ou committer proprement avant toute suite.

## Règle finale

Le dépôt GitHub ne doit jamais être modifié sans vérifier s’il correspond au serveur actif.

Le serveur ne doit jamais être modifié sans savoir quelle branche GitHub correspond.

Chaque changement doit être reflété à la fois dans GitHub et dans la mémoire serveur/projet.

Mise à jour : 2026-07-09T20:08:09Z
