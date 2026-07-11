# Audit PR #5

## Métadonnées Git locales

- Base auditée : `main`
- Ref PR : `refs/remotes/origin/pr/5`
- Merge-base : `181a7e8f3b80f4d63ed2d915279a79698551a0f5`
- Head SHA : `c4baaddf8da02bee2e8c5a8f4a58334b11658df3`
- Nombre de commits depuis merge-base : `18`
- Nombre de fichiers changés : `18`
- Stat diff : ` 18 files changed, 1677 insertions(+)`
- merge-tree exit : `0`
- statut conflit : `PAS_DE_CONFLIT_TEXTE_DETECTE_PAR_MERGE_TREE`

## Fichiers modifiés

```text
docs/CODEX_PROMPT_MCP_ONBOARDING_ENGINE.md
docs/MCP_AGENT_ROLES.md
docs/MCP_AUDIT_LOGS.md
docs/MCP_ONBOARDING_ENGINE.md
docs/MCP_REPO_FOOTPRINT.md
docs/MCP_SECURITY_MODEL.md
docs/MCP_SERVER_MAPPING.md
src/onboarding/agents.ts
src/onboarding/audit.ts
src/onboarding/http.ts
src/onboarding/identity.ts
src/onboarding/index.ts
src/onboarding/questions.ts
src/onboarding/repoFootprint.ts
src/onboarding/rights.ts
src/onboarding/serverMapping.ts
src/onboarding/types.ts
src/server.ts
```

## Statistiques

```text
 docs/CODEX_PROMPT_MCP_ONBOARDING_ENGINE.md | 127 ++++++++++++++++
 docs/MCP_AGENT_ROLES.md                    | 114 ++++++++++++++
 docs/MCP_AUDIT_LOGS.md                     |  82 ++++++++++
 docs/MCP_ONBOARDING_ENGINE.md              | 125 ++++++++++++++++
 docs/MCP_REPO_FOOTPRINT.md                 | 126 ++++++++++++++++
 docs/MCP_SECURITY_MODEL.md                 | 115 +++++++++++++++
 docs/MCP_SERVER_MAPPING.md                 |  72 +++++++++
 src/onboarding/agents.ts                   | 112 ++++++++++++++
 src/onboarding/audit.ts                    |  54 +++++++
 src/onboarding/http.ts                     | 230 +++++++++++++++++++++++++++++
 src/onboarding/identity.ts                 | 103 +++++++++++++
 src/onboarding/index.ts                    |   8 +
 src/onboarding/questions.ts                |  96 ++++++++++++
 src/onboarding/repoFootprint.ts            |  80 ++++++++++
 src/onboarding/rights.ts                   |  49 ++++++
 src/onboarding/serverMapping.ts            |  27 ++++
 src/onboarding/types.ts                    | 153 +++++++++++++++++++
 src/server.ts                              |   4 +
 18 files changed, 1677 insertions(+)
```

## Commits

```text
c4baadd feat: wire onboarding routes into server
0ffae1d feat: add onboarding HTTP routes
55466d3 feat: export onboarding module
66dad71 feat: add onboarding audit helpers
92069db feat: add server mapping helpers
cab2b7f feat: add repo footprint helpers
75462fa feat: add onboarding rights summary
bf7b703 feat: add onboarding actor identity detection
1d66bd1 feat: add default MCP agent profiles
ce6634a feat: add onboarding question catalog
79aa4df feat: add onboarding shared types
9040f19 docs: add Codex prompt for MCP onboarding engine
ef571fe docs: add MCP audit logs spec
ea5b89b docs: add MCP server mapping spec
8e86a71 docs: add MCP repo footprint spec
4ce9b62 docs: add MCP agent roles
6b02d47 docs: add MCP security model
1e93486 docs: add MCP onboarding engine spec
```

## Extrait merge-tree

Le fichier complet est :

`docs/pr-audit/PR-5.merge-tree.txt`

Extrait :

```text
added in remote
  their  100644 b0c09c6903e88ca5242c8899c0851e49a80d774f docs/CODEX_PROMPT_MCP_ONBOARDING_ENGINE.md
@@ -0,0 +1,127 @@
+# Prompt Codex — MCP GitHub Governance & Onboarding Engine
+
+Tu es Codex, agent technique principal du projet `chainsolutions-wealthtech`.
+
+Interviens sur le repo MCP/GitHub existant pour créer le module `MCP GitHub Governance & Onboarding Engine`.
+
+## Objectif
+
+Transformer le MCP en superviseur central GitHub + serveurs + agents IA.
+
+Le MCP doit :
+
+- identifier les acteurs connectés ;
+- vérifier les tokens MCP et GitHub sans jamais stocker de token brut ;
+- contrôler les droits ;
+- auditer chaque connexion ;
+- lister les repos visibles ;
+- détecter les fichiers MCP manquants ;
+- générer une documentation projet ;
+- créer les profils d'agents internes ;
+- lier les repos aux dossiers serveur ;
+- empêcher toute écriture directe sur `main`.
+
+## Inspection obligatoire avant modification
+
+Avant toute modification, inspecte entièrement le repo :
+
+- arborescence ;
+- routes existantes ;
+- modules GitHub ;
+- registre MCP/Git ;
+- fichiers Markdown ;
+- scripts de test ;
+- configuration ;
+- `package.json` ;
+- état actuel de `/login`, `/dashboard`, `/git`, `/git/status`, `/git/connect`, `/github`, `/github/status`, `/github/:account`, `/github/connect`.
+
+## Modules à créer ou compléter
+
+```text
+src/onboarding/identity.ts
+src/onboarding/rights.ts
+src/onboarding/questions.ts
+src/onboarding/repoFootprint.ts
+src/onboarding/agents.ts
+src/onboarding/serverMapping.ts
+src/onboarding/audit.ts
+src/onboarding/types.ts
+src/onboarding/index.ts
+```
+
+## Routes à ajouter ou compléter
+
+```text
+GET  /git/onboarding
+POST /git/onboarding/start
+POST /git/onboarding/answer
+GET  /git/accounts
+GET  /git/accounts/:account
+GET  /git/repos
+GET  /git/repos/:owner/:repo
+POST /git/repos/:owner/:repo/bootstrap
+GET  /git/agents
+POST /git/agents/create
+GET  /git/audit
+```
+
+## Fichiers à vérifier dans chaque repo
+
+```text
+.mcp/manifest.json
+.mcp/permissions.json
+.mcp/agents.json
+.mcp/server-map.json
+.mcp/onboarding.json
+MCP_PROJECT.md
+MCP_AGENT_RULES.md
+MCP_REPO_INVENTORY.md
+MCP_SERVER_MAPPING.md
+README.md
+SUIVI.md ou TASKS.md
+DEPLOYMENT.md
+SECURITY.md
+```
+
+## Règles impératives
+
+- Ne jamais stocker de token brut.
+- Ne jamais écrire directement sur `main`.
+- Ne jamais créer de token GitHub depuis un mot de passe.
+- Utiliser uniquement un token GitHub fourni ou une future GitHub App/OAuth.
+- Réserver le rôle SuperAdmin au token MCP maître.
+- Toute écriture doit passer par une branche MCP.
+- Toute action sensible doit être auditée.
+- Aucune régression des routes existantes.
+- Aucune suppression destructive.
+- Code typé, maintenable, testable et aligné avec l'architecture existante.
+
+## Première question obligatoire du portail
+
+Après connexion MCP, demander :
+
+```text
+Qui êtes-vous ?
+A. ChatGPT
+B. ConfigCloud
+C. Autre agent / service
+```
+
+Si ChatGPT : rôle de supervision, analyse, plan et documentation proposée.
+
+Si ConfigCloud : rôle de connexion de répertoire, détection remote GitHub, mapping repo ↔ serveur, contrôle `.mcp` et bootstrap.
+
+## Livrable attendu
+
+Une V1 propre, sécurisée et non destructive : documentation, typage, audit, détection des droits, création d'agents, inventaire repos, génération contrôlée des fichiers `.mcp`, branche MCP uniquement, puis rapport final.
+
+## Tests
+
+Lis d'abord les commandes disponibles dans `package.json`, puis exécute les commandes adaptées, typiquement :
+
+```bash
+npm run typecheck
+npm run build
+```
+
+N'invente pas de commande qui n'existe pas.
added in remote
  their  100644 a5e06ea24fabdb4e959cae3fd161555468bd0c83 docs/MCP_AGENT_ROLES.md
@@ -0,0 +1,114 @@
+# MCP Agent Roles
+
+## Objectif
+
+Les agents MCP permettent d'identifier qui agit dans le portail ou via API : humain, ChatGPT, ConfigCloud, Claude, Codex ou service automatique. Chaque agent dispose de droits séparés et d'une stratégie d'approbation.
+
+## Agents par défaut
+
+### SuperAdmin MCP
+
+- Rôle : gouvernance globale.
+- Peut créer des agents.
+- Peut attribuer des rôles.
+- Peut valider les actions sensibles.
+- Requiert le token MCP maître.
+- Ne doit jamais être attribué automatiquement via un token GitHub.
+
+### Admin humain
+
+- Rôle : configuration et validation.
+- Peut lier repos ↔ serveurs.
+- Peut valider les PR d'onboarding.
+- Peut déclencher des déploiements si autorisé.
+
+### ChatGPT
+
+- Rôle : architecte superviseur.
+- Peut lire, analyser, documenter, proposer un plan.
+- Peut préparer des contenus de documentation.
+- Ne peut pas déployer.
+- Ne doit pas écrire sans validation humaine.
+
+### ConfigCloud
+
+- Rôle : connexion de répertoire/projet.
+- Peut identifier un dossier local ou serveur.
+- Peut détecter le remote Git.
+- Peut proposer le mapping repo ↔ serveur.
+- Peut déclencher l'inventaire du repository.
+- Écriture uniquement sur branche MCP si validée.
+
+### Claude
+
+- Rôle : rédaction longue, documentation projet, synthèse.
+- Peut proposer les fichiers Markdown MCP.
+- Peut préparer des corrections.
+- Écriture uniquement sur branche MCP avec validation.
```

## Décision provisoire

Aucun merge effectué.

Cette PR doit être classée selon les règles suivantes :

- garder si elle complète la gouvernance actuelle sans conflit ;
- déplacer si elle vise une mauvaise base ;
- refaire si elle chevauche la PR #6 ou contient trop de modifications obsolètes ;
- bloquer si elle dépend d’issues ouvertes, de secrets, de tokens, de serveur non audité ou de droits GitHub non confirmés.
