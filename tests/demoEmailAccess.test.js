import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_EMAIL_GLOBAL_DAILY_LIMIT,
  DEMO_EMAIL_SESSION_DAILY_LIMIT,
  getDemoEmailQuotaDocumentIds,
  sanitizeDemoEmailRequest,
} from '../functions/demoEmailAccess.js';

test('demo email input keeps only the minimum appointment information', () => {
  const input = sanitizeDemoEmailRequest({
    recipientEmail: '  TEST@Example.com ',
    eventKey: 'student-requested',
    studentName: '김하늘',
    appointment: {
      id: 'appointment-1',
      date: '2026-07-26',
      time: '14:00',
      location: '상담실 2',
      requestMessage: '메일에 포함되면 안 되는 상담 내용',
    },
  });
  assert.equal(input.recipientEmail, 'test@example.com');
  assert.deepEqual(Object.keys(input.appointment).sort(), ['date', 'id', 'location', 'time']);
  assert.equal('requestMessage' in input.appointment, false);
});

test('demo email input rejects invalid recipients and unsupported events', () => {
  assert.throws(() => sanitizeDemoEmailRequest({
    recipientEmail: 'invalid',
    eventKey: 'student-requested',
    appointment: { id: 'a1', date: '2026-07-26', time: '14:00' },
  }));
  assert.throws(() => sanitizeDemoEmailRequest({
    recipientEmail: 'test@example.com',
    eventKey: 'custom-event',
    appointment: { id: 'a1', date: '2026-07-26', time: '14:00' },
  }));
});

test('demo email quota keys separate session and global usage', () => {
  assert.deepEqual(getDemoEmailQuotaDocumentIds('anonymous-1', '2026-07-25'), {
    session: 'anonymous-1_2026-07-25',
    global: '_global_2026-07-25',
  });
  assert.equal(DEMO_EMAIL_SESSION_DAILY_LIMIT, 15);
  assert.equal(DEMO_EMAIL_GLOBAL_DAILY_LIMIT, 100);
});
