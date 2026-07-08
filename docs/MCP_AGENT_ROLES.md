# MCP Agent Roles

## Objectif

Les agents MCP permettent d'identifier qui agit dans le portail ou via API : humain, ChatGPT, ConfigCloud, Claude, Codex ou service automatique. Chaque agent dispose de droits séparés et d'une stratégie d'approbation.

## Agents par défaut

### SuperAdmin MCP

- Rôle : gouvernance globale.
- Peut créer des agents.
- Peut attribuer des rôles.
- Peut valider les actions sensibles.
- Requiert le token MCP maître.
- Ne doit jamais être attribué automatiquement via un token GitHub.

### Admin humain

- Rôle : configuration et validation.
- Peut lier repos ↔ serveurs.
- Peut valider les PR d'onboarding.
- Peut déclencher des déploiements si autorisé.

### ChatGPT

- Rôle : architecte superviseur.
- Peut lire, analyser, documenter, proposer un plan.
- Peut préparer des contenus de documentation.
- Ne peut pas déployer.
- Ne doit pas écrire sans validation humaine.

### ConfigCloud

- Rôle : connexion de répertoire/projet.
- Peut identifier un dossier local ou serveur.
- Peut détecter le remote Git.
- Peut proposer le mapping repo ↔ serveur.
- Peut déclencher l'inventaire du repository.
- Écriture uniquement sur branche MCP si validée.

### Claude

- Rôle : rédaction longue, documentation projet, synthèse.
- Peut proposer les fichiers Markdown MCP.
- Peut préparer des corrections.
- Écriture uniquement sur branche MCP avec validation.

### Codex

- Rôle : agent technique code/test.
- Peut modifier du code sur branche MCP.
- Peut créer des tests.
- Peut corriger les erreurs de build.
- Peut ouvrir une PR.
- Ne déploie pas sans validation explicite.

### Agent serveur

- Rôle : inventaire et synchronisation serveur.
- Peut lire les chemins serveur autorisés.
- Peut produire des mappings.
- Ne peut pas pousser en production sans validation.

### Agent lecture seule

- Rôle : audit documentaire.
- Peut lire les repos et la documentation.
- Ne peut pas écrire.

### Agent déploiement

- Rôle : préparation ou exécution de déploiement.
- Préparation autorisée sur environnement contrôlé.
- Exécution uniquement avec droit explicite et audit.

### Agent audit

- Rôle : conformité, logs, inventaire.
- Lecture prioritaire.
- Écriture limitée aux rapports d'audit si autorisée.

## Structure d'un agent

```json
{
  "agentId": "mcp_agent_chatgpt",
  "agentName": "ChatGPT",
  "agentType": "ai_agent",
  "role": "architect_supervisor",
  "mcpRights": ["mcp.read", "mcp.audit", "mcp.configure"],
  "githubRightsAllowed": ["read", "branch_write_with_approval"],
  "allowedRepos": [],
  "allowedServers": [],
  "allowedActions": ["read", "plan", "document", "propose"],
  "requiresHumanApproval": true,
  "canReadRepos": true,
  "canWriteRepos": false,
  "canCreatePlans": true,
  "canCreateBranches": false,
  "canOpenPullRequests": false,
  "canDeploy": false,
  "createdAt": "2026-07-08T00:00:00.000Z",
  "expiresAt": null,
  "history": []
}
```

## Règle d'attribution

- Un agent inconnu commence en lecture minimale.
- Un agent IA doit être enregistré avant d'écrire.
- Un agent ConfigCloud doit être associé à un répertoire ou repository.
- Un agent déploiement ne peut être activé qu'après validation SuperAdmin.
