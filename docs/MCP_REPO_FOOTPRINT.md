# MCP Repo Footprint

## Fichiers obligatoires

- `.mcp/manifest.json`;
- `.mcp/permissions.json`;
- `.mcp/agents.json`;
- `.mcp/server-map.json`;
- `.mcp/onboarding.json`;
- `MCP_PROJECT.md`;
- `MCP_AGENT_RULES.md`;
- `MCP_REPO_INVENTORY.md`;
- `MCP_SERVER_MAPPING.md`;
- `README.md`;
- `SUIVI.md` ou `TASKS.md`;
- `DEPLOYMENT.md`;
- `SECURITY.md`.

## Role des fichiers

Les fichiers `.mcp` donnent la configuration machine lisible par le MCP. Les fichiers Markdown expliquent le projet, les agents, l inventaire repo et le mapping serveur pour les humains et les agents IA.

## Statuts

- `not_configured`: aucun fichier MCP significatif;
- `partial`: certains fichiers existent mais la gouvernance est incomplete;
- `ready`: empreinte complete;
- `needs_review`: fichier critique manquant ou incoherence de securite.

## Strategie de generation

Le moteur genere des fichiers prets a proposer sur branche `mcp/onboarding-setup`. Les contenus sont volontairement sans secret et contiennent des placeholders a verifier.

## Strategie de mise a jour

Un fichier existant ne doit pas etre ecrase aveuglement. Les futures mises a jour doivent comparer l empreinte existante, proposer un merge logique et ouvrir une pull request.
