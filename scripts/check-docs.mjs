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
  'docs/MCP_AUDIT_LOGS.md'
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Documentation manquante:\n${missing.join('\n')}`);
  globalThis.process.exitCode = 1;
} else {
  console.log('Documentation obligatoire présente.');
}
