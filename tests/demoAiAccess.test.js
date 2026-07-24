import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_AI_GLOBAL_DAILY_LIMIT,
  DEMO_AI_SESSION_DAILY_LIMIT,
  getDemoQuotaDocumentIds,
  isAllowedDemoOrigin,
  isAnonymousFirebaseAuth,
} from '../functions/demoAiAccess.js';

test('demo AI accepts only Firebase anonymous authentication', () => {
  assert.equal(isAnonymousFirebaseAuth({
    token: { firebase: { sign_in_provider: 'anonymous' } },
  }), true);
  assert.equal(isAnonymousFirebaseAuth({
    token: { firebase: { sign_in_provider: 'password' } },
  }), false);
  assert.equal(isAnonymousFirebaseAuth(null), false);
});

test('demo AI is limited to CareerFit production and local development origins', () => {
  assert.equal(isAllowedDemoOrigin('https://careerfit-aiboost-a601a.web.app'), true);
  assert.equal(isAllowedDemoOrigin('https://careerfit-aiboost-a601a.firebaseapp.com'), true);
  assert.equal(isAllowedDemoOrigin('http://localhost:5000'), true);
  assert.equal(isAllowedDemoOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isAllowedDemoOrigin('https://example.com'), false);
  assert.equal(isAllowedDemoOrigin(''), false);
});

test('demo AI quota keys separate the anonymous session and global usage', () => {
  assert.equal(DEMO_AI_SESSION_DAILY_LIMIT, 15);
  assert.equal(DEMO_AI_GLOBAL_DAILY_LIMIT, 100);
  assert.deepEqual(getDemoQuotaDocumentIds('anonymous-uid', '2026-07-24'), {
    session: 'anonymous-uid_2026-07-24',
    global: '_global_2026-07-24',
  });
  assert.throws(() => getDemoQuotaDocumentIds('', '2026-07-24'), /올바르지 않습니다/);
});
