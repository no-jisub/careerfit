import { addMinutesToTime, getTimeRangeEnd, parseDateKey, timeToMinutes, toDateKey } from './date.js';

export const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];

export function getAppointmentCancellationLabel(appointment) {
  if (appointment?.status !== 'cancelled') return '';
  if (appointment.cancelledByRole === 'student' || (appointment.cancelledBy && appointment.cancelledBy === appointment.studentUid)) return '학생이 취소';
  if (appointment.cancelledByRole === 'counselor' || (appointment.cancelledBy && appointment.cancelledBy === appointment.counselorUid)) return '상담사가 취소';
  return '취소 주체 미확인';
}

export function getAppointmentStart(appointment) {
  const value = appointment?.date && appointment?.time ? new Date(`${appointment.date}T${appointment.time}:00`) : null;
  return value && !Number.isNaN(value.getTime()) ? value : null;
}

export function canRescheduleAppointment(appointment, now = new Date()) {
  const start = getAppointmentStart(appointment);
  return Boolean(start
    && activeAppointmentStatuses.includes(appointment?.status)
    && start.getTime() - now.getTime() >= 24 * 60 * 60 * 1000
    && !appointment?.rescheduleRequest?.status?.includes('pending'));
}

export function closeAvailabilityAfterCancellation(availability, appointment, now = new Date().toISOString()) {
  if (!availability) return null;
  return {
    ...availability,
    status: 'closed',
    appointmentId: appointment.id,
    bookedByUid: appointment.studentUid || availability.bookedByUid || '',
    closedReason: 'appointment-cancelled',
    reopenDecision: 'pending',
    updatedAt: now,
  };
}

export function resolveCancelledAvailability(availability, decision, now = new Date()) {
  if (!availability || availability.closedReason !== 'appointment-cancelled') return { error: '취소된 예약 시간만 처리할 수 있습니다.' };
  if (decision === 'reopen') {
    const slotStart = getAppointmentStart(availability);
    if (!slotStart || slotStart <= now) return { error: '이미 지난 상담 시간은 다시 열 수 없습니다.' };
    const updated = { ...availability, status: 'open', reopenDecision: 'reopened', updatedAt: now.toISOString() };
    delete updated.appointmentId;
    delete updated.bookedByUid;
    return { value: updated };
  }
  return { value: { ...availability, status: 'closed', reopenDecision: 'kept-closed', updatedAt: now.toISOString() } };
}

// 날짜 전체 재오픈은 취소 후 상담사 결정 대기 슬롯과 이미 지난 슬롯을 건드리지 않습니다.
// 취소 슬롯은 개별 "다시 열기/마감 유지" 흐름에서만 처리합니다.
export function canBulkReopenAvailability(availability, now = new Date()) {
  if (!availability || availability.status !== 'closed') return false;
  if (availability.closedReason === 'appointment-cancelled' && availability.reopenDecision === 'pending') return false;
  const start = getAppointmentStart(availability);
  return Boolean(start && start > now);
}

export function createRescheduleRequest(appointment, availability, role, message = '', now = new Date()) {
  if (!canRescheduleAppointment(appointment, now)) return { error: '상담 시작 24시간 전부터는 일정을 변경할 수 없습니다.' };
  if (!availability || availability.status !== 'open' || availability.counselorUid !== appointment.counselorUid) return { error: '선택한 시간은 예약할 수 없습니다.' };
  return {
    value: {
      ...appointment,
      rescheduleRequest: {
        id: `change-${appointment.id}-${now.getTime()}`,
        status: 'pending',
        initiatedByRole: role,
        availabilityId: availability.id,
        date: availability.date,
        time: availability.time,
        endTime: getTimeRangeEnd(availability),
        duration: availability.duration,
        location: availability.location,
        message,
        createdAt: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    },
  };
}

export function holdAvailabilityForReschedule(availability, appointment, now = new Date()) {
  return {
    ...availability,
    status: 'booked',
    appointmentId: appointment.id,
    bookedByUid: appointment.studentUid || '',
    holdReason: 'reschedule',
    updatedAt: now.toISOString(),
  };
}

export function resolveRescheduleRequest(appointment, originalAvailability, proposedAvailability, { approve, originalAction = 'keep', actorUid = '' }, now = new Date()) {
  const request = appointment?.rescheduleRequest;
  if (!request || request.status !== 'pending') return { error: '처리할 일정 변경 요청이 없습니다.' };
  const historyItem = {
    id: request.id,
    initiatedByRole: request.initiatedByRole,
    previousDate: appointment.date,
    previousTime: appointment.time,
    requestedDate: request.date,
    requestedTime: request.time,
    result: approve ? 'approved' : `rejected-${originalAction}`,
    decidedBy: actorUid,
    decidedAt: now.toISOString(),
  };
  const releasedProposed = proposedAvailability ? { ...proposedAvailability, status: approve ? 'booked' : 'open', updatedAt: now.toISOString() } : null;
  if (releasedProposed && !approve) {
    delete releasedProposed.appointmentId;
    delete releasedProposed.bookedByUid;
    delete releasedProposed.holdReason;
  }
  if (approve && releasedProposed) delete releasedProposed.holdReason;
  const releasedOriginal = originalAvailability && (approve || originalAction === 'cancel')
    ? { ...originalAvailability, status: 'open', updatedAt: now.toISOString() }
    : originalAvailability;
  if (releasedOriginal && releasedOriginal.status === 'open') {
    delete releasedOriginal.appointmentId;
    delete releasedOriginal.bookedByUid;
  }
  const nextStatus = !approve && originalAction === 'cancel' ? 'cancelled' : appointment.status;
  const updatedAppointment = {
    ...appointment,
    ...(approve ? {
      availabilityId: request.availabilityId,
      date: request.date,
      time: request.time,
      endTime: request.endTime,
      duration: request.duration,
      location: request.location,
      subject: request.subject || appointment.subject,
      requestMessage: request.requestMessage || appointment.requestMessage,
    } : {}),
    status: nextStatus,
    rescheduleRequest: { ...request, status: approve ? 'approved' : 'rejected', originalAction, decidedAt: now.toISOString(), decidedBy: actorUid },
    rescheduleHistory: [...(appointment.rescheduleHistory || []), historyItem],
    ...(!approve && originalAction === 'cancel' ? { cancelledAt: now.toISOString(), cancelledBy: actorUid } : {}),
    updatedAt: now.toISOString(),
  };
  return { value: { appointment: updatedAppointment, originalAvailability: releasedOriginal, proposedAvailability: releasedProposed } };
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
  exclusions = [],
  existingAvailability = [],
  appointments = [],
  nowDate = toDateKey(),
  nowTime = '00:00',
  createdAt = new Date().toISOString(),
}) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const selectedDates = [...new Set(dates)].sort();
  const normalizedExclusions = exclusions.filter(item => item.startTime || item.endTime).map(item => ({
    time: item.startTime,
    endTime: item.endTime,
  }));
  if (!selectedDates.length) return { slots: [], skipped: 0, error: '상담 가능한 날짜를 한 개 이상 선택해 주세요.' };
  if (!counselorUid) return { slots: [], skipped: 0, error: '상담사 정보를 확인할 수 없습니다.' };
  if (!String(location || '').trim()) return { slots: [], skipped: 0, error: '상담 장소를 입력해 주세요.' };
  if (![startMinutes, endMinutes].every(Number.isFinite) || endMinutes <= startMinutes || (endMinutes - startMinutes) % 60 !== 0) {
    return { slots: [], skipped: 0, error: '시작과 종료 시간은 1시간 단위로 맞춰 주세요.' };
  }
  if (normalizedExclusions.some(item => {
    const exclusionStart = timeToMinutes(item.time);
    const exclusionEnd = timeToMinutes(item.endTime);
    return ![exclusionStart, exclusionEnd].every(Number.isFinite) || exclusionEnd <= exclusionStart;
  })) return { slots: [], skipped: 0, excluded: 0, error: '제외 시간의 시작과 종료 시간을 확인해 주세요.' };

  const slots = [];
  let skipped = 0;
  let excluded = 0;
  selectedDates.forEach(date => {
    for (let minutes = startMinutes; minutes + 60 <= endMinutes; minutes += 60) {
      const time = addMinutesToTime('00:00', minutes);
      const end = addMinutesToTime(time, 60);
      const candidate = { date, time, endTime: end, duration: 60, counselorUid };
      const isPast = date < nowDate || (date === nowDate && time <= nowTime);
      const exclusionConflict = normalizedExclusions.some(item => timeRangesOverlap(item, candidate));
      const availabilityConflict = existingAvailability.some(item => item.counselorUid === counselorUid
        && item.date === date && timeRangesOverlap(item, candidate));
      const appointmentConflict = appointments.some(item => activeAppointmentStatuses.includes(item.status)
        && item.counselorUid === counselorUid && item.date === date && timeRangesOverlap(item, candidate));
      if (exclusionConflict) {
        skipped += 1;
        excluded += 1;
        continue;
      }
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
  return { slots, skipped, excluded, error: slots.length ? '' : '선택한 범위에 새로 등록할 수 있는 시간이 없습니다.' };
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
