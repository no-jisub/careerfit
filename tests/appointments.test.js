import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasCounselorAppointmentConflict,
  hasCounselorAvailabilityConflict,
  upsertAppointmentById,
} from '../src/utils/appointments.js';

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
