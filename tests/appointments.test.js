import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHourlyAvailabilitySlots,
  buildMonthCalendar,
  getAppointmentCancellationLabel,
  hasCounselorAppointmentConflict,
  hasCounselorAvailabilityConflict,
  restoreCounselorAvailabilityStore,
  upsertAppointmentById,
} from '../src/utils/appointments.js';

test('month calendar includes six complete weeks and marks past dates', () => {
  const days = buildMonthCalendar('2026-07-01', '2026-07-22');
  assert.equal(days.length, 42);
  assert.equal(days.find(day => day.date === '2026-07-21').isPast, true);
  assert.equal(days.find(day => day.date === '2026-07-22').isPast, false);
  assert.equal(days.filter(day => day.inMonth).length, 31);
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

test('expired built-in demo slots roll forward without changing counselor-created slots', () => {
  const fallback = [{ id: 'availability-demo-1', date: '2026-07-23', time: '10:00', status: 'open' }];
  const stored = [
    { id: 'availability-demo-1', date: '2026-07-10', time: '10:00', status: 'closed' },
    { id: 'availability-custom-1', date: '2026-07-10', time: '14:00', status: 'closed' },
  ];

  assert.deepEqual(restoreCounselorAvailabilityStore(stored, fallback, '2026-07-22'), [
    fallback[0],
    stored[1],
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
