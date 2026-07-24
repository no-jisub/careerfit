import { addDays, toDateKey } from '../utils/date.js';

const today = toDateKey();

export const initialAppointments = [
  { id: 'a1', studentId: 's1', date: today, time: '10:00', endTime: '10:50', duration: 50, type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '관심 직무 비교표', status: 'confirmed' },
  { id: 'a2', studentId: 's2', date: today, time: '11:30', endTime: '12:20', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '포트폴리오 초안', status: 'confirmed' },
  { id: 'a3', studentId: 's3', date: today, time: '14:00', endTime: '14:50', duration: 50, type: '면접 상담', location: '온라인 상담실', preparation: '1분 자기소개', status: 'confirmed' },
  { id: 'a4', studentId: 's5', date: '2026-07-19', time: '11:00', endTime: '11:50', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '자기소개서 최종본', status: 'completed' },
  { id: 'a5', studentId: 's7', date: addDays(today, 2), time: '13:00', endTime: '13:50', duration: 50, type: '첫 진로 상담', location: '대학일자리플러스센터 상담실 3', preparation: '관심 직무 키워드', status: 'confirmed' },
  { id: 'a6', studentId: 's8', date: addDays(today, 3), time: '15:00', endTime: '15:50', duration: 50, type: '면접 후속 상담', location: '온라인 상담실', preparation: '영어 STAR 답변 2개', status: 'confirmed' },
];
