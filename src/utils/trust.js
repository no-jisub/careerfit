import { consultationEvidenceFieldOptions } from './consultations.js';

const isUsableEvidence = value => typeof value === 'string'
  && value.trim().length > 0
  && !value.includes('근거 부족');

const asDate = value => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function getEvidenceCoverage(review) {
  const evidence = review?.evidence || {};
  const supported = consultationEvidenceFieldOptions.filter(({ key }) =>
    Array.isArray(evidence[key]) && evidence[key].some(isUsableEvidence),
  ).length;
  return Math.round((supported / consultationEvidenceFieldOptions.length) * 100);
}

export function summarizeTrustPosture({ consultations = [], summaries = [], drafts = [], now = new Date() }) {
  const aiConsultations = consultations.filter(item => item.aiReview);
  const aiCount = aiConsultations.length;
  const averageEvidenceCoverage = aiCount
    ? Math.round(aiConsultations.reduce((sum, item) => sum + getEvidenceCoverage(item.aiReview), 0) / aiCount)
    : 0;
  const reviewedCount = aiConsultations.filter(item => Boolean(item.aiReview.reviewedAt && item.aiReview.reviewedBy)).length;
  const humanReviewRate = aiCount ? Math.round((reviewedCount / aiCount) * 100) : 0;
  const redactedCount = aiConsultations.filter(item => item.aiReview.identifiersRedacted === true).length;
  const redactionRate = aiCount ? Math.round((redactedCount / aiCount) * 100) : 0;
  const ttlDraftCount = drafts.filter(item => {
    const expiresAt = asDate(item.expiresAt);
    return expiresAt && expiresAt > now;
  }).length;
  const ttlCoverage = drafts.length ? Math.round((ttlDraftCount / drafts.length) * 100) : 100;
  const warningCount = aiConsultations.reduce((sum, item) => sum + (item.aiReview.sensitiveWarning?.length || 0), 0);
  const publishedAiCount = summaries.filter(item => item.published && item.provenance?.type === 'ai-assisted').length;
  const score = Math.round(
    averageEvidenceCoverage * 0.4
    + humanReviewRate * 0.3
    + redactionRate * 0.2
    + ttlCoverage * 0.1,
  );

  return {
    score,
    status: score >= 90 ? '안정' : score >= 75 ? '점검 필요' : '개선 필요',
    aiCount,
    reviewedCount,
    averageEvidenceCoverage,
    humanReviewRate,
    redactionRate,
    ttlCoverage,
    ttlDraftCount,
    warningCount,
    publishedAiCount,
  };
}
