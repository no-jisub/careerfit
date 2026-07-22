import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConsultationFeedback,
  buildFeedbackNotification,
  buildFeedbackRequestNotification,
  canCreateFeedback,
  canEditFeedback,
  getFeedbackForAppointment,
  summarizeConsultationFeedback,
  validateFeedbackInput,
} from '../src/utils/feedback.js';

const appointment = { id: 'appointment-1', consultationId: 'consultation-1', studentId: 'student-1', studentUid: 'student-uid', counselorUid: 'counselor-uid', status: 'completed' };
const input = { overallScore: 5, helpfulnessScore: 4, clarityScore: 5, needsFollowUp: true, comment: '도움이 됐어요.' };

test('feedback is available once for a completed appointment owned by the student', () => {
  assert.equal(canCreateFeedback(appointment, 'student-uid'), true);
  assert.equal(canCreateFeedback({ ...appointment, status: 'confirmed' }, 'student-uid'), false);
  assert.equal(canCreateFeedback(appointment, 'other-student'), false);
  assert.equal(canCreateFeedback(appointment, 'student-uid', { id: 'existing' }), false);
});

test('feedback validates all scores, follow-up choice and comment length', () => {
  assert.deepEqual(validateFeedbackInput(input), {});
  const errors = validateFeedbackInput({ ...input, overallScore: 6, clarityScore: 0, needsFollowUp: null, comment: 'a'.repeat(1001) });
  assert.ok(errors.overallScore && errors.clarityScore && errors.needsFollowUp && errors.comment);
});

test('feedback uses appointment id as a stable one-per-appointment document id', () => {
  const result = buildConsultationFeedback({ appointment, studentUid: 'student-uid', input, now: new Date('2026-07-23T10:00:00Z') });
  assert.equal(result.value.id, 'feedback-appointment-1');
  assert.equal(result.value.appointmentId, appointment.id);
  assert.equal(result.value.consultationId, 'consultation-1');
  assert.equal(result.value.submittedAt, '2026-07-23T10:00:00.000Z');
  assert.equal(getFeedbackForAppointment([result.value], appointment.id)?.overallScore, 5);
});

test('student can edit feedback for seven days while preserving first submitted time', () => {
  const original = buildConsultationFeedback({ appointment, studentUid: 'student-uid', input, now: new Date('2026-07-23T10:00:00Z') }).value;
  assert.equal(canEditFeedback(original, 'student-uid', new Date('2026-07-30T10:00:00Z')), true);
  assert.equal(canEditFeedback(original, 'student-uid', new Date('2026-07-30T10:00:01Z')), false);
  assert.equal(canEditFeedback(original, 'other-student', new Date('2026-07-24T10:00:00Z')), false);
  const updated = buildConsultationFeedback({ appointment, studentUid: 'student-uid', input: { ...input, overallScore: 4 }, existingFeedback: original, now: new Date('2026-07-24T10:00:00Z') }).value;
  assert.equal(updated.overallScore, 4);
  assert.equal(updated.submittedAt, original.submittedAt);
  assert.equal(updated.updatedAt, '2026-07-24T10:00:00.000Z');
});

test('feedback creates a deterministic counselor notification', () => {
  const feedback = buildConsultationFeedback({ appointment, studentUid: 'student-uid', input, now: new Date('2026-07-23T10:00:00Z') }).value;
  const notification = buildFeedbackNotification(feedback, '김학생');
  assert.equal(notification.recipientUid, 'counselor-uid');
  assert.equal(notification.type, 'feedback');
  assert.match(notification.description, /5점/);
});

test('completed appointment can create a feedback request notification for the student', () => {
  const notification = buildFeedbackRequestNotification({ ...appointment, date: '2026-07-23', time: '10:00' }, '2026-07-23T11:00:00.000Z');
  assert.equal(notification.recipientUid, 'student-uid');
  assert.equal(notification.actorUid, 'counselor-uid');
  assert.equal(notification.to, '/student?feedback=appointment-1');
});

test('feedback statistics include response and follow-up-needed rates', () => {
  const first = buildConsultationFeedback({ appointment, studentUid: 'student-uid', input, now: new Date('2026-07-23T10:00:00Z') }).value;
  const second = { ...first, id: 'feedback-appointment-2', appointmentId: 'appointment-2', overallScore: 3, helpfulnessScore: 4, clarityScore: 3, needsFollowUp: false };
  const stats = summarizeConsultationFeedback([first, second], [appointment, { ...appointment, id: 'appointment-2' }, { ...appointment, id: 'appointment-3' }]);
  assert.deepEqual(stats, { responseCount: 2, eligibleCount: 3, responseRate: 67, overallAverage: 4, helpfulnessAverage: 4, clarityAverage: 4, followUpNeededCount: 1, followUpNeededRate: 50 });
});
