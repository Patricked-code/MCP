# PR #350 — Checkpoint canonique de l'extension additive et du pilote GRT /gouvern

**Date :** 2026-10-23. **Références :** [PR #350](https://github.com/Patricked-code/MCP/pull/350), [issue #349](https://github.com/Patricked-code/MCP/issues/349), OAuth indépendant #346/#207.

## Périmètre et décision

Conserver le MCP existant, ses autorisations et son chemin GitHub → S1. Ajouter en place des capacités de provisionnement Plesk S1/S2 et une connexion GitHub App optionnelle, sans migration, sans nouvelle file ni nouvelle gouvernance. Le pilote réel demandé est le dépôt `chainsolutions-wealthtech/Governed-Repository-Template` à la révision `eb74f16b6c8bbe63658666095f6c97fb32aaa303`, exposé uniquement par un portail opérateur à `https://mcp.wealthtechinnovations.com/gouvern`.

GRT est un dépôt de gouvernance documentaire, pas une application web : on n'exécute ni ses scripts ni ses workflows. Son archive épinglée et son manifeste vivent dans le répertoire privé `/app/data/gouvern` (volume S1). Aucun fichier du dépôt n'est servi publiquement.

## Fonctionnalités préparées, non déployées

- Préflight Plesk S1/S2 et planificateur borné ; aperçu MCP en lecture seule. La création via route E3 exige ticket signé, session et origine valides **et reste bloquée** tant que la Governed Session, les claims et les locks existants n'accordent pas explicitement le scope. Le garde d'exécution sur S1 refuse actuellement la mutation par défaut, y compris si les flags sont activés.
- Portail `GET /gouvern` authentifié et action `POST /gouvern/deploy` liée à l'autorisation signée, au dépôt et au SHA exact. Feature flag `MCP_GOUVERN_PILOT_ENABLED=false` par défaut.
- Archive privée avec 0700 pour le répertoire, 0600 pour les fichiers, checksum SHA-256 vérifié sur les octets, refus des dossiers préexistants inconnus, verrou de staging exclusif. La préparation n'est pas un déploiement d'application GRT ni une autorisation de publication de documents internes.

## État et preuves

- Baseline `main` et S1 observée avant intervention : `a3df3b01f65cd6c212cf9948b68cd8531c6e76d5`, Git clean S1, MCP existant fonctionnel.
- Ancien HEAD candidat `098afae18a54a32527a924ea6be2df23bee35c26` : CI #39880062814 et #39880068075 SUCCESS. Approbation de `Wealthtechinnovations` le 23/10 à 01:00:26 UTC ; six remarques de revue restaient ouvertes sur cet état.
- Suite de tests RED/GREEN : planification/exécution Plesk, web E3, installation GitHub App et pilote GRT ; renforcements ultérieurs sur concurrence, empreinte, permissions, anti-clickjacking et barrière de gouvernance.
- Ce document ne prétend **pas** qu'un répertoire a été créé sur S1 ni qu'un déploiement a été effectué. Les CI, fils de revue et le HEAD doivent être réobservés après ce commit.
- Écart de documentation : `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md` ne sont pas encore actualisés dans cette PR ; l'actualisation de ces gros fichiers doit être validée avant fusion. Ce checkpoint et les issues sont des compléments, pas des substituts aux autorités canoniques.

## Revue additionnelle du 23 octobre — admission runtime GRT

- Nouveau constat P1 après l'approbation initiale : le POST `/gouvern/deploy` ne doit pas fonctionner sur seule présentation du ticket web signé. Ajout de `authorizeRuntimeWrite` à la route et garde d'exécution **fail-closed** sur S1 : `authorizeRuntimeWrite: async () => false`, comme pour Plesk, tant que les autorités runtime existantes ne peuvent attester session/claim/locks de ce scope.
- Nouveau test RED puis implémentation GREEN sur le refus d'un consentement web valide sans admission runtime ; la suite CI exacte du dernier commit doit être vérifiée avant revue.
- Conséquence opérationnelle : une fusion du code **n'autorisera pas encore** la création du répertoire privé sur S1 ; l'activation du flag n'est pas une admission de tâche runtime. Raccorder l'autorité existante avant tout staging réel ; ne jamais contourner par écriture SSH ad hoc.
- Fournisseur GitHub App : module de mint de jetons sous-scope présent mais non raccordé au téléchargement GRT ; la visibilité de ce dépôt par credential S1 a été vérifiée séparément. Extension multi-comptes conservée comme prochain périmètre de #349, non prétendue opérationnelle.

## NEXT_ACTION

Vérifier CI au HEAD final, faire relire et résoudre les six fils de sécurité sans les masquer, synchroniser les trois journaux historiques, vérifier les règles de protection `main`, puis fusionner seulement si GitHub admet la PR et qu'une revue indépendante couvre la version finale. Après fusion : vérifier `MCP Governed Deploy` sur SHA exact, activer de manière ciblée /gouvern par un canal de configuration autorisé, demander le consentement opérateur pour le premier archivage et attester `/health`, `/mcp`, OAuth, login, `/gouvern` et la santé Docker. Aucun accès SSH libre ni écriture directe au code versionné sur S1.
