import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { Avatar, EmptyState, PageIntro, StatusBadge } from '../components/UI';

export default function StudentsPage() {
  const { students, followUps } = useApp();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState('all');
  const [hasTask, setHasTask] = useState('all');
  const filtered = useMemo(() => students.filter(s => {
    const q = query.toLowerCase();
    const pendingCount = followUps.filter(f => f.studentId === s.id && f.status !== 'complete').length;
    return (!q || [s.name, s.studentNo, s.department].some(v => v.toLowerCase().includes(q))) && (grade === 'all' || s.grade === grade) && (status === 'all' || s.status === status) && (hasTask === 'all' || (hasTask === 'yes' ? pendingCount > 0 : pendingCount === 0));
  }), [students, followUps, query, grade, status, hasTask]);

  return <>
    <PageIntro eyebrow="학생 관리" title="학생을 한눈에 확인하세요" description={`상담 중인 학생 ${students.length}명의 기록과 다음 행동을 관리합니다.`} action={<Link to="/students/s1/consultation/new" className="button primary"><Icon name="plus" size={18} />새 상담 기록</Link>} />
    <section className="filter-card" aria-label="학생 검색 및 필터">
      <label className="search-field"><span className="sr-only">학생 검색</span><Icon name="search" size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름, 학번, 학과로 검색" /></label>
      <label><span>학년</span><select value={grade} onChange={e => setGrade(e.target.value)}><option value="all">전체 학년</option><option>1학년</option><option>2학년</option><option>3학년</option><option>4학년</option></select></label>
      <label><span>상담 상태</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">전체 상태</option><option value="scheduled">상담 예정</option><option value="inProgress">상담 진행 중</option><option value="writing">기록 작성 필요</option><option value="complete">완료</option></select></label>
      <label><span>후속 조치</span><select value={hasTask} onChange={e => setHasTask(e.target.value)}><option value="all">전체</option><option value="yes">미완료 있음</option><option value="no">미완료 없음</option></select></label>
    </section>
    <section className="card student-list-card" aria-labelledby="student-list-title">
      <div className="list-toolbar"><div><h2 id="student-list-title">전체 학생 <span>{filtered.length}</span></h2><p>최근 상담일 순으로 표시됩니다.</p></div><button className="text-button" onClick={() => { setQuery(''); setGrade('all'); setStatus('all'); setHasTask('all'); }}>필터 초기화</button></div>
      {filtered.length ? <><div className="table-wrap"><table className="student-table"><thead><tr><th>학생</th><th>학번</th><th>학과 / 학년</th><th>관심 분야</th><th>최근 상담일</th><th>후속 조치</th><th>상태</th><th><span className="sr-only">상세</span></th></tr></thead><tbody>{filtered.map(s => { const count = followUps.filter(f => f.studentId === s.id && f.status !== 'complete').length; return <tr key={s.id}><td><Link className="student-cell" to={`/students/${s.id}`}><Avatar student={s} size="small" /><strong>{s.name}</strong></Link></td><td>{s.studentNo}</td><td><strong>{s.department}</strong><small>{s.grade}</small></td><td><div className="tag-row">{s.interests.slice(0, 2).map(x => <span className="tag" key={x}>{x}</span>)}</div></td><td>{s.lastConsultation}</td><td>{count ? <b className="count-emphasis">{count}건</b> : <span className="muted">없음</span>}</td><td><StatusBadge status={s.status} /></td><td><Link className="row-link" aria-label={`${s.name} 상세 보기`} to={`/students/${s.id}`}><Icon name="chevron" size={18} /></Link></td></tr>; })}</tbody></table></div>
      <div className="student-card-list">{filtered.map(s => { const count = followUps.filter(f => f.studentId === s.id && f.status !== 'complete').length; return <Link to={`/students/${s.id}`} className="student-mobile-card" key={s.id}><div className="mobile-card-head"><Avatar student={s} /><div><strong>{s.name}</strong><span>{s.studentNo}</span></div><StatusBadge status={s.status} /></div><p>{s.department} · {s.grade}</p><div className="tag-row">{s.interests.slice(0, 2).map(x => <span className="tag" key={x}>{x}</span>)}</div><div className="mobile-card-foot"><span>최근 상담 {s.lastConsultation}</span><b>{count ? `후속 조치 ${count}건` : '후속 조치 없음'}</b></div></Link>; })}</div></> : <EmptyState title="검색 결과가 없습니다" description="검색어나 필터를 바꾸어 다시 찾아보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setGrade('all'); setStatus('all'); setHasTask('all'); }}>전체 학생 보기</button>} />}
    </section>
  </>;
}
