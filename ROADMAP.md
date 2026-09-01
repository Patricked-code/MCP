# ROADMAP.md

## Role
Feuille de route du MCP WealthTech.

## Phases
1. Inventaire read-only du depot et du serveur.
2. Creation des fichiers de memoire racine manquants.
3. Consolidation avec docs/ et memory/.
4. Verification de la couche .mcp.
5. Creation des memoires enfants par projet.
6. Audit des droits agents et GitHub.
7. Tests de non-regression.
8. Commit documentaire et synchronisation GitHub.
9. Extension progressive aux projets integres.

## Regle
Chaque phase doit avoir un statut, un risque, une condition de validation et une prochaine action.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

# Programme d'évolution gouvernée

## Rôle de cette section

Cette section complète la roadmap historique sans la remplacer. Elle décrit la direction complète connue du programme, ses grands chantiers, leurs dépendances et leurs points d'intégration dans les autorités déjà existantes.

Elle n'est pas une Task Queue et ne crée aucune tâche runtime. Les identifiants, statuts dynamiques, owners, locks, checkpoints, branches et PR restent sous l'autorité d'Operational Memory, de la Governed Task Queue et de GitHub.

## Règle d'intégration additive

Pour chaque nouveau lot, appliquer dans cet ordre :

1. réutiliser l'autorité existante qui couvre déjà la responsabilité ;
2. si l'autorité existe mais manque une donnée, l'enrichir additivement ;
3. si elle ne couvre qu'un cas historique, la généraliser sans casser ce cas ;
4. si plusieurs autorités sont concernées, les composer sans créer de nouvelle source de vérité ;
5. ne créer une nouvelle brique que si aucune autorité existante ne couvre réellement le besoin.

Interdictions permanentes :

- aucun second Live State ;
- aucune seconde Operational Memory ;
- aucune seconde Governed Task Queue ;
- aucun second moteur de Governed Session ;
- aucun second GitRegistry ou Project Binding Registry concurrent ;
- aucun chemin de déploiement parallèle GitHub → S1 ;
- aucun élargissement implicite de permissions ;
- aucun push direct sur `main` ;
- aucune écriture directe de code versionné sur S1 ;
- aucun secret dans Git.

## Chaîne fonctionnelle cible

```text
ENTRY
  ↓
IDENTIFY CLIENT / PRINCIPAL
  ↓
AUTHENTICATE
  ↓
BIND CONNECTION / CONVERSATION / GOVERNED SESSION
  ↓
RESOLVE GITHUB IDENTITY
  ↓
RESOLVE REPOSITORY
  ↓
RESOLVE PROJECT / SERVER / RUNTIME / DOMAIN
  ↓
RECONCILE LIVE REALITY
  ↓
LOAD / INHERIT GOVERNANCE
  ↓
ACKNOWLEDGE BOOTSTRAP
  ↓
RECONCILE WORK STATE
  ↓
ROUTE
  ↓
CALCULATE EFFECTIVE CAPABILITIES
  ↓
EXECUTE
  ↓
TRACE + PRESENCE + CHECKPOINT
```

Le travail ne commence jamais directement après une connexion. Le système doit d'abord reconnaître la continuité existante, réconcilier l'état réel, hériter de la gouvernance et orienter l'agent.

---

## CHANTIER A — Governed Connection Continuity

### A1 — Automatic Governed Session Binding — LIVRÉ

Objectif : rattacher automatiquement un nouveau transport MCP OAuth à l'unique Governed Session compatible, sans créer de second moteur de session.

Réutilise :
- OAuth existant ;
- `RequestIdentity` ;
- Operational Memory ;
- Governed Session ;
- Transport Bindings ;
- Operational Audit.

État fonctionnel connu : `ATTACHED` / `RESUMED` / `NONE` / `AMBIGUOUS`, refus des credentials partagés, redaction des identifiants de transport bruts et stabilité des révisions lors du transport churn.

### A2 — Client Identity & Connection Context — DÉCOMPOSÉ EN LOTS

Objectif global : construire la continuité de connexion par enrichissements bornés de la Governed Session existante, sans inventer d'identifiant externe fourni par le client et sans créer d'autorité parallèle.

Le statut dynamique des travaux, de la branche, de la PR et de la tâche reste lu dans Operational Memory, la Governed Task Queue et GitHub. Cette roadmap ne déclare jamais un lot `LIVRÉ` avant merge, déploiement exact-SHA et réconciliation complète.

#### A2.1 — Connection Context minimal — LIVRÉ

Preuve de livraison : PR #68 fusionnée depuis le head exact `81832e1b702a8dfe10cda5634d6092fb3a177142` au merge `024f6ad4c047614bdfaea0e317f371b789f60136`; MCP CI PR #713 (`272/272`), CI main #714/#715, Governed Deploy #24 et alignement GitHub/S1/runtime healthy attestés. La réconciliation documentaire descendante conserve Operational Memory et Live State comme autorités dynamiques.

Objectif : rattacher durablement le principal OAuth assaini et la Governed Session à une identité logique de connexion stable.

Dépend de :
- A1 — Automatic Governed Session Binding.

Réutilise :
- `RequestIdentity` ;
- Operational Memory ;
- Governed Session ;
- Transport Bindings ;
- surfaces de session existantes.

Ajouts autorisés :
- contrat `schemaVersion: 1` strict et sanitizé ;
- `connectionContextId` durable ;
- corrélation avec `governedSessionId`, repository, principal OAuth et `clientId` observé ;
- classification initiale `UNRESOLVED` et provenance `oauth_auth_info` ;
- champ optionnel et nullable pour préserver les enregistrements historiques.

Résultats fail-closed :
- identité `oauth_subject` valide → contexte minimal ;
- credential partagé → `connectionContext: null` ;
- session historique sans champ → lecture et continuité inchangées, sans backfill implicite ;
- aucune preuve cliente supplémentaire → aucune classification ChatGPT, Claude ou autre inventée.

Ne doit pas créer :
- nouveau Session Manager ;
- nouveau store ou registre d'identité ;
- nouvel outil ou endpoint `ConnectionContext` ;
- faux `conversation_id` ;
- persistance de token, secret, transport brut ou métadonnée arbitraire.

Critère `DONE` :
- contrats historiques et continuité validés ;
- CI complète sur le head exact ;
- revue indépendante ;
- merge protégé et déploiement gouverné ;
- GitHub, S1, runtime et documentation réconciliés `FULLY_ALIGNED`.

#### A2.2 — Verified Client Evidence

Objectif : enrichir le contexte minimal avec une identité ou référence cliente uniquement lorsqu'une preuve vérifiable est réellement fournie.

Dépend de :
- A2.1 livré et attesté ;
- disponibilité d'une preuve cliente bornée.

Ajouts attendus :
- classification vérifiée ou `UNKNOWN` ;
- référence conversation/workspace uniquement si fournie et autorisée ;
- provenance et horodatage bornés ;
- aucune déduction fondée sur le seul `clientId` opaque.

A2.2 ne bloque pas B1 lorsque le principal OAuth suffit à la résolution GitHub gouvernée ; l'absence de preuve cliente reste explicite et fail-closed.

### A3 — OAuth Auth Attempt Correlation

Objectif : conserver la continuité sûre entre l'entrée OAuth, le retour d'authentification et le bootstrap logique.

Ajouts attendus :
- tentative d'authentification corrélée ;
- timestamps et statut ;
- `state` conservé sous forme sûre/hashée si persistance nécessaire ;
- aucune persistance de token/code secret brut.

---

## CHANTIER B — GitHub & Repository Resolution

### B1 — GitHub Identity Resolution

Objectif : résoudre les comptes GitHub réellement autorisés pour le principal courant.

Réutilise :
- GitHub connection registry existant ;
- stockage secret existant ;
- `.mcp/identity-policy.json` ;
- permissions observées.

Comportement cible :
- zéro compte compatible → `NONE` ;
- un compte compatible → résolution automatique ;
- plusieurs comptes compatibles → `AMBIGUOUS`, choix explicite ;
- aucun token exposé dans les registres métier.

### B2 — Repository Resolution

Objectif : résoudre le repository explicitement fourni ou déjà relié au contexte courant.

Réutilise :
- GitRegistry ;
- inventaire GitHub existant ;
- Governed Session / Connection Context.

Comportement cible :
- mapping existant → réutilisation automatique ;
- plusieurs repositories possibles → `AMBIGUOUS` ;
- aucun repository → `NONE` ;
- aucune sélection arbitraire du « dernier repo global ».

### B3 — Multi-repository Governed Context

Objectif : généraliser progressivement les contrats historiquement bornés à `Patricked-code/MCP` vers un `repositoryId`/`mappingId` validé, tout en conservant la compatibilité historique MCP.

---

## CHANTIER C — Project Binding / Server / Runtime / Domain

### C1 — GitRegistry V2 verification & activation path

Objectif : utiliser GitRegistry V2 comme autorité de mapping repo ↔ projet ↔ serveur ↔ domaine, et non créer un registre parallèle.

À compléter selon les mappings :
- `realPathVerified` ;
- `remoteVerified` ;
- `domainVerified` ;
- statut du mapping ;
- références de credentials sans secret ;
- capacités et health checks.

### C2 — Repository → Project Resolution

Objectif : résoudre automatiquement `repositoryId → mappingId → projectId`.

Résultats bornés : `RESOLVED`, `NONE`, `AMBIGUOUS`, `UNVERIFIED`.

### C3 — Server Resolution

Objectif : résoudre S1/S2 et le chemin réel en composant GitRegistry V2, `.mcp/server-map.json` et Live State.

### C4 — Runtime / Container / Reverse Proxy Resolution

Objectif : compléter la réalité projet avec runtime, container, ports/reverse proxy lorsque ces données sont observables et gouvernées.

### C5 — Domain Resolution

Objectif : rattacher le domaine existant au Project Binding et vérifier sa réalité avant tout usage opérationnel.

Ne doit pas créer automatiquement un domaine ou runtime manquant.

---

## CHANTIER D — Governance Inheritance & Effective Capabilities

### D1 — Existing Governance Inheritance

Objectif : lorsqu'un repository/projet est déjà gouverné, hériter automatiquement des règles existantes sans les recréer.

Doit composer notamment :
- règles de branche/PR ;
- tests/reviews ;
- stratégie GitHub → S1 ;
- locks/scopes ;
- règles de secrets ;
- WRITE gate ;
- permissions projet/serveur.

### D2 — Effective Capabilities

Objectif : calculer les capacités réellement utilisables comme composition/intersection des preuves disponibles : OAuth, identité, GitHub, mapping projet, serveur, gouvernance et WRITE gate.

Une capacité technique ne devient jamais une autorisation si la gouvernance l'interdit.

### D3 — Bootstrap Receipt Enrichment

Objectif : enrichir le Bootstrap Receipt existant avec les références client/connexion/repository/project/mapping nécessaires, sans secrets et sans créer de second receipt.

---

## CHANTIER E — Guided Context Completion

### E1 — Missing-context Detection

Objectif : déterminer exactement quelles informations obligatoires manquent après la résolution automatique.

### E2 — Context Completion Wizard

Objectif : faire évoluer les surfaces frontend existantes `/login`, `/git`, `/github` en complétion guidée lorsque nécessaire.

Principe : demander uniquement les informations manquantes. Un contexte déjà gouverné doit être restauré automatiquement.

### E3 — Consent & Validation

Objectif : exiger un consentement explicite avant toute création ou mutation de ressource qui n'existe pas encore.

---

## CHANTIER F — Governed Provisioning

À traiter seulement après la résolution et l'intake.

Lots possibles :
- création contrôlée d'un repository ;
- création contrôlée d'un projet/runtime ;
- création contrôlée d'un domaine/binding ;
- rollback/backup/health checks obligatoires.

Toutes les créations restent `write-scoped`, fail-closed, auditées et soumises aux règles existantes.

---

## CHANTIER G — Client Presence & Tool Surface Attestation

### G1 — Client Presence

Objectif : distinguer serveur sain et présence réelle d'un client/conversation.

États cibles : `ACTIVE_OBSERVED`, `RECENTLY_OBSERVED`, `STALE`, `UNKNOWN`, `AUTH_EXPIRED`, `REVOKED`.

`STALE` ne signifie jamais automatiquement « déconnecté ».

### G2 — Two-clock Presence

Conserver séparément :
- `lastClientObservedAt` ;
- `lastSyntheticProbeAt`.

### G3 — Tool Surface Attestation

Distinguer :
- surface exposée par le serveur ;
- surface réellement observée côté client quand la preuve existe ;
- état inconnu quand aucune preuve client n'est disponible.

Le catalogue/Current State existant reste l'autorité serveur.

---

## CHANTIER H — End-to-End Tracing

Objectif : localiser exactement le niveau d'échec d'un appel.

Chaîne cible :

```text
client request
→ auth
→ MCP protocol
→ tool dispatch
→ governance/capability
→ internal service
→ GitHub / SSH / DB / API upstream
→ response
```

Réutilise l'Operational Event Journal existant ; ne crée pas un second moteur d'audit.

Évolutions futures : événements OAuth/client/tool/upstream, corrélation `traceId` / `requestId` / `spanId`, classification des erreurs et redaction stricte des secrets/arguments sensibles.

---

## CHANTIER I — Synthetic Monitoring & Connection Dashboard

### I1 — Synthetic Monitor

Objectif : vérifier périodiquement la chaîne serveur (DNS/TLS/HTTP/MCP/tool catalogue/canary read-only/runtime) sans prétendre que cela prouve la présence d'une conversation cliente.

### I2 — Connection-chain Dashboard

Objectif : enrichir le dashboard existant avec la chaîne client → auth → MCP → Governed Session → GitHub → repo → projet → serveur/runtime/domain et afficher la provenance de chaque preuve.

### I3 — Alerts

Objectif : produire des blockers/alertes précis par étape sans basculer vers une écriture directe S1.

---

## CHANTIER J — Client Certification & Hardening futur

### J1 — Claude certification

Valider le chemin end-to-end Claude avec les preuves réellement exposées par le client.

### J2 — ChatGPT certification

Valider le chemin end-to-end ChatGPT sans supposer que le dépôt peut forcer le connecteur GitHub natif de l'interface à rester chargé.

### J3 — GitHub Actions / Node 24 maintenance

Maintenance séparée, PR dédiée, sans mélange avec les lots de bootstrap.

### J4 — WRITE gate `shadow → enforce`

Optionnel. Exige un GO distinct, décision architecturale, TDD, PR séparée et preuve de parité. Aucun passage automatique.

---

# Dépendances principales

```text
A1 Session Binding [livré]
  ↓
A2.1 Connection Context minimal [livré]
  ├──→ B1 GitHub Identity
  └──→ A2.2 Verified Client Evidence [si preuve disponible, non bloquant pour B1]
  ↓
B2 Repository Resolution
  ↓
C1/C2 GitRegistry V2 + Project Binding
  ↓
C3/C4/C5 Server / Runtime / Domain
  ↓
D1/D2/D3 Governance + Effective Capabilities + Receipt
  ↓
E Guided Context Completion
  ↓
F Governed Provisioning

G Presence / Tool Attestation
H Tracing
I Monitoring / Dashboard
peuvent progresser après le socle de connexion/résolution, selon les dépendances réellement observées.

J Certification / Hardening vient après les capacités correspondantes.
```

# Contrat standard de chaque lot

Avant toute implémentation, chaque lot doit expliciter :

- objectif ;
- dépendances ;
- autorités existantes réutilisées ;
- données ou comportements ajoutés ;
- éléments explicitement interdits / non remplacés ;
- résultats fail-closed attendus ;
- tests de non-régression ;
- critères de DONE ;
- Task ID uniquement lorsqu'une vraie tâche est enregistrée dans Operational Memory.

# Synchronisation permanente des documents de pilotage

```text
nouvelle amélioration structurante
→ ROADMAP.md

lot réellement restant
→ TODO.md

lot devenu exécutable / tâche gouvernée enregistrée
→ TASKS.md + Operational Memory

travail terminé
→ Operational Memory / Live State / GitHub d'abord
→ puis réconciliation descendante SUIVI.md / TASKS.md / TODO.md / ROADMAP.md
```

Règle : les Markdown décrivent et projettent la réalité ; ils ne remplacent jamais les autorités runtime.
