import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusTabs } from '../components/UI';
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
import { buildEventNotification } from '../utils/notifications';

const gradeOptions = ['1학년', '2학년', '3학년', '4학년'];
const editableStatuses = ['draft', 'scheduled', 'recruiting', 'closed', 'completed'];
const managementStatusOptions = [
  { value: 'scheduled', label: '모집 예정', description: '아직 신청 전', icon: 'calendar' },
  { value: 'recruiting', label: '모집 중', description: '지금 신청 가능', icon: 'check' },
  { value: 'completed', label: '모집 완료', description: '접수 종료·운영 완료', icon: 'note' },
];

const groupManagementStatus = status => ['closed', 'completed', 'archived'].includes(status) ? 'completed' : status;
const managementStatusLabel = status => groupManagementStatus(status) === 'completed' ? '모집 완료' : PROGRAM_STATUS_LABELS[status];

const emptyProgram = () => ({
  name: '', type: PROGRAM_TYPES[0], description: '', reason: '', tags: '', grades: ['1학년', '2학년', '3학년', '4학년'], targetDepartments: '', target: '전 학과 재학생',
  recruitmentStartDate: '', recruitmentEndDate: '', programStartDate: '', programEndDate: '', schedule: '', mode: PROGRAM_MODES[0], department: '', capacity: 0, location: '', applicationUrl: '', contact: '', status: 'draft', featured: false,
});

function ProgramFormModal({ program, onClose, onSave }) {
  const [form, setForm] = useState(() => program ? {
    ...program,
    status: program.status === 'archived' ? 'completed' : program.status,
    archived: false,
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
          <label><span className="program-field-label">대상 설명</span><input value={form.target} onChange={event => update('target', event.target.value)} placeholder="전 학과 2~4학년" /></label>
          <label><span className="program-field-label">대상 학과 <small>(비워 두면 전 학과입니다.)</small></span><input value={form.targetDepartments} onChange={event => update('targetDepartments', event.target.value)} placeholder="경영학과, 경제학과" /></label>
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
  const { students, programs, setPrograms, programRecommendations, notify } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('recruiting');
  const [type, setType] = useState('전체');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const statusCounts = programs.reduce((counts, program) => {
    const key = resolveProgramStatus(program, today);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const managementStatusCounts = {
    scheduled: statusCounts.scheduled || 0,
    recruiting: statusCounts.recruiting || 0,
    completed: (statusCounts.closed || 0) + (statusCounts.completed || 0) + (statusCounts.archived || 0),
  };
  const activePrograms = programs.filter(program => ['scheduled', 'recruiting'].includes(resolveProgramStatus(program, today)));
  const matchCandidates = programs.filter(program => !['archived', 'completed', 'draft'].includes(resolveProgramStatus(program, today)));
  const matchQueue = students.map(student => {
    const eligible = matchCandidates.filter(program => isProgramEligibleForStudent(program, student));
    const program = recommendPrograms(eligible, student, 1)[0];
    const profileText = [...student.interests, student.goal, student.concern].join(' ').toLowerCase().replace(/\s+/g, '');
    const signalCount = program?.tags.filter(tag => {
      const normalized = tag.toLowerCase().replace(/\s+/g, '');
      return profileText.includes(normalized) || normalized.includes(profileText);
    }).length || 0;
    return { student, program, eligibleCount: eligible.length, signalCount };
  }).filter(item => item.program).sort((left, right) => right.signalCount - left.signalCount || right.program.score - left.program.score);
  const respondedRecommendations = programRecommendations.filter(item => ['interested', 'applied'].includes(item.status)).length;
  const visiblePrograms = useMemo(() => programs
    .filter(program => {
      const effectiveStatus = resolveProgramStatus(program, today);
      const matchesStatus = groupManagementStatus(effectiveStatus) === status;
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery = !normalizedQuery || [program.name, program.department, program.description, ...program.tags].some(value => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery && (type === '전체' || program.type === type);
    })
    .sort((left, right) => {
      if (status === 'completed') return (right.recruitmentEndDate || '').localeCompare(left.recruitmentEndDate || '');
      const dateField = status === 'scheduled' ? 'recruitmentStartDate' : 'recruitmentEndDate';
      return Number(right.featured) - Number(left.featured) || (left[dateField] || '').localeCompare(right[dateField] || '');
    }), [programs, query, status, type, today]);
  const saveProgram = candidate => {
    const now = new Date().toISOString();
    const saved = normalizeProgram({ ...candidate, id: editing?.id || `p-${Date.now()}`, createdAt: editing?.createdAt || now, updatedAt: now });
    setPrograms(items => editing ? items.map(item => item.id === editing.id ? saved : item) : [saved, ...items]);
    setEditing(null);
    setCreating(false);
    notify(editing ? '프로그램 수정 내용을 저장했습니다.' : '새 비교과 프로그램을 등록했습니다.');
  };
  return <>
    <PageIntro icon="layers" eyebrow="운영 관리" title="비교과 프로그램 관리" description="상담에 활용할 프로그램을 등록하고 모집 상태와 학생 추천 정보를 관리합니다." action={<button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" size={17} />새 프로그램 등록</button>} />
    <section className="program-intelligence-hero">
      <div className="program-intelligence-copy">
        <span className="program-live-label"><i /> Student × Opportunity intelligence</span>
        <span className="eyebrow">학생 성장기회 매칭</span>
        <h2>프로그램을 관리하는 데서 끝나지 않고<br />필요한 학생에게 먼저 연결합니다</h2>
        <p>상담 맥락의 관심 분야·학년과 실제 모집 가능한 프로그램을 비교해 상담사가 설명 가능한 추천을 완성합니다.</p>
        <div className="program-intelligence-metrics"><div><small>매칭 대기 학생</small><strong>{matchQueue.length}<em>명</em></strong></div><div><small>추천 가능 기회</small><strong>{activePrograms.length}<em>개</em></strong></div><div><small>학생 반응</small><strong>{respondedRecommendations}<em>건</em></strong></div></div>
      </div>
      <div className="program-match-queue">
        <div className="program-match-heading"><span><Icon name="target" size={16} />추천 우선순위</span><small>상담 맥락 기반</small></div>
        {matchQueue.slice(0, 3).map(({ student, program, eligibleCount, signalCount }, index) => <Link to={`/programs?student=${student.id}`} key={student.id}>
          <span className="match-rank">0{index + 1}</span>
          <span className="match-avatar">{student.name.slice(1, 3)}</span>
          <span><strong>{student.name} · {student.goal}</strong><small>{program.name}</small></span>
          <span className="match-count">{signalCount ? `근거 ${signalCount}` : `후보 ${eligibleCount}`}</span>
          <Icon name="arrow" size={16} />
        </Link>)}
        <Link className="program-match-all" to="/students">담당 학생 전체에서 추천 시작 <Icon name="arrow" size={16} /></Link>
      </div>
    </section>
    <section className="card program-management-card">
      <div className="program-management-head"><div><span className="eyebrow">Opportunity catalog</span><h2>프로그램 운영 목록</h2><p>현재 조건에 맞는 프로그램 <strong>{visiblePrograms.length}개</strong></p></div><span className="program-data-sync"><i />최신 데이터 동기화됨</span></div>
      <StatusTabs
        className="program-status-tabs"
        label="모집 상태"
        options={managementStatusOptions.map(option => ({ ...option, count: managementStatusCounts[option.value] }))}
        value={status}
        onChange={setStatus}
      />
      <div className="program-management-toolbar">
        <label className="search-field"><Icon name="search" size={17} /><span className="sr-only">프로그램 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램명, 담당 부서, 태그 검색" /></label>
        <select aria-label="프로그램 분류" value={type} onChange={event => setType(event.target.value)}><option>전체</option>{PROGRAM_TYPES.map(item => <option key={item}>{item}</option>)}</select>
      </div>
      {visiblePrograms.length ? <div className="program-management-list">{visiblePrograms.map(program => {
        const effectiveStatus = resolveProgramStatus(program, today);
        const applicantCount = Number(program.currentApplicants) || 0;
        const capacity = Number(program.capacity) || 0;
        const applicantProgress = capacity ? Math.min(100, Math.round((applicantCount / capacity) * 100)) : 0;
        const showApplicants = ['recruiting', 'closed', 'completed'].includes(effectiveStatus);
        return <article key={program.id} className="program-management-item">
          <div className="program-management-main">
            <div><span className={`program-status status-${effectiveStatus}`}>{managementStatusLabel(effectiveStatus)}</span>{program.featured && <span className="program-featured">주요</span>}</div>
            <h2>{program.name}</h2>
            <p>{program.description}</p>
            <div className="program-tags">{program.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          </div>
          <dl className="program-management-meta">
            <div><dt>담당 부서</dt><dd>{program.department}</dd></div>
            <div><dt>모집 기간</dt><dd>{program.recruit}</dd></div>
            <div><dt>운영 기간</dt><dd>{program.period}</dd></div>
            <div><dt>방식·정원</dt><dd>{program.mode} · {capacity ? `${capacity}명` : '제한 없음'}</dd></div>
            {showApplicants && <div className="program-applicant-status">
              <div><dt>신청 현황</dt><dd><strong>{applicantCount}</strong>{capacity ? ` / ${capacity}명` : '명'}</dd></div>
              {capacity > 0 && <span className="program-applicant-bar" role="img" aria-label={`신청 ${applicantCount}명, 정원 ${capacity}명`}><i style={{ width: `${applicantProgress}%` }} /></span>}
            </div>}
          </dl>
          <div className="program-management-actions"><button className="button secondary small" aria-label={`${program.name} 수정`} onClick={() => setEditing(program)}>수정</button></div>
        </article>;
      })}</div> : <EmptyState title="조건에 맞는 프로그램이 없습니다" description="검색어나 모집 상태를 변경해 보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setStatus('recruiting'); setType('전체'); }}>필터 초기화</button>} />}
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
  const { students, programs, programRecommendations, setProgramRecommendations, setNotifications, persistDocument, draftForm, setDraftForm, notify } = useApp();
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
  const saveRecommendation = async reason => {
    const now = new Date().toISOString();
    const existing = programRecommendations.find(item => item.studentId === student.id && item.programId === recommending.id);
    const next = { id: existing?.id || `pr-${Date.now()}`, studentId: student.id, programId: recommending.id, counselorId: user?.uid || 'demo-counselor', counselorName: profile?.displayName || user?.displayName || '상담 담당자', reason, status: existing?.status || 'recommended', createdAt: existing?.createdAt || now, updatedAt: now };
    const notification = buildEventNotification({
      eventId: `${next.id}-${existing ? 'updated' : 'recommended'}-${now}`,
      recipientUid: student.uid,
      actorUid: next.counselorId,
      type: 'program',
      title: existing ? '추천 프로그램 안내가 수정되었습니다' : '새 프로그램을 추천받았습니다',
      description: `${recommending.name} · ${reason}`,
      to: '/student',
      createdAt: now,
    });
    try {
      await persistDocument('notifications', notification);
      setProgramRecommendations(items => existing ? items.map(item => item.id === existing.id ? next : item) : [next, ...items]);
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setRecommending(null);
      notify(`${student.name} 학생에게 프로그램을 추천했습니다.`);
    } catch {
      // 공통 저장 오류 안내를 사용합니다.
    }
  };
  const cancelRecommendation = async program => {
    const existing = programRecommendations.find(item => item.studentId === student.id && item.programId === program.id);
    const now = new Date().toISOString();
    const notification = buildEventNotification({
      eventId: `${existing?.id || program.id}-cancelled-${now}`,
      recipientUid: student.uid,
      actorUid: user?.uid || 'demo-counselor',
      type: 'program',
      title: '프로그램 추천이 변경되었습니다',
      description: `${program.name} 추천이 취소되었습니다.`,
      to: '/student',
      createdAt: now,
    });
    try {
      await persistDocument('notifications', notification);
      setProgramRecommendations(items => items.filter(item => !(item.studentId === student.id && item.programId === program.id)));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      notify('학생 추천을 취소했습니다.');
    } catch {
      // 공통 저장 오류 안내를 사용합니다.
    }
  };
  const apply = () => {
    if (!selected.length) return;
    if (draftForm?.studentId === student.id) setDraftForm({ ...draftForm, form: { ...draftForm.form, programs: selected } });
    notify('비교과 프로그램을 상담 기록에 추가했습니다.');
    navigate(returnToForm ? `/students/${student.id}/consultation/new` : `/students/${student.id}`);
  };
  return <>
    <PageIntro icon="target" eyebrow="프로그램 추천" title={`${student.name} 학생에게 맞는 프로그램`} description="학생의 관심 분야와 학년을 기준으로 참여 가능한 프로그램을 정렬했습니다." action={returnToForm && <Link className="button secondary" to={`/students/${student.id}/consultation/new`}>상담 기록으로 돌아가기</Link>} />
    <section className="recommend-context card"><div className="recommend-student"><span className="avatar">{student.name.slice(1, 3)}</span><div><strong>{student.name}</strong><p>{student.department} · {student.grade}</p></div></div><div className="context-tags"><span>관심 분야</span>{student.interests.map(item => <b key={item}>{item}</b>)}</div><div className="context-goal"><span>진로 목표</span><strong>{student.goal}</strong></div></section>
    <div className="recommend-toolbar"><div><strong>참여 가능한 프로그램 <em>{recommended.length}</em></strong><p>관심 분야 일치, 학년 적합성, 주요 프로그램 순서로 정렬됩니다.</p></div><div><label className="search-field"><span className="sr-only">프로그램 검색</span><Icon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램 검색" /></label><select aria-label="운영 방식" value={mode} onChange={event => setMode(event.target.value)}><option>전체</option>{PROGRAM_MODES.map(item => <option key={item}>{item}</option>)}</select></div></div>
    <div className="program-grid">{recommended.map(program => { const directRecommendation = programRecommendations.find(item => item.studentId === student.id && item.programId === program.id); return <article className={`program-card card ${selected.includes(program.name) ? 'selected' : ''}`} key={program.id}><div className="program-card-top"><span className={`program-status status-${resolveProgramStatus(program, today)}`}>{PROGRAM_STATUS_LABELS[resolveProgramStatus(program, today)]}</span><button className="select-program" aria-pressed={selected.includes(program.name)} onClick={() => toggle(program)}><Icon name={selected.includes(program.name) ? 'check' : 'plus'} size={15} />{selected.includes(program.name) ? '선택됨' : '상담에 추가'}</button></div><span className="eyebrow">{program.type}</span><h2>{program.name}</h2><p className="recommend-reason"><Icon name="target" size={17} /><span><b>추천 근거</b>{directRecommendation?.reason || program.reason}</span></p><div className="program-tags">{program.tags.map(tag => <span key={tag}>{tag}</span>)}</div><dl className="program-info"><div><dt>신청 대상</dt><dd>{program.target}</dd></div><div><dt>모집 기간</dt><dd>{program.recruit}</dd></div><div><dt>운영 기간</dt><dd>{program.period}</dd></div><div><dt>일정</dt><dd>{program.schedule}</dd></div><div><dt>운영 방식</dt><dd>{program.mode}</dd></div><div><dt>담당 부서</dt><dd>{program.department}</dd></div></dl><div className="program-recommend-actions">{directRecommendation ? <><span>학생에게 추천됨 · {directRecommendation.status === 'applied' ? '신청 완료' : directRecommendation.status === 'interested' ? '관심 있음' : '확인 전'}</span><button className="text-button" onClick={() => cancelRecommendation(program)}>추천 취소</button></> : <button className="button secondary small" onClick={() => setRecommending(program)}><Icon name="target" size={15} />학생에게 추천</button>}</div></article>; })}</div>
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
