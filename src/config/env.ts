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
  OPCVM_DB_NAME: z.string().min(1).default('fund_opcvm')
});

export const env = EnvSchema.parse(process.env);
