# Lecture intégrale et traçabilité — source « Loop Engineering.docx »

> **Entité racine** : mission `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; dépôt `Patricked-code/MCP`.
> **Source de l'utilisateur** : `Loop Engineering.docx` (document importé dans la conversation le 21/11/2026).
> **SHA-256 exact du fichier source binaire** : `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`.
> **Étendue lue** : 39 pages du rendu utilisateur, **637 paragraphes Word, 12 tableaux Word**. Extraction ordonnée complète des blocs, y compris les 12 tableaux ; deux paragraphes comprenant du CSS de diagrammes issus de copie web ont été interprétés par leurs libellés de nœuds, sans traiter le CSS décoratif comme une exigence.
> **Provenance et portée** : le document rassemble **deux réponses/conceptions d'une autre conversation**, dont un mandat de chantier *proposé*. C'est une source d'**intentions, analyses et propositions**, NON une preuve d'implémentation ou de droits. Son texte n'est pas recopié publiquement mot à mot sur GitHub ; la source intégrale reste le DOCX original identifié par l'empreinte ci-dessus. Une future conservation binaire dans un stockage privé est distincte de cette PR documentaire publique.
> **Statut** : SOURCE_REVIEWED / CROSSWALK_DRAFT / NO_RUNTIME_AUTHORITY. Ce document conserve la provenance et les écarts ; il ne crée ni runtime Task, ni agent, ni droit de fusion.

## 1. Découpage fidèle du document lu, sans conflation de ses deux parties

| Bloc source (index de blocs Word) | Partie / contenu réel | Conséquence pour la mission |
| --- | --- | --- |
| P0000–P0050 | Partie A : méthode historique Loop, 10 phases, positionnement d'une intention à la bonne étape plutôt qu'en fin de backlog | Ne pas créer un lot nouveau si l'intention complète une tâche ou un chantier existant ; garder la relation à la chronologie d'origine |
| P0051–P0081 | Deux classes d'Insights : **télémétrie GitHub** et **insights sémantiques** issus des documents/code ; exemple CUG et analyse d'impact | Les informations techniques nourrissent un raisonnement sourcé, elles ne décident pas de tâches |
| P0082–P0122 | Audit Github Security/Insights (Dependency graph, Dependabot, CodeQL, actions, rulesets, traffic, CUG permissions), expansion par dépôts P0–P3 | Observer activation et droits réels ; un fichier absent n'atteste pas qu'un service GitHub soit désactivé |
| P0123–P0156 | Flux CUG→provenance→GitRegistry→Loop→Queue→UAES ; contrat d'observation 10 champs ; classification DUPLICATE/COMPLEMENT/DECISION/FINDING/TASK/CONTRADICTION/MEMORY/OUT_OF_SCOPE | Raccorder le pipeline d'ingestion sémantique GWC existant et la projection des registres ; aucun signal n'octroie WRITE |
| P0157–P0175 | Matrice composantes MCP déjà documentées, séparation graphe d'architecture et graphe du programme ; sélection FIRST_COLLISION_FREE_IN_PROGRAM_ORDER | Créer deux types de graphe reliés mais distincts, puis vérifier la Task Queue réelle |
| P0176–P0212 | Exemple d'intention CUG du début à la clôture ; répartition déterministe vs IA ; worker événementiel, non IA invoquée en boucle | ChatGPT devient un canal facultatif ; hôte agent appelé seulement pour raisonnement et code |
| P0213–P0260 | Ordre de déploiement en dix opérations, priorités P0–P3, surveillance des automations ChatGPT, quatre matrices de convergence exigées | Conserver le plan RG existant et ajouter explicitement les matrices qui manquent, sans suspendre les PR |
| P0261–P0287 | Partie B : infrastructure permanente, moteur d'ingénierie, chaîne de livraison ; **15 opérations** et deux branches de retour après blocage | Une tâche bloquée n'arrête pas toute l'usine ; elle n'autorise pas non plus le transfert d'ownership |
| P0288–P0330 | Admission d'intentions comme données durables ; conception avant code ; task dossier ; priorité de réutilisation et quatre preuves distinctes fusion/CI/deploy/runtime | Matérialiser un dossier de changement avant transfert à un codeur ; clôture après attestation et checkpoint |
| P0331–P0360 | Hébergement S1/MCP + **UAES isolé**, processus durable avec son propre état/restart, jamais codeur arbitraire dans le conteneur MCP | Provisionner/stager UAES après audit ressources/backup ; aucun accès Docker socket/root implicite |
| P0361–P0382 | Admission fédérée des intentions, refus des instructions implicites depuis webhook/commentaire, **11 familles documentaires** par chantier | Constituer une mémoire hiérarchique par entité, mais ne pas dupliquer les autorités P2/Sessions/Locks |
| P0383–P0415 | Ports C26 hôte durable, session liée au transport, bootstrap, claim, 403/permissions, autonomie graduée et dangers des runners auto-hébergés non isolés | Réutiliser C26/C27/UAC ; contrôler les droits et le pilote sans runners non fiables sur S1 |
| P0416–P0473 | P0–P8 de provisionnement, orchestration, boucle Loop, autonomie, C27 ; cockpit états IDLE/RUNNING/WAITING_CI/WAITING_REVIEW/BLOCKED/RECOVERING/FAILED/COMPLETED | Prouver la santé applicative et la supervision externe, pas seulement le healthcheck conteneur |
| P0474–P0647 | **Mandat de réalisation proposé**, ID `WT-MCP-AUTONOMY-24X7-20261121-01` déclaré **NON créé**, objectifs, 15 étapes, normes de non-régression, gates et 15 critères de cycle réel | Rattacher cet identifiant à un sous-chantier de la mission racine, après anti-collision ; ne jamais déclarer le mandat déjà exécuté |

Le document n'est **ni** le `Loop Engineering Instructions.docx` fondateur de juillet 2026 **ni** une autorité de déploiement. Il cite les documents historiques `LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md`, `...PLAYBOOK_COMPLET...`, `MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md` et `LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md` comme **références à rapprocher** : leur contenu doit être vérifié indépendamment avant de prétendre à une correspondance intégrale de la méthode.

## 2. Les dix phases historiques : correspondance aux autorités existantes

| Phase historique | Sortie exigée par le document | Élément MCP existant observé / preuve | Écart de réalisation |
| --- | --- | --- | --- |
| 1. Initialisation | Identité projet, serveurs, outils, mandat | `AGENTS.md` (INTAKE) ; GitHub + MCP `ping/reconcile/inventory` | Raccorder l'INTAKE à un hôte machine durable, sans usurper l'identité d'un client |
| 2. Compréhension | GPT/AGENTS, source of truth, SUIVI, mémoire et checkpoint | `AGENTS.md`, `SUIVI.md`, dossiers GWC/Operational Memory | Lecture hiérarchique multi-dépôts et contrats de couverture non encore attestés |
| 3. Inventaire | Code, modules, API, données, GitHub, serveur/runtime | Live State + GitRegistry + CUG ; PR #431 (projection), PR #436 (contrat Insights) | Cartographie source+runtime **au SHA exact** et trace des absences |
| 4. Risques | Dépendances, ownership, PR parallèles, déviations et non-régression | UAC Sessions/Locks/P2 ; revue CI | Graphe d'impact technique relié au graphe programme |
| 5. Plan | Architecture/roadmap/TODO/TASKS ordonnancés | Program Backlog V2, `MCP_AGENT_RULES.md` ; sélection FIRST_COLLISION_FREE_IN_PROGRAM_ORDER | Classement sémantique et insertion dans lot existant à automatiser |
| 6. Exécution | Code additif sur branche autorisée, périmètre borné | C26 `scripts/mcp-autonomous-agent-continuation.mjs` (contrat, pas host attesté) | UAES U02 et durable agent host, permissions/sandbox à construire |
| 7. Tests | RED/GREEN, contrat/CI, non-régression | `.github/workflows/mcp-ci.yml`, tests existants | Test e2e réel d'un cycle agent à attester |
| 8. Documentation | Décisions, mémoire, preuves, progression et backlog | `SUIVI.md`, `DECISIONS_LOG.md`, plan mission, Operational Memory | Index de preuves par projet/chantier, mise à jour contrôlée |
| 9. Validation | Revue indépendante, checks, main, OIDC, S1, runtime | `.github/workflows/mcp-deploy.yml`, Live State, G1 | Réconcilier doc drift et résoudre permission E2 ; ne pas confondre PR/CI/deploy/runtime |
| 10. Reprise | Checkpoint, calcul prochaine tâche admissible | P2, UAC, Program Backlog `program:next`, C27 (certificateur) | Runtime autonome et reprise après crash **non certifiés** |

**Vocabulaire de preuve :** `EXISTING_VERIFIED` = constat vérifié à la source pour une capacité bornée ; `EXISTING_PARTIAL` = briques présentes mais intégration incomplète ; `INTEGRATION_REQUIRED` = connecteurs à ajouter ; `NOT_IMPLEMENTED` = source attestant l'absence ; `UNVERIFIED` = données insuffisantes ; `BLOCKED` = gate identifié. Une CI verte seule ne change pas un composant en `DEPLOYED`.

## 3. Les 15 opérations de la seconde partie : rattachement concret au programme

| Opération source | Artefact/document/autorité à utiliser | Travail de mission correspondant |
| --- | --- | --- |
| 01 Réception intentions | API/Issue/Interface authentifiée + provenance CUG | RG-013–017, RG-043–044 |
| 02 Identification projet/chantier | GitRegistry + ProjectReality + IDs d'origine | RG-008–012, RG-021–023 |
| 03 Lecture mémoire/gouvernance | Source of truth, instructions, continuités | RG-023, RG-040–042, RG-054 |
| 04 Observation GitHub/serveur | CUG receipts, GitHub Insights, Live State | RG-001–007, RG-036–039 |
| 05 Cartographie/écarts | Composants/relations/risques sourcés | RG-040–042 |
| 06 Architecture/conception | Fiche d'impact et contrats à préserver | RG-040–042 |
| 07 Roadmap/TODO/TASKS | Registres **propres** à chaque chantier | RG-019, RG-023, RG-042, RG-054 |
| 08 Mandat/dépendances/locks | P2/TargetScope, session/locks/owner, Program Backlog | RG-016–020, RG-043–045 |
| 09 Attribution agent | C26 et hôte attesté, provenance d'admission | RG-043, RG-047–048 |
| 10 Code additif/tests RED-GREEN | Branche isolée, script tests, politique écriture | RG-030, RG-042, RG-047, RG-049 |
| 11 Revue/sécurité/CI | Checks exact-HEAD, reviewer indépendant | RG-031–032, RG-049–050 |
| 12 Fusion sur main | Rulesets/permissions effectifs | RG-033, RG-050 |
| 13 Governed Deploy | OIDC→S1 Docker Compose existant | RG-033, RG-051 |
| 14 SHA/runtime/G1 | Live State + S1 origin + santé + doc | RG-034, RG-051 |
| 15 Documentation/checkpoint | Operational Memory, checkpoint, C27 | RG-035, RG-054–056 |

**Condition anti-dispersion :** ces opérations **ne deviennent pas 15 nouvelles files ni 15 nouvelles missions**. Le graphe programme et les IDs RG existants restent la structure de planification. Toute intention supplémentaire est rapprochée de son lot ancien avant création d'une nouvelle unité.

## 4. Les deux graphes — relation obligatoire, confusion interdite

**A. Graphe d'architecture** : dépôt@SHA → module → export/import → API → données/stockage → frontend → CI/infrastructure ; liens `DEPENDS_ON`, `CALLS`, `PRODUCES`, `READS`, `RUNS_ON`, statut sourcé et scope propriétaire. GitHub SBOM n'est que le graphe de packages, pas les flux fonctionnels ou les autorités métier.

**B. Graphe du programme** : projet → sous-projet → chantier → intention → décision → blueprint → lot → Task → session/PR → CI/deploy → checkpoint ; liens `PREREQUISITE`, `BLOCKS`, `OWNED_BY`, `SUPERSEDED_BY`, `RELATES_TO_COMPONENT`.

**Jointure contrôlée** : `taskId ↔ componentRef@SHA`, provenance GitRegistry et analyse d'impact ; des dépendances de code ne créent pas automatiquement une dépendance de tâches. Le changement de nom d'un dépôt conserve son GitHub numeric ID et ses anciens alias. Si l'observation manque, la jointure demeure `UNVERIFIED/CONFLICT`.

## 5. Qualification des observations avant tout mandat

| Catégorie source | Règle et conséquence proposée |
| --- | --- |
| DUPLICATE | Rejeu idempotent, ne duplique ni intention ni Task |
| COMPLEMENT | Enrichit le lot/chantier d'origine ; rattachement chronologique append-only |
| DECISION | Rattache une décision proposée à son autorité documentaire et à sa validation |
| FINDING | Fait/risque observé ; preuve et impact, pas de WRITE implicite |
| TASK | **Candidat** de planification ; admission par P2 uniquement après mandat/session/scope |
| CONTRADICTION | Bloquer promotion et conserver les affirmations incompatibles et leurs preuves |
| MEMORY | Élément de contexte historisé, non un état courant sans observation nouvelle |
| OUT_OF_SCOPE | Conserver le signal et la raison de refus, ne pas créer de tâche hors mandat |

Le source contract propose `repository_id`, `installation_id`, `source_type`, `observed_at`, `head_sha`, `source_url`, `coverage_status`, `project_id/chantier_id`, `finding_type`, `authority_status`. **Ce schéma est cible, pas une preuve que la base actuelle possède ces colonnes.**

## 6. Familles documentaires et obligation de source de vérité

Le texte exige **onze familles** : GPT/AGENTS, SOURCE_OF_TRUTH, SUIVI, ROADMAP, TODO, TASKS, DECISIONS, ARCHITECTURE, CARTOGRAPHY, CONTINUITY, EVIDENCE_INDEX. Le nom réel suit la norme identifiant stable/type du projet ou du chantier et conserve les anciens chemins pour compatibilité. Chaque enfant doit lier parent, mandat, registre propriétaire, HEAD, journal de décisions, checkpoint et preuves ; une fiche enfant ne doit pas copier les états P2/Sessions/Locks ni les 200 pages de mémoire d'un parent.

**Écart par rapport à la mission avant ce document** : P10–P17 couvrent déjà l'usine en 21 opérations, mais cette source exige explicitement (i) les **deux graphes** et leur jointure, (ii) un **dossier de changement préalable au code**, (iii) un contrat complet d'observation, (iv) une typologie d'intake sémantique, (v) un plan de migration des cinq automatisations ChatGPT et (vi) un pilote de certification C27 sur preuves vivantes. Ces points doivent être ajoutés comme critères de test/acceptation aux lots RG existants, **pas recréés en parallèle**.

## 7. C26 / UAES / host : état des contrats confronté au code

- `scripts/mcp-autonomous-agent-continuation.mjs` vérifié sur GitHub : ports requis `readOwnP2State`, `lookupExistingAgentRun`, `startOrResumeExistingAgent`, `readBoundAgentSession`, `admitExistingP2`, `atomicIdempotentHost=true`. Il vérifie la session liée au transport, le bootstrap receipt, l'ownership et le SHA. **Un contrat disponible ne certifie pas qu'un vrai host y est branché.**
- `scripts/mcp-autonomy-e2e-certification.mjs` : certificat C27 indépendant conditionné à de vrais lecteurs GitHub/agent/session/task/checks/deploy/live/checkpoint ; les fixtures n'attestent jamais un cycle en production.
- `chainsolutions-wealthtech/universal-agent-engineering-system/state/CURRENT_STATE.json` relu : `runtime_operational:false`, U02 `U00_U01_PROVIDER_VERIFIED_U02_PENDING`, gates d'isolement, backup/restore, App permissions, token broker et coding non certifiés. C'est un **état documentaire daté**, à revérifier par des preuves runtime avant mutation de S1.
- `chainsolutions-wealthtech/Loop/README.md` relu : initialisation documentaire sans moteur installé, pas une preuve que toutes les phases Loop sont exécutables.
- `Patricked-code/MCP/MCP_AGENT_RULES.md` : `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` et commandes `program:readiness/next` existent au **niveau plan**, sans claim P2.
- `src/governance/e2EntryJournal.ts` : commentaires de l'issue #359 via credential serveur ; refus HTTP 403 lors de l'activation E2 précédemment documenté. La connexion GitHub directe ChatGPT ne résout pas ces droits serveur.

**Contrôle d'autonomie** : ne pas effacer les STOP / 403 existants. L'usine peut observer et planifier un autre lot indépendant mais une revue refusée, un credential manquant ou un owner inconnu interdit les mutations concernées.

## 8. Quatre preuves distinctes de livraison — dette de déploiement observable

| Fait | Autorité/outil | Ce que le fait permet d'affirmer |
| --- | --- | --- |
| Commit sur branche de PR | GitHub PR HEAD | Code proposé et versionné **chez GitHub seulement** |
| Fusion sur `main` | GitHub merge exact SHA | Code intégré dans la branche de référence |
| Governed Deploy | Workflow OIDC/run, SHA, résultat | Opération de déploiement exécutée avec résultat observé |
| Runtime et documentation | S1 HEAD/origin + OCI revision/health + G1 | Code réellement en service et documentation alignée **uniquement si FULLY_ALIGNED** |

**Observation GitHub/MCP de cette lecture (revalider à la reprise)** : `main` = S1 HEAD = origin/main = runtime `51a4fd1e3841d586f335669198dccd342497bfc1`, conteneur `healthy`, mais G1 `RECONCILIATION_REQUIRED/DOCUMENTATION_DRIFT` parce que `PRODUCTION_STATE.json` déclare encore `5bc5e2b4...`. La PR #434 de correction est **ouverte, CI verte mais non fusionnée** à cette observation. Donc `main/S1/runtime aligned` n'est pas `FULLY_ALIGNED`.

| PR du même chantier | État vérifié à cette lecture | Déployé S1 ? |
| --- | --- | --- |
| #430 — documents de mission, P01–P17 | ouverte, Draft, CI HEAD `22841bc...` SUCCESS | **Non** (branche seule) |
| #431 — projection fédérée | fusionnée `main@51a4fd1...`, Docker healthy sur SHA | **Oui pour ce lot**, documentation G1 non réconciliée |
| #432 — cockpit V1/V2 | ouverte, CI HEAD `43252967...` SUCCESS, revue non clôturée | **Non** |
| #434 — correctif G1 | ouverte, CI HEAD `7ba203e...` SUCCESS, pas de revue attestée | **Non** |
| #435 — CUG event intent candidates | ouverte, CI HEAD `024c7a50...` SUCCESS | **Non** |
| #436 — Insights read-only contract | ouverte, CI HEAD `5b85f0cc...` SUCCESS | **Non** |

Le document source **ne prouve aucun runtime worker autonome 24/7 installé**, et l'audit actuel non plus. Une automatisation ChatGPT horaire ne signifie pas un daemon. Cet écart demeure `INTEGRATION_REQUIRED / U02_BLOCKED` jusqu'à preuve d'un host isolé réel.

## 9. Décision sur le sous-chantier proposé dans la partie B

L'identifiant `WT-MCP-AUTONOMY-24X7-20261121-01` figure explicitement dans le DOCX comme **« proposé, non créé »**. Une recherche GitHub sous ce littéral n'a pas trouvé de fichier correspondant dans `Patricked-code/MCP` à cette observation ; cela ne prouve pas l'absence dans tous les registres runtime. **Positionnement choisi : un sous-chantier documentaire enfant**, rattaché par `parentMissionId=WT-MCP-REGISTRY-RESOLUTION-20261121-01`, qui pilote RG-043…RG-056 et référence RG-036…RG-042. Ce n'est **ni une nouvelle mission indépendante, ni un ProjectRecord runtime, ni une nouvelle queue**.

Ce sous-chantier doit servir au diagnostic d'UAES U02 / hôte agent durable / reprise C26 / certification C27, pas dupliquer le cockpit ou la fédération CUG. Les livrables, dépendances et STOP sont rattachés à la mission mère, l'autorité d'implémentation UAES restant dans son propre dépôt ; aucune mutation de ce dépôt par cette PR MCP.

## 10. Conditions strictes de clôture de cette source

La lecture et la transcription des exigences ne suffisent pas. La convergence ne pourra être attestée qu'après :
1. Source et historique liés à la mission, avec digest, origine, clauses de décision et preuves.
2. Rattachement de chaque différence **utile** du DOCX à RG-001…RG-056 (absence de ticket/lot duplicatif).
3. Matrices explicites historique→MCP, GitHub Insights→CUG/GitRegistry, C26→UAES/host, scénarios C27.
4. Zéro modification des autorités ou autres dépôts sans scope attesté ; PR doc-only contrôlée.
5. Contrat de passage `INTENTION→IMPACT→PLAN→ADMISSION→CODE→CI→REVIEW→MERGE→DEPLOY→ATTEST→REPRISE` testé sur un pilote réel avec replays, panne et permissions négatives.
6. Endurance/santé attestées du daemon et absence de perte/double claim. Après cela seulement, possibilité de déclarer `24X7_OPERATIONAL` et `MISSION_DONE`.

**NEXT_ACTION SOURCE** : intégrer cette grille à la roadmap parent et à la sous-continuité ; vérifier CI/doc inventory exact HEAD ; ne pas entreprendre de mutation S1 à partir de ce texte. La PR #434 et le 403 de journal E2 restent des correctifs gouvernés distincts de la lecture du DOCX.
