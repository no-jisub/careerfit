import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { programs } from '../data/programs';
import Icon from '../components/Icon';
import { PageIntro } from '../components/UI';

export default function ProgramsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { students, draftForm, setDraftForm, notify } = useApp();
  const studentId = params.get('student') || 's1';
  const student = students.find(s => s.id === studentId) || students[0];
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('전체');
  const [selected, setSelected] = useState(() => draftForm?.form?.programs || []);
  const recommended = useMemo(() => programs.filter(p => (p.grades.includes(student.grade) || p.target.includes('전 학과')) && (!query || p.name.includes(query) || p.tags.some(t => t.includes(query))) && (mode === '전체' || p.mode === mode)).sort((a, b) => b.score - a.score), [student, query, mode]);
  const toggle = p => { setSelected(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name]); };
  const apply = () => { if (!selected.length) return; if (draftForm?.studentId === student.id) setDraftForm({ ...draftForm, form: { ...draftForm.form, programs: selected } }); notify('비교과 프로그램을 상담 기록에 추가했습니다.'); navigate(params.get('return') === 'form' ? `/students/${student.id}/consultation/new` : `/students/${student.id}`); };
  return <>
    <PageIntro eyebrow="상담 보조 기능" title={`${student.name} 학생에게 맞는 프로그램`} description="학생 정보와 상담 목적을 바탕으로 참여 가능한 프로그램을 추천했어요." action={params.get('return') === 'form' && <Link className="button secondary" to={`/students/${student.id}/consultation/new`}>상담 기록으로 돌아가기</Link>} />
    <section className="recommend-context card"><div className="recommend-student"><span className="avatar">{student.name.slice(1,3)}</span><div><strong>{student.name}</strong><p>{student.department} · {student.grade}</p></div></div><div className="context-tags"><span>관심 분야</span>{student.interests.map(x => <b key={x}>{x}</b>)}</div><div className="context-goal"><span>진로 목표</span><strong>{student.goal}</strong></div><button className="text-button" onClick={() => notify('추천 조건을 학생 정보에서 불러왔습니다.')}>조건 다시 불러오기</button></section>
    <div className="recommend-toolbar"><div><strong>추천 프로그램 <em>{Math.min(recommended.length, 3)}</em></strong><p>신청 자격을 충족하고 관심 분야가 많이 일치하는 순서예요.</p></div><div><label className="search-field"><span className="sr-only">프로그램 검색</span><Icon name="search" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="프로그램 검색" /></label><select aria-label="운영 방식" value={mode} onChange={e => setMode(e.target.value)}><option>전체</option><option>온라인</option><option>오프라인</option><option>혼합</option></select></div></div>
    <div className="program-grid">{recommended.slice(0, 3).map((p, index) => <article className={`program-card card ${selected.includes(p.name) ? 'selected' : ''}`} key={p.id}><div className="program-card-top"><span className={`match match-${index}`}>{p.score}% 적합</span><button className="select-program" aria-pressed={selected.includes(p.name)} onClick={() => toggle(p)}><Icon name={selected.includes(p.name) ? 'check' : 'plus'} size={15} />{selected.includes(p.name) ? '선택됨' : '선택'}</button></div><span className="eyebrow">{p.type}</span><h2>{p.name}</h2><p className="recommend-reason"><Icon name="spark" size={17} /><span><b>이런 점이 잘 맞아요</b>{p.reason}</span></p><div className="program-tags">{p.tags.map(t => <span key={t}>{t}</span>)}</div><dl className="program-info"><div><dt>신청 대상</dt><dd>{p.target}</dd></div><div><dt>모집 기간</dt><dd>{p.recruit}</dd></div><div><dt>운영 기간</dt><dd>{p.period}</dd></div><div><dt>일정</dt><dd>{p.schedule}</dd></div><div><dt>운영 방식</dt><dd>{p.mode}</dd></div><div><dt>담당 부서</dt><dd>{p.department}</dd></div></dl><div className="program-footer"><small>정보 수정 {p.updated}</small><button onClick={() => notify(`${p.name} 상세 정보를 확인했습니다.`)}>상세 정보 <Icon name="chevron" size={15} /></button></div></article>)}</div>
    {recommended.length === 0 && <div className="card empty-state"><strong>조건에 맞는 비교과 프로그램을 찾지 못했습니다.</strong><p>검색어나 참여 조건을 바꾸어 다시 찾아보세요.</p></div>}
    <p className="recommend-disclaimer"><Icon name="alert" size={16} />추천 적합도는 학생 정보와 프로그램 태그를 비교한 참고 정보이며, 최종 안내 여부는 상담 담당자가 결정합니다.</p>
    {selected.length > 0 && <div className="selection-bar"><div><span>{selected.length}개 선택</span><strong>{selected.join(', ')}</strong></div><button className="button primary" onClick={apply}>상담 기록에 추가 <Icon name="arrow" size={17} /></button></div>}
  </>;
}
