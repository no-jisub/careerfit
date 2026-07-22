import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHourlyAvailabilitySlots,
  buildMonthCalendar,
  canBulkReopenAvailability,
  canRescheduleAppointment,
  closeAvailabilityAfterCancellation,
  createRescheduleRequest,
  holdAvailabilityForReschedule,
  getAppointmentCancellationLabel,
  hasCounselorAppointmentConflict,
  hasCounselorAvailabilityConflict,
  restoreCounselorAvailabilityStore,
  resolveCancelledAvailability,
  resolveRescheduleRequest,
  upsertAppointmentById,
} from '../src/utils/appointments.js';

test('month calendar includes six complete weeks and marks past dates', () => {
  const days = buildMonthCalendar('2026-07-01', '2026-07-22');
  assert.equal(days.length, 42);
  assert.equal(days.find(day => day.date === '2026-07-21').isPast, true);
  assert.equal(days.find(day => day.date === '2026-07-22').isPast, false);
  assert.equal(days.filter(day => day.inMonth).length, 31);
});

test('cancelled booking remains closed until counselor explicitly reopens it', () => {
  const appointment = { id: 'appointment-1', studentUid: 'student-1' };
  const slot = { id: 'slot-1', date: '2026-07-30', time: '10:00', status: 'booked' };
  const closed = closeAvailabilityAfterCancellation(slot, appointment, '2026-07-23T00:00:00.000Z');
  assert.equal(closed.status, 'closed');
  assert.equal(closed.reopenDecision, 'pending');
  const reopened = resolveCancelledAvailability(closed, 'reopen', new Date('2026-07-24T00:00:00.000Z')).value;
  assert.equal(reopened.status, 'open');
  assert.equal('appointmentId' in reopened, false);
});

test('past cancelled slot cannot be reopened', () => {
  const slot = { id: 'slot-1', date: '2026-07-20', time: '10:00', status: 'closed', closedReason: 'appointment-cancelled' };
  assert.match(resolveCancelledAvailability(slot, 'reopen', new Date('2026-07-23T00:00:00.000Z')).error, /지난/);
});

test('bulk reopen skips pending cancellation decisions and past slots', () => {
  const now = new Date('2026-07-23T00:00:00.000Z');
  assert.equal(canBulkReopenAvailability({ status: 'closed', date: '2026-07-24', time: '10:00' }, now), true);
  assert.equal(canBulkReopenAvailability({ status: 'closed', date: '2026-07-24', time: '10:00', closedReason: 'appointment-cancelled', reopenDecision: 'pending' }, now), false);
  assert.equal(canBulkReopenAvailability({ status: 'closed', date: '2026-07-22', time: '10:00' }, now), false);
});

test('reschedule is blocked within 24 hours and creates a pending request otherwise', () => {
  const appointment = { id: 'appointment-1', counselorUid: 'counselor-1', date: '2026-07-25', time: '12:00', status: 'confirmed' };
  assert.equal(canRescheduleAppointment(appointment, new Date('2026-07-24T13:00:00')), false);
  const result = createRescheduleRequest(appointment, { id: 'slot-2', counselorUid: 'counselor-1', date: '2026-07-27', time: '14:00', endTime: '15:00', duration: 60, location: '상담실', status: 'open' }, 'student', '', new Date('2026-07-23T00:00:00'));
  assert.equal(result.value.rescheduleRequest.status, 'pending');
  assert.equal(result.value.rescheduleRequest.date, '2026-07-27');
});

test('approved reschedule moves booking and preserves a visible history', () => {
  const appointment = { id: 'appointment-1', studentUid: 'student-1', counselorUid: 'counselor-1', availabilityId: 'slot-1', date: '2026-07-25', time: '12:00', status: 'confirmed' };
  const slot = { id: 'slot-2', counselorUid: 'counselor-1', date: '2026-07-27', time: '14:00', endTime: '15:00', duration: 60, location: '상담실', status: 'open' };
  const requested = createRescheduleRequest(appointment, slot, 'student', '', new Date('2026-07-23T00:00:00')).value;
  const held = holdAvailabilityForReschedule(slot, appointment, new Date('2026-07-23T00:00:00'));
  const result = resolveRescheduleRequest(requested, { id: 'slot-1', status: 'booked', appointmentId: appointment.id }, held, { approve: true, actorUid: 'counselor-1' }, new Date('2026-07-23T01:00:00')).value;
  assert.equal(result.appointment.date, '2026-07-27');
  assert.equal(result.originalAvailability.status, 'open');
  assert.equal(result.proposedAvailability.status, 'booked');
  assert.equal(result.appointment.rescheduleHistory[0].previousDate, '2026-07-25');
});

test('bulk availability creates one-hour slots and skips existing or booked times', () => {
  const result = buildHourlyAvailabilitySlots({
    dates: ['2026-07-22', '2026-07-23'],
    startTime: '09:00',
    endTime: '12:00',
    location: '상담실 1',
    counselorUid: 'counselor-1',
    nowDate: '2026-07-20',
    existingAvailability: [{ counselorUid: 'counselor-1', date: '2026-07-22', time: '10:00', endTime: '11:00', status: 'closed' }],
    appointments: [{ counselorUid: 'counselor-1', date: '2026-07-23', time: '09:00', endTime: '10:00', status: 'confirmed' }],
    createdAt: '2026-07-20T00:00:00.000Z',
  });
  assert.equal(result.error, '');
  assert.equal(result.slots.length, 4);
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.slots.map(slot => `${slot.date} ${slot.time}-${slot.endTime}`), [
    '2026-07-22 09:00-10:00',
    '2026-07-22 11:00-12:00',
    '2026-07-23 10:00-11:00',
    '2026-07-23 11:00-12:00',
  ]);
  assert.ok(result.slots.every(slot => slot.duration === 60 && slot.status === 'open'));
});

test('bulk availability omits lunch and other excluded time ranges', () => {
  const result = buildHourlyAvailabilitySlots({
    dates: ['2026-07-22'],
    startTime: '09:00',
    endTime: '18:00',
    exclusions: [{ startTime: '12:00', endTime: '13:00' }],
    location: '상담실 1',
    counselorUid: 'counselor-1',
    nowDate: '2026-07-20',
  });

  assert.equal(result.error, '');
  assert.equal(result.slots.length, 8);
  assert.equal(result.excluded, 1);
  assert.equal(result.slots.some(slot => slot.time === '12:00'), false);
  assert.equal(result.slots.some(slot => slot.time === '13:00'), true);
});

test('expired built-in demo slots roll forward without changing counselor-created slots', () => {
  const fallback = [{ id: 'availability-demo-1', date: '2026-07-23', time: '10:00', endTime: '11:00', duration: 60, status: 'open' }];
  const stored = [
    { id: 'availability-demo-1', date: '2026-07-10', time: '10:00', status: 'closed' },
    { id: 'availability-custom-1', date: '2026-07-10', time: '14:00', status: 'closed' },
  ];

  assert.deepEqual(restoreCounselorAvailabilityStore(stored, fallback, '2026-07-22'), [
    fallback[0],
    stored[1],
  ]);
});

test('legacy 50-minute demo slots migrate to one hour while preserving their status', () => {
  const fallback = [{ id: 'availability-demo-1', date: '2026-07-23', time: '10:00', endTime: '11:00', duration: 60, status: 'open' }];
  const stored = [{ id: 'availability-demo-1', date: '2026-07-23', time: '10:00', endTime: '10:50', duration: 50, status: 'closed' }];

  assert.deepEqual(restoreCounselorAvailabilityStore(stored, fallback, '2026-07-22'), [
    { ...fallback[0], status: 'closed' },
  ]);
});

test('appointment cancellation label identifies student and counselor cancellations', () => {
  assert.equal(getAppointmentCancellationLabel({ status: 'cancelled', cancelledByRole: 'student' }), '학생이 취소');
  assert.equal(getAppointmentCancellationLabel({ status: 'cancelled', cancelledByRole: 'counselor' }), '상담사가 취소');
  assert.equal(getAppointmentCancellationLabel({ status: 'cancelled', cancelledBy: 'student-1', studentUid: 'student-1' }), '학생이 취소');
  assert.equal(getAppointmentCancellationLabel({ status: 'cancelled' }), '취소 주체 미확인');
  assert.equal(getAppointmentCancellationLabel({ status: 'confirmed', cancelledByRole: 'student' }), '');
});

test('appointment upsert keeps one row when a realtime snapshot arrives before the save resolves', () => {
  const realtimeItem = { id: 'appointment-1', status: 'pending', updatedAt: 'first' };
  const savedItem = { ...realtimeItem, status: 'confirmed', updatedAt: 'second' };
  const result = upsertAppointmentById([realtimeItem], savedItem);

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], savedItem);
});

test('counselor appointment conflict detects overlapping ranges but allows adjacent ranges', () => {
  const appointments = [{
    id: 'appointment-1', studentId: 'student-1', counselorUid: 'counselor-1',
    date: '2026-07-30', time: '10:00', endTime: '10:50', status: 'confirmed',
  }];

  assert.equal(hasCounselorAppointmentConflict(appointments, [], {
    counselorUid: 'counselor-1', date: '2026-07-30', time: '10:30', endTime: '11:00',
  }), true);
  assert.equal(hasCounselorAppointmentConflict(appointments, [], {
    counselorUid: 'counselor-1', date: '2026-07-30', time: '10:50', endTime: '11:40',
  }), false);
});

test('counselor availability rejects overlapping open slots', () => {
  const availability = [{
    id: 'slot-1', counselorUid: 'counselor-1', date: '2026-07-30',
    time: '13:00', endTime: '13:50', status: 'open',
  }];

  assert.equal(hasCounselorAvailabilityConflict(availability, {
    counselorUid: 'counselor-1', date: '2026-07-30', time: '13:30', endTime: '14:00',
  }), true);
});
