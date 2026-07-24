import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, SectionHeader, StatusBadge } from '../components/UI';
import { formatKoreanDate, getDayPeriod, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { students, consultations, followUps, appointments } = useApp();
  const { profile, user } = useAuth();
  const counselorName = (profile?.displayName || user?.displayName || '상담 담당자').replace(/\s*상담사$/, '');
  const today = new Date();
  const todayKey = toDateKey(today);
  const scheduled = appointments.filter(item => item.date === todayKey && ['confirmed', 'scheduled'].includes(item.status)).sort((a, b) => a.time.localeCompare(b.time));
  const writing = students.filter(s => s.status === 'writing');
  const pending = followUps.filter(f => f.status !== 'complete');
  const overdue = pending.filter(f => f.status === 'overdue');
  const studentById = id => students.find(s => s.id === id);
  return <>
    <section className="dashboard-masthead">
      <PageIntro eyebrow={formatKoreanDate(today)} title={`좋은 아침이에요, ${counselorName} 상담사님!`} description="오늘 상담과 놓치기 쉬운 할 일을 먼저 모아봤어요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} />
      <Link className={`priority-brief ${overdue.length ? 'urgent' : 'clear'}`} to={overdue.length ? '/follow-ups' : '/appointments'}>
        <span className="priority-brief-icon"><Icon name={overdue.length ? 'alert' : 'check'} size={19} /></span>
        <div><small>오늘의 우선순위</small><strong>{overdue.length ? `기한이 지난 할 일 ${overdue.length}건을 먼저 확인해 주세요.` : '기한을 넘긴 업무가 없습니다. 오늘 일정을 준비해 보세요.'}</strong></div>
        <span className="priority-brief-action">{overdue.length ? '지금 확인' : '일정 보기'}<Icon name="arrow" size={16} /></span>
      </Link>
    </section>
    <section className="summary-grid" aria-label="오늘의 상담 요약">
      <Link className="summary-card blue" to="/appointments" aria-label={`오늘 상담 예정 ${scheduled.length}명 확인`}><span className="summary-icon"><Icon name="calendar" /></span><div><small>오늘 상담 예정</small><strong>{scheduled.length}<em>명</em></strong><p>{scheduled[0] ? <><b>다음</b> {getDayPeriod(scheduled[0].time)} {scheduled[0].time} {studentById(scheduled[0].studentId)?.name}</> : '예정된 상담이 없습니다'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
      <Link className="summary-card purple" to="/students?select=consultation" aria-label={`기록 작성 필요 ${writing.length}건 확인`}><span className="summary-icon"><Icon name="note" /></span><div><small>기록 작성 필요</small><strong>{writing.length}<em>건</em></strong><p>{writing.length ? '오늘 안에 기록해 주세요' : '밀린 기록이 없습니다'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
      <Link className="summary-card green" to="/follow-ups" aria-label={`미완료 할 일 ${pending.length}건 확인`}><span className="summary-icon"><Icon name="check" /></span><div><small>미완료 할 일</small><strong>{pending.length}<em>건</em></strong><p>학생 {pending.filter(f => f.owner === '학생').length} · 상담사 {pending.filter(f => f.owner === '교직원').length}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
      <Link className="summary-card red" to="/follow-ups" aria-label={`기한 초과 ${overdue.length}건 확인`}><span className="summary-icon"><Icon name="alert" /></span><div><small>기한 초과</small><strong>{overdue.length}<em>건</em></strong><p>{overdue.length ? '우선 확인이 필요해요' : '기한을 넘긴 항목이 없습니다'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
    </section>
    <div className="dashboard-grid">
      <section className="card span-2"><SectionHeader eyebrow="오늘의 일정" title="오늘 상담 예정 학생" description="상담 전 이전 기록과 할 일을 확인해 보세요." action={<Link to="/appointments">전체 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="schedule-list">{scheduled.map(appointment => { const student = studentById(appointment.studentId); const count = pending.filter(f => f.studentId === appointment.studentId).length; return <Link className="schedule-item" to={`/students/${appointment.studentId}`} key={appointment.id}><div className="schedule-time"><strong>{appointment.time}</strong><span>{getDayPeriod(appointment.time)}</span></div><div className="schedule-info"><div><strong>{student?.name || '학생'}</strong><span>{student?.department} · {student?.grade}</span></div><p>{appointment.type} · {appointment.location}</p><div className="item-meta"><StatusBadge status="scheduled" />{count > 0 && <span className="follow-count"><Icon name="alert" size={14} /> 미완료 {count}건</span>}</div></div><Icon name="chevron" className="row-arrow" /></Link>; })}{scheduled.length === 0 && <EmptyState icon="calendar" title="오늘 예정된 상담이 없습니다" />}</div>
      </section>
      <section className="card"><SectionHeader eyebrow="우선 확인" title="확인이 필요한 할 일" action={<Link to="/follow-ups">전체 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="compact-tasks">{overdue.map(item => { const student = studentById(item.studentId); return <article key={item.id}><span className="warning-dot"><Icon name="alert" size={16} /></span><div><strong>{item.content}</strong><p>{student?.name} · {item.owner === '교직원' ? '상담사' : item.owner} 담당</p><small>{item.dueDate}까지 <b>기한 초과</b></small></div></article>; })}{overdue.length === 0 && <EmptyState title="확인할 항목이 없어요" />}</div>
      </section>
      <section className="card span-2"><SectionHeader eyebrow="최근 활동" title="최근 상담 기록" action={<Link to="/students">학생별 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="recent-list">{[...consultations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(c => { const student = studentById(c.studentId); return <Link to={`/students/${c.studentId}?consultation=${c.id}`} key={c.id}><div><strong>{student?.name}</strong><p>{c.purpose} · {c.summary}</p></div><time>{c.date.slice(5).replace('-', '.')}</time></Link>; })}</div>
      </section>
      <section className="card quick-search"><SectionHeader eyebrow="빠른 이동" title="학생 빠른 검색" /><label><span className="sr-only">학생 검색</span><Icon name="search" size={18} /><input placeholder="이름 또는 학번 입력" onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) navigate(`/students?q=${encodeURIComponent(e.currentTarget.value.trim())}`); }} /></label><div className="quick-students">{students.slice(0, 3).map(s => <Link key={s.id} to={`/students/${s.id}`}><span><strong>{s.name}</strong><small>{s.department}</small></span><Icon name="chevron" size={16} /></Link>)}</div></section>
    </div>
  </>;
}
