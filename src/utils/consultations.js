export const consultationPublicFieldOptions = [
  { key: 'summary', label: '상담 요약' },
  { key: 'strengths', label: '학생의 강점' },
  { key: 'concern', label: '개선 또는 고민 사항' },
  { key: 'programs', label: '추천 프로그램' },
  { key: 'studentActions', label: '상담 후 할 일' },
  { key: 'nextCheckItems', label: '다음 상담 계획' },
];

export const consultationEvidenceFieldOptions = [
  { key: 'summary', label: '상담 주요 내용' },
  { key: 'strengths', label: '학생의 강점' },
  { key: 'concern', label: '학생의 고민과 목표' },
  { key: 'guidance', label: '담당자의 안내 내용' },
];

export const defaultConsultationVisibility = Object.fromEntries(
  consultationPublicFieldOptions.map(item => [item.key, true]),
);

export function buildConsultationSummary(consultation, visibility = defaultConsultationVisibility) {
  const visibleFields = consultationPublicFieldOptions.filter(item => visibility[item.key]).map(item => item.key);
  const isVisible = key => visibleFields.includes(key);
  return {
    id: consultation.id,
    consultationId: consultation.id,
    studentId: consultation.studentId,
    studentUid: consultation.studentUid || '',
    counselorUid: consultation.counselorUid || '',
    counselor: consultation.counselor || '',
    date: consultation.date,
    type: consultation.type,
    purpose: consultation.purpose,
    summary: isVisible('summary') ? consultation.summary || '' : '',
    strengths: isVisible('strengths') ? consultation.strengths || '' : '',
    concern: isVisible('concern') ? consultation.concern || '' : '',
    programs: isVisible('programs') ? consultation.programs || [] : [],
    studentActions: isVisible('studentActions') ? consultation.studentActions || '' : '',
    nextCheckItems: isVisible('nextCheckItems') ? consultation.nextCheckItems || '' : '',
    visibleFields,
    published: visibleFields.length > 0 && consultation.studentVisible !== false,
    provenance: consultation.aiReview ? {
      type: 'ai-assisted',
      reviewedAt: consultation.aiReview.reviewedAt || '',
      reviewedBy: consultation.aiReview.reviewedBy || consultation.counselor || '',
    } : {
      type: 'counselor-authored',
      reviewedAt: consultation.updatedAt || consultation.createdAt || `${consultation.date}T00:00:00.000Z`,
      reviewedBy: consultation.counselor || '상담 담당자',
    },
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
  };
}
