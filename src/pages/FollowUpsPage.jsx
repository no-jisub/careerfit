import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusBadge, StatusTabs } from '../components/UI';
import { addDays, resolveFollowUpStatus, toDateKey } from '../utils/date';
import { validateFollowUpInput } from '../utils/validation';

const followUpStatusOptions = [
  { value: 'all', label: '전체', description: '모든 후속 조치', icon: 'layers' },
  { value: 'scheduled', label: '예정', description: '시작 전', icon: 'calendar' },
  { value: 'inProgress', label: '진행 중', description: '현재 처리 중', icon: 'clock' },
  { value: 'complete', label: '완료', description: '처리 완료', icon: 'check' },
  { value: 'overdue', label: '기한 초과', description: '우선 확인 필요', icon: 'alert' },
];

export default function FollowUpsPage() {
  const { students, followUps, setFollowUps, persistDocument, notify } = useApp();
  const [filter, setFilter] = useState('all');
  const [owner, setOwner] = useState('all');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(() => ({ studentId: students[0]?.id || '', content: '', owner: '학생', dueDate: addDays(toDateKey(), 7) }));
  const statusCounts = followUps.reduce((counts, followUp) => {
    counts[followUp.status] = (counts[followUp.status] || 0) + 1;
    return counts;
  }, {});
  const items = useMemo(() => followUps.filter(f => {
    const student = students.find(item => item.id === f.studentId);
    const keyword = query.trim().toLowerCase();
    return student && (filter === 'all' || f.status === filter) && (owner === 'all' || f.owner === owner)
      && (!keyword || [student.name, student.studentNo, f.content].some(value => value?.toLowerCase().includes(keyword)));
  }).sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1) || a.dueDate.localeCompare(b.dueDate)), [students, followUps, filter, owner, query]);
  useEffect(() => {
    if (!showAdd) return undefined;
    const closeModal = event => { if (event.key === 'Escape' && !saving) setShowAdd(false); };
    window.addEventListener('keydown', closeModal);
    return () => window.removeEventListener('keydown', closeModal);
  }, [showAdd, saving]);

  const updateTask = async (id, changes, message) => {
    const current = followUps.find(f => f.id === id);
    if (!current) return;
    const changed = { ...current, ...changes, updatedAt: new Date().toISOString() };
    const updated = changes.dueDate ? { ...changed, status: resolveFollowUpStatus(changed) } : changed;
    try {
      await persistDocument('followUps', updated);
      setFollowUps(prev => prev.map(item => item.id === id ? updated : item));
      notify(message);
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };

  const updateStatus = (id, status) => updateTask(
    id,
    { status, ...(status === 'complete' ? { completedAt: new Date().toISOString() } : { completedAt: null }) },
    status === 'complete' ? '후속 조치를 완료 처리했습니다.' : '후속 조치 상태를 변경했습니다.',
  );

  const addTask = async e => {
    e.preventDefault();
    if (saving) return;
    const validated = validateFollowUpInput(form);
    if (validated.error) { setFormError(validated.error); return; }
    const safeForm = validated.value;
    const nextTask = {
      id: `f${Date.now()}`,
      studentId: safeForm.studentId,
      content: safeForm.content,
      owner: safeForm.owner,
      dueDate: safeForm.dueDate,
      status: resolveFollowUpStatus({ dueDate: safeForm.dueDate, status: 'scheduled' }),
      consultationDate: toDateKey(),
    };
    setSaving(true);
    try {
      await persistDocument('followUps', nextTask);
      setFollowUps(items => items.some(item => item.id === nextTask.id) ? items : [...items, nextTask]);
      setForm({ studentId: students[0]?.id || '', content: '', owner: '학생', dueDate: addDays(toDateKey(), 7) });
      setFormError('');
      setShowAdd(false);
      notify('후속 조치를 추가했습니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
    finally { setSaving(false); }
  };

  return <>
    <PageIntro eyebrow="후속 조치 관리" title="다음 행동을 놓치지 않도록" description="모든 학생의 후속 조치를 기한과 담당자별로 모아 확인하세요." action={<button className="button primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} />후속 조치 추가</button>} />
    <section className="card task-filter-panel">
      <StatusTabs
        className="task-status-tabs compact-status-tabs"
        label="후속 조치 상태"
        options={followUpStatusOptions.map(option => ({ ...option, count: option.value === 'all' ? followUps.length : statusCounts[option.value] || 0 }))}
        value={filter}
        onChange={setFilter}
      />
      <div className="task-filter-tools">
        <label className="search-field"><span className="sr-only">후속 조치 검색</span><Icon name="search" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생 이름, 학번 또는 후속 조치 내용 검색" /></label>
        <select aria-label="행동 담당자" value={owner} onChange={e => setOwner(e.target.value)}><option value="all">전체 담당자</option><option value="학생">학생 담당</option><option value="교직원">교직원 담당</option></select>
      </div>
    </section>
    <section className="card task-table-card">
      <div className="list-toolbar"><div><h2>후속 조치 목록 <span>{items.length}</span></h2><p>기한 초과 항목이 먼저 표시됩니다.</p></div></div>
      {items.length ? <>
        <div className="task-list-head" aria-hidden="true"><span>학생</span><span>후속 조치</span><span>담당자</span><span>완료 기한</span><span>상태 및 처리</span></div>
        <div className="task-list">{items.map(f => {
          const student = students.find(s => s.id === f.studentId);
          return <article className={`task-row ${f.status}`} key={f.id}>
            <div className="task-student"><div><Link to={`/students/${student.id}`}>{student.name}</Link><span>{student.department}</span></div></div>
            <div className="task-content"><StatusBadge status={f.status} context="followUp" /><strong>{f.content}</strong><small>관련 상담 {f.consultationDate}</small></div>
            <div className="task-owner"><span className="task-cell-label">담당자</span><strong>{f.owner}</strong></div>
            <div className="task-due"><label><span className="task-cell-label">완료 기한</span><input aria-label={`${student.name} 후속 조치 완료 기한`} type="date" value={f.dueDate} onChange={e => updateTask(f.id, { dueDate: e.target.value }, '완료 기한을 변경했습니다.')} /></label></div>
            <div className="task-actions"><label><span className="sr-only">상태 변경</span><select aria-label={`${student.name} 후속 조치 상태`} value={f.status} onChange={e => updateStatus(f.id, e.target.value)}><option value="scheduled">예정</option><option value="inProgress">진행 중</option><option value="complete">완료</option><option value="overdue">기한 초과</option></select></label>{f.status !== 'complete' && <button className="button secondary small" onClick={() => updateStatus(f.id, 'complete')}>완료 처리</button>}</div>
          </article>;
        })}</div>
      </> : <EmptyState title="등록된 후속 조치가 없습니다" description="상단의 추가 버튼으로 다음 행동을 등록해 보세요." />}
    </section>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !saving && setShowAdd(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="followup-add-title"><button className="modal-close" aria-label="닫기" disabled={saving} onClick={() => setShowAdd(false)}><Icon name="close" size={19} /></button><span className="eyebrow">새로운 다음 행동</span><h2 id="followup-add-title">후속 조치 추가</h2><form onSubmit={addTask}><label>학생<select autoFocus value={form.studentId} onChange={e => setForm(prev => ({ ...prev, studentId: e.target.value }))} required><option value="">학생을 선택하세요</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.department}</option>)}</select></label><label>후속 조치 내용<input maxLength="300" value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} placeholder="학생 또는 담당자가 해야 할 행동" required /></label><div className="form-row"><label>행동 담당자<select value={form.owner} onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}><option>학생</option><option>교직원</option></select></label><label>완료 기한<input type="date" value={form.dueDate} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} required /></label></div>{formError && <p className="field-error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => setShowAdd(false)}>취소</button><button className="button primary" disabled={saving}>{saving ? '저장 중...' : '후속 조치 추가'}</button></div></form></section></div>}
  </>;
}
