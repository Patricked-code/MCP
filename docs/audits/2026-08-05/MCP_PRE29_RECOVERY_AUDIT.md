# Audit de reprise MCP — état pré-29 juillet et dérive locale

Date de l’audit : 2026-08-05
Statut : **AUDIT EN COURS — DOCUMENTATION UNIQUEMENT**
Effet runtime : **AUCUN**
Build, restart, déploiement, reset, clean, pull, merge, suppression et purge : **INTERDITS pendant cette phase**

## 1. Décision validée

La reprise doit suivre cet ordre :

1. conserver la base versionnée antérieure aux changements du 29 juillet 2026 ;
2. préserver séparément toute la dérive locale actuelle afin de ne perdre aucune fonctionnalité utile ;
3. tester la baseline dans un environnement isolé ;
4. aligner ensuite GitHub, le répertoire Git S1 et l’image Docker réellement exécutée ;
5. réintroduire progressivement les capacités d’écriture, de déploiement, de quarantaine et de suppression ;
6. conserver le plan historique de migration des domaines ;
7. administrer les mappings depuis le frontend du MCP ;
8. interdire toute action sur un dépôt, serveur, chemin ou domaine absent du registre canonique.

## 2. État Git observé sur S1

Chemin :

`/opt/apps/wealthtech-mcp-ssh-bridge`

État observé :

- branche : `mcp/scoped-access-20260729_051313` ;
- HEAD : `097dac9` ;
- `origin/main` connu localement : `097dac9` ;
- remote actif : `Patricked-code/MCP` ;
- working tree : modifié et contenant des fichiers non suivis.

Fichiers suivis modifiés :

- `src/tools/readOnly.ts` ;
- `src/tools/writeScoped.ts`.

Principaux fichiers non suivis :

- `docker-compose.override.yml` ;
- `src/tools/legacyFundsScoped.ts` ;
- `src/tools/legacyVhostsScoped.ts` ;
- `src/tools/nigeriaScoped.ts` ;
- `src/tools/sadiaafDeploy.ts` ;
- `src/tools/sadiaafScoped.ts` ;
- `src/tools/amfRegistry.ts` ;
- scripts AMF-UMOA et BRVMDATA associés.

## 3. Baseline candidate antérieure au 29 juillet

Candidate :

`097dac9 Merge pull request #14 from mcp/s1-git-sync-tool-20260713`

Confirmé :

- ce commit est le point de départ Git de la branche locale du 29 juillet ;
- le HEAD local et `origin/main` connu localement portent le même SHA ;
- les fichiers apparus après le 29 juillet ne sont pas présents dans ce commit.

À vérifier avant restauration :

- typecheck et build dans une copie isolée ;
- tests existants ;
- démarrage du conteneur ;
- endpoints `/health`, OAuth et `/mcp` ;
- catalogue exact des outils ;
- compatibilité avec les volumes et secrets actuels ;
- équivalence ou non avec la dernière image saine réellement exécutée.

La baseline ne doit pas être déclarée « dernière version saine » tant que ces vérifications ne sont pas terminées.

## 4. Dérive exacte constatée dans `readOnly.ts`

La version locale importe désormais `runGuardedCommand` dans un module nominalement read-only.

Elle enregistre aussi directement :

- SADIAAF ;
- Legacy Funds ;
- Nigeria.

L’outil `curl_domain`, initialement destiné à un contrôle HTTPS, interprète désormais des alias spéciaux :

- `brvmdatapreflight` ;
- `brvmdatapush` ;
- `amfexport` ;
- `amfinfo` ;
- `amfcore0` et `amfcore1` ;
- `amfchunk-*` ;
- `amfhex-*` ;
- `amfgrep-*`.

Risque P0 :

`brvmdatapush` peut déclencher une opération d’écriture et de push derrière un outil présenté comme lecture HTTPS.

Décision :

- supprimer tout routage magique de `curl_domain` ;
- réserver `curl_domain` aux contrôles HTTP/HTTPS ;
- créer des outils AMF et BRVMDATA distincts, nommés selon leur effet réel ;
- séparer lecture, export local, publication, commit et push ;
- exiger une autorisation indépendante pour chaque niveau.

## 5. Dérive exacte constatée dans `writeScoped.ts`

La version locale ajoute :

- `legacy_funds_frontend` ;
- `legacy_funds_api` ;
- outils SADIAAF ;
- outils legacy vhosts ;
- registre AMF ;
- lecture SQL BRVM ;
- logs BRVM ;
- routage explicite de scripts vers plusieurs projets.

Constats :

- certains déploiements exécutent `npm install` au lieu de `npm ci` ;
- les recettes de déploiement, de redémarrage Passenger et de contrôle HTTP sont intégrées directement au code ;
- les chemins projet sont codés en dur ;
- la lecture BRVM dépend du groupe global d’outils d’écriture ;
- la suppression et la purge génériques des vhosts appartiennent à un module postérieur non versionné ;
- les capacités projet sont dispersées entre plusieurs fichiers TypeScript au lieu d’être résolues depuis le registre.

Décision :

- préserver les idées fonctionnelles utiles ;
- ne pas fusionner ces modules tels quels ;
- déplacer les projets, chemins et capacités dans un registre canonique ;
- introduire des adaptateurs d’exécution limités, testés et indépendants du mapping ;
- interdire `main` et `master` dans tous les outils de commit/push ;
- utiliser lockfile + `npm ci` ;
- séparer lecture, build, déploiement, rollback, quarantaine et purge.

## 6. Registres canoniques retrouvés avant le 29 juillet

Fichiers de référence :

- `data/mcp-git-registry.json` ;
- `.mcp/function-cartography.json` ;
- `.mcp/permissions.json` ;
- `.mcp/branch-governance.json` ;
- `.mcp/server-map.json` ;
- `SOURCE_OF_TRUTH.md` ;
- `MCP_SERVER_REGISTRY.md` ;
- `MCP_SERVER_MAPPING.md` ;
- `ACCESS_MATRIX.md` ;
- `Migration/02_PLAN_MIGRATION_ET_SECURITE.md`.

Rôle attendu :

- dépôt GitHub ↔ projet ↔ serveur ↔ chemin ;
- branche officielle ;
- niveau d’accès ;
- déploiement activé ou non ;
- fonctions disponibles ;
- chemins interdits ;
- gouvernance Git ;
- domaines protégés ;
- plan de migration et de nettoyage différé.

## 7. Limites du registre pré-29

Le registre version 1 était incomplet :

- seulement quelques mappings explicites ;
- aucune matrice de capacités par projet ;
- pas de statut de validation du chemin réel ;
- pas de distinction suffisante entre dépôt découvert et mapping opérationnel ;
- pas de modèle complet de migration source → cible ;
- pas de gestion de quarantaine et de purge différée ;
- pas de CRUD frontend sécurisé ;
- pas de double validation pour les opérations destructives.

L’auto-découverte GitHub créait un chemin théorique :

`/opt/apps/wealthtech-github-repos/<owner>/<repo>`

avec `deployEnabled=false`.

Décision :

un dépôt découvert reste un objet d’inventaire. Il ne peut jamais devenir automatiquement un projet administrable.

## 8. Frontend MCP retrouvé

Routes existantes :

- `/login` ;
- `/dashboard` ;
- `/git` ;
- `/git/status` ;
- `/github` ;
- `/github/status` ;
- `/github/:account`.

Fonctions existantes :

- authentification web MCP ;
- affichage de la connexion GitHub ;
- connexion d’un compte ou d’une organisation ;
- auto-découverte des dépôts visibles ;
- affichage des mappings dépôt ↔ projet ↔ serveur ↔ chemin ;
- affichage de la branche, de l’accès et de `deployEnabled`.

Fonctions non encore implémentées :

- créer manuellement un mapping ;
- modifier un mapping ;
- valider un chemin réel ;
- suspendre ou réactiver un mapping ;
- gérer les capacités par projet ;
- gérer les migrations de domaine ;
- gérer la quarantaine ;
- gérer la rétention avant purge ;
- visualiser un audit détaillé des changements ;
- appliquer une double confirmation destructive.

## 9. Modèle cible du mapping

Champs minimaux :

- `mappingId` ;
- `projectId` ;
- `githubOwner` ;
- `githubRepo` ;
- `sourceRepository` ;
- `targetRepository` ;
- `activeRepository` ;
- `serverId` ;
- `serverPath` ;
- `realPathVerified` ;
- `domain` ;
- `environment` ;
- `officialBranch` ;
- `allowedBranchPrefixes` ;
- `directMainPush` ;
- `mappingStatus` ;
- `allowedCapabilities` ;
- `deployEnabled` ;
- `destructiveOperationsEnabled` ;
- `protectedPaths` ;
- `backupRequired` ;
- `healthChecks` ;
- `rollbackMethod` ;
- `createdAt` ;
- `validatedAt` ;
- `activatedAt` ;
- `updatedAt` ;
- `updatedBy`.

Statuts proposés :

- `discovered` ;
- `proposed` ;
- `path_verified` ;
- `validated` ;
- `active` ;
- `suspended` ;
- `migration_pending` ;
- `migration_completed` ;
- `archived`.

Seul un mapping `active` peut autoriser une écriture.

## 10. Niveaux de capacités

### Niveau 0 — lecture

- inventaire ;
- lecture ;
- recherche ;
- logs ;
- Git status et diff ;
- health checks.

Toujours indépendant de l’activation globale des outils d’écriture.

### Niveau 1 — écriture réversible

- création de branche ;
- écriture ou modification de fichiers ;
- génération de documentation ;
- préparation d’une release isolée.

Conditions :

- projet actif ;
- chemin réel validé ;
- branche autorisée ;
- diff produit ;
- sauvegarde du fichier remplacé ;
- aucun secret.

### Niveau 2 — opération de service

- install ;
- tests ;
- build ;
- restart ;
- déploiement ;
- bascule de release ;
- rollback.

Conditions supplémentaires :

- commit exact ;
- working tree propre ;
- lockfile ;
- tests réussis ;
- health checks ;
- rollback connu.

### Niveau 3 — destruction contrôlée

- quarantaine ;
- suppression d’un artefact déclaré ;
- purge d’une release expirée.

Conditions supplémentaires :

- activation destructive distincte ;
- manifeste d’opération ;
- chemin réel et projet confirmés ;
- sauvegarde vérifiée ;
- période de rétention ;
- confirmation renforcée ;
- journal d’audit.

## 11. Plan historique de migration conservé

La procédure historique reste applicable :

1. inventorier l’application source ;
2. identifier code, technologie, runtime, processus, ports, bases, crons, certificats et secrets sans les exposer ;
3. confirmer ou créer la source GitHub ;
4. sauvegarder ;
5. préparer la destination ;
6. copier sans supprimer la source ;
7. construire et tester ;
8. basculer ;
9. contrôler HTTP, API, logs et processus ;
10. conserver un rollback ;
11. mettre l’ancienne release en quarantaine ;
12. purger seulement après validation et expiration de la rétention.

Règle :

- les domaines, configurations Plesk, certificats, bases et dépôts GitHub ne sont pas supprimés par défaut ;
- les anciens dépôts peuvent être marqués legacy ou archivés ;
- seules les anciennes copies serveur et les artefacts explicitement déclarés deviennent éventuellement supprimables.

## 12. Conflit documentaire P0

`PRODUCTION_STATE.json` et `SUIVI.md` décrivent encore un état antérieur :

- branche S1 annoncée : `main` ;
- working tree annoncé : propre ;
- dernier point de reprise : juillet 2026.

La réalité actuelle est différente.

Décision :

- conserver l’ancien état comme trace historique ;
- ne pas le modifier pour simuler un alignement ;
- produire un nouvel état attesté uniquement après restauration réelle ;
- le nouvel état devra contenir le commit GitHub, le commit S1, l’état du working tree, l’identifiant de l’image Docker, la source de build et les tests réalisés.

## 13. Plan d’alignement GitHub ↔ S1 ↔ runtime

1. achever l’inventaire de la dérive ;
2. créer un snapshot forensique de tous les fichiers locaux ;
3. enregistrer les checksums ;
4. identifier l’image Docker active et sa date de création ;
5. conserver cette image comme rollback ;
6. préparer une copie propre de `097dac9` ;
7. lancer typecheck, build et tests dans cette copie ;
8. démarrer une instance candidate isolée ;
9. comparer endpoints et catalogue d’outils ;
10. obtenir validation humaine ;
11. remettre S1 sur une base propre ;
12. construire et déployer une image attestée ;
13. vérifier GitHub, S1, Docker, OAuth, `/health` et `/mcp` ;
14. mettre à jour `PRODUCTION_STATE.json` et `SUIVI.md` ;
15. faire évoluer le MCP par petites PR indépendantes.

## 14. Découpage futur des PR

1. documentation et état de production ;
2. séparation stricte lecture / écriture ;
3. registre canonique version 2 ;
4. frontend CRUD des mappings ;
5. écriture réversible ;
6. tests et build ;
7. déploiement et rollback ;
8. quarantaine ;
9. purge différée ;
10. intégrations projet une par une : Funds, BRVM, Nigeria, SADIAAF, Liquidity, AMF-UMOA.

Les opérations destructives ne doivent pas être incluses dans les premières PR de reprise.

## 15. Risques prioritaires

### P0

- écriture ou push caché derrière `curl_domain` ;
- fonctions génériques de suppression et purge ;
- code de production non versionné ;
- runtime non attesté ;
- documentation d’état obsolète.

### P1

- autorisation de `main` ou `master` dans certains modules ;
- lecture liée à `ENABLE_WRITE_TOOLS` ;
- `npm install` dans les recettes ;
- chemins codés en dur ;
- tests insuffisants ;
- parité `src` / `dist` / image Docker non prouvée ;
- logs pouvant contenir des paramètres sensibles insuffisamment masqués ;
- auto-découverte créant des mappings théoriques non validés.

## 16. Règles de gel

Tant que la validation finale n’est pas donnée :

- aucun reset ;
- aucun clean ;
- aucun stash ;
- aucun pull ;
- aucun merge ;
- aucun build de production ;
- aucun restart ;
- aucun déploiement ;
- aucune suppression ;
- aucune purge ;
- aucune modification Plesk ;
- aucune écriture en base ;
- aucune utilisation des alias spéciaux de `curl_domain`.

La seule écriture admise pendant cette phase est documentaire et sans effet runtime.

## 17. Prochain point de reprise

Actions d’audit restantes :

1. identifier l’image Docker active, son ID et sa date de création ;
2. confirmer le contenu compilé réellement exécuté ;
3. compléter la matrice fichier par fichier entre `097dac9` et la dérive locale ;
4. préparer le snapshot forensique ;
5. tester `097dac9` dans une copie isolée ;
6. préparer le contrat détaillé du frontend mapping V2 ;
7. préparer la PR documentaire ;
8. demander la validation humaine avant toute restauration.
