import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import TaskOwnerCards from '../components/TaskOwnerCards';
import SensitiveStudentInfo from '../components/SensitiveStudentInfo';
import { EmptyState, StatusBadge } from '../components/UI';
import { addDays, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';
import { buildConsultationSummary, consultationEvidenceFieldOptions, consultationPublicFieldOptions, defaultConsultationVisibility } from '../utils/consultations';
import { openAttachment } from '../services/attachmentService';
import { maskStudentNo } from '../utils/sensitiveData';
import { buildEventNotification } from '../utils/notifications';

const studentTagOptions = ['면접 준비', '포트폴리오', '진로 미정', '공공기관 희망'];
const fullDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});
const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' });
const taskOwnerFormOptions = [
  { value: '학생', label: '학생 담당', description: '학생의 ‘나의 할 일’에 바로 표시됩니다.', icon: 'students', tone: 'student' },
  { value: '교직원', label: '상담사 담당', description: '상담사가 직접 처리할 지원 업무입니다.', icon: 'briefcase', tone: 'counselor' },
];

function getConsultationDateLabel(date) {
  const [, month, day] = date.split('-').map(Number);
  const parsed = new Date(`${date}T00:00:00`);
  return {
    short: `${month}.${day}`,
    weekday: weekdayFormatter.format(parsed),
    full: fullDateFormatter.format(parsed),
  };
}

function getCompactDateLabel(date) {
  if (!date) return '기록 없음';
  const [year, month, day] = date.split('-');
  return `${year.slice(-2)}/${month}/${day}`;
}

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { students, setStudents, consultations, setConsultations, consultationSummaries, setConsultationSummaries, consultationNotes, followUps, setFollowUps, appointments, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user, profile } = useAuth();
  const counselorUid = user?.uid || profile?.id || 'demo-counselor';
  const student = students.find(s => s.id === studentId);
  const history = student ? consultations.filter(c => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const tasks = student ? followUps.filter(f => f.studentId === student.id && f.status !== 'complete') : [];
  const requestedConsultationId = searchParams.get('consultation');
  const [selectedConsultationId, setSelectedConsultationId] = useState(requestedConsultationId || history[0]?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [taskText, setTaskText] = useState('');
  const [taskOwner, setTaskOwner] = useState('학생');
  const [dueDate, setDueDate] = useState(() => addDays(toDateKey(), 7));
  const [editingConsultation, setEditingConsultation] = useState(null);
  const [savingConsultation, setSavingConsultation] = useState(false);
  useEffect(() => {
    if (!requestedConsultationId || !history.some(item => item.id === requestedConsultationId)) return undefined;
    setSelectedConsultationId(requestedConsultationId);
    const frame = window.requestAnimationFrame(() => {
      const panel = document.getElementById('student-consultation-panel');
      panel?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      panel?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedConsultationId, consultations]);
  useEffect(() => {
    if (!showAdd && !showEdit) return undefined;
    const closeModal = event => {
      if (event.key !== 'Escape' || savingStudent) return;
      setShowAdd(false);
      setShowEdit(false);
    };
    window.addEventListener('keydown', closeModal);
    return () => window.removeEventListener('keydown', closeModal);
  }, [showAdd, showEdit, savingStudent]);
  if (!student) return <section className="card"><EmptyState title="담당 학생을 찾을 수 없습니다" description="배정이 해제되었거나 현재 계정에서 조회할 수 없는 학생입니다." action={<Link className="button secondary" to="/students">담당 학생 목록으로</Link>} /></section>;
  const selectedConsultation = history.find(item => item.id === selectedConsultationId) || history[0];
  const selectedConsultationDate = selectedConsultation ? getConsultationDateLabel(selectedConsultation.date) : null;
  const selectedInternalNote = selectedConsultation ? consultationNotes.find(note => note.consultationId === selectedConsultation.id) : null;
  const latestConsultationDate = history[0]?.date || student.lastConsultation;
  const studentAttachments = appointments
    .filter(item => item.studentId === student.id)
    .flatMap(item => item.attachments || []);
  const openConsultationRecord = recordId => {
    setSelectedConsultationId(recordId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('consultation', recordId);
    setSearchParams(nextSearchParams, { replace: true });
    window.requestAnimationFrame(() => {
      const panel = document.getElementById('student-consultation-panel');
      panel?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      panel?.focus({ preventScroll: true });
    });
  };
  const handleConsultationTabKeyDown = (event, index) => {
    const keyOffsets = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    let nextIndex;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = history.length - 1;
    else if (event.key in keyOffsets) nextIndex = (index + keyOffsets[event.key] + history.length) % history.length;
    else return;
    event.preventDefault();
    const nextRecord = history[nextIndex];
    setSelectedConsultationId(nextRecord.id);
    window.requestAnimationFrame(() => document.getElementById(`student-consultation-tab-${nextRecord.id}`)?.focus());
  };
  const openEdit = () => {
    setEditForm({
      interests: student.interests.join(', '),
      goal: student.goal,
      concern: student.concern,
    });
    setShowEdit(true);
  };
  const updateStudentField = (key, value) => setEditForm(prev => ({ ...prev, [key]: value }));
  const toggleStudentTag = tag => {
    const tags = (editForm.interests || '').split(',').map(item => item.trim()).filter(Boolean);
    const nextTags = tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag];
    updateStudentField('interests', nextTags.join(', '));
  };
  const saveStudent = async e => {
    e.preventDefault();
    if (savingStudent) return;
    const updated = {
      ...student,
      ...editForm,
      goal: editForm.goal.trim(),
      concern: editForm.concern.trim(),
      interests: editForm.interests.split(',').map(item => item.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    const notification = student.uid ? buildEventNotification({
      eventId: `${student.id}-context-${updated.updatedAt}`,
      recipientUid: student.uid,
      actorUid: counselorUid,
      type: 'profile',
      title: '상담 정보가 업데이트되었습니다',
      description: '담당 상담사가 진로 목표 또는 현재 고민 정보를 업데이트했습니다.',
      to: '/student',
      createdAt: updated.updatedAt,
    }) : null;
    setSavingStudent(true);
    try {
      await persistDocumentGroup([
        { name: 'students', record: updated },
        ...(notification ? [{ name: 'notifications', record: notification }] : []),
      ]);
      setStudents(prev => prev.map(item => item.id === student.id ? updated : item));
      if (notification) setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setShowEdit(false);
      notify('학생 정보를 수정했습니다.');
    } finally {
      setSavingStudent(false);
    }
  };
  const addTask = async e => {
    e.preventDefault();
    if (!taskText.trim() || !dueDate) return;
    const nextTask = { id: `f${Date.now()}`, studentId: student.id, content: taskText.trim(), owner: taskOwner, dueDate, status: 'scheduled', consultationDate: toDateKey() };
    const notification = nextTask.owner === '학생' && student.uid ? buildEventNotification({
      eventId: `${nextTask.id}-assigned`,
      recipientUid: student.uid,
      actorUid: counselorUid,
      type: 'followup',
      title: '새로운 할 일이 등록되었습니다',
      description: `${nextTask.content} · ${nextTask.dueDate}까지`,
      to: '/student',
    }) : null;
    try {
      await persistDocumentGroup([
        { name: 'followUps', record: nextTask },
        ...(notification ? [{ name: 'notifications', record: notification }] : []),
      ]);
      setFollowUps(items => items.some(item => item.id === nextTask.id) ? items : [...items, nextTask]);
      if (notification) setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setTaskText('');
      setTaskOwner('학생');
      setShowAdd(false);
      notify('상담 후 할 일을 추가했습니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };
  const openConsultationEdit = consultation => setEditingConsultation({
    ...consultation,
    programsText: (consultation.programs || []).join(', '),
    publication: { ...defaultConsultationVisibility, ...(consultation.publication || {}) },
  });
  const updateConsultationField = (key, value) => setEditingConsultation(current => ({ ...current, [key]: value }));
  const saveConsultationEdit = async event => {
    event.preventDefault();
    if (!editingConsultation || savingConsultation) return;
    const now = new Date().toISOString();
    const updated = {
      ...consultations.find(item => item.id === editingConsultation.id),
      ...editingConsultation,
      programs: editingConsultation.programsText.split(',').map(item => item.trim()).filter(Boolean),
      studentVisible: Object.values(editingConsultation.publication).some(Boolean),
      modifiedAt: now,
      modifiedBy: user?.uid || profile?.id || 'demo-counselor',
      modifiedByName: profile?.displayName || user?.displayName || '상담 담당자',
      updatedAt: now,
    };
    delete updated.programsText;
    const summary = buildConsultationSummary(updated, updated.publication);
    const notification = summary.published && student.uid ? buildEventNotification({
      eventId: `${updated.id}-summary-updated-${now}`,
      recipientUid: student.uid,
      actorUid: counselorUid,
      type: 'summary',
      title: '공개 상담 요약이 수정되었습니다',
      description: `${updated.date} 상담에서 공개된 내용을 다시 확인하세요.`,
      to: '/student',
      createdAt: now,
    }) : null;
    setSavingConsultation(true);
    try {
      await persistDocumentGroup([
        { name: 'consultations', record: updated },
        { name: 'consultationSummaries', record: summary },
        ...(notification ? [{ name: 'notifications', record: notification }] : []),
      ]);
      setConsultations(items => items.map(item => item.id === updated.id ? updated : item));
      setConsultationSummaries(items => items.some(item => item.id === summary.id) ? items.map(item => item.id === summary.id ? summary : item) : [...items, summary]);
      if (notification) setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setEditingConsultation(null);
      notify('상담 기록을 수정했습니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
    finally { setSavingConsultation(false); }
  };
  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/students">학생 관리</Link><Icon name="chevron" size={14} /><span>{student.name}</span></nav>
    <section className="profile-hero student-case-hero">
      <div className="profile-main"><span className="profile-avatar-large" aria-hidden="true">{student.name.slice(1, 3)}</span><div><div className="profile-name"><h1>{student.name}</h1><StatusBadge status={student.status} /></div><p>{maskStudentNo(student.studentNo)} · {student.department} · {student.grade}</p><div className="tag-row">{student.interests.map(x => <span className="tag" key={x}>{x}</span>)}</div></div></div>
      <div className="profile-operational-summary" aria-label="학생 상담 현황"><div><span>누적 상담</span><strong>{history.length}<small>회</small></strong></div><div><span>최근 상담</span><strong>{getCompactDateLabel(latestConsultationDate)}</strong></div></div>
      <div className="profile-actions"><Link to={`/students/${student.id}/preparation`} className="button primary"><Icon name="list" size={18} />상담 전 준비</Link><Link to={`/students/${student.id}/consultation/new`} className="button secondary"><Icon name="note" size={18} />상담 기록 작성</Link><button className="button secondary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} />할 일 추가</button><button className="button ghost" onClick={openEdit}><Icon name="edit" size={16} />상담 맥락 수정</button></div>
      <div className="student-hero-information">
        <dl className="student-hero-facts">
          <div><dt><Icon name="target" size={15} />진로 목표</dt><dd>{student.goal}</dd></div>
          <div><dt><Icon name="user" size={15} />담당 상담자</dt><dd>{student.counselor}</dd></div>
          <div><dt><Icon name="calendar" size={15} />최근 상담일</dt><dd>{student.lastConsultation || '기록 없음'}</dd></div>
        </dl>
        <div className="student-hero-sensitive"><SensitiveStudentInfo student={student} /></div>
        {studentAttachments.length > 0 && <div className="student-hero-attachments"><span><Icon name="note" size={15} />상담 준비자료</span><div>{studentAttachments.map(file => <button type="button" className="text-button" key={file.id} onClick={() => openAttachment(file)}>{file.fileName}</button>)}</div></div>}
      </div>
    </section>
    <div className="student-detail-flow">
      <section className="card student-consultation-records" id="student-consultation-records">
        <div className="section-header"><div><span className="eyebrow">상담 히스토리</span><h2>날짜별 상담 기록</h2><p>상담 날짜를 누르면 해당 회차의 상세 상담일지로 바로 이동합니다.</p></div><div className="student-consultation-header-actions"><span className="student-record-count">총 {history.length}회</span><Link className="text-link" to={`/students/${student.id}/consultation/new`}>기록 작성 <Icon name="plus" size={15} /></Link></div></div>
        {history.length && selectedConsultation ? <>
          <div className="consultation-date-navigation">
            <div><span>상담 날짜 선택</span><small>최신순</small></div>
            <div role="tablist" aria-label={`${student.name} 학생 상담 날짜`}>
              {history.map((record, index) => {
                const date = getConsultationDateLabel(record.date);
                const active = record.id === selectedConsultation.id;
                return <button id={`student-consultation-tab-${record.id}`} type="button" role="tab" aria-label={`${date.full} ${record.type} 상세 상담일지 보기`} aria-selected={active} aria-controls="student-consultation-panel" tabIndex={active ? 0 : -1} className={active ? 'active' : ''} onClick={() => openConsultationRecord(record.id)} onKeyDown={event => handleConsultationTabKeyDown(event, index)} key={record.id}><time dateTime={record.date}><strong>{date.short}</strong><span>{date.weekday}</span></time><span className="consultation-date-entry"><small>{record.type}</small><span>{active ? '상세 일지 열림' : '상세 일지 보기'}<Icon name="chevron" size={13} /></span></span></button>;
              })}
            </div>
          </div>
          <section className="consultation-record-preview" id="student-consultation-panel" role="tabpanel" tabIndex="-1" aria-labelledby={`student-consultation-tab-${selectedConsultation.id}`}>
            <div className="consultation-record-preview-head"><div><span className="consultation-detail-eyebrow"><Icon name="note" size={15} />상세 상담일지</span><time dateTime={selectedConsultation.date}>{selectedConsultationDate.full}</time><div><span className="tag">{selectedConsultation.type}</span><span className={`visibility-tag ${selectedConsultation.studentVisible === false ? 'private' : ''}`}>{selectedConsultation.studentVisible === false ? '학생 비공개' : '학생 공개'}</span>{selectedConsultation.aiReview && <span className="ai-reviewed-tag"><Icon name="shield" size={12} />작성 근거 검토 완료</span>}</div></div></div>
            <h3>{selectedConsultation.purpose}</h3>
            <p className="consultation-record-summary">{selectedConsultation.summary}</p>
            <div className="timeline-body student-consultation-detail">
              {selectedInternalNote?.note && <div className="internal-note"><strong><Icon name="lock" size={15} />상담 담당자 내부 메모</strong><p>{selectedInternalNote.note}</p></div>}
              {selectedConsultation.aiReview && <details className="consultation-evidence-panel" open={requestedConsultationId === selectedConsultation.id}><summary><span><Icon name="shield" size={17} />요약 근거 및 상담사 검토</span><small>{selectedConsultation.aiReview.reviewedAt?.slice(0, 10)} · {selectedConsultation.aiReview.reviewedBy}</small></summary><div><p>초안의 각 항목을 작성할 때 사용한 근거입니다. 원문 메모는 학생에게 공개되지 않습니다.</p>{consultationEvidenceFieldOptions.map(({ key, label }) => <section key={key}><strong>{label}</strong><ul>{(selectedConsultation.aiReview.evidence?.[key] || ['근거 부족']).map((evidence, index) => <li key={`${key}-${index}`}>{evidence}</li>)}</ul></section>)}{selectedConsultation.aiReview.needsConfirmation?.length > 0 && <section className="needs-confirmation"><strong>추가 확인 필요</strong><ul>{selectedConsultation.aiReview.needsConfirmation.map((item, index) => <li key={`confirm-${index}`}>{item}</li>)}</ul></section>}</div></details>}
              <dl><div><dt>학생의 강점</dt><dd>{selectedConsultation.strengths || '-'}</dd></div><div><dt>안내한 내용</dt><dd>{selectedConsultation.guidance || '-'}</dd></div><div><dt>학생의 다음 행동</dt><dd>{selectedConsultation.studentActions || '-'}</dd></div><div><dt>담당자의 다음 행동</dt><dd>{selectedConsultation.counselorActions || '-'}</dd></div><div><dt>다음 상담 확인 사항</dt><dd>{selectedConsultation.nextCheckItems || '-'}</dd></div></dl>
              {selectedConsultation.programs?.length > 0 && <div className="program-inline"><Icon name="target" size={17} /><span>추천 프로그램</span><strong>{selectedConsultation.programs.join(', ')}</strong></div>}
              <div className="consultation-record-footer"><p className="counselor-line">{selectedConsultation.studentVisible === false ? '학생 비공개 · ' : '선택 항목 공개 · '}{selectedConsultation.aiReview ? '작성 도우미 활용·상담사 근거 검토 완료 · ' : '상담사 직접 작성 · '}상담 담당자 {selectedConsultation.counselor}{selectedConsultation.modifiedAt ? ` · 마지막 수정 ${selectedConsultation.modifiedAt.slice(0, 10)} ${selectedConsultation.modifiedByName}` : ''}</p><button className="button secondary small" onClick={() => openConsultationEdit(selectedConsultation)}><Icon name="edit" size={15} />기록 수정</button></div>
            </div>
          </section>
        </> : <EmptyState title="아직 작성된 상담 기록이 없습니다" description="첫 상담을 시작하고 학생의 목표와 다음 행동을 기록해 보세요." />}
      </section>

      <section className="card student-followup-section" aria-labelledby="student-followup-title">
        <div className="section-header"><div><span className="eyebrow">상담 후 할 일</span><h2 id="student-followup-title">미완료 할 일 <em>{tasks.length}</em></h2><p>학생과 상담사가 다음 상담 전까지 처리할 내용을 한곳에서 확인합니다.</p></div><button className="button secondary small" onClick={() => setShowAdd(true)}><Icon name="plus" size={16} />할 일 추가</button></div>
        {tasks.length ? <div className="student-followup-grid">{tasks.map(t => <article className={t.status === 'overdue' ? 'overdue' : ''} key={t.id}><div><StatusBadge status={t.status} context="followUp" /><span>{t.owner === '교직원' ? '상담사' : t.owner} 담당</span></div><strong>{t.content}</strong><small><Icon name="calendar" size={14} />{t.dueDate}까지</small></article>)}</div> : <EmptyState title="등록된 할 일이 없습니다" description="다음 상담 전에 필요한 행동을 추가해 주세요." action={<button className="button secondary small" onClick={() => setShowAdd(true)}><Icon name="plus" size={16} />첫 할 일 추가</button>} />}
      </section>
    </div>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setShowAdd(false)}><section className="modal followup-add-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAdd(false)}><Icon name="close" size={19} /></button><span className="eyebrow">새로운 다음 행동</span><h2 id="task-modal-title">상담 후 할 일 추가</h2><form onSubmit={addTask}><label>할 일 내용<input autoFocus value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="학생 또는 상담사가 해야 할 다음 행동" required /></label><TaskOwnerCards className="task-owner-form-cards" label="누가 담당하나요?" name="student-detail-task-owner" value={taskOwner} onChange={setTaskOwner} options={taskOwnerFormOptions} /><label>완료 기한<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowAdd(false)}>취소</button><button className="button primary">할 일 추가</button></div></form></section></div>}
    {showEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingStudent && setShowEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingStudent} onClick={() => setShowEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">상담 맥락</span><h2 id="student-edit-title">학생 이해 정보 수정</h2><p className="field-hint">이름·학번·연락처 같은 식별정보는 개인정보 보호를 위해 이 화면에서 수정하지 않습니다.</p><form onSubmit={saveStudent}><label>관심 분야 <small className="field-hint">상담 태그를 누르거나 쉼표로 직접 입력해 주세요.</small><div className="tag-picker">{studentTagOptions.map(tag => <button type="button" key={tag} className={(editForm.interests || '').split(',').map(item => item.trim()).includes(tag) ? 'active' : ''} onClick={() => toggleStudentTag(tag)}>{tag}</button>)}</div><input autoFocus value={editForm.interests || ''} onChange={e => updateStudentField('interests', e.target.value)} /></label><label>진로 목표<input value={editForm.goal || ''} onChange={e => updateStudentField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={editForm.concern || ''} onChange={e => updateStudentField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingStudent} onClick={() => setShowEdit(false)}>취소</button><button className="button primary" disabled={savingStudent}>{savingStudent ? '저장 중...' : '상담 맥락 저장'}</button></div></form></section></div>}
    {editingConsultation && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !savingConsultation && setEditingConsultation(null)}><section className="modal consultation-edit-modal" role="dialog" aria-modal="true" aria-labelledby="consultation-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingConsultation} onClick={() => setEditingConsultation(null)}><Icon name="close" size={19} /></button><span className="eyebrow">완료된 상담 기록</span><h2 id="consultation-edit-title">상담 기록 수정</h2><form onSubmit={saveConsultationEdit}><label>상담 목적<input value={editingConsultation.purpose || ''} onChange={event => updateConsultationField('purpose', event.target.value)} required /></label><label>상담 요약<textarea rows="4" value={editingConsultation.summary || ''} onChange={event => updateConsultationField('summary', event.target.value)} required /></label><label>학생의 강점<textarea rows="3" value={editingConsultation.strengths || ''} onChange={event => updateConsultationField('strengths', event.target.value)} /></label><label>개선 또는 고민 사항<textarea rows="3" value={editingConsultation.concern || ''} onChange={event => updateConsultationField('concern', event.target.value)} /></label><label>안내 내용<textarea rows="3" value={editingConsultation.guidance || ''} onChange={event => updateConsultationField('guidance', event.target.value)} /></label><label>추천 프로그램<input value={editingConsultation.programsText || ''} onChange={event => updateConsultationField('programsText', event.target.value)} placeholder="쉼표로 구분" /></label><label>학생의 할 일<textarea rows="3" value={editingConsultation.studentActions || ''} onChange={event => updateConsultationField('studentActions', event.target.value)} /></label><label>다음 상담 계획<textarea rows="3" value={editingConsultation.nextCheckItems || ''} onChange={event => updateConsultationField('nextCheckItems', event.target.value)} /></label><fieldset className="publication-fieldset"><legend>학생에게 공개할 내용</legend><div>{consultationPublicFieldOptions.map(item => <label key={item.key}><input type="checkbox" checked={editingConsultation.publication?.[item.key] ?? false} onChange={event => updateConsultationField('publication', { ...editingConsultation.publication, [item.key]: event.target.checked })} /><span>{item.label}</span></label>)}</div></fieldset><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditingConsultation(null)}>취소</button><button className="button primary" disabled={savingConsultation}>{savingConsultation ? '저장 중...' : '수정 내용 저장'}</button></div></form></section></div>}
  </>;
}
