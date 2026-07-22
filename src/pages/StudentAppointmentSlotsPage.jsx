import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { buildMonthCalendar, canRescheduleAppointment, getAppointmentCancellationLabel, isAvailabilityBookable, resolveRescheduleRequest } from '../utils/appointments';
import { addMinutesToTime, getTimeRangeEnd, parseDateKey, toDateKey } from '../utils/date';
import { buildEventNotification } from '../utils/notifications';

const formatDate = value => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
const formatMonthTitle = monthKey => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(parseDateKey(monthKey));
const appointmentStatusLabels = { pending: '승인 대기', confirmed: '확정', scheduled: '확정', completed: '완료', cancelled: '취소' };
const standardTimes = Array.from({ length: 9 }, (_, index) => addMinutesToTime('09:00', index * 60));
const shiftMonth = (monthKey, amount) => {
  const date = parseDateKey(monthKey);
  date.setMonth(date.getMonth() + amount, 1);
  return toDateKey(date);
};

export default function StudentAppointmentSlotsPage() {
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('change') || '';
  const { students, counselorAvailability, setCounselorAvailability, appointments, setAppointments, setNotifications, persistDocumentGroup, notify } = useApp();
  const { user, logout } = useAuth();
  const student = useMemo(() => {
    const matched = user ? students.find(item => item.uid === user.uid) : students[0];
    return !user && matched ? { ...matched, counselorUid: 'demo-counselor' } : matched;
  }, [students, user]);
  const now = new Date();
  const today = toDateKey(now);
  const time = now.toTimeString().slice(0, 5);
  const [selectedDate, setSelectedDate] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(`${today.slice(0, 7)}-01`);
  const availableSlots = useMemo(() => student ? counselorAvailability
    .filter(slot => isAvailabilityBookable(slot, student, appointments, today, time))
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`)) : [], [student, counselorAvailability, appointments, today, time]);
  const availableDates = useMemo(() => new Set(availableSlots.map(slot => slot.date)), [availableSlots]);
  const calendarDays = useMemo(() => buildMonthCalendar(visibleMonth, today), [visibleMonth, today]);
  const myAppointments = useMemo(() => student ? appointments
    .filter(appointment => appointment.studentId === student.id)
    .sort((left, right) => `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`)) : [], [student, appointments]);
  const selectedSlots = useMemo(() => availableSlots.filter(slot => slot.date === selectedDate), [availableSlots, selectedDate]);
  const slotsByTime = useMemo(() => new Map(selectedSlots.map(slot => [slot.time, slot])), [selectedSlots]);
  const displayedTimes = useMemo(() => [...new Set([...standardTimes, ...selectedSlots.map(slot => slot.time)])].sort(), [selectedSlots]);
  const rescheduleAppointment = myAppointments.find(item => item.id === rescheduleId);

  useEffect(() => {
    if (selectedDate && availableDates.has(selectedDate)) return;
    const firstDate = availableSlots[0]?.date || '';
    setSelectedDate(firstDate);
    if (firstDate) setVisibleMonth(`${firstDate.slice(0, 7)}-01`);
  }, [availableSlots, availableDates, selectedDate]);

  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;

  const respondToProposal = async (appointment, approve, originalAction = 'keep') => {
    const original = counselorAvailability.find(item => item.id === appointment.availabilityId);
    const proposed = counselorAvailability.find(item => item.id === appointment.rescheduleRequest?.availabilityId);
    const result = resolveRescheduleRequest(appointment, original, proposed, { approve, originalAction, actorUid: student.uid || user?.uid || '' });
    if (result.error) { notify(result.error); return; }
    const value = result.value;
    const notification = buildEventNotification({ eventId: `${appointment.rescheduleRequest.id}-student-response-${approve ? 'approved' : originalAction}`, recipientUid: appointment.counselorUid, actorUid: student.uid || user?.uid || '', type: 'appointment', title: approve ? '학생이 변경된 일정에 참가합니다' : '학생이 일정 변경 제안을 거절했습니다', description: approve ? `${value.appointment.date} ${value.appointment.time}` : `기존 예약 ${originalAction === 'keep' ? '유지' : '취소'}`, to: '/appointments' });
    await persistDocumentGroup([{ name: 'appointments', record: value.appointment }, ...(value.originalAvailability ? [{ name: 'counselorAvailability', record: value.originalAvailability }] : []), ...(value.proposedAvailability ? [{ name: 'counselorAvailability', record: value.proposedAvailability }] : []), { name: 'notifications', record: notification }]);
    setAppointments(items => items.map(item => item.id === appointment.id ? value.appointment : item));
    const slots = new Map([value.originalAvailability, value.proposedAvailability].filter(Boolean).map(item => [item.id, item]));
    setCounselorAvailability(items => items.map(item => slots.get(item.id) || item));
    setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
    notify(approve ? '변경된 상담 일정에 참가한다고 응답했습니다.' : `변경 제안을 거절하고 기존 예약을 ${originalAction === 'keep' ? '유지했습니다' : '취소했습니다'}.`);
  };

  return <div className="student-portal student-booking-page">
    <header><Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link><div><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header>
    <main>
      <Link className="withdrawal-back-link" to="/student"><Icon name="arrow" size={16} />학생 홈으로 돌아가기</Link>
      <section className="student-booking-intro"><span className="eyebrow">{rescheduleAppointment ? '상담 일정 변경' : '상담 신청'}</span><h1>{rescheduleAppointment ? '새로운 날짜와 시간을 선택하세요' : '날짜와 시간을 선택하세요'}</h1><p>{rescheduleAppointment ? `${rescheduleAppointment.date} ${rescheduleAppointment.time} 예약은 상대방이 결정할 때까지 유지됩니다.` : `${student.counselor || '담당 상담사'} 상담사가 공개한 1시간 일정만 선택할 수 있습니다. 흐리게 표시된 날짜와 시간은 이미 예약되었거나 상담이 불가능합니다.`}</p></section>
      {myAppointments.length > 0 && !rescheduleAppointment && <section className="card student-appointment-history"><div className="section-header"><div><span className="eyebrow">나의 예약</span><h2>상담 신청 내역</h2><p>예약 상태와 취소한 사람을 함께 확인할 수 있어요.</p></div><span className="student-record-count">총 {myAppointments.length}건</span></div><div>{myAppointments.map(appointment => { const cancellationLabel = getAppointmentCancellationLabel(appointment); const counselorProposal = appointment.rescheduleRequest?.status === 'pending' && appointment.rescheduleRequest.initiatedByRole === 'counselor'; return <article key={appointment.id} className={appointment.status}><time><strong>{appointment.date}</strong><span>{appointment.time}–{getTimeRangeEnd(appointment)}</span></time><div><strong>{appointment.type}</strong><span>{appointment.location} · {student.counselor || '담당 상담사'} 상담사</span>{appointment.rescheduleRequest?.status === 'pending' && <small>변경 요청: {appointment.rescheduleRequest.date} {appointment.rescheduleRequest.time} · {counselorProposal ? '응답 필요' : '상담사 승인 대기'}</small>}{appointment.rescheduleHistory?.length > 0 && <small>이전 일정: {appointment.rescheduleHistory.at(-1).previousDate} {appointment.rescheduleHistory.at(-1).previousTime}</small>}</div><span className={`appointment-status ${appointment.status}`}>{appointment.status === 'cancelled' ? cancellationLabel : appointmentStatusLabels[appointment.status] || appointment.status}</span>{counselorProposal ? <div className="appointment-actions"><button className="button primary small" onClick={() => respondToProposal(appointment, true)}>참가·변경 승인</button><button className="button secondary small" onClick={() => respondToProposal(appointment, false, 'keep')}>불참·기존 유지</button><button className="text-button danger" onClick={() => respondToProposal(appointment, false, 'cancel')}>불참·기존 취소</button></div> : canRescheduleAppointment(appointment) && <Link className="button secondary small" to={`/student/appointments?change=${appointment.id}`}>시간 변경</Link>}</article>; })}</div></section>}
      <section className="card student-scheduler" aria-label="상담 날짜와 시간 선택">
        <div className="student-scheduler-calendar">
          <div className="calendar-toolbar"><button type="button" aria-label="이전 달" onClick={() => setVisibleMonth(month => shiftMonth(month, -1))}><Icon name="chevron" size={18} /></button><strong>{formatMonthTitle(visibleMonth)}</strong><button type="button" aria-label="다음 달" onClick={() => setVisibleMonth(month => shiftMonth(month, 1))}><Icon name="chevron" size={18} /></button></div>
          <div className="calendar-weekdays" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="student-calendar-grid">{calendarDays.map(day => { const available = day.inMonth && !day.isPast && availableDates.has(day.date); const selected = selectedDate === day.date; return <button type="button" key={day.date} className={`${selected ? 'selected' : ''} ${!day.inMonth ? 'outside' : ''} ${!available ? 'unavailable' : ''}`} disabled={!available} aria-pressed={selected} title={available ? `${formatDate(day.date)} 선택` : '예약할 수 없는 날짜'} onClick={() => setSelectedDate(day.date)}><span>{day.day}</span>{available && <i aria-hidden="true" />}</button>; })}</div>
          <div className="scheduler-legend"><span><i className="available" />예약 가능</span><span><i />예약 완료 또는 상담 불가</span></div>
        </div>
        <div className="student-scheduler-times">
          <div><span className="eyebrow">선택한 날짜</span><h2>{selectedDate ? formatDate(selectedDate) : '예약 가능한 날짜가 없습니다'}</h2><p>{selectedDate ? '원하는 1시간 상담 시간을 선택하세요.' : '담당 상담사가 새로운 시간을 등록하면 선택할 수 있어요.'}</p></div>
          {selectedDate ? <div className="student-time-grid">{displayedTimes.map(slotTime => { const slot = slotsByTime.get(slotTime); return slot ? <Link key={slotTime} to={rescheduleAppointment ? `/student/appointments/change/${rescheduleAppointment.id}/${slot.id}` : `/student/appointments/request/${slot.id}`}><span>{slotTime}–{getTimeRangeEnd(slot)}</span><strong>선택</strong></Link> : <button type="button" key={slotTime} disabled><span>{slotTime}–{addMinutesToTime(slotTime, 60)}</span><strong>선택 불가</strong></button>; })}</div> : <div className="student-scheduler-empty"><Icon name="calendar" size={28} /><span>현재 공개된 상담 시간이 없습니다.</span></div>}
        </div>
      </section>
    </main>
    <footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div></footer>
  </div>;
}
