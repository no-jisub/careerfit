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
  { id: 'a1', studentId: 's1', availabilityId: 'availability-demo-original-s1', date: today, time: '10:00', endTime: '10:50', duration: 50, type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '관심 직무 비교표', status: 'confirmed', ...demoStudentIntake },
  { id: 'a2', studentId: 's2', counselorUid: 'demo-counselor', date: today, time: '11:30', endTime: '12:20', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '포트폴리오 초안', status: 'completed', completedAt: `${today}T12:20:00.000Z` },
  { id: 'a3', studentId: 's3', counselorUid: 'demo-counselor', date: today, time: '14:00', endTime: '14:50', duration: 50, type: '면접 상담', location: '온라인 상담실', preparation: '1분 자기소개', status: 'confirmed' },
  {
    id: 'a4', studentId: 's4', counselorUid: 'demo-counselor', studentUid: 'demo-student-s4', availabilityId: 'availability-demo-pending-s4', date: addDays(today, 1), time: '15:30', endTime: '16:20', duration: 50,
    type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '관심 있는 앱 화면 3개', status: 'pending', requestedBy: 'student',
    subject: 'UX 디자이너 준비 경험 설계', requestMessage: '전공 수업 외에 어떤 프로젝트를 먼저 시작하면 좋을지 상담받고 싶습니다.', preferredOutcome: '방학 동안 만들 첫 UX 포트폴리오 주제를 정하고 싶어요.',
  },
  { id: 'a5', studentId: 's5', counselorUid: 'demo-counselor', date: addDays(today, -6), time: '11:00', endTime: '11:50', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '자기소개서 최종본', status: 'completed', completedAt: `${addDays(today, -6)}T11:50:00.000Z` },
  { id: 'a6', studentId: 's6', counselorUid: 'demo-counselor', date: addDays(today, -1), time: '16:30', endTime: '17:20', duration: 50, type: '창업 상담', location: '대학일자리플러스센터 상담실 3', preparation: '아이디어 검증 메모', status: 'cancelled', cancelledBy: 'demo-student-s6', cancelledByRole: 'student', cancelledAt: `${addDays(today, -2)}T18:00:00.000Z` },
  { id: 'a7', studentId: 's7', counselorUid: 'demo-counselor', date: addDays(today, 2), time: '13:00', endTime: '13:50', duration: 50, type: '첫 진로 상담', location: '대학일자리플러스센터 상담실 3', preparation: '관심 직무 키워드', status: 'confirmed' },
  {
    id: 'a8', studentId: 's8', counselorUid: 'demo-counselor', studentUid: 'demo-student-s8', availabilityId: 'availability-demo-original-s8',
    date: addDays(today, 3), time: '15:00', endTime: '15:50', duration: 50, type: '면접 후속 상담', location: '온라인 상담실', preparation: '영어 STAR 답변 2개', status: 'confirmed',
    rescheduleRequest: {
      id: 'change-demo-s8', status: 'pending', initiatedByRole: 'student', availabilityId: 'availability-demo-change-s8',
      date: addDays(today, 4), time: '11:00', endTime: '12:00', duration: 60, location: '온라인 상담실',
      message: '기업 설명회 일정과 겹쳐 하루 뒤 오전으로 변경하고 싶습니다.', createdAt: `${today}T08:40:00.000Z`,
    },
  },
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
