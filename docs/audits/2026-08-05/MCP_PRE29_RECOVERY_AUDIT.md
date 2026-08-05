# Audit de reprise MCP — état pré-29 juillet et dérive locale

## État Git observé

- Répertoire S1 : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Branche locale : `mcp/scoped-access-20260729_051313`
- HEAD : `097dac93715c0af83fcfad82cd598bacec956125`
- `origin/main` connu : même SHA
- Remote actif : `Patricked-code/MCP`
- Working tree : modifié et contenant des fichiers non suivis

Fichiers suivis modifiés :

- `src/tools/readOnly.ts`
- `src/tools/writeScoped.ts`

Principaux ajouts non suivis :

- `src/tools/legacyFundsScoped.ts`
- `src/tools/legacyVhostsScoped.ts`
- `src/tools/nigeriaScoped.ts`
- `src/tools/sadiaafDeploy.ts`
- `src/tools/sadiaafScoped.ts`
- `src/tools/amfRegistry.ts`
- scripts AMF-UMOA et BRVMDATA
- `docker-compose.override.yml`
- documentation d'audit locale

## Baseline candidate

Le commit `097dac9` est le point de départ Git de la branche locale. Il est candidat pour représenter
l'état versionné antérieur aux modifications du 29 juillet, mais ne doit pas être qualifié de dernière
version saine avant tests isolés.

Tests requis :

- `npm ci`
- typecheck
- tests
- build
- scan de secrets
- démarrage isolé
- `/health`
- OAuth
- `/mcp`
- comparaison du catalogue des outils
- compatibilité avec les volumes persistants

## Dérive fonctionnelle

Les modifications locales ont ajouté ou élargi :

- SADIAAF
- Nigeria OPCVM
- anciens domaines Liquidity
- Funds historique
- BRVM
- AMF-UMOA et BRVMDATA
- écriture, Git, build, déploiement, rollback, quarantaine, suppression et purge

La dérive a mélangé des fonctions de lecture et d'écriture et a codé plusieurs chemins directement
dans les modules TypeScript.

## Risques prioritaires

### P0

- écriture ou push caché derrière `curl_domain`
- outils génériques de suppression et purge
- code de production non versionné
- provenance de l'image Docker non attestée
- documentation de production périmée

### P1

- branches `main` ou `master` autorisées dans certains outils
- usage de `npm install` au lieu de `npm ci`
- modules de lecture dépendant de l'activation globale des outils d'écriture
- tests absents pour les nouveaux modules
- journalisation OAuth trop détaillée

## Décision de reprise

- conserver toutes les idées utiles
- ne fusionner aucun module post-29 tel quel
- retirer toute écriture cachée d'un outil read-only
- centraliser les chemins et capacités dans un registre
- séparer READ, WRITE, DEPLOY et DESTRUCTIVE
- interdire les pushes directs sur `main` et `master`
- remplacer la suppression générique par quarantaine, rétention et purge déclarée
- reconstruire projet par projet avec tests et PR séparées
