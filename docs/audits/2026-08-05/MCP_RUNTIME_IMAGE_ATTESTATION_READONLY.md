# Attestation read-only du runtime et de l’image Docker MCP

Date : 2026-08-05
Branche : `mcp/docker-image-attestation-readonly-20260805`
Base : `main@59f07e21e8ad06b8cfac6039d08fc3c7d6652a62`

## Contexte

L’attestation S1 consignée dans l’issue #29 a conclu à un NO-GO pour l’alignement direct. Une limite restait ouverte : les outils disponibles ne restituaient pas l’ID complet de l’image active, ses tags/digests, sa date de création ni ses labels de provenance sélectionnés.

## Outil ajouté

`mcp_runtime_image_attestation_s1`

Le conteneur cible est fixé dans le code :

```text
wealthtech_mcp_ssh_bridge
```

Aucun argument libre ou nom de conteneur fourni par l’appelant n’est accepté.

## Données retournées

Conteneur :

- nom ;
- ID complet ;
- date de création ;
- date de démarrage ;
- statut ;
- santé ;
- référence d’image ;
- ID complet de l’image.

Image :

- ID complet ;
- date de création ;
- `RepoDigests` ;
- `RepoTags` ;
- labels Compose sélectionnés ;
- labels OCI `created`, `revision`, `source` et `version`.

## Données explicitement exclues

- variables d’environnement ;
- mounts et volumes ;
- HostConfig ;
- réseaux ;
- commandes et entrypoints ;
- arguments et paths ;
- logs Docker ;
- labels arbitraires ;
- JSON complet du conteneur ou de l’image ;
- secrets et credentials.

## Garde-fous

- commandes `docker inspect` et `docker image inspect` uniquement ;
- option `--format` obligatoire pour chaque inspection ;
- conteneur fixé dans le code ;
- sortie textuelle bornée ;
- passage obligatoire par `runReadOnlyCommand` et la politique `assertReadOnlyCommand` ;
- tests de non-exposition et de non-mutation.

## Statut opérationnel

Cette PR ajoute l’outil au code canonique uniquement. Elle ne l’exécute pas sur S1, car le connecteur serveur n’est pas exposé dans la conversation courante et le runtime actif ne doit pas être modifié.

Après fusion et déploiement contrôlé dans un candidat isolé, l’outil devra être exécuté pour compléter la provenance de l’image avant toute décision de bascule.

## Garanties

- aucun changement S1/S2 ;
- aucun build ou restart de production ;
- aucun déploiement ;
- aucun changement Docker, registre ou remote ;
- aucune suppression, quarantaine ou purge ;
- aucune autorisation d’alignement direct.
