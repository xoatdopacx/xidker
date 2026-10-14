import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt with N=2^15, r=8: about 32 MB and a few dozen milliseconds per hash.
const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const MAX_MEMORY = 128 * PARAMS.N * PARAMS.r * 2;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** NFC so a password typed on another keyboard (decomposed Vietnamese accents) still matches. Spaces are kept. */
export function normalizePassword(password: string): string {
  return password.normalize("NFC");
}

/** Stored as scrypt$N$r$p$salt$key so the cost can be raised later without breaking old hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(normalizePassword(password), salt, { ...PARAMS, maxmem: MAX_MEMORY });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltText, keyText] = stored.split("$");
  const N = Number(n);
  const R = Number(r);
  const P = Number(p);
  if (scheme !== "scrypt" || !saltText || !keyText || !(N > 1) || !(R > 0) || !(P > 0)) return false;
  const expected = Buffer.from(keyText, "base64url");
  const actual = await derive(normalizePassword(password), Buffer.from(saltText, "base64url"), {
    N,
    r: R,
    p: P,
    maxmem: 128 * N * R * 2,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null;

/** Checked against when an email has no account, so a wrong email takes as long as a wrong password. */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("base64url"));
  return dummyHash;
}
