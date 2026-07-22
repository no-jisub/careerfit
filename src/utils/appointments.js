import { addMinutesToTime, getTimeRangeEnd, parseDateKey, timeToMinutes, toDateKey } from './date.js';

export const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];

export function getAppointmentCancellationLabel(appointment) {
  if (appointment?.status !== 'cancelled') return '';
  if (appointment.cancelledByRole === 'student' || (appointment.cancelledBy && appointment.cancelledBy === appointment.studentUid)) return '학생이 취소';
  if (appointment.cancelledByRole === 'counselor' || (appointment.cancelledBy && appointment.cancelledBy === appointment.counselorUid)) return '상담사가 취소';
  return '취소 주체 미확인';
}

export function upsertAppointmentById(items, appointment) {
  return items.some(item => item.id === appointment.id)
    ? items.map(item => item.id === appointment.id ? appointment : item)
    : [...items, appointment];
}

function timeRangesOverlap(left, right) {
  const leftStart = timeToMinutes(left.time);
  const leftEnd = timeToMinutes(getTimeRangeEnd(left));
  const rightStart = timeToMinutes(right.time);
  const rightEnd = timeToMinutes(getTimeRangeEnd(right));
  return [leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)
    && leftStart < rightEnd
    && rightStart < leftEnd;
}

export function buildMonthCalendar(monthKey, today = toDateKey()) {
  const monthDate = parseDateKey(monthKey);
  const firstDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = new Date(firstDate);
  startDate.setDate(firstDate.getDate() - firstDate.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = toDateKey(date);
    return {
      date: dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === firstDate.getMonth(),
      isPast: dateKey < today,
    };
  });
}

export function restoreCounselorAvailabilityStore(stored, fallback, today = toDateKey()) {
  const items = Array.isArray(stored) ? stored : fallback;
  const demoSlots = new Map(fallback.map(item => [item.id, item]));
  return items.map(item => {
    const refreshed = demoSlots.get(item.id);
    if (!refreshed) return item;
    if (item.date < today) return refreshed;
    return item.duration !== refreshed.duration
      ? { ...refreshed, status: item.status }
      : item;
  });
}

export function buildHourlyAvailabilitySlots({
  dates = [],
  startTime,
  endTime,
  location,
  counselorUid,
  existingAvailability = [],
  appointments = [],
  nowDate = toDateKey(),
  nowTime = '00:00',
  createdAt = new Date().toISOString(),
}) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const selectedDates = [...new Set(dates)].sort();
  if (!selectedDates.length) return { slots: [], skipped: 0, error: '상담 가능한 날짜를 한 개 이상 선택해 주세요.' };
  if (!counselorUid) return { slots: [], skipped: 0, error: '상담사 정보를 확인할 수 없습니다.' };
  if (!String(location || '').trim()) return { slots: [], skipped: 0, error: '상담 장소를 입력해 주세요.' };
  if (![startMinutes, endMinutes].every(Number.isFinite) || endMinutes <= startMinutes || (endMinutes - startMinutes) % 60 !== 0) {
    return { slots: [], skipped: 0, error: '시작과 종료 시간은 1시간 단위로 맞춰 주세요.' };
  }

  const slots = [];
  let skipped = 0;
  selectedDates.forEach(date => {
    for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
      const time = addMinutesToTime('00:00', minutes);
      const end = addMinutesToTime(time, 60);
      const candidate = { date, time, endTime: end, duration: 60, counselorUid };
      const isPast = date < nowDate || (date === nowDate && time <= nowTime);
      const availabilityConflict = existingAvailability.some(item => item.counselorUid === counselorUid
        && item.date === date && timeRangesOverlap(item, candidate));
      const appointmentConflict = appointments.some(item => activeAppointmentStatuses.includes(item.status)
        && item.counselorUid === counselorUid && item.date === date && timeRangesOverlap(item, candidate));
      if (isPast || availabilityConflict || appointmentConflict) {
        skipped += 1;
        continue;
      }
      const safeCounselorId = counselorUid.replace(/[^A-Za-z0-9_-]/g, '-');
      slots.push({
        id: `availability-${safeCounselorId}-${date}-${time.replace(':', '')}`,
        ...candidate,
        location: String(location).trim(),
        status: 'open',
        createdAt,
        updatedAt: createdAt,
      });
    }
  });
  return { slots, skipped, error: slots.length ? '' : '선택한 범위에 새로 등록할 수 있는 시간이 없습니다.' };
}

export function hasCounselorAppointmentConflict(appointments, students, candidate, ignoredId = '') {
  return appointments.some(item => {
    if (item.id === ignoredId || !activeAppointmentStatuses.includes(item.status)) return false;
    if (item.date !== candidate.date || !timeRangesOverlap(item, candidate)) return false;
    const existingStudent = students.find(student => student.id === item.studentId);
    const existingCounselorUid = item.counselorUid || existingStudent?.counselorUid || 'demo-counselor';
    return existingCounselorUid === (candidate.counselorUid || 'demo-counselor');
  });
}

export function hasCounselorAvailabilityConflict(availability, candidate, ignoredId = '') {
  return availability.some(item => item.id !== ignoredId
    && item.counselorUid === candidate.counselorUid
    && item.status !== 'closed'
    && item.date === candidate.date
    && timeRangesOverlap(item, candidate));
}

export function isAvailabilityBookable(availability, student, appointments, nowDate, nowTime) {
  if (!availability || !student || availability.status !== 'open') return false;
  if (availability.counselorUid !== student.counselorUid) return false;
  if (`${availability.date}T${availability.time}` < `${nowDate}T${nowTime}`) return false;
  return !appointments.some(item => activeAppointmentStatuses.includes(item.status)
    && (item.availabilityId === availability.id
      || (item.counselorUid === availability.counselorUid && item.date === availability.date && timeRangesOverlap(item, availability))));
}
