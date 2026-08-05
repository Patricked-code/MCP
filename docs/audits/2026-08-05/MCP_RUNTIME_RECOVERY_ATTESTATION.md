# Attestation de récupération du runtime MCP — 5 août 2026

## Dépôt

- dépôt actif : `Patricked-code/MCP` ;
- main GitHub : `097dac93715c0af83fcfad82cd598bacec956125` ;
- branche de récupération : `mcp/recover-runtime-drift-20260805` ;
- commit de récupération : `7c8d9f782ae3195197345257f38fbc400504a848`.

## Parité avec le runtime

- tests read-only : 6/6 réussis ;
- typecheck : réussi ;
- build : réussi ;
- comparaison build récupéré / runtime : 0 différence ;
- production modifiée pendant la récupération : non.

## Docker actif

- image : `sha256:b82969cbd5b840738b411ec99956075dcb40516501d8048883f95b529d2c03d0` ;
- conteneur créé : `2026-08-04T23:20:11.143557276Z` ;
- conteneur démarré : `2026-08-04T23:20:47.504739707Z` ;
- santé : `healthy`.

## Sauvegarde

- snapshot : `/opt/backups/wealthtech-mcp-alignment/20260805T030441Z` ;
- bundle Git : `/opt/backups/wealthtech-mcp-alignment/20260805T030441Z/git-bundles/MCP-recover-runtime-drift-20260805.bundle` ;
- SHA-256 du bundle : `8a27a5814fb5fe688b42344cab770a1aee2ad059dc076b691df1e7900c43c4bd`.

## État d’alignement

- runtime préservé dans GitHub : oui ;
- main GitHub alignée : non ;
- dossier Git actif S1 propre : non ;
- image reconstruite depuis un commit fusionné : non ;
- prochaine étape technique : séparation stricte lecture / écriture.
