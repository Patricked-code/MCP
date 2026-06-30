import pino from 'pino';
import { env } from './config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'authorization', '*.privateKey', '*.password', '*.token'],
    censor: '[REDACTED]'
  },
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});
