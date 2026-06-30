# SUIVI.md — Journal vivant du projet MCP WealthTech

## 2026-07-01 — Initialisation du dépôt MCP

Création du squelette initial du projet `wealthtech_ssh_bridge` dans le dépôt GitHub `Patricked-code/MCP`.

État initial :

- dépôt GitHub trouvé : `Patricked-code/MCP` ;
- dépôt public ;
- branche par défaut : `main` ;
- objectif : créer un serveur MCP Node.js/TypeScript pour interagir avec S1/S2 via SSH contrôlé ;
- mode initial : read-only ;
- aucun secret réel ajouté ;
- aucune clé SSH ajoutée ;
- aucun fichier `.env` réel ajouté.

## Actions réalisées

- Création du manifeste Node.js.
- Création de la configuration TypeScript.
- Création de `.gitignore`.
- Création de `.env.example`.
- Création de Dockerfile et Docker Compose.
- Création de la configuration serveurs S1/S2.
- Création du client SSH read-only.
- Création des premiers outils MCP read-only.
- Création de la documentation initiale.

# POINT DE REPRISE COURANT

## Date de mise à jour

2026-07-01

## Serveur concerné

Aucun serveur de production encore modifié. Travail effectué sur GitHub uniquement.

## Projet concerné

`wealthtech_ssh_bridge` — dépôt `Patricked-code/MCP`.

## Domaine concerné

Domaine cible prévu : `mcp.wealthtechinnovations.com`.

## Dernière action terminée

Initialisation du dépôt GitHub avec le squelette MCP et les premiers fichiers de mémoire persistante.

## État actuel

Le projet est prêt pour revue du squelette, ajout des clés SSH côté serveur et déploiement futur sur S1.

## Action suivante recommandée

1. Finaliser tous les fichiers de documentation.
2. Vérifier le code TypeScript sur une machine avec Node.js.
3. Créer le `.env` réel sur S1 uniquement.
4. Générer une clé SSH dédiée au MCP.
5. Déployer en read-only derrière HTTPS.
6. Ajouter l’URL dans ChatGPT : `https://mcp.wealthtechinnovations.com/mcp`.

## Domaines à ne pas toucher

Voir `GPT.md`.

## Domaines en cours de migration

Aucun à ce stade. Le MCP prépare l’inventaire et la future migration.

## Domaines à nettoyer

Non applicable à cette étape.

## Bases de données concernées

Aucune base touchée.

## Processus PM2 / Docker / Passenger concernés

Aucun processus de production touché.

## Fichiers modifiés

Squelette du dépôt GitHub MCP.

## Tests réalisés

Création de fichiers via GitHub connector. Pas encore de test runtime Node.js.

## Résultats des tests

À réaliser après installation des dépendances.

## Erreurs rencontrées

Certains contenus ont été simplifiés lorsque les contrôles de sécurité ont bloqué des fichiers contenant des motifs sensibles.

## Risques connus

- L’API exacte du SDK MCP peut nécessiter un ajustement après installation selon la version publiée.
- Les clés SSH et le token MCP restent à créer côté serveur.
- Le serveur doit rester read-only au premier déploiement.

## Rollback possible

Supprimer ou remplacer les fichiers du dépôt avant déploiement production.

## Décision de reprise

Continuer par finalisation documentaire, installation locale, puis déploiement S1 en mode read-only.
