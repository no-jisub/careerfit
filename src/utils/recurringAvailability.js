import { activeAppointmentStatuses } from './appointments.js';
import { addDays, addMinutesToTime, getTimeRangeEnd, parseDateKey, timeToMinutes, toDateKey } from './date.js';

export const MAX_RECURRING_AVAILABILITY_DAYS = 84;

const overlaps = (left, right) => {
  const leftStart = timeToMinutes(left.time ?? left.startTime);
  const leftEnd = timeToMinutes(left.endTime ?? getTimeRangeEnd(left));
  const rightStart = timeToMinutes(right.time ?? right.startTime);
  const rightEnd = timeToMinutes(right.endTime ?? getTimeRangeEnd(right));
  return [leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)
    && leftStart < rightEnd
    && rightStart < leftEnd;
};

const calendarDayDifference = (startDate, endDate) => {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
};

export function listRecurringDates({ startDate, endDate, weekdays = [], excludedDates = [] }) {
  if (!startDate || !endDate || endDate < startDate) return [];
  const selectedWeekdays = new Set(weekdays.map(Number));
  const exclusions = new Set(excludedDates);
  const dates = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (selectedWeekdays.has(parseDateKey(date).getDay()) && !exclusions.has(date)) dates.push(date);
  }
  return dates;
}

export function validateRecurringAvailabilityRule(rule) {
  const { startDate, endDate, weekdays = [], startTime, endTime, location, exclusions = [] } = rule;
  if (!startDate || !endDate) return '반복 적용 기간을 선택해 주세요.';
  const days = calendarDayDifference(startDate, endDate);
  if (days < 0) return '종료일은 시작일보다 빠를 수 없습니다.';
  if (days >= MAX_RECURRING_AVAILABILITY_DAYS) return '반복 기간은 시작일을 포함해 최대 12주까지 선택할 수 있습니다.';
  if (!weekdays.length) return '상담 가능한 요일을 하나 이상 선택해 주세요.';
  if (weekdays.some(day => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6)) return '요일 설정을 확인해 주세요.';
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (![startMinutes, endMinutes].every(Number.isFinite) || endMinutes <= startMinutes || (endMinutes - startMinutes) % 60 !== 0) {
    return '시작·종료 시간은 1시간 단위로 맞춰 주세요.';
  }
  if (!String(location || '').trim()) return '상담 장소를 입력해 주세요.';
  const invalidExclusion = exclusions.some(exclusion => {
    const exclusionStart = timeToMinutes(exclusion.startTime);
    const exclusionEnd = timeToMinutes(exclusion.endTime);
    return ![exclusionStart, exclusionEnd].every(Number.isFinite) || exclusionEnd <= exclusionStart;
  });
  return invalidExclusion ? '제외 시간의 시작·종료 시간을 확인해 주세요.' : '';
}

export function buildRecurringAvailabilityPreview({
  rule,
  counselorUid,
  existingAvailability = [],
  appointments = [],
  now = new Date(),
  createdAt = now.toISOString(),
}) {
  const error = validateRecurringAvailabilityRule(rule);
  const summary = {
    matchingDates: 0,
    totalCandidates: 0,
    generated: 0,
    excludedDates: 0,
    excludedTimes: 0,
    tooSoon: 0,
    conflicts: 0,
  };
  if (error) return { slots: [], dates: [], summary, error };
  if (!counselorUid) return { slots: [], dates: [], summary, error: '상담사 정보를 확인할 수 없습니다.' };

  const allMatchingDates = listRecurringDates({ ...rule, excludedDates: [] });
  const dates = listRecurringDates(rule);
  summary.matchingDates = dates.length;
  summary.excludedDates = allMatchingDates.length - dates.length;
  const startMinutes = timeToMinutes(rule.startTime);
  const endMinutes = timeToMinutes(rule.endTime);
  const cutoff = now.getTime() + 24 * 60 * 60 * 1000;
  const slots = [];

  for (const date of dates) {
    for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
      summary.totalCandidates += 1;
      const time = addMinutesToTime('00:00', minutes);
      const endTime = addMinutesToTime(time, 60);
      const candidate = { date, time, endTime, duration: 60, counselorUid };
      if (rule.exclusions.some(exclusion => overlaps(exclusion, candidate))) {
        summary.excludedTimes += 1;
        continue;
      }
      const start = new Date(`${date}T${time}:00`);
      if (Number.isNaN(start.getTime()) || start.getTime() < cutoff) {
        summary.tooSoon += 1;
        continue;
      }
      const availabilityConflict = existingAvailability.some(item => item.counselorUid === counselorUid
        && item.date === date && overlaps(item, candidate));
      const appointmentConflict = appointments.some(item => activeAppointmentStatuses.includes(item.status)
        && item.counselorUid === counselorUid && item.date === date && overlaps(item, candidate));
      if (availabilityConflict || appointmentConflict) {
        summary.conflicts += 1;
        continue;
      }
      const safeCounselorId = counselorUid.replace(/[^A-Za-z0-9_-]/g, '-');
      slots.push({
        id: `availability-${safeCounselorId}-${date}-${time.replace(':', '')}`,
        ...candidate,
        location: String(rule.location).trim(),
        status: 'open',
        source: 'recurring',
        recurringRule: {
          startDate: rule.startDate,
          endDate: rule.endDate,
          weekdays: [...new Set(rule.weekdays.map(Number))].sort(),
        },
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  summary.generated = slots.length;
  return {
    slots,
    dates,
    summary,
    error: slots.length ? '' : '설정한 기간에 새로 등록할 수 있는 상담 시간이 없습니다.',
  };
}

export function createDefaultRecurringAvailabilityRule(today = toDateKey()) {
  return {
    startDate: addDays(today, 1),
    endDate: addDays(today, 28),
    weekdays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    exclusions: [{ startTime: '12:00', endTime: '13:00' }],
    excludedDates: [],
    location: '대학일자리플러스센터 상담실',
  };
}
