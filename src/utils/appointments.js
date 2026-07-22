import { getTimeRangeEnd, timeToMinutes } from './date.js';

export const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];

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
