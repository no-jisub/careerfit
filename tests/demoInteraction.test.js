import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_COUNSELOR_UID,
  DEMO_STORAGE_KEYS,
  DEMO_STUDENT_UID,
  filterNotificationsForRecipient,
  getSessionActorUid,
} from '../src/utils/demoInteraction.js';

test('demo counselor and student resolve to stable shared actor ids', () => {
  assert.equal(getSessionActorUid({ role: 'counselor' }), DEMO_COUNSELOR_UID);
  assert.equal(getSessionActorUid({ role: 'student' }), DEMO_STUDENT_UID);
  assert.equal(getSessionActorUid({ userUid: 'real-user', role: 'student' }), 'real-user');
});

test('event notifications are visible only to their intended recipient', () => {
  const notifications = [
    { id: 'for-counselor', recipientUid: DEMO_COUNSELOR_UID },
    { id: 'for-student', recipientUid: DEMO_STUDENT_UID },
    { id: 'legacy-without-recipient' },
  ];
  assert.deepEqual(
    filterNotificationsForRecipient(notifications, DEMO_COUNSELOR_UID).map(item => item.id),
    ['for-counselor'],
  );
  assert.deepEqual(
    filterNotificationsForRecipient(notifications, DEMO_STUDENT_UID).map(item => item.id),
    ['for-student'],
  );
});

test('all interactive demo stores use one shared browser namespace', () => {
  assert.equal(new Set(Object.values(DEMO_STORAGE_KEYS)).size, Object.keys(DEMO_STORAGE_KEYS).length);
  assert.ok(DEMO_STORAGE_KEYS.appointments);
  assert.ok(DEMO_STORAGE_KEYS.followUps);
  assert.ok(DEMO_STORAGE_KEYS.consultationSummaries);
  assert.ok(DEMO_STORAGE_KEYS.programRecommendations);
});
