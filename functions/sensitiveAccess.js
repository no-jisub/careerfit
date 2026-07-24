import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const MAX_PIN_FAILURES = 5;
export const PIN_LOCK_MILLIS = 10 * 60 * 1000;
export const REVEAL_SECONDS = 5 * 60;

export function validateSensitivePin(pin) {
  if (!/^\d{4}$/.test(String(pin))) {
    throw new Error('PIN은 4자리 숫자여야 합니다.');
  }
  return String(pin);
}

function derivePinHash(pin, salt, pepper) {
  return scryptSync(`${pin}:${pepper}`, salt, 64).toString('hex');
}

export function createPinCredential(pin, pepper) {
  const normalizedPin = validateSensitivePin(pin);
  if (!pepper || pepper.length < 32) throw new Error('PIN 보안 키가 올바르게 설정되지 않았습니다.');
  const salt = randomBytes(24).toString('hex');
  return {
    algorithm: 'scrypt-v1',
    salt,
    hash: derivePinHash(normalizedPin, salt, pepper),
  };
}

export function verifyPinCredential(pin, credential, pepper) {
  try {
    const normalizedPin = validateSensitivePin(pin);
    if (credential?.algorithm !== 'scrypt-v1' || !credential?.salt || !credential?.hash || !pepper) return false;
    const supplied = Buffer.from(derivePinHash(normalizedPin, credential.salt, pepper), 'hex');
    const expected = Buffer.from(credential.hash, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export function getAttemptDecision(attempt = {}, verified, nowMillis = Date.now()) {
  const lockUntilMillis = Number(attempt.lockUntilMillis || 0);
  if (lockUntilMillis > nowMillis) {
    return {
      allowed: false,
      locked: true,
      failureCount: Number(attempt.failureCount || 0),
      lockUntilMillis,
      retryAfterSeconds: Math.ceil((lockUntilMillis - nowMillis) / 1000),
    };
  }
  if (verified) {
    return { allowed: true, locked: false, failureCount: 0, lockUntilMillis: 0, retryAfterSeconds: 0 };
  }
  const failureCount = Number(attempt.failureCount || 0) + 1;
  const shouldLock = failureCount >= MAX_PIN_FAILURES;
  const nextLockUntil = shouldLock ? nowMillis + PIN_LOCK_MILLIS : 0;
  return {
    allowed: false,
    locked: shouldLock,
    failureCount: shouldLock ? 0 : failureCount,
    lockUntilMillis: nextLockUntil,
    retryAfterSeconds: shouldLock ? PIN_LOCK_MILLIS / 1000 : 0,
  };
}

export function maskPhoneForStorage(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8) throw new Error('연락처 형식이 올바르지 않습니다.');
  const prefix = digits.slice(0, 3);
  const middle = digits.slice(3, -4);
  const suffix = digits.slice(-4);
  return `${prefix}-${middle.slice(0, 2)}${'*'.repeat(Math.max(0, middle.length - 2))}-${suffix.slice(0, 2)}**`;
}
