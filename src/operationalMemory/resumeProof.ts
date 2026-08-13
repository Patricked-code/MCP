import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function derive(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function createResumeSecret(): string {
  return randomBytes(32).toString('base64url');
}

export async function hashResumeSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(secret, salt);
  return [
    'scrypt-v1',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    hash.toString('base64url')
  ].join('$');
}

export async function verifyResumeSecret(
  secret: string,
  encodedHash: string
): Promise<boolean> {
  if (secret.length < 32 || secret.length > 128) return false;
  const [version, rawN, rawR, rawP, rawSalt, rawHash, extra] = encodedHash.split('$');
  if (
    version !== 'scrypt-v1'
    || Number(rawN) !== SCRYPT_N
    || Number(rawR) !== SCRYPT_R
    || Number(rawP) !== SCRYPT_P
    || !rawSalt
    || !rawHash
    || extra !== undefined
  ) return false;

  try {
    const expected = Buffer.from(rawHash, 'base64url');
    const actual = await derive(secret, Buffer.from(rawSalt, 'base64url'));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
