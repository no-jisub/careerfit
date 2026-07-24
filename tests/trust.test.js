import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvidenceCoverage, summarizeTrustPosture } from '../src/utils/trust.js';

const fullEvidence = {
  summary: ['상담에서 직접 확인함'],
  strengths: ['과제를 완료한 경험'],
  concern: ['학생이 고민을 표현함'],
  guidance: ['상담사가 자료를 안내함'],
};

test('evidence coverage counts only fields with usable source evidence', () => {
  assert.equal(getEvidenceCoverage({ evidence: fullEvidence }), 100);
  assert.equal(getEvidenceCoverage({ evidence: { ...fullEvidence, strengths: ['근거 부족'], guidance: [] } }), 50);
  assert.equal(getEvidenceCoverage({ evidence: {} }), 0);
});

test('trust posture score is transparently derived from stored controls', () => {
  const posture = summarizeTrustPosture({
    consultations: [{
      aiReview: {
        evidence: fullEvidence,
        reviewedAt: '2026-07-24T01:00:00.000Z',
        reviewedBy: '박지현',
        identifiersRedacted: true,
        sensitiveWarning: ['공개 범위 확인'],
      },
    }],
    summaries: [{ published: true, provenance: { type: 'ai-assisted' } }],
    drafts: [{ expiresAt: '2026-07-30T00:00:00.000Z' }],
    now: new Date('2026-07-24T00:00:00.000Z'),
  });
  assert.equal(posture.score, 100);
  assert.equal(posture.status, '안정');
  assert.equal(posture.warningCount, 1);
  assert.equal(posture.publishedAiCount, 1);
  assert.equal(posture.ttlCoverage, 100);
});

test('expired drafts lower only the retention component of trust score', () => {
  const posture = summarizeTrustPosture({
    consultations: [{
      aiReview: {
        evidence: fullEvidence,
        reviewedAt: '2026-07-24T01:00:00.000Z',
        reviewedBy: '박지현',
        identifiersRedacted: true,
        sensitiveWarning: [],
      },
    }],
    drafts: [{ expiresAt: '2026-07-20T00:00:00.000Z' }],
    now: new Date('2026-07-24T00:00:00.000Z'),
  });
  assert.equal(posture.ttlCoverage, 0);
  assert.equal(posture.score, 90);
});
