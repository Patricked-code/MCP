# PR #372 — Registre évolutif des améliorations et constats vérifiés

> **Périmètre** : PR [#372](https://github.com/Patricked-code/MCP/pull/372), branche `audit/mcp-historical-merge-traceability-20261103`. Document additif de pilotage, **non normatif et non exécutable**. Il ne modifie ni les preuves historiques ni les contrats owner V0.2/V0.3, la Work Queue P2, E1/E2 ou les circuits de déploiement. Toute suggestion ci-dessous est une proposition à qualifier ; **aucun item marqué PROPOSÉ n'est réputé réalisé**.
>
> **Règle de mise à jour** : à chaque nouvelle amélioration discutée, ajouter une entrée horodatée/provenancée dans ce fichier en conservant toutes les entrées précédentes et en précisant `VERIFIE`, `PROPOSE`, `BLOQUE`, `A_TESTER` ou `REALISE_PREUVE`. Aucun nouvel UTL ID, événement historique, fichier S1 ou attestation n'est inventé. Ne pas fusionner PR #372 ni modifier `main` ou S1 sans autorisation.

## 1. Architecture de référence intangible

`E2 BLOC 1 [G1 reconciliation -> G2 registre -> G3 NEW/RESUME] -> N mandat -> P1 programme / Waves / Lots / Work Items / Task Blueprints -> P2 mécanisme existant de prise en charge -> tâche admissible (T_IN) -> 1..n UTL -> circuits D et L -> D_OUT / L_OUT -> UTL_OUT -> T_OUT`.

Rester strictement compatible avec les documents propriétaires `reference/MCP_UTL_circuits_matrices_2026-11-03_v02.md` et `..._v03.md`. Ne pas traiter un SHA ou une PR comme une UTL sans identité et admission attestées ; ne pas créer une seconde file de tâches. Les témoins GitHub et S1 restent des observations avec provenance, pas des relations causales tacites.

## 2. Registre cumulatif des améliorations

| ID | Statut initial | Sujet / amélioration à qualifier | Critère de fermeture / preuve attendue |
|---|---|---|---|
| IMP-372-001 | PROPOSE | **Registre des déploiements aboutis** fondé sur **chaque événement d'attestation terminale** (pas sur le SHA seul), avec `attestation_id` natif s'il existe, sinon clé historique de substitution explicitement dérivée et nommée | Contrats de table et unicité validés ; lien vers run/job S1, SHA et message final ; déduplication idempotente des réimports |
| IMP-372-002 | PROPOSE | **Corrélation 1:1 de preuve** : `deploy_run_id`, `github_job_id`, `server_job_id`, `requested_sha`, `runtime_revision`, `attested_at`, `workflow_conclusion`, `message`, `log_url`, `event_type`, `run_attempt` ; lier la CI main et son SHA sans inférence | Champs nuls lorsque non connus, FK/sources exactes, test de plusieurs déploiements du même SHA |
| IMP-372-003 | PROPOSE | **Séparer les niveaux de preuve** : succès de job GitHub, statut S1 accepté, attestation.json S1 effectivement lu, constat indépendant historique S1 et runtime actuel. `success` d'un workflow avec déploiement **skipped** n'est jamais un déploiement attesté | Classification fail-closed, contrôle d'étape `Deploy exact main SHA through MCP`, attestation finale obligatoire |
| IMP-372-004 | PROPOSE | **Versionner les attestations S1** : `schema_version=1` historique sans `attestation_id`, `schema_version=2` courant avec `attestation_id=s1-deploy-<jobId>` et admission CI. Ne pas rétro-projeter v2 sur le témoin 2026-08-29 | Parsers et tests par version, champ `attestation_id_native` nullable, provenance de schéma |
| IMP-372-005 | BLOQUE | **Lecture bornée, RO, sur S1** des deux fichiers du job `/opt/apps/wealthtech-mcp-deploy/jobs/<jobId>/status.state` et `attestation.json`. `read_mcp_code_file_s1` rejette cet emplacement (`Chemin relatif MCP invalide`) ; ne pas contourner la restriction | Outil autorisé avec allowlist stricte `jobId`, taille max, masquage secrets, absence de shell libre ; lecture observée et preuves d'intégrité |
| IMP-372-006 | PROPOSE | **Attestation S1 durable et atomique** : le worker courant appelle `write_status succeeded attested` avant `write_attestation succeeded attested` ; dissocier état de succès du fichier terminal durable, ou vérifier sa présence après écriture | Test panne entre les deux écritures ; définition explicite de la complétude des preuves terminales |
| IMP-372-007 | PROPOSE | **Traçabilité chronologique des phases S1** : `queued -> preflight -> fetch -> fast_forward -> build -> start -> health -> oauth -> mcp_auth -> attest -> attested` et échecs/rollback ; `status.state` est un dernier état, pas un journal append-only | Distinguer états observés, phases possibles issues du code et événements réellement archivés ; timestamps/source par événement si disponibles |
| IMP-372-008 | PROPOSE | **Témoin de remontée tâche réelle** : `TASK-20260829-001` (Work Queue P2, `DONE`, PR #58) ; PR #55 implémentation SHA `2c2dde2bffe62b2685bf2fad94530571762470c8`, CI `33256566688`, deploy `33256566695` ; PR #58 réconciliation docs SHA `f97624c090e639585949f40ce73b93213b267097`, CI `33257524751`, deploy `33257524744`, GitHub job `99113728864`, server job `mcp-s1-33257524744-f97624c090e6` | Enregistrement source-backed des relations distinctes (PR #55 et PR #58) ; ne pas déclarer les PR « UTL » ni prétendre lire l'ancien runtime |
| IMP-372-009 | PROPOSE | **Complétude des champs et relations owner V0.2/V0.3** : matrice de conformité champ par champ entre documents, schémas SQL, matrices de traçabilité, circuits D/L et vues | Audit exhaustif, écarts explicites, zéro suppression/régression et tests d'intégrité |
| IMP-372-010 | PROPOSE | **Séparer réception technique et acceptation fonctionnelle** : `L_OUT` n'entraîne ni `UTL_OUT` ni `T_OUT` automatiquement ; `D_OUT` et preuves P2 restent indépendants | Tests de non-confusion et règles d'agrégation 1..n UTL vers tâche |
| IMP-372-011 | PROPOSE | **Lien inverse depuis la preuve de déploiement** : attestation → S1 job → workflow job/run → CI exacte → merge SHA → PR → tâche P2 réelle → mandat/programme si réellement attestés | FK ou liens qualifiés avec provenance et `CANDIDATE_ONLY` là où la causalité n'est pas démontrée |
| IMP-372-012 | BLOQUE | **Écriture via WealthTech SSH Bridge** : sur les identités de connecteur essayées, les opérations `github_get_pull_request_state` et `github_get_branch_state` de `Patricked-code/MCP` renvoient `GITHUB_CONTROL_ORG_NOT_ALLOWED` ; éviter toute tentative non autorisée | Faire corriger ou attester le périmètre de contrôle MCP ; ne pas déduire de ce refus une absence de PR |

## 3. Témoin exact : journal GitHub attesté, sans lecture historique S1

- Dépôt : `Patricked-code/MCP`; PR #58 ; SHA `f97624c090e639585949f40ce73b93213b267097`.
- Nom workflow : `MCP Governed Deploy`, `.github/workflows/mcp-deploy.yml`, workflow ID `331795160`.
- Run `33257524744`, GitHub Job `99113728864`, S1 job `mcp-s1-33257524744-f97624c090e6`.
- Message de job accepté à `2026-08-29T14:24:40.5415038Z`.
- Message final `Deployment attested for exact SHA f97624c090e639585949f40ce73b93213b267097.` à `2026-08-29T14:25:03.7516143Z`.
- Job GitHub `deploy` : `success`; [journal original](https://github.com/Patricked-code/MCP/actions/runs/33257524744/job/99113728864).
- Le contrôle GitHub historisé exige `jobId`, `requestedSha`, `status=succeeded`, `phase=attested`, `runtimeRevision=SHA`, `rollbackStatus=not_needed`, `healthOk=true`, `oauthOk=true`, `mcpAuthOk=true`.
- **Limite de preuve** : le JSON intégral de réponse S1 et les fichiers historiques `status.state` / `attestation.json` n'ont PAS été lus directement. La conclusion GitHub est un reçu du contrôle de statut S1, pas une observation indépendante historique.
- Différence temporelle : code courant `src/deploy/s1Deploy.ts` : attestation `schema_version=2` et ID natif `s1-deploy-<jobId>` ; témoin historique `schema_version=1` sans ID natif. Code courant `.github/workflows/mcp-deploy.yml` : gate CI `push_ci_gate` ; témoin historique : gate `pushEnabled` sans cette preuve structurée.
- Observation live distincte au 2026-11-04 : S1, GitHub main et runtime alignés sur `05dbb66ed81aa4e7443655c89d10c0c390ff0f10` ; elle ne démontre pas rétrospectivement le runtime du 2026-08-29.

## 4. Règles d'entretien du registre

1. **Ajout seulement** : ne pas effacer les observations passées ; actualiser le statut par preuve, éventuellement avec un journal de changements ultérieur.
2. **Une amélioration ≠ une tâche de Work Queue** ; les décisions de matérialisation suivent P1/P2 existants et leurs contrôles.
3. **Aucune fausse complétude** : distinguer source vérifiée, schéma proposé, constat historique et contrôle runtime actuel.
4. **Interdits explicites** : pas de nouvelle PR pour ce programme, pas de push direct main, pas de modification S1, pas de Codex/Copilot, pas de fusion de la PR #372 à ce stade.
5. **Poursuite** : enrichir ce fichier au fil des nouveaux constats relatifs au même travail, sur la même branche de PR #372, après vérification de l'état réel et des droits d'écriture.

## 5. Complément d'audit — raccordement du développement GWC (2026-11-05)

> **Statut du présent ajout : VERIFIE pour les observations explicitement sourcées ; PROPOSE / A_TESTER / BLOQUE pour les travaux et critères non réalisés.** Audit GitHub + MCP/S1 en lecture seule. Aucun nouvel identifiant officiel de Task, Work Item, Blueprint, UTL, Continuity ID, incident ou attestation n'est créé ici. Les intitulés ci-dessous sont des sujets à qualifier au sein des propriétaires canoniques existants, **pas** des tâches runtime ni une admission de travail.
>
> **Périmètre précis :** gouvernance du développement MCP, famille E du graphe GWC (GW-21 à GW-33), GWC-2 (orchestration) et GWC-13 (développement), avec limites GWC-11/GWC-12 en amont et GWC-14 (PR/revue) en aval. Ne pas élargir cet audit aux circuits de déploiement applicatif, ni modifier l'architecture E1/E2, P1/P2 ou les contrats propriétaire V0.2/V0.3.
>
> **Observation datée 2026-11-05 :** réconciliation MCP en lecture seule : GitHub main, S1, runtime et documentation classés FULLY_ALIGNED au SHA 05dbb66ed81aa4e7443655c89d10c0c390ff0f10 ; Live State version 1202, Task Store révision 244. Présence des modules GWC vérifiée dans GitHub main et lecture sur S1 (la lecture S1 du module de développement est bornée aux premières 420 lignes). **L'alignement SHA n'atteste ni l'activation du dispatch GWC ni l'autorisation d'écrire.** Le contexte de session observé avait un Bootstrap Receipt expiré et mayMutate=false ; cela ne qualifie pas globalement toutes les sessions.
>
> **Sources de code et de preuve :** [contrats GWC](https://github.com/Patricked-code/MCP/blob/main/.mcp/gwc-contracts.json), [graphe GWC](https://github.com/Patricked-code/MCP/blob/main/.mcp/gwc-workflow-graph.json), [substrate](https://github.com/Patricked-code/MCP/blob/main/src/governedWorkflow/contractSubstrate.ts), [moteur shadow](https://github.com/Patricked-code/MCP/blob/main/src/governedWorkflow/executionEngine.ts), [développement](https://github.com/Patricked-code/MCP/blob/main/src/governedWorkflow/development/index.ts), [tests développement](https://github.com/Patricked-code/MCP/blob/main/tests/governedWorkflowDevelopment.test.ts), [tests moteur](https://github.com/Patricked-code/MCP/blob/main/tests/governedWorkflowExecutionEngine.test.ts), [outils GitHub](https://github.com/Patricked-code/MCP/blob/main/src/tools/githubLifecycle.ts), [enregistrement serveur](https://github.com/Patricked-code/MCP/blob/main/src/server.ts), [CI](https://github.com/Patricked-code/MCP/blob/main/.github/workflows/mcp-ci.yml), [profil de validation](https://github.com/Patricked-code/MCP/blob/main/package.json), [discovery des tests](https://github.com/Patricked-code/MCP/blob/main/scripts/run-validation-tests.mjs), [GWC-2 et GWC-13](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/BLUEPRINTS.md), [Program Backlog V2](https://github.com/Patricked-code/MCP/blob/main/docs/governance/program-backlog-convergence.json). Les liens vers main sont des sources évolutives : l'observation ci-dessus est rattachée au SHA exact indiqué, pas aux futures modifications de main.

### 5.1. État vérifié : opérationnel, préparé et non démontré

| Statut | Constat vérifié | Limite à préserver |
|---|---|---|
| VERIFIE | Contrats GW-01..GW-73 et 91 arêtes de graphe ; transitions FORWARD/BACKWARD/SKIP et préconditions ; famille E = GW-21..GW-33. | Les contrats décrivent des obligations et relations ; ils ne prouvent pas leur invocation runtime. |
| VERIFIE | contractSubstrate.ts charge/valide les registres, les empreintes et les sorties du graphe. | Lecteur/validateur, pas moteur d'effets. |
| VERIFIE | executionEngine.ts expose createShadowExecutionEngine ; résultats dispatchMode=DISABLED et effectDispatched=false. | **Aucun dispatch automatique d'effets par ce moteur.** Ne pas activer en changeant un simple drapeau. |
| VERIFIE | development/index.ts prépare des EffectPlans pour GW-24/25/27/31/33 et évalue les preuves GW-26/28/29/30/32 ; retourne authorizationInferred=false et mutationPerformed=false. | READY/SUCCESS ne sont ni autorisation, ni mutation, ni preuve de livraison. |
| VERIFIE | Contrôles RED : signature d'échec attendue, étapes/tests/codes de raison, profil CI et SHA exact ; GREEN : run terminé, success, absence d'étapes en échec, SHA exact. | Refuser les échecs de CI sans rapport et les validations sur SHA décalé. |
| VERIFIE | GW-29 bifurque vers GW-30 puis GW-31 si finding, ou saute directement à GW-32 sans finding ; le moteur générique attend une preuve pour départager les routes multiples. | Ne pas choisir une branche arbitrairement. |
| VERIFIE | github_create_branch et github_create_commit existent dans githubLifecycle.ts, enregistrés par registerGithubLifecycleWriteTools via registerScopedWriteTools et sous ENABLE_WRITE_TOOLS + contrôles de gouvernance. | Ne pas recréer d'outil GitHub ni court-circuiter les droits, HEAD attendu, branche et anti-force. |
| VERIFIE | buildMcpServer dans server.ts enregistre les outils réels de tâches, sessions, E2 et écritures conditionnelles. Aucune invocation directe de createShadowExecutionEngine, createGovernedContractSubstrate ou des planGw/observeGw de développement n'a été identifiée dans ce point d'entrée. | L'absence d'appel dans server.ts ne prouve pas l'absence d'autres consommateurs : graphe d'appels global restant à établir. |
| VERIFIE | MCP CI et mcpValidationProfile dans package.json existent ; run-validation-tests.mjs découvre les tests et les lance sous les contrôles configurés. | La CI exécute des tests ; elle ne fait pas évoluer spontanément les contrats GWC. |
| VERIFIE | Task Queue / Sessions / Bootstrap / Locks et adaptateurs GWC session/task existent ; PB-DISPATCH est marqué DONE pour matérialisation/reprise/projection de tâches. | PB-DISPATCH ≠ dispatch du développement GW-21..33 ; ne pas rouvrir ce travail par confusion ni créer de seconde queue. |
| A_TESTER | Aucune chaîne complète, automatiquement déclenchée, persistée et reprise GW-21 → GW-33 n'est attestée par les observations de cet audit. | Ne pas conclure qu'elle est impossible ; chercher aussi les consommateurs hors server.ts et les chemins déjà exploités par les agents. |
| BLOQUE (admission de la session observée uniquement) | Contexte gouverné lu pendant l'audit : mayMutate=false, reçu bootstrap expiré, preuves d'autorisation/callability insuffisantes. | Aucune écriture runtime implicite ; une nouvelle admission valide est nécessaire avant toute mutation relevant de cette session. |

### 5.2. Matrice des raccordements de la famille E — sans création de tâches

| Étape | Propriétaire / fonction existante | Raccordement et preuve encore à vérifier |
|---|---|---|
| GW-21 Authority Document Read | Documents d'autorité, lectures GitHub existantes (GWC-11) | Lecture effectivement exécutée, versionnée et associée au travail courant. |
| GW-22 Integration Slot Resolution | Contrat GWC-11 ; analyse d'intégration pratiquée | Résolveur/évaluateur réellement invoqué et preuve du slot choisi, sans duplication d'architecture. |
| GW-23 Exact GitHub Baseline | GitHub/Live State/observations disponibles (GWC-11) | Réconciliation du HEAD, de la branche et des droits juste avant mutation. |
| GW-24 Governed Branch Creation | planGw24BranchCreation + github_create_branch | Admission, appel réel de l'outil, réponse et vérification du nouveau HEAD. |
| GW-25 TDD Red Authoring | planGw25RedAuthoring + github_create_commit | Commit test RED exact-head, signature attendue avant soumission. |
| GW-26 TDD Red Observation | observeGw26TddRed + MCP CI | Collecte fiable du run exact, failedSteps, reasonCodes, noms de tests, identité du profil et SHA. |
| GW-27 TDD Green Minimal Implementation | planGw27GreenImplementation + github_create_commit | Preuve RED valide, autorisation, commit GREEN et réobservation du HEAD. |
| GW-28 Green CI | observeGw28GreenCi + MCP CI | Lecture du run sur le SHA GREEN et décision fondée sur la conclusion observée. |
| GW-29 Self Review | evaluateGw29SelfReview | Findings et auteur de revue explicites, justification du routage vers GW-30 ou GW-32. |
| GW-30 Regression Red If Finding | observeGw30RegressionRed | Défaut réel et échec RED ciblé, refus d'une signature étrangère. |
| GW-31 Regression Green | planGw31RegressionGreen + github_create_commit | Correctif, gate d'autorisation, nouveau SHA et revalidation. |
| GW-32 Full Regression | observeGw32FullRegression + profil MCP CI | Résultat complet sur le HEAD final, couverture réelle et non-régression. |
| GW-33 Non-terminal Documentation | planGw33Documentation + github_create_commit | Documentation seulement si requise ; checkpoint non terminal ; SHA exact et preuve de modification. |
| Sortie GW-33 → GW-34 | GWC-14, PR Draft, règles GitHub | Transmission des preuves exactes à la revue/fusion, sans marquer le travail DONE avant les gates aval. |

### 5.3. Travaux à qualifier et à exécuter après admission gouvernée — libellés descriptifs, aucun nouvel ID officiel

| Statut initial | Travail concret à inscrire | Critère de fermeture / preuve attendue |
|---|---|---|
| PROPOSE | **Cartographier le graphe d'appels effectif** : qui importe/invoque contractSubstrate, executionEngine, development/index.ts, adaptateurs session/task, GitHub lifecycle et consommateurs CI ; inclure scripts/tests, routes MCP, voie E1 et voie E2. | Matrice caller → fonction → autorité → effet → preuve → prochain état ; distinguer invocation runtime, test isolé, composant candidat et non-appel ; prouver les chemins négatifs. |
| PROPOSE | **Qualifier le propriétaire du raccordement**, à partir de GWC-2 et GWC-13 et des surfaces existantes, avec GWC-11/12 en amont et GWC-14 en aval ; analyser les dépendances, les work items/blueprints existants et les domaines de collision. | Décision REUSE → WRAP → GENERALIZE → EXTEND → NEW documentée, aucun nouveau dispatcher concurrent, aucun ID Work Queue créé par le présent registre. |
| PROPOSE | **Raccorder les préconditions GW-21..23** aux lectures d'autorité et à la baseline GitHub fraîche, sans contourner la réconciliation ni l'identification du travail. | Preuve de source/révision, SHA du HEAD, ownership et capacité vérifiés juste avant action ; STALE/UNKNOWN/BLOCKED conduisent à attente ou refus. |
| PROPOSE | **Raccorder les EffectPlans GW-24/25/27/31/33** aux outils GitHub déjà enregistrés, via une vraie admission et un contrôle post-mutation ; conserver le mode shadow initial pour la comparaison. | Test d'une mutation réellement autorisée, réponse native, HEAD réobservé, postcondition vérifiée, idempotence ou refus d'un rejeu dangereux ; aucun appel si non autorisé. |
| PROPOSE | **Créer ou réutiliser un collecteur de preuves CI**, capable de fournir au bon évaluateur GW-26/28/30/32 le runId, le workflow/job, le profil/digest, le SHA, les étapes et signaux d'échec ; utiliser les outils GitHub existants. | RED attendu distingué d'une panne d'infrastructure ; GREEN exact-head ; CI absente/pending/stale/mismatch bloquante ; aucune interprétation d'une simple absence d'erreur comme SUCCESS. |
| PROPOSE | **Raccorder GW-29 et la boucle de correction** : findings explicitement déclarés et traçables, sélection conditionnelle GW-30/31 ou SKIP vers GW-32, puis retour au contrôle exact-head. | Tests avec zéro finding, findings multiples, preuve RED non pertinente, nouveau SHA, réexécution et non-régression ; pas d'auto-revue présentée comme revue indépendante. |
| PROPOSE | **Raccorder les postconditions, transitions et points de reprise**, en réutilisant Operational Memory, Task Queue/Session/Lock quand applicables et les checkpoints GitHub-first pour E2 ; préserver les propriétaires des données. | Réentrée déterministe depuis preuves fraîches ; pas de second store de workflow autoritatif, pas de tâche E1 fictive en E2, pas de double claim/lock/commit ; récupération après interruption prouvée. |
| PROPOSE | **Étendre progressivement la parité shadow → exécution admissible** seulement après preuve d'absence de régression, avec frontière authorize/act explicite et rollback logique. | Comparaison décisions shadow / comportement réel, blocage sur UNKNOWN, autorisation effective et safeNow, anti-TOCTOU, journal des raisons, point d'arrêt activable sans toucher à Task Queue ou gouvernance existantes. |
| A_TESTER | **Parcours complet borné** : admission réelle, lecture d'autorité, branche, RED ciblé, GREEN, CI, auto-revue, finding/absence de finding, régression, documentation, sortie vers PR Draft puis revue/fusion selon autorisations. | IDs et SHA réels reliés aux preuves GitHub ; tests négatifs et reprise ; aucune déclaration de bout en bout si une étape n'a pas été exécutée/attestée ; ne pas exiger de déploiement S1 pour valider uniquement la phase E. |
| PROPOSE | **Non-régression et documentation de la clôture du raccordement** : validation typecheck/build/tests gouvernance/GWC/secrets/readonly/docs, gate CI exact-head, revue et checkpoint. | CI complète sur le HEAD livré, diff limité, compatibilité anciennes voies E1/E2, contrat de preuve et NEXT_ACTION maintenus ; clôture uniquement après intégration autorisée et observation réelle. |

### 5.4. Scénarios obligatoires pour qualifier le raccordement (non exécutés par cet audit)

| Statut initial | Scénario | Résultat attendu |
|---|---|---|
| A_TESTER | HEAD déplacé entre observation et mutation ; commit concurrent ; rejeu d'un effectId | Arrêt d'écriture/relecture ; aucune mutation forcée ou dupliquée. |
| A_TESTER | ENABLE_WRITE_TOOLS désactivé, permission absente, session/receipt périmé, conflit de lock/ownership | Refus explicite, aucune autorisation inférée. |
| A_TESTER | RED échoue pour une cause différente de la signature attendue | UNVERIFIED, pas de passage à GREEN. |
| A_TESTER | RED attendu et vérifiable sur run/HEAD exact | SUCCESS du contrôle RED, pas de mutation implicite. |
| A_TESTER | GREEN réussie sur mauvais SHA, mauvais job/profil, run non terminé ou preuve absente | CONFLICT/UNVERIFIED/WAIT selon contrat ; pas de progression. |
| A_TESTER | Auto-revue sans finding ; auto-revue avec finding réel | Route SKIP vers GW-32 ou RED/GREEN de régression GW-30/31, sur preuve. |
| A_TESTER | Incident au milieu du plan, après l'appel de l'outil ou avant postcondition ; reprise nouvelle conversation | Réobservation propriétaire ; état de la mutation connu avant rejeu ; récupération sûre. |
| A_TESTER | Couverture de tests insuffisante, régression sécurité/OAuth, docs ou secret scan rouge | Blocage de validation ; aucune déclaration de phase E complète. |
| A_TESTER | Travail GitHub-only E2 sans Task Queue E1 ; travail E1 avec vraie tâche/claim | Autorités propres à chaque entrée respectées ; cycle technique commun sans fausse attribution. |
| A_TESTER | Fin de GW-33 et transmission à GW-34, revue ou CI retardée/échouée | Checkpoint non terminal ; aucune fusion/déploiement/clôture affirmée sans preuves séparées. |

### 5.5. Frontières, dépendances et interdictions de régression

1. **Conserver GWC-2/GWC-13 comme propriétaires de conception existants.** GWC-2 décrit une montée progressive depuis le moteur shadow ; GWC-13 couvre précisément GW-24..33 ; GW-21..23 relèvent de GWC-11. Les statuts anciens BLUEPRINT_ONLY, DONE ou DETAILED_DESIGN_COMPLETE ne sont pas des preuves d'exécution automatique.
2. **Ne pas confondre PB-DISPATCH avec le dispatch de développement.** PB-DISPATCH est DONE pour matérialisation/reprise/projection de tâches existantes ; cela n'atteste pas la chaîne de mutation et de postconditions des étapes GWC.
3. **Aucune nouvelle autorité concurrente.** Réutiliser GitHub/CI, Task Queue/Session/Lock/Live State, Governance Decision, permissions GitHub et outils existants ; ne créer ni seconde file, ni moteur parallèle de tâches, ni registre de claims, ni transfert de propriété implicite.
4. **Aucun effet sans admission actuelle.** Le retour READY d'un plan ou ROUTE du shadow engine ne donne aucun droit GitHub, S1 ou runtime ; vérification par l'outil propriétaire à l'instant de la mutation ; échec fermé sur UNKNOWN et preuve périmée.
5. **Aucun raccourci de livraison.** La sortie du développement mène à une PR et ses gates propres ; MCP CI, revue, fusion protégée, MCP Governed Deploy et attestation S1 restent distincts. Une CI GREEN n'est ni merge, ni déploiement, ni clôture.
6. **Étude préalable à toute écriture supplémentaire** : confronter le graphe d'appels et l'état actuel au registre/backlog existant ; qualifier les écarts avant de choisir les modifications ; exécuter TDD RED/GREEN et tests avant revue ; ne pas produire de nouvelle PR pour cette seule inscription au registre.
7. **Aucune opération réalisée dans le présent ajout sauf la documentation du constat.** Aucun test de mutation/GWC E2E, aucune nouvelle session, Task, lock, autorisation ou attestation n'a été créé par cet audit. Le présent registre n'autorise pas leur exécution.
