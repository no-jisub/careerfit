import { toDateKey } from '../utils/date';

const dateAfter = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const initialCounselorAvailability = [
  { id: 'availability-demo-1', counselorUid: 'demo-counselor', date: dateAfter(1), time: '10:00', duration: 50, location: '대학일자리플러스센터 상담실 2', status: 'open' },
  { id: 'availability-demo-2', counselorUid: 'demo-counselor', date: dateAfter(1), time: '14:00', duration: 50, location: '대학일자리플러스센터 상담실 2', status: 'open' },
  { id: 'availability-demo-3', counselorUid: 'demo-counselor', date: dateAfter(3), time: '11:00', duration: 50, location: '온라인 상담실', status: 'open' },
];
