import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConsultationSummary, defaultConsultationVisibility } from '../src/utils/consultations.js';
import { hasCounselorAppointmentConflict, isAvailabilityBookable } from '../src/utils/appointments.js';
import { validateCounselorRegistrationInput } from '../src/utils/validation.js';

const consultation = {
  id: 'c1', studentId: 's1', studentUid: 'student-1', counselorUid: 'counselor-1', counselor: '박지현',
  date: '2026-07-22', type: '진로 탐색', purpose: '직무 탐색', summary: '공개 요약', strengths: '문제 정의 역량',
  concern: '경험 부족', programs: ['UX 캠프'], studentActions: '직무 비교표 작성', nextCheckItems: '비교 결과 확인',
  guidance: '상담사만 보는 상세 안내', counselorActions: '내부 후속 조치', studentVisible: true,
  createdAt: '2026-07-22T00:00:00.000Z', updatedAt: '2026-07-22T00:00:00.000Z',
};

test('student summary contains only counselor-selected public fields', () => {
  const summary = buildConsultationSummary(consultation, { ...defaultConsultationVisibility, concern: false, programs: false });
  assert.equal(summary.summary, '공개 요약');
  assert.equal(summary.concern, '');
  assert.deepEqual(summary.programs, []);
  assert.equal('guidance' in summary, false);
  assert.equal('counselorActions' in summary, false);
  assert.equal(summary.published, true);
  assert.deepEqual(summary.provenance, {
    type: 'counselor-authored',
    reviewedAt: consultation.updatedAt,
    reviewedBy: '박지현',
  });
});

test('an empty publication selection hides the whole summary', () => {
  const summary = buildConsultationSummary(consultation, Object.fromEntries(Object.keys(defaultConsultationVisibility).map(key => [key, false])));
  assert.equal(summary.published, false);
  assert.deepEqual(summary.visibleFields, []);
});

test('AI-assisted summary discloses counselor review without exposing internal evidence', () => {
  const summary = buildConsultationSummary({
    ...consultation,
    aiReview: {
      reviewedAt: '2026-07-22T01:00:00.000Z',
      reviewedBy: '박지현',
      evidence: { summary: ['내부 근거'] },
    },
  });
  assert.deepEqual(summary.provenance, {
    type: 'ai-assisted',
    reviewedAt: '2026-07-22T01:00:00.000Z',
    reviewedBy: '박지현',
  });
  assert.equal('aiReview' in summary, false);
  assert.equal('evidence' in summary, false);
});

test('appointment conflict blocks only the same counselor active time slot', () => {
  const students = [{ id: 's1', counselorUid: 'c1' }, { id: 's2', counselorUid: 'c2' }];
  const appointments = [
    { id: 'a1', studentId: 's1', counselorUid: 'c1', date: '2026-08-01', time: '10:00', status: 'confirmed' },
    { id: 'a2', studentId: 's1', counselorUid: 'c1', date: '2026-08-01', time: '11:00', status: 'cancelled' },
  ];
  assert.equal(hasCounselorAppointmentConflict(appointments, students, { date: '2026-08-01', time: '10:00', counselorUid: 'c1' }), true);
  assert.equal(hasCounselorAppointmentConflict(appointments, students, { date: '2026-08-01', time: '10:00', counselorUid: 'c2' }), false);
  assert.equal(hasCounselorAppointmentConflict(appointments, students, { date: '2026-08-01', time: '11:00', counselorUid: 'c1' }), false);
});

test('student can book only an open future slot from the assigned counselor', () => {
  const student = { id: 's1', counselorUid: 'c1' };
  const slot = { id: 'slot-1', counselorUid: 'c1', date: '2026-08-01', time: '10:00', status: 'open' };
  assert.equal(isAvailabilityBookable(slot, student, [], '2026-07-22', '09:00'), true);
  assert.equal(isAvailabilityBookable({ ...slot, counselorUid: 'c2' }, student, [], '2026-07-22', '09:00'), false);
  assert.equal(isAvailabilityBookable({ ...slot, status: 'closed' }, student, [], '2026-07-22', '09:00'), false);
  assert.equal(isAvailabilityBookable(slot, student, [{ id: 'a1', availabilityId: 'slot-1', status: 'pending' }], '2026-07-22', '09:00'), false);
});

test('counselor signup requires a strong matching password', () => {
  assert.ok(validateCounselorRegistrationInput({ displayName: '새 상담사', email: 'counselor@example.com', password: 'weak', passwordConfirm: 'weak' }).error);
  assert.equal(validateCounselorRegistrationInput({ displayName: '새 상담사', email: 'counselor@example.com', password: 'career123', passwordConfirm: 'career123' }).value.email, 'counselor@example.com');
});
