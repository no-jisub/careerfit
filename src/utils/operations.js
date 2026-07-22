import { addDays, toDateKey } from './date.js';

export function buildOperationalNotifications(students, followUps, appointments, today = toDateKey()) {
  const studentById = new Map(students.map(student => [student.id, student]));
  const notices = [];
  followUps.forEach(item => {
    if (item.status === 'complete') return;
    const student = studentById.get(item.studentId);
    if (item.status === 'overdue' || item.dueDate < today) {
      notices.push({ id: `followup-overdue-${item.id}`, type: 'overdue', title: `${student?.name || '학생'} 후속 조치 기한 초과`, description: item.content, date: item.dueDate, to: '/follow-ups', priority: 0 });
    } else if (item.dueDate <= addDays(today, 2)) {
      notices.push({ id: `followup-due-${item.id}`, type: 'due', title: `${student?.name || '학생'} 후속 조치 마감 임박`, description: item.content, date: item.dueDate, to: '/follow-ups', priority: 1 });
    }
  });
  appointments.forEach(item => {
    if (!['confirmed', 'scheduled'].includes(item.status) || item.date !== today) return;
    const student = studentById.get(item.studentId);
    notices.push({ id: `appointment-${item.id}`, type: 'appointment', title: `오늘 ${item.time} 상담 예정`, description: `${student?.name || '학생'} · ${item.type}`, date: item.date, to: `/students/${item.studentId}`, priority: 2 });
  });
  return notices.sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date));
}

export function summarizeOperations(students, consultations, followUps, appointments, fromDate = '') {
  const inRange = date => !fromDate || date >= fromDate;
  const rangedConsultations = consultations.filter(item => inRange(item.date));
  const rangedFollowUps = followUps.filter(item => inRange(item.consultationDate || item.dueDate));
  const rangedAppointments = appointments.filter(item => inRange(item.date));
  const completedTasks = rangedFollowUps.filter(item => item.status === 'complete').length;
  const overdueTasks = rangedFollowUps.filter(item => item.status === 'overdue').length;
  const completedAppointments = rangedAppointments.filter(item => item.status === 'completed').length;
  const cancelledAppointments = rangedAppointments.filter(item => item.status === 'cancelled').length;
  const rate = (value, total) => total ? Math.round(value / total * 100) : 0;
  const consultationTypes = Object.entries(rangedConsultations.reduce((result, item) => ({ ...result, [item.type]: (result[item.type] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1]);
  const departments = Object.entries(students.reduce((result, item) => ({ ...result, [item.department]: (result[item.department] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1]);
  return {
    consultationCount: rangedConsultations.length,
    activeStudentCount: new Set(rangedConsultations.map(item => item.studentId)).size,
    taskCompletionRate: rate(completedTasks, rangedFollowUps.length),
    overdueRate: rate(overdueTasks, rangedFollowUps.length),
    appointmentCompletionRate: rate(completedAppointments, rangedAppointments.length),
    cancellationRate: rate(cancelledAppointments, rangedAppointments.length),
    consultationTypes,
    departments,
  };
}
