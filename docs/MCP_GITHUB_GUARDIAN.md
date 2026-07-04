# MCP GitHub Guardian

Ce module prépare la connexion entre le MCP WealthTech et GitHub.

## Objectif

Quand le MCP est relié à un compte ou à une organisation GitHub, il doit vérifier s'il possède déjà un accès valide, demander une nouvelle autorisation si nécessaire, vérifier les droits disponibles, puis préparer la liaison entre les repos GitHub, les serveurs S1/S2 et les projets.

## Sécurité

Les secrets GitHub ne doivent jamais être écrits dans Git, dans les fichiers Markdown, dans le code source ou dans les conversations IA.

Le fichier d'environnement du MCP doit seulement indiquer l'organisation GitHub, l'URL API et l'emplacement interne du fichier secret monté dans le conteneur.

## Routes ajoutées

- GET /github : page locale de connexion et de statut.
- GET /github/status : statut JSON de la connexion GitHub.
- POST /github/connect : vérification et remplacement du secret GitHub.

Ces routes sont prévues pour une utilisation locale ou via tunnel SSH.

## Première version

Cette version ne crée pas encore automatiquement les repos ni la GitHub App finale. Elle ajoute la base de connexion, la page de statut et les contrôles initiaux.

## Étapes suivantes

- inventorier l'organisation GitHub ;
- vérifier les droits par repo ;
- lier les repos aux chemins serveur ;
- créer ou compléter les fichiers mémoire projet ;
- préparer le loopback ;
- ajouter les questions de paramétrage guidées.
