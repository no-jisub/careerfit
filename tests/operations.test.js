import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCounselorOperationalNotifications, buildOperationalNotifications, summarizeOperations } from '../src/utils/operations.js';

const students = [{ id: 's1', name: '김하늘', studentNo: '1', department: '컴퓨터공학과' }];

test('notifications prioritize overdue work before appointments', () => {
  const notices = buildOperationalNotifications(
    students,
    [{ id: 'f1', studentId: 's1', content: '자료 확인', dueDate: '2026-07-21', status: 'overdue' }],
    [{ id: 'a1', studentId: 's1', date: '2026-07-22', time: '10:00', type: '진로 상담', status: 'scheduled' }],
    '2026-07-22',
  );
  assert.equal(notices.length, 2);
  assert.equal(notices[0].type, 'overdue');
  assert.equal(notices[1].type, 'appointment');
});

test('counselor notifications exclude student-owned tasks and include student appointment requests', () => {
  const notices = buildCounselorOperationalNotifications(
    students,
    [
      { id: 'student-task', studentId: 's1', owner: '학생', content: '포트폴리오 수정', dueDate: '2026-07-22', status: 'inProgress' },
      { id: 'counselor-task', studentId: 's1', owner: '교직원', content: '자료 전달', dueDate: '2026-07-22', status: 'inProgress' },
    ],
    [{ id: 'request-1', studentId: 's1', counselorUid: 'counselor-1', requestedBy: 'student', date: '2026-07-25', time: '14:00', type: '진로 상담', status: 'pending' }],
    'counselor-1',
    '2026-07-22',
  );

  assert.equal(notices.some(item => item.description.includes('포트폴리오 수정')), false);
  assert.equal(notices.some(item => item.description.includes('자료 전달')), true);
  assert.equal(notices.some(item => item.title === '김하늘 학생이 상담을 신청했습니다'), true);
});

test('operation summary calculates completion and overdue rates', () => {
  const summary = summarizeOperations(
    students,
    [{ studentId: 's1', date: '2026-07-20', type: '진로' }],
    [
      { consultationDate: '2026-07-20', status: 'complete' },
      { consultationDate: '2026-07-20', status: 'overdue' },
    ],
    [{ date: '2026-07-20', status: 'completed' }],
    '2026-07-01',
  );
  assert.equal(summary.consultationCount, 1);
  assert.equal(summary.taskCompletionRate, 50);
  assert.equal(summary.overdueRate, 50);
  assert.equal(summary.appointmentCompletionRate, 100);
});
