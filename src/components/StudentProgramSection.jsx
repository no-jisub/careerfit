import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { EmptyState } from './UI';
import Icon from './Icon';
import { recommendPrograms } from '../utils/programRecommendations';
import { isProgramEligibleForStudent, PROGRAM_MODES, PROGRAM_STATUS_LABELS, resolveProgramStatus } from '../utils/programs';

const responseLabels = {
  recommended: '확인 전',
  interested: '관심 있음',
  applied: '신청 완료',
  dismissed: '참여하지 않음',
};

export default function StudentProgramSection({ student, notify }) {
  const { programs, programRecommendations, setProgramRecommendations } = useApp();
  const [showAll, setShowAll] = useState(false);
  const [keyword, setKeyword] = useState('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('전체');
  const [status, setStatus] = useState('all');
  const today = new Date().toISOString().slice(0, 10);
  const availablePrograms = useMemo(() => programs.filter(program => ['scheduled', 'recruiting'].includes(resolveProgramStatus(program, today)) && isProgramEligibleForStudent(program, student)), [programs, student, today]);
  const allDirectRecommendations = programRecommendations.filter(item => item.studentId === student.id);
  const directRecommendations = allDirectRecommendations.filter(item => item.status !== 'dismissed');
  const directProgramIds = new Set(allDirectRecommendations.map(item => item.programId));
  const directPrograms = directRecommendations.map(recommendation => availablePrograms.find(program => program.id === recommendation.programId)).filter(Boolean);
  const profilePrograms = recommendPrograms(availablePrograms.filter(program => !directProgramIds.has(program.id)), student, 3);
  const recommendedPrograms = [...directPrograms, ...profilePrograms].slice(0, 3);
  const recommendedIds = new Set(recommendedPrograms.map(program => program.id));
  const orderedPrograms = [...recommendedPrograms, ...availablePrograms.filter(program => !recommendedIds.has(program.id))];
  const keywords = [...new Set(availablePrograms.flatMap(program => program.tags))];
  const visiblePrograms = showAll ? orderedPrograms.filter(program => {
    const effectiveStatus = resolveProgramStatus(program, today);
    const normalizedQuery = query.trim().toLowerCase();
    return (keyword === 'all' || program.tags.includes(keyword))
      && (mode === '전체' || program.mode === mode)
      && (status === 'all' || effectiveStatus === status)
      && (!normalizedQuery || [program.name, program.department, program.description, ...program.tags].some(value => value?.toLowerCase().includes(normalizedQuery)));
  }) : recommendedPrograms;
  const updateResponse = (recommendation, nextStatus) => {
    setProgramRecommendations(items => items.map(item => item.id === recommendation.id ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() } : item));
    notify(`프로그램 상태를 '${responseLabels[nextStatus]}'으로 변경했습니다.`);
  };
  return <section className={`student-section student-program-section ${showAll ? 'all' : 'recommended'}`}>
    <div className="section-header"><div><span className="eyebrow">비교과 프로그램</span><h2>{showAll ? '전체 비교과 프로그램' : '나에게 추천된 프로그램'}</h2><p>{showAll ? '관심 분야와 모집 상태를 기준으로 프로그램을 찾아보세요.' : '상담사 추천과 내 관심 분야에 맞는 프로그램을 먼저 보여드려요.'}</p></div><button className="button secondary student-program-toggle" onClick={() => { setShowAll(value => !value); setKeyword('all'); setQuery(''); setMode('전체'); setStatus('all'); }}>{showAll ? '맞춤 추천만 보기' : '전체 비교과 프로그램 보기'} <Icon name="arrow" size={16} /></button></div>
    {showAll && <><div className="student-program-filter-row"><label className="search-field"><Icon name="search" size={16} /><span className="sr-only">프로그램 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램명, 태그 검색" /></label><select aria-label="운영 방식" value={mode} onChange={event => setMode(event.target.value)}><option>전체</option>{PROGRAM_MODES.map(item => <option key={item}>{item}</option>)}</select><select aria-label="모집 상태" value={status} onChange={event => setStatus(event.target.value)}><option value="all">전체 모집 상태</option><option value="recruiting">모집 중</option><option value="scheduled">모집 예정</option></select></div><div className="student-program-keywords" aria-label="비교과 프로그램 키워드 필터"><button className={keyword === 'all' ? 'active' : ''} onClick={() => setKeyword('all')}>전체</button>{keywords.map(item => <button key={item} className={keyword === item ? 'active' : ''} onClick={() => setKeyword(item)}>{item}</button>)}</div></>}
    <div className="student-programs">{visiblePrograms.map(program => {
      const directRecommendation = programRecommendations.find(item => item.studentId === student.id && item.programId === program.id);
      const isRecommended = recommendedIds.has(program.id);
      const effectiveStatus = resolveProgramStatus(program, today);
      return <article className={`card student-program-card ${showAll ? 'all-card' : 'recommend-card'} ${isRecommended ? 'recommend-in-all' : ''}`} key={program.id}>
        <div className="student-program-card-top"><span className="tag">{program.type}</span>{directRecommendation ? <strong>상담사 추천</strong> : isRecommended ? <strong>프로필 기반 추천</strong> : <small>{program.department}</small>}</div>
        <h3>{program.name}</h3><p>{directRecommendation?.reason || program.reason}</p>
        <div><span><Icon name="calendar" size={15} />모집 {program.recruit}</span><b>{PROGRAM_STATUS_LABELS[effectiveStatus]}</b></div>
        {directRecommendation && <div className="student-program-response"><span>내 선택 · {responseLabels[directRecommendation.status] || '확인 전'}</span><div><button className={directRecommendation.status === 'interested' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'interested')}>관심 있음</button><button className={directRecommendation.status === 'applied' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'applied')}>신청 완료</button><button className={directRecommendation.status === 'dismissed' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'dismissed')}>참여하지 않음</button></div></div>}
        <button onClick={() => notify(program.applicationUrl ? `${program.name} 신청 링크는 데모 주소입니다.` : `${program.contact || program.department}에 신청 방법을 문의해 주세요.`)}>{program.applicationUrl ? '신청 정보 확인' : '담당 부서 문의'} <Icon name="arrow" size={16} /></button>
      </article>;
    })}</div>
    {!visiblePrograms.length && <EmptyState title="조건에 맞는 프로그램이 없습니다" description="다른 검색어나 필터를 선택해 보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setKeyword('all'); setMode('전체'); setStatus('all'); }}>필터 초기화</button>} />}
  </section>;
}
