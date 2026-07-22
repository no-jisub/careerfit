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
