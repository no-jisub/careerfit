import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudentAssignedFollowUps } from '../src/utils/followUps.js';

test('student task list includes only work assigned to the signed-in student', () => {
  const student = { id: 's1', uid: 'student-1' };
  const tasks = [
    { id: 'mine-later', studentId: 's1', owner: '학생', assigneeUid: 'student-1', status: 'scheduled', dueDate: '2026-07-30' },
    { id: 'mine-overdue', studentId: 's1', owner: '학생', assigneeUid: 'student-1', status: 'overdue', dueDate: '2026-07-20' },
    { id: 'counselor-internal', studentId: 's1', owner: '교직원', assigneeUid: 'counselor-1', status: 'inProgress', dueDate: '2026-07-21' },
    { id: 'other-student', studentId: 's2', owner: '학생', assigneeUid: 'student-2', status: 'overdue', dueDate: '2026-07-19' },
    { id: 'wrong-assignee', studentId: 's1', owner: '학생', assigneeUid: 'student-2', status: 'overdue', dueDate: '2026-07-18' },
  ];

  assert.deepEqual(
    getStudentAssignedFollowUps(tasks, student, student.uid).map(item => item.id),
    ['mine-overdue', 'mine-later'],
  );
});

test('legacy demo student tasks without assignee metadata remain visible and prioritized', () => {
  const student = { id: 's1', uid: 'student-1' };
  const tasks = [
    { id: 'complete', studentId: 's1', owner: '학생', status: 'complete', dueDate: '2026-07-18' },
    { id: 'active', studentId: 's1', owner: '학생', status: 'inProgress', dueDate: '2026-07-25' },
  ];

  assert.deepEqual(
    getStudentAssignedFollowUps(tasks, student, student.uid).map(item => item.id),
    ['active', 'complete'],
  );
});
