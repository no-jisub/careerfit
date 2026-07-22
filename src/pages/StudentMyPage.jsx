import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { getAppointmentDateParts, getDayPeriod, getTimeRangeEnd, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';
import StudentProgramSection from '../components/StudentProgramSection';
import { closeAvailabilityAfterCancellation } from '../utils/appointments';
import { buildEventNotification } from '../utils/notifications';
import { ConsultationFeedbackForm } from '../components/ConsultationFeedback';
import { buildFeedbackNotification, getFeedbackForAppointment } from '../utils/feedback';

export default function StudentMyPage() {
  const { students, setStudents, consultationSummaries, followUps, appointments, setAppointments, setFollowUps, counselorAvailability, setCounselorAvailability, consultationFeedbacks, setConsultationFeedbacks, setNotifications, persistDocument, persistDocumentGroup, notify } = useApp();
  const { user, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [expandedConsultationId, setExpandedConsultationId] = useState('');
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  useEffect(() => {
    if (!showProfileEdit && !showAppointmentDetails) return undefined;
    const closeModal = event => {
      if (event.key !== 'Escape') return;
      if (showProfileEdit && !savingProfile) setShowProfileEdit(false);
      if (showAppointmentDetails) setShowAppointmentDetails(false);
    };
    window.addEventListener('keydown', closeModal);
    return () => window.removeEventListener('keydown', closeModal);
  }, [showProfileEdit, showAppointmentDetails, savingProfile]);
  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;
  const completedAppointments = appointments.filter(item => item.studentId === student.id && ['completed', 'complete'].includes(item.status));
  const saveFeedback = async feedback => { const notification = buildFeedbackNotification(feedback, student.name); await persistDocumentGroup([{ name: 'consultationFeedbacks', record: feedback }, { name: 'notifications', record: notification }]); setConsultationFeedbacks(items => items.some(item => item.id === feedback.id) ? items.map(item => item.id === feedback.id ? feedback : item) : [...items, feedback]); notify('상담 피드백을 저장했습니다.'); };
  const visibleConsultations = consultationSummaries.filter(c => c.studentId === student.id && c.published !== false).sort((a,b) => b.date.localeCompare(a.date));
  const latest = visibleConsultations[0];
  const tasks = followUps.filter(f => f.studentId === student.id);
  const studentTasks = tasks.filter(t => t.owner === '학생');
  const nextAppointment = appointments.filter(item => item.studentId === student.id && ['pending', 'confirmed', 'scheduled'].includes(item.status) && item.date >= toDateKey()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;
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
  const cancelAppointment = async appointment => {
    if (!window.confirm('이 상담 예약을 취소할까요?')) return;
    const now = new Date().toISOString();
    const updated = { ...appointment, status: 'cancelled', cancelledAt: now, cancelledBy: student.uid || user?.uid || 'demo-student-s1', cancelledByRole: 'student', updatedAt: now };
    const availability = counselorAvailability.find(item => item.id === appointment.availabilityId);
    const closedAvailability = closeAvailabilityAfterCancellation(availability, appointment, now);
    const notification = buildEventNotification({ eventId: `${appointment.id}-student-cancelled`, recipientUid: appointment.counselorUid, actorUid: student.uid || user?.uid || '', type: 'appointment', title: '학생이 상담 예약을 취소했습니다', description: `${student.name} 학생 · ${appointment.date} ${appointment.time}`, to: '/appointments', createdAt: now });
    try {
      await persistDocumentGroup([{ name: 'appointments', record: updated }, ...(closedAvailability ? [{ name: 'counselorAvailability', record: closedAvailability }] : []), { name: 'notifications', record: notification }]);
      setAppointments(items => items.map(item => item.id === updated.id ? updated : item));
      if (closedAvailability) setCounselorAvailability(items => items.map(item => item.id === closedAvailability.id ? closedAvailability : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      notify('상담 예약을 취소했습니다. 해당 시간은 상담사가 다시 열기 전까지 마감됩니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };
  return <div className="student-portal"><header><div className="brand"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></div><div><Link className="icon-button" aria-label="알림" to="/student/notifications"><Icon name="bell" /></Link><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header><main>
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p><div className="student-welcome-actions"><Link className="student-consultation-apply" to="/student/appointments"><Icon name="calendar" size={16} />상담 신청</Link><button className="student-profile-edit" onClick={openProfileEdit}><Icon name="settings" size={16} />내 정보 수정</button></div></div><div className="journey-progress"><div><strong>이번 주 진행률</strong><span>{tasks.filter(t => t.status === 'complete').length}/{tasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${tasks.length ? tasks.filter(t => t.status === 'complete').length / tasks.length * 100 : 0}%` }} /></div><p>한 걸음씩 충분히 잘하고 있어요!</p></div></section>
    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정 · {nextAppointment.status === 'pending' ? '승인 대기' : '확정'}</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><div className="student-appointment-actions"><button onClick={() => setShowAppointmentDetails(true)}>일정 자세히 보기 <Icon name="arrow" size={17} /></button><button onClick={() => cancelAppointment(nextAppointment)}>예약 취소</button></div></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>새 일정이 등록되면 이곳에서 확인할 수 있어요.</p></section>}<section className="card recent-summary"><span className="eyebrow">최근 공개 상담 요약</span>{latest ? <><h2>{latest.purpose}</h2><div className="published-summary-fields">{latest.summary && <div><span>상담 요약</span><p>{latest.summary}</p></div>}{latest.strengths && <div><span>나의 강점</span><p>{latest.strengths}</p></div>}{latest.concern && <div><span>개선 또는 고민 사항</span><p>{latest.concern}</p></div>}{latest.programs?.length > 0 && <div><span>추천 프로그램</span><p>{latest.programs.join(', ')}</p></div>}{latest.studentActions && <div><span>후속 조치</span><p>{latest.studentActions}</p></div>}{latest.nextCheckItems && <div><span>다음 상담 계획</span><p>{latest.nextCheckItems}</p></div>}</div><small>상담일 {latest.date} · {latest.counselor || student.counselor} 상담사</small></> : <EmptyState title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." />}</section></div>
    <section className="student-section"><div className="section-header"><div><span className="eyebrow">나의 다음 행동</span><h2>이번 상담 후 해야 할 일</h2><p>완료한 항목은 흐리게 남겨 진행 이력을 확인할 수 있어요.</p></div></div><div className="student-task-grid">{studentTasks.map(t => <article className={`student-task-card ${t.status === 'complete' ? 'complete' : ''}`} key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)} disabled={t.status === 'complete'}><span>{t.status === 'complete' ? <Icon name="check" size={16} /> : null}</span></button><div><StatusBadge status={t.status} context="followUp" /><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지</p></div></article>)}</div>{!studentTasks.length && <EmptyState title="등록된 후속 조치가 없습니다" description="새로운 다음 행동이 등록되면 이곳에서 확인할 수 있어요." />}</section>
    <section className="student-section card student-record-management">
      <div className="section-header"><div><span className="eyebrow">나의 상담 여정</span><h2>상담 기록 타임라인</h2><p>지금까지 상담한 흐름을 날짜순으로 살펴보고, 각 기록을 눌러 공개된 내용을 확인할 수 있어요.</p></div><span className="student-record-count">총 {visibleConsultations.length}건</span></div>
      {visibleConsultations.length ? <div className="student-consultation-timeline">{visibleConsultations.map(item => {
        const expanded = expandedConsultationId === item.id;
        return <article key={item.id} className={expanded ? 'open' : ''}><span className="student-timeline-dot" aria-hidden="true" /><button className="student-record-toggle" aria-expanded={expanded} aria-controls={`student-consultation-${item.id}`} onClick={() => setExpandedConsultationId(expanded ? '' : item.id)}><div className="student-record-info"><time className="student-record-date" dateTime={item.date}>{item.date}</time><div><strong>{item.purpose}</strong><span>{item.type} · {item.counselor || student.counselor || '담당 상담사'}</span></div></div><Icon name="chevron" size={18} /></button>{expanded && <div className="student-timeline-body" id={`student-consultation-${item.id}`}><div className="published-summary-fields">{item.summary && <div><span>상담 요약</span><p>{item.summary}</p></div>}{item.strengths && <div><span>나의 강점</span><p>{item.strengths}</p></div>}{item.concern && <div><span>개선 또는 고민 사항</span><p>{item.concern}</p></div>}{item.programs?.length > 0 && <div><span>추천 프로그램</span><p>{item.programs.join(', ')}</p></div>}{item.studentActions && <div><span>후속 조치</span><p>{item.studentActions}</p></div>}{item.nextCheckItems && <div><span>다음 상담 계획</span><p>{item.nextCheckItems}</p></div>}</div><div className="student-timeline-footer"><small>상담일 {item.date} · {item.counselor || student.counselor || '담당 상담사'} 상담사</small></div></div>}</article>;
      })}</div> : <EmptyState title="공개된 상담 기록이 없습니다" description="상담사가 기록을 공개하면 이곳에서 확인할 수 있어요." />}
    </section>
    <StudentProgramSection student={student} notify={notify} />
    {completedAppointments.length > 0 && <section className="student-section feedback-section"><div className="section-header"><div><span className="eyebrow">상담 품질</span><h2>완료한 상담 피드백</h2></div></div>{completedAppointments.map(appointment => <article className="card" key={appointment.id}><strong>{appointment.date} · {appointment.type}</strong><ConsultationFeedbackForm appointment={appointment} studentUid={student.uid || user?.uid || appointment.studentUid} feedback={getFeedbackForAppointment(consultationFeedbacks, appointment.id)} onSave={saveFeedback} /></article>)}</section>}
    <Link className="button secondary" to="/student/goals">나의 상담 목표와 성과 보기</Link>
  </main><footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div><Link className="student-withdrawal-link" to="/student/withdrawal">{student.accountStatus === 'withdrawalPending' ? '탈퇴 요청 처리 중' : '회원 탈퇴'}</Link></footer>{showProfileEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingProfile && setShowProfileEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">내 정보</span><h2 id="student-profile-edit-title">프로필 수정</h2><p className="field-hint">학과와 학년 같은 학적 정보는 담당자에게 변경을 요청해 주세요.</p><form onSubmit={saveProfile}><label>연락처<input autoFocus value={profileForm.phone || ''} onChange={e => updateProfileField('phone', e.target.value)} required /></label><label>관심 분야 <small className="field-hint">쉼표로 구분해 주세요.</small><input value={profileForm.interests || ''} onChange={e => updateProfileField('interests', e.target.value)} /></label><label>진로 목표<input value={profileForm.goal || ''} onChange={e => updateProfileField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={profileForm.concern || ''} onChange={e => updateProfileField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}>취소</button><button className="button primary" disabled={savingProfile}>{savingProfile ? '저장 중...' : '업데이트'}</button></div></form></section></div>}{showAppointmentDetails && nextAppointment && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAppointmentDetails(false)}><section className="modal student-appointment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-appointment-detail-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAppointmentDetails(false)}><Icon name="close" size={19} /></button><span className="eyebrow">다음 상담 일정</span><h2 id="student-appointment-detail-title">{nextAppointment.type}</h2><div className="appointment-detail-summary"><span className={`appointment-status ${nextAppointment.status}`}>{nextAppointment.status === 'pending' ? '승인 대기' : '상담 확정'}</span><strong>{nextAppointment.date} · {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)}</strong><p><Icon name="location" size={16} />{nextAppointment.location}</p></div><dl className="student-appointment-detail-list"><div><dt>담당 상담사</dt><dd>{student.counselor || '담당 상담사'} 상담사</dd></div><div><dt>상담 주제</dt><dd>{nextAppointment.subject || nextAppointment.type}</dd></div><div><dt>상담사에게 전달한 내용</dt><dd>{nextAppointment.requestMessage || '학생이 별도로 전달한 내용이 없습니다.'}</dd></div>{nextAppointment.preferredOutcome && <div><dt>상담 후 얻고 싶은 결과</dt><dd>{nextAppointment.preferredOutcome}</dd></div>}<div><dt>상담 준비 안내</dt><dd>{nextAppointment.preparation || '별도 준비사항이 없습니다.'}</dd></div></dl><div className="modal-actions"><button autoFocus className="button primary" onClick={() => setShowAppointmentDetails(false)}>확인</button></div></section></div>}</div>;
}
