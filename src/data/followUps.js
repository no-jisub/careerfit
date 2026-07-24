import { addDays, toDateKey } from '../utils/date.js';

const today = toDateKey();

export const initialFollowUps = [
  { id: 'f1', studentId: 's1', content: 'IT 직무 소개 자료 확인', owner: '학생', dueDate: '2026-07-18', status: 'overdue', consultationDate: '2026-07-08' },
  { id: 'f2', studentId: 's1', content: '관심 직무 두 개 정리', owner: '학생', dueDate: '2026-07-23', status: 'inProgress', consultationDate: '2026-07-08' },
  { id: 'f3', studentId: 's1', content: 'UX 서비스 기획 캠프 신청 여부 결정', owner: '학생', dueDate: '2026-07-25', status: 'scheduled', consultationDate: '2026-07-08' },
  { id: 'f4', studentId: 's2', content: '포트폴리오 프로젝트 성과 수치 정리', owner: '학생', dueDate: '2026-07-22', status: 'inProgress', consultationDate: '2026-07-17' },
  { id: 'f5', studentId: 's2', content: '우수 포트폴리오 예시 전달', owner: '교직원', dueDate: '2026-07-21', status: 'scheduled', consultationDate: '2026-07-17' },
  { id: 'f6', studentId: 's3', content: '면접 예상 질문 목록 전달', owner: '교직원', dueDate: '2026-07-18', status: 'overdue', consultationDate: '2026-07-15' },
  { id: 'f7', studentId: 's4', content: 'UX 포트폴리오 사례 3개 탐색', owner: '학생', dueDate: '2026-07-28', status: 'scheduled', consultationDate: '2026-06-28' },
  { id: 'f8', studentId: 's5', content: '자기소개서 최종본 제출', owner: '학생', dueDate: '2026-07-19', status: 'complete', consultationDate: '2026-07-19' },
  { id: 'f9', studentId: 's5', content: '기관별 채용 일정 체크리스트 전달', owner: '교직원', dueDate: '2026-07-19', status: 'complete', consultationDate: '2026-07-19' },
  { id: 'f10', studentId: 's8', content: '영문 이력서 1차 수정', owner: '학생', dueDate: '2026-07-24', status: 'complete', consultationDate: '2026-07-21' },
  { id: 'f11', studentId: 's8', content: '영어 면접 STAR 답변 2개 준비', owner: '학생', dueDate: addDays(today, 1), status: 'inProgress', consultationDate: '2026-07-21' },
  { id: 'f12', studentId: 's8', content: '해외영업 영어 면접 질문 전달', owner: '교직원', dueDate: addDays(today, 2), status: 'scheduled', consultationDate: '2026-07-21' },
];
