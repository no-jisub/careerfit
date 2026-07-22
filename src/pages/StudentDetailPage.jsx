import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { addDays, toDateKey } from '../utils/date';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const { students, setStudents, consultations, consultationNotes, followUps, setFollowUps, persistDocument, notify } = useApp();
  const student = students.find(s => s.id === studentId);
  const history = student ? consultations.filter(c => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const tasks = student ? followUps.filter(f => f.studentId === student.id && f.status !== 'complete') : [];
  const [expanded, setExpanded] = useState(history[0]?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [taskText, setTaskText] = useState('');
  const [taskOwner, setTaskOwner] = useState('학생');
  const [dueDate, setDueDate] = useState(() => addDays(toDateKey(), 7));
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
      notify('후속 조치를 추가했습니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };
  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to="/students">학생 관리</Link><Icon name="chevron" size={14} /><span>{student.name}</span></nav>
    <section className="profile-hero">
      <div className="profile-main"><div><div className="profile-name"><h1>{student.name}</h1><StatusBadge status={student.status} /></div><p>{student.studentNo} · {student.department} · {student.grade}</p><div className="tag-row">{student.interests.map(x => <span className="tag" key={x}>{x}</span>)}</div></div></div>
      <div className="profile-actions"><button className="button secondary" onClick={openEdit}>학생 정보 수정</button><button className="button secondary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} />후속 조치 추가</button><Link to={`/programs?student=${student.id}`} className="button secondary"><Icon name="spark" size={17} />프로그램 추천</Link><Link to={`/students/${student.id}/consultation/new`} className="button primary"><Icon name="note" size={18} />상담 시작</Link></div>
    </section>
    <div className="detail-grid">
      <div className="detail-main">
        <section className="card prep-card"><div className="section-header"><div><span className="eyebrow">상담 준비 요약</span><h2>상담 전, 이것만 확인하세요</h2></div><span className="updated-label"><Icon name="clock" size={14} />최근 상담 {student.lastConsultation}</span></div>
          <div className="prep-grid"><article><span className="prep-icon blue"><Icon name="note" /></span><div><strong>최근 상담 핵심 내용</strong><p>{history[0]?.summary || '아직 작성된 상담 기록이 없습니다.'}</p></div></article><article><span className="prep-icon orange"><Icon name="alert" /></span><div><strong>학생이 말한 주요 고민</strong><p>{student.concern}</p></div></article><article><span className="prep-icon green"><Icon name="check" /></span><div><strong>이전 상담에서 안내한 사항</strong><p>{history[0]?.guidance || '안내한 사항이 없습니다.'}</p></div></article><article><span className="prep-icon purple"><Icon name="target" /></span><div><strong>다음 상담에서 확인할 내용</strong><p>{history[0]?.nextCheckItems || '확인할 내용을 등록해 주세요.'}</p></div></article></div>
        </section>
        <section className="card"><div className="section-header"><div><span className="eyebrow">상담 히스토리</span><h2>상담 기록 타임라인</h2></div><Link className="text-link" to={`/students/${student.id}/consultation/new`}>기록 작성 <Icon name="plus" size={15} /></Link></div>
          {history.length ? <div className="timeline">{history.map(c => { const internalNote = consultationNotes.find(note => note.consultationId === c.id); return <article key={c.id} className={`timeline-item ${expanded === c.id ? 'open' : ''}`}><span className="timeline-dot" /><button aria-expanded={expanded === c.id} onClick={() => setExpanded(expanded === c.id ? '' : c.id)}><div><time>{c.date}</time><span className="tag">{c.type}</span><h3>{c.purpose}</h3></div><Icon name="chevron" /></button>{expanded === c.id && <div className="timeline-body">{internalNote?.note && <div className="internal-note"><strong>상담 담당자 내부 메모</strong><p>{internalNote.note}</p></div>}<dl><div><dt>학생 공개 요약</dt><dd>{c.summary}</dd></div><div><dt>안내한 내용</dt><dd>{c.guidance}</dd></div><div><dt>학생의 다음 행동</dt><dd>{c.studentActions}</dd></div><div><dt>담당자의 다음 행동</dt><dd>{c.counselorActions}</dd></div><div><dt>다음 상담 확인 사항</dt><dd>{c.nextCheckItems}</dd></div></dl>{c.programs?.length > 0 && <div className="program-inline"><Icon name="spark" size={17} /><span>추천 프로그램</span><strong>{c.programs.join(', ')}</strong></div>}<p className="counselor-line">{c.studentVisible === false ? '학생 비공개 · ' : '학생 공개 · '}상담 담당자 {c.counselor}</p></div>}</article>; })}</div> : <EmptyState title="아직 작성된 상담 기록이 없습니다" description="첫 상담을 시작하고 학생의 목표와 다음 행동을 기록해 보세요." />}
        </section>
      </div>
      <aside className="detail-aside">
        <section className="card info-card"><span className="eyebrow">학생 기본 정보</span><h2>프로필</h2><dl><div><dt>연락처</dt><dd>{student.phone}</dd></div><div><dt>진로 목표</dt><dd>{student.goal}</dd></div><div><dt>담당 상담자</dt><dd>{student.counselor}</dd></div><div><dt>최근 상담일</dt><dd>{student.lastConsultation}</dd></div></dl></section>
        <section className="card"><div className="section-header compact"><div><span className="eyebrow">해야 할 일</span><h2>미완료 후속 조치 <em>{tasks.length}</em></h2></div><button className="icon-button" aria-label="후속 조치 추가" onClick={() => setShowAdd(true)}><Icon name="plus" /></button></div>
          <div className="aside-tasks">{tasks.map(t => <article className={t.status === 'overdue' ? 'overdue' : ''} key={t.id}><div><StatusBadge status={t.status} context="followUp" /><span>{t.owner} 담당</span></div><strong>{t.content}</strong><small><Icon name="calendar" size={14} />{t.dueDate}까지</small></article>)}{!tasks.length && <EmptyState title="등록된 후속 조치가 없습니다" />}</div>
        </section>
      </aside>
    </div>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setShowAdd(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAdd(false)}><Icon name="close" size={19} /></button><span className="eyebrow">새로운 다음 행동</span><h2 id="task-modal-title">후속 조치 추가</h2><form onSubmit={addTask}><label>후속 조치 내용<input autoFocus value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="학생이 해야 할 다음 행동" required /></label><div className="form-row"><label>행동 담당자<select value={taskOwner} onChange={e => setTaskOwner(e.target.value)}><option>학생</option><option>교직원</option></select></label><label>완료 기한<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowAdd(false)}>취소</button><button className="button primary">후속 조치 추가</button></div></form></section></div>}
    {showEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingStudent && setShowEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingStudent} onClick={() => setShowEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">학생 기본 정보</span><h2 id="student-edit-title">학생 정보 수정</h2><form onSubmit={saveStudent}><div className="form-row"><label>이름<input autoFocus value={editForm.name || ''} onChange={e => updateStudentField('name', e.target.value)} required /></label><label>학번<input value={editForm.studentNo || ''} onChange={e => updateStudentField('studentNo', e.target.value)} required /></label><label>학과<input value={editForm.department || ''} onChange={e => updateStudentField('department', e.target.value)} required /></label><label>학년<select value={editForm.grade || ''} onChange={e => updateStudentField('grade', e.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(grade => <option key={grade}>{grade}</option>)}</select></label></div><label>연락처<input value={editForm.phone || ''} onChange={e => updateStudentField('phone', e.target.value)} required /></label><label>관심 분야 <small className="field-hint">쉼표로 구분해 주세요.</small><input value={editForm.interests || ''} onChange={e => updateStudentField('interests', e.target.value)} /></label><label>진로 목표<input value={editForm.goal || ''} onChange={e => updateStudentField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={editForm.concern || ''} onChange={e => updateStudentField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingStudent} onClick={() => setShowEdit(false)}>취소</button><button className="button primary" disabled={savingStudent}>{savingStudent ? '저장 중...' : '수정 내용 저장'}</button></div></form></section></div>}
  </>;
}
