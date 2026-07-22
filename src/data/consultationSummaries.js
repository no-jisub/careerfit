import { initialConsultations } from './consultations';
import { buildConsultationSummary, defaultConsultationVisibility } from '../utils/consultations';

export const initialConsultationSummaries = initialConsultations.map(consultation => buildConsultationSummary({
  ...consultation,
  studentUid: consultation.studentId === 's1' ? 'demo-student-s1' : `demo-student-${consultation.studentId}`,
  counselorUid: 'demo-counselor',
  strengths: consultation.type === '진로 탐색' ? '새로운 역할을 탐색하고 비교하려는 태도가 좋음.' : '경험을 구체적인 행동으로 정리할 수 있음.',
  studentVisible: true,
  createdAt: `${consultation.date}T09:00:00.000Z`,
  updatedAt: `${consultation.date}T09:00:00.000Z`,
}, defaultConsultationVisibility));
