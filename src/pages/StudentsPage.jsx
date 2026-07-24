import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusBadge, StatusTabs } from '../components/UI';
import { maskPhone } from '../utils/sensitiveData';
import { toDateKey } from '../utils/date';
import { validateNewStudentInput } from '../utils/validation';

const studentStatusOptions = [
  { value: 'all', label: '전체', description: '모든 학생', icon: 'layers' },
  { value: 'scheduled', label: '상담 예정', description: '일정 확정', icon: 'calendar' },
  { value: 'inProgress', label: '진행 중', description: '상담 진행', icon: 'clock' },
  { value: 'writing', label: '기록 필요', description: '기록 작성 전', icon: 'note' },
  { value: 'complete', label: '완료', description: '상담 완료', icon: 'check' },
];

const writingStatusOptions = [
  { value: 'all', label: '전체 대상', description: '진행·기록 필요', icon: 'layers' },
  { value: 'inProgress', label: '상담 진행 중', description: '상담 내용 기록', icon: 'clock' },
  { value: 'writing', label: '기록 필요', description: '상담일지 마무리', icon: 'note' },
];

const selectionModeMeta = {
  preparation: {
    icon: 'list',
    eyebrow: '상담 전 준비',
    title: '예정된 상담부터 준비하세요',
    description: '상담이 예정된 학생만 모아 일정, 이전 상담 맥락과 준비할 내용을 바로 확인합니다.',
    allowedStatuses: ['scheduled'],
    queueEyebrow: '예정 상담 큐',
    queueTitle: '준비할 학생',
    actionLabel: '준비 브리핑 열기',
    actionIcon: 'list',
    emptyTitle: '준비할 예정 상담이 없습니다',
    emptyDescription: '새 상담이 확정되면 이 목록에 자동으로 표시됩니다.',
    getDestination: student => `/students/${student.id}/preparation`,
    getAriaLabel: student => `${student.name} 상담 전 준비`,
  },
  consultation: {
    icon: 'note',
    eyebrow: '상담 기록 작성',
    title: '진행 중인 상담 기록을 마무리하세요',
    description: '상담 진행 중이거나 기록 작성이 필요한 학생만 모아 다음 기록 업무에 바로 연결합니다.',
    allowedStatuses: ['inProgress', 'writing'],
    queueEyebrow: '기록 업무 큐',
    queueTitle: '작성할 상담 기록',
    actionLabel: '상담 기록 작성',
    actionIcon: 'note',
    emptyTitle: '작성할 상담 기록이 없습니다',
    emptyDescription: '상담이 시작되거나 기록 필요 상태가 되면 이 목록에 표시됩니다.',
    getDestination: student => `/students/${student.id}/consultation/new`,
    getAriaLabel: student => `${student.name} 상담 기록 작성`,
  },
};

const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];
const emptyStudentForm = {
  name: '',
  studentNo: '',
  department: '',
  grade: '1학년',
  phone: '',
  interests: '',
  goal: '',
  concern: '',
};

function getUpcomingAppointment(student, appointments, today) {
  const appointment = appointments
    .filter(item => item.studentId === student.id && activeAppointmentStatuses.includes(item.status) && item.date >= today)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  if (appointment) return appointment;
  if (!student.appointmentDate) return null;
  return {
    date: student.appointmentDate,
    time: student.appointment || '',
    type: '상담',
    location: '',
    attachments: [],
  };
}

function formatShortDate(date) {
  if (!date) return '기록 없음';
  const [year, month, day] = date.split('-');
  return `${year.slice(-2)}/${month}/${day}`;
}

function formatSchedule(appointment, today) {
  if (!appointment) return '일정 확인 필요';
  const dateLabel = appointment.date === today ? '오늘' : formatShortDate(appointment.date);
  return `${dateLabel}${appointment.time ? ` ${appointment.time}` : ''}`;
}

function StudentWorkCard({ student, mode, appointments, followUps, today }) {
  const meta = selectionModeMeta[mode];
  const appointment = getUpcomingAppointment(student, appointments, today);
  const pendingTasks = followUps.filter(item => item.studentId === student.id && item.status !== 'complete').length;
  const isPreparation = mode === 'preparation';
  const actionLabel = mode === 'consultation' && student.status === 'inProgress' ? '진행 중 기록 이어쓰기' : meta.actionLabel;
  const guidance = isPreparation
    ? appointment
      ? '이전 상담 기록과 이번 상담의 확인 질문을 먼저 점검하세요.'
      : '상담 일정에서 시간과 장소를 확인한 뒤 브리핑을 준비하세요.'
    : student.status === 'inProgress'
      ? '상담 내용을 놓치기 전에 핵심 메모부터 이어서 기록하세요.'
      : '남은 메모를 검토하고 상담일지를 마무리하세요.';

  return <article className={`student-work-card ${mode}`}>
    <header>
      <span className="student-work-avatar" aria-hidden="true">{student.initials || student.name.slice(1, 3)}</span>
      <div><h2>{student.name}</h2><p>{student.studentNo} · {student.department} · {student.grade}</p></div>
      <StatusBadge status={student.status} />
    </header>
    <div className="student-work-context">
      <span><Icon name="target" size={15} />이번 상담 포인트</span>
      <p>{student.concern || student.goal}</p>
    </div>
    <dl className="student-work-meta">
      {isPreparation ? <>
        <div><dt>상담 일정</dt><dd>{formatSchedule(appointment, today)}</dd></div>
        <div><dt>상담 유형</dt><dd>{appointment?.type || '일정 정보 확인'}</dd></div>
      </> : <>
        <div><dt>현재 단계</dt><dd>{student.status === 'inProgress' ? '상담 내용 기록 중' : '상담일지 작성 필요'}</dd></div>
        <div><dt>진로 목표</dt><dd>{student.goal}</dd></div>
      </>}
      <div><dt>최근 상담</dt><dd>{formatShortDate(student.lastConsultation)}</dd></div>
      <div><dt>미완료 할 일</dt><dd className={pendingTasks ? 'needs-attention' : ''}>{pendingTasks ? `${pendingTasks}건` : '없음'}</dd></div>
    </dl>
    <footer><p><Icon name={isPreparation ? 'shield' : 'note'} size={14} />{guidance}</p><Link className="button primary" aria-label={meta.getAriaLabel(student)} to={meta.getDestination(student)}>{actionLabel}<Icon name="arrow" size={16} /></Link></footer>
  </article>;
}

export default function StudentsPage({ selectionMode = '' }) {
  const { students, setStudents, followUps, appointments, persistDocumentGroup, notify } = useApp();
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const legacySelectionMode = params.get('select') === 'consultation' ? 'consultation' : '';
  const activeSelectionMode = selectionMode || legacySelectionMode;
  const selectionMeta = selectionModeMeta[activeSelectionMode];
  const [query, setQuery] = useState(params.get('q') || '');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState('all');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [studentFormError, setStudentFormError] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);
  const today = toDateKey();

  useEffect(() => {
    setStatus('all');
    setGrade('all');
  }, [activeSelectionMode]);

  useEffect(() => {
    if (!showAddStudent) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !savingStudent) {
        setShowAddStudent(false);
        setStudentForm(emptyStudentForm);
        setStudentFormError('');
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showAddStudent, savingStudent]);

  const eligibleStudents = useMemo(() => selectionMeta
    ? students.filter(student => selectionMeta.allowedStatuses.includes(student.status))
    : students, [students, selectionMeta]);
  const statusCounts = eligibleStudents.reduce((counts, student) => {
    counts[student.status] = (counts[student.status] || 0) + 1;
    return counts;
  }, {});
  const visibleStatusOptions = activeSelectionMode === 'consultation' ? writingStatusOptions : studentStatusOptions;
  const filtered = useMemo(() => eligibleStudents.filter(student => {
    const keyword = query.trim().toLowerCase();
    return (!keyword || [student.name, student.studentNo, student.department, student.goal, student.concern, ...(student.interests || [])].some(value => value?.toLowerCase().includes(keyword)))
      && (grade === 'all' || student.grade === grade)
      && (status === 'all' || student.status === status);
  }).sort((a, b) => {
    if (activeSelectionMode === 'preparation') {
      const left = getUpcomingAppointment(a, appointments, today);
      const right = getUpcomingAppointment(b, appointments, today);
      return `${left?.date || '9999'}T${left?.time || '99:99'}`.localeCompare(`${right?.date || '9999'}T${right?.time || '99:99'}`);
    }
    if (activeSelectionMode === 'consultation') {
      const priority = { inProgress: 0, writing: 1 };
      return (priority[a.status] ?? 2) - (priority[b.status] ?? 2)
        || (b.lastConsultation || '').localeCompare(a.lastConsultation || '');
    }
    return (b.lastConsultation || '').localeCompare(a.lastConsultation || '');
  }), [eligibleStudents, query, grade, status, activeSelectionMode, appointments, today]);
  const activeStatusLabel = visibleStatusOptions.find(option => option.value === status)?.label || '전체';

  const resetFilters = () => {
    setQuery('');
    setGrade('all');
    setStatus('all');
  };

  const updateStudentForm = (key, value) => {
    setStudentForm(current => ({ ...current, [key]: value }));
    if (studentFormError) setStudentFormError('');
  };

  const closeStudentForm = () => {
    if (savingStudent) return;
    setShowAddStudent(false);
    setStudentForm(emptyStudentForm);
    setStudentFormError('');
  };

  const addStudent = async event => {
    event.preventDefault();
    if (savingStudent) return;
    const validated = validateNewStudentInput(studentForm, students);
    if (validated.error) {
      setStudentFormError(validated.error);
      return;
    }

    const idSuffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const id = `student-${idSuffix}`;
    const now = new Date().toISOString();
    const counselorUid = user?.uid || profile?.id || 'demo-counselor';
    const counselor = (profile?.displayName || user?.displayName || '박지현 상담사').replace(/\s*상담사$/, '');
    const remoteStudent = Boolean(user);
    const student = {
      id,
      ...validated.value,
      studentNo: validated.value.studentNo,
      phone: remoteStudent ? maskPhone(validated.value.phone) : validated.value.phone,
      uid: `manual-${idSuffix}`,
      counselorUid,
      counselor,
      status: 'registered',
      appointmentDate: '',
      appointment: '',
      lastConsultation: '',
      initials: validated.value.name.slice(-2),
      createdAt: now,
      updatedAt: now,
    };
    const sensitiveProfile = {
      id,
      studentId: id,
      studentUid: student.uid,
      counselorUid,
      phone: validated.value.phone,
      createdAt: now,
      updatedAt: now,
    };

    setSavingStudent(true);
    setStudentFormError('');
    try {
      await persistDocumentGroup([
        { name: 'students', record: student },
        ...(remoteStudent ? [{ name: 'studentSensitiveProfiles', record: sensitiveProfile }] : []),
      ]);
      setStudents(current => [...current, student]);
      setStudentForm(emptyStudentForm);
      setShowAddStudent(false);
      setQuery('');
      setGrade('all');
      setStatus('all');
      notify(`${student.name} 학생을 추가했습니다.`);
    } catch (error) {
      setStudentFormError(error?.message || '학생을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingStudent(false);
    }
  };

  const pageAction = selectionMeta
    ? activeSelectionMode === 'preparation'
      ? <Link to="/appointments" className="button secondary"><Icon name="calendar" size={17} />상담 일정 보기</Link>
      : <Link to="/students" className="button secondary"><Icon name="students" size={17} />전체 학생 보기</Link>
    : <button type="button" className="button primary" onClick={() => setShowAddStudent(true)}><Icon name="plus" size={18} />학생 추가</button>;

  return <>
    <PageIntro icon={selectionMeta?.icon || 'students'} eyebrow={selectionMeta?.eyebrow || '학생 관리'} title={selectionMeta?.title || '학생을 한눈에 확인하세요'} description={selectionMeta?.description || `담당 학생 ${students.length}명의 상담 맥락과 다음 행동을 관리합니다.`} action={pageAction} />

    <section className="card student-filter-panel" aria-label="학생 검색 및 필터">
      {(!selectionMeta || activeSelectionMode === 'consultation') && <StatusTabs
        className={`student-status-tabs compact-status-tabs ${selectionMeta ? 'selection-status-tabs' : ''}`}
        label={selectionMeta ? '기록 업무 상태' : '상담 상태'}
        options={visibleStatusOptions.map(option => ({ ...option, count: option.value === 'all' ? eligibleStudents.length : statusCounts[option.value] || 0 }))}
        value={status}
        onChange={setStatus}
      />}
      <div className={`student-filter-tools ${activeSelectionMode === 'preparation' ? 'standalone' : ''}`}>
        <label className="search-field"><span className="sr-only">학생 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={selectionMeta ? '대상 학생 이름, 학과, 상담 포인트 검색' : '이름, 학번, 학과로 검색'} /></label>
        <select aria-label="학년" value={grade} onChange={event => setGrade(event.target.value)}><option value="all">전체 학년</option><option>1학년</option><option>2학년</option><option>3학년</option><option>4학년</option></select>
      </div>
    </section>

    {selectionMeta ? <section className="workflow-student-queue" aria-labelledby="workflow-student-queue-title">
      <div className="workflow-student-queue-heading"><div><span className="eyebrow">{selectionMeta.queueEyebrow}</span><h2 id="workflow-student-queue-title">{status === 'all' ? selectionMeta.queueTitle : `${activeStatusLabel} 학생`} <em aria-live="polite">{filtered.length}</em></h2></div>{(query || grade !== 'all' || status !== 'all') && <button className="text-button" type="button" onClick={resetFilters}>필터 초기화</button>}</div>
      {filtered.length ? <div className="student-work-grid">{filtered.map(student => <StudentWorkCard student={student} mode={activeSelectionMode} appointments={appointments} followUps={followUps} today={today} key={student.id} />)}</div> : <section className="card workflow-queue-empty"><EmptyState icon={selectionMeta.icon} title={selectionMeta.emptyTitle} description={query || grade !== 'all' || status !== 'all' ? '검색어나 필터를 바꾸어 다시 확인해 보세요.' : selectionMeta.emptyDescription} action={query || grade !== 'all' || status !== 'all' ? <button className="button secondary" type="button" onClick={resetFilters}>필터 초기화</button> : activeSelectionMode === 'preparation' ? <Link className="button secondary" to="/appointments">상담 일정 확인</Link> : <Link className="button secondary" to="/students">학생 관리 열기</Link>} /></section>}
    </section> : <section className="card student-list-card" aria-labelledby="student-list-title">
      <div className="list-toolbar"><div><h2 id="student-list-title">{status === 'all' ? '전체 학생' : `${activeStatusLabel} 학생`} <span aria-live="polite">{filtered.length}</span></h2><p>최근 상담일 순으로 표시됩니다.</p></div><button className="text-button" onClick={resetFilters}>필터 초기화</button></div>
      {filtered.length ? <><div className="table-wrap"><table className="student-table"><thead><tr><th>학생</th><th>학번</th><th>학과 / 학년</th><th>관심 분야</th><th>최근 상담일</th><th>미완료 할 일</th><th>상태</th><th><span className="sr-only">상세</span></th></tr></thead><tbody>{filtered.map(student => { const count = followUps.filter(item => item.studentId === student.id && item.status !== 'complete').length; const destination = `/students/${student.id}`; return <tr key={student.id}><td><Link className="student-cell" to={destination}><strong>{student.name}</strong></Link></td><td className="student-identifier">{student.studentNo}</td><td><strong>{student.department}</strong><small>{student.grade}</small></td><td><div className="tag-row">{student.interests.slice(0, 2).map(interest => <span className="tag" key={interest}>{interest}</span>)}</div></td><td>{formatShortDate(student.lastConsultation)}</td><td>{count ? <b className="count-emphasis">{count}건</b> : <span className="muted">없음</span>}</td><td><StatusBadge status={student.status} /></td><td><Link className="row-link" aria-label={`${student.name} 상세 보기`} to={destination}><Icon name="chevron" size={18} /></Link></td></tr>; })}</tbody></table></div>
      <div className="student-card-list">{filtered.map(student => { const count = followUps.filter(item => item.studentId === student.id && item.status !== 'complete').length; const destination = `/students/${student.id}`; return <Link to={destination} className="student-mobile-card" key={student.id}><div className="mobile-card-head"><div><strong>{student.name}</strong><span>{student.studentNo}</span></div><StatusBadge status={student.status} /></div><p>{student.department} · {student.grade}</p><div className="tag-row">{student.interests.slice(0, 2).map(interest => <span className="tag" key={interest}>{interest}</span>)}</div><div className="mobile-card-foot"><span>최근 상담 {formatShortDate(student.lastConsultation)}</span><b>{count ? `미완료 할 일 ${count}건` : '미완료 할 일 없음'}</b></div></Link>; })}</div></> : <EmptyState title="검색 결과가 없습니다" description="검색어나 필터를 바꾸어 다시 찾아보세요." action={<button className="button secondary" onClick={resetFilters}>전체 학생 보기</button>} />}
    </section>}

    {showAddStudent && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeStudentForm()}>
      <section className="modal student-add-modal" role="dialog" aria-modal="true" aria-labelledby="student-add-title" aria-describedby="student-add-description">
        <button type="button" className="modal-close" aria-label="학생 추가 창 닫기" disabled={savingStudent} onClick={closeStudentForm}><Icon name="close" size={19} /></button>
        <h2 id="student-add-title">학생 추가</h2>
        <p id="student-add-description" className="student-add-description">상담에 필요한 최소 정보만 등록합니다. 상담 일정은 학생을 추가한 뒤 별도로 지정할 수 있습니다.</p>
        <form onSubmit={addStudent}>
          <div className="student-add-form-scroll">
            <fieldset className="student-add-section">
              <legend>기본 정보</legend>
              <div className="form-row">
                <label>이름 <span aria-hidden="true">*</span><input autoFocus autoComplete="name" maxLength="80" value={studentForm.name} onChange={event => updateStudentForm('name', event.target.value)} placeholder="학생 이름" required /></label>
                <label>학번 <span aria-hidden="true">*</span><input inputMode="numeric" pattern="[0-9]{7}" autoComplete="off" maxLength="7" value={studentForm.studentNo} onChange={event => updateStudentForm('studentNo', event.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="2026123" required /></label>
              </div>
              <div className="form-row">
                <label>학과 <span aria-hidden="true">*</span><input maxLength="100" value={studentForm.department} onChange={event => updateStudentForm('department', event.target.value)} placeholder="예: 컴퓨터공학과" required /></label>
                <label>학년 <span aria-hidden="true">*</span><select value={studentForm.grade} onChange={event => updateStudentForm('grade', event.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(item => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>연락처 <small>선택 · 민감정보로 분리 보관</small><input type="tel" inputMode="tel" autoComplete="tel" maxLength="40" value={studentForm.phone} onChange={event => updateStudentForm('phone', event.target.value)} placeholder="010-0000-0000" /></label>
            </fieldset>
            <fieldset className="student-add-section">
              <legend>상담 시작 정보</legend>
              <label>관심 분야 <small>선택 · 쉼표로 구분</small><input maxLength="500" value={studentForm.interests} onChange={event => updateStudentForm('interests', event.target.value)} placeholder="서비스 기획, 데이터 분석" /></label>
              <label>진로 목표 <small>선택</small><input maxLength="1000" value={studentForm.goal} onChange={event => updateStudentForm('goal', event.target.value)} placeholder="희망 직무나 목표를 입력하세요" /></label>
              <label>현재 고민 <small>선택</small><textarea rows="3" maxLength="5000" value={studentForm.concern} onChange={event => updateStudentForm('concern', event.target.value)} placeholder="첫 상담에서 확인할 고민이나 요청을 입력하세요" /></label>
            </fieldset>
            <div className="student-add-privacy-note"><Icon name="shield" size={17} /><p><strong>연락처 보호</strong><span>연락처 원문만 일반 상담 데이터와 분리해 저장하며, 열람 시 PIN 인증과 접근 기록이 적용됩니다. 학번은 업무 화면에 전체 공개됩니다.</span></p></div>
            {studentFormError && <p className="field-error" role="alert">{studentFormError}</p>}
          </div>
          <div className="modal-actions"><button type="button" className="button secondary" disabled={savingStudent} onClick={closeStudentForm}>취소</button><button className="button primary" disabled={savingStudent}>{savingStudent ? '추가 중...' : '학생 추가'}</button></div>
        </form>
      </section>
    </div>}
  </>;
}
