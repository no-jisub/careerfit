import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { programs } from '../data/programs';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { getAppointmentDateParts, getDayPeriod, toDateKey } from '../utils/date';
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
  const recommendedPrograms = programs.slice(0, 2);
  const recommendedProgramIds = recommendedPrograms.map(program => program.id);
  const programKeywords = [...new Set(programs.flatMap(program => program.tags))];
  const orderedPrograms = [...recommendedPrograms, ...programs.filter(program => !recommendedProgramIds.includes(program.id))];
  const visiblePrograms = showAllPrograms ? orderedPrograms.filter(program => selectedProgramKeyword === 'all' || program.tags.includes(selectedProgramKeyword)) : recommendedPrograms;
  const nextAppointment = appointments.filter(item => item.studentId === student.id && item.status === 'scheduled' && item.date >= toDateKey()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;
  const openProfileEdit = () => {
    setProfileForm({
      phone: student.phone || '',
      department: student.department || '',
      grade: student.grade || '',
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
      department: profileForm.department.trim(),
      grade: profileForm.grade,
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
  return <div className="student-portal"><header><div className="brand"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></div><div><button className="icon-button" aria-label="알림"><Icon name="bell" /></button><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header><main>
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p><button className="student-profile-edit" onClick={openProfileEdit}><Icon name="settings" size={16} />내 정보 수정</button></div><div className="journey-progress"><div><strong>이번 주 진행률</strong><span>{tasks.filter(t => t.status === 'complete').length}/{tasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${tasks.length ? tasks.filter(t => t.status === 'complete').length / tasks.length * 100 : 0}%` }} /></div><p>한 걸음씩 충분히 잘하고 있어요!</p></div></section>
    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><button onClick={() => notify('상담 일정 상세를 확인했습니다.')}>일정 자세히 보기 <Icon name="arrow" size={17} /></button></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>새 일정이 등록되면 이곳에서 확인할 수 있어요.</p></section>}<section className="card recent-summary"><span className="eyebrow">최근 공개 상담 요약</span>{latest ? <><h2>{latest.purpose}</h2><p>{latest.summary}</p><div><span>다음 확인</span><strong>{latest.nextCheckItems}</strong></div><small>상담일 {latest.date} · {latest.counselor || student.counselor} 상담사</small></> : <EmptyState title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." />}</section></div>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">나의 다음 행동</span><h2>이번 상담 후 해야 할 일</h2><p>완료한 항목은 흐리게 남겨 진행 이력을 확인할 수 있어요.</p></div></div><div className="student-task-grid">{studentTasks.map(t => <article className={`student-task-card ${t.status === 'complete' ? 'complete' : ''}`} key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)} disabled={t.status === 'complete'}><span>{t.status === 'complete' ? <Icon name="check" size={16} /> : null}</span></button><div><StatusBadge status={t.status} context="followUp" /><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지</p></div></article>)}</div>{!studentTasks.length && <EmptyState title="등록된 후속 조치가 없습니다" description="새로운 다음 행동이 등록되면 이곳에서 확인할 수 있어요." />}</section>
    <section className={`student-section student-program-section ${showAllPrograms ? 'all' : 'recommended'}`}><div className="section-header"><div><span className="eyebrow">비교과 프로그램</span><h2>{showAllPrograms ? '전체 비교과 프로그램' : '나에게 추천된 프로그램'}</h2><p>{showAllPrograms ? 'AI 추천 프로그램을 먼저 확인한 뒤 키워드별로 살펴보세요.' : 'AI가 상담 이력과 관심 분야를 바탕으로 우선 추천한 프로그램입니다.'}</p></div><button className="button secondary student-program-toggle" onClick={() => { setShowAllPrograms(value => !value); setSelectedProgramKeyword('all'); }}>{showAllPrograms ? 'AI 추천만 보기' : '전체 비교과 프로그램 보기'} <Icon name="arrow" size={16} /></button></div>{showAllPrograms && <div className="student-program-keywords" aria-label="비교과 프로그램 키워드 필터"><button className={selectedProgramKeyword === 'all' ? 'active' : ''} onClick={() => setSelectedProgramKeyword('all')}>전체</button>{programKeywords.map(keyword => <button key={keyword} className={selectedProgramKeyword === keyword ? 'active' : ''} onClick={() => setSelectedProgramKeyword(keyword)}>{keyword}</button>)}</div>}<div className="student-programs">{visiblePrograms.map(p => { const isRecommended = recommendedProgramIds.includes(p.id); return <article className={`card student-program-card ${showAllPrograms ? 'all-card' : 'recommend-card'} ${isRecommended ? 'recommend-in-all' : ''}`} key={p.id}><div className="student-program-card-top"><span className="tag">{p.type}</span>{isRecommended ? <strong>AI 추천 {p.score}%</strong> : <small>{p.department}</small>}</div><h3>{p.name}</h3><p>{p.reason}</p><div><span><Icon name="calendar" size={15} />모집 {p.recruit}</span><b>{p.mode}</b></div><button onClick={() => notify(`${p.name} 상세 정보를 확인했습니다.`)}>상세 정보 보기 <Icon name="arrow" size={16} /></button></article>; })}</div>{showAllPrograms && !visiblePrograms.length && <EmptyState title="해당 키워드의 프로그램이 없습니다" description="다른 키워드를 선택해 보세요." />}</section>
  </main><footer>커리어핏 · 학생 상담 지원 서비스 <span>문의 대학일자리플러스센터</span></footer>{showProfileEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingProfile && setShowProfileEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">내 정보</span><h2 id="student-profile-edit-title">프로필 수정</h2><form onSubmit={saveProfile}><div className="form-row"><label>학과<input autoFocus value={profileForm.department || ''} onChange={e => updateProfileField('department', e.target.value)} required /></label><label>학년<select value={profileForm.grade || ''} onChange={e => updateProfileField('grade', e.target.value)}>{['1학년','2학년','3학년','4학년','졸업생'].map(grade => <option key={grade}>{grade}</option>)}</select></label></div><label>연락처<input value={profileForm.phone || ''} onChange={e => updateProfileField('phone', e.target.value)} required /></label><label>관심 분야 <small className="field-hint">쉼표로 구분해 주세요.</small><input value={profileForm.interests || ''} onChange={e => updateProfileField('interests', e.target.value)} /></label><label>진로 목표<input value={profileForm.goal || ''} onChange={e => updateProfileField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={profileForm.concern || ''} onChange={e => updateProfileField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}>취소</button><button className="button primary" disabled={savingProfile}>{savingProfile ? '저장 중...' : '업데이트'}</button></div></form></section></div>}</div>;
}
