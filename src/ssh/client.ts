import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { managedServers, type ServerId } from '../config/servers.js';
import { logger } from '../logger.js';
import { assertReadOnlyCommand } from './safety.js';
import { assertNoCatastrophicCommand } from './writeSafety.js';

export interface CommandResult {
  server: ServerId;
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface GuardedCommandOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  intent?: string;
}

function appendLimited(current: string, data: Buffer, maxOutputBytes: number): string {
  if (Buffer.byteLength(current, 'utf8') >= maxOutputBytes) {
    return current;
  }
  const next = current + data.toString('utf8');
  if (Buffer.byteLength(next, 'utf8') <= maxOutputBytes) {
    return next;
  }
  return `${next.slice(0, maxOutputBytes)}\n...[sortie plafonnée par le MCP]`;
}

async function runCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  const server = managedServers[serverId];
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxOutputBytes = options.maxOutputBytes ?? 200_000;
  logger.info({ serverId, command, intent: options.intent ?? 'unspecified', timeoutMs }, 'Exécution SSH demandée');

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      conn.end();
      reject(new Error(`Timeout SSH après ${timeoutMs} ms`));
    }, timeoutMs);

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      conn.end();
      reject(error);
    };

    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            fail(err);
            return;
          }

          stream
            .on('close', (code: number | null) => {
              if (settled) {
                return;
              }
              settled = true;
              clearTimeout(timeout);
              conn.end();
              resolve({ server: serverId, command, stdout, stderr, code });
            })
            .on('data', (data: Buffer) => {
              stdout = appendLimited(stdout, data, maxOutputBytes);
            });

          stream.stderr.on('data', (data: Buffer) => {
            stderr = appendLimited(stderr, data, maxOutputBytes);
          });
        });
      })
      .on('error', fail)
      .connect({
        host: server.host,
        port: server.port,
        username: server.username,
        privateKey: readFileSync(server.privateKeyPath)
      });
  });
}

export async function runReadOnlyCommand(serverId: ServerId, command: string): Promise<CommandResult> {
  assertReadOnlyCommand(command);
  return runCommand(serverId, command, { intent: 'read_only', timeoutMs: 30_000, maxOutputBytes: 200_000 });
}

export async function runGuardedCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  assertNoCatastrophicCommand(command);
  return runCommand(serverId, command, options);
}
