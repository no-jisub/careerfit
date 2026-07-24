import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDirectIdentifiers } from '../src/utils/privacy.js';

test('privacy preflight reports identifier types and counts without returning values', () => {
  const result = detectDirectIdentifiers('연락처 010-1234-5678, 이메일 student@example.com, 주민번호 990101-1234567');
  assert.equal(result.needsMasking, true);
  assert.equal(result.total, 3);
  assert.deepEqual(result.findings.map(item => item.type), ['residentId', 'email', 'phone']);
  assert.doesNotMatch(JSON.stringify(result), /010-1234-5678|student@example.com|990101-1234567/);
});

test('privacy preflight stays quiet when direct identifier formats are absent', () => {
  assert.deepEqual(detectDirectIdentifiers('학생은 UX 직무와 개발 직무 사이에서 고민하고 있음'), {
    findings: [],
    total: 0,
    needsMasking: false,
  });
});
