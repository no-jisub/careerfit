import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { StatusBadge } from '../components/UI';
import { generateConsultationDraft } from '../services/consultationAiService';
import { addDays, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';

const createEmptyForm = () => { const today = toDateKey(); return { date: today, type: '진로 탐색', purpose: '관심 직무 구체화 및 경험 계획 수립', currentConcern: '', rawMemo: '', guidance: '', programs: [], studentActions: '', counselorActions: '', nextCheckItems: '', nextDate: addDays(today, 14), studentVisible: true }; };

export default function ConsultationFormPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { students, consultations, setConsultations, setConsultationNotes, setFollowUps, persistDocumentGroup, notify, draftForm, setDraftForm } = useApp();
  const student = students.find(s => s.id === studentId) || students[0];
  const latest = consultations.filter(c => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const [form, setForm] = useState(() => draftForm?.studentId === student.id ? draftForm.form : { ...createEmptyForm(), currentConcern: student.concern, rawMemo: '개발 수업 경험을 되짚어 보니 문제를 정의하고 팀의 의견을 정리하는 과정에 흥미를 느꼈다고 함. 서비스 기획 직무를 직접 경험해 본 뒤 개발 직무와 비교하고 싶어 함.', studentActions: '관심 직무 비교표 작성 및 UX 서비스 기획 캠프 신청', counselorActions: '직무 비교표 양식과 캠프 상세 일정 전달', nextCheckItems: '직무 비교 결과와 캠프 신청 여부' });
  const [aiDraft, setAiDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentTask, setStudentTask] = useState('관심 직무 비교표 작성');
  const [counselorTask, setCounselorTask] = useState('직무 비교표 양식 전달');
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  useEffect(() => {
    // Remove drafts saved by older builds; counseling notes must not persist in
    // long-lived, script-readable browser storage.
    localStorage.removeItem(`draft_${student.id}`);
  }, [student.id]);

  const openPrograms = () => { setDraftForm({ studentId: student.id, form }); navigate(`/programs?student=${student.id}&return=form`); };
  const generate = () => {
    setError('');
    if (!form.rawMemo.trim()) { setError('상담 메모를 입력하면 AI 초안을 생성할 수 있습니다.'); return; }
    setLoading(true);
    setTimeout(() => { try { setAiDraft(generateConsultationDraft(form)); notify('상담일지 초안을 생성했습니다.'); } catch (e) { setError(e.message); } finally { setLoading(false); } }, 650);
  };
  const save = async () => {
    if (saving) return;
    if (!form.purpose.trim() || !form.rawMemo.trim()) { setError('필수 항목을 입력해 주세요.'); document.querySelector('#rawMemo')?.focus(); return; }
    const final = aiDraft || generateConsultationDraft(form);
    const consultation = { id: `c${Date.now()}`, studentId: student.id, date: form.date, type: form.type, purpose: final.purpose, counselor: (profile?.displayName || user?.displayName || '상담 담당자').replace(/\s*상담사$/, ''), summary: final.summary, concern: final.concern, guidance: final.guidance, programs: final.programs, studentActions: final.studentActions, counselorActions: final.counselorActions, nextCheckItems: final.nextCheckItems, studentVisible: form.studentVisible };
    const internalNote = { id: consultation.id, consultationId: consultation.id, studentId: student.id, note: form.rawMemo.trim(), updatedAt: new Date().toISOString() };
    const newTasks = [];
    if (studentTask.trim()) newTasks.push({ id: `f${Date.now()}a`, studentId: student.id, content: studentTask.trim(), owner: '학생', dueDate: form.nextDate, status: 'scheduled', consultationDate: form.date });
    if (counselorTask.trim()) newTasks.push({ id: `f${Date.now()}b`, studentId: student.id, content: counselorTask.trim(), owner: '교직원', dueDate: form.nextDate, status: 'scheduled', consultationDate: form.date });
    setSaving(true);
    setError('');
    try {
      await persistDocumentGroup([
        { name: 'consultations', record: consultation },
        { name: 'consultationNotes', record: internalNote },
        ...newTasks.map(record => ({ name: 'followUps', record })),
      ]);
      setConsultations(prev => [...prev, consultation]);
      setConsultationNotes(prev => [...prev, internalNote]);
      setFollowUps(prev => [...prev, ...newTasks]);
      setDraftForm(null);
      notify('상담 기록을 저장했습니다.');
      navigate(`/students/${student.id}`);
    } catch {
      setError('저장하지 못했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <nav className="breadcrumb" aria-label="현재 위치"><Link to={`/students/${student.id}`}>{student.name}</Link><Icon name="chevron" size={14} /><span>상담 기록 작성</span></nav>
    <div className="form-page-header"><div><span className="eyebrow">상담 진행 중 · {form.date}</span><h1>상담 기록 작성</h1><p>상담 중에는 핵심만 메모하고, AI 초안으로 정리해 보세요.</p></div><div><button className="button secondary" disabled={saving} onClick={() => { setDraftForm({ studentId: student.id, form }); notify('상담 기록을 현재 세션에 임시 저장했습니다.'); }}>임시 저장</button><button className="button primary" disabled={saving} onClick={save}>{saving ? '저장 중...' : '상담 기록 저장'}</button></div></div>
    <div className="consultation-layout">
      <section className="card consultation-form-card">
        <div className="form-section-title"><span>1</span><div><h2>상담 기본 정보</h2><p>상담의 목적과 유형을 선택해 주세요.</p></div></div>
        <div className="form-grid"><label>상담 날짜<input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></label><label>상담 유형<select value={form.type} onChange={e => update('type', e.target.value)}>{['진로 탐색', '취업 준비', '자기소개서', '면접', '비교과 활동', '포트폴리오', '기타'].map(x => <option key={x}>{x}</option>)}</select></label><label className="full">상담 목적 <span className="required">필수</span><input value={form.purpose} onChange={e => update('purpose', e.target.value)} /></label></div>
        <div className="form-divider" />
        <div className="form-section-title"><span>2</span><div><h2>상담 메모</h2><p>완성된 문장보다 중요한 키워드와 맥락을 편하게 남겨 주세요.</p></div></div>
        <label>학생의 현재 고민<textarea rows="3" value={form.currentConcern} onChange={e => update('currentConcern', e.target.value)} /></label>
        <label>상담 담당자 내부 메모 <span className="required">필수</span><textarea id="rawMemo" className="memo-area" rows="8" value={form.rawMemo} onChange={e => update('rawMemo', e.target.value)} placeholder="예: 개발 수업은 재미있었지만, 문제를 정의하고 사람들과 조율하는 역할에 더 흥미를 느낌..." /><small className="field-hint">이 원문 메모는 상담 담당자만 볼 수 있는 별도 공간에 저장됩니다.</small>{error && <span className="field-error" role="alert">{error}</span>}</label>
        <label className="visibility-option"><input type="checkbox" checked={form.studentVisible ?? true} onChange={e => update('studentVisible', e.target.checked)} /><span><strong>정리된 상담 요약을 학생에게 공개</strong><small>내부 메모는 공개되지 않으며, AI 초안의 요약·안내·다음 행동만 학생 화면에 표시됩니다.</small></span></label>
        <label>담당자가 안내한 내용<textarea rows="4" value={form.guidance} onChange={e => update('guidance', e.target.value)} placeholder="상담 중 안내한 자료나 조언을 입력하세요." /></label>
        <div className="selected-programs"><div><span className="eyebrow">안내 프로그램</span><h3>비교과 프로그램</h3></div><button className="button secondary small" onClick={openPrograms}><Icon name="spark" size={16} />추천 프로그램 찾기</button>{form.programs.length ? form.programs.map(p => <span className="selected-chip" key={p}>{p}<button aria-label={`${p} 삭제`} onClick={() => update('programs', form.programs.filter(x => x !== p))}><Icon name="close" size={14} /></button></span>) : <p>아직 추가한 프로그램이 없습니다.</p>}</div>
        <div className="form-divider" />
        <div className="form-section-title"><span>3</span><div><h2>다음 행동</h2><p>상담 후 학생과 담당자가 할 일을 나누어 기록하세요.</p></div></div>
        <div className="form-grid"><label>학생의 다음 행동<textarea rows="3" value={form.studentActions} onChange={e => update('studentActions', e.target.value)} /></label><label>담당자의 다음 행동<textarea rows="3" value={form.counselorActions} onChange={e => update('counselorActions', e.target.value)} /></label><label>다음 상담 확인 사항<textarea rows="3" value={form.nextCheckItems} onChange={e => update('nextCheckItems', e.target.value)} /></label><label>다음 상담 예정일<input type="date" value={form.nextDate} onChange={e => update('nextDate', e.target.value)} /></label></div>
      </section>
      <aside className="consultation-aside">
        <section className="card student-context"><div className="context-head"><div><strong>{student.name}</strong><p>{student.department} · {student.grade}</p></div><StatusBadge status="inProgress" /></div><dl><div><dt>진로 목표</dt><dd>{student.goal}</dd></div><div><dt>최근 상담</dt><dd>{student.lastConsultation}</dd></div></dl></section>
        <section className="card ai-card"><span className="ai-label"><Icon name="spark" size={16} /> AI 작성 도우미</span><h2>{aiDraft ? '상담일지 초안' : '메모를 상담일지로 정리해요'}</h2>{!aiDraft && <p>입력한 상담 메모를 바탕으로 구조화된 초안을 만들어요. 자동 저장되지 않습니다.</p>}{loading && <div className="ai-loading" role="status" aria-live="polite"><span className="spinner" />상담 맥락을 정리하고 있어요...</div>}
          {!aiDraft && !loading && <button className="button ai full" onClick={generate}><Icon name="spark" size={18} />AI 상담일지 초안 만들기</button>}
          {aiDraft && !loading && <><div className="ai-warning"><Icon name="alert" size={17} />AI가 작성한 초안이므로 저장 전 내용을 확인하세요.</div><div className="ai-fields">{[['purpose','상담 목적'],['summary','상담 주요 내용'],['concern','학생의 고민과 목표'],['guidance','담당자의 안내 내용'],['studentActions','학생의 다음 행동'],['counselorActions','담당자의 후속 조치'],['nextCheckItems','다음 상담 확인 사항']].map(([key,label]) => <label key={key}>{label}<textarea rows={key === 'summary' ? 5 : 3} value={aiDraft[key]} onChange={e => setAiDraft(prev => ({ ...prev, [key]: e.target.value }))} /></label>)}</div><div className="ai-actions"><button className="button secondary" onClick={generate}>초안 다시 생성</button><button className="button ai" onClick={() => notify('AI 초안 검토를 완료했습니다.')}>검토 완료</button></div></>}
        </section>
        <section className="card task-register"><span className="eyebrow">저장 시 함께 등록</span><h2>후속 조치</h2><label>학생 담당<input value={studentTask} onChange={e => setStudentTask(e.target.value)} /></label><label>교직원 담당<input value={counselorTask} onChange={e => setCounselorTask(e.target.value)} /></label><small><Icon name="calendar" size={14} />기한 {form.nextDate}</small></section>
      </aside>
    </div>
    <div className="mobile-savebar"><button className="button secondary" disabled={saving} onClick={generate}>AI 초안</button><button className="button primary" disabled={saving} onClick={save}>{saving ? '저장 중...' : '상담 기록 저장'}</button></div>
  </>;
}
