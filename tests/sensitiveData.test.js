import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidSensitivePin,
  maskPhone,
  maskStudentNo,
  normalizeSensitivePin,
} from '../src/utils/sensitiveData.js';
import {
  createPinCredential,
  getAttemptDecision,
  MAX_PIN_FAILURES,
  PIN_LOCK_MILLIS,
  verifyPinCredential,
} from '../functions/sensitiveAccess.js';

test('student identifiers are masked without changing already masked values', () => {
  assert.equal(maskPhone('010-2412-5634'), '010-24••-56••');
  assert.equal(maskPhone('010-24**-56**'), '010-24**-56**');
  assert.equal(maskStudentNo('20251234'), '2025••34');
  assert.equal(maskStudentNo('2025••34'), '2025••34');
});

test('sensitive PIN input accepts exactly four digits', () => {
  assert.equal(normalizeSensitivePin('12a34-5'), '1234');
  assert.equal(isValidSensitivePin('2407'), true);
  assert.equal(isValidSensitivePin('240'), false);
  assert.equal(isValidSensitivePin('24a7'), false);
});

test('PIN credentials are salted and verified with constant-length hashes', () => {
  const pepper = 'test-only-pepper-that-is-longer-than-thirty-two-characters';
  const first = createPinCredential('2407', pepper);
  const second = createPinCredential('2407', pepper);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(verifyPinCredential('2407', first, pepper), true);
  assert.equal(verifyPinCredential('0000', first, pepper), false);
});

test('five failed PIN attempts create a ten-minute lock', () => {
  const now = 1_000_000;
  let attempt = {};
  for (let index = 0; index < MAX_PIN_FAILURES; index += 1) {
    attempt = getAttemptDecision(attempt, false, now);
  }
  assert.equal(attempt.locked, true);
  assert.equal(attempt.lockUntilMillis, now + PIN_LOCK_MILLIS);
  const locked = getAttemptDecision(attempt, true, now + 1000);
  assert.equal(locked.allowed, false);
  assert.equal(locked.locked, true);
});
