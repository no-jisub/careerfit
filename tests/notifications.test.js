import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventNotification, mergeNotifications } from '../src/utils/notifications.js';

test('event notification id is deterministic to prevent duplicate events', () => {
  const input = { eventId: 'appointment-1-confirmed', recipientUid: 'student-1', actorUid: 'counselor-1', type: 'appointment', title: '예약 확정', description: '7월 30일 10시', to: '/student/appointments', createdAt: '2026-07-23T00:00:00.000Z' };
  assert.equal(buildEventNotification(input).id, buildEventNotification(input).id);
  assert.equal(buildEventNotification(input).readAt, '');
});

test('event and derived notifications merge without duplicate ids', () => {
  const event = { id: 'same', title: '저장 알림', createdAt: '2026-07-23T01:00:00.000Z' };
  const derived = [{ id: 'same', title: '파생 알림', date: '2026-07-23' }, { id: 'other', date: '2026-07-22' }];
  const result = mergeNotifications([event], derived);
  assert.equal(result.length, 2);
  assert.equal(result.find(item => item.id === 'same').title, '파생 알림');
});
