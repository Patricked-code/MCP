# Alignement GitHub ↔ S1 ↔ runtime — état d’exécution

Date : 2026-08-05

## Décision

La cible validée est de restaurer le MCP sur la base Git propre antérieure aux modifications du 29 juillet 2026, puis de réintroduire progressivement les capacités utiles.

Baseline candidate : `097dac93715c0af83fcfad82cd598bacec956125` (`097dac9`).

## État observé sur S1

- chemin : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- branche : `mcp/scoped-access-20260729_051313` ;
- HEAD : `097dac9` ;
- `origin/main` connu localement : `097dac9` ;
- remote : `Patricked-code/MCP` ;
- working tree : sale ;
- fichiers suivis modifiés : `src/tools/readOnly.ts`, `src/tools/writeScoped.ts` ;
- fichiers non suivis : modules SADIAAF, Nigeria, Legacy Funds, Legacy Vhosts, AMF-UMOA, scripts associés, `docker-compose.override.yml` et documentation d’audit.

## État du runtime

Le conteneur `wealthtech_mcp_ssh_bridge` est actif et sain sur `127.0.0.1:8787`.

Les logs montrent des capacités absentes de `097dac9`, notamment des fonctions AMF/BRVMDATA. Le runtime actif n’est donc pas une exécution pure du commit Git affiché.

## Blocage de sécurité

L’outil `mcp_sync_from_github_s1` existe dans le code, mais il exige :

- la branche `main` ;
- un working tree propre ;
- un fast-forward uniquement.

Ces préconditions ne sont pas satisfaites. Il refuserait donc correctement l’opération.

Les outils actuellement exposés ne permettent pas de réaliser de manière atomique et attestée les opérations suivantes :

1. archiver intégralement tous les fichiers suivis modifiés et non suivis ;
2. enregistrer leurs checksums ;
3. conserver l’image Docker active comme rollback identifié ;
4. nettoyer le working tree ;
5. basculer sur `main` ;
6. reconstruire exactement depuis `097dac9`.

Il est interdit de contourner ce blocage avec `git reset --hard`, `git clean -fd`, un alias caché de `curl_domain`, ou un script non revu.

## Actions effectuées

- vérification de l’état Git S1 ;
- vérification du conteneur actif ;
- vérification des sauvegardes visibles ;
- création de la branche GitHub `mcp/alignment-recovery-20260805` depuis `097dac9` ;
- consignation de cet état dans GitHub.

## Actions non effectuées

- aucune suppression ;
- aucun reset ou clean ;
- aucun changement de branche sur S1 ;
- aucun build ;
- aucun restart ;
- aucun déploiement ;
- aucun changement de remote ;
- aucune modification du service en ligne.

## Prochaine capacité requise

Créer et revoir un outil de récupération strictement borné, par exemple `mcp_restore_clean_baseline_s1`, avec les étapes obligatoires suivantes :

1. préflight read-only ;
2. snapshot complet dans une archive hors du dépôt ;
3. manifeste JSON des fichiers, tailles et SHA-256 ;
4. identification de l’image Docker active ;
5. validation que `HEAD` et la baseline attendue correspondent ;
6. confirmation explicite `allow_write=true` ;
7. déplacement réversible de la dérive vers une quarantaine, jamais suppression directe ;
8. checkout de `main` à `097dac9` ;
9. vérification du working tree propre ;
10. build et tests dans une copie isolée ;
11. déploiement de l’image candidate ;
12. tests `/health`, OAuth et `/mcp` ;
13. rollback automatique vers l’image précédente en cas d’échec ;
14. mise à jour de `PRODUCTION_STATE.json` et `SUIVI.md` après succès seulement.

## Statut

`ALIGNMENT_STATUS = BLOCKED_SAFELY_PENDING_RECOVERY_TOOL`

La production reste inchangée et opérationnelle. La branche GitHub créée sert de point de reprise documentaire et ne doit pas être fusionnée tant que l’outil de récupération n’a pas été revu et testé.
