import { toDateKey } from '../utils/date';

const today = toDateKey();

export const initialAppointments = [
  { id: 'a1', studentId: 's1', date: today, time: '10:00', endTime: '10:50', duration: 50, type: '진로 상담', location: '대학일자리플러스센터 상담실 2', preparation: '관심 직무 비교표', status: 'confirmed' },
  { id: 'a2', studentId: 's2', date: today, time: '11:30', endTime: '12:20', duration: 50, type: '취업 상담', location: '대학일자리플러스센터 상담실 1', preparation: '포트폴리오 초안', status: 'confirmed' },
  { id: 'a3', studentId: 's3', date: today, time: '14:00', endTime: '14:50', duration: 50, type: '면접 상담', location: '온라인 상담실', preparation: '1분 자기소개', status: 'confirmed' },
];
