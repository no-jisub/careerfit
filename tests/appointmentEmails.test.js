import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppointmentEmailMessage,
  buildAppointmentMailId,
  getAppointmentEmailEvent,
  normalizeNotificationEmail,
} from '../functions/appointmentEmail.js';

const pendingAppointment = {
  id: 'appointment-1',
  requestedBy: 'student',
  status: 'pending',
  studentUid: 'student-1',
  counselorUid: 'counselor-1',
  date: '2026-07-26',
  time: '14:00',
  location: '대학일자리플러스센터 상담실 2',
};

test('student appointment requests email the assigned counselor', () => {
  const event = getAppointmentEmailEvent(null, pendingAppointment);
  assert.equal(event.key, 'student-requested');
  assert.equal(event.recipientUid, 'counselor-1');
  assert.equal(event.recipientRole, 'counselor');
});

test('student cancellations email the assigned counselor', () => {
  const event = getAppointmentEmailEvent(pendingAppointment, {
    ...pendingAppointment,
    status: 'cancelled',
    cancelledByRole: 'student',
  });
  assert.equal(event.key, 'student-cancelled');
  assert.equal(event.recipientUid, 'counselor-1');
});

test('counselor confirmations and cancellations email the student', () => {
  const confirmed = getAppointmentEmailEvent(pendingAppointment, {
    ...pendingAppointment,
    status: 'confirmed',
  });
  assert.equal(confirmed.key, 'counselor-confirmed');
  assert.equal(confirmed.recipientUid, 'student-1');

  const cancelled = getAppointmentEmailEvent(pendingAppointment, {
    ...pendingAppointment,
    status: 'cancelled',
    cancelledByRole: 'counselor',
  });
  assert.equal(cancelled.key, 'counselor-cancelled');
  assert.equal(cancelled.recipientUid, 'student-1');
});

test('non-student creation and repeated states do not queue emails', () => {
  assert.equal(getAppointmentEmailEvent(null, { ...pendingAppointment, requestedBy: 'counselor' }), null);
  assert.equal(getAppointmentEmailEvent(
    { ...pendingAppointment, status: 'confirmed' },
    { ...pendingAppointment, status: 'confirmed', updatedAt: 'later' },
  ), null);
});

test('mail ids are deterministic and messages exclude counseling content', () => {
  const event = getAppointmentEmailEvent(null, pendingAppointment);
  assert.equal(
    buildAppointmentMailId('appointment/1', event.key),
    'appointment-appointment-1-student-requested',
  );
  const message = buildAppointmentEmailMessage(event, {
    ...pendingAppointment,
    requestMessage: '이 내용은 메일에 포함되면 안 됩니다.',
  }, '김하늘');
  assert.match(message.text, /김하늘 학생이 상담을 신청했습니다/);
  assert.match(message.text, /2026-07-26 14:00/);
  assert.doesNotMatch(message.text, /이 내용은 메일에 포함되면 안 됩니다/);
});

test('notification email addresses are normalized and invalid values are rejected', () => {
  assert.equal(normalizeNotificationEmail('  STUDENT@Example.COM '), 'student@example.com');
  assert.equal(normalizeNotificationEmail('not-an-email'), '');
  assert.equal(normalizeNotificationEmail(''), '');
});
