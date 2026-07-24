import { consultationEvidenceFieldOptions } from './consultations.js';

const isUsableEvidence = value => typeof value === 'string'
  && value.trim().length > 0
  && !value.includes('근거 부족');

export function getEvidenceCoverage(review) {
  const evidence = review?.evidence || {};
  const supported = consultationEvidenceFieldOptions.filter(({ key }) =>
    Array.isArray(evidence[key]) && evidence[key].some(isUsableEvidence),
  ).length;
  return Math.round((supported / consultationEvidenceFieldOptions.length) * 100);
}
