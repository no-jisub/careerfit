import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState } from '../components/UI';
import { useApp } from '../context/AppContext';
import { closeAvailabilityAfterCancellation } from '../utils/appointments';
import { getAppointmentDateParts, getDayPeriod, getTimeRangeEnd, toDateKey } from '../utils/date';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';
import { getStudentAssignedFollowUps } from '../utils/followUps';
import { buildEventNotification } from '../utils/notifications';
import { queueDemoAppointmentEmail } from '../services/demoAppointmentEmailService';

const summaryProvenanceLabel = summary => summary?.provenance?.type === 'ai-assisted'
  ? '상담사가 작성 근거를 확인한 상담 요약'
  : '상담사가 직접 작성하고 확인한 요약';

export default function StudentMyPage() {
  const { students, consultationSummaries, followUps, appointments, setAppointments, counselorAvailability, setCounselorAvailability, programRecommendations, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const studentTasks = useMemo(() => getStudentAssignedFollowUps(followUps, student, user?.uid), [followUps, student, user?.uid]);
  const completedTaskCount = studentTasks.filter(task => task.status === 'complete').length;
  const activeTaskCount = studentTasks.length - completedTaskCount;
  const overdueTaskCount = studentTasks.filter(task => task.status === 'overdue').length;
  const recommendationCount = student ? programRecommendations.filter(item => item.studentId === student.id && item.status !== 'dismissed').length : 0;

  useEffect(() => {
    if (!showAppointmentDetails) return undefined;
    const closeModal = event => { if (event.key === 'Escape') setShowAppointmentDetails(false); };
    window.addEventListener('keydown', closeModal);
    return () => window.removeEventListener('keydown', closeModal);
  }, [showAppointmentDetails]);

  if (!student) return <div className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</div>;

  const visibleConsultations = consultationSummaries.filter(item => item.studentId === student.id && item.published !== false).sort((left, right) => right.date.localeCompare(left.date));
  const latest = visibleConsultations[0];
  const nextAppointment = appointments.filter(item => item.studentId === student.id && ['pending', 'confirmed', 'scheduled'].includes(item.status) && item.date >= toDateKey()).sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))[0];
  const appointmentDate = nextAppointment ? getAppointmentDateParts(nextAppointment.date) : null;

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
      if (!user) {
        await queueDemoAppointmentEmail({
          recipientUid: appointment.counselorUid,
          eventKey: 'student-cancelled',
          appointment: updated,
          studentName: student.name,
        });
      }
      notify('상담 예약을 취소했습니다. 해당 시간은 상담사가 다시 열기 전까지 마감됩니다.');
    } catch { /* 공통 저장 오류 안내를 사용합니다. */ }
  };

  return <div className="student-home-page">
    <section className="student-welcome"><div><span className="eyebrow">나의 상담 여정</span><h1>{student.name}님, 다음 걸음을<br />차근차근 준비해 볼까요?</h1><p>오늘 확인할 일정과 해야 할 일을 먼저 살펴보세요.</p><div className="student-welcome-actions"><Link className="student-consultation-apply" to="/student/appointments"><Icon name="calendar" size={16} />상담 신청</Link><Link className="student-profile-edit" to="/student/profile"><Icon name="user" size={16} />내 정보 수정</Link></div></div><div className="journey-progress"><div><strong>나의 할 일 진행률</strong><span>{completedTaskCount}/{studentTasks.length} 완료</span></div><div className="progress-track"><i style={{ width: `${studentTasks.length ? completedTaskCount / studentTasks.length * 100 : 0}%` }} /></div><p>{activeTaskCount ? `지금 실행할 할 일이 ${activeTaskCount}개 남아 있어요.` : '배정된 할 일을 모두 완료했어요!'}</p></div></section>

    <section className="student-home-shortcuts" aria-label="학생 주요 메뉴 바로가기">
      <Link to="/student/tasks"><span className={`student-home-shortcut-icon ${overdueTaskCount ? 'urgent' : ''}`}><Icon name={overdueTaskCount ? 'alert' : 'check'} size={20} /></span><div><small>나의 할 일</small><strong>{activeTaskCount ? `${activeTaskCount}개 확인 필요` : '모두 완료했어요'}</strong><p>{overdueTaskCount ? `기한이 지난 항목 ${overdueTaskCount}개가 있어요.` : '상담 후 다음 행동을 확인하세요.'}</p></div><Icon name="chevron" size={18} /></Link>
      <Link to="/student/records"><span className="student-home-shortcut-icon"><Icon name="note" size={20} /></span><div><small>상담 기록</small><strong>{visibleConsultations.length}건의 기록</strong><p>상담 요약과 다음 계획을 이어서 확인하세요.</p></div><Icon name="chevron" size={18} /></Link>
      <Link to="/student/programs"><span className="student-home-shortcut-icon program"><Icon name="layers" size={20} /></span><div><small>비교과 프로그램</small><strong>{recommendationCount ? `상담사 추천 ${recommendationCount}개` : '맞춤 프로그램 찾기'}</strong><p>모집·운영 중인 성장 기회를 살펴보세요.</p></div><Icon name="chevron" size={18} /></Link>
    </section>

    <div className="student-dashboard-grid">{nextAppointment ? <section className="next-appointment"><span className="eyebrow light">다음 상담 일정 · {nextAppointment.status === 'pending' ? '승인 대기' : '확정'}</span><div><span className="date-block"><strong>{appointmentDate.day}</strong><small>{appointmentDate.monthAndWeekday}</small></span><div><h2>{student.counselor || '담당 상담사'} 상담사와 {nextAppointment.type}</h2><p><Icon name="clock" size={16} />{getDayPeriod(nextAppointment.time)} {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)} · {nextAppointment.location}</p><span>{nextAppointment.preparation ? `준비할 내용 · ${nextAppointment.preparation}` : '별도 준비사항이 없습니다.'}</span></div></div><div className="student-appointment-actions"><button type="button" onClick={() => setShowAppointmentDetails(true)}>일정 자세히 보기 <Icon name="arrow" size={17} /></button><button type="button" onClick={() => cancelAppointment(nextAppointment)}>예약 취소</button></div></section> : <section className="next-appointment empty-appointment"><span className="eyebrow light">다음 상담 일정</span><h2>예정된 상담이 없습니다</h2><p>상담이 필요하다면 편한 시간을 직접 선택해 보세요.</p><Link className="student-empty-appointment-link" to="/student/appointments">상담 예약하기 <Icon name="arrow" size={16} /></Link></section>}
      <section className="card recent-summary">{latest ? <><div className="recent-summary-heading"><div><span className="eyebrow">최근 공개 상담 요약</span><h2>{latest.purpose}</h2></div><time dateTime={latest.date}>{latest.date.replaceAll('-', '.')}</time></div><div className="recent-summary-preview"><span>상담 요약</span><p>{latest.summary || latest.concern || '공개된 상담 내용을 상담 기록에서 확인해 주세요.'}</p></div><div className="recent-summary-footer"><div className="summary-provenance"><Icon name="shield" size={15} /><span>{summaryProvenanceLabel(latest)}</span></div><Link className="recent-summary-link" to="/student/records">전체 기록 보기 <Icon name="arrow" size={15} /></Link></div></> : <><span className="eyebrow">최근 공개 상담 요약</span><EmptyState icon="note" title="공개된 상담 요약이 없습니다" description="담당 상담사가 공개한 상담 기록이 이곳에 표시됩니다." /></>}</section>
    </div>

    {showAppointmentDetails && nextAppointment && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAppointmentDetails(false)}><section className="modal student-appointment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-appointment-detail-title"><button className="modal-close" aria-label="닫기" onClick={() => setShowAppointmentDetails(false)}><Icon name="close" size={19} /></button><span className="eyebrow">다음 상담 일정</span><h2 id="student-appointment-detail-title">{nextAppointment.type}</h2><div className="appointment-detail-summary"><span className={`appointment-status ${nextAppointment.status}`}>{nextAppointment.status === 'pending' ? '승인 대기' : '상담 확정'}</span><strong>{nextAppointment.date} · {nextAppointment.time}–{getTimeRangeEnd(nextAppointment)}</strong><p><Icon name="location" size={16} />{nextAppointment.location}</p></div><dl className="student-appointment-detail-list"><div><dt>담당 상담사</dt><dd>{student.counselor || '담당 상담사'} 상담사</dd></div><div><dt>상담 주제</dt><dd>{nextAppointment.subject || nextAppointment.type}</dd></div><div><dt>상담사에게 전달한 내용</dt><dd>{nextAppointment.requestMessage || '학생이 별도로 전달한 내용이 없습니다.'}</dd></div>{nextAppointment.preferredOutcome && <div><dt>상담 후 얻고 싶은 결과</dt><dd>{nextAppointment.preferredOutcome}</dd></div>}<div><dt>상담 준비 안내</dt><dd>{nextAppointment.preparation || '별도 준비사항이 없습니다.'}</dd></div></dl><div className="modal-actions"><button autoFocus className="button primary" onClick={() => setShowAppointmentDetails(false)}>확인</button></div></section></div>}
  </div>;
}
