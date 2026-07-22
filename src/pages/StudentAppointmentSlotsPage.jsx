import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { buildMonthCalendar, getAppointmentCancellationLabel, isAvailabilityBookable } from '../utils/appointments';
import { addMinutesToTime, getTimeRangeEnd, parseDateKey, toDateKey } from '../utils/date';

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
  const { students, counselorAvailability, appointments } = useApp();
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

  useEffect(() => {
    if (selectedDate && availableDates.has(selectedDate)) return;
    const firstDate = availableSlots[0]?.date || '';
    setSelectedDate(firstDate);
    if (firstDate) setVisibleMonth(`${firstDate.slice(0, 7)}-01`);
  }, [availableSlots, availableDates, selectedDate]);

  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;

  return <div className="student-portal student-booking-page">
    <header><Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link><div><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header>
    <main>
      <Link className="withdrawal-back-link" to="/student"><Icon name="arrow" size={16} />학생 홈으로 돌아가기</Link>
      <section className="student-booking-intro"><span className="eyebrow">상담 신청</span><h1>날짜와 시간을 선택하세요</h1><p>{student.counselor || '담당 상담사'} 상담사가 공개한 1시간 일정만 선택할 수 있습니다. 흐리게 표시된 날짜와 시간은 이미 예약되었거나 상담이 불가능합니다.</p></section>
      {myAppointments.length > 0 && <section className="card student-appointment-history"><div className="section-header"><div><span className="eyebrow">나의 예약</span><h2>상담 신청 내역</h2><p>예약 상태와 취소한 사람을 함께 확인할 수 있어요.</p></div><span className="student-record-count">총 {myAppointments.length}건</span></div><div>{myAppointments.map(appointment => { const cancellationLabel = getAppointmentCancellationLabel(appointment); return <article key={appointment.id} className={appointment.status}><time><strong>{appointment.date}</strong><span>{appointment.time}–{getTimeRangeEnd(appointment)}</span></time><div><strong>{appointment.type}</strong><span>{appointment.location} · {student.counselor || '담당 상담사'} 상담사</span></div><span className={`appointment-status ${appointment.status}`}>{appointment.status === 'cancelled' ? cancellationLabel : appointmentStatusLabels[appointment.status] || appointment.status}</span></article>; })}</div></section>}
      <section className="card student-scheduler" aria-label="상담 날짜와 시간 선택">
        <div className="student-scheduler-calendar">
          <div className="calendar-toolbar"><button type="button" aria-label="이전 달" onClick={() => setVisibleMonth(month => shiftMonth(month, -1))}><Icon name="chevron" size={18} /></button><strong>{formatMonthTitle(visibleMonth)}</strong><button type="button" aria-label="다음 달" onClick={() => setVisibleMonth(month => shiftMonth(month, 1))}><Icon name="chevron" size={18} /></button></div>
          <div className="calendar-weekdays" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="student-calendar-grid">{calendarDays.map(day => { const available = day.inMonth && !day.isPast && availableDates.has(day.date); const selected = selectedDate === day.date; return <button type="button" key={day.date} className={`${selected ? 'selected' : ''} ${!day.inMonth ? 'outside' : ''} ${!available ? 'unavailable' : ''}`} disabled={!available} aria-pressed={selected} title={available ? `${formatDate(day.date)} 선택` : '예약할 수 없는 날짜'} onClick={() => setSelectedDate(day.date)}><span>{day.day}</span>{available && <i aria-hidden="true" />}</button>; })}</div>
          <div className="scheduler-legend"><span><i className="available" />예약 가능</span><span><i />예약 완료 또는 상담 불가</span></div>
        </div>
        <div className="student-scheduler-times">
          <div><span className="eyebrow">선택한 날짜</span><h2>{selectedDate ? formatDate(selectedDate) : '예약 가능한 날짜가 없습니다'}</h2><p>{selectedDate ? '원하는 1시간 상담 시간을 선택하세요.' : '담당 상담사가 새로운 시간을 등록하면 선택할 수 있어요.'}</p></div>
          {selectedDate ? <div className="student-time-grid">{displayedTimes.map(slotTime => { const slot = slotsByTime.get(slotTime); return slot ? <Link key={slotTime} to={`/student/appointments/request/${slot.id}`}><span>{slotTime}–{getTimeRangeEnd(slot)}</span><strong>선택</strong></Link> : <button type="button" key={slotTime} disabled><span>{slotTime}–{addMinutesToTime(slotTime, 60)}</span><strong>선택 불가</strong></button>; })}</div> : <div className="student-scheduler-empty"><Icon name="calendar" size={28} /><span>현재 공개된 상담 시간이 없습니다.</span></div>}
        </div>
      </section>
    </main>
    <footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div></footer>
  </div>;
}
