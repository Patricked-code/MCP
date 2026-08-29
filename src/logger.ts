import pino from 'pino';
import { env } from './config/env.js';

export const LOGGER_REDACT_PATHS = [
  'req.headers.authorization',
  'authorization',
  '*.privateKey',
  '*.password',
  '*.token',
  'clientId',
  '*.clientId',
  'client_id',
  '*.client_id',
  'sessionId',
  '*.sessionId',
  'transportSessionId',
  '*.transportSessionId',
  'req.query.client_id',
  'req.url',
  'req.originalUrl'
] as const;

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [...LOGGER_REDACT_PATHS],
    censor: '[REDACTED]'
  },
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});
