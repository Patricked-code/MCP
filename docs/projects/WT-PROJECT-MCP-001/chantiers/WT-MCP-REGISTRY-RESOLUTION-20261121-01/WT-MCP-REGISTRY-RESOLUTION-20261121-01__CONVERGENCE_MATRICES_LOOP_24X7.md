# Matrices de convergence opérationnelle — Loop / Insights / C26-UAES / C27

> **Mission** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Source utilisateur** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`.
> **Méthode** : le fichier a été lu intégralement, puis comparé aux dépôts `Patricked-code/MCP`, `chainsolutions-wealthtech/universal-agent-engineering-system` et `chainsolutions-wealthtech/Loop` via GitHub ; observation Live State MCP. Les états ci-dessous sont **scopés et datés**, jamais des droits à vie.
> **Nature** : analyse de source/intégration; pas une autorité de Task, d'identity, de permissions ou de release. Toute donnée soumise ultérieurement au worker doit être revalidée sur les versions exactes.

## M1 — Correspondance de la méthode Loop historique et des autorités existantes

| Exigence source exacte | Autorité ou contrat existant trouvé | Observation concrète | Statut | Travail additif / référence RG |
| --- | --- | --- | --- | --- |
| Réception structurée d'une intention autorisée, datée, identité/mandat | `AGENTS.md` intake, workflow `mcp-auto-intake-discovery`, CUG receipts | Workflow GitHub issue/comment crée reçu de découverte, PAS Task runtime | EXISTING_PARTIAL | RG-013–017, 043–044 : rapprochement à la mission/chantier et provenance |
| Qualifier une intention avant d'ouvrir un lot | `.mcp/gwc-precode-action-flow.json`, `src/governedContext/candidateContinuity.ts` | Classification historique, sans attestation d'un agent sémantique autonome 24/7 | INTEGRATION_REQUIRED | RG-040–042 : DUPLICATE/COMPLEMENT/DECISION/FINDING/TASK/CONTRADICTION/MEMORY/OUT_OF_SCOPE |
| Reprendre l'historique avant de concevoir | `AGENTS.md`, `CLAUDE.md`, `SUIVI.md`, `docs/governance/README.md`, dossier mission | Sources et instructions réellement présentes | EXISTING_PARTIAL | RG-040–042/054 : attestations de lecture exact SHA + hiérarchie parent/enfant |
| Constater l'état exact d'un projet GitHub et de son runtime | `mcp_reconcile_governed_context`, `mcp_get_current_state_inventory`, GitHub | Contrôle `main/S1/OCI` et G1 présents ; état de la mission au contrôle = doc drift | EXISTING_PARTIAL | RG-001–007, RG-034, 051 |
| Rechercher composants/code/contrats avant modification | Code et tests du dépôt ; GitRegistry/Project Reality ; SBOM futur | PR #431 projection code en production ; analyse d'architecture avant codeur non attestée comme moteur | INTEGRATION_REQUIRED | RG-040–042 |
| Deux graphes liés mais distincts | Documentation de concept d'architecture/projets, P2 Program Backlog | Aucun graphe architecture↔programme complet certifié par les sources examinées | UNVERIFIED / INTEGRATION_REQUIRED | RG-040–042 + projection de liens |
| Positionner le nouveau besoin dans un ancien chantier | `MCP_AGENT_RULES.md` et `Program Backlog V2` | `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` planning-only ; pas un classificateur de compléments prouvé end-to-end | INTEGRATION_REQUIRED | RG-042–045 |
| Construire architecture, roadmap, TODO/TASKS puis code | Documents d'entités + dossier RG | L'ordre est documenté, exécution intégrale en machine non attestée | EXISTING_PARTIAL | RG-023, 042, 054 |
| Admission/claim/lock et coordination | Governed Task Queue, Sessions, Lock Service, UAC/P2 | Autorités logicielles réellement présentes dans MCP ; aucune session agent host UAES opérationnelle attestée | EXISTING_VERIFIED (contrats), INTEGRATION_REQUIRED (raccordement) | RG-016–020, 043–045 |
| Code additif, tests RED/GREEN et PR | CI MCP, GitHub PR, tests Node/TypeScript | PR #431 a réussi tests/revue/merge/deploy ; pas un cycle autonome C26/C27 | EXISTING_PARTIAL | RG-030–033, 047–051, 055 |
| Revue indépendante et exact SHA | GitHub reviews/checks/rulesets | Plusieurs PR ont CI verte sans revue finale | EXISTING_PARTIAL | RG-032, 049–050 |
| Déploiement contrôlé | `.github/workflows/mcp-deploy.yml` | OIDC→S1 Compose ; runtime healthy sur main exact SHA | EXISTING_VERIFIED pour MCP, pas UAES | RG-033, 051 |
| G1 et documentation cohérente | Live State + `PRODUCTION_STATE.json` + correction PR #434 | G1 `DOCUMENTATION_DRIFT` restant ; HEAD healthy ≠ FULLY_ALIGNED | BLOCKED | RG-002, 034, 051 |
| Enchaînement autonome | C26 continuation, UAC / program next | Contrat host injection, aucune preuve d'hôte autonome certifié | INTEGRATION_REQUIRED | RG-043–048, 055–056 |

**Règle de précédence** : le concept Loop *décrit ce que doit faire l'usine*, pas ce que MCP/UAES réalise déjà. Une capacité peut être `EXISTING_VERIFIED` pour son **code** et `UNVERIFIED` pour son **fonctionnement réel complet**.

## M2 — GitHub Insights → CUG → GitRegistry → interprétation Loop

| Capteur / source | Endpoint / outil candidat | Liaison et autorité | Condition de preuve | État vérifié |
| --- | --- | --- | --- | --- |
| Dépôt/identité immuable | `GET /repos/{owner}/{repo}` | numeric repository ID + installation CUG + Project Binding | id ET full_name actuels, installation scope vérifié | Contrat pur PR #436 (CI success), PAS collecteur runtime connecté |
| SBOM / Dependency graph | `GET /repos/{owner}/{repo}/dependency-graph/sbom` | GitHub observations → graphe packages | SPDX version, source SHA/observation, couverture, permission | Contrat PR #436, activation GitHub réelle inconnue |
| Dependabot alerts | `GET .../dependabot/alerts` | Findings avec CVE+package, version et PR correctives | scope autorisé et permission Dependabot:read | Contrat PR #436, activation/permissions réelles inconnues |
| Code scanning | `GET .../code-scanning/alerts` | Constat vulnérabilité/issue/code ref | Code scanning/CodeQL actif et permission adéquate | Contrat PR #436, état repo non attesté |
| Secret scanning | `GET .../secret-scanning/alerts` | Sécurité/incident, pas d'exposition du secret au cockpit | permission spécifique, redaction | Contrat PR #436, état repo non attesté |
| Workflows/actions | `GET .../actions/workflows` + runs/checks | preuve CI, build, infra et statut | run ID + HEAD exact + conclusion | Workflow CI/deploy existant sur MCP ; contrat PR #436 pas raccordé |
| Rulesets/protections | `GET .../rulesets` + branch protection | gates de merge, approbation, bypass | acteur, rôle, règles effectives et date | Règles à lire au moment d'exécuter, pas d'auto-approval présumée |
| Forks/network/pulse | `GET .../forks` et GitHub Insights | provenance et activité, **pas** admission CUG | parent, id stable, coverage et droits | Contrat PR #436, collecte réelle non attestée |
| Traffic | `GET .../traffic/views` | métrique opérationnelle agrégée, pas signal d'architecture | administrateur/permissions, refus 403 classé | Contrat PR #436, accès réel inconnu |

**Contrat d'observation minimum (source utilisateur, statut PROPOSED)** :
`repository_id, installation_id, source_type, observed_at, head_sha, source_url, coverage_status, project_id, chantier_id, finding_type, authority_status`. À préciser dans une future interface de projection. **Ne pas affirmer que ces colonnes existent dans une base en production.**

**Sécurité et idempotence** : la permission CUG d'observer un repo ne donne pas la permission de lire tous ses alertes/traffic, de le mettre à jour ni de l'admettre comme projet. PR #436 classe 403 comme ACCESS_DENIED, 404 comme NOT_FOUND_OR_UNAVAILABLE, 100 items page comme PARTIAL. Les informations sensibles ne doivent pas être affichées en clair. L'inventaire par installation ne devient complet qu'après pagination et observation API réelle.

**Raccordement cible** : reçu signé CUG `deliveryId` → API installation attestée → `githubRepositoryId` ↔ GitRegistry Verified Mapping → observation horodatée et versionnée → classifier Loop → candidat de travail autorisé par mandat → `mcp_reconcile_agent_intent` existant → Task P2, **jamais directement** par POST webhook.

## M3 — C26 ↔ UAES ↔ P2 ↔ véritable hôte codeur

| Contrat | Source actuelle | Exigence d'intégration | Preuve finale |
| --- | --- | --- | --- |
| Identité du codeur | Governed Session et transport-bound principal | Agent machine authentifié par MCP, identité non usurpée | session owner + trace de transport + bootstrap |
| Admission P2 | `readOwnP2State`, `admitExistingP2` (C26 ports) | Pas de mutation à partir du seul `READY` program | transition Task conservant owner/scope/locks |
| Idempotence host | `lookupExistingAgentRun` + `startOrResumeExistingAgent` + `atomicIdempotentHost=true` | Même clé durable lookup/start pour crash/replay | relance même runId, zéro double exécution |
| Context du worker | `readBoundAgentSession` + bootstrap receipt | Recevoir le **propre** contexte authentifié et le SHA runtime, pas agent-selected ID | rapprochement d'identité et SHA exact |
| Risque d'ownership | UAC claims/locks/liveness | `STALE != RELEASED`; heartbeat insuffisant pour takeover | tests négatifs de claim étranger |
| Provider IA | UAES projet propriétaire | LLM par API/local selon ressources, secret store, budget et quota | test du vrai provider, sans exposer token |
| Isolation exécution | UAES U02 | sandbox jetable; pas Docker socket/root S1, limits CPU/RAM/disk/réseau, backup/restore | restauration et clean workspace attestés |
| Continuité | UAES durable host et superviseur | Service tourne indépendamment de ChatGPT, reprend après crash/MCP disconnect | vrai run wake/recover sans nouvelle conversation |
| Delivery | GitHub PR + CI + review + MCP Governed Deploy | 4 preuves PR/merge/workflow/runtime, G1 et C27 | SHA exact et contrôles par autorité |
| Hébergement | UAES `state/CURRENT_STATE.json` | `runtime_operational:false`, U02 pending dans l'état documentaire, **ne pas présumer opérationnel** | preuve live S1 ou hôte séparé, observée indépendamment |

**Frontière d'hébergement** : MCP current Docker fournit outils/autorités. Le worker UAES est un service distinct, qui peut utiliser un même hôte d'agent pour plusieurs *rôles* (intake, architecte, planificateur, codeur, reviewer, reporter) mais chaque rôle conserve ses permissions et son identité. Le worker ne doit pas devenir un MCP bis.

## M4 — Certification C27 du pilote réel et scénarios négatifs obligatoires

| Test / séquence | Source de preuve live requise | Verdict attendu |
| --- | --- | --- |
| Mandat authentifié arrive | issue/API/GUI source authentifiée + trace d'identité | PASS si source admise, non simplement texte impératif |
| Projet/chantier identifié | GitRegistry + Project Binding + IDs historiques | PASS si mapping univoque et vérifié |
| Contexte historique lu | parent/child docs versionnés, source of truth, dernier checkpoint | PASS si versions/source tracées |
| Architecture et dépendances reconstituées | code GitHub@SHA, imports, API, SBOM, diagrammes, autorité des données | PASS avec inconnues explicites |
| Positionnement en programme | classement complément vs nouvelle tâche, 2 graphes et priorité | PASS si non-dispersion et prérequis respectés |
| Admission contrôlée | vraie P2 TaskRecord, own session/bootstrap, locks | PASS si claim exclusif et traces d'admission |
| Réveil sans chat | démontrer vrai scheduler/host sur serveur | PASS si runId durable et actor identifiable |
| Code isolé | workspace éphémère, commits, tests RED/GREEN | PASS sans socket Docker production |
| CI exacte | GitHub check run ID + SHA de la PR | PASS uniquement si check requis success |
| Review indépendante | reviewer différent, résolution fils, ruleset | PASS sans auto-approval fictive |
| Merge autorisé | GitHub merge API + exact head expected | PASS si protection respectée |
| Governed Deploy | workflow OIDC runID + attestation S1 | PASS seulement quand déploiement réellement exécuté |
| Live State / G1 | S1 HEAD/origin, runtime OCI healthy, docs | PASS si **FULLY_ALIGNED** |
| Checkpoint / next | Operational Memory + SUIVI/CONTINUITY enfant | PASS si next work calculable sans relecture chat |
| Crash/restart/retry | simulation contrôlée puis **observation réelle** | PASS sans perte ni double run |
| Reprise ownership négative | seconde session concurrente et lock sur mêmes fichiers | DOIT BLOQUER, aucun takeover sur stale heartbeat |
| Credential denial | GitHub App sans Issues:write / no secrets / 403 | DOIT BLOQUER avec raison et autre lot indépendant possible |
| Head changed after claim | branche modifiée entre plan et exécution | DOIT RECONCILIER, jamais coder sur SHA périmé |
| Resource ceilings | CPU/RAM/disk, retries, LLM tokens/prix | DOIT ARRÊTER proprement et sauvegarder checkpoint |
| HA réaliste | daemon restart automatique, health externe, reboot hôte et restore | `24X7` attesté seulement après observation d'endurance, pas `restart=always` seul |

**C27 existant** (`scripts/mcp-autonomy-e2e-certification.mjs`) est un **certificateur read-only** : il attend de vrais readers GitHub/Session/Task/PR/Checks/Deploy/Live/Checkpoint/NextWork. Les tests mock de sa logique ne démontrent PAS un agent autonome en production. Les limites du moteur et du secret store UAES doivent être attestées avant le pilote.

## M5 — Passage des tâches ChatGPT aux workers : éviter les doubles propriétaires

| Automation active actuellement déclarée | Responsabilité initiale | Collision potentielle avec worker | Positionnement transitoire |
| --- | --- | --- | --- |
| « Continuité CUG GRT GRGS » — horaire | code/intégration MCP et mission registres | **ÉLEVÉ** sur PR CUG / docs / code MCP | conserver comme superviseur de reprise tant qu'un worker n'a pas un claim exclusif; une fois host validé, retirer ses droits d'écriture pour les scopes transférés |
| « Suivi norme documentaire MCP » — quotidien | inventaire/plan doc sous read-only | FAIBLE si reste read-only | contrôleur de couverture documentaire sans mutation |
| « Inventaire GitHub projet MCP » — quotidien | inventaire GitHub W1 sous read-only/branche définie | MOYEN sur mêmes registres projet | coordination source/scope, pas double write |
| « Continuité AfricaFunds Data Pipeline » — horaire | dépôt métier différent | potentielle collision si CUG le cible ultérieurement | conserver propriétaire actuel, pas admission multi-repo implicite |
| « Continuité UAES gouvernée » — horaire | dépôt UAES distinct | **ÉLEVÉ** au provisionnement U02/agent host | ne modifier UAES que selon son propre mandat/claim ; pas de worker UAES concurrent en écriture |

**Un transfert d'autorité exige** : scope précis, identité d'agent, Task/claim, checkpoint, état des branches/PR, déactivation ou passage read-only des automatismes concurrents et rollback. Ne jamais croire qu'un scheduler sur S1 et une automation horaire ChatGPT peuvent posséder simultanément un fichier/lot.

## M6 — Rappel de contrôle d'état et d'anti-dette (21 novembre 2026)

| Composant | Observé | Interdit de conclure |
| --- | --- | --- |
| PR #431 merge `51a4fd1...` | GitHub main = S1 = runtime; Docker healthy | « G1 COMPLET » (doc déclare `5bc5e2b4...`) ou « usine livrée » |
| PR #430 mission source/child | Docs sur branche en Draft, CI à revérifier dernier HEAD | « source intégrée à main » |
| PR #432 cockpit | branche, CI success, fil de revue à réobserver | « cockpit disponible en production » |
| PR #434 G1 | branche docs-only, CI success, reviewer non attesté | « drift corrigé » |
| PR #435 candidats CUG | code proposé, CI success | « tasks CUG automatiquement admises et exécutées » |
| PR #436 Insights | contrat d'observation pure, CI success | « GitHub Insights activés/connectés au runtime » |
| UAES | état documenté `runtime_operational:false`, U02 pending | « worker codeur sur S1 » |

Le prochain acte doit utiliser les **dernières** autorisations/PR/Live State et relever les contradictions entre l'ancien journal et l'état courant. Aucune mutation sur UAES/Loop/GRT n'a été réalisée par la création de cette matrice.

### Index de source et responsabilité documentaire

- [Source lue intégralement et traçabilité des paragraphes](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md)
- [Plan intégral RG-001…056](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__IMPLEMENTATION_PLAN.md)
- [Sous-chantier autonome et architecture](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__ARCHITECTURE.md)
- [Sous-continuité, preuves et reprise](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__CONTINUITY.md)

**NEXT_ACTION** : CI exact-HEAD de ce lot documentaire, vérification des revues existantes, G1 #434, puis RG-043 (audit du contrat d'hôte C26/UAES U02) en lecture uniquement tant que G1/E2 bloquent les mutations runtime.
