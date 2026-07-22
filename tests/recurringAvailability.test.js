import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecurringAvailabilityPreview,
  listRecurringDates,
  validateRecurringAvailabilityRule,
} from '../src/utils/recurringAvailability.js';

const baseRule = {
  startDate: '2026-07-27', endDate: '2026-08-09', weekdays: [1, 3],
  startTime: '09:00', endTime: '14:00', location: '상담실',
  exclusions: [{ startTime: '12:00', endTime: '13:00' }], excludedDates: ['2026-08-03'],
};

test('recurring dates follow multiple weekdays and excluded dates', () => {
  assert.deepEqual(listRecurringDates(baseRule), ['2026-07-27', '2026-07-29', '2026-08-05']);
});

test('recurring rule is limited to twelve weeks', () => {
  assert.equal(validateRecurringAvailabilityRule({ ...baseRule, endDate: '2026-10-18' }), '');
  assert.match(validateRecurringAvailabilityRule({ ...baseRule, endDate: '2026-10-19' }), /12주/);
});

test('preview skips exclusions, appointments, existing slots, and times within 24 hours', () => {
  const result = buildRecurringAvailabilityPreview({
    rule: baseRule,
    counselorUid: 'counselor-1',
    now: new Date('2026-07-26T10:00:00'),
    createdAt: '2026-07-26T10:00:00.000Z',
    existingAvailability: [{ counselorUid: 'counselor-1', date: '2026-07-29', time: '10:00', endTime: '11:00', status: 'closed' }],
    appointments: [{ counselorUid: 'counselor-1', date: '2026-08-05', time: '09:00', endTime: '10:00', status: 'confirmed' }],
  });
  assert.equal(result.error, '');
  assert.deepEqual(result.summary, {
    matchingDates: 3,
    totalCandidates: 15,
    generated: 9,
    excludedDates: 1,
    excludedTimes: 3,
    tooSoon: 1,
    conflicts: 2,
  });
  assert.equal(result.slots.some(slot => slot.time === '12:00'), false);
  assert.ok(result.slots.every(slot => slot.source === 'recurring' && slot.duration === 60));
});

test('cancelled appointments do not block a slot but all existing availability does', () => {
  const oneSlotRule = { ...baseRule, startDate: '2026-07-29', endDate: '2026-07-29', weekdays: [3], startTime: '09:00', endTime: '10:00', exclusions: [], excludedDates: [] };
  const cancelled = buildRecurringAvailabilityPreview({ rule: oneSlotRule, counselorUid: 'c1', now: new Date('2026-07-27T00:00:00'), appointments: [{ counselorUid: 'c1', date: '2026-07-29', time: '09:00', endTime: '10:00', status: 'cancelled' }] });
  assert.equal(cancelled.slots.length, 1);
  const closedSlot = buildRecurringAvailabilityPreview({ rule: oneSlotRule, counselorUid: 'c1', now: new Date('2026-07-27T00:00:00'), existingAvailability: [{ counselorUid: 'c1', date: '2026-07-29', time: '09:00', endTime: '10:00', status: 'closed' }] });
  assert.equal(closedSlot.slots.length, 0);
  assert.equal(closedSlot.summary.conflicts, 1);
});
