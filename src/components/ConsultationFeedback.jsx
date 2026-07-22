import { useEffect, useMemo, useState } from 'react';
import {
  buildConsultationFeedback,
  canCreateFeedback,
  canEditFeedback,
  feedbackScoreFields,
  getFeedbackEditDeadline,
  isCompletedAppointment,
} from '../utils/feedback';

const emptyForm = { overallScore: 0, helpfulnessScore: 0, clarityScore: 0, needsFollowUp: null, comment: '' };

function ScoreInput({ name, label, value, onChange, disabled, error }) {
  return <fieldset className="feedback-score-field" disabled={disabled}>
    <legend>{label}</legend>
    <div role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map(score => <label key={score}>
      <input type="radio" name={name} value={score} checked={Number(value) === score} onChange={() => onChange(score)} />
      <span>{score}<small>점</small></span>
    </label>)}</div>
    {error && <small className="field-error">{error}</small>}
  </fieldset>;
}

export function ConsultationFeedbackForm({ appointment, consultationId = '', studentUid, feedback, onSave, now = new Date() }) {
  const initial = useMemo(() => feedback ? {
    overallScore: feedback.overallScore,
    helpfulnessScore: feedback.helpfulnessScore,
    clarityScore: feedback.clarityScore,
    needsFollowUp: feedback.needsFollowUp,
    comment: feedback.comment || '',
  } : emptyForm, [feedback]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(initial); setErrors({}); }, [appointment.id, initial]);
  const editable = feedback ? canEditFeedback(feedback, studentUid, now) : canCreateFeedback(appointment, studentUid);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    const result = buildConsultationFeedback({ appointment, consultationId, studentUid, input: form, existingFeedback: feedback, now });
    setErrors(result.errors);
    if (!result.value) return;
    setSaving(true);
    try { await onSave(result.value); } finally { setSaving(false); }
  };
  if (!isCompletedAppointment(appointment)) return <p className="feedback-unavailable">상담이 완료되면 만족도와 의견을 남길 수 있어요.</p>;
  return <form className="consultation-feedback-form" onSubmit={submit}>
    <div className="section-header"><div><span className="eyebrow">상담 피드백</span><h2>{feedback ? '작성한 피드백' : '이번 상담은 어떠셨나요?'}</h2><p>응답은 상담 서비스 개선과 후속 상담 준비에 활용됩니다.</p></div></div>
    {feedback && <p className="feedback-edit-notice">작성 후 7일 동안 수정할 수 있습니다. 수정 기한: {getFeedbackEditDeadline(feedback)?.toLocaleDateString('ko-KR')}</p>}
    {feedbackScoreFields.map(item => <ScoreInput key={item.key} name={`${appointment.id}-${item.key}`} label={item.label} value={form[item.key]} onChange={value => update(item.key, value)} disabled={!editable || saving} error={errors[item.key]} />)}
    <fieldset disabled={!editable || saving}><legend>추가 상담이 필요한가요?</legend><div className="feedback-choice-row"><label><input type="radio" name={`${appointment.id}-follow-up`} checked={form.needsFollowUp === true} onChange={() => update('needsFollowUp', true)} /> 필요해요</label><label><input type="radio" name={`${appointment.id}-follow-up`} checked={form.needsFollowUp === false} onChange={() => update('needsFollowUp', false)} /> 지금은 괜찮아요</label></div>{errors.needsFollowUp && <small className="field-error">{errors.needsFollowUp}</small>}</fieldset>
    <label>자유 의견 <small>선택 · 최대 1,000자</small><textarea rows="4" maxLength="1000" value={form.comment} onChange={event => update('comment', event.target.value)} disabled={!editable || saving} placeholder="도움이 된 점이나 다음 상담에서 다루고 싶은 내용을 알려주세요." /></label>
    {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
    {editable ? <button className="button primary" disabled={saving}>{saving ? '저장 중...' : feedback ? '피드백 수정' : '피드백 제출'}</button> : feedback && <p className="feedback-locked">수정 가능 기간이 지나 작성한 내용을 조회만 할 수 있습니다.</p>}
  </form>;
}

export function CounselorFeedbackSummary({ feedbacks, completedAppointments }) {
  const stats = useMemo(() => {
    const values = feedbacks || [];
    const average = key => values.length ? (values.reduce((sum, item) => sum + Number(item[key] || 0), 0) / values.length).toFixed(1) : '-';
    const eligible = (completedAppointments || []).filter(isCompletedAppointment).length;
    return { count: values.length, eligible, overall: average('overallScore'), helpfulness: average('helpfulnessScore'), clarity: average('clarityScore'), followUp: values.filter(item => item.needsFollowUp).length };
  }, [feedbacks, completedAppointments]);
  return <section className="card counselor-feedback-summary"><div className="section-header"><div><span className="eyebrow">상담 성과</span><h2>학생 피드백</h2></div><span>{stats.count}/{stats.eligible || stats.count}명 응답</span></div><dl><div><dt>전반 만족도</dt><dd>{stats.overall}{stats.overall !== '-' && ' / 5'}</dd></div><div><dt>도움 정도</dt><dd>{stats.helpfulness}{stats.helpfulness !== '-' && ' / 5'}</dd></div><div><dt>설명 명확성</dt><dd>{stats.clarity}{stats.clarity !== '-' && ' / 5'}</dd></div><div><dt>추가 상담 필요</dt><dd>{stats.followUp}명</dd></div></dl></section>;
}
