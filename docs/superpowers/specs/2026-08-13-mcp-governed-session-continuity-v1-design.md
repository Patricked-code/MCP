# MCP Governed Session Continuity / Operational Memory V1 — Design

- Date : 2026-08-13
- Dépôt : `Patricked-code/MCP`
- Branche de travail unique : `mcp/session-continuity-v1-20260813`
- Baseline GitHub/S1/runtime verrouillée : `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`
- Statut : architecture et spécification approuvées par GO humain explicite le 2026-08-13 ; plan d’implémentation TDD autorisé, aucun code fonctionnel encore engagé
- Mode de livraison : additif, backward-compatible, sans architecture parallèle
- Hors périmètre explicite : activation ou modification de la 2FA GitHub

## 1. Décision

MCP Governed Session Continuity / Operational Memory V1 étend le MCP existant afin qu’une nouvelle conversation ou reconnexion puisse reconstruire un contexte opérationnel canonique, reprendre légitimement une session durable, connaître l’état GitHub/S1/runtime/documentation et préparer des mutations gouvernées.

Le système ne remplace aucune mécanique validée. Il compose les sources existantes, introduit une mémoire opérationnelle bornée et ajoute un garde-fou progressif côté serveur.

L’injection de contexte utilise au maximum les capacités MCP d’initialisation, de ressources et d’outils lorsque le client les supporte. Elle ne constitue jamais l’unique garantie. La garantie forte est assurée côté serveur : les lectures restent disponibles ; le futur contrôle des mutations dépendra de l’établissement et de l’acquittement d’un contexte gouverné. La première livraison du WRITE gate est strictement en `shadow`, donc non bloquante.

## 2. Baseline factuelle

Au début du chantier :

- GitHub `main` pointe sur `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` ;
- S1 `HEAD` et `origin/main` pointent sur le même SHA ;
- S1 est sur `main`, propre, avec diff vide ;
- le remote fetch S1 est read-only et le remote push reste `disabled://mcp-s1-read-only` ;
- le conteneur `wealthtech_mcp_ssh_bridge` est `running` et `healthy` ;
- l’image active porte la révision OCI exacte `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` ;
- Live State V1 est `CURRENT`, `FULLY_ALIGNED`, `stateVersion=9` ;
- aucun PR n’est ouvert et aucune branche Session Continuity ne préexistait ;
- le ruleset `protect-main` est actif et impose PR, statut `validate` et résolution des threads ;
- la PR #43 est fusionnée et son push a produit une CI et un déploiement automatique exact-SHA réussis.

Une incohérence est attestée : les documents actifs déclarent encore le SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` et présentent la seconde preuve automatique comme restant à faire. Le collecteur Live State observe pourtant `documentation.drift=false`, car la détection actuelle ne compare pas le SHA documentaire déclaré au SHA GitHub observé. Cette dette doit être corrigée par TDD avant toute extension qui s’appuie sur l’alignement documentaire.

## 3. Invariants intangibles

Les éléments suivants restent inchangés dans leur rôle, leur autorité et leur comportement :

1. Live State V1 et son `stateVersion`.
2. La chaîne GitHub → MCP → S1 → Docker.
3. Le déploiement GitHub OIDC exact-SHA.
4. Le fast-forward only sur S1.
5. L’identité Git S1 read-only et le push S1 neutralisé.
6. Les contrôles health, OAuth, MCP et runtime/OCI.
7. Le rollback existant.
8. Le ruleset `protect-main`.
9. La gouvernance branche → PR → CI → revue → merge exact-head.
10. `.mcp/autodeploy-policy.json` avec `pushEnabled=true`.
11. Tous les outils MCP existants, leurs noms, schémas et comportements.
12. `ENABLE_WRITE_TOOLS` comme premier contrôle d’exposition des outils d’écriture.
13. `allow_write` comme consentement explicite par appel.
14. `ACTIVITY_LOG.md` append-only et les documents actuels de gouvernance.
15. La chaîne d’enregistrement correcte :
    `registerReadOnlyTools → registerGithubAuthorizationReadOnlyTools → registerLiveStateReadOnlyTools`.
16. Le fallback périodique de réconciliation Live State à 60 secondes.
17. Les routes MCP, OAuth, GitHub, health et déploiement existantes.
18. L’absence de shell libre et l’interdiction de lire ou journaliser des secrets.

Toute découverte imposant de casser un de ces invariants déclenche un STOP : aucun contournement, documentation du blocage et proposition d’une alternative backward-compatible.

## 4. Sources de vérité et absence d’architecture parallèle

Le nouveau contexte n’est pas une nouvelle source de vérité concurrente. Il s’agit d’une projection dérivée et horodatée.

| Domaine | Autorité |
|---|---|
| Code, branche, commits, PR, CI, revue | GitHub |
| État réellement exécuté | S1, Docker et attestation runtime |
| Alignement GitHub/S1/runtime/documentation | Live State V1 |
| Tâche, décisions et historique humain | Documents gouvernés du dépôt |
| Cycle de vie d’une session opérationnelle | Store des governed sessions |
| Propriété temporaire d’une ressource | Store des locks |
| Preuve chronologique machine | Journal d’événements append-only |
| Vue consommée par l’agent | Governed Operational Context, dérivé des autorités ci-dessus |

Le journal d’événements ne décide jamais de l’état courant. Le contexte gouverné ne réécrit pas Live State. Les sessions et locks ne sont pas incorporés dans le calcul sémantique de `LiveStateSnapshot.stateVersion`, afin d’éviter qu’un heartbeat ou une reconnexion fasse artificiellement évoluer Live State.

## 5. Frontière d’accès

### 5.1 Agent connecté à GitHub seulement

Il peut obtenir les branches, commits, PR, CI, revues et documents du dépôt. Il ne peut pas attester en temps réel le HEAD S1, Docker, l’image OCI ni les health checks.

Le système ne doit jamais présenter cet état GitHub-only comme un état runtime temps réel.

### 5.2 Agent connecté à GitHub et au bridge MCP

Il peut obtenir le Governed Operational Context complet et réconcilié, incluant GitHub, Live State, S1, runtime, documentation, session, locks et prochaine action.

La garantie de continuité complète cible cette configuration.

## 6. Governed Operational Context

Un service de composition read-only construit une projection versionnée sans dupliquer les collecteurs existants.

### 6.1 Contenu minimal

- `schemaVersion` ;
- `generatedAt` et fraîcheur ;
- repository et branche gouvernée ;
- SHA GitHub `main` ;
- branche, HEAD, `origin/main`, propreté et remotes bornés de S1 ;
- conteneur, santé, image et révision OCI ;
- Live State V1 complet ou résumé accompagné de son `stateVersion` ;
- tâche active et statut documentaire ;
- branche de travail et PR correspondante ;
- head SHA de la PR ;
- état draft/ready/merged ;
- CI et checks pertinents ;
- revues, threads non résolus et dernière activité ;
- dernière action significative connue ;
- dernier checkpoint gouverné ;
- blockers ;
- sessions actives compatibles avec l’identité observée ;
- locks actifs et expirations ;
- prochaine action unique ;
- actions autorisées, observées ou à terme interdites par le gate ;
- niveau de preuve de l’identité et limites de la vue.

### 6.2 Surfaces MCP additives

- instructions d’initialisation recommandant de lire le contexte gouverné ;
- ressource `mcp://wealthtech/governed-context/current` ;
- outil read-only `mcp_get_governed_context` ;
- outil read-only de réconciliation explicite, distinct des mutations ;
- annotations de ressource indiquant audience assistant et priorité élevée lorsque le SDK le permet.

Les clients restent libres d’incorporer une ressource. Le serveur ne déduit donc jamais qu’un contexte a été compris à partir de la seule initialisation ou de la seule exposition de la ressource.

## 7. Identité durable : governedSessionId

### 7.1 Séparation obligatoire

`MCP-Session-Id` est une identité de transport temporaire. Il ne devient jamais l’identité opérationnelle durable.

`governedSessionId` est l’identifiant stable d’une session opérationnelle persistante. Un ou plusieurs transports successifs peuvent lui être associés.

### 7.2 Modèle de session

Une governed session contient au minimum :

- `governedSessionId`, UUID aléatoire stable et non signifiant ;
- `schemaVersion` ;
- repository et portée de tâche ;
- identité d’agent déclarée ;
- identité authentifiée disponible, sans secret ;
- niveau d’assurance de l’identité ;
- statut `OPEN | ACTIVE | PAUSED | EXPIRED | CLOSED` ;
- timestamps de création, reprise, heartbeat et fermeture ;
- dernier transport associé sous forme de métadonnée sanitizée ;
- `lastAcknowledgedStateVersion` ;
- `sessionRevision` pour concurrence optimiste du record ;
- dernier checkpoint ;
- blockers ;
- prochaine action ;
- locks détenus par référence ;
- politique de reprise appliquée.

Le `MCP-Session-Id` brut ne doit pas être utilisé comme clé durable ni être écrit dans le journal machine. Le binding courant peut vivre en mémoire ; le store persiste un fingerprint borné et les timestamps nécessaires à l’audit.

### 7.3 Reprise légitime

La reprise de la même governed session est autorisée uniquement si la preuve disponible respecte la politique de binding :

1. un principal authentifié stable correspond au propriétaire enregistré ; ou
2. un secret de reprise à forte entropie est présenté, dont seul le hash est stocké ; et
3. repository et portée demandés sont compatibles ; et
4. la session n’est ni fermée ni expirée de manière irrévocable ; et
5. aucun conflit de propriété ou lock ne rend la reprise ambiguë.

Le `governedSessionId` est un identifiant, pas un secret d’autorisation. Un credential MCP partagé ou un simple nom de client ne suffit pas à une reprise automatique forte.

Si l’identité disponible ne permet pas une reprise sûre, le serveur ne simule pas la continuité : il crée une nouvelle governed session ou retourne les checkpoints antérieurs en lecture seule sans transférer leur propriété.

### 7.4 Outils de cycle de vie

Les nouveaux outils sont additifs et bornés :

- ouverture d’une governed session ;
- reprise d’une governed session ;
- heartbeat ;
- acquittement du contexte courant ;
- checkpoint ;
- pause/fermeture ;
- liste read-only des sessions visibles ;
- lecture read-only d’une session visible.

Ces mutations portent uniquement sur la mémoire opérationnelle MCP. Elles n’écrivent ni dans le dépôt Git S1 ni dans GitHub.

## 8. Checkpoints

Un checkpoint représente une position de reprise, pas un remplacement de Git ou de la documentation.

Champs minimaux :

- `checkpointId` ;
- governed session ;
- timestamp ;
- tâche ;
- branche et PR ;
- head SHA observé ;
- Live State `stateVersion` acquitté ;
- action terminée ;
- résultat borné et sanitizé ;
- blockers ;
- prochaine action ;
- références d’événements ;
- `sessionRevision`.

Aucun prompt complet, sortie complète d’outil, secret, token, clé ou contenu arbitraire n’est persisté.

## 9. Locks

Les locks sont distincts des sessions et du transport.

### 9.1 Propriétés

- `lockId` ;
- `scope` normalisé : repository, tâche ou ressource explicitement autorisée ;
- `governedSessionId` propriétaire ;
- timestamp d’acquisition ;
- expiration ;
- dernier renouvellement ;
- raison bornée ;
- statut ;
- révision du lock.

### 9.2 Règles

- durée finie obligatoire ;
- renouvellement explicite par heartbeat valide ;
- expiration automatique ;
- aucun lock infini ;
- un redémarrage ne transforme pas un lock expiré en lock actif ;
- conflits retournés explicitement ;
- libération idempotente par le propriétaire ;
- administration éventuelle hors V1 et hors chemin agent ordinaire.

Valeurs initiales proposées : TTL par défaut 5 minutes, maximum 30 minutes, heartbeat recommandé 60 secondes. Elles seront centralisées et testées, jamais dispersées dans plusieurs fichiers.

En shadow mode, un conflit de lock est observé et journalisé mais ne bloque aucun outil existant.

## 10. Stores persistants

Les données runtime restent dans `/app/data`, volume déjà prévu pour l’état MCP.

Stores logiques :

- governed sessions ;
- locks ;
- journal d’événements JSONL ;
- archives bornées du journal.

Règles communes :

- schéma versionné ;
- validation stricte à la lecture ;
- écriture JSON atomique par fichier temporaire puis rename pour les snapshots ;
- permissions `0600` ;
- sérialisation des écritures concurrentes ;
- récupération fail-closed d’un fichier corrompu sans écraser automatiquement la preuve ;
- aucune donnée sensible ;
- rotation JSONL bornée, proposée à 10 MiB avec cinq archives maximum ;
- rétention et nettoyage déterministes ;
- aucune dépendance à une base de données externe pour V1.

Le store Live State existant n’est ni déplacé ni remplacé.

## 11. Journal d’événements machine append-only

Événements minimaux :

- session ouverte, reprise, pause, expiration ou fermeture ;
- transport lié ou délié sous forme sanitizée ;
- contexte lu et acquitté ;
- lock acquis, renouvelé, refusé, libéré ou expiré ;
- outil sensible commencé, réussi ou échoué ;
- décision shadow du WRITE gate ;
- checkpoint créé ;
- réconciliation demandée et terminée ;
- changement de `stateVersion` ;
- contradiction ou blocker détecté.

Chaque événement contient un identifiant, une séquence monotone par processus, un timestamp, un type, les identifiants gouvernés nécessaires, une version de schéma et des métadonnées allowlistées.

Le journal n’enregistre jamais les arguments complets d’un outil, les contenus de fichiers, les tokens, les headers d’authentification, les prompts ou les sorties brutes.

## 12. Correction TDD du détecteur documentaire

### 12.1 Test RED obligatoire

Construire un snapshot avec :

- GitHub head = SHA B ;
- documentation `declaredGithubSha` = SHA A différent ;
- collecteurs autrement disponibles et alignés.

Le test doit échouer avant correction parce que l’implémentation actuelle produit à tort `documentation=ALIGNED`.

### 12.2 Comportement GREEN attendu

Lorsqu’un SHA GitHub documentaire explicite est présent et différent du head GitHub observé :

- `documentation.drift=true` ;
- `alignment.documentation=DRIFT` ou la valeur non-alignée déjà définie par le contrat existant ;
- `alignment.global` ne peut pas être `FULLY_ALIGNED` ;
- une contradiction stable et testable identifie le mismatch ;
- `nextAction` demande une réconciliation documentaire factuelle ;
- les autres contrats Live State ne changent pas.

L’absence d’un SHA ne doit pas être transformée arbitrairement en égalité. Son traitement conserve les conventions existantes sauf test et décision explicites.

### 12.3 Réconciliation documentaire

Les documents actifs devront ensuite enregistrer factuellement :

- la fusion de la PR #43 ;
- le second push automatique exact-SHA ;
- la CI et le déploiement réussis au SHA `eb61b97e…` ;
- l’alignement post-déploiement ;
- la clôture de `TASK-20260809-003` si toutes ses conditions historiques sont réellement satisfaites ;
- l’ouverture d’une nouvelle tâche dédiée à Session Continuity V1 ;
- la branche unique et la prochaine action actuelle.

`ACTIVITY_LOG.md` reste strictement append-only.

## 13. GitHub Operational Context enrichi

Un collecteur read-only additif observe, de manière bornée :

- `main` et son SHA ;
- branches pertinentes ;
- PR active de la branche gouvernée ;
- head SHA, base, draft/ready/merged ;
- checks et conclusion ;
- revues ;
- threads non résolus ;
- dernière activité significative ;
- règles de protection utiles au diagnostic.

Contraintes :

- appels HTTPS allowlistés ;
- token jamais exposé ;
- timeouts ;
- pagination bornée ;
- cache court ;
- échec dégradé sans faire tomber le serveur ;
- aucune écriture GitHub depuis le collecteur ;
- aucune collecte GitHub à chaque appel read-only sans nécessité.

## 14. Réconciliation événementielle

Le moteur Live State actuel garde :

- sa réconciliation initiale ;
- son single-flight ;
- son stockage actuel ;
- son intervalle de 60 secondes.

Les événements significatifs peuvent demander `reconcileNow()` après leur résultat. Les appels simultanés partagent le même travail en cours.

Le déclenchement événementiel ne remplace jamais le fallback de 60 secondes et ne doit pas créer une boucle de réconciliation à partir de ses propres événements.

## 15. WRITE gate progressif

### 15.1 Ordre des contrôles

Le nouveau gate se place après les contrôles existants, sans les remplacer :

1. outil exposé seulement si `ENABLE_WRITE_TOOLS=true` ;
2. `allow_write=true` reste obligatoire ;
3. politique Session Continuity observe le contexte ;
4. en `shadow`, la décision est journalisée et le handler original est toujours appelé ;
5. des modes d’enforcement futurs pourront refuser avant le handler, après décision explicite et preuves.

### 15.2 Mode initial

Mode initial obligatoire : `shadow`.

En shadow :

- aucun outil existant ne change de schéma ;
- aucun argument supplémentaire n’est exigé ;
- aucun résultat existant n’est remplacé ;
- aucune nouvelle erreur bloquante n’est introduite ;
- le handler existant est appelé exactement une fois ;
- succès, erreur et annulation gardent leur propagation actuelle ;
- les écarts de session, stateVersion ou lock sont observés et journalisés.

### 15.3 Intégration locale

Le gate enveloppe uniquement l’enregistrement de la surface WRITE scoped existante via un décorateur central et testable. Les handlers métier ne sont pas dupliqués.

La route de déploiement GitHub OIDC exact-SHA est explicitement exclue du gate Session Continuity V1 initial : elle garde sa propre authentification, ses contrôles et son workflow. Cette exclusion est documentée, testée et réévaluée séparément, jamais modifiée implicitement.

### 15.4 Modes futurs

La configuration prévoit des états explicites tels que :

- `off` ;
- `shadow` ;
- `enforce_new` pour les nouvelles mutations de mémoire opérationnelle ;
- `enforce_scoped_write` seulement après validation dédiée.

Aucun passage à un mode bloquant n’est inclus implicitement dans V1.

## 16. Concurrence optimiste

Deux versions restent distinctes :

- `expectedStateVersion` se rapporte au Live State V1 observé et acquitté ;
- `expectedSessionRevision` protège les mises à jour concurrentes de la governed session.

Les nouveaux outils de mémoire opérationnelle exigent les versions pertinentes. Un mismatch produit une erreur structurée sans écriture partielle.

Les outils existants ne changent pas de schéma. En shadow, le gate compare le dernier `stateVersion` acquitté de la session au Live State courant lorsqu’une session est liée, puis journalise seulement le verdict.

## 17. Performance et disponibilité

- Aucun appel GitHub ou SSH supplémentaire sur les outils read-only ordinaires qui n’utilisent pas le contexte gouverné.
- Le gate shadow utilise en priorité les snapshots en mémoire et les stores locaux.
- Les écritures du journal sont sérialisées et bornées.
- Une indisponibilité GitHub enrichie dégrade la section GitHub du contexte, sans rendre le MCP entier indisponible.
- Une corruption du store de sessions désactive les mutations de mémoire opérationnelle concernées, mais ne casse pas Live State, les lectures existantes ou le déploiement OIDC.
- Les logs applicatifs restent sanitizés.
- Les nouvelles tâches périodiques utilisent des timers `unref` et n’empêchent pas l’arrêt du processus.

## 18. Dashboard

Le dashboard reçoit une section additive seulement après stabilisation du cœur :

- état Live State et `stateVersion` ;
- tâche et prochaine action ;
- governed sessions actives ;
- locks et expirations ;
- PR/CI/revue ;
- mode du gate ;
- blockers.

Aucune page ni route actuelle n’est supprimée ou renommée. L’interface ne devient pas une source de vérité.

## 19. Stratégie de tests

### 19.1 Tests RED puis GREEN

1. mismatch SHA documentaire ;
2. ouverture et persistance d’une governed session ;
3. reprise légitime sur un nouveau transport ;
4. refus de reprise illégitime ;
5. séparation stricte governedSessionId / MCP-Session-Id ;
6. heartbeat et expiration ;
7. locks, conflit, renouvellement et expiration ;
8. concurrence `expectedStateVersion` et `expectedSessionRevision` ;
9. journal append-only, sanitization et rotation ;
10. contexte gouverné dérivé sans mutation ;
11. GitHub enrichi borné et dégradé ;
12. réconciliation événementielle single-flight ;
13. gate shadow déléguant exactement une fois ;
14. exclusion explicite du déploiement OIDC ;
15. instructions, ressource et outil MCP enregistrés ;
16. persistance et permissions `0600`.

### 19.2 Régression obligatoire

- typecheck ;
- build ;
- docs check ;
- gouvernance ;
- tests read-only safety ;
- tests de tool classification ;
- tests Live State existants ;
- tests store/engine/collecteurs ;
- tests runtime attestation ;
- tests OIDC et governed deploy ;
- tests routes health/OAuth/MCP ;
- secret scan ;
- `git diff --check` ;
- comparaison de la surface des outils existants : aucun nom ou schéma supprimé ;
- vérification que les handlers WRITE existants gardent leur résultat sous shadow.

## 20. Livraison incrémentale sur une seule branche

Une seule branche et un seul PR gouverné sont utilisés, mais le travail est découpé en commits réversibles :

1. baseline et spécification ;
2. test RED du drift documentaire ;
3. correction minimale GREEN et réconciliation des documents ;
4. Governed Operational Context read-only ;
5. store et cycle de vie des governed sessions ;
6. checkpoints et locks ;
7. journal d’événements ;
8. gate shadow ;
9. GitHub enrichi et réconciliation événementielle ;
10. dashboard additif ;
11. régression complète et consolidation documentaire.

Chaque commit doit rester compréhensible, testé et réversible. Une fonctionnalité incomplète reste derrière un mode non bloquant ou non exposé. Aucun big bang runtime.

## 21. Parcours de livraison

Ordre obligatoire :

`audit/baseline → spec → revue de la spec → plan détaillé → tests RED → implémentation minimale → GREEN → régression complète → PR draft → review → CI → merge exact-head → autodeploy existant → attestation`.

Avant fusion :

- PR passée ready uniquement après CI verte ;
- tous les threads actionnables résolus ;
- head SHA verrouillé et relu ;
- aucune dérive de `main`.

Après fusion :

- observer la CI push et le workflow de déploiement existant ;
- exiger l’exécution non-skipped du déploiement exact-SHA ;
- attester GitHub main, S1 HEAD, origin/main, OCI et runtime ;
- vérifier dépôt propre, conteneur healthy, OAuth et MCP ;
- réconcilier Live State ;
- vérifier le Governed Operational Context depuis une nouvelle session de transport ;
- enregistrer l’événement et le checkpoint final ;
- mettre à jour les documents factuels.

## 22. Rollback

Le rollback fonctionnel du nouveau chantier consiste à désactiver Session Continuity ou à remettre le gate à `off`/`shadow`, sans retirer ni modifier les outils existants.

Le rollback de déploiement reste celui de Governed Autodeploy V1.

Les formats persistants sont versionnés. Une version plus ancienne ne doit jamais écraser silencieusement un store plus récent. La désactivation conserve les données pour diagnostic sans en faire une autorité active.

## 23. Critères d’acceptation

Le chantier est terminé uniquement si :

1. un nouveau transport peut ouvrir ou reprendre légitimement une governed session durable ;
2. le governedSessionId reste stable lors d’une reconnexion autorisée ;
3. MCP-Session-Id demeure une métadonnée de transport ;
4. le contexte complet expose GitHub, S1, runtime, Live State, documentation, PR/CI/revue, checkpoint, locks et prochaine action ;
5. un client supportant resources/instructions peut recevoir le contexte par ces primitives ;
6. un client ne les supportant pas reste protégé côté serveur ;
7. le mismatch SHA documentaire ne peut plus produire `documentation=ALIGNED` ;
8. le gate est livré en shadow non bloquant ;
9. aucun outil existant ne régresse ;
10. Autodeploy V1 et OIDC sont inchangés et repassent toute leur régression ;
11. la CI, la fusion exact-head, l’autodeploy et l’attestation finale sont réussis ;
12. les limites GitHub-only versus GitHub+bridge sont documentées honnêtement ;
13. aucune donnée sensible n’est persistée ou journalisée ;
14. la 2FA GitHub n’a pas été modifiée.

## 24. Conditions STOP

Arrêt immédiat et retour en conception si l’implémentation exige :

- de remplacer Live State V1 ;
- de changer `stateVersion` pour suivre des heartbeats ou transports ;
- d’utiliser MCP-Session-Id comme identité durable ;
- de modifier les schémas des outils existants ;
- de supprimer `ENABLE_WRITE_TOOLS` ou `allow_write` ;
- de faire dépendre le déploiement OIDC d’une governed session ;
- d’écrire directement sur S1 hors outils gouvernés ;
- de créer une base ou source de vérité concurrente ;
- de journaliser des secrets ou contenus bruts ;
- de rendre le gate bloquant sans étape shadow validée ;
- de masquer un échec GitHub, S1, runtime, CI ou attestation.

Dans ce cas, le blocage est documenté avec preuve, impact, options backward-compatible et recommandation avant toute poursuite.
