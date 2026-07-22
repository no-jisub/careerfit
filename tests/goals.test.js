import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoalNotifications, createGoal, goalsVisibleTo, summarizeOutcomeMetrics, updateGoal, validateGoalInput } from '../src/utils/goals.js';

const valid = { studentId: 's1', title: '이력서 완성', description: '초안을 검토하고 완성한다.', targetDate: '2026-08-01', assigneeRole: 'student', visibility: 'public' };
const actor = { uid: 'c1', name: '상담사', role: 'counselor' };

test('goal validation requires title, description, date and student', () => {
  assert.equal(validateGoalInput(valid).error, undefined);
  assert.match(validateGoalInput({ ...valid, title: '' }).error, /제목/);
  assert.match(validateGoalInput({ ...valid, targetDate: '' }).error, /날짜/);
});

test('goal creation and updates retain audit metadata', () => {
  const goal = createGoal({ ...valid, id: 'g1', studentUid: 'suid', counselorUid: 'cuid' }, actor, '2026-07-20T10:00:00.000Z');
  const changed = updateGoal(goal, { status: 'achieved' }, actor, '2026-07-21T10:00:00.000Z');
  assert.equal(changed.status, 'achieved');
  assert.equal(changed.achievedAt, '2026-07-21T10:00:00.000Z');
  assert.equal(changed.lastModifiedByName, '상담사');
});

test('student can add progress but cannot mark a goal achieved', () => {
  const goal = createGoal({ ...valid, id: 'g1' }, actor);
  const student = { uid: 's1', name: '학생', role: 'student' };
  assert.equal(updateGoal(goal, { studentProgress: '절반 완료', status: 'inProgress' }, student).studentProgress, '절반 완료');
  assert.throws(() => updateGoal(goal, { status: 'achieved' }, student), /상담사/);
  const achieved = updateGoal(goal, { status: 'achieved' }, actor);
  assert.throws(() => updateGoal(achieved, { status: 'inProgress' }, student), /상담사/);
});

test('students only see their public goals', () => {
  const goals = [{ id: 'a', studentUid: 'u1', visibility: 'public' }, { id: 'b', studentUid: 'u1', visibility: 'private' }, { id: 'c', studentUid: 'u2', visibility: 'public' }];
  assert.deepEqual(goalsVisibleTo(goals, { role: 'student', uid: 'u1' }).map(item => item.id), ['a']);
});

test('goal notifications cover due soon and overdue without completed goals', () => {
  const goals = [
    { id: 'a', studentUid: 'u1', assigneeRole: 'student', visibility: 'public', title: '임박', targetDate: '2026-07-22', status: 'inProgress' },
    { id: 'b', studentUid: 'u1', assigneeRole: 'student', visibility: 'public', title: '완료', targetDate: '2026-07-19', status: 'achieved' },
  ];
  const notices = buildGoalNotifications(goals, { uid: 'u1', role: 'student' }, '2026-07-20');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].type, 'goalDue');
});

test('outcome metrics calculate goal, action and feedback rates', () => {
  const result = summarizeOutcomeMetrics(
    [{ status: 'achieved' }, { status: 'inProgress' }],
    [{ status: 'complete' }, { status: 'scheduled' }],
    [{ overallRating: 5, needsAdditionalConsultation: true }, { overallRating: 3, needsAdditionalConsultation: false }, {}],
  );
  assert.deepEqual(result, { goalAchievementRate: 50, followUpCompletionRate: 50, satisfactionAverage: 4, feedbackResponseRate: 67, additionalConsultationRate: 50 });
});
