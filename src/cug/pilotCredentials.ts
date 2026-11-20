import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
export async function readCugPilotPrivateKey(): Promise<string> {
  const file = await open('/app/secrets/cug-app-private.pem', constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const bytes = Buffer.alloc(16385);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size >= bytes.length) {
      throw Error('CUG_PILOT_KEY_UNAVAILABLE');
    }
    let size = 0;
    while (size < bytes.length) {
      const { bytesRead } = await file.read(bytes, size, bytes.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== stat.size) throw Error('CUG_PILOT_KEY_UNAVAILABLE');
    return bytes.subarray(0, size).toString('utf8');
  } finally {
    bytes.fill(0);
    await file.close();
  }
}
