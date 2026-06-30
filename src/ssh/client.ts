import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { managedServers, type ServerId } from '../config/servers.js';
import { logger } from '../logger.js';
import { assertReadOnlyCommand } from './safety.js';

export interface CommandResult {
  server: ServerId;
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
}

export async function runReadOnlyCommand(serverId: ServerId, command: string): Promise<CommandResult> {
  assertReadOnlyCommand(command);
  const server = managedServers[serverId];
  logger.info({ serverId, command }, 'Exécution SSH read-only demandée');

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream
            .on('close', (code: number | null) => {
              conn.end();
              resolve({ server: serverId, command, stdout, stderr, code });
            })
            .on('data', (data: Buffer) => {
              stdout += data.toString('utf8');
            });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString('utf8');
          });
        });
      })
      .on('error', reject)
      .connect({
        host: server.host,
        port: server.port,
        username: server.username,
        privateKey: readFileSync(server.privateKeyPath)
      });
  });
}
