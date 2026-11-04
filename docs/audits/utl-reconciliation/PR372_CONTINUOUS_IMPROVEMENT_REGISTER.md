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
