# Audit PR #1

## Métadonnées Git locales

- Base auditée : `main`
- Ref PR : `refs/remotes/origin/pr/1`
- Merge-base : `bd8fe086b338d0dbef9515ae8dd0b8161af7ae2e`
- Head SHA : `f84c78fcbbaa81584a4fde6cadf1c0f78a74f68e`
- Nombre de commits depuis merge-base : `31`
- Nombre de fichiers changés : `98`
- Stat diff : ` 98 files changed, 30484 insertions(+), 5 deletions(-)`
- merge-tree exit : `0`
- statut conflit : `PAS_DE_CONFLIT_TEXTE_DETECTE_PAR_MERGE_TREE`

## Fichiers modifiés

```text
.mcp/agents.json
.mcp/manifest.json
.mcp/onboarding.json
.mcp/permissions.json
.mcp/server-map.json
MCP_AGENT_RULES.md
MCP_PROJECT.md
MCP_REPO_INVENTORY.md
MCP_SERVER_MAPPING.md
Migration/agents/README.md
Migration/conversations-md/README.md
Migration/conversations-pdf/README.md
Migration/decisions/README.md
Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json
Migration/evidence/README.md
Migration/github/README.md
Migration/github/chainsolutions-wealthtech/.github/profile/README.md
Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md
Migration/github/chainsolutions-wealthtech/ORG_ACTIVATION_RUNBOOK.md
Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json
Migration/index/ARCHIVE_TEXT_AUDIT.json
Migration/index/ARCHIVE_TEXT_AUDIT_STATUS.md
Migration/index/BLOCKER_EVIDENCE_GATE.json
Migration/index/BLOCKER_EVIDENCE_GATE.md
Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json
Migration/index/BLOCKER_RESOLUTION_RUNBOOK.md
Migration/index/CHAINSOLUTIONS_WEALTHTECH_FIRST_INTEGRATION.md
Migration/index/COMPLETION_AUDIT.json
Migration/index/COMPLETION_AUDIT.md
Migration/index/EXECUTION_RUNWAY.json
Migration/index/EXECUTION_RUNWAY.md
Migration/index/MCP_EXECUTION_TASKS.json
Migration/index/MCP_EXECUTION_TASKS.md
Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json
Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md
Migration/index/OPERATOR_ACTION_ISSUE_LOG.json
Migration/index/OPERATOR_ACTION_ISSUE_LOG.md
Migration/index/OPERATOR_ACTION_PACK.json
Migration/index/OPERATOR_ACTION_PACK.md
Migration/index/PDF_TEXT_AUDIT.json
Migration/index/PDF_TEXT_AUDIT_STATUS.md
Migration/index/README.md
Migration/index/RESUME_GATE.json
Migration/index/RESUME_GATE.md
Migration/index/SOURCE_INGESTION_STATUS.md
Migration/index/SOURCE_REGISTRY.json
Migration/prompts/README.md
Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json
Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md
Migration/serveur/README.md
docs/CHAINSOLUTIONS_WEALTHTECH_ORG_BOOTSTRAP.md
docs/MCP_AGENT_ROLES.md
docs/MCP_AUDIT_LOGS.md
docs/MCP_ONBOARDING_ENGINE.md
docs/MCP_REPO_FOOTPRINT.md
docs/MCP_SECURITY_MODEL.md
docs/MCP_SERVER_MAPPING.md
package.json
scripts/build-archive-text-audit.py
scripts/build-blocker-evidence-gate.py
scripts/build-blocker-resolution-runbook.py
scripts/build-completion-audit.py
scripts/build-execution-runway.py
scripts/build-execution-tasks.py
scripts/build-objective-index.py
scripts/build-operator-action-pack.py
scripts/build-pdf-text-audit.py
scripts/build-resume-gate.py
scripts/build-server-inventory-cards.py
scripts/build-source-registry.mjs
scripts/check-docs.mjs
scripts/check-public-evidence.mjs
scripts/sync-operator-issue-log.mjs
src/github/registry.ts
src/onboarding/agents.ts
src/onboarding/archiveTextAudit.ts
src/onboarding/audit.ts
src/onboarding/blockerEvidenceGate.ts
src/onboarding/blockerResolution.ts
src/onboarding/completionAudit.ts
src/onboarding/executionRunway.ts
src/onboarding/executionTasks.ts
src/onboarding/identity.ts
src/onboarding/index.ts
src/onboarding/objectiveIndex.ts
src/onboarding/operatorActionPack.ts
src/onboarding/organization.ts
src/onboarding/questions.ts
src/onboarding/repoFootprint.ts
src/onboarding/resumeGate.ts
src/onboarding/rights.ts
src/onboarding/serverInventoryCards.ts
src/onboarding/serverMapping.ts
src/onboarding/sourceRegistry.ts
src/onboarding/types.ts
src/server.ts
tests/onboarding.test.ts
tsconfig.json
```

## Statistiques

```text
 .mcp/agents.json                                   |   51 +
 .mcp/manifest.json                                 |   25 +
 .mcp/onboarding.json                               |   20 +
 .mcp/permissions.json                              |   31 +
 .mcp/server-map.json                               |   29 +
 MCP_AGENT_RULES.md                                 |   32 +
 MCP_PROJECT.md                                     |   34 +
 MCP_REPO_INVENTORY.md                              |   35 +
 MCP_SERVER_MAPPING.md                              |   32 +
 Migration/agents/README.md                         |   17 +
 Migration/conversations-md/README.md               |   11 +
 Migration/conversations-pdf/README.md              |   12 +
 Migration/decisions/README.md                      |   14 +
 .../PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json      |   78 +
 Migration/evidence/README.md                       |   13 +
 Migration/github/README.md                         |   12 +
 .../.github/profile/README.md                      |   41 +
 .../DIRECT_CONFIGURATION_LOG.md                    |   31 +
 .../ORG_ACTIVATION_RUNBOOK.md                      |  155 +
 .../ORG_BOOTSTRAP_PACKAGE.json                     |   66 +
 Migration/index/ARCHIVE_TEXT_AUDIT.json            | 3583 ++++++++++++
 Migration/index/ARCHIVE_TEXT_AUDIT_STATUS.md       |   63 +
 Migration/index/BLOCKER_EVIDENCE_GATE.json         |  192 +
 Migration/index/BLOCKER_EVIDENCE_GATE.md           |   84 +
 Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json    |  225 +
 Migration/index/BLOCKER_RESOLUTION_RUNBOOK.md      |  129 +
 .../CHAINSOLUTIONS_WEALTHTECH_FIRST_INTEGRATION.md |   93 +
 Migration/index/COMPLETION_AUDIT.json              |  663 +++
 Migration/index/COMPLETION_AUDIT.md                |  229 +
 Migration/index/EXECUTION_RUNWAY.json              |  508 ++
 Migration/index/EXECUTION_RUNWAY.md                |  172 +
 Migration/index/MCP_EXECUTION_TASKS.json           |  552 ++
 Migration/index/MCP_EXECUTION_TASKS.md             |   69 +
 Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json | 1276 +++++
 Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md   |   64 +
 Migration/index/OPERATOR_ACTION_ISSUE_LOG.json     |   51 +
 Migration/index/OPERATOR_ACTION_ISSUE_LOG.md       |   27 +
 Migration/index/OPERATOR_ACTION_PACK.json          |  237 +
 Migration/index/OPERATOR_ACTION_PACK.md            |  154 +
 Migration/index/PDF_TEXT_AUDIT.json                | 6048 ++++++++++++++++++++
 Migration/index/PDF_TEXT_AUDIT_STATUS.md           |  110 +
 Migration/index/README.md                          |   45 +
 Migration/index/RESUME_GATE.json                   |  250 +
 Migration/index/RESUME_GATE.md                     |   53 +
 Migration/index/SOURCE_INGESTION_STATUS.md         |   72 +
 Migration/index/SOURCE_REGISTRY.json               | 2764 +++++++++
 Migration/prompts/README.md                        |   13 +
 .../PRIVATE_SERVER_INVENTORY_TASK_CARDS.json       |  608 ++
 .../serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md |   67 +
 Migration/serveur/README.md                        |   20 +
 docs/CHAINSOLUTIONS_WEALTHTECH_ORG_BOOTSTRAP.md    |  146 +
 docs/MCP_AGENT_ROLES.md                            |   52 +
 docs/MCP_AUDIT_LOGS.md                             |   51 +
 docs/MCP_ONBOARDING_ENGINE.md                      |   87 +
 docs/MCP_REPO_FOOTPRINT.md                         |   36 +
 docs/MCP_SECURITY_MODEL.md                         |   48 +
 docs/MCP_SERVER_MAPPING.md                         |   50 +
 package.json                                       |   15 +
 scripts/build-archive-text-audit.py                |  547 ++
 scripts/build-blocker-evidence-gate.py             |  325 ++
 scripts/build-blocker-resolution-runbook.py        |  295 +
 scripts/build-completion-audit.py                  |  564 ++
 scripts/build-execution-runway.py                  |  445 ++
 scripts/build-execution-tasks.py                   |  449 ++
 scripts/build-objective-index.py                   |  625 ++
 scripts/build-operator-action-pack.py              |  343 ++
 scripts/build-pdf-text-audit.py                    |  458 ++
 scripts/build-resume-gate.py                       |  249 +
 scripts/build-server-inventory-cards.py            |  447 ++
 scripts/build-source-registry.mjs                  |  598 ++
 scripts/check-docs.mjs                             |   54 +-
 scripts/check-public-evidence.mjs                  |  128 +
 scripts/sync-operator-issue-log.mjs                |  148 +
 src/github/registry.ts                             |   43 +-
 src/onboarding/agents.ts                           |  211 +
 src/onboarding/archiveTextAudit.ts                 |  144 +
 src/onboarding/audit.ts                            |  112 +
 src/onboarding/blockerEvidenceGate.ts              |  133 +
 src/onboarding/blockerResolution.ts                |  105 +
 src/onboarding/completionAudit.ts                  |  126 +
 src/onboarding/executionRunway.ts                  |  139 +
 src/onboarding/executionTasks.ts                   |  135 +
 src/onboarding/identity.ts                         |   84 +
 src/onboarding/index.ts                            |  603 ++
 src/onboarding/objectiveIndex.ts                   |  149 +
 src/onboarding/operatorActionPack.ts               |  120 +
 src/onboarding/organization.ts                     |  177 +
 src/onboarding/questions.ts                        |  134 +
 src/onboarding/repoFootprint.ts                    |  114 +
 src/onboarding/resumeGate.ts                       |  114 +
 src/onboarding/rights.ts                           |   43 +
 src/onboarding/serverInventoryCards.ts             |  108 +
 src/onboarding/serverMapping.ts                    |   51 +
 src/onboarding/sourceRegistry.ts                   |  284 +
 src/onboarding/types.ts                            |  251 +
 src/server.ts                                      |  499 ++
 tests/onboarding.test.ts                           | 1288 +++++
 tsconfig.json                                      |    2 +-
 98 files changed, 30484 insertions(+), 5 deletions(-)
```

## Commits

```text
f84c78f feat: add public-safe evidence template
f8621cb feat: add blocker evidence gate
b00e339 feat: add migration execution runway
6af3344 feat: add migration resume gate
27dd92e feat: sync operator issue state
7e320cd feat: link operator action issues
5508a96 feat: add operator action pack
646d5be feat: add objective completion audit
c309196 feat: audit archive text entries
42a6c2d feat: add blocker resolution runbook
0152f2f feat: add server inventory task cards
902d675 feat: add executable MCP task plan
1d06f07 feat: add objective traceability matrix
f7ab2e1 feat: audit PDF source extraction
c0cf707 feat: expose migration source registry
19782d6 docs: record direct organization configuration
b248bcc feat: audit organization security verification
dbe87e3 feat: document organization 2fa policy
57e342e feat: audit bootstrap preparation flows
1007292 feat: expose organization bootstrap routes
70bfab9 docs: add MCP repository governance files
6187184 feat: add organization bootstrap package
aba1d32 test: cover MCP onboarding safeguards
18cc3de feat: add MCP onboarding governance engine
1d4320c docs: add chainsolutions org activation runbook
b0c6436 docs: link chainsolutions org activation runbook
ec7bbe7 docs: reference chainsolutions org activation runbook
695ff30 docs: add chainsolutions org profile artifact
f07019d docs: reference chainsolutions org profile artifact
423a029 docs: add first integration index for target organization
6828374 docs: prepare chainsolutions wealthtech org bootstrap
```

## Extrait merge-tree

Le fichier complet est :

`docs/pr-audit/PR-1.merge-tree.txt`

Extrait :

```text
added in both
  our    100644 873b95fb651d89c78ca053fbe0f6433b9327e23d .mcp/agents.json
  their  100644 06df818ae487543235cd36a7afd8cb73a632bc65 .mcp/agents.json
@@ -1,4 +1,5 @@
 {
+<<<<<<< .our
   "schemaVersion": 1,
   "agents": [
     {
@@ -30,6 +31,55 @@
       "canOpenPullRequests": true,
       "canDeploy": false,
       "requiresHumanApproval": true
+=======
+  "version": 1,
+  "agents": [
+    {
+      "agentId": "superadmin-mcp",
+      "agentName": "SuperAdmin MCP",
+      "role": "Master MCP governance authority",
+      "requiresHumanApproval": true,
+      "canDeploy": false,
+      "restrictions": [
+        "Requires master MCP token validation.",
+        "Never derived automatically from GitHub token permissions."
+      ]
+    },
+    {
+      "agentId": "chatgpt-architect",
+      "agentName": "ChatGPT",
+      "role": "Architecture, planning, synthesis and project supervision",
+      "requiresHumanApproval": true,
+      "canDeploy": false
+    },
+    {
+      "agentId": "claude-docs",
+      "agentName": "Claude",
+      "role": "Long-form documentation, analysis and synthesis",
+      "requiresHumanApproval": true,
+      "canDeploy": false
+    },
+    {
+      "agentId": "codex-technical",
+      "agentName": "Codex",
+      "role": "Code, tests, integration and pull-request preparation",
+      "requiresHumanApproval": true,
+      "canDeploy": false
+    },
+    {
+      "agentId": "server-sync-agent",
+      "agentName": "Agent serveur",
+      "role": "Server mapping and synchronization support",
+      "requiresHumanApproval": true,
+      "canDeploy": false
+    },
+    {
+      "agentId": "audit-agent",
+      "agentName": "Agent audit",
+      "role": "Audit, compliance, inventory and trace review",
+      "requiresHumanApproval": false,
+      "canDeploy": false
+>>>>>>> .their
     }
   ]
 }
added in both
  our    100644 152ad9023b18026b6fc4cd0f6fe41676ffa3ea2b .mcp/manifest.json
  their  100644 c6061a440cc50e3c39ae8e27c0786a685313a7e3 .mcp/manifest.json
@@ -1,4 +1,5 @@
 {
+<<<<<<< .our
   "schemaVersion": 1,
   "project": "MCP",
   "organization": "chainsolutions-wealthtech",
@@ -13,4 +14,29 @@
     "CODESPACES.md"
   ],
   "onboardingEngine": true
+=======
+  "version": 1,
+  "projectName": "wealthtech-mcp-ssh-bridge",
+  "owner": "Patricked-code",
+  "repo": "MCP",
+  "targetOrganization": "chainsolutions-wealthtech",
+  "defaultBranch": "main",
+  "workingBranch": "mcp/migration-governance-setup",
+  "mcpStatus": "partial",
+  "createdAt": "2026-07-05T00:00:00.000Z",
+  "modules": [
+    "identity",
+    "rights",
+    "questions",
+    "repoFootprint",
+    "agents",
+    "serverMapping",
+    "audit",
+    "organizationBootstrap"
+  ],
+  "notes": [
+    "This repository is the current MCP governance staging repo.",
+    "Direct chainsolutions-wealthtech organization integration is blocked until the GitHub App or an explicitly scoped organization token is authorized."
+  ]
+>>>>>>> .their
 }
added in both
  our    100644 7f2c116eed76dda84d1b54281b429c9dd5454c22 .mcp/onboarding.json
  their  100644 269abb71a5070e3861a7136873332c4d96091cfa .mcp/onboarding.json
@@ -1,4 +1,5 @@
 {
+<<<<<<< .our
   "schemaVersion": 1,
   "status": "initialized",
   "engine": "MCP Onboarding Engine",
@@ -11,4 +12,24 @@
     "GET /git/permissions",
     "GET /git/audit"
   ]
+=======
+  "version": 1,
+  "status": "prepared",
+  "actor": "mcp-onboarding-engine",
+  "targetOrganization": "chainsolutions-wealthtech",
+  "currentRepository": "Patricked-code/MCP",
+  "questionsAnswered": [],
+  "decisions": [
+    {
+      "at": "2026-07-05T00:00:00.000Z",
+      "decision": "Use Patricked-code/MCP as the staging repository until chainsolutions-wealthtech is visible to the GitHub connector."
+    },
+    {
+      "at": "2026-07-05T00:00:00.000Z",
+      "decision": "Prepare organization profile and MCP governance files on branch mcp/migration-governance-setup only."
+    }
+  ],
+  "nextStep": "Authorize the GitHub App or explicit organization-scoped token on chainsolutions-wealthtech, then create chainsolutions-wealthtech/.github on branch mcp/org-profile-bootstrap.",
+  "updatedAt": "2026-07-05T00:00:00.000Z"
+>>>>>>> .their
 }
added in both
  our    100644 cc99fb8145ae89eab4346f03af58780e83d48e6b .mcp/permissions.json
  their  100644 3a6a1af28448fb41c62bd0b7f5f165090b9c5d3e .mcp/permissions.json
@@ -1,4 +1,5 @@
 {
+<<<<<<< .our
   "schemaVersion": 1,
   "writePolicy": {
     "directMainPush": false,
@@ -24,5 +25,35 @@
     "*.p12",
     "*.dump",
     "*.sql"
+=======
+  "version": 1,
+  "directMainWrites": false,
+  "humanApprovalRequired": true,
+  "masterMcpTokenRequiredFor": [
+    "superadmin_mcp",
+    "organization_admin",
+    "deploy",
+    "official_branch_write"
+  ],
+  "allowedBranches": [
+    "mcp/migration-governance-setup",
+    "mcp/onboarding-setup",
+    "mcp/org-profile-bootstrap"
+  ],
+  "forbiddenBranches": [
+    "main",
+    "master"
+  ],
+  "allowedWriteModes": [
+    "read-only-plus-scoped-write",
+    "branch_pr_required"
+  ],
+  "forbiddenActions": [
+    "store_raw_token",
+    "write_directly_to_main",
+    "create_github_token_from_password",
+    "deploy_without_explicit_human_validation",
+    "grant_superadmin_from_github_token_only"
```

## Décision provisoire

Aucun merge effectué.

Cette PR doit être classée selon les règles suivantes :

- garder si elle complète la gouvernance actuelle sans conflit ;
- déplacer si elle vise une mauvaise base ;
- refaire si elle chevauche la PR #6 ou contient trop de modifications obsolètes ;
- bloquer si elle dépend d’issues ouvertes, de secrets, de tokens, de serveur non audité ou de droits GitHub non confirmés.
