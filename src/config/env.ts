import 'dotenv/config';
import { z } from 'zod';

const EnvBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  MCP_AUTH_TOKEN: z.string().min(24, 'MCP_AUTH_TOKEN doit être long et aléatoire en production'),
  LOG_LEVEL: z.string().default('info'),
  S1_HOST: z.string().min(1),
  S1_PORT: z.coerce.number().int().positive().default(22),
  S1_USER: z.string().min(1).default('root'),
  S1_KEY_PATH: z.string().min(1),
  S2_HOST: z.string().min(1),
  S2_PORT: z.coerce.number().int().positive().default(22),
  S2_USER: z.string().min(1).default('root'),
  S2_KEY_PATH: z.string().min(1),
  PROTECTED_MODE: z.string().default('read_only_first'),
  ENABLE_WRITE_TOOLS: EnvBooleanSchema.default(false),
  OPCVM_DB_NAME: z.string().min(1).default('fund_opcvm'),
  GITHUB_ORG: z.string().default(''),
  GITHUB_TOKEN_FILE: z.string().default(''),
  GITHUB_API_BASE: z.string().url().default('https://api.github.com'),
  GITHUB_API_ALLOWED_HOSTS: z.string().default('api.github.com'),
  GITHUB_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(15_000),
  MCP_GITHUB_BOOTSTRAPPED: EnvBooleanSchema.default(false),
  MCP_GOVERNED_SESSIONS_ENABLED: EnvBooleanSchema.default(true),
  MCP_GOVERNED_SESSION_IDLE_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(86_400),
  MCP_GOVERNED_SESSION_RESUME_GRACE_SECONDS: z.coerce.number().int().min(3_600).max(2_592_000).default(604_800),
  MCP_GOVERNED_LOCK_DEFAULT_TTL_SECONDS: z.coerce.number().int().min(30).max(1_800).default(300),
  MCP_GOVERNED_LOCK_MAX_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(1_800),
  MCP_WRITE_GATE_MODE: z.enum(['off', 'shadow']).default('shadow'),
  MCP_OPERATIONAL_EVENT_MAX_BYTES: z.coerce.number().int().min(65_536).max(52_428_800).default(10_485_760),
  MCP_OPERATIONAL_EVENT_ARCHIVES: z.coerce.number().int().min(1).max(10).default(5)
}).superRefine((value, context) => {
  if (value.MCP_GOVERNED_LOCK_DEFAULT_TTL_SECONDS > value.MCP_GOVERNED_LOCK_MAX_TTL_SECONDS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MCP_GOVERNED_LOCK_DEFAULT_TTL_SECONDS'],
      message: 'Le TTL lock par défaut ne peut pas dépasser le TTL lock maximal'
    });
  }
});

export const env = EnvSchema.parse(process.env);
