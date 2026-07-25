import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, SectionHeader, StatusBadge } from '../components/UI';
import { getDayPeriod, toDateKey } from '../utils/date';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { students, consultations, followUps, appointments } = useApp();
  const today = new Date();
  const todayKey = toDateKey(today);
  const scheduled = appointments.filter(item => item.date === todayKey && ['confirmed', 'scheduled'].includes(item.status)).sort((a, b) => a.time.localeCompare(b.time));
  const preparing = appointments.filter(item => item.date >= todayKey && ['confirmed', 'scheduled'].includes(item.status));
  const writing = students.filter(s => ['inProgress', 'writing'].includes(s.status));
  const pending = followUps.filter(f => f.status !== 'complete');
  const overdue = pending.filter(f => f.status === 'overdue');
  const studentById = id => students.find(s => s.id === id);
  return <>
    <section className="dashboard-workflow" aria-labelledby="dashboard-workflow-title">
      <header><div><h1 id="dashboard-workflow-title">오늘의 상담 업무 흐름</h1><p>학생이 있는 단계부터 확인하면 다음 행동이 자연스럽게 이어집니다.</p></div><Link to="/consultations">상담 관리 전체 보기<Icon name="arrow" size={16} /></Link></header>
      <div className="summary-grid workflow-summary-grid">
        <Link className="summary-card blue" to="/appointments" aria-label={`1단계 상담 일정, 오늘 예정 ${scheduled.length}명 확인`}><span className="workflow-step-number">01</span><span className="summary-icon"><Icon name="calendar" /></span><div><small>상담 일정</small><strong>{scheduled.length}<em>명</em></strong><p>{scheduled[0] ? <><b>다음</b> {getDayPeriod(scheduled[0].time)} {scheduled[0].time} {studentById(scheduled[0].studentId)?.name}</> : '오늘 예정된 상담이 없습니다'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
        <Link className="summary-card blue" to="/consultation-prep" aria-label={`2단계 상담 전 준비, ${preparing.length}명 확인`}><span className="workflow-step-number">02</span><span className="summary-icon"><Icon name="list" /></span><div><small>상담 전 준비</small><strong>{preparing.length}<em>명</em></strong><p>학생 맥락과 확인 질문 준비</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
        <Link className="summary-card purple" to="/consultation-write" aria-label={`3단계 상담 기록 작성, ${writing.length}건 확인`}><span className="workflow-step-number">03</span><span className="summary-icon"><Icon name="note" /></span><div><small>상담 기록 작성</small><strong>{writing.length}<em>건</em></strong><p>{writing.length ? '진행 중·기록 필요 학생 확인' : '밀린 기록이 없습니다'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
        <Link className={`summary-card ${overdue.length ? 'red' : 'green'}`} to="/follow-ups" aria-label={`4단계 상담 후 할 일, 미완료 ${pending.length}건 확인`}><span className="workflow-step-number">04</span><span className="summary-icon"><Icon name={overdue.length ? 'alert' : 'check'} /></span><div><small>상담 후 할 일</small><strong>{pending.length}<em>건</em></strong><p>{overdue.length ? `기한 초과 ${overdue.length}건 우선 확인` : '학생과 상담사의 다음 행동'}</p></div><Icon name="arrow" className="summary-arrow" size={17} /></Link>
      </div>
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
