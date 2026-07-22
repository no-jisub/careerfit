import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';
import { recommendPrograms } from '../utils/programRecommendations';
import { useAuth } from '../auth/AuthContext';
import {
  normalizeProgram,
  PROGRAM_MODES,
  PROGRAM_STATUS_LABELS,
  PROGRAM_TYPES,
  isProgramEligibleForStudent,
  resolveProgramStatus,
  validateProgram,
} from '../utils/programs';

const gradeOptions = ['1학년', '2학년', '3학년', '4학년'];
const editableStatuses = ['draft', 'scheduled', 'recruiting', 'closed', 'completed'];

const emptyProgram = () => ({
  name: '', type: PROGRAM_TYPES[0], description: '', reason: '', tags: '', grades: ['1학년', '2학년', '3학년', '4학년'], targetDepartments: '', target: '전 학과 재학생',
  recruitmentStartDate: '', recruitmentEndDate: '', programStartDate: '', programEndDate: '', schedule: '', mode: PROGRAM_MODES[0], department: '', capacity: 0, location: '', applicationUrl: '', contact: '', status: 'draft', featured: false,
});

function ProgramFormModal({ program, onClose, onSave }) {
  const [form, setForm] = useState(() => program ? {
    ...program,
    tags: program.tags.join(', '),
    targetDepartments: program.targetDepartments.join(', '),
  } : emptyProgram());
  const [errors, setErrors] = useState({});
  useEffect(() => {
    const close = event => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const update = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '', ...(key.includes('Date') ? { recruitmentDates: '', programDates: '' } : {}) }));
  };
  const toggleGrade = grade => update('grades', form.grades.includes(grade) ? form.grades.filter(item => item !== grade) : [...form.grades, grade]);
  const submit = event => {
    event.preventDefault();
    const candidate = {
      ...form,
      tags: form.tags.split(',').map(value => value.trim()).filter(Boolean),
      targetDepartments: form.targetDepartments.split(',').map(value => value.trim()).filter(Boolean),
    };
    const nextErrors = validateProgram(candidate);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(candidate);
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="modal program-form-modal" role="dialog" aria-modal="true" aria-labelledby="program-form-title">
      <button className="modal-close" aria-label="닫기" onClick={onClose}><Icon name="close" size={19} /></button>
      <span className="eyebrow">비교과 프로그램 관리</span>
      <h2 id="program-form-title">{program ? '프로그램 수정' : '새 프로그램 등록'}</h2>
      <form onSubmit={submit} noValidate>
        <div className="program-form-grid">
          <label className="span-2">프로그램명<input autoFocus value={form.name} onChange={event => update('name', event.target.value)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
          <label>분류<select value={form.type} onChange={event => update('type', event.target.value)}>{PROGRAM_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
          <label>운영 방식<select value={form.mode} onChange={event => update('mode', event.target.value)}>{PROGRAM_MODES.map(mode => <option key={mode}>{mode}</option>)}</select></label>
          <label>담당 부서<input value={form.department} onChange={event => update('department', event.target.value)} />{errors.department && <small className="field-error">{errors.department}</small>}</label>
          <label>담당 연락처<input value={form.contact} onChange={event => update('contact', event.target.value)} placeholder="부서명 또는 연락처" /></label>
          <label className="span-2">프로그램 설명<textarea rows="3" value={form.description} onChange={event => update('description', event.target.value)} />{errors.description && <small className="field-error">{errors.description}</small>}</label>
          <label className="span-2">추천 안내 문구<textarea rows="2" value={form.reason} onChange={event => update('reason', event.target.value)} placeholder="학생에게 이 프로그램을 추천하는 기본 이유" /></label>
          <label className="span-2">태그<small className="field-hint">쉼표로 구분해 주세요.</small><input value={form.tags} onChange={event => update('tags', event.target.value)} placeholder="UX, 서비스 기획, 포트폴리오" /></label>
          <fieldset className="span-2 program-grade-field"><legend>참여 대상 학년</legend><div>{gradeOptions.map(grade => <label key={grade}><input type="checkbox" checked={form.grades.includes(grade)} onChange={() => toggleGrade(grade)} />{grade}</label>)}</div>{errors.grades && <small className="field-error">{errors.grades}</small>}</fieldset>
          <label>대상 설명<input value={form.target} onChange={event => update('target', event.target.value)} placeholder="전 학과 2~4학년" /></label>
          <label>대상 학과<small className="field-hint">비워 두면 전 학과입니다.</small><input value={form.targetDepartments} onChange={event => update('targetDepartments', event.target.value)} placeholder="경영학과, 경제학과" /></label>
          <label>모집 시작일<input type="date" value={form.recruitmentStartDate} onChange={event => update('recruitmentStartDate', event.target.value)} /></label>
          <label>모집 종료일<input type="date" value={form.recruitmentEndDate} onChange={event => update('recruitmentEndDate', event.target.value)} />{errors.recruitmentDates && <small className="field-error">{errors.recruitmentDates}</small>}</label>
          <label>운영 시작일<input type="date" value={form.programStartDate} onChange={event => update('programStartDate', event.target.value)} /></label>
          <label>운영 종료일<input type="date" value={form.programEndDate} onChange={event => update('programEndDate', event.target.value)} />{errors.programDates && <small className="field-error">{errors.programDates}</small>}</label>
          <label>세부 일정<input value={form.schedule} onChange={event => update('schedule', event.target.value)} placeholder="금 14:00–17:00" /></label>
          <label>장소<input value={form.location} onChange={event => update('location', event.target.value)} /></label>
          <label>정원<input type="number" min="0" value={form.capacity} onChange={event => update('capacity', event.target.value)} /></label>
          <label>관리 상태<select value={form.status} onChange={event => update('status', event.target.value)}>{editableStatuses.map(status => <option value={status} key={status}>{PROGRAM_STATUS_LABELS[status]}</option>)}</select></label>
          <label className="span-2">신청 링크<input type="url" value={form.applicationUrl} onChange={event => update('applicationUrl', event.target.value)} placeholder="https://" />{errors.applicationUrl && <small className="field-error">{errors.applicationUrl}</small>}</label>
          <label className="program-featured-check span-2"><input type="checkbox" checked={form.featured} onChange={event => update('featured', event.target.checked)} /><span>학생 화면에서 주요 프로그램으로 강조</span></label>
        </div>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>취소</button><button className="button primary">{program ? '수정 내용 저장' : '프로그램 등록'}</button></div>
      </form>
    </section>
  </div>;
}

function ProgramManagementPage() {
  const { programs, setPrograms, resetProgramDemo, notify } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('전체');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const statusCounts = programs.reduce((counts, program) => {
    const key = resolveProgramStatus(program, today);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const visiblePrograms = useMemo(() => programs
    .filter(program => {
      const effectiveStatus = resolveProgramStatus(program, today);
      const matchesStatus = status === 'all' || (status === 'active' ? !['archived', 'completed'].includes(effectiveStatus) : effectiveStatus === status);
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery = !normalizedQuery || [program.name, program.department, program.description, ...program.tags].some(value => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery && (type === '전체' || program.type === type);
    })
    .sort((left, right) => Number(right.featured) - Number(left.featured) || left.recruitmentEndDate.localeCompare(right.recruitmentEndDate)), [programs, query, status, type, today]);
  const saveProgram = candidate => {
    const now = new Date().toISOString();
    const saved = normalizeProgram({ ...candidate, id: editing?.id || `p-${Date.now()}`, createdAt: editing?.createdAt || now, updatedAt: now });
    setPrograms(items => editing ? items.map(item => item.id === editing.id ? saved : item) : [saved, ...items]);
    setEditing(null);
    setCreating(false);
    notify(editing ? '프로그램 수정 내용을 저장했습니다.' : '새 비교과 프로그램을 등록했습니다.');
  };
  const duplicateProgram = program => {
    const now = new Date().toISOString();
    const copy = normalizeProgram({ ...program, id: `p-${Date.now()}`, name: `${program.name} 복사본`, status: 'draft', featured: false, archived: false, createdAt: now, updatedAt: now });
    setPrograms(items => [copy, ...items]);
    notify('프로그램을 작성 중 상태로 복제했습니다.');
  };
  const toggleArchive = program => {
    const archived = resolveProgramStatus(program, today) !== 'archived';
    setPrograms(items => items.map(item => item.id === program.id ? normalizeProgram({ ...item, archived, status: archived ? 'archived' : 'scheduled', updatedAt: new Date().toISOString() }) : item));
    notify(archived ? '프로그램을 보관했습니다. 언제든 복원할 수 있습니다.' : '프로그램을 복원했습니다.');
  };
  const reset = () => {
    if (!window.confirm('프로그램과 추천 내역을 최초 데모 데이터로 되돌릴까요?')) return;
    resetProgramDemo();
    notify('비교과 프로그램 데모 데이터를 초기화했습니다.');
  };
  return <>
    <PageIntro eyebrow="운영 관리" title="비교과 프로그램 관리" description="상담에 활용할 프로그램을 등록하고 모집 상태와 학생 추천 정보를 관리합니다." action={<div className="page-action-group"><button className="button secondary" onClick={reset}>데모 데이터 초기화</button><button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" size={17} />새 프로그램 등록</button></div>} />
    <section className="program-stat-grid" aria-label="프로그램 현황"><article className="card"><span>전체 프로그램</span><strong>{programs.length}</strong></article><article className="card"><span>현재 모집 중</span><strong>{statusCounts.recruiting || 0}</strong></article><article className="card"><span>모집 예정</span><strong>{statusCounts.scheduled || 0}</strong></article><article className="card"><span>작성 중</span><strong>{statusCounts.draft || 0}</strong></article></section>
    <section className="card program-management-card">
      <div className="program-management-toolbar"><label className="search-field"><Icon name="search" size={17} /><span className="sr-only">프로그램 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램명, 담당 부서, 태그 검색" /></label><select aria-label="프로그램 상태" value={status} onChange={event => setStatus(event.target.value)}><option value="active">운영 대상</option><option value="all">전체 상태</option>{Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="프로그램 분류" value={type} onChange={event => setType(event.target.value)}><option>전체</option>{PROGRAM_TYPES.map(item => <option key={item}>{item}</option>)}</select></div>
      {visiblePrograms.length ? <div className="program-management-list">{visiblePrograms.map(program => { const effectiveStatus = resolveProgramStatus(program, today); return <article key={program.id} className="program-management-item"><div className="program-management-main"><div><span className={`program-status status-${effectiveStatus}`}>{PROGRAM_STATUS_LABELS[effectiveStatus]}</span>{program.featured && <span className="program-featured">주요</span>}</div><h2>{program.name}</h2><p>{program.description}</p><div className="program-tags">{program.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><dl className="program-management-meta"><div><dt>담당 부서</dt><dd>{program.department}</dd></div><div><dt>모집 기간</dt><dd>{program.recruit}</dd></div><div><dt>운영 기간</dt><dd>{program.period}</dd></div><div><dt>방식·정원</dt><dd>{program.mode} · {program.capacity ? `${program.capacity}명` : '제한 없음'}</dd></div></dl><div className="program-management-actions"><button className="button secondary small" onClick={() => setEditing(program)}>수정</button><button className="text-button" onClick={() => duplicateProgram(program)}>복제</button><button className="text-button" onClick={() => toggleArchive(program)}>{effectiveStatus === 'archived' ? '복원' : '보관'}</button></div></article>; })}</div> : <EmptyState title="조건에 맞는 프로그램이 없습니다" description="검색어나 상태 필터를 변경해 보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setStatus('active'); setType('전체'); }}>필터 초기화</button>} />}
    </section>
    {(creating || editing) && <ProgramFormModal program={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={saveProgram} />}
  </>;
}

function ProgramRecommendationModal({ program, student, onClose, onSave }) {
  const [reason, setReason] = useState(program.reason || '학생의 관심 분야와 진로 목표에 도움이 되는 프로그램입니다.');
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal recommendation-modal" role="dialog" aria-modal="true" aria-labelledby="recommendation-title"><button className="modal-close" aria-label="닫기" onClick={onClose}><Icon name="close" size={19} /></button><span className="eyebrow">학생별 프로그램 추천</span><h2 id="recommendation-title">{student.name} 학생에게 추천</h2><div className="recommendation-program-summary"><strong>{program.name}</strong><span>{program.department} · {program.mode}</span></div><label>추천 사유<textarea autoFocus rows="5" maxLength="500" value={reason} onChange={event => setReason(event.target.value)} /></label><p className="field-hint">학생 화면에 그대로 표시되므로 구체적이고 이해하기 쉬운 이유를 작성해 주세요.</p><div className="modal-actions"><button className="button secondary" onClick={onClose}>취소</button><button className="button primary" disabled={!reason.trim()} onClick={() => onSave(reason.trim())}>학생에게 추천</button></div></section></div>;
}

function ProgramRecommendationPage({ studentId, returnToForm }) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { students, programs, programRecommendations, setProgramRecommendations, draftForm, setDraftForm, notify } = useApp();
  const student = students.find(item => item.id === studentId);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('전체');
  const [selected, setSelected] = useState(() => draftForm?.form?.programs || []);
  const [recommending, setRecommending] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const recommended = useMemo(() => {
    if (!student) return [];
    const available = programs.filter(program => ['scheduled', 'recruiting'].includes(resolveProgramStatus(program, today)) && isProgramEligibleForStudent(program, student));
    return recommendPrograms(available, student, available.length).filter(program => (!query || program.name.includes(query) || program.tags.some(tag => tag.includes(query))) && (mode === '전체' || program.mode === mode));
  }, [student, programs, query, mode, today]);
  if (!student) return <section className="card"><EmptyState title="프로그램을 추천할 학생을 찾을 수 없습니다" description="먼저 담당 학생을 선택해 주세요." action={<Link className="button secondary" to="/students">담당 학생 목록으로</Link>} /></section>;
  const toggle = program => setSelected(current => current.includes(program.name) ? current.filter(item => item !== program.name) : [...current, program.name]);
  const saveRecommendation = reason => {
    const now = new Date().toISOString();
    const existing = programRecommendations.find(item => item.studentId === student.id && item.programId === recommending.id);
    const next = { id: existing?.id || `pr-${Date.now()}`, studentId: student.id, programId: recommending.id, counselorId: user?.uid || 'demo-counselor', counselorName: profile?.displayName || user?.displayName || '상담 담당자', reason, status: existing?.status || 'recommended', createdAt: existing?.createdAt || now, updatedAt: now };
    setProgramRecommendations(items => existing ? items.map(item => item.id === existing.id ? next : item) : [next, ...items]);
    setRecommending(null);
    notify(`${student.name} 학생에게 프로그램을 추천했습니다.`);
  };
  const cancelRecommendation = program => {
    setProgramRecommendations(items => items.filter(item => !(item.studentId === student.id && item.programId === program.id)));
    notify('학생 추천을 취소했습니다.');
  };
  const apply = () => {
    if (!selected.length) return;
    if (draftForm?.studentId === student.id) setDraftForm({ ...draftForm, form: { ...draftForm.form, programs: selected } });
    notify('비교과 프로그램을 상담 기록에 추가했습니다.');
    navigate(returnToForm ? `/students/${student.id}/consultation/new` : `/students/${student.id}`);
  };
  return <>
    <PageIntro eyebrow="상담 보조 기능" title={`${student.name} 학생에게 맞는 프로그램`} description="학생의 관심 분야와 학년을 기준으로 참여 가능한 프로그램을 정렬했습니다." action={returnToForm && <Link className="button secondary" to={`/students/${student.id}/consultation/new`}>상담 기록으로 돌아가기</Link>} />
    <section className="recommend-context card"><div className="recommend-student"><span className="avatar">{student.name.slice(1, 3)}</span><div><strong>{student.name}</strong><p>{student.department} · {student.grade}</p></div></div><div className="context-tags"><span>관심 분야</span>{student.interests.map(item => <b key={item}>{item}</b>)}</div><div className="context-goal"><span>진로 목표</span><strong>{student.goal}</strong></div></section>
    <div className="recommend-toolbar"><div><strong>참여 가능한 프로그램 <em>{recommended.length}</em></strong><p>관심 분야 일치, 학년 적합성, 주요 프로그램 순서로 정렬됩니다.</p></div><div><label className="search-field"><span className="sr-only">프로그램 검색</span><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램 검색" /></label><select aria-label="운영 방식" value={mode} onChange={event => setMode(event.target.value)}><option>전체</option>{PROGRAM_MODES.map(item => <option key={item}>{item}</option>)}</select></div></div>
    <div className="program-grid">{recommended.map(program => { const directRecommendation = programRecommendations.find(item => item.studentId === student.id && item.programId === program.id); return <article className={`program-card card ${selected.includes(program.name) ? 'selected' : ''}`} key={program.id}><div className="program-card-top"><span className={`program-status status-${resolveProgramStatus(program, today)}`}>{PROGRAM_STATUS_LABELS[resolveProgramStatus(program, today)]}</span><button className="select-program" aria-pressed={selected.includes(program.name)} onClick={() => toggle(program)}><Icon name={selected.includes(program.name) ? 'check' : 'plus'} size={15} />{selected.includes(program.name) ? '선택됨' : '상담에 추가'}</button></div><span className="eyebrow">{program.type}</span><h2>{program.name}</h2><p className="recommend-reason"><Icon name="spark" size={17} /><span><b>추천 근거</b>{directRecommendation?.reason || program.reason}</span></p><div className="program-tags">{program.tags.map(tag => <span key={tag}>{tag}</span>)}</div><dl className="program-info"><div><dt>신청 대상</dt><dd>{program.target}</dd></div><div><dt>모집 기간</dt><dd>{program.recruit}</dd></div><div><dt>운영 기간</dt><dd>{program.period}</dd></div><div><dt>일정</dt><dd>{program.schedule}</dd></div><div><dt>운영 방식</dt><dd>{program.mode}</dd></div><div><dt>담당 부서</dt><dd>{program.department}</dd></div></dl><div className="program-recommend-actions">{directRecommendation ? <><span>학생에게 추천됨 · {directRecommendation.status === 'applied' ? '신청 완료' : directRecommendation.status === 'interested' ? '관심 있음' : '확인 전'}</span><button className="text-button" onClick={() => cancelRecommendation(program)}>추천 취소</button></> : <button className="button secondary small" onClick={() => setRecommending(program)}><Icon name="spark" size={15} />학생에게 추천</button>}</div></article>; })}</div>
    {!recommended.length && <EmptyState title="조건에 맞는 프로그램이 없습니다" description="검색어나 운영 방식 필터를 변경해 보세요." />}
    <p className="recommend-disclaimer"><Icon name="alert" size={16} />추천 결과는 학생 정보와 프로그램 태그를 비교한 참고 정보이며 최종 안내는 상담 담당자가 결정합니다.</p>
    {selected.length > 0 && <div className="selection-bar"><div><span>{selected.length}개 선택</span><strong>{selected.join(', ')}</strong></div><button className="button primary" onClick={apply}>상담 기록에 추가 <Icon name="arrow" size={17} /></button></div>}
    {recommending && <ProgramRecommendationModal program={recommending} student={student} onClose={() => setRecommending(null)} onSave={saveRecommendation} />}
  </>;
}

export default function ProgramsPage() {
  const [params] = useSearchParams();
  const studentId = params.get('student');
  if (!studentId) return <ProgramManagementPage />;
  return <ProgramRecommendationPage studentId={studentId} returnToForm={params.get('return') === 'form'} />;
}
