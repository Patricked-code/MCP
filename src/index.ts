import { startHttpServer } from './server.js';
import { logger } from './logger.js';

startHttpServer().catch((error) => {
  logger.fatal({ error }, 'Impossible de démarrer wealthtech_ssh_bridge');
});
