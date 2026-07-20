import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { Avatar, EmptyState, PageIntro, SectionHeader, StatusBadge } from '../components/UI';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { students, consultations, followUps } = useApp();
  const scheduled = students.filter(s => s.appointment);
  const pending = followUps.filter(f => f.status !== 'complete');
  const overdue = pending.filter(f => f.status === 'overdue');
  const studentById = id => students.find(s => s.id === id);
  return <>
    <PageIntro eyebrow="7월 20일 월요일" title="좋은 아침이에요, 박지현 상담사님!" description="오늘 상담과 놓치기 쉬운 후속 조치를 먼저 모아봤어요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} />
    <section className="summary-grid" aria-label="오늘의 상담 요약">
      <article className="summary-card blue"><span className="summary-icon"><Icon name="calendar" /></span><div><small>오늘 상담 예정</small><strong>{scheduled.length}<em>명</em></strong><p><b>다음</b> 오전 10:00 김하늘</p></div></article>
      <article className="summary-card purple"><span className="summary-icon"><Icon name="note" /></span><div><small>기록 작성 필요</small><strong>1<em>건</em></strong><p>오늘 안에 기록해 주세요</p></div></article>
      <article className="summary-card green"><span className="summary-icon"><Icon name="check" /></span><div><small>미완료 후속 조치</small><strong>{pending.length}<em>건</em></strong><p>학생 {pending.filter(f => f.owner === '학생').length} · 교직원 {pending.filter(f => f.owner === '교직원').length}</p></div></article>
      <article className="summary-card red"><span className="summary-icon"><Icon name="alert" /></span><div><small>기한 초과</small><strong>{overdue.length}<em>건</em></strong><p>확인이 필요한 항목이에요</p></div></article>
    </section>
    <div className="dashboard-grid">
      <section className="card span-2"><SectionHeader eyebrow="오늘의 일정" title="오늘 상담 예정 학생" description="상담 전 이전 기록과 후속 조치를 확인해 보세요." action={<Link to="/students">전체 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="schedule-list">{scheduled.map((student, i) => { const count = pending.filter(f => f.studentId === student.id).length; return <Link className="schedule-item" to={`/students/${student.id}`} key={student.id}><div className="schedule-time"><strong>{student.appointment}</strong><span>{i < 2 ? '오전' : '오후'}</span></div><Avatar student={student} /><div className="schedule-info"><div><strong>{student.name}</strong><span>{student.department} · {student.grade}</span></div><p>{student.concern}</p><div className="item-meta"><StatusBadge status={student.status} />{count > 0 && <span className="follow-count"><Icon name="alert" size={14} /> 미완료 {count}건</span>}</div></div><Icon name="chevron" className="row-arrow" /></Link>; })}</div>
      </section>
      <section className="card"><SectionHeader eyebrow="우선 확인" title="확인이 필요한 후속 조치" action={<Link to="/follow-ups">전체 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="compact-tasks">{overdue.map(item => { const student = studentById(item.studentId); return <article key={item.id}><span className="warning-dot"><Icon name="alert" size={16} /></span><div><strong>{item.content}</strong><p>{student?.name} · {item.owner} 담당</p><small>{item.dueDate}까지 <b>기한 초과</b></small></div></article>; })}{overdue.length === 0 && <EmptyState title="확인할 항목이 없어요" />}</div>
      </section>
      <section className="card span-2"><SectionHeader eyebrow="최근 활동" title="최근 상담 기록" action={<Link to="/consultations">전체 보기 <Icon name="chevron" size={16} /></Link>} />
        <div className="recent-list">{consultations.slice(-3).reverse().map(c => { const student = studentById(c.studentId); return <Link to={`/students/${c.studentId}`} key={c.id}><Avatar student={student} size="small" /><div><strong>{student?.name}</strong><p>{c.purpose} · {c.summary}</p></div><time>{c.date.slice(5).replace('-', '.')}</time></Link>; })}</div>
      </section>
      <section className="card quick-search"><SectionHeader eyebrow="빠른 이동" title="학생 빠른 검색" /><label><span className="sr-only">학생 검색</span><Icon name="search" size={18} /><input placeholder="이름 또는 학번 입력" onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) navigate(`/students?q=${encodeURIComponent(e.currentTarget.value.trim())}`); }} /></label><div className="quick-students">{students.slice(0, 3).map(s => <Link key={s.id} to={`/students/${s.id}`}><Avatar student={s} size="small" /><span><strong>{s.name}</strong><small>{s.department}</small></span><Icon name="chevron" size={16} /></Link>)}</div></section>
    </div>
  </>;
}
