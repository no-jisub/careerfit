const followUpStatusPriority = {
  overdue: 0,
  inProgress: 1,
  scheduled: 2,
  complete: 3,
};

export function getStudentAssignedFollowUps(followUps = [], student, userUid = '') {
  if (!student?.id) return [];
  const effectiveUid = userUid || student.uid || '';
  return followUps
    .filter(item => item.studentId === student.id
      && item.owner === '학생'
      && (!effectiveUid || !item.assigneeUid || item.assigneeUid === effectiveUid))
    .sort((a, b) => (
      (followUpStatusPriority[a.status] ?? 9) - (followUpStatusPriority[b.status] ?? 9)
      || String(a.dueDate || '').localeCompare(String(b.dueDate || ''))
    ));
}
