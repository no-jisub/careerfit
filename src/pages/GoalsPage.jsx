import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, PageIntro } from '../components/UI';
import { addDays, toDateKey } from '../utils/date';
import { createGoal, goalsVisibleTo, updateGoal, validateGoalInput } from '../utils/goals';
import '../styles/goals.css';
import OutcomeSummary from '../components/OutcomeSummary';

const statusLabels = { notStarted: '시작 전', inProgress: '진행 중', achieved: '달성', onHold: '보류' };
const emptyForm = studentId => ({ studentId, title: '', description: '', targetDate: addDays(toDateKey(), 14), assigneeRole: 'student', visibility: 'public', consultationId: '', followUpId: '' });

export default function GoalsPage() {
  const { user, role, profile } = useAuth();
  const { students, consultations, followUps, consultationFeedbacks = [], goals = [], setGoals = () => {}, persistDocument, notify } = useApp();
  const currentStudent = role === 'student' ? students.find(item => item.uid === user?.uid || item.uid === profile?.id) : null;
  const [filter, setFilter] = useState('active');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => emptyForm(currentStudent?.id || students[0]?.id || ''));
  const actor = { uid: user?.uid || profile?.id || `demo-${role}`, name: profile?.displayName || user?.displayName || (role === 'student' ? '학생' : '상담사'), role };
  const visibleGoals = useMemo(() => goalsVisibleTo(goals, { role, uid: user?.uid || profile?.id, studentId: currentStudent?.id })
    .filter(item => filter === 'all' || (filter === 'active' ? item.status !== 'achieved' : item.status === filter))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate)), [goals, role, user?.uid, profile?.id, currentStudent?.id, filter]);

  const saveGoal = async event => {
    event.preventDefault();
    if (saving) return;
    const student = students.find(item => item.id === (role === 'student' ? currentStudent?.id : form.studentId));
    const input = { ...form, studentId: student?.id || '', studentUid: student?.uid || '', counselorUid: student?.counselorUid || (role !== 'student' ? actor.uid : '') };
    const checked = validateGoalInput(input);
    if (checked.error) { setError(checked.error); return; }
    const next = createGoal(input, actor);
    setSaving(true);
    try {
      await persistDocument('goals', next);
      setGoals(items => items.some(item => item.id === next.id) ? items : [...items, next]);
      setForm(emptyForm(currentStudent?.id || students[0]?.id || ''));
      setShowAdd(false);
      setError('');
      notify('상담 목표를 추가했습니다.');
    } finally { setSaving(false); }
  };

  const changeGoal = async (goal, changes) => {
    try {
      const next = updateGoal(goal, changes, actor);
      await persistDocument('goals', next);
      setGoals(items => items.map(item => item.id === next.id ? next : item));
      notify(next.status === 'achieved' ? '목표를 달성 처리했습니다.' : '목표 진행 상황을 저장했습니다.');
    } catch (caught) { notify(caught.message); }
  };

  return <div className="goals-page">
    <PageIntro eyebrow="상담 성과" title={role === 'student' ? '나의 상담 목표' : '상담 목표 및 성과'} description={role === 'student' ? '상담에서 정한 목표와 실행 상황을 기록해 보세요.' : '상담 목표를 후속 조치와 연결하고 달성 상황을 확인하세요.'} action={<button className="button primary" onClick={() => setShowAdd(true)}>목표 추가</button>} />
    <OutcomeSummary goals={visibleGoals} followUps={followUps} feedback={consultationFeedbacks} />
    <section className="goal-filter" aria-label="목표 상태 필터">
      {[['active', '진행 목표'], ['all', '전체'], ['achieved', '달성'], ['onHold', '보류']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
    </section>
    <section className="goal-list">
      {visibleGoals.map(goal => {
        const student = students.find(item => item.id === goal.studentId);
        const linkedConsultation = consultations.find(item => item.id === goal.consultationId);
        const linkedFollowUp = followUps.find(item => item.id === goal.followUpId);
        const overdue = goal.status !== 'achieved' && goal.targetDate < toDateKey();
        return <article className={`goal-card ${overdue ? 'overdue' : ''}`} key={goal.id}>
          <header><div><span className={`goal-status ${goal.status}`}>{statusLabels[goal.status]}</span>{goal.visibility === 'private' && <span className="goal-private">상담사 내부 목표</span>}<h2>{goal.title}</h2><p>{role !== 'student' && `${student?.name || '학생'} · `}목표일 {goal.targetDate}{overdue ? ' · 기한 초과' : ''}</p></div><span className="goal-owner">{goal.assigneeRole === 'student' ? '학생 담당' : '상담사 담당'}</span></header>
          <p className="goal-description">{goal.description}</p>
          {(linkedConsultation || linkedFollowUp) && <div className="goal-links">{linkedConsultation && <span>상담 {linkedConsultation.date}</span>}{linkedFollowUp && <span>후속 조치 · {linkedFollowUp.content}</span>}</div>}
          <label className="goal-progress">학생 진행 내용<textarea value={goal.studentProgress || ''} maxLength="500" placeholder="실행한 내용이나 현재 상황을 입력하세요." onChange={event => setGoals(items => items.map(item => item.id === goal.id ? { ...item, studentProgress: event.target.value } : item))} onBlur={event => changeGoal(goal, { studentProgress: event.target.value })} /></label>
          <footer><small>마지막 수정: {goal.lastModifiedByName || '-'} · {goal.updatedAt ? new Date(goal.updatedAt).toLocaleString('ko-KR') : '-'}</small><div>{role === 'student' ? <select aria-label={`${goal.title} 진행 상태`} value={goal.status} onChange={event => changeGoal(goal, { status: event.target.value })}><option value="notStarted">시작 전</option><option value="inProgress">진행 중</option><option value="onHold">보류</option>{goal.status === 'achieved' && <option value="achieved">달성</option>}</select> : <><select aria-label={`${goal.title} 상태`} value={goal.status} onChange={event => changeGoal(goal, { status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{goal.status !== 'achieved' && <button className="button primary small" onClick={() => changeGoal(goal, { status: 'achieved' })}>달성 처리</button>}</>}</div></footer>
        </article>;
      })}
      {!visibleGoals.length && <EmptyState icon="check" title="표시할 상담 목표가 없습니다" description="새 목표를 추가하면 진행 상황과 성과를 함께 확인할 수 있습니다." />}
    </section>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAdd(false)}><section className="modal goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-add-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">새로운 상담 성과</span><h2 id="goal-add-title">상담 목표 추가</h2><form onSubmit={saveGoal}>
      {role !== 'student' && <label>학생<select value={form.studentId} onChange={event => setForm(value => ({ ...value, studentId: event.target.value, consultationId: '', followUpId: '' }))}>{students.map(student => <option value={student.id} key={student.id}>{student.name} · {student.department}</option>)}</select></label>}
      <label>목표 제목<input autoFocus maxLength="80" value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} placeholder="예: 관심 직무 2개 비교 정리" /></label>
      <label>목표 설명<textarea maxLength="500" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} placeholder="완료 기준이 분명하도록 작성해 주세요." /></label>
      <div className="form-row"><label>목표 날짜<input type="date" value={form.targetDate} onChange={event => setForm(value => ({ ...value, targetDate: event.target.value }))} /></label><label>담당자<select value={form.assigneeRole} onChange={event => setForm(value => ({ ...value, assigneeRole: event.target.value }))}><option value="student">학생</option><option value="counselor">상담사</option></select></label></div>
      <div className="form-row"><label>연결할 상담<select value={form.consultationId} onChange={event => setForm(value => ({ ...value, consultationId: event.target.value }))}><option value="">연결 안 함</option>{consultations.filter(item => item.studentId === (role === 'student' ? currentStudent?.id : form.studentId)).map(item => <option value={item.id} key={item.id}>{item.date} · {item.type}</option>)}</select></label><label>연결할 후속 조치<select value={form.followUpId} onChange={event => setForm(value => ({ ...value, followUpId: event.target.value }))}><option value="">연결 안 함</option>{followUps.filter(item => item.studentId === (role === 'student' ? currentStudent?.id : form.studentId)).map(item => <option value={item.id} key={item.id}>{item.content}</option>)}</select></label></div>
      {role !== 'student' && <label>공개 범위<select value={form.visibility} onChange={event => setForm(value => ({ ...value, visibility: event.target.value }))}><option value="public">학생에게 공개</option><option value="private">상담사 내부 목표</option></select></label>}
      {error && <p className="field-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowAdd(false)}>취소</button><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '목표 추가'}</button></div>
    </form></section></div>}
  </div>;
}
