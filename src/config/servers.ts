import { env } from './env.js';

export type ServerId = 's1' | 's2';

export interface ManagedServerConfig {
  id: ServerId;
  label: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  protectedDomains: string[];
}

export const managedServers: Record<ServerId, ManagedServerConfig> = {
  s1: {
    id: 's1',
    label: 'S1 - serveur principal / destination',
    host: env.S1_HOST,
    port: env.S1_PORT,
    username: env.S1_USER,
    privateKeyPath: env.S1_KEY_PATH,
    protectedDomains: [
      'niakara.com',
      'www.niakara.com',
      'api.niakara.com',
      'wealthtechinnovations.com',
      'api.wealthtechinnovations.com',
      'stablecoin.wealthtechinnovations.com',
      'api.stablecoin.wealthtechinnovations.com',
      'blockchain.wealthtechinnovations.com',
      'tokenfactory.wealthtechinnovations.com',
      'wealthtechinnovation.com',
      'berebytours.com'
    ]
  },
  s2: {
    id: 's2',
    label: 'S2 - serveur source / migration / nettoyage sélectif',
    host: env.S2_HOST,
    port: env.S2_PORT,
    username: env.S2_USER,
    privateKeyPath: env.S2_KEY_PATH,
    protectedDomains: [
      'africafunds.chainsolutions.fr',
      'api.africafunds.chainsolutions.fr',
      'api.stablecoin.chainsolutions.fr',
      'stablecoin.chainsolutions.fr',
      'brvm.chainsolutions.fr',
      'bvmac.chainsolutions.fr',
      'chainsolutions.fr',
      'Funds.chainsolutions.fr',
      'api.funds.chainsolutions.fr'
    ]
  }
};
