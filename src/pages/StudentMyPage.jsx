import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import { EmptyState, StatusBadge } from '../components/UI';
import { getAppointmentDateParts, getDayPeriod, getTimeRangeEnd, toDateKey } from '../utils/date';
import { useAuth } from '../auth/AuthContext';
import StudentProgramSection from '../components/StudentProgramSection';
import { closeAvailabilityAfterCancellation } from '../utils/appointments';
import { buildEventNotification } from '../utils/notifications';
import { getStudentAssignedFollowUps } from '../utils/followUps';
import { updateOwnSensitivePhone } from '../services/sensitiveAccessService';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';

const getSummaryProvenanceLabel = summary => summary?.provenance?.type === 'ai-assisted'
  ? '상담사가 작성 근거를 확인한 상담 요약'
  : '상담사가 직접 작성하고 확인한 요약';

export default function StudentMyPage() {
  const { students, setStudents, consultationSummaries, followUps, appointments, setAppointments, setFollowUps, counselorAvailability, setCounselorAvailability, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user, logout, demoModeEnabled } = useAuth();
  const demoMode = demoModeEnabled && !user;
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [expandedConsultationId, setExpandedConsultationId] = useState('');
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const studentTasks = useMemo(
    () => getStudentAssignedFollowUps(followUps, student, user?.uid),
    [followUps, student, user?.uid],
  );
  const completedTaskCount = studentTasks.filter(task => task.status === 'complete').length;
  const activeTaskCount = studentTasks.length - completedTaskCount;
  const overdueTaskCount = studentTasks.filter(task => task.status === 'overdue').length;
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
  const visibleConsultations = consultationSummaries.filter(c => c.studentId === student.id && c.published !== false).sort((a,b) => b.date.localeCompare(a.date));
  const latest = visibleConsultations[0];
  const nextAppointment = appointments.filter(item => item.studentId === student.id && ['pending', 'confirmed', 'scheduled'].includes(item.status) && item.date >= toDateKey()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;
  const openProfileEdit = () => {
    setProfileForm({
      phone: demoMode ? student.phone || '' : '',
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
    setSavingProfile(true);
    try {
      let nextPhone = student.phone;
      if (!demoMode && profileForm.phone.trim()) {
        const phoneResult = await updateOwnSensitivePhone(profileForm.phone.trim());
        nextPhone = phoneResult.phone;
      } else if (demoMode) {
        nextPhone = profileForm.phone.trim();
      }
      const updated = {
        ...student,
        phone: nextPhone,
        interests: profileForm.interests.split(',').map(item => item.trim()).filter(Boolean),
        goal: profileForm.goal.trim(),
        concern: profileForm.concern.trim(),
        updatedAt: new Date().toISOString(),
      };
      const notification = buildEventNotification({
        eventId: `${student.id}-profile-${updated.updatedAt}`,
        recipientUid: student.counselorUid,
        actorUid: student.uid || user?.uid || 'demo-student-s1',
        type: 'profile',
        title: '학생이 상담 정보를 업데이트했습니다',
        description: `${student.name} 학생 · 관심 분야, 진로 목표 또는 현재 고민을 확인하세요.`,
        to: `/students/${student.id}`,
        createdAt: updated.updatedAt,
      });
      await persistDocumentGroup([
        { name: 'students', record: updated },
        { name: 'notifications', record: notification },
      ]);
      setStudents(items => items.map(item => item.id === student.id ? updated : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
      setShowProfileEdit(false);
      notify('내 정보를 업데이트했습니다.');
    } catch (error) {
      notify(error.message || '내 정보를 업데이트하지 못했습니다.');
    } finally {
      setSavingProfile(false);
    }
  };
  const complete = async id => {
    const current = followUps.find(f => f.id === id);
    if (!current || current.status === 'complete') return;
    const updated = { ...current, status: 'complete', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const notification = buildEventNotification({
      eventId: `${updated.id}-completed-${updated.updatedAt}`,
      recipientUid: current.ownerUid || student.counselorUid,
      actorUid: student.uid || user?.uid || 'demo-student-s1',
      type: 'followup',
      title: '학생이 할 일을 완료했습니다',
      description: `${student.name} 학생 · ${updated.content}`,
      to: `/students/${student.id}`,
      createdAt: updated.updatedAt,
    });
    try {
      await persistDocumentGroup([
        { name: 'followUps', record: updated },
        { name: 'notifications', record: notification },
      ]);
      setFollowUps(items => items.map(followUp => followUp.id === id ? updated : followUp));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
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
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>상담에서 정한 행동과 추천 프로그램을 한곳에서 확인하세요.</p><div className="student-welcome-actions"><Link className="student-consultation-apply" to="/student/appointments"><Icon name="calendar" size={16} />상담 신청</Link><button className="student-profile-edit" onClick={openProfileEdit}><Icon name="settings" size={16} />내 정보 수정</button></div></div><div className="journey-progress"><div><strong>나의 할 일 진행률</strong><span>{completedTaskCount}/{studentTasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${studentTasks.length ? completedTaskCount / studentTasks.length * 100 : 0}%` }} /></div><p>{activeTaskCount ? `지금 실행할 할 일이 ${activeTaskCount}개 남아 있어요.` : '배정된 할 일을 모두 완료했어요!'}</p></div></section>
    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정 · {nextAppointment.status === 'pending' ? '승인 대기' : '확정'}</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><div className="student-appointment-actions"><button onClick={() => setShowAppointmentDetails(true)}>일정 자세히 보기 <Icon name="arrow" size={17} /></button><button onClick={() => cancelAppointment(nextAppointment)}>예약 취소</button></div></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>새 일정이 등록되면 이곳에서 확인할 수 있어요.</p></section>}<section className="card recent-summary">{latest ? <><div className="recent-summary-heading"><div><span className="eyebrow">최근 공개 상담 요약</span><h2>{latest.purpose}</h2></div><time dateTime={latest.date}>{latest.date.replaceAll('-', '.')}</time></div><div className="recent-summary-preview"><span>상담 요약</span><p>{latest.summary || latest.concern || '공개된 상담 내용을 상담 기록에서 확인해 주세요.'}</p></div><div className="recent-summary-footer"><div className="summary-provenance"><Icon name="shield" size={15} /><span>{getSummaryProvenanceLabel(latest)}</span></div><button type="button" className="recent-summary-link" aria-controls="student-consultation-history" onClick={() => document.getElementById('student-consultation-history')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>전체 기록 보기 <Icon name="arrow" size={15} /></button></div></> : <><span className="eyebrow">최근 공개 상담 요약</span><EmptyState title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." /></>}</section></div>
    <section className="student-section student-task-section"><div className="section-header"><div><span className="eyebrow">나에게 배정된 다음 행동</span><h2>나의 할 일</h2><p>담당 상담사가 등록한 내 할 일을 기한순으로 확인하고 직접 완료할 수 있어요.</p></div><div className="student-task-summary" aria-label="나의 할 일 현황"><span><small>해야 할 일</small><strong>{activeTaskCount}</strong></span><span className={overdueTaskCount ? 'urgent' : ''}><small>기한 초과</small><strong>{overdueTaskCount}</strong></span><span><small>완료</small><strong>{completedTaskCount}</strong></span></div></div><div className="student-task-grid">{studentTasks.map(t => <article className={`student-task-card ${t.status}`} key={t.id}><button aria-label={`${t.content} 완료 처리`} onClick={() => complete(t.id)} disabled={t.status === 'complete'}><span>{t.status === 'complete' ? <Icon name="check" size={16} /> : null}</span></button><div><div className="student-task-card-meta"><StatusBadge status={t.status} context="followUp" /><span><Icon name="target" size={14} />나에게 배정</span></div><h3>{t.content}</h3><p><Icon name="calendar" size={15} />{t.dueDate}까지 · 관련 상담 {t.consultationDate || '최근 상담'}</p></div></article>)}</div>{!studentTasks.length && <EmptyState icon="check" title="현재 배정된 할 일이 없습니다" description="담당 상담사가 새 할 일을 등록하면 이곳에 바로 표시됩니다." />}</section>
    <section className="student-section card student-record-management" id="student-consultation-history">
      <div className="section-header"><div><span className="eyebrow">나의 상담 여정</span><h2>상담 기록 타임라인</h2><p>지금까지 상담한 흐름을 날짜순으로 살펴보고, 각 기록을 눌러 공개된 내용을 확인할 수 있어요.</p></div><span className="student-record-count">총 {visibleConsultations.length}건</span></div>
      {visibleConsultations.length ? <div className="student-consultation-timeline">{visibleConsultations.map(item => {
        const expanded = expandedConsultationId === item.id;
        return <article key={item.id} className={expanded ? 'open' : ''}><span className="student-timeline-dot" aria-hidden="true" /><button className="student-record-toggle" aria-expanded={expanded} aria-controls={`student-consultation-${item.id}`} onClick={() => setExpandedConsultationId(expanded ? '' : item.id)}><div className="student-record-info"><time className="student-record-date" dateTime={item.date}>{item.date}</time><div><strong>{item.purpose}</strong><span>{item.type} · {item.counselor || student.counselor || '담당 상담사'}</span></div></div><Icon name="chevron" size={18} /></button>{expanded && <div className="student-timeline-body" id={`student-consultation-${item.id}`}><div className="published-summary-fields">{item.summary && <div><span>상담 요약</span><p>{item.summary}</p></div>}{item.strengths && <div><span>나의 강점</span><p>{item.strengths}</p></div>}{item.concern && <div><span>개선 또는 고민 사항</span><p>{item.concern}</p></div>}{item.programs?.length > 0 && <div><span>추천 프로그램</span><p>{item.programs.join(', ')}</p></div>}{item.studentActions && <div><span>상담 후 할 일</span><p>{item.studentActions}</p></div>}{item.nextCheckItems && <div><span>다음 상담 계획</span><p>{item.nextCheckItems}</p></div>}</div><div className="student-timeline-footer"><div className="summary-provenance"><Icon name="shield" size={15} /><span>{getSummaryProvenanceLabel(item)}</span></div><small>상담일 {item.date} · {item.counselor || student.counselor || '담당 상담사'} 상담사</small></div></div>}</article>;
      })}</div> : <EmptyState title="공개된 상담 기록이 없습니다" description="상담사가 기록을 공개하면 이곳에서 확인할 수 있어요." />}
    </section>
    <StudentProgramSection student={student} notify={notify} />
  </main><footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div><Link className="student-withdrawal-link" to="/student/withdrawal">{student.accountStatus === 'withdrawalPending' ? '탈퇴 요청 처리 중' : '회원 탈퇴'}</Link></footer>{showProfileEdit && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !savingProfile && setShowProfileEdit(false)}><section className="modal student-edit-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-edit-title"><button className="modal-close" aria-label="닫기" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}><Icon name="close" size={19} /></button><span className="eyebrow">내 정보</span><h2 id="student-profile-edit-title">프로필 수정</h2><p className="field-hint">학과와 학년 같은 학적 정보는 담당자에게 변경을 요청해 주세요.</p><form onSubmit={saveProfile}><label>{demoMode ? '연락처' : '새 연락처'} <small className="field-hint">{demoMode ? '' : '변경할 때만 입력해 주세요. 현재 연락처는 화면에 다시 표시하지 않습니다.'}</small><input autoFocus type="tel" autoComplete="tel" value={profileForm.phone || ''} onChange={e => updateProfileField('phone', e.target.value)} placeholder={demoMode ? '' : '010-0000-0000'} required={demoMode} /></label><label>관심 분야 <small className="field-hint">쉼표로 구분해 주세요.</small><input value={profileForm.interests || ''} onChange={e => updateProfileField('interests', e.target.value)} /></label><label>진로 목표<input value={profileForm.goal || ''} onChange={e => updateProfileField('goal', e.target.value)} required /></label><label>현재 고민<textarea rows="4" value={profileForm.concern || ''} onChange={e => updateProfileField('concern', e.target.value)} required /></label><div className="modal-actions"><button type="button" className="button secondary" disabled={savingProfile} onClick={() => setShowProfileEdit(false)}>취소</button><button className="button primary" disabled={savingProfile}>{savingProfile ? '저장 중...' : '업데이트'}</button></div></form></section></div>}{showAppointmentDetails && nextAppointment && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAppointmentDetails(false)}><section className="modal student-appointment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-appointment-detail-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAppointmentDetails(false)}><Icon name="close" size={19} /></button><span className="eyebrow">다음 상담 일정</span><h2 id="student-appointment-detail-title">{nextAppointment.type}</h2><div className="appointment-detail-summary"><span className={`appointment-status ${nextAppointment.status}`}>{nextAppointment.status === 'pending' ? '승인 대기' : '상담 확정'}</span><strong>{nextAppointment.date} · {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)}</strong><p><Icon name="location" size={16} />{nextAppointment.location}</p></div><dl className="student-appointment-detail-list"><div><dt>담당 상담사</dt><dd>{student.counselor || '담당 상담사'} 상담사</dd></div><div><dt>상담 주제</dt><dd>{nextAppointment.subject || nextAppointment.type}</dd></div><div><dt>상담사에게 전달한 내용</dt><dd>{nextAppointment.requestMessage || '학생이 별도로 전달한 내용이 없습니다.'}</dd></div>{nextAppointment.preferredOutcome && <div><dt>상담 후 얻고 싶은 결과</dt><dd>{nextAppointment.preferredOutcome}</dd></div>}<div><dt>상담 준비 안내</dt><dd>{nextAppointment.preparation || '별도 준비사항이 없습니다.'}</dd></div></dl><div className="modal-actions"><button autoFocus className="button primary" onClick={() => setShowAppointmentDetails(false)}>확인</button></div></section></div>}</div>;
}
