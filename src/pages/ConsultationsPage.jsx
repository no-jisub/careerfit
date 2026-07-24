import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, PageIntro } from '../components/UI';

export default function ConsultationsPage() {
  const { consultations, students } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [visibility, setVisibility] = useState('all');
  const types = [...new Set(consultations.map(item => item.type))];
  const filtered = useMemo(() => consultations.filter(item => {
    const student = students.find(candidate => candidate.id === item.studentId);
    const keyword = query.trim().toLowerCase();
    return (!keyword || [student?.name, student?.studentNo, item.purpose, item.summary, item.guidance].some(value => value?.toLowerCase().includes(keyword)))
      && (type === 'all' || item.type === type)
      && (visibility === 'all' || (visibility === 'public' ? item.studentVisible !== false : item.studentVisible === false));
  }).sort((a, b) => b.date.localeCompare(a.date)), [consultations, students, query, type, visibility]);

  return <>
    <PageIntro eyebrow="상담 기록" title="상담의 흐름을 이어가세요" description="AI로 작성한 기록은 근거와 상담사 검토 이력까지 함께 확인할 수 있어요." action={<Link className="button primary" to="/students?select=consultation"><Icon name="plus" size={18} />상담 기록 작성</Link>} />
    <section className="filter-card" aria-label="상담 기록 검색 및 필터"><label className="search-field"><span className="sr-only">상담 기록 검색</span><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="학생, 학번, 상담 내용 검색" /></label><label><span>상담 유형</span><select value={type} onChange={event => setType(event.target.value)}><option value="all">전체 유형</option>{types.map(item => <option key={item}>{item}</option>)}</select></label><label><span>학생 공개</span><select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="all">전체</option><option value="public">공개</option><option value="private">비공개</option></select></label><button className="text-button" onClick={() => { setQuery(''); setType('all'); setVisibility('all'); }}>필터 초기화</button></section>
    <section className="card"><div className="list-toolbar"><div><h2>상담 기록 <span>{filtered.length}</span></h2><p>학생 공개 범위와 AI 근거 검토 여부를 함께 확인하세요.</p></div></div>{filtered.length ? <div className="consultation-index">{filtered.map(consultation => { const student = students.find(item => item.id === consultation.studentId); if (!student) return null; return <Link to={`/students/${student.id}?consultation=${consultation.id}`} key={consultation.id}><time>{consultation.date}</time><div><span className="tag">{consultation.type}</span><span className={`visibility-tag ${consultation.studentVisible === false ? 'private' : ''}`}>{consultation.studentVisible === false ? '학생 비공개' : '학생 공개'}</span>{consultation.aiReview && <span className="ai-reviewed-tag"><Icon name="shield" size={12} />AI 근거 검토 완료</span>}<h2>{student.name} · {consultation.purpose}</h2><p>{consultation.summary}</p></div><Icon name="chevron" /></Link>; })}</div> : <EmptyState title="조건에 맞는 상담 기록이 없습니다" description="검색어나 필터를 바꾸어 보세요." />}</section>
  </>;
}
