import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro, StatusBadge, StatusTabs } from '../components/UI';
import { maskStudentNo } from '../utils/sensitiveData';

const studentStatusOptions = [
  { value: 'all', label: '전체', description: '모든 학생', icon: 'layers' },
  { value: 'scheduled', label: '상담 예정', description: '일정 확정', icon: 'calendar' },
  { value: 'inProgress', label: '진행 중', description: '상담 진행', icon: 'clock' },
  { value: 'writing', label: '기록 필요', description: '기록 작성 전', icon: 'note' },
  { value: 'complete', label: '완료', description: '상담 완료', icon: 'check' },
];

export default function StudentsPage() {
  const { students, followUps } = useApp();
  const [params] = useSearchParams();
  const selectingConsultationStudent = params.get('select') === 'consultation';
  const [query, setQuery] = useState(params.get('q') || '');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState('all');
  const statusCounts = students.reduce((counts, student) => {
    counts[student.status] = (counts[student.status] || 0) + 1;
    return counts;
  }, {});
  const filtered = useMemo(() => students.filter(s => {
    const q = query.toLowerCase();
    return (!q || [s.name, s.studentNo, s.department, ...(s.interests || [])].some(v => v.toLowerCase().includes(q)))
      && (grade === 'all' || s.grade === grade)
      && (status === 'all' || s.status === status);
  }), [students, query, grade, status]);
  const activeStatusLabel = studentStatusOptions.find(option => option.value === status)?.label || '전체';

  return <>
    <PageIntro eyebrow="학생 관리" title={selectingConsultationStudent ? '상담할 학생을 선택하세요' : '학생을 한눈에 확인하세요'} description={selectingConsultationStudent ? '학생을 선택하면 바로 상담 기록 작성 화면으로 이동합니다.' : `상담 중인 학생 ${students.length}명의 기록과 다음 행동을 관리합니다.`} action={!selectingConsultationStudent && <Link to="/students?select=consultation" className="button primary"><Icon name="plus" size={18} />새 상담 기록</Link>} />
    <section className="card student-filter-panel" aria-label="학생 검색 및 필터">
      <StatusTabs
        className="student-status-tabs compact-status-tabs"
        label="상담 상태"
        options={studentStatusOptions.map(option => ({ ...option, count: option.value === 'all' ? students.length : statusCounts[option.value] || 0 }))}
        value={status}
        onChange={setStatus}
      />
      <div className="student-filter-tools">
        <label className="search-field"><span className="sr-only">학생 검색</span><Icon name="search" size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름, 학번, 학과로 검색" /></label>
        <select aria-label="학년" value={grade} onChange={e => setGrade(e.target.value)}><option value="all">전체 학년</option><option>1학년</option><option>2학년</option><option>3학년</option><option>4학년</option></select>
      </div>
    </section>
    <section className="card student-list-card" aria-labelledby="student-list-title">
      <div className="list-toolbar"><div><h2 id="student-list-title">{status === 'all' ? '전체 학생' : `${activeStatusLabel} 학생`} <span aria-live="polite">{filtered.length}</span></h2><p>최근 상담일 순으로 표시됩니다.</p></div><button className="text-button" onClick={() => { setQuery(''); setGrade('all'); setStatus('all'); }}>필터 초기화</button></div>
      {filtered.length ? <><div className="table-wrap"><table className="student-table"><thead><tr><th>학생</th><th>학번</th><th>학과 / 학년</th><th>관심 분야</th><th>최근 상담일</th><th>미완료 할 일</th><th>상태</th><th><span className="sr-only">상세</span></th></tr></thead><tbody>{filtered.map(s => { const count = followUps.filter(f => f.studentId === s.id && f.status !== 'complete').length; const destination = selectingConsultationStudent ? `/students/${s.id}/consultation/new` : `/students/${s.id}`; return <tr key={s.id}><td><Link className="student-cell" to={destination}><strong>{s.name}</strong></Link></td><td className="masked-identifier">{maskStudentNo(s.studentNo)}</td><td><strong>{s.department}</strong><small>{s.grade}</small></td><td><div className="tag-row">{s.interests.slice(0, 2).map(x => <span className="tag" key={x}>{x}</span>)}</div></td><td>{s.lastConsultation}</td><td>{count ? <b className="count-emphasis">{count}건</b> : <span className="muted">없음</span>}</td><td><StatusBadge status={s.status} /></td><td><Link className="row-link" aria-label={selectingConsultationStudent ? `${s.name} 상담 기록 작성` : `${s.name} 상세 보기`} to={destination}><Icon name="chevron" size={18} /></Link></td></tr>; })}</tbody></table></div>
      <div className="student-card-list">{filtered.map(s => { const count = followUps.filter(f => f.studentId === s.id && f.status !== 'complete').length; const destination = selectingConsultationStudent ? `/students/${s.id}/consultation/new` : `/students/${s.id}`; return <Link to={destination} className="student-mobile-card" key={s.id}><div className="mobile-card-head"><div><strong>{s.name}</strong><span>{maskStudentNo(s.studentNo)}</span></div><StatusBadge status={s.status} /></div><p>{s.department} · {s.grade}</p><div className="tag-row">{s.interests.slice(0, 2).map(x => <span className="tag" key={x}>{x}</span>)}</div><div className="mobile-card-foot"><span>최근 상담 {s.lastConsultation}</span><b>{count ? `미완료 할 일 ${count}건` : '미완료 할 일 없음'}</b></div></Link>; })}</div></> : <EmptyState title="검색 결과가 없습니다" description="검색어나 필터를 바꾸어 다시 찾아보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setGrade('all'); setStatus('all'); }}>전체 학생 보기</button>} />}
    </section>
  </>;
}
