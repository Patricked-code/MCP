# GWC — Governed Workflow Contract : dossier permanent

## Objet

Ce répertoire est la source versionnée unique de l'architecture des 73 contrats GWC et des
blueprints d'implémentation qui en découlent. Il est conçu pour être lu par un humain **et**
par n'importe quel agent, et pour être complété au fil des révisions sans perdre l'historique
ni exposer une conclusion périmée comme si elle était courante.

L'autorité de départ reste `docs/superpowers/specs/2026-09-15-governed-workflow-contract-v1-design.md`.
Ce dossier ne la remplace pas : il la prolonge par une conception canonique confrontée à l'état
GitHub live.

## État

| Champ | Valeur |
| --- | --- |
| Révision courante | `R4-CANDIDATE` |
| Baseline canonique | `GWC_73_CONTRACT_DESIGN_SHEETS_CANONICAL_R1` |
| Statut d'architecture | `GWC_ARCHITECTURE_GATE_PASS` — construction de la candidate évoluée autorisée sur la branche Claude |
| `SOURCE` | `GITHUB_LIVE` |
| `REPOSITORY` | `Patricked-code/MCP` |
| `REF` / `OBSERVED_SHA` | `main` / `d1f303955c4d368950da2307dda41d826fc85d0a` |
| `OBSERVED_AT` | `2026-09-16T23:23:04Z` |
| Implémentation candidate sur `claude/ecstatic-edison-v1dyt1` | `READY_TO_START` — code/tests/workflows autorisés et attendus |
| Tâches runtime créées | `0` |
| Blueprints promus en Task Queue | `NO` |
| Conception d'évolution détaillée | `GWC-0`…`GWC-17`, 18 sur 18 |
| Verdict de conception | `ARCHITECTURE_COMPLETE_CANDIDATE_BUILD_UNLOCKED` |
| Flux pré-code | `GWC-PRE-000` → `GWC-PRE-GATE-01` exécuté ; 14 phases `A1`…`A14` `PASS_WITH_EVIDENCE` |
| Verdict de gate | `GWC_ARCHITECTURE_GATE_PASS` |
| Réconciliation live Phase B | observation historique conservée pour provenance ; **pas la phase d'exécution courante** |
| Blocker courant | **aucun** — `AF-35` résolu à la source le 2026-09-17T20:27Z, réobservé le 2026-09-18T17:08Z |
| 18 blueprints | à construire progressivement dans la candidate de branche ; **pas** à matérialiser en Governed Tasks runtime |
| Tâches runtime créées | `0` — non nécessaires pour construire la candidate de branche |
| Travail courant | `GWC-PRE-B-01` — synthèse du backlog complet de construction candidate |
| Findings enregistrés | 36 — `AF-01`…`AF-36` ; `AF-28`, `AF-34` et `AF-36` corrigés, `AF-35` résolu à la source |

## Contenu

| Fichier | Rôle | Lecteur |
| --- | --- | --- |
| `docs/gwc/README.md` | porte d'entrée, protocole agent, procédure d'amendement | humain et agent |
| `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` | **corps canonique** — 73 Contract Design Sheets A→BA | humain |
| `docs/gwc/BLUEPRINTS.md` | 18 blueprints d'implémentation `GWC-0`…`GWC-17` | humain |
| `docs/gwc/REVISION_HISTORY.md` | historique R1 → R2 → R3 | humain |
| `docs/gwc/DEPRECATED_CLAIMS.md` | affirmations explicitement remplacées | humain et agent |
| `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md` | archive non canonique de R2 | traçabilité |
| `.mcp/gwc-contracts.json` | projection machine des 73 contrats | agent |
| `.mcp/gwc-workflow-graph.json` | graphe d'exécution canonique | agent |
| `.mcp/gwc-blueprints.json` | registre machine des 18 blueprints | agent |
| `.mcp/gwc-evolution-design.json` | projection machine de la conception d'évolution détaillée | agent |
| `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt` | flux pré-code `GWC-PRE-000` → `GWC-PRE-GATE-01` | humain et agent |
| `docs/gwc/PRECODE_EXECUTION_PLAN.txt` | plan d'exécution et 22 scénarios `E2E` | humain et agent |
| `docs/gwc/PRECODE_MULTI_AGENT_COORDINATION.md` | règles d'ownership temporaire par scope/session | humain et agent |
| `.mcp/gwc-precode-action-flow.json` | projection machine du flux pré-code | agent |
| `.mcp/gwc-precode-gate.json` | compteurs déclarés du gate, recoupés contre les preuves | agent |
| `.mcp/gwc-precode-status.json` | **état d'exécution par phase, preuves, Phase B et blocker courant** | agent |
| `docs/gwc/canonical-memory/pr95-ded/` | sources et bundle de mémoire de la mission de conception | traçabilité |
| `docs/gwc/canonical-memory/pr95-precode-gate/` | checkpoint historique du gate d'architecture | traçabilité |
| `docs/gwc/canonical-memory/pr95-phase-b-live-reconciliation/` | bundle de la réconciliation live et du blocker `AF-35` — immuable, supersédé | traçabilité |
| `docs/gwc/canonical-memory/pr95-phase-b-resolved/` | checkpoint historique de réconciliation live — provenance uniquement | traçabilité |
| `docs/gwc/canonical-memory/pr95-candidate-build-ready/` | **bundle courant** — candidate évoluée autorisée sur branche, intégration live gelée | humain et agent |
| `docs/gwc/canonical-memory/current.json` | pointeur de continuité — **vérifié** par `verifyCanonicalMemory()` depuis `AF-36` | humain et agent |
| `scripts/gwc-verify.mjs` | vérificateur déterministe | humain et agent |
| `scripts/gwc-precode-verify.mjs` | vérificateur du flux pré-code et du gate | humain et agent |

## Continuité automatique multi-agent et intake conversation

## Bootstrap PRECODE GitHub-first

L'entrée PRECODE de `claude/ecstatic-edison-v1dyt1` est désormais explicitement GitHub-first. Un agent se connecte au repository/branche, observe le HEAD exact, lit la mémoire canonique/status/checkpoint/handoff, puis résout ou crée une `candidateSessionId` branch-local sans ouvrir de Governed Session runtime.

`bootstrapCandidateConnection()` compose :
- identité candidate bornée à partir des IDs réellement observés ;
- `providerConversationRef=null/UNAVAILABLE` lorsqu'aucun véritable ID ChatGPT/Claude n'est fourni ;
- routage `NEW_INFORMATION_INTAKE / CONTINUE_PRECODE_WORK / NEW_INFORMATION_THEN_CONTINUE_PRECODE` ;
- `ASK_USER` uniquement lorsque l'intention n'est pas déductible ;
- dispatch candidate existant pour les modes de continuation.

Compatibilité : les anciennes sessions candidate sans `connectionInstanceRef` restent valides et sont enrichies au prochain resume.

Preuves : RED CI #1061 ; compatibilité CI #1062 ; GREEN CI #1063. Aucun MCP runtime, Task Queue runtime, lock runtime, S1 ou prod requis.



La branche candidate dispose désormais d'une fondation testée dans `src/governedContext/candidateContinuity.ts` :

- `dispatchCandidateWork()` reprend le claim candidat actif de la même session ou sélectionne le prochain work item READY compatible avec dépendances/collision domains ;
- la persistance du claim reste branch-local dans `.mcp/gwc-precode-status.json > candidateCoordination.activeClaims` et exige une relecture du HEAD exact ;
- `reconcileConversationIntake()` reçoit l'analyse structurée d'une conversation et classe les informations en `DUPLICATE / COMPLEMENT / DECISION / FINDING / TASK / CONTRADICTION / MEMORY` ;
- le transcript brut n'est pas persisté par ce mécanisme ;
- les enrichissements non conflictuels peuvent mettre à jour mémoire/backlog ; les contradictions sont retenues pour review ;
- aucune de ces capacités n'utilise la Task Queue runtime ni n'autorise main/S1/prod.

Preuves : RED CI #1046 ; GREEN CI #1048 SUCCESS.

## Frontière actuelle — construction de la candidate évoluée

La PR #95 et la branche `claude/ecstatic-edison-v1dyt1` sont la **surface de construction de la future version évoluée complète du MCP**.

Le mot PRECODE signifie ici **pré-intégration**, pas « documentation seulement ».

La séquence courante est :

```text
architecture exhaustive de l'existant
→ A1..A14
→ GWC_ARCHITECTURE_GATE_PASS
→ B backlog candidate
→ C safety/foundations candidate
→ D/E construction code GWC-0..GWC-17
→ F acceptance candidate
→ FINAL_PRECODE_VERSION_ACCEPTED
→ seulement ensuite intégration réelle
```

Après le gate d'architecture, sont **autorisés et attendus sur la branche Claude** :

- code `src/**` ;
- tests/fixtures ;
- wrappers, extensions, généralisations et nouvelles primitives justifiées ;
- types/interfaces/schémas backward-compatible ;
- migrations additives/lecteurs de compatibilité ;
- workflows/configuration en version candidate ;
- corrections de findings et prérequis de sûreté ;
- implémentation progressive GWC-0..GWC-17 ;
- documentation, vérificateurs, CI et preuves.

La règle existing-first reste absolue :

`REUSE → WRAP → GENERALIZE → EXTEND → NEW`.

Ce qui reste gelé jusqu'à `FINAL_PRECODE_VERSION_ACCEPTED` :

- création de Governed Tasks runtime pour piloter la candidate ;
- runtime claims/locks ;
- intégration/merge dans `main` ;
- écriture directe S1 ;
- déploiement ou restart production ;
- activation live de la candidate.

La candidate doit donc finir comme :

`MCP existant conservé + évolutions additives/backward-compatible + tests + workflows + migrations/compatibilité + documentation + backlog/preuves complets`.

À la fin, la phase d'intégration ne doit plus être une phase de développement : elle réobserve le projet réel, réconcilie le drift éventuel et intègre la candidate déjà construite.

## Sources de preuve PRECODE — sans dépendance OAuth/bridge

Le travail PRECODE ne doit pas dépendre d'une connexion OAuth au serveur MCP ni de `wealthtech_ssh_bridge`.

Ordre obligatoire des sources de preuve :

1. **Preuves versionnées existantes** — `docs/audits/**`, `docs/history/**`, bundles `docs/gwc/canonical-memory/**`. Elles servent à prouver l'architecture, l'historique, les états déjà attestés et les inventaires. Leur date/SHA/fraîcheur doivent rester explicites.
2. **GitHub live** — branche, commit, PR, checks, workflows et artefacts GitHub. C'est la source courante pour le dépôt et pour tout snapshot serveur déjà publié par CI.
3. **Miroir serveur read-only** — mécanisme futur, uniquement si une preuve serveur fraîche manque. Il doit être indépendant du MCP/OAuth : identité serveur dédiée en lecture seule ou forced-command, commandes d'audit allowlistées, sortie JSON redacted + digest, publication comme artefact GitHub. Aucune mutation, aucun commit serveur, aucun restart, aucun deploy, aucune Governed Session, aucun claim, aucun lock.

Exemples de preuves déjà disponibles :

- `docs/audits/2026-08-05/MCP_RUNTIME_IMAGE_ATTESTATION_READONLY.md`
- `docs/audits/2026-08-05/MCP_RUNTIME_RECOVERY_ATTESTATION.md`
- `docs/audits/2026-08-05/MCP_RUNTIME_TOOL_CATALOG_20260805.md`
- `docs/audits/2026-08-05/MCP_FOUNDATIONS_FINAL_STATE.md`
- `docs/audits/2026-08-05/MCP_PRE29_RECOVERY_AUDIT.md`
- `docs/gwc/canonical-memory/pr95-phase-b-resolved/sources/live-authorities.json`

Une preuve historique ne devient jamais automatiquement une preuve live. Si aucune preuve fraîche n'est disponible pour une question PRECODE réellement dépendante du runtime, la réponse est `UNKNOWN` / `STALE`, jamais une ouverture de session runtime par défaut.

## Frontière d'autorité — à ne pas confondre

La **Governed Task Queue** existe et fournit `initializeSeed`, `firstExecutable`, le claim, le
cycle de vie des Tasks, les priorités, les dépendances, l'ownership et les conflits de
ressources.

Elle **n'est pas** le **GWC Workflow Execution Engine**. Celui-ci reste à construire comme une
couche d'orchestration distincte qui *compose* les autorités existantes : `ContractRegistry`,
`WorkflowGraph`, `ExecutionFrame`, `EvidenceBroker`, `ContractEvaluator`,
`GovernanceGateComposer`, `EffectPlan`, `ActionDispatcher`, `PostconditionVerifier`,
`GraphRouter`, `ResumeResolver`, `WAIT_EXTERNAL`, replay et recovery, protection
anti-non-progression, continuation autonome.

Le moteur ne possède aucune autorité métier nouvelle : pas de seconde Task Queue, pas de second
Live State, pas de seconde Operational Memory, pas de magasin durable d'état de workflow en V1.
Blueprint porteur : `GWC-2`.

## Blueprint ≠ Task

`TASK BLUEPRINT ≠ GovernedTaskRecord`.

```text
architecture → blueprints → branch-local candidate work
             → GWC-0..GWC-17 built on claude/ecstatic-edison-v1dyt1
             → FINAL_PRECODE_VERSION_ACCEPTED
             → later real integration under then-current governance
```

Un blueprint peut produire un ou plusieurs **work items candidate** sur la branche sans créer de GovernedTaskRecord. La Task Queue runtime n'est pas le moteur de construction de la candidate. Lors de l'intégration réelle ultérieure, la gouvernance live décidera si des Governed Tasks sont nécessaires et à quelle granularité.

### Observation live historique — provenance uniquement

Une ancienne réconciliation live a été exécutée et réobservée. Elle est conservée comme **preuve historique de l'existant**, pas comme phase d'exécution courante. Son contenu est désormais projeté sous les blocs historiques de `.mcp/gwc-precode-status.json`.

État courant, observé :

- **aucune tâche GWC n'existe dans la file live** — 0 des 18 blueprints a un `GovernedTaskRecord`,
  donc ni `CONTINUATION` ni `DUPLICATE` ne s'appliquent ;
- **le `CONFLICT` sur `TASK-20260915-001` est résolu à la source.** L'agent propriétaire a acquitté
  le `stateVersion 246`, porté sa tâche à `DONE` avec blockers vides, puis fermé sa session
  `499b2ea3`. `AF-35` est résolu ;
- **aucune tâche non terminale** — file `storeRevision 190`, 15 tâches, 12 `DONE` + 3 `SUPERSEDED` —
  et **zéro session `ACTIVE`**. Le motif `BLOCKED` est donc levé ;
- **`GWC-0` à `GWC-17` sont classés `NEW_TASK`** — seule classification autorisant la création d'un
  `GovernedTaskRecord` ;
- **`RUNTIME_TASKS_CREATED = 0`.** `NEW_TASK` rend la matérialisation *admissible*, pas
  *automatique*.

Un agent qui reprend la **construction candidate** ne relance pas cette ancienne classification et ne matérialise aucune Task runtime. Il lit cet historique seulement pour comprendre l'existant, puis reprend le premier work item candidate incomplet depuis la mémoire canonique. La réobservation live de Task Queue/sessions/locks redevient pertinente seulement lors de l'intégration réelle postérieure au gate final.

## Protocole obligatoire pour tout agent

1. **Lire avant d'agir.** `CLAUDE.md`, `SUIVI.md`, puis ce `README.md`, puis
   `.mcp/gwc-contracts.json` pour l'état d'un contrat précis.
2. **GitHub live est la source de vérité.** L'ordre de travail est :
   `GitHub live → observer le ref → obtenir le SHA exact → lire le fichier sur CE ref → observer branches, PR, commits, checks, workflows, rulesets → analyser → conclure`.
   Jamais `clone → lecture → supposition que GitHub est identique`. Un clone local ne sert que
   de cache de lecture, après preuve d'égalité des SHA, et n'est jamais une source de
   certification.
3. **Étiqueter chaque affirmation dépendante de l'état** : `GITHUB_LIVE` ou `LOCAL_CLONE`, avec
   `REPOSITORY`, `REF`, `SHA`, `OBSERVED_AT`. En cas de divergence, GitHub live prévaut et le
   drift est signalé, jamais masqué.
4. **Ne jamais transformer une hypothèse en certitude.** Une donnée live inaccessible n'est
   jamais compensée par le clone : elle s'écrit `À VÉRIFIER`.
5. **Ne jamais renuméroter, supprimer ou fusionner un identifiant `GW-xx`.** Les 73
   identifiants sont un espace de noms stable, jamais une séquence d'exécution. Le graphe
   canonique comporte des arêtes à rebours et des sauts déclarés ; aucune règle `to > from`
   ne doit exister.
6. **Ne jamais créer une seconde autorité.** Pas de second Live State, de seconde Task Queue,
   de second moteur de session, de second gestionnaire de locks, de second GitRegistry, de
   second GitHub Control Plane, de second moteur de déploiement, de magasin durable d'état de
   workflow.
7. **Pendant le candidate build**, transformer les blueprints en work items de branche, jamais en Governed Tasks runtime. La Task Queue live ne redevient pertinente qu'après `FINAL_PRECODE_VERSION_ACCEPTED`, pendant l'intégration réelle.
8. **Ne jamais créer de human gate générique.** La conception conceptuelle est validée. Les
   seules interruptions légitimes viennent d'autorités réelles : permission réellement requise,
   capacité absente, ambiguïté, conflit, évidence périmée, lock, politique explicite.
9. **Vérifier un fragment avant de le croire.** Si un extrait provient de
   `docs/gwc/archive/` ou correspond à une entrée de `DEPRECATED_CLAIMS.md`, il est historique.
10. **Après toute modification de ce dossier**, exécuter `node scripts/gwc-verify.mjs` et
    documenter dans `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md`.

## Comment amender

Le corps canonique ne contient que l'architecture retenue courante. Les révisions ne
s'empilent pas dedans.

1. Travailler sur une branche dédiée ; jamais de push direct sur `main`.
2. Modifier `ARCHITECTURE_73_CONTRACTS.md` pour qu'il reflète **uniquement** l'état retenu.
3. Déplacer toute affirmation remplacée vers `DEPRECATED_CLAIMS.md`, avec son remplacement.
4. Consigner la révision dans `REVISION_HISTORY.md`.
5. Archiver un corps entièrement remplacé sous `docs/gwc/archive/`, avec sa bannière non
   canonique.
6. Répercuter dans `.mcp/gwc-contracts.json`, `.mcp/gwc-workflow-graph.json` et
   `.mcp/gwc-blueprints.json`.
7. Recalculer les empreintes : `node scripts/gwc-verify.mjs --write`, puis vérifier :
   `node scripts/gwc-verify.mjs`.
8. Mettre à jour `docs/governance/markdown-inventory.json` si un Markdown est ajouté ou retiré.
9. Ouvrir ou mettre à jour une pull request draft.

## Empreintes et intégrité

Les trois artefacts `.mcp/gwc-*.json` portent un `registryDigest` calculé avec la même
sérialisation canonique que `src/operationalMemory/taskQueue.ts`, afin qu'une empreinte
calculée hors runtime soit identique à celle calculée par le runtime.

`scripts/gwc-verify.mjs` contrôle :

- **Contrats** — 73 identifiants exacts et uniques, familles valides, versions, sémantiques
  d'exécution connues, références canoniques et de blueprint réciproques, empreintes.
- **Graphe** — toutes les arêtes pointent sur des contrats existants, pas de doublon, pas de
  boucle sur soi non déclarée, `declaredBy` présent sur chaque arête, aucune règle `to > from`
  et au moins une arête à rebours pour le prouver.
- **Atteignabilité** — tout contrat du graphe runtime est atteignable depuis `entry`, aucun
  contrat runtime hors entrée n'est sans arête entrante, aucun contrat runtime non terminal
  n'est sans arête sortante, et le terminal déclaré est bien le seul sans successeur.
- **Hors graphe runtime** — tout contrat exclu l'est explicitement dans `outOfRuntimeGraph`,
  avec motif et ancres, et aucune arête ne le touche.
- **Projection** — `graphProjection.incoming` et `graphProjection.outgoing` de chaque contrat
  sont exactement les arêtes du WorkflowGraph ; l'ancien champ ambigu `graph` est refusé.
- **Blueprints** — 18 identifiants `GWC-0`…`GWC-17` sans duplication ni dépendance inconnue,
  chaque contrat couvert par exactement un blueprint, propriété architecturale des findings,
  aucune portée globale sans `globalScopeJustification`.
- **Non-promotion** — aucun blueprint présent dans `.mcp/task-registry.json`.
- **Conception d'évolution détaillée** — 18 fiches, une par blueprint, sans doublon ni manquant ;
  chaque contrat porté par exactement une fiche et réciproque avec `contractRefs` ; aucune
  classification d'intégration inconnue ; aucun `NEW` sans primitive déclarée et justifiée ;
  aucune primitive nouvelle déclarée par deux blueprints ; les 33 findings rattachés à un
  propriétaire connu et réciproque ; `AF-19`, `AF-22` et `AF-30` chez leur propriétaire attendu ;
  `OD-01` à `OD-12` toutes présentes avec propriétaire et état connus ; 13 registres transverses
  et 4 audits globaux déclarés ; verdict de conception dans l'ensemble autorisé ; aucune promotion
  et aucune tâche runtime.

Ce contrôle est exécuté par la CI au head exact, via l'étape `GWC dossier check` du job
`validate` de `.github/workflows/mcp-ci.yml`.

## Frontière assumée

Le dossier `docs/gwc/` reste documentation/donnée et ne constitue pas une autorité runtime. En revanche, **la même branche Claude est autorisée à porter le code candidate réel** dans `src/**`, `tests/**`, workflows, scripts et configurations compatibles après le gate d'architecture. Cette construction ne crée aucune Task runtime, ne prend aucun lock runtime et ne déclenche aucun déploiement tant que `FINAL_PRECODE_VERSION_ACCEPTED` n'est pas atteint.
