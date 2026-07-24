import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { generateConsultationDraft } from '../services/consultationAiService';
import { addDays, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';
import { cleanText, validateConsultationInput } from '../utils/validation';
import { buildConsultationSummary, consultationEvidenceFieldOptions, consultationPublicFieldOptions, defaultConsultationVisibility } from '../utils/consultations';
import { buildEventNotification } from '../utils/notifications';
import { detectDirectIdentifiers } from '../utils/privacy';
import { getEvidenceCoverage } from '../utils/trust';
import { recommendPrograms } from '../utils/programRecommendations';

const createEmptyForm = () => { const today = toDateKey(); return { date: today, type: '진로 탐색', purpose: '관심 직무 구체화 및 경험 계획 수립', currentConcern: '', rawMemo: '', programs: [], nextDate: addDays(today, 14), studentVisible: true, visibility: { ...defaultConsultationVisibility } }; };
const appendMissingDocuments = (current, additions) => [
  ...current,
  ...additions.filter(addition => !current.some(item => item.id === addition.id)),
];
const cleanAiList = value => Array.isArray(value)
  ? value.map(item => cleanText(item, 500)).filter(Boolean).slice(0, 10)
  : [];
let taskRowSequence = 0;
const createTaskRow = (owner, dueDate, content = '') => ({
  id: `consultation-task-${owner === '학생' ? 'student' : 'counselor'}-${Date.now()}-${taskRowSequence += 1}`,
  owner,
  content,
  dueDate,
});
const restoreTaskRows = (source, dueDate) => {
  if (Array.isArray(source?.taskRows) && source.taskRows.length) {
    return source.taskRows.map(row => {
      const restored = createTaskRow(row.owner === '학생' ? '학생' : '교직원', row.dueDate || dueDate, row.content || '');
      return { ...restored, id: row.id || restored.id };
    });
  }
  const restoreLegacyOwner = (owner, value) => {
    const entries = String(value || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
    return (entries.length ? entries : ['']).map(content => createTaskRow(owner, dueDate, content));
  };
  return [
    ...restoreLegacyOwner('학생', source?.studentTask),
    ...restoreLegacyOwner('교직원', source?.counselorTask),
  ];
};

export default function ConsultationFormPage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment') || '';
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { students, setStudents, consultations, setConsultations, setConsultationSummaries, setConsultationNotes, consultationDrafts, setConsultationDrafts, setFollowUps, appointments, setAppointments, setNotifications, programs, persistDocument, persistDocumentGroup, removeDocument, notify, draftForm, setDraftForm } = useApp();
  const student = students.find(s => s.id === studentId);
  const linkedAppointment = appointmentId ? appointments.find(item => item.id === appointmentId && item.studentId === studentId) : null;
  const counselorUid = user?.uid || profile?.id || 'demo-counselor';
  const draftId = useMemo(() => `draft-${appointmentId || `${counselorUid}-${studentId}`}`.replace(/[^A-Za-z0-9_-]/g, '-'), [appointmentId, counselorUid, studentId]);
  const [form, setForm] = useState(() => draftForm?.studentId === student?.id ? draftForm.form : { ...createEmptyForm(), currentConcern: student?.concern || '' });
  const [aiDraft, setAiDraft] = useState(null);
  const [aiReviewedAt, setAiReviewedAt] = useState('');
  const [evidenceReviews, setEvidenceReviews] = useState(() => Object.fromEntries(consultationEvidenceFieldOptions.map(({ key }) => [key, false])));
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(false);
  const [sensitiveAcknowledged, setSensitiveAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taskRows, setTaskRows] = useState(() => restoreTaskRows(
    draftForm?.studentId === student?.id ? draftForm : null,
    draftForm?.studentId === student?.id ? draftForm.form?.nextDate || createEmptyForm().nextDate : createEmptyForm().nextDate,
  ));
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const lastDraftPayload = useRef('');
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const aiProgramCatalog = useMemo(() => student
    ? recommendPrograms(programs, student, 12).map(program => ({
      name: program.name,
      type: program.type,
      description: program.description,
      tags: program.tags || [],
    }))
    : [], [programs, student]);
  const privacyPreflight = useMemo(() => detectDirectIdentifiers([form.rawMemo, form.currentConcern].join('\n')), [form.currentConcern, form.rawMemo]);
  const pendingTaskRows = taskRows.filter(row => row.content.trim());
  const pendingTaskCount = pendingTaskRows.length;
  const studentTask = pendingTaskRows.filter(row => row.owner === '학생').map(row => row.content.trim()).join('\n');
  const counselorTask = pendingTaskRows.filter(row => row.owner === '교직원').map(row => row.content.trim()).join('\n');
  const updateTaskRow = (id, key, value) => setTaskRows(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  const addTaskRow = owner => setTaskRows(rows => [...rows, createTaskRow(owner, form.nextDate)]);
  const removeTaskRow = id => setTaskRows(rows => rows.filter(row => row.id !== id));
  const reviewedEvidenceCount = consultationEvidenceFieldOptions.filter(({ key }) => evidenceReviews[key]).length;
  const allEvidenceReviewed = reviewedEvidenceCount === consultationEvidenceFieldOptions.length;
  const reviewReady = Boolean(aiDraft)
    && allEvidenceReviewed
    && (!aiDraft.needsConfirmation?.length || confirmationAcknowledged)
    && (!aiDraft.sensitiveWarning?.length || sensitiveAcknowledged);
  const resetAiReview = () => {
    setAiReviewedAt('');
    setEvidenceReviews(Object.fromEntries(consultationEvidenceFieldOptions.map(({ key }) => [key, false])));
    setConfirmationAcknowledged(false);
    setSensitiveAcknowledged(false);
  };
  const invalidateAiReview = evidenceKey => {
    setAiReviewedAt('');
    if (evidenceKey) setEvidenceReviews(current => ({ ...current, [evidenceKey]: false }));
  };
  const updateAiText = (key, value) => {
    setAiDraft(current => ({ ...current, [key]: value }));
    invalidateAiReview(consultationEvidenceFieldOptions.some(item => item.key === key) ? key : '');
  };
  const removeAiProgram = programName => {
    setAiDraft(current => ({ ...current, programs: current.programs.filter(name => name !== programName) }));
    invalidateAiReview('programs');
  };
  const updateAiTask = (index, key, value) => {
    setAiDraft(current => ({
      ...current,
      followUpTasks: current.followUpTasks.map((task, taskIndex) => taskIndex === index
        ? { ...task, [key]: key === 'dueInDays' ? Math.min(60, Math.max(1, Number(value) || 1)) : value }
        : task),
    }));
    invalidateAiReview('followUpTasks');
  };
  const removeAiTask = index => {
    setAiDraft(current => ({ ...current, followUpTasks: current.followUpTasks.filter((_, taskIndex) => taskIndex !== index) }));
    invalidateAiReview('followUpTasks');
  };
  const applyReviewedAiDraft = () => {
    if (!aiDraft || !reviewReady) return;
    const availableProgramNames = new Set(programs.map(program => program.name));
    const reviewedPrograms = [...new Set((aiDraft.programs || []).filter(name => availableProgramNames.has(name)))];
    const reviewedTasks = (aiDraft.followUpTasks || [])
      .filter(task => task.content?.trim())
      .map(task => createTaskRow(
        task.owner === '상담사' ? '교직원' : '학생',
        addDays(form.date, Math.min(60, Math.max(1, Number(task.dueInDays) || 7))),
        task.content.trim(),
      ));
    setForm(current => ({
      ...current,
      purpose: aiDraft.purpose?.trim() || current.purpose,
      currentConcern: aiDraft.concern?.trim() || current.currentConcern,
      programs: reviewedPrograms,
    }));
    setTaskRows([
      ...(reviewedTasks.filter(task => task.owner === '학생').length
        ? reviewedTasks.filter(task => task.owner === '학생')
        : [createTaskRow('학생', form.nextDate)]),
      ...(reviewedTasks.filter(task => task.owner === '교직원').length
        ? reviewedTasks.filter(task => task.owner === '교직원')
        : [createTaskRow('교직원', form.nextDate)]),
    ]);
    const reviewedAt = new Date().toISOString();
    setAiReviewedAt(reviewedAt);
    setError('');
    notify(`AI 초안을 검토 완료하고 추천 프로그램 ${reviewedPrograms.length}개와 할 일 ${reviewedTasks.length}개를 입력했습니다.`);
  };
  useEffect(() => {
    if (!student) return undefined;
    // Remove drafts saved by older builds; counseling notes must not persist in
    // long-lived, script-readable browser storage.
    localStorage.removeItem(`draft_${student.id}`);
  }, [student?.id]);
  useEffect(() => {
    if (draftRestored || !student) return;
    const saved = consultationDrafts.find(item => item.id === draftId);
    if (draftForm?.studentId === student.id) {
      const resumedPayload = {
        form: draftForm.form,
        taskRows,
      };
      lastDraftPayload.current = JSON.stringify(resumedPayload);
      setDraftForm(null);
    } else if (saved?.form) {
      setForm(saved.form);
      const restoredTaskRows = restoreTaskRows(saved, saved.form.nextDate || form.nextDate);
      setTaskRows(restoredTaskRows);
      setDraftSavedAt(saved.updatedAt || '');
      lastDraftPayload.current = JSON.stringify({ form: saved.form, taskRows: restoredTaskRows });
      notify('Firestore에 임시 저장된 상담 기록을 복구했습니다.');
    } else if (linkedAppointment) {
      setForm(current => ({ ...current, date: linkedAppointment.date, type: linkedAppointment.type || current.type, purpose: linkedAppointment.subject || current.purpose, currentConcern: linkedAppointment.requestMessage || current.currentConcern }));
    }
    setDraftRestored(true);
  }, [consultationDrafts, draftForm, draftId, draftRestored, form.nextDate, linkedAppointment, notify, student, taskRows]);
  useEffect(() => {
    if (!draftRestored || !student || (!form.rawMemo.trim() && !studentTask.trim() && !counselorTask.trim())) return undefined;
    const payload = JSON.stringify({ form, taskRows });
    if (payload === lastDraftPayload.current) return undefined;
    const timer = setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      const record = { id: draftId, appointmentId, studentId: student.id, studentUid: student.uid || '', counselorUid, form, taskRows, studentTask, counselorTask, updatedAt, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
      try {
        await persistDocument('consultationDrafts', record);
        setConsultationDrafts(items => items.some(item => item.id === draftId) ? items.map(item => item.id === draftId ? record : item) : [...items, record]);
        setDraftSavedAt(updatedAt);
        lastDraftPayload.current = payload;
      } catch { /* 공통 저장 오류 메시지를 사용합니다. */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, [appointmentId, counselorTask, counselorUid, draftId, draftRestored, form, persistDocument, setConsultationDrafts, student, studentTask, taskRows]);

  if (!student) return <section className="card"><EmptyState title="상담을 작성할 학생을 찾을 수 없습니다" description="현재 계정에 배정된 학생인지 확인해 주세요." action={<Link className="button secondary" to="/students?select=consultation">담당 학생 선택</Link>} /></section>;

  const openPrograms = () => {
    setDraftForm({ studentId: student.id, form, taskRows, studentTask, counselorTask });
    navigate(`/programs?student=${student.id}&return=form`);
  };
  const generate = async () => {
    setError('');
    if (!form.rawMemo.trim()) { setError('상담 메모를 입력하면 AI 초안을 생성할 수 있습니다.'); return; }
    setLoading(true);
    try {
      setAiDraft(await generateConsultationDraft({
        studentId: student.id,
        rawMemo: form.rawMemo,
        programCatalog: aiProgramCatalog,
      }));
      resetAiReview();
      notify('상담일지 초안을 생성했습니다.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    if (saving) return;
    if (aiDraft && !aiReviewedAt) {
      setError('AI 초안의 작성 근거를 확인하고 ‘근거 검토 완료’를 눌러 주세요.');
      document.querySelector('#ai-review-confirm')?.focus();
      return;
    }
    const validated = validateConsultationInput(form);
    if (validated.error) { setError(validated.error); document.querySelector('#rawMemo')?.focus(); return; }
    const safeForm = validated.value;
    const draft = aiDraft || { ...safeForm, summary: safeForm.rawMemo, concern: safeForm.currentConcern };
    const final = {
      ...draft,
      purpose: cleanText(draft.purpose, 500),
      summary: cleanText(draft.summary, 5000),
      concern: cleanText(draft.concern, 5000),
      strengths: '',
      guidance: '',
      programs: safeForm.programs,
      studentActions: cleanText(studentTask, 2000),
      counselorActions: cleanText(counselorTask, 2000),
      nextCheckItems: '',
    };
    const aiReview = aiDraft ? {
      evidence: Object.fromEntries(consultationEvidenceFieldOptions.map(({ key }) => [
        key,
        cleanAiList(aiDraft.evidence?.[key]).slice(0, 5),
      ])),
      needsConfirmation: cleanAiList(aiDraft.needsConfirmation),
      sensitiveWarning: cleanAiList(aiDraft.sensitiveWarning),
      model: cleanText(aiDraft.reviewMeta?.model || 'unknown', 100),
      generatedAt: cleanText(aiDraft.reviewMeta?.generatedAt || '', 40),
      reviewedAt: aiReviewedAt,
      reviewedBy: (profile?.displayName || user?.displayName || '상담 담당자').replace(/\s*상담사$/, ''),
      reviewedFields: consultationEvidenceFieldOptions.filter(({ key }) => evidenceReviews[key]).map(({ key }) => key),
      evidenceCoverage: getEvidenceCoverage(aiDraft),
      confirmationAcknowledged: !aiDraft.needsConfirmation?.length || confirmationAcknowledged,
      sensitiveAcknowledged: !aiDraft.sensitiveWarning?.length || sensitiveAcknowledged,
      identifiersRedacted: aiDraft.reviewMeta?.identifiersRedacted === true,
    } : null;
    if (linkedAppointment && new Date(`${linkedAppointment.date}T${linkedAppointment.time}:00`) > new Date()) { setError('최종 상담 기록은 상담 시작 이후 저장할 수 있습니다. 지금은 임시 저장을 이용해 주세요.'); return; }
    if (linkedAppointment && consultations.some(item => item.appointmentId === linkedAppointment.id)) { setError('이 예약에는 이미 최종 상담 기록이 저장되어 있습니다.'); return; }
    const now = new Date().toISOString();
    const publication = Object.fromEntries(consultationPublicFieldOptions.map(({ key }) => [
      key,
      form.visibility?.[key] ?? defaultConsultationVisibility[key],
    ]));
    const consultation = { id: linkedAppointment ? `consultation-${linkedAppointment.id}` : `c${Date.now()}`, appointmentId: linkedAppointment?.id || '', studentId: student.id, studentUid: student.uid || '', counselorUid, date: form.date, type: form.type, purpose: final.purpose, counselor: (profile?.displayName || user?.displayName || '상담 담당자').replace(/\s*상담사$/, ''), summary: final.summary, strengths: final.strengths, concern: final.concern, guidance: final.guidance, programs: final.programs, studentActions: final.studentActions, counselorActions: final.counselorActions, nextCheckItems: final.nextCheckItems, ...(aiReview ? { aiReview } : {}), publication, studentVisible: Object.values(publication).some(Boolean), createdAt: now, updatedAt: now };
    const publishedSummary = buildConsultationSummary(consultation, publication);
    const internalNote = { id: consultation.id, consultationId: consultation.id, studentId: student.id, note: safeForm.rawMemo, createdAt: now, updatedAt: now };
    const newTasks = pendingTaskRows.map((task, index) => ({
      id: `f${Date.now()}-${index + 1}`,
      studentId: student.id,
      content: task.content.trim(),
      owner: task.owner,
      dueDate: task.dueDate || form.nextDate,
      status: 'scheduled',
      consultationDate: form.date,
      createdAt: now,
      updatedAt: now,
    }));
    const matchingAppointment = linkedAppointment || appointments.find(item => item.studentId === student.id && item.date === form.date && ['confirmed', 'scheduled'].includes(item.status));
    const completedAppointment = matchingAppointment ? { ...matchingAppointment, status: 'completed', completedAt: now, updatedAt: now } : null;
    const updatedStudent = {
      ...student,
      status: 'complete',
      lastConsultation: form.date,
      appointmentDate: matchingAppointment ? '' : student.appointmentDate,
      appointment: matchingAppointment ? '' : student.appointment,
      updatedAt: now,
    };
    const studentNotifications = [
      ...(publishedSummary.published && student.uid ? [buildEventNotification({ eventId: `${consultation.id}-published`, recipientUid: student.uid, actorUid: counselorUid, type: 'summary', title: '새 상담 요약이 공개되었습니다', description: `${form.date} 상담에서 공개된 내용을 확인하세요.`, to: '/student', createdAt: now })] : []),
      ...newTasks.filter(task => task.owner === '학생' && student.uid).map(task => buildEventNotification({ eventId: `${task.id}-assigned`, recipientUid: student.uid, actorUid: counselorUid, type: 'followup', title: '새로운 할 일이 등록되었습니다', description: `${task.content} · ${task.dueDate}까지`, to: '/student', createdAt: now })),
    ];
    setSaving(true);
    setError('');
    try {
      await persistDocumentGroup([
        { name: 'consultations', record: consultation },
        { name: 'consultationSummaries', record: publishedSummary },
        { name: 'consultationNotes', record: internalNote },
        ...newTasks.map(record => ({ name: 'followUps', record })),
        { name: 'students', record: updatedStudent },
        ...(completedAppointment ? [{ name: 'appointments', record: completedAppointment }] : []),
        ...studentNotifications.map(record => ({ name: 'notifications', record })),
      ]);
      setConsultations(current => appendMissingDocuments(current, [consultation]));
      setConsultationSummaries(current => appendMissingDocuments(current, [publishedSummary]));
      setConsultationNotes(current => appendMissingDocuments(current, [internalNote]));
      setFollowUps(current => appendMissingDocuments(current, newTasks));
      setStudents(current => current.map(item => item.id === student.id ? updatedStudent : item));
      if (completedAppointment) setAppointments(current => current.map(item => item.id === completedAppointment.id ? completedAppointment : item));
      setNotifications(items => [...items, ...studentNotifications.filter(record => !items.some(item => item.id === record.id))]);
      await removeDocument('consultationDrafts', draftId);
      setConsultationDrafts(items => items.filter(item => item.id !== draftId));
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
    <div className="form-page-header"><div><span className="eyebrow">상담 진행 중 · {form.date}</span><h1>상담 기록 작성</h1><p>{linkedAppointment ? `${linkedAppointment.time}–${linkedAppointment.endTime} 예약과 연결됨` : '상담 중에는 핵심만 메모하고, AI 초안으로 정리해 보세요.'}</p>{draftSavedAt && <small>마지막 임시 저장 {new Date(draftSavedAt).toLocaleString('ko-KR')}</small>}</div><div><button className="button secondary" disabled={saving} onClick={async () => { await removeDocument('consultationDrafts', draftId); setConsultationDrafts(items => items.filter(item => item.id !== draftId)); setDraftForm(null); setDraftSavedAt(''); notify('임시 저장 내용을 삭제했습니다.'); }}>임시 기록 삭제</button><button className="button primary" disabled={saving} onClick={save}>{saving ? '저장 중...' : '상담 기록 저장'}</button></div></div>
    <div className="consultation-layout">
      <section className="card consultation-form-card">
        <div className="form-section-title"><span>1</span><div><h2>상담 기본 정보</h2><p>상담의 목적과 유형을 선택해 주세요.</p></div></div>
        <div className="form-grid"><label>상담 날짜<input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></label><label>상담 유형<select value={form.type} onChange={e => update('type', e.target.value)}>{['진로 탐색', '취업 준비', '자기소개서', '면접', '비교과 활동', '포트폴리오', '기타'].map(x => <option key={x}>{x}</option>)}</select></label><label className="full">상담 목적 <span className="required">필수</span><input value={form.purpose} onChange={e => update('purpose', e.target.value)} /></label></div>
        <div className="form-divider" />
        <div className="form-section-title"><span>2</span><div><h2>상담 메모</h2><p>완성된 문장보다 중요한 키워드와 맥락을 편하게 남겨 주세요.</p></div></div>
        <label>학생의 현재 고민<textarea rows="3" value={form.currentConcern} onChange={e => update('currentConcern', e.target.value)} /></label>
        <label>상담 담당자 내부 메모 <span className="required">필수</span><textarea id="rawMemo" className="memo-area" rows="8" value={form.rawMemo} onChange={e => update('rawMemo', e.target.value)} placeholder="예: 개발 수업은 재미있었지만, 문제를 정의하고 사람들과 조율하는 역할에 더 흥미를 느낌..." /><small className="field-hint">원문 메모는 학생에게 공개되지 않으며 담당 상담사와 권한이 있는 관리자만 접근할 수 있습니다. AI 초안 생성 시 이메일·전화번호·주민등록번호 형식은 전송 전에 자동 마스킹됩니다.</small>{privacyPreflight.needsMasking && <span className="privacy-preflight" role="status"><Icon name="shield" size={16} /><span><strong>개인정보 사전 점검</strong>{privacyPreflight.findings.map(item => `${item.label} ${item.count}건`).join(' · ')} 감지 — AI 전송 전 서버에서 마스킹됩니다.</span></span>}{error && <span className="field-error" role="alert">{error}</span>}</label>
        <fieldset className="publication-fieldset"><legend>학생에게 공개할 내용</legend><p>체크한 항목만 학생 화면에 표시됩니다. 상담사 내부 메모는 항상 비공개입니다.</p><div>{consultationPublicFieldOptions.map(item => <label key={item.key}><input type="checkbox" checked={form.visibility?.[item.key] ?? false} onChange={e => update('visibility', { ...form.visibility, [item.key]: e.target.checked })} /><span>{item.label}</span></label>)}</div></fieldset>
        <section className={`selected-programs ${form.programs.length ? 'has-selection' : ''}`} aria-labelledby="program-picker-title">
          <div className="selected-programs-header">
            <span className="program-picker-icon"><Icon name="spark" size={20} /></span>
            <div>
              <span className="eyebrow">학생 맞춤 비교과 연결</span>
              <h3 id="program-picker-title">추천 프로그램 찾기</h3>
              <p>학생의 관심 분야와 목표를 바탕으로 적합한 프로그램을 골라 상담 기록에 연결하세요.</p>
            </div>
            <button type="button" className="button secondary small" onClick={openPrograms}><Icon name="search" size={16} />{form.programs.length ? '추천 다시 찾기' : '프로그램 찾아보기'}</button>
          </div>
          {form.programs.length ? <div className="selected-program-list" aria-label={`선택된 추천 프로그램 ${form.programs.length}개`}>
            <strong>{form.programs.length}개 선택됨</strong>
            {form.programs.map(p => <span className="selected-chip" key={p}>{p}<button type="button" aria-label={`${p} 추천에서 삭제`} onClick={() => update('programs', form.programs.filter(x => x !== p))}><Icon name="close" size={14} /></button></span>)}
          </div> : <div className="selected-program-empty"><Icon name="target" size={17} /><span>아직 연결된 프로그램이 없습니다. 추천 결과에서 바로 선택할 수 있어요.</span></div>}
        </section>
        <div className="form-divider" />
        <div className="form-section-title"><span>3</span><div><h2>상담 후 할 일</h2><p>상담이 끝난 뒤 실행할 일을 담당자와 기한까지 함께 등록하세요.</p></div></div>
        <section className="consultation-task-builder" aria-labelledby="task-builder-title">
          <div className="task-builder-heading">
            <div><span className="task-builder-icon"><Icon name="check" size={19} /></span><div><h3 id="task-builder-title">저장과 동시에 할 일로 등록</h3><p>내용을 입력한 항목만 상담 후 할 일 목록과 담당자 화면에 추가됩니다.</p></div></div>
            <span className={`task-ready-count ${pendingTaskCount ? 'active' : ''}`}>{pendingTaskCount ? `${pendingTaskCount}개 등록 예정` : '선택 입력'}</span>
          </div>
          <div className="task-builder-grid">
            {[
              { owner: '학생', label: '학생 할 일', description: '등록 후 학생의 ‘나의 할 일’에 바로 표시됩니다.', placeholder: '예: 관심 직무 2개의 역할과 필요 역량 비교하기' },
              { owner: '교직원', label: '상담사 할 일', description: '담당 상담사의 할 일 목록에 함께 등록됩니다.', placeholder: '예: 포트폴리오 예시 자료 전달하기' },
            ].map(group => {
              const ownerRows = taskRows.filter(row => row.owner === group.owner);
              return <section className="task-owner-group" aria-label={group.label} key={group.owner}>
                <div className="task-owner-group-head">
                  <div><span className={`task-owner-chip ${group.owner === '학생' ? 'student' : 'counselor'}`}>{group.owner === '학생' ? '학생' : '상담사'}</span><div><strong>{group.label}</strong><small>{group.description}</small></div></div>
                  <span>{ownerRows.filter(row => row.content.trim()).length}개 작성</span>
                </div>
                <div className="task-row-list">
                  {ownerRows.map((row, index) => <div className="consultation-task-row" key={row.id}>
                    <span className="task-row-index" aria-hidden="true">{index + 1}</span>
                    <label className="task-row-field task-row-content"><span>할 일 내용</span><input type="text" maxLength="500" value={row.content} onChange={event => updateTaskRow(row.id, 'content', event.target.value)} placeholder={group.placeholder} /></label>
                    <label className="task-row-field task-row-due"><span><Icon name="calendar" size={14} />완료 기한</span><input type="date" value={row.dueDate} onChange={event => updateTaskRow(row.id, 'dueDate', event.target.value)} /></label>
                    {ownerRows.length > 1 && <button type="button" className="task-row-remove" aria-label={`${group.label} ${index + 1}행 삭제`} onClick={() => removeTaskRow(row.id)}><Icon name="close" size={16} /></button>}
                  </div>)}
                </div>
                <button type="button" className="task-add-row" onClick={() => addTaskRow(group.owner)}><Icon name="plus" size={16} />{group.label} 추가</button>
              </section>;
            })}
          </div>
        </section>
      </section>
      <aside className="consultation-aside">
        <section className="card student-context"><div className="context-head"><div><strong>{student.name}</strong><p>{student.department} · {student.grade}</p></div><StatusBadge status="inProgress" /></div><dl><div><dt>진로 목표</dt><dd>{student.goal}</dd></div><div><dt>최근 상담</dt><dd>{student.lastConsultation}</dd></div></dl></section>
        <section className="card ai-card">
          <span className="ai-label"><Icon name="spark" size={16} /> AI 작성 도우미</span>
          <h2>{aiDraft ? '상담일지 초안' : '메모를 상담일지로 정리해요'}</h2>
          {!aiDraft && <>
            <p>내부 메모 한 번으로 상담 요약, 추천 프로그램, 상담 후 할 일을 함께 만들어요. 검토 전에는 입력란에 반영되지 않습니다.</p>
            <div className="ai-privacy-notice"><Icon name="lock" size={16} /><span><strong>최소 정보만 전송</strong>학생 이름·학번·연락처는 요청 데이터에 포함하지 않고, 메모 속 직접 식별정보 형식은 서버에서 마스킹합니다.</span></div>
          </>}
          {loading && <div className="ai-loading" role="status" aria-live="polite"><span className="spinner" />상담 맥락을 정리하고 있어요...</div>}
          {!aiDraft && !loading && <button className="button ai full" onClick={generate}><Icon name="spark" size={18} />AI 통합 초안 만들기</button>}
          {aiDraft && !loading && <>
            <div className="ai-warning"><Icon name="alert" size={17} />AI가 작성한 미리보기입니다. 근거와 반영될 내용을 확인한 뒤 승인해 주세요.</div>
            <div className="ai-review-progress" aria-live="polite">
              <div><span>근거 검토 진행률</span><strong>{reviewedEvidenceCount} / {consultationEvidenceFieldOptions.length}</strong></div>
              <i><b style={{ width: `${reviewedEvidenceCount / consultationEvidenceFieldOptions.length * 100}%` }} /></i>
              <small>현재 근거 충족률 {getEvidenceCoverage(aiDraft)}%</small>
            </div>
            <div className="ai-fields">
              {[['purpose', '상담 목적'], ['summary', '상담 주요 내용'], ['concern', '학생의 고민과 목표']].map(([key, label]) => <label key={key}>{label}<textarea rows={key === 'summary' ? 5 : 3} value={aiDraft[key] || ''} onChange={e => updateAiText(key, e.target.value)} /></label>)}
              <section className="ai-application-preview" aria-labelledby="ai-application-preview-title">
                <div className="ai-preview-head"><div><span><Icon name="spark" size={15} />일괄 반영 미리보기</span><h3 id="ai-application-preview-title">승인하면 아래 내용이 입력됩니다</h3></div><strong>{(aiDraft.programs?.length || 0) + (aiDraft.followUpTasks?.length || 0)}개 항목</strong></div>
                <div className="ai-preview-block">
                  <div className="ai-preview-block-title"><span className="preview-kind program"><Icon name="target" size={14} /></span><div><strong>추천 프로그램</strong><small>실제 등록된 프로그램 후보에서만 선택</small></div></div>
                  {aiDraft.programs?.length ? <div className="ai-preview-programs">{aiDraft.programs.map(program => <span key={program}>{program}<button type="button" aria-label={`${program} AI 추천에서 제외`} onClick={() => removeAiProgram(program)}><Icon name="close" size={13} /></button></span>)}</div> : <p className="ai-preview-empty">상담 내용과 직접 맞는 프로그램을 찾지 못했습니다.</p>}
                </div>
                <div className="ai-preview-block">
                  <div className="ai-preview-block-title"><span className="preview-kind task"><Icon name="check" size={14} /></span><div><strong>상담 후 할 일</strong><small>담당자와 권장 기한까지 함께 반영</small></div></div>
                  <div className="ai-preview-tasks">{(aiDraft.followUpTasks || []).map((task, index) => <article key={`${task.owner}-${index}`}>
                    <div><span className={`task-owner-chip ${task.owner === '상담사' ? 'counselor' : 'student'}`}>{task.owner}</span><button type="button" aria-label={`AI 할 일 ${index + 1} 삭제`} onClick={() => removeAiTask(index)}><Icon name="close" size={14} /></button></div>
                    <label>할 일 내용<textarea rows="2" maxLength="500" value={task.content} onChange={event => updateAiTask(index, 'content', event.target.value)} /></label>
                    <label className="ai-task-due">권장 완료일 <span>상담일로부터</span><input type="number" min="1" max="60" value={task.dueInDays} onChange={event => updateAiTask(index, 'dueInDays', event.target.value)} />일 후 · {addDays(form.date, task.dueInDays)}</label>
                  </article>)}</div>
                </div>
              </section>
              <section className="ai-review-section">
                <h3>항목별 작성 근거</h3>
                <p>AI가 사용한 상담 내용을 읽고 각 항목을 직접 확인해 주세요. ‘근거 부족’이면 초안 내용을 보완하거나 삭제합니다.</p>
                {consultationEvidenceFieldOptions.map(({ key, label }) => <div className={`ai-evidence ${evidenceReviews[key] ? 'reviewed' : ''}`} key={key}>
                  <div className="ai-evidence-head"><strong>{label}</strong><span>{evidenceReviews[key] ? '확인 완료' : '확인 필요'}</span></div>
                  <ul>{(aiDraft.evidence?.[key]?.length ? aiDraft.evidence[key] : ['근거 부족']).map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul>
                  <label className="ai-review-check"><input type="checkbox" checked={evidenceReviews[key]} onChange={event => {
                    setEvidenceReviews(prev => ({ ...prev, [key]: event.target.checked }));
                    setAiReviewedAt('');
                  }} /><span>이 근거와 초안 내용을 직접 확인했습니다</span></label>
                </div>)}
              </section>
              <section className="ai-review-section">
                <h3>추가 확인 필요</h3>
                {aiDraft.needsConfirmation?.length ? <>
                  <ul>{aiDraft.needsConfirmation.map((item, index) => <li key={`confirmation-${index}`}>{item}</li>)}</ul>
                  <label className="ai-review-check"><input type="checkbox" checked={confirmationAcknowledged} onChange={event => { setConfirmationAcknowledged(event.target.checked); setAiReviewedAt(''); }} /><span>추가 확인 항목을 읽고 기록에 반영했습니다</span></label>
                </> : <p>AI가 발견한 추가 확인 사항이 없습니다.</p>}
              </section>
              {Boolean(aiDraft.sensitiveWarning?.length) && <section className="ai-review-section sensitive">
                <h3><Icon name="alert" size={15} />공개 전 확인</h3>
                <ul>{aiDraft.sensitiveWarning.map((item, index) => <li key={`warning-${index}`}>{item}</li>)}</ul>
                <label className="ai-review-check"><input type="checkbox" checked={sensitiveAcknowledged} onChange={event => { setSensitiveAcknowledged(event.target.checked); setAiReviewedAt(''); }} /><span>민감정보 경고를 확인하고 공개 범위를 점검했습니다</span></label>
              </section>}
            </div>
            <div className={`ai-review-confirmation ${aiReviewedAt ? 'confirmed' : ''}`}>
              <Icon name={aiReviewedAt ? 'check' : 'shield'} size={18} />
              <span><strong>{aiReviewedAt ? '검토 완료 · 입력 적용됨' : reviewReady ? '일괄 반영 준비 완료' : '상담사 확인이 필요합니다'}</strong>{aiReviewedAt ? '추천 프로그램과 할 일이 실제 입력란에 반영됐습니다.' : reviewReady ? '모든 필수 확인이 끝났습니다. 승인하면 미리보기 내용이 한 번에 입력됩니다.' : '항목별 근거와 표시된 경고를 모두 확인해야 입력할 수 있습니다.'}</span>
            </div>
            <div className="ai-actions">
              <button className="button secondary" onClick={generate}>초안 다시 생성</button>
              <button id="ai-review-confirm" className={`button ${aiReviewedAt ? 'secondary' : 'ai'}`} disabled={!reviewReady && !aiReviewedAt} onClick={applyReviewedAiDraft}>{aiReviewedAt ? '입력 적용 완료' : '검토 완료 및 일괄 반영'}</button>
            </div>
          </>}
        </section>
      </aside>
    </div>
    <div className="mobile-savebar"><button className="button secondary" disabled={saving} onClick={generate}>AI 초안</button><button className="button primary" disabled={saving} onClick={save}>{saving ? '저장 중...' : '상담 기록 저장'}</button></div>
  </>;
}
