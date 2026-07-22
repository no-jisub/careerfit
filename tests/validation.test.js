import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, isDateKey, validateAppointmentInput, validateAvailabilityInput, validateConsultationInput, validateStudentRegistrationInput } from '../src/utils/validation.js';

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

test('counselor availability requires a future slot and reasonable duration', () => {
  assert.match(validateAvailabilityInput({ date: '2026-07-21', time: '10:00', location: '상담실', duration: 50 }, '2026-07-22', '09:00').error, /과거/);
  assert.match(validateAvailabilityInput({ date: '2026-07-23', time: '10:00', location: '상담실', duration: 10 }, '2026-07-22', '09:00').error, /15분/);
  assert.equal(validateAvailabilityInput({ date: '2026-07-23', time: '10:00', location: '상담실', duration: 50 }, '2026-07-22', '09:00').value.duration, 50);
});

test('consultation validation requires a meaningful private memo', () => {
  const result = validateConsultationInput({ date: '2026-07-22', purpose: '진로 탐색', rawMemo: '짧음', nextDate: '2026-08-01' });
  assert.match(result.error, /10자/);
});

test('student registration requires verified identity fields and a strong matching password', () => {
  const base = {
    displayName: ' 김하늘 ', email: 'STUDENT@EXAMPLE.COM', password: 'careerfit1', passwordConfirm: 'careerfit1',
    studentNo: ' 20261234 ', department: ' 컴퓨터공학과 ', grade: '2학년', phone: '', interests: 'UX, 데이터 분석, UX', goal: '', concern: '', privacyConsent: true,
  };
  const valid = validateStudentRegistrationInput(base);
  assert.equal(valid.value.email, 'student@example.com');
  assert.equal(valid.value.studentNo, '20261234');
  assert.deepEqual(valid.value.interests, ['UX', '데이터 분석', 'UX']);
  assert.match(validateStudentRegistrationInput({ ...base, password: 'abcdefgh', passwordConfirm: 'abcdefgh' }).error, /영문과 숫자/);
  assert.match(validateStudentRegistrationInput({ ...base, passwordConfirm: 'different' }).error, /일치/);
  assert.match(validateStudentRegistrationInput({ ...base, privacyConsent: false }).error, /동의/);
});
