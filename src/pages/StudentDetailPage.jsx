import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { addDays, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';
import { buildConsultationSummary, consultationEvidenceFieldOptions, consultationPublicFieldOptions, defaultConsultationVisibility } from '../utils/consultations';
import { openAttachment } from '../services/attachmentService';

const studentTagOptions = ['면접 준비', '포트폴리오', '진로 미정', '공공기관 희망'];

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const { students, setStudents, consultations, setConsultations, consultationSummaries, setConsultationSummaries, consultationNotes, followUps, setFollowUps, appointments, persistDocument, persistDocumentGroup, notify } = useApp();
  const { user, profile } = useAuth();
  const student = students.find(s => s.id === studentId);
  const history = student ? consultations.filter(c => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const tasks = student ? followUps.filter(f => f.studentId === student.id && f.status !== 'complete') : [];
  const requestedConsultationId = searchParams.get('consultation');
  const [expanded, setExpanded] = useState(requestedConsultationId || history[0]?.id);
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
    setExpanded(requestedConsultationId);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`consultation-${requestedConsultationId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const openEdit = () => {
    setEditForm({
      name: student.name,
      studentNo: student.studentNo,
      department: student.department,
      grade: student.grade,
      phone: student.phone,
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
      name: editForm.name.trim(),
      studentNo: editForm.studentNo.trim(),
      department: editForm.department.trim(),
      phone: editForm.phone.trim(),
      goal: editForm.goal.trim(),
      concern: editForm.concern.trim(),
      interests: editForm.interests.split(',').map(item => item.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    setSavingStudent(true);
    try {
      await persistDocument('students', updated);
      setStudents(prev => prev.map(item => item.id === student.id ? updated : item));
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
    try {
      await persistDocument('followUps', nextTask);
      setFollowUps(items => items.some(item => item.id === nextTask.id) ? items : [...items, nextTask]);
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
    setSavingConsultation(true);
    try {
      await persistDocumentGroup([{ name: 'consultations', record: updated }, { name: 'consultationSummaries', record: summary }]);
      setConsultations(items => items.map(item => item.id === updated.id ? updated : item));
      setConsultationSummaries(items => items.some(item => item.id === summary.id) ? items.map(item => item.id === summary.id ? summary : item) : [...items, summary]);
      setEditingConsultation(null);
      notify('상담 기록을 수정했습니다.');
    } catch { /* 공통 오류 메시지를 사용합니다. */ }
    finally { setSavingConsultation(false); }
  };
  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/students">학생 관리</Link><Icon name="chevron" size={14} /><span>{student.name}</span></nav>
    <section className="profile-hero">
      <div className="profile-main"><div><div className="profile-name"><h1>{student.name}</h1><StatusBadge status={student.status} /></div><p>{student.studentNo} · {student.department} · {student.grade}</p><div className="tag-row">{student.interests.map(x => <span className="tag" key={x}>{x}</span>)}</div></div></div>
      <div className="profile-actions"><button className="button secondary" onClick={openEdit}>학생 정보 수정</button><button className="button secondary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} />할 일 추가</button><Link to={`/programs?student=${student.id}`} className="button secondary"><Icon name="spark" size={17} />프로그램 추천</Link><Link to={`/students/${student.id}/consultation/new`} className="button primary"><Icon name="note" size={18} />상담 시작</Link></div>
    </section>
    <div className="detail-grid">
      <div className="detail-main">
        <section className="card prep-card"><div className="section-header"><div><span className="eyebrow">상담 준비 요약</span><h2>상담 전, 이것만 확인하세요</h2></div><span className="updated-label"><Icon name="clock" size={14} />최근 상담 {student.lastConsultation}</span></div>
          <div className="prep-grid"><article><span className="prep-icon blue"><Icon name="note" /></span><div><strong>최근 상담 핵심 내용</strong><p>{history[0]?.summary || '아직 작성된 상담 기록이 없습니다.'}</p></div></article><article><span className="prep-icon orange"><Icon name="alert" /></span><div><strong>학생이 말한 주요 고민</strong><p>{student.concern}</p></div></article><article><span className="prep-icon green"><Icon name="check" /></span><div><strong>이전 상담에서 안내한 사항</strong><p>{history[0]?.guidance || '안내한 사항이 없습니다.'}</p></div></article><article><span className="prep-icon purple"><Icon name="target" /></span><div><strong>다음 상담에서 확인할 내용</strong><p>{history[0]?.nextCheckItems || '확인할 내용을 등록해 주세요.'}</p></div></article></div>
        </section>
        <section className="card"><div className="section-header"><div><span className="eyebrow">상담 히스토리</span><h2>상담 기록 타임라인</h2></div><Link className="text-link" to={`/students/${student.id}/consultation/new`}>기록 작성 <Icon name="plus" size={15} /></Link></div>
          {history.length ? <div className="timeline">{history.map(c => { const internalNote = consultationNotes.find(note => note.consultationId === c.id); return <article id={`consultation-${c.id}`} key={c.id} className={`timeline-item ${expanded === c.id ? 'open' : ''}`}><span className="timeline-dot" /><button aria-expanded={expanded === c.id} onClick={() => setExpanded(expanded === c.id ? '' : c.id)}><div><time>{c.date}</time><span className="tag">{c.type}</span><h3>{c.purpose}</h3></div><Icon name="chevron" /></button>{expanded === c.id && <div className="timeline-body">{internalNote?.note && <div className="internal-note"><strong><Icon name="lock" size={15} />상담 담당자 내부 메모</strong><p>{internalNote.note}</p></div>}{c.aiReview && <details className="consultation-evidence-panel" open={requestedConsultationId === c.id}><summary><span><Icon name="shield" size={17} />AI 요약 근거 및 상담사 검토</span><small>{c.aiReview.reviewedAt?.slice(0, 10)} · {c.aiReview.reviewedBy}</small></summary><div><p>AI 초안의 각 항목을 작성할 때 사용한 근거입니다. 원문 메모는 학생에게 공개되지 않습니다.</p>{consultationEvidenceFieldOptions.map(({ key, label }) => <section key={key}><strong>{label}</strong><ul>{(c.aiReview.evidence?.[key] || ['근거 부족']).map((evidence, index) => <li key={`${key}-${index}`}>{evidence}</li>)}</ul></section>)}{c.aiReview.needsConfirmation?.length > 0 && <section className="needs-confirmation"><strong>추가 확인 필요</strong><ul>{c.aiReview.needsConfirmation.map((item, index) => <li key={`confirm-${index}`}>{item}</li>)}</ul></section>}</div></details>}<dl><div><dt>학생 공개 요약</dt><dd>{c.summary}</dd></div><div><dt>학생의 강점</dt><dd>{c.strengths || '-'}</dd></div><div><dt>안내한 내용</dt><dd>{c.guidance}</dd></div><div><dt>학생의 다음 행동</dt><dd>{c.studentActions}</dd></div><div><dt>담당자의 다음 행동</dt><dd>{c.counselorActions}</dd></div><div><dt>다음 상담 확인 사항</dt><dd>{c.nextCheckItems}</dd></div></dl>{c.programs?.length > 0 && <div className="program-inline"><Icon name="spark" size={17} /><span>추천 프로그램</span><strong>{c.programs.join(', ')}</strong></div>}<div className="consultation-record-footer"><p className="counselor-line">{c.studentVisible === false ? '학생 비공개 · ' : '선택 항목 공개 · '}{c.aiReview ? 'AI 보조·상담사 근거 검토 완료 · ' : '상담사 직접 작성 · '}상담 담당자 {c.counselor}{c.modifiedAt ? ` · 마지막 수정 ${c.modifiedAt.slice(0, 10)} ${c.modifiedByName}` : ''}</p><button className="button secondary small" onClick={() => openConsultationEdit(c)}>기록 수정</button></div></div>}</article>; })}</div> : <EmptyState title="아직 작성된 상담 기록이 없습니다" description="첫 상담을 시작하고 학생의 목표와 다음 행동을 기록해 보세요." />}
        </section>
      </div>
      <aside className="detail-aside">
        {appointments.some(item => item.studentId === student.id && item.attachments?.length) && <section className="card info-card"><span className="eyebrow">상담 준비자료</span><h2>학생 첨부파일</h2><div className="attachment-list">{appointments.filter(item => item.studentId === student.id).flatMap(item => item.attachments || []).map(file => <button type="button" className="text-button" key={file.id} onClick={() => openAttachment(file)}>{file.fileName}</button>)}</div></section>}
        <section className="card info-card"><span className="eyebrow">학생 기본 정보</span><h2>프로필</h2><dl><div><dt>연락처</dt><dd>{student.phone}</dd></div><div><dt>진로 목표</dt><dd>{student.goal}</dd></div><div><dt>담당 상담자</dt><dd>{student.counselor}</dd></div><div><dt>최근 상담일</dt><dd>{student.lastConsultation}</dd></div></dl></section>
        <section className="card"><div className="section-header compact"><div><span className="eyebrow">상담 후 할 일</span><h2>미완료 할 일 <em>{tasks.length}</em></h2></div><button className="icon-button" aria-label="할 일 추가" onClick={() => setShowAdd(true)}><Icon name="plus" /></button></div>
          <div className="aside-tasks">{tasks.map(t => <article className={t.status === 'overdue' ? 'overdue' : ''} key={t.id}><div><StatusBadge status={t.status} context="followUp" /><span>{t.owner === '교직원' ? '상담사' : t.owner} 담당</span></div><strong>{t.content}</strong><small><Icon name="calendar" size={14} />{t.dueDate}까지</small></article>)}{!tasks.length && <EmptyState title="등록된 할 일이 없습니다" />}</div>
        </section>
      </aside>
    </div>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setShowAdd(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAdd(false)}><Icon name="close" size={19} /></button><span className="eyebrow">새로운 다음 행동</span><h2 id="task-modal-title">상담 후 할 일 추가</h2><form onSubmit={addTask}><label>할 일 내용<input autoFocus value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="학생이 해야 할 다음 행동" required /></label><div className="form-row"><label>행동 담당자<select value={taskOwner} onChange={e => setTaskOwner(e.target.value)}><option value="학생">학생</option><option value="교직원">상담사</option></select></label><label>완료 기한<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowAdd(false)}>취소</button><button className="button primary">할 일 추가</button></div></form></section></div>}
    {showEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingStudent && setShowEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingStudent} onClick={() => setShowEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">학생 기본 정보</span><h2 id="student-edit-title">학생 정보 수정</h2><form onSubmit={saveStudent}><div className="form-row"><label>이름<input autoFocus value={editForm.name || ''} onChange={e => updateStudentField('name', e.target.value)} required /></label><label>학번<input value={editForm.studentNo || ''} onChange={e => updateStudentField('studentNo', e.target.value)} required /></label><label>학과<input value={editForm.department || ''} onChange={e => updateStudentField('department', e.target.value)} required /></label><label>학년<select value={editForm.grade || ''} onChange={e => updateStudentField('grade', e.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(grade => <option key={grade}>{grade}</option>)}</select></label></div><label>연락처<input value={editForm.phone || ''} onChange={e => updateStudentField('phone', e.target.value)} required /></label><label>관심 분야 / 학생 태그 <small className="field-hint">상담 태그를 누르거나 쉼표로 직접 입력해 주세요.</small><div className="tag-picker">{studentTagOptions.map(tag => <button type="button" key={tag} className={(editForm.interests || '').split(',').map(item => item.trim()).includes(tag) ? 'active' : ''} onClick={() => toggleStudentTag(tag)}>{tag}</button>)}</div><input value={editForm.interests || ''} onChange={e => updateStudentField('interests', e.target.value)} /></label><label>진로 목표<input value={editForm.goal || ''} onChange={e => updateStudentField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={editForm.concern || ''} onChange={e => updateStudentField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingStudent} onClick={() => setShowEdit(false)}>취소</button><button className="button primary" disabled={savingStudent}>{savingStudent ? '저장 중...' : '수정 내용 저장'}</button></div></form></section></div>}
    {editingConsultation && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !savingConsultation && setEditingConsultation(null)}><section className="modal consultation-edit-modal" role="dialog" aria-modal="true" aria-labelledby="consultation-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingConsultation} onClick={() => setEditingConsultation(null)}><Icon name="close" size={19} /></button><span className="eyebrow">완료된 상담 기록</span><h2 id="consultation-edit-title">상담 기록 수정</h2><form onSubmit={saveConsultationEdit}><label>상담 목적<input value={editingConsultation.purpose || ''} onChange={event => updateConsultationField('purpose', event.target.value)} required /></label><label>상담 요약<textarea rows="4" value={editingConsultation.summary || ''} onChange={event => updateConsultationField('summary', event.target.value)} required /></label><label>학생의 강점<textarea rows="3" value={editingConsultation.strengths || ''} onChange={event => updateConsultationField('strengths', event.target.value)} /></label><label>개선 또는 고민 사항<textarea rows="3" value={editingConsultation.concern || ''} onChange={event => updateConsultationField('concern', event.target.value)} /></label><label>안내 내용<textarea rows="3" value={editingConsultation.guidance || ''} onChange={event => updateConsultationField('guidance', event.target.value)} /></label><label>추천 프로그램<input value={editingConsultation.programsText || ''} onChange={event => updateConsultationField('programsText', event.target.value)} placeholder="쉼표로 구분" /></label><label>학생의 할 일<textarea rows="3" value={editingConsultation.studentActions || ''} onChange={event => updateConsultationField('studentActions', event.target.value)} /></label><label>다음 상담 계획<textarea rows="3" value={editingConsultation.nextCheckItems || ''} onChange={event => updateConsultationField('nextCheckItems', event.target.value)} /></label><fieldset className="publication-fieldset"><legend>학생에게 공개할 내용</legend><div>{consultationPublicFieldOptions.map(item => <label key={item.key}><input type="checkbox" checked={editingConsultation.publication?.[item.key] ?? false} onChange={event => updateConsultationField('publication', { ...editingConsultation.publication, [item.key]: event.target.checked })} /><span>{item.label}</span></label>)}</div></fieldset><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditingConsultation(null)}>취소</button><button className="button primary" disabled={savingConsultation}>{savingConsultation ? '저장 중...' : '수정 내용 저장'}</button></div></form></section></div>}
  </>;
}
