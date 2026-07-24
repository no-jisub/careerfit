import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { EmptyState } from './UI';
import Icon from './Icon';
import { recommendPrograms } from '../utils/programRecommendations';
import { isProgramEligibleForStudent, PROGRAM_MODES, PROGRAM_STATUS_LABELS, resolveProgramStatus } from '../utils/programs';
import { buildEventNotification } from '../utils/notifications';
import { useAuth } from '../auth/AuthContext';

const responseLabels = {
  recommended: '확인 전',
  interested: '관심 있음',
  applied: '신청 완료',
  dismissed: '참여하지 않음',
};

const resolveStudentProgramState = (program, today) => {
  const effectiveStatus = resolveProgramStatus(program, today);
  const ongoing = Boolean(program.programStartDate && program.programEndDate && program.programStartDate <= today && program.programEndDate >= today);
  if (effectiveStatus === 'recruiting') return 'recruiting';
  if (ongoing) return 'ongoing';
  return effectiveStatus;
};

export default function StudentProgramSection({ student, notify }) {
  const { user } = useAuth();
  const { programs, programRecommendations, setProgramRecommendations, setNotifications, persistDocument } = useApp();
  const [keyword, setKeyword] = useState('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('전체');
  const [status, setStatus] = useState('all');
  const today = new Date().toISOString().slice(0, 10);
  const recommendablePrograms = useMemo(() => programs.filter(program => {
    const effectiveStatus = resolveProgramStatus(program, today);
    const hasNotEnded = !program.programEndDate || program.programEndDate >= today;
    return ['scheduled', 'recruiting', 'closed'].includes(effectiveStatus) && hasNotEnded && isProgramEligibleForStudent(program, student);
  }), [programs, student, today]);
  const currentPrograms = useMemo(() => programs.filter(program => {
    const state = resolveStudentProgramState(program, today);
    return !program.archived && ['recruiting', 'ongoing'].includes(state);
  }).sort((left, right) => {
    const leftState = resolveStudentProgramState(left, today);
    const rightState = resolveStudentProgramState(right, today);
    if (leftState !== rightState) return leftState === 'recruiting' ? -1 : 1;
    return (left.recruitmentEndDate || left.programEndDate || '').localeCompare(right.recruitmentEndDate || right.programEndDate || '');
  }), [programs, today]);
  const allDirectRecommendations = useMemo(
    () => programRecommendations.filter(item => item.studentId === student.id),
    [programRecommendations, student.id],
  );
  const directRecommendations = allDirectRecommendations.filter(item => item.status !== 'dismissed');
  const directProgramIds = new Set(allDirectRecommendations.map(item => item.programId));
  const directPrograms = directRecommendations.map(recommendation => recommendablePrograms.find(program => program.id === recommendation.programId)).filter(Boolean);
  const profilePrograms = recommendPrograms(recommendablePrograms.filter(program => !directProgramIds.has(program.id)), student, 3);
  const recommendedPrograms = [...directPrograms, ...profilePrograms].slice(0, 3);
  const recommendedIds = new Set(recommendedPrograms.map(program => program.id));
  const keywords = [...new Set(currentPrograms.flatMap(program => program.tags))];
  const visibleCurrentPrograms = currentPrograms.filter(program => {
    const currentState = resolveStudentProgramState(program, today);
    const normalizedQuery = query.trim().toLowerCase();
    return (keyword === 'all' || program.tags.includes(keyword))
      && (mode === '전체' || program.mode === mode)
      && (status === 'all' || currentState === status)
      && (!normalizedQuery || [program.name, program.department, program.description, ...program.tags].some(value => value?.toLowerCase().includes(normalizedQuery)));
  });
  const updateResponse = async (recommendation, nextStatus) => {
    const now = new Date().toISOString();
    const updated = { ...recommendation, status: nextStatus, updatedAt: now };
    const program = programs.find(item => item.id === recommendation.programId);
    const notification = buildEventNotification({
      eventId: `${recommendation.id}-${nextStatus}-${now}`,
      recipientUid: recommendation.counselorId,
      actorUid: student.uid || user?.uid || 'demo-student-s1',
      type: 'program',
      title: '학생이 추천 프로그램에 응답했습니다',
      description: `${student.name} 학생 · ${program?.name || '추천 프로그램'} · ${responseLabels[nextStatus]}`,
      to: `/programs?student=${student.id}`,
      createdAt: now,
    });
    try {
      await persistDocument('notifications', notification);
      setProgramRecommendations(items => items.map(item => item.id === recommendation.id ? updated : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      notify(`프로그램 상태를 '${responseLabels[nextStatus]}'으로 변경했습니다.`);
    } catch {
      // 공통 저장 오류 안내를 사용합니다.
    }
  };
  const renderProgramCard = (program, section) => {
    const directRecommendation = programRecommendations.find(item => item.studentId === student.id && item.programId === program.id && item.status !== 'dismissed');
    const isRecommended = recommendedIds.has(program.id);
    const currentState = resolveStudentProgramState(program, today);
    const statusLabel = currentState === 'ongoing' ? '운영 중' : PROGRAM_STATUS_LABELS[currentState];
    return <article className={`card student-program-card ${section === 'recommended' ? 'recommend-card' : 'all-card'} ${isRecommended ? 'recommend-in-all' : ''}`} key={`${section}-${program.id}`}>
      <div className="student-program-card-top"><span className="tag">{program.type}</span>{directRecommendation ? <strong>상담사 추천</strong> : isRecommended ? <strong>프로필 기반 추천</strong> : <small>{program.department}</small>}</div>
      <h3>{program.name}</h3><p>{directRecommendation?.reason || program.reason}</p>
      <div><span><Icon name="calendar" size={15} />모집 {program.recruit}</span><b className={`student-program-state ${currentState}`}>{statusLabel}</b></div>
      {section === 'recommended' && directRecommendation && <div className="student-program-response"><span>내 선택 · {responseLabels[directRecommendation.status] || '확인 전'}</span><div><button className={directRecommendation.status === 'interested' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'interested')}>관심 있음</button><button className={directRecommendation.status === 'applied' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'applied')}>신청 완료</button><button className={directRecommendation.status === 'dismissed' ? 'active' : ''} onClick={() => updateResponse(directRecommendation, 'dismissed')}>참여하지 않음</button></div></div>}
      <Link className="student-program-detail-link" to={`/student/programs/${program.id}`}>신청정보 보기 <Icon name="arrow" size={16} /></Link>
    </article>;
  };
  return <section className="student-section student-program-section">
    <div className="section-header student-program-main-heading"><div><span className="eyebrow">비교과 프로그램</span><h2>지금 참여할 성장 기회를 확인하세요</h2><p>현재 모집·운영 중인 프로그램을 살펴보고, 나에게 맞는 추천도 따로 확인할 수 있어요.</p></div><div className="student-program-overview" aria-label="비교과 프로그램 현황"><span><strong>{recommendedPrograms.length}</strong>맞춤 추천</span><span><strong>{currentPrograms.length}</strong>모집·운영 중</span></div></div>

    <section className="student-program-group student-program-recommendations" aria-labelledby="student-recommended-programs-title">
      <div className="student-program-group-heading"><div><span className="student-program-group-icon"><Icon name="spark" size={18} /></span><div><h3 id="student-recommended-programs-title">나에게 추천되는 프로그램</h3><p>상담사 추천과 관심 분야·학년 정보를 바탕으로 골랐어요.</p></div></div><span>{recommendedPrograms.length}개</span></div>
      {recommendedPrograms.length
        ? <div className="student-programs">{recommendedPrograms.map(program => renderProgramCard(program, 'recommended'))}</div>
        : <EmptyState title="아직 추천 프로그램이 없습니다" description="관심 분야와 진로 목표를 업데이트하면 더 정확한 추천을 받을 수 있어요." />}
    </section>

    <section className="student-program-group student-program-current" aria-labelledby="student-current-programs-title">
      <div className="student-program-group-heading"><div><span className="student-program-group-icon current"><Icon name="calendar" size={18} /></span><div><h3 id="student-current-programs-title">현재 모집·운영 중인 프로그램</h3><p>지금 신청할 수 있거나 현재 운영 중인 비교과 프로그램을 모두 모았어요.</p></div></div><span>{visibleCurrentPrograms.length}/{currentPrograms.length}개</span></div>
      <div className="student-program-filter-row"><label className="search-field"><Icon name="search" size={16} /><span className="sr-only">프로그램 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="프로그램명, 태그 검색" /></label><select aria-label="운영 방식" value={mode} onChange={event => setMode(event.target.value)}><option>전체</option>{PROGRAM_MODES.map(item => <option key={item}>{item}</option>)}</select><select aria-label="프로그램 상태" value={status} onChange={event => setStatus(event.target.value)}><option value="all">전체 상태</option><option value="recruiting">모집 중</option><option value="ongoing">운영 중</option></select></div>
      <div className="student-program-keywords" aria-label="비교과 프로그램 키워드 필터"><button className={keyword === 'all' ? 'active' : ''} aria-pressed={keyword === 'all'} onClick={() => setKeyword('all')}>전체</button>{keywords.map(item => <button key={item} className={keyword === item ? 'active' : ''} aria-pressed={keyword === item} onClick={() => setKeyword(item)}>{item}</button>)}</div>
      {visibleCurrentPrograms.length
        ? <div className="student-programs">{visibleCurrentPrograms.map(program => renderProgramCard(program, 'current'))}</div>
        : <EmptyState title="조건에 맞는 프로그램이 없습니다" description="다른 검색어나 필터를 선택해 보세요." action={<button className="button secondary" onClick={() => { setQuery(''); setKeyword('all'); setMode('전체'); setStatus('all'); }}>필터 초기화</button>} />}
    </section>
  </section>;
}
