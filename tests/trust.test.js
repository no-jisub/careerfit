import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvidenceCoverage } from '../src/utils/trust.js';

const fullEvidence = {
  summary: ['상담에서 직접 확인함'],
  strengths: ['과제를 완료한 경험'],
  concern: ['학생이 고민을 표현함'],
  guidance: ['상담사가 자료를 안내함'],
};

test('evidence coverage counts only fields with usable source evidence', () => {
  assert.equal(getEvidenceCoverage({ evidence: fullEvidence }), 100);
  assert.equal(getEvidenceCoverage({ evidence: { ...fullEvidence, summary: ['근거 부족'] } }), 50);
  assert.equal(getEvidenceCoverage({ evidence: { ...fullEvidence, concern: [] } }), 50);
  assert.equal(getEvidenceCoverage({ evidence: {} }), 0);
});
