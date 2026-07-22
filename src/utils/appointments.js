export const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];

export function hasCounselorAppointmentConflict(appointments, students, candidate, ignoredId = '') {
  return appointments.some(item => {
    if (item.id === ignoredId || !activeAppointmentStatuses.includes(item.status)) return false;
    if (item.date !== candidate.date || item.time !== candidate.time) return false;
    const existingStudent = students.find(student => student.id === item.studentId);
    const existingCounselorUid = item.counselorUid || existingStudent?.counselorUid || 'demo-counselor';
    return existingCounselorUid === (candidate.counselorUid || 'demo-counselor');
  });
}

export function isAvailabilityBookable(availability, student, appointments, nowDate, nowTime) {
  if (!availability || !student || availability.status !== 'open') return false;
  if (availability.counselorUid !== student.counselorUid) return false;
  if (`${availability.date}T${availability.time}` < `${nowDate}T${nowTime}`) return false;
  return !appointments.some(item => activeAppointmentStatuses.includes(item.status)
    && (item.availabilityId === availability.id
      || (item.counselorUid === availability.counselorUid && item.date === availability.date && item.time === availability.time)));
}
