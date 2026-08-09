import { startHttpServer } from './server.js';
import { logger } from './logger.js';
import { startLiveStateEngine } from './liveState/engine.js';

startLiveStateEngine();

startHttpServer().catch((error) => {
  logger.fatal({ error }, 'Impossible de démarrer wealthtech_ssh_bridge');
});
