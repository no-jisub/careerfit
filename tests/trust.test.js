import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvidenceCoverage } from '../src/utils/trust.js';

const fullEvidence = {
  summary: ['상담에서 직접 확인함'],
  concern: ['학생이 고민을 표현함'],
  programs: ['상담 내용과 프로그램 정보를 비교함'],
  followUpTasks: ['학생과 상담사의 다음 행동을 합의함'],
};

test('evidence coverage counts only fields with usable source evidence', () => {
  assert.equal(getEvidenceCoverage({ evidence: fullEvidence }), 100);
  assert.equal(getEvidenceCoverage({ evidence: { ...fullEvidence, summary: ['근거 부족'] } }), 75);
  assert.equal(getEvidenceCoverage({ evidence: { ...fullEvidence, concern: [] } }), 75);
  assert.equal(getEvidenceCoverage({ evidence: {} }), 0);
});
