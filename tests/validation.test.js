import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, isDateKey, validateAppointmentInput, validateConsultationInput } from '../src/utils/validation.js';

test('cleanText removes control characters and applies a maximum length', () => {
  assert.equal(cleanText('  상\u0000담 내용  ', 4), '상담 내');
});

test('isDateKey rejects calendar dates that do not exist', () => {
  assert.equal(isDateKey('2026-02-29'), false);
  assert.equal(isDateKey('2026-07-22'), true);
});

test('appointment validation blocks past appointments and empty locations', () => {
  assert.match(validateAppointmentInput({ studentId: 's1', date: '2026-07-21', time: '10:00', location: '상담실', type: '진로', preparation: '' }, '2026-07-22', '09:00').error, /과거/);
  assert.match(validateAppointmentInput({ studentId: 's1', date: '2026-07-23', time: '10:00', location: ' ', type: '진로', preparation: '' }, '2026-07-22', '09:00').error, /장소/);
});

test('consultation validation requires a meaningful private memo', () => {
  const result = validateConsultationInput({ date: '2026-07-22', purpose: '진로 탐색', rawMemo: '짧음', nextDate: '2026-08-01' });
  assert.match(result.error, /10자/);
});
