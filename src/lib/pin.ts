import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const iterations = 120000;
const keyLength = 32;
const digest = "sha256";

export function validateParticipantPin(pin: unknown) {
  if (typeof pin !== "string") return "Elegí un PIN de 4 a 10 números para poder editar después.";
  const cleanPin = pin.trim();
  if (!/^\d{4,10}$/.test(cleanPin)) return "El PIN tiene que tener entre 4 y 10 números.";
  return null;
}

export function createPinHash(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(pin.trim(), salt, iterations, keyLength, digest).toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash?: string) {
  if (!storedHash) return false;
  const [scheme, iterationValue, salt, hash] = storedHash.split(":");
  if (scheme !== "pbkdf2" || !iterationValue || !salt || !hash) return false;
  const parsedIterations = Number(iterationValue);
  if (!Number.isInteger(parsedIterations) || parsedIterations < 1) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = pbkdf2Sync(pin.trim(), salt, parsedIterations, expected.length, digest);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
