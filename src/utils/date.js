const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatKoreanDate(date = new Date()) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}`;
}

export function getDayPeriod(time) {
  return Number(time?.split(':')[0]) < 12 ? '오전' : '오후';
}

export function getAppointmentDateParts(dateKey) {
  const date = parseDateKey(dateKey);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    monthAndWeekday: `${date.getMonth() + 1}월 · ${weekdays[date.getDay()].slice(0, 1)}`,
  };
}

export function resolveFollowUpStatus(followUp, today = toDateKey()) {
  if (followUp.status !== 'complete' && followUp.dueDate && followUp.dueDate < today) return 'overdue';
  return followUp.status;
}
