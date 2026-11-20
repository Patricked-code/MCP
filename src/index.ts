import { startHttpServer } from './server.js';
import { logger } from './logger.js';
import { startLiveStateEngine } from './liveState/engine.js';
import { startConfiguredCugPilotReceiptConsumer } from './cug/receiptConsumerWiring.js';

startLiveStateEngine();

startHttpServer().then(startConfiguredCugPilotReceiptConsumer).catch((error) => {
  logger.fatal({ error }, 'Impossible de démarrer wealthtech_ssh_bridge');
});
