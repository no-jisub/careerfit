import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusBadge, StatusTabs } from '../components/UI';
import { maskStudentNo } from '../utils/sensitiveData';
import { toDateKey } from '../utils/date';

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
    queueDescription: '상담 시간 순으로 확인하고, 브리핑에서 이전 기록과 주의사항을 점검하세요.',
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
    queueDescription: '진행 중 상담을 먼저 기록하고, 메모가 남은 상담일지를 이어서 마무리하세요.',
    actionLabel: '상담 기록 작성',
    actionIcon: 'note',
    emptyTitle: '작성할 상담 기록이 없습니다',
    emptyDescription: '상담이 시작되거나 기록 필요 상태가 되면 이 목록에 표시됩니다.',
    getDestination: student => `/students/${student.id}/consultation/new`,
    getAriaLabel: student => `${student.name} 상담 기록 작성`,
  },
};

const activeAppointmentStatuses = ['pending', 'confirmed', 'scheduled'];

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
      <div><h2>{student.name}</h2><p>{maskStudentNo(student.studentNo)} · {student.department} · {student.grade}</p></div>
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
  const { students, followUps, appointments } = useApp();
  const [params] = useSearchParams();
  const legacySelectionMode = params.get('select') === 'consultation' ? 'consultation' : '';
  const activeSelectionMode = selectionMode || legacySelectionMode;
  const selectionMeta = selectionModeMeta[activeSelectionMode];
  const [query, setQuery] = useState(params.get('q') || '');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState('all');
  const today = toDateKey();

  useEffect(() => {
    setStatus('all');
    setGrade('all');
  }, [activeSelectionMode]);

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
  const todayPreparationCount = activeSelectionMode === 'preparation'
    ? eligibleStudents.filter(student => getUpcomingAppointment(student, appointments, today)?.date === today).length
    : 0;
  const preparationPendingTaskCount = activeSelectionMode === 'preparation'
    ? followUps.filter(item => eligibleStudents.some(student => student.id === item.studentId) && item.status !== 'complete').length
    : 0;

  const resetFilters = () => {
    setQuery('');
    setGrade('all');
    setStatus('all');
  };

  const pageAction = selectionMeta
    ? activeSelectionMode === 'preparation'
      ? <Link to="/appointments" className="button secondary"><Icon name="calendar" size={17} />상담 일정 보기</Link>
      : <Link to="/students" className="button secondary"><Icon name="students" size={17} />전체 학생 보기</Link>
    : <Link to="/consultation-write" className="button primary"><Icon name="plus" size={18} />새 상담 기록</Link>;

  return <>
    <PageIntro icon={selectionMeta?.icon || 'students'} eyebrow={selectionMeta?.eyebrow || '학생 관리'} title={selectionMeta?.title || '학생을 한눈에 확인하세요'} description={selectionMeta?.description || `상담 중인 학생 ${students.length}명의 기록과 다음 행동을 관리합니다.`} action={pageAction} />

    {selectionMeta && (activeSelectionMode === 'preparation' ? <section className="workflow-queue-metrics" aria-label="상담 전 준비 현황">
      <div className="workflow-queue-metric">
        <span className="workflow-queue-metric-icon" aria-hidden="true"><Icon name="students" size={20} /></span>
        <div><span>준비 대상</span><strong>{eligibleStudents.length}<small>명</small></strong></div>
      </div>
      <div className="workflow-queue-metric">
        <span className="workflow-queue-metric-icon" aria-hidden="true"><Icon name="calendar" size={20} /></span>
        <div><span>오늘 상담</span><strong>{todayPreparationCount}<small>명</small></strong></div>
      </div>
      <div className="workflow-queue-metric">
        <span className="workflow-queue-metric-icon" aria-hidden="true"><Icon name="check" size={20} /></span>
        <div><span>확인할 할 일</span><strong>{preparationPendingTaskCount}<small>건</small></strong></div>
      </div>
    </section> : <section className="workflow-queue-overview" aria-label={`${selectionMeta.eyebrow} 현황`}>
      <div><span className="workflow-queue-icon"><Icon name={selectionMeta.icon} size={21} /></span><div><span className="eyebrow">{selectionMeta.queueEyebrow}</span><h2>{selectionMeta.queueTitle}</h2><p>{selectionMeta.queueDescription}</p></div></div>
      <dl>
        <div><dt>작성 대상</dt><dd>{eligibleStudents.length}<small>명</small></dd></div>
        <div><dt>상담 진행 중</dt><dd>{statusCounts.inProgress || 0}<small>명</small></dd></div>
        <div><dt>기록 필요</dt><dd>{statusCounts.writing || 0}<small>명</small></dd></div>
      </dl>
    </section>)}

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
      {filtered.length ? <><div className="table-wrap"><table className="student-table"><thead><tr><th>학생</th><th>학번</th><th>학과 / 학년</th><th>관심 분야</th><th>최근 상담일</th><th>미완료 할 일</th><th>상태</th><th><span className="sr-only">상세</span></th></tr></thead><tbody>{filtered.map(student => { const count = followUps.filter(item => item.studentId === student.id && item.status !== 'complete').length; const destination = `/students/${student.id}`; return <tr key={student.id}><td><Link className="student-cell" to={destination}><strong>{student.name}</strong></Link></td><td className="masked-identifier">{maskStudentNo(student.studentNo)}</td><td><strong>{student.department}</strong><small>{student.grade}</small></td><td><div className="tag-row">{student.interests.slice(0, 2).map(interest => <span className="tag" key={interest}>{interest}</span>)}</div></td><td>{student.lastConsultation}</td><td>{count ? <b className="count-emphasis">{count}건</b> : <span className="muted">없음</span>}</td><td><StatusBadge status={student.status} /></td><td><Link className="row-link" aria-label={`${student.name} 상세 보기`} to={destination}><Icon name="chevron" size={18} /></Link></td></tr>; })}</tbody></table></div>
      <div className="student-card-list">{filtered.map(student => { const count = followUps.filter(item => item.studentId === student.id && item.status !== 'complete').length; const destination = `/students/${student.id}`; return <Link to={destination} className="student-mobile-card" key={student.id}><div className="mobile-card-head"><div><strong>{student.name}</strong><span>{maskStudentNo(student.studentNo)}</span></div><StatusBadge status={student.status} /></div><p>{student.department} · {student.grade}</p><div className="tag-row">{student.interests.slice(0, 2).map(interest => <span className="tag" key={interest}>{interest}</span>)}</div><div className="mobile-card-foot"><span>최근 상담 {student.lastConsultation}</span><b>{count ? `미완료 할 일 ${count}건` : '미완료 할 일 없음'}</b></div></Link>; })}</div></> : <EmptyState title="검색 결과가 없습니다" description="검색어나 필터를 바꾸어 다시 찾아보세요." action={<button className="button secondary" onClick={resetFilters}>전체 학생 보기</button>} />}
    </section>}
  </>;
}
