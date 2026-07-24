import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { programs } from '../data/programs';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { getAppointmentDateParts, getDayPeriod, toDateKey } from '../utils/date';
import { recommendPrograms } from '../utils/programRecommendations';
import { useAuth } from '../auth/AuthContext';

export default function StudentMyPage() {
  const { students, setStudents, consultations, followUps, appointments, setFollowUps, persistDocument, notify } = useApp();
  const { user, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [selectedProgramKeyword, setSelectedProgramKeyword] = useState('all');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaMessages, setQaMessages] = useState([{ role: 'assistant', text: '자주 묻는 질문이나 간단한 사용 방법을 물어보세요. 상담 일정, 해야 할 일, 비교과 프로그램, 내 정보 수정 방법을 바로 안내해 드릴게요.' }]);
  useEffect(() => {
    if (!showProfileEdit) return undefined;
    const closeModal = event => {
      if (event.key === 'Escape' && !savingProfile) setShowProfileEdit(false);
    };
    window.addEventListener('keydown', closeModal);
    return () => window.removeEventListener('keydown', closeModal);
  }, [showProfileEdit, savingProfile]);
  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;
  const visibleConsultations = consultations.filter(c => c.studentId === student.id && c.studentVisible !== false).sort((a,b) => b.date.localeCompare(a.date));
  const latest = visibleConsultations[0];
  const tasks = followUps.filter(f => f.studentId === student.id);
  const studentTasks = tasks.filter(t => t.owner === '학생');
  const recommendedPrograms = recommendPrograms(programs, student, 2);
  const recommendedProgramIds = recommendedPrograms.map(program => program.id);
  const programKeywords = [...new Set(programs.flatMap(program => program.tags))];
  const orderedPrograms = [...recommendedPrograms, ...programs.filter(program => !recommendedProgramIds.includes(program.id))];
  const visiblePrograms = showAllPrograms ? orderedPrograms.filter(program => selectedProgramKeyword === 'all' || program.tags.includes(selectedProgramKeyword)) : recommendedPrograms;
  const nextAppointment = appointments.filter(item => item.studentId === student.id && item.status === 'scheduled' && item.date >= toDateKey()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;
  const quickQuestions = ['상담 일정은 어디서 봐?', '해야 할 일은 어떻게 완료해?', '프로그램은 어떻게 찾아?', '내 정보는 어떻게 수정해?'];
  const openProfileEdit = () => {
    setProfileForm({
      phone: student.phone || '',
      interests: (student.interests || []).join(', '),
      goal: student.goal || '',
      concern: student.concern || '',
    });
    setShowProfileEdit(true);
  };
  const updateProfileField = (key, value) => setProfileForm(prev => ({ ...prev, [key]: value }));
  const saveProfile = async e => {
    e.preventDefault();
    if (savingProfile) return;
    const updated = {
      ...student,
      phone: profileForm.phone.trim(),
      interests: profileForm.interests.split(',').map(item => item.trim()).filter(Boolean),
      goal: profileForm.goal.trim(),
      concern: profileForm.concern.trim(),
      updatedAt: new Date().toISOString(),
    };
    setSavingProfile(true);
    try {
      await persistDocument('students', updated);
      setStudents(items => items.map(item => item.id === student.id ? updated : item));
      setShowProfileEdit(false);
      notify('내 정보를 업데이트했습니다.');
    } finally {
      setSavingProfile(false);
    }
  };
  const complete = async id => {
    const current = followUps.find(f => f.id === id);
    if (!current || current.status === 'complete') return;
    const updated = { ...current, status: 'complete', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await persistDocument('followUps', updated);
      setFollowUps(items => items.map(followUp => followUp.id === id ? updated : followUp));
      notify('내 다음 행동을 완료 처리했습니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };
  const createQaAnswer = question => {
    const normalized = question.replace(/\s/g, '').toLowerCase();
    if (normalized.includes('예약') || normalized.includes('일정') || normalized.includes('상담일')) {
      if (!nextAppointment) return '예정된 상담 일정은 아직 없습니다. 새 일정이 등록되면 학생 화면 상단의 다음 상담 일정 카드에 표시됩니다.';
      return `다음 상담 일정은 화면 상단 카드에서 확인할 수 있어요.\n일시: ${nextAppointment.date} ${getDayPeriod(nextAppointment.time)} ${nextAppointment.time}\n장소: ${nextAppointment.location}\n준비: ${nextAppointment.preparation || '별도 준비사항 없음'}`;
    }
    if (normalized.includes('완료') || normalized.includes('체크') || normalized.includes('해야') || normalized.includes('할일') || normalized.includes('todo')) {
      if (!studentTasks.length) return '등록된 해야 할 일이 아직 없습니다. 상담사가 후속 조치를 등록하면 이 영역에 표시됩니다.';
      return '해야 할 일 카드 왼쪽의 동그란 체크 버튼을 누르면 완료 처리됩니다. 완료한 항목은 사라지지 않고 흐리게 남아서 진행 이력으로 확인할 수 있어요.';
    }
    if (normalized.includes('프로그램') || normalized.includes('비교과') || normalized.includes('추천') || normalized.includes('찾아')) {
      return `비교과 프로그램은 아래 "나에게 추천된 프로그램" 영역에서 볼 수 있어요. "전체 비교과 프로그램 보기"를 누르면 전체 목록이 열리고, 키워드 버튼으로 관심 분야별로 골라볼 수 있습니다.\n현재 추천 프로그램: ${recommendedPrograms.map(program => program.name).join(', ')}`;
    }
    if (normalized.includes('정보') || normalized.includes('수정') || normalized.includes('프로필') || normalized.includes('연락처')) {
      return '상단 파란 영역의 "내 정보 수정" 버튼을 누르면 연락처, 관심 분야, 진로 목표, 현재 고민을 업데이트할 수 있어요. 학과와 학년 같은 학적 정보는 담당자에게 변경을 요청해 주세요.';
    }
    if (normalized.includes('기록') || normalized.includes('요약') || normalized.includes('최근')) {
      if (!latest) return '아직 공개된 상담 요약이 없습니다. 담당 상담사가 공개한 상담 기록이 생기면 "최근 공개 상담 요약" 카드에 표시됩니다.';
      return `최근 공개 상담 요약은 화면 오른쪽 카드에서 확인할 수 있어요.\n상담 주제: ${latest.purpose}\n요약: ${latest.summary}\n다음 확인: ${latest.nextCheckItems}`;
    }
    if (normalized.includes('면접')) {
      return `면접 준비는 먼저 "${student.goal}" 목표와 연결되는 경험 2~3개를 고르는 것부터 시작하면 좋아요.\n1. 최근 프로젝트나 수업 경험에서 문제-행동-결과를 정리하세요.\n2. 예상 질문은 지원 동기, 강점, 실패 경험, 협업 경험부터 준비하세요.\n3. 답변이 막히는 부분은 다음 상담 때 담당 상담사에게 피드백 요청하면 좋습니다.`;
    }
    if (normalized.includes('포트폴리오')) {
      return `포트폴리오는 많은 내용을 넣기보다 진로 목표와 맞는 경험을 선명하게 보여주는 게 중요해요.\n1. 목표 직무: ${student.goal}\n2. 관심 분야: ${(student.interests || []).join(', ')}\n3. 각 경험마다 역할, 사용한 역량, 결과를 한 문단으로 정리해 보세요.`;
    }
    if (normalized.includes('공공기관') || normalized.includes('공기업')) {
      return `공공기관 준비는 직무 이해와 기본 서류 구조를 먼저 잡는 게 좋아요.\n1. 관심 기관 3곳을 정하고 채용 직무기술서를 비교하세요.\n2. 자기소개서는 공공성, 협업, 문제 해결 경험을 중심으로 정리하세요.\n3. 관련 비교과나 자기소개서 특강이 있으면 우선 신청해 보세요.`;
    }
    if (normalized.includes('불안') || normalized.includes('막막') || normalized.includes('고민') || normalized.includes('진로')) {
      return `지금 고민은 "${student.concern}"로 정리되어 있어요. 바로 결론을 내리기보다 후보를 좁히는 방식이 좋겠습니다.\n1. 관심 분야 ${(student.interests || []).slice(0, 3).join(', ')} 중 끌리는 순서를 매겨 보세요.\n2. 각 분야에서 해볼 수 있는 작은 경험 하나를 정하세요.\n3. 다음 상담에서는 경험 후 느낀 점과 더 알고 싶은 직무를 가져가면 상담이 훨씬 구체화됩니다.`;
    }
    if (normalized.includes('진로') || normalized.includes('목표') || normalized.includes('관심')) {
      return `현재 진로 목표는 "${student.goal}"이고, 관심 분야는 ${(student.interests || []).join(', ')}입니다. 지금 고민은 "${student.concern}"로 정리되어 있어요. 이 목표가 아직 확신이 없다면 관심 분야별로 작은 경험을 하나씩 해보고 비교해 보는 방식이 좋습니다.`;
    }
    return '간단한 질문은 바로 답변할 수 있어요. 예를 들어 "상담 일정은 어디서 봐?", "해야 할 일은 어떻게 완료해?", "비교과 프로그램은 어떻게 찾아?", "내 정보는 어떻게 수정해?"처럼 물어보세요.';
  };
  const askQa = question => {
    const text = question.trim();
    if (!text) return;
    setQaMessages(messages => [...messages, { role: 'user', text }, { role: 'assistant', text: createQaAnswer(text) }]);
    setQaQuestion('');
  };
  return <div className="student-portal"><header><div className="brand"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></div><div><button className="icon-button" aria-label="알림"><Icon name="bell" /></button><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header><main>
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p><button className="student-profile-edit" onClick={openProfileEdit}><Icon name="settings" size={16} />내 정보 수정</button></div><div className="journey-progress"><div><strong>이번 주 진행률</strong><span>{tasks.filter(t => t.status === 'complete').length}/{tasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${tasks.length ? tasks.filter(t => t.status === 'complete').length / tasks.length * 100 : 0}%` }} /></div><p>한 걸음씩 충분히 잘하고 있어요!</p></div></section>
    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><button onClick={() => notify('상담 일정 상세를 확인했습니다.')}>일정 자세히 보기 <Icon name="arrow" size={17} /></button></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>새 일정이 등록되면 이곳에서 확인할 수 있어요.</p></section>}<section className="card recent-summary"><span className="eyebrow">최근 공개 상담 요약</span>{latest ? <><h2>{latest.purpose}</h2><p>{latest.summary}</p><div><span>다음 확인</span><strong>{latest.nextCheckItems}</strong></div><small>상담일 {latest.date} · {latest.counselor || student.counselor} 상담사</small></> : <EmptyState title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." />}</section></div>
    <section className="card student-ai-qa"><div className="section-header"><div><h2>AI 질문 도우미</h2><p>자주 묻는 질문과 간단한 사용 방법을 바로 확인할 수 있어요.</p></div></div><div className="qa-thread" aria-live="polite">{qaMessages.map((message, index) => <div className={`qa-message ${message.role}`} key={`${message.role}-${index}`}><strong>{message.role === 'assistant' ? 'AI 답변' : student.name}</strong><p>{message.text}</p></div>)}</div><div className="qa-quick">{quickQuestions.map(question => <button type="button" key={question} onClick={() => askQa(question)}>{question}</button>)}</div><form className="qa-form" onSubmit={event => { event.preventDefault(); askQa(qaQuestion); }}><label className="sr-only" htmlFor="student-ai-question">AI 질문 도우미에 질문하기</label><input id="student-ai-question" value={qaQuestion} onChange={event => setQaQuestion(event.target.value)} placeholder="예: 비교과 프로그램은 어떻게 찾아?" /><button className="button primary">질문하기</button></form></section>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">나의 다음 행동</span><h2>이번 상담 후 해야 할 일</h2><p>완료한 항목은 흐리게 남겨 진행 이력을 확인할 수 있어요.</p></div></div><div className="student-task-grid">{studentTasks.map(t => <article className={`student-task-card ${t.status === 'complete' ? 'complete' : ''}`} key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)} disabled={t.status === 'complete'}><span>{t.status === 'complete' ? <Icon name="check" size={16} /> : null}</span></button><div><StatusBadge status={t.status} context="followUp" /><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지</p></div></article>)}</div>{!studentTasks.length && <EmptyState title="등록된 후속 조치가 없습니다" description="새로운 다음 행동이 등록되면 이곳에서 확인할 수 있어요." />}</section>
    <section className={`student-section student-program-section ${showAllPrograms ? 'all' : 'recommended'}`}><div className="section-header"><div><span className="eyebrow">비교과 프로그램</span><h2>{showAllPrograms ? '전체 비교과 프로그램' : '나에게 추천된 프로그램'}</h2><p>{showAllPrograms ? '관심 분야와 학년을 기준으로 추천 프로그램을 먼저 보여드려요.' : '등록한 관심 분야와 학년에 맞춰 우선 정렬한 프로그램입니다.'}</p></div><button className="button secondary student-program-toggle" onClick={() => { setShowAllPrograms(value => !value); setSelectedProgramKeyword('all'); }}>{showAllPrograms ? '맞춤 추천만 보기' : '전체 비교과 프로그램 보기'} <Icon name="arrow" size={16} /></button></div>{showAllPrograms && <div className="student-program-keywords" aria-label="비교과 프로그램 키워드 필터"><button className={selectedProgramKeyword === 'all' ? 'active' : ''} onClick={() => setSelectedProgramKeyword('all')}>전체</button>{programKeywords.map(keyword => <button key={keyword} className={selectedProgramKeyword === keyword ? 'active' : ''} onClick={() => setSelectedProgramKeyword(keyword)}>{keyword}</button>)}</div>}<div className="student-programs">{visiblePrograms.map(p => { const isRecommended = recommendedProgramIds.includes(p.id); return <article className={`card student-program-card ${showAllPrograms ? 'all-card' : 'recommend-card'} ${isRecommended ? 'recommend-in-all' : ''}`} key={p.id}><div className="student-program-card-top"><span className="tag">{p.type}</span>{isRecommended ? <strong>프로필 기반 추천</strong> : <small>{p.department}</small>}</div><h3>{p.name}</h3><p>{p.reason}</p><div><span><Icon name="calendar" size={15} />모집 {p.recruit}</span><b>{p.mode}</b></div><button onClick={() => notify(`${p.name} 상세 정보를 확인했습니다.`)}>상세 정보 보기 <Icon name="arrow" size={16} /></button></article>; })}</div>{showAllPrograms && !visiblePrograms.length && <EmptyState title="해당 키워드의 프로그램이 없습니다" description="다른 키워드를 선택해 보세요." />}</section>
  </main><footer>커리어핏 · 학생 상담 지원 서비스 <span>문의 대학일자리플러스센터</span></footer>{showProfileEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingProfile && setShowProfileEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">내 정보</span><h2 id="student-profile-edit-title">프로필 수정</h2><p className="field-hint">학과와 학년 같은 학적 정보는 담당자에게 변경을 요청해 주세요.</p><form onSubmit={saveProfile}><label>연락처<input autoFocus value={profileForm.phone || ''} onChange={e => updateProfileField('phone', e.target.value)} required /></label><label>관심 분야 <small className="field-hint">쉼표로 구분해 주세요.</small><input value={profileForm.interests || ''} onChange={e => updateProfileField('interests', e.target.value)} /></label><label>진로 목표<input value={profileForm.goal || ''} onChange={e => updateProfileField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={profileForm.concern || ''} onChange={e => updateProfileField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}>취소</button><button className="button primary" disabled={savingProfile}>{savingProfile ? '저장 중...' : '업데이트'}</button></div></form></section></div>}</div>;
}
