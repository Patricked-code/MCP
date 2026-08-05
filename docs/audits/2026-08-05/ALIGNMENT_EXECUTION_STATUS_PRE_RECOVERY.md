# Alignement GitHub ↔ S1 ↔ runtime — état historique avant récupération

Date de l’observation : 2026-08-05

## Statut documentaire

Ce fichier conserve l’état qui précédait la récupération forensique publiée dans la PR #19.

Il est **historique et supersédé** par :

- `MCP_RUNTIME_RECOVERY_ATTESTATION.md` ;
- la branche `mcp/recover-runtime-drift-20260805` ;
- le commit `7c8d9f782ae3195197345257f38fbc400504a848`.

Il ne doit pas être utilisé comme instruction actuelle de restauration ou de déploiement.

## Décision observée à cette étape

La cible était de restaurer le MCP sur la base Git propre antérieure aux modifications du 29 juillet 2026, puis de réintroduire progressivement les capacités utiles.

Baseline candidate : `097dac93715c0af83fcfad82cd598bacec956125` (`097dac9`).

## État alors observé sur S1

- chemin : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- branche : `mcp/scoped-access-20260729_051313` ;
- HEAD : `097dac9` ;
- `origin/main` connu localement : `097dac9` ;
- remote : `Patricked-code/MCP` ;
- working tree : sale ;
- fichiers suivis modifiés : `src/tools/readOnly.ts`, `src/tools/writeScoped.ts` ;
- fichiers non suivis : modules SADIAAF, Nigeria, Legacy Funds, Legacy Vhosts, AMF-UMOA, scripts associés, `docker-compose.override.yml` et documentation d’audit.

## État alors observé du runtime

Le conteneur `wealthtech_mcp_ssh_bridge` était actif et sain sur `127.0.0.1:8787`.

Les logs montraient des capacités absentes de `097dac9`, notamment des fonctions AMF/BRVMDATA. Le runtime actif n’était donc pas une exécution pure du commit Git affiché.

## Blocage de sécurité constaté

L’outil `mcp_sync_from_github_s1` exigeait :

- la branche `main` ;
- un working tree propre ;
- un fast-forward uniquement.

Ces préconditions n’étaient pas satisfaites et l’outil devait donc refuser l’opération.

Il était interdit de contourner ce blocage avec `git reset --hard`, `git clean -fd`, un alias caché de `curl_domain` ou un script non revu.

## Actions alors effectuées

- vérification de l’état Git S1 ;
- vérification du conteneur actif ;
- vérification des sauvegardes visibles ;
- création de la branche GitHub `mcp/alignment-recovery-20260805` depuis `097dac9` ;
- consignation de cet état dans GitHub.

## Actions non effectuées à cette étape

- aucune suppression ;
- aucun reset ou clean ;
- aucun changement de branche sur S1 ;
- aucun build ;
- aucun restart ;
- aucun déploiement ;
- aucun changement de remote ;
- aucune modification du service en ligne.

## Suite réalisée après cet état

La dérive a été préservée dans GitHub et attestée sans modifier le répertoire de production actif. La prochaine étape n’est plus de créer un outil de récupération générique, mais de sélectionner les modules utiles, reconstruire la séparation READ/WRITE sur une base propre, puis préparer GitRegistry v2.
