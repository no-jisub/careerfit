import { toDateKey } from '../utils/date';

const dateAfter = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const initialCounselorAvailability = [
  { id: 'availability-demo-original-s1', counselorUid: 'demo-counselor', date: dateAfter(0), time: '10:00', endTime: '11:00', duration: 60, location: '대학일자리플러스센터 상담실 2', status: 'booked', appointmentId: 'a1', bookedByUid: 'demo-student-s1' },
  { id: 'availability-demo-1', counselorUid: 'demo-counselor', date: dateAfter(1), time: '10:00', endTime: '11:00', duration: 60, location: '대학일자리플러스센터 상담실 2', status: 'open' },
  { id: 'availability-demo-2', counselorUid: 'demo-counselor', date: dateAfter(1), time: '14:00', endTime: '15:00', duration: 60, location: '대학일자리플러스센터 상담실 2', status: 'open' },
  { id: 'availability-demo-pending-s4', counselorUid: 'demo-counselor', date: dateAfter(1), time: '15:30', endTime: '16:30', duration: 60, location: '대학일자리플러스센터 상담실 2', status: 'booked', appointmentId: 'a4', bookedByUid: 'demo-student-s4' },
  { id: 'availability-demo-3', counselorUid: 'demo-counselor', date: dateAfter(3), time: '11:00', endTime: '12:00', duration: 60, location: '온라인 상담실', status: 'open' },
  { id: 'availability-demo-original-s8', counselorUid: 'demo-counselor', date: dateAfter(3), time: '15:00', endTime: '16:00', duration: 60, location: '온라인 상담실', status: 'booked', appointmentId: 'a8', bookedByUid: 'demo-student-s8' },
  { id: 'availability-demo-change-s8', counselorUid: 'demo-counselor', date: dateAfter(4), time: '11:00', endTime: '12:00', duration: 60, location: '온라인 상담실', status: 'booked', appointmentId: 'a8', bookedByUid: 'demo-student-s8', holdReason: 'reschedule' },
];
