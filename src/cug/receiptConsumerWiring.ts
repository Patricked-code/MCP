import { env } from '../config/env.js';
import { readGitRegistryEvidence } from '../github/registry.js';
import { logger } from '../logger.js';
import { readCugPilotPrivateKey } from './pilotCredentials.js';
import { collectCugPilotInventory } from './pilotInventory.js';
import { configureCugPilotReceiptConsumer, createCugPilotReceiptConsumer, startCugPilotReceiptPolling } from './receiptConsumer.js';

export function startConfiguredCugPilotReceiptConsumer(): void {
  const status = configureCugPilotReceiptConsumer({
    enabled: env.MCP_CUG_RECEIPT_CONSUMER_ENABLED, webhookEnabled: env.MCP_CUG_WEBHOOK_ENABLED,
    rawInstallationId: env.MCP_CUG_WEBHOOK_PILOT_INSTALLATION_ID
  }, start);
  if (status === 'invalid') {
    logger.warn({ reasonCode: 'CUG_RECEIPT_CONSUMER_SCOPE_UNAVAILABLE' }, 'Consommateur CUG inactif');
  }
}

function start(installationId: number): void {
  const consumer = createCugPilotReceiptConsumer({
    receiptDirectory: '/app/data/cug-webhook-receipts',
    inventoryDirectory: '/app/data/cug-receipt-inventory',
    installationId,
    collect: (id) => collectCugPilotInventory(id, {
      readPrivateKey: readCugPilotPrivateKey, fetchImpl: fetch, readRegistryEvidence: readGitRegistryEvidence,
      now: () => new Date()
    })
  });
  startCugPilotReceiptPolling({
    run: consumer.run,
    onSummary: ({ stored, coverageUnverified, failed }) => {
      if (coverageUnverified) logger.warn({ reasonCode: 'CUG_RECEIPT_COVERAGE_UNVERIFIED', coverageUnverified }, 'Couverture CUG non vérifiée');
      if (failed) logger.warn({ reasonCode: 'CUG_RECEIPT_REFRESH_RETRY_PENDING', failed }, 'Traitement CUG partiel');
      if (stored) logger.info({ stored }, 'Inventaire CUG actualisé');
    },
    onError: () => logger.warn({ reasonCode: 'CUG_RECEIPT_SCAN_UNAVAILABLE' }, 'Journal CUG indisponible')
  });
}
