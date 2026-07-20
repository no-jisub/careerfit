import { useApp } from '../App';
import { programs } from '../data/programs';
import Icon from '../components/Icon';
import { Avatar, StatusBadge } from '../components/UI';

export default function StudentMyPage() {
  const { students, consultations, followUps, setFollowUps, notify } = useApp();
  const student = students[0];
  const latest = consultations.filter(c => c.studentId === student.id).sort((a,b) => b.date.localeCompare(a.date))[0];
  const tasks = followUps.filter(f => f.studentId === student.id);
  const complete = id => { setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'complete' } : f)); notify('내 다음 행동을 완료 처리했습니다.'); };
  const logout = () => {
    localStorage.removeItem('careerfit_role');
    window.location.hash = '/login';
    window.location.reload();
  };
  return <div className="student-portal"><header><div className="brand"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></div><div><button className="icon-button" aria-label="알림"><Icon name="bell" /></button><Avatar student={student} size="small" /><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header><main>
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p></div><div className="journey-progress"><div><strong>이번 주 진행률</strong><span>{tasks.filter(t => t.status === 'complete').length}/{tasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${tasks.length ? tasks.filter(t => t.status === 'complete').length / tasks.length * 100 : 0}%` }} /></div><p>한 걸음씩 충분히 잘하고 있어요!</p></div></section>
    <div className="student-dashboard-grid"><section className="next-appointment"><span className="eyebrow light">다음 상담 일정</span><div><span className="date-block"><strong>03</strong><small>8월 · 월</small></span><div><h2>박지현 상담사와 진로 상담</h2><p><Icon name="clock" size={16} />오전 10:00 · 대학일자리플러스센터 상담실 2</p><span>준비할 내용 · 관심 직무 비교표와 캠프 신청 여부</span></div></div><button onClick={() => notify('상담 일정 상세를 확인했습니다.')}>일정 자세히 보기 <Icon name="arrow" size={17} /></button></section><section className="card recent-summary"><span className="eyebrow">최근 상담 요약</span><h2>{latest?.purpose}</h2><p>{latest?.summary}</p><div><span>다음 확인</span><strong>{latest?.nextCheckItems}</strong></div><small>상담일 {latest?.date} · 박지현 상담사</small></section></div>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">나의 다음 행동</span><h2>이번 상담 후 해야 할 일</h2><p>완료한 항목은 직접 체크할 수 있어요.</p></div></div><div className="student-task-grid">{tasks.filter(t => t.owner === '학생' && t.status !== 'complete').map(t => <article className="student-task-card" key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)}><span /></button><div><StatusBadge status={t.status} /><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지</p></div></article>)}</div></section>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">상담사 추천</span><h2>나에게 추천된 프로그램</h2><p>신청 전 상세 일정과 자격을 꼭 확인하세요.</p></div></div><div className="student-programs">{programs.slice(0,2).map(p => <article className="card" key={p.id}><span className="tag">{p.type}</span><h3>{p.name}</h3><p>{p.reason}</p><div><span><Icon name="calendar" size={15} />모집 {p.recruit}</span><b>{p.mode}</b></div><button onClick={() => notify(`${p.name} 상세 정보를 확인했습니다.`)}>상세 정보 보기 <Icon name="arrow" size={16} /></button></article>)}</div></section>
  </main><footer>커리어핏 · 학생 상담 지원 서비스 <span>문의 대학일자리플러스센터</span></footer></div>;
}
