import { useApp } from '../App';
import { programs } from '../data/programs';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { getAppointmentDateParts, getDayPeriod, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';

export default function StudentMyPage() {
  const { students, consultations, followUps, appointments, setFollowUps, persistDocument, notify } = useApp();
  const { user, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;
  const visibleConsultations = consultations.filter(c => c.studentId === student.id && c.studentVisible !== false).sort((a,b) => b.date.localeCompare(a.date));
  const latest = visibleConsultations[0];
  const tasks = followUps.filter(f => f.studentId === student.id);
  const nextAppointment = appointments.filter(item => item.studentId === student.id && item.status === 'scheduled' && item.date >= toDateKey()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;
  const complete = async id => {
    const current = followUps.find(f => f.id === id);
    if (!current) return;
    const updated = { ...current, status: 'complete', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await persistDocument('followUps', updated);
      setFollowUps(items => items.map(followUp => followUp.id === id ? updated : followUp));
      notify('내 다음 행동을 완료 처리했습니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };
  return <div className="student-portal"><header><div className="brand"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></div><div><button className="icon-button" aria-label="알림"><Icon name="bell" /></button><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header><main>
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p></div><div className="journey-progress"><div><strong>이번 주 진행률</strong><span>{tasks.filter(t => t.status === 'complete').length}/{tasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${tasks.length ? tasks.filter(t => t.status === 'complete').length / tasks.length * 100 : 0}%` }} /></div><p>한 걸음씩 충분히 잘하고 있어요!</p></div></section>
    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><button onClick={() => notify('상담 일정 상세를 확인했습니다.')}>일정 자세히 보기 <Icon name="arrow" size={17} /></button></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>새 일정이 등록되면 이곳에서 확인할 수 있어요.</p></section>}<section className="card recent-summary"><span className="eyebrow">최근 공개 상담 요약</span>{latest ? <><h2>{latest.purpose}</h2><p>{latest.summary}</p><div><span>다음 확인</span><strong>{latest.nextCheckItems}</strong></div><small>상담일 {latest.date} · {latest.counselor || student.counselor} 상담사</small></> : <EmptyState title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." />}</section></div>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">나의 다음 행동</span><h2>이번 상담 후 해야 할 일</h2><p>완료한 항목은 직접 체크할 수 있어요.</p></div></div><div className="student-task-grid">{tasks.filter(t => t.owner === '학생' && t.status !== 'complete').map(t => <article className="student-task-card" key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)}><span /></button><div><StatusBadge status={t.status} context="followUp" /><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지</p></div></article>)}</div>{!tasks.some(t => t.owner === '학생' && t.status !== 'complete') && <EmptyState title="남은 후속 조치가 없습니다" description="새로운 다음 행동이 등록되면 이곳에서 확인할 수 있어요." />}</section>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">상담사 추천</span><h2>나에게 추천된 프로그램</h2><p>신청 전 상세 일정과 자격을 꼭 확인하세요.</p></div></div><div className="student-programs">{programs.slice(0,2).map(p => <article className="card" key={p.id}><span className="tag">{p.type}</span><h3>{p.name}</h3><p>{p.reason}</p><div><span><Icon name="calendar" size={15} />모집 {p.recruit}</span><b>{p.mode}</b></div><button onClick={() => notify(`${p.name} 상세 정보를 확인했습니다.`)}>상세 정보 보기 <Icon name="arrow" size={16} /></button></article>)}</div></section>
  </main><footer>커리어핏 · 학생 상담 지원 서비스 <span>문의 대학일자리플러스센터</span></footer></div>;
}
