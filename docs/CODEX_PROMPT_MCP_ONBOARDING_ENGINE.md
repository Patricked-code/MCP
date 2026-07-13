# Prompt Codex — MCP GitHub Governance & Onboarding Engine

Tu es Codex, agent technique principal du projet `chainsolutions-wealthtech`.

Interviens sur le repo MCP/GitHub existant pour créer le module `MCP GitHub Governance & Onboarding Engine`.

## Objectif

Transformer le MCP en superviseur central GitHub + serveurs + agents IA.

Le MCP doit :

- identifier les acteurs connectés ;
- vérifier les tokens MCP et GitHub sans jamais stocker de token brut ;
- contrôler les droits ;
- auditer chaque connexion ;
- lister les repos visibles ;
- détecter les fichiers MCP manquants ;
- générer une documentation projet ;
- créer les profils d'agents internes ;
- lier les repos aux dossiers serveur ;
- empêcher toute écriture directe sur `main`.

## Inspection obligatoire avant modification

Avant toute modification, inspecte entièrement le repo :

- arborescence ;
- routes existantes ;
- modules GitHub ;
- registre MCP/Git ;
- fichiers Markdown ;
- scripts de test ;
- configuration ;
- `package.json` ;
- état actuel de `/login`, `/dashboard`, `/git`, `/git/status`, `/git/connect`, `/github`, `/github/status`, `/github/:account`, `/github/connect`.

## Modules à créer ou compléter

```text
src/onboarding/identity.ts
src/onboarding/rights.ts
src/onboarding/questions.ts
src/onboarding/repoFootprint.ts
src/onboarding/agents.ts
src/onboarding/serverMapping.ts
src/onboarding/audit.ts
src/onboarding/types.ts
src/onboarding/index.ts
```

## Routes à ajouter ou compléter

```text
GET  /git/onboarding
POST /git/onboarding/start
POST /git/onboarding/answer
GET  /git/accounts
GET  /git/accounts/:account
GET  /git/repos
GET  /git/repos/:owner/:repo
POST /git/repos/:owner/:repo/bootstrap
GET  /git/agents
POST /git/agents/create
GET  /git/audit
```

## Fichiers à vérifier dans chaque repo

```text
.mcp/manifest.json
.mcp/permissions.json
.mcp/agents.json
.mcp/server-map.json
.mcp/onboarding.json
MCP_PROJECT.md
MCP_AGENT_RULES.md
MCP_REPO_INVENTORY.md
MCP_SERVER_MAPPING.md
README.md
SUIVI.md ou TASKS.md
DEPLOYMENT.md
SECURITY.md
```

## Règles impératives

- Ne jamais stocker de token brut.
- Ne jamais écrire directement sur `main`.
- Ne jamais créer de token GitHub depuis un mot de passe.
- Utiliser uniquement un token GitHub fourni ou une future GitHub App/OAuth.
- Réserver le rôle SuperAdmin au token MCP maître.
- Toute écriture doit passer par une branche MCP.
- Toute action sensible doit être auditée.
- Aucune régression des routes existantes.
- Aucune suppression destructive.
- Code typé, maintenable, testable et aligné avec l'architecture existante.

## Première question obligatoire du portail

Après connexion MCP, demander :

```text
Qui êtes-vous ?
A. ChatGPT
B. ConfigCloud
C. Autre agent / service
```

Si ChatGPT : rôle de supervision, analyse, plan et documentation proposée.

Si ConfigCloud : rôle de connexion de répertoire, détection remote GitHub, mapping repo ↔ serveur, contrôle `.mcp` et bootstrap.

## Livrable attendu

Une V1 propre, sécurisée et non destructive : documentation, typage, audit, détection des droits, création d'agents, inventaire repos, génération contrôlée des fichiers `.mcp`, branche MCP uniquement, puis rapport final.

## Tests

Lis d'abord les commandes disponibles dans `package.json`, puis exécute les commandes adaptées, typiquement :

```bash
npm run typecheck
npm run build
```

N'invente pas de commande qui n'existe pas.
