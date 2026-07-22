import { buildEventNotification } from './notifications.js';

export const FEEDBACK_EDIT_DAYS = 7;
export const isCompletedAppointment = appointment => ['completed', 'complete'].includes(appointment?.status);
export const feedbackScoreFields = [
  { key: 'overallScore', label: '전반적인 상담 만족도' },
  { key: 'helpfulnessScore', label: '상담이 도움이 된 정도' },
  { key: 'clarityScore', label: '상담사의 설명이 이해하기 쉬운 정도' },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const asDate = value => value instanceof Date ? value : new Date(value);

export function getFeedbackForAppointment(feedbacks, appointmentId) {
  return feedbacks.find(item => item.appointmentId === appointmentId) || null;
}

export function validateFeedbackInput(input) {
  const errors = {};
  feedbackScoreFields.forEach(({ key, label }) => {
    const score = Number(input[key]);
    if (!Number.isInteger(score) || score < 1 || score > 5) errors[key] = `${label}를 1점부터 5점 사이에서 선택해 주세요.`;
  });
  if (typeof input.needsFollowUp !== 'boolean') errors.needsFollowUp = '추가 상담 필요 여부를 선택해 주세요.';
  if (String(input.comment || '').trim().length > 1000) errors.comment = '자유 의견은 1,000자 이하로 입력해 주세요.';
  return errors;
}

export function canCreateFeedback(appointment, studentUid, existingFeedback = null) {
  if (!isCompletedAppointment(appointment)) return false;
  if (existingFeedback) return false;
  return Boolean(studentUid) && appointment.studentUid === studentUid;
}

export function getFeedbackEditDeadline(feedback) {
  const submittedAt = asDate(feedback?.submittedAt || feedback?.createdAt);
  if (Number.isNaN(submittedAt.getTime())) return null;
  return new Date(submittedAt.getTime() + FEEDBACK_EDIT_DAYS * DAY_IN_MS);
}

export function canEditFeedback(feedback, studentUid, now = new Date()) {
  if (!feedback || !studentUid || feedback.studentUid !== studentUid) return false;
  const deadline = getFeedbackEditDeadline(feedback);
  return Boolean(deadline) && asDate(now).getTime() <= deadline.getTime();
}

export function buildConsultationFeedback({ appointment, consultationId = '', studentUid, input, existingFeedback = null, now = new Date() }) {
  const errors = validateFeedbackInput(input);
  if (Object.keys(errors).length) return { value: null, errors };
  if (existingFeedback ? !canEditFeedback(existingFeedback, studentUid, now) : !canCreateFeedback(appointment, studentUid)) {
    return { value: null, errors: { form: existingFeedback ? '피드백 수정 가능 기간이 지났거나 작성 권한이 없습니다.' : '완료된 본인의 상담에만 피드백을 작성할 수 있습니다.' } };
  }
  const timestamp = asDate(now).toISOString();
  return {
    errors: {},
    value: {
      ...(existingFeedback || {}),
      id: existingFeedback?.id || `feedback-${appointment.id}`,
      appointmentId: appointment.id,
      consultationId: consultationId || existingFeedback?.consultationId || appointment.consultationId || '',
      studentId: appointment.studentId,
      studentUid,
      counselorUid: appointment.counselorUid,
      overallScore: Number(input.overallScore),
      helpfulnessScore: Number(input.helpfulnessScore),
      clarityScore: Number(input.clarityScore),
      needsFollowUp: input.needsFollowUp,
      comment: String(input.comment || '').trim(),
      submittedAt: existingFeedback?.submittedAt || timestamp,
      createdAt: existingFeedback?.createdAt || timestamp,
      updatedAt: timestamp,
    },
  };
}

export function buildFeedbackNotification(feedback, studentName = '학생') {
  return buildEventNotification({
    eventId: `${feedback.id}-submitted`,
    recipientUid: feedback.counselorUid,
    actorUid: feedback.studentUid,
    type: 'feedback',
    title: '새로운 상담 피드백이 등록되었습니다',
    description: `${studentName} 학생 · 만족도 ${feedback.overallScore}점`,
    to: `/students/${feedback.studentId}`,
    createdAt: feedback.updatedAt,
  });
}

export function buildFeedbackRequestNotification(appointment, createdAt = new Date().toISOString()) {
  return buildEventNotification({
    eventId: `${appointment.id}-feedback-requested`,
    recipientUid: appointment.studentUid,
    actorUid: appointment.counselorUid,
    type: 'feedback',
    title: '완료된 상담의 피드백을 남겨주세요',
    description: `${appointment.date} ${appointment.time} 상담에 대한 만족도와 의견을 알려주세요.`,
    to: `/student?feedback=${appointment.id}`,
    createdAt,
  });
}

const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0;

export function summarizeConsultationFeedback(feedbacks, completedAppointments = []) {
  const valid = feedbacks.filter(item => feedbackScoreFields.every(({ key }) => Number.isFinite(Number(item[key]))));
  const completedIds = new Set(completedAppointments.filter(isCompletedAppointment).map(item => item.id));
  const scoped = completedIds.size ? valid.filter(item => completedIds.has(item.appointmentId)) : valid;
  const denominator = completedIds.size || scoped.length;
  return {
    responseCount: scoped.length,
    eligibleCount: denominator,
    responseRate: denominator ? Math.round(scoped.length / denominator * 100) : 0,
    overallAverage: average(scoped.map(item => Number(item.overallScore))),
    helpfulnessAverage: average(scoped.map(item => Number(item.helpfulnessScore))),
    clarityAverage: average(scoped.map(item => Number(item.clarityScore))),
    followUpNeededCount: scoped.filter(item => item.needsFollowUp).length,
    followUpNeededRate: scoped.length ? Math.round(scoped.filter(item => item.needsFollowUp).length / scoped.length * 100) : 0,
  };
}
