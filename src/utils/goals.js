import { addDays, toDateKey } from './date.js';

export const GOAL_STATUSES = ['notStarted', 'inProgress', 'achieved', 'onHold'];

const clean = value => String(value || '').trim();

export function validateGoalInput(input) {
  const value = {
    title: clean(input.title),
    description: clean(input.description),
    targetDate: clean(input.targetDate),
    assigneeRole: input.assigneeRole === 'counselor' ? 'counselor' : 'student',
    visibility: input.visibility === 'private' ? 'private' : 'public',
    consultationId: clean(input.consultationId),
    followUpId: clean(input.followUpId),
  };
  if (!clean(input.studentId)) return { error: '학생을 선택해 주세요.' };
  if (!value.title) return { error: '목표 제목을 입력해 주세요.' };
  if (value.title.length > 80) return { error: '목표 제목은 80자 이하로 입력해 주세요.' };
  if (!value.description) return { error: '목표 설명을 입력해 주세요.' };
  if (value.description.length > 500) return { error: '목표 설명은 500자 이하로 입력해 주세요.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.targetDate)) return { error: '목표 날짜를 선택해 주세요.' };
  return { value: { ...value, studentId: clean(input.studentId) } };
}

export function createGoal(input, actor, now = new Date().toISOString()) {
  const validated = validateGoalInput(input);
  if (validated.error) throw new Error(validated.error);
  const value = validated.value;
  return {
    id: input.id || `goal-${Date.now()}`,
    ...value,
    studentUid: clean(input.studentUid),
    counselorUid: clean(input.counselorUid),
    status: 'notStarted',
    studentProgress: '',
    createdByUid: clean(actor.uid),
    createdByRole: actor.role,
    createdAt: now,
    updatedAt: now,
    lastModifiedByUid: clean(actor.uid),
    lastModifiedByName: clean(actor.name),
    lastModifiedByRole: actor.role,
    achievedAt: '',
  };
}

export function updateGoal(goal, changes, actor, now = new Date().toISOString()) {
  const nextStatus = GOAL_STATUSES.includes(changes.status) ? changes.status : goal.status;
  if (actor.role === 'student' && (nextStatus === 'achieved' || goal.status === 'achieved') && nextStatus !== goal.status) {
    throw new Error('목표 달성 처리는 상담사만 할 수 있습니다.');
  }
  const allowed = actor.role === 'student'
    ? { ...('studentProgress' in changes ? { studentProgress: clean(changes.studentProgress) } : {}), ...(changes.status ? { status: nextStatus } : {}) }
    : changes;
  return {
    ...goal,
    ...allowed,
    status: nextStatus,
    achievedAt: nextStatus === 'achieved' ? (goal.achievedAt || now) : '',
    updatedAt: now,
    lastModifiedByUid: clean(actor.uid),
    lastModifiedByName: clean(actor.name),
    lastModifiedByRole: actor.role,
  };
}

export function goalsVisibleTo(goals, { role, uid, studentId }) {
  if (role !== 'student') return goals;
  return goals.filter(goal => goal.visibility === 'public' && (
    (uid && goal.studentUid === uid) || (studentId && goal.studentId === studentId)
  ));
}

export function buildGoalNotifications(goals, recipient, today = toDateKey()) {
  return goals.flatMap(goal => {
    if (goal.status === 'achieved' || !goal.targetDate) return [];
    const isRecipient = recipient.role === 'student'
      ? goal.assigneeRole === 'student' && goal.studentUid === recipient.uid && goal.visibility === 'public'
      : goal.assigneeRole === 'counselor' && goal.counselorUid === recipient.uid;
    if (!isRecipient) return [];
    const overdue = goal.targetDate < today;
    const dueSoon = goal.targetDate >= today && goal.targetDate <= addDays(today, 3);
    if (!overdue && !dueSoon) return [];
    return [{
      id: `goal-${overdue ? 'overdue' : 'due'}-${goal.id}-${recipient.uid}`,
      recipientUid: recipient.uid,
      type: overdue ? 'goalOverdue' : 'goalDue',
      title: overdue ? '목표 기한이 지났습니다' : '목표 기한이 다가옵니다',
      description: `${goal.title} · ${goal.targetDate}`,
      to: recipient.role === 'student' ? '/student/goals' : '/goals',
      date: today,
      createdAt: `${today}T00:00:00.000Z`,
      readAt: '',
    }];
  });
}

export function summarizeOutcomeMetrics(goals = [], followUps = [], feedback = []) {
  const percent = (part, total) => total ? Math.round(part / total * 100) : 0;
  const scoreFor = item => Number(item.overallScore ?? item.overallRating);
  const answered = feedback.filter(item => Number.isFinite(scoreFor(item)));
  const satisfactionAverage = answered.length
    ? Math.round(answered.reduce((sum, item) => sum + scoreFor(item), 0) / answered.length * 10) / 10
    : 0;
  return {
    goalAchievementRate: percent(goals.filter(item => item.status === 'achieved').length, goals.length),
    followUpCompletionRate: percent(followUps.filter(item => item.status === 'complete').length, followUps.length),
    satisfactionAverage,
    feedbackResponseRate: percent(answered.length, feedback.length),
    additionalConsultationRate: percent(feedback.filter(item => (item.needsFollowUp ?? item.needsAdditionalConsultation) === true).length, answered.length),
  };
}
