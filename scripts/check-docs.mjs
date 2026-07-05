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
  'Migration/conversations-pdf/README.md',
  'Migration/conversations-md/README.md',
  'Migration/prompts/README.md',
  'Migration/agents/README.md',
  'Migration/decisions/README.md',
  'Migration/serveur/README.md',
  'Migration/github/README.md',
  'Migration/index/README.md',
  'Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json'
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Documentation manquante:\n${missing.join('\n')}`);
  globalThis.process.exitCode = 1;
} else {
  console.log('Documentation obligatoire présente.');
}
