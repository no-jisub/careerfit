import { addDays, toDateKey } from '../utils/date.js';

const today = toDateKey();

const demoStudentIntake = {
  studentUid: 'demo-student-s1',
  counselorUid: 'demo-counselor',
  subject: '서비스 기획과 UX 직무 중 진로 방향 정하기',
  requestMessage: '개발 수업은 재미있지만 사람들의 문제를 정리하고 해결 방향을 설계하는 일에 더 관심이 생겼습니다. 두 직무의 차이와 지금 준비해야 할 경험을 상담받고 싶어요.',
  preferredOutcome: '이번 학기에 집중할 직무를 하나 정하고 한 달 동안 실천할 준비 순서를 만들고 싶어요.',
  requestedBy: 'student',
};

export const initialAppointments = [
  { id: 'a1', studentId: 's1', date: today, time: '10:00', endTime: '10:50', duration: 50, type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '관심 직무 비교표', status: 'confirmed', ...demoStudentIntake },
  { id: 'a2', studentId: 's2', date: today, time: '11:30', endTime: '12:20', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '포트폴리오 초안', status: 'confirmed' },
  { id: 'a3', studentId: 's3', date: today, time: '14:00', endTime: '14:50', duration: 50, type: '면접 상담', location: '온라인 상담실', preparation: '1분 자기소개', status: 'confirmed' },
  { id: 'a4', studentId: 's5', date: '2026-07-19', time: '11:00', endTime: '11:50', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '자기소개서 최종본', status: 'completed' },
  { id: 'a5', studentId: 's7', date: addDays(today, 2), time: '13:00', endTime: '13:50', duration: 50, type: '첫 진로 상담', location: '대학일자리플러스센터 상담실 3', preparation: '관심 직무 키워드', status: 'confirmed' },
  { id: 'a6', studentId: 's8', date: addDays(today, 3), time: '15:00', endTime: '15:50', duration: 50, type: '면접 후속 상담', location: '온라인 상담실', preparation: '영어 STAR 답변 2개', status: 'confirmed' },
];

export function restoreAppointmentStore(value = initialAppointments) {
  if (!Array.isArray(value)) return initialAppointments;
  return value.map(item => item.id === 'a1'
    ? {
      ...item,
      studentUid: item.studentUid || demoStudentIntake.studentUid,
      counselorUid: item.counselorUid || demoStudentIntake.counselorUid,
      subject: item.subject || demoStudentIntake.subject,
      requestMessage: item.requestMessage || demoStudentIntake.requestMessage,
      preferredOutcome: item.preferredOutcome || demoStudentIntake.preferredOutcome,
      requestedBy: item.requestedBy || demoStudentIntake.requestedBy,
    }
    : item);
}
