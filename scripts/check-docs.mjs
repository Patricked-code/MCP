import { existsSync } from 'node:fs';

const required = [
  'docs/GPT.md',
  'docs/SUIVI.md',
  'docs/README_DEV.md',
  'docs/ROADMAP.md',
  'docs/TODO.md',
  'docs/TASKS.md',
  'docs/CODE_REVIEW.md',
  'docs/CHANGELOG.md',
  'docs/DEPLOYMENT_PRODUCTION.md',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/MCP_TOOLS.md',
  'docs/AGENTS_ARCHITECTURE.md',
  'docs/AI_SKILLS.md',
  'docs/MCP_ONBOARDING_ENGINE.md',
  'docs/MCP_SECURITY_MODEL.md',
  'docs/MCP_AGENT_ROLES.md',
  'docs/MCP_REPO_FOOTPRINT.md',
  'docs/MCP_SERVER_MAPPING.md',
  'docs/MCP_AUDIT_LOGS.md',
  '.mcp/manifest.json',
  '.mcp/permissions.json',
  '.mcp/agents.json',
  '.mcp/server-map.json',
  '.mcp/onboarding.json',
  'MCP_PROJECT.md',
  'MCP_AGENT_RULES.md',
  'MCP_REPO_INVENTORY.md',
  'MCP_SERVER_MAPPING.md',
  'Migration/conversations-pdf/README.md',
  'Migration/conversations-md/README.md',
  'Migration/prompts/README.md',
  'Migration/agents/README.md',
  'Migration/decisions/README.md',
  'Migration/serveur/README.md',
  'Migration/github/README.md',
  'Migration/index/README.md',
  'Migration/index/SOURCE_REGISTRY.json',
  'Migration/index/SOURCE_INGESTION_STATUS.md',
  'Migration/index/PDF_TEXT_AUDIT.json',
  'Migration/index/PDF_TEXT_AUDIT_STATUS.md',
  'Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json',
  'Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md',
  'Migration/index/MCP_EXECUTION_TASKS.json',
  'Migration/index/MCP_EXECUTION_TASKS.md',
  'Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json',
  'Migration/index/BLOCKER_RESOLUTION_RUNBOOK.md',
  'Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json',
  'Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md',
  'Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json'
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Documentation manquante:\n${missing.join('\n')}`);
  globalThis.process.exitCode = 1;
} else {
  console.log('Documentation obligatoire présente.');
}
