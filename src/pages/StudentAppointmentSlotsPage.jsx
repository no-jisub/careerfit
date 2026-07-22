import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { EmptyState } from '../components/UI';
import { getAppointmentCancellationLabel, isAvailabilityBookable } from '../utils/appointments';
import { getTimeRangeEnd, toDateKey } from '../utils/date';

const formatDate = value => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
const appointmentStatusLabels = { pending: '승인 대기', confirmed: '확정', scheduled: '확정', completed: '완료', cancelled: '취소' };

export default function StudentAppointmentSlotsPage() {
  const { students, counselorAvailability, appointments } = useApp();
  const { user, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  const now = new Date();
  const today = toDateKey(now);
  const time = now.toTimeString().slice(0, 5);
  const availableSlots = useMemo(() => student ? counselorAvailability
    .filter(slot => isAvailabilityBookable(slot, student, appointments, today, time))
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`)) : [], [student, counselorAvailability, appointments, today, time]);
  const groupedSlots = useMemo(() => availableSlots.reduce((groups, slot) => {
    groups[slot.date] = [...(groups[slot.date] || []), slot];
    return groups;
  }, {}), [availableSlots]);
  const myAppointments = useMemo(() => student ? appointments
    .filter(appointment => appointment.studentId === student.id)
    .sort((left, right) => `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`)) : [], [student, appointments]);

  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;

  return <div className="student-portal student-booking-page">
    <header><Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link><div><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header>
    <main>
      <Link className="withdrawal-back-link" to="/student"><Icon name="arrow" size={16} />학생 홈으로 돌아가기</Link>
      <section className="student-booking-intro"><span className="eyebrow">상담 신청</span><h1>상담 가능한 시간을 선택하세요</h1><p>{student.counselor || '담당 상담사'} 상담사가 공개한 시간만 표시됩니다. 시간을 선택한 다음 상담받고 싶은 내용을 전달해 주세요.</p></section>
      {myAppointments.length > 0 && <section className="card student-appointment-history"><div className="section-header"><div><span className="eyebrow">나의 예약</span><h2>상담 신청 내역</h2><p>예약 상태와 취소한 사람을 함께 확인할 수 있어요.</p></div><span className="student-record-count">총 {myAppointments.length}건</span></div><div>{myAppointments.map(appointment => { const cancellationLabel = getAppointmentCancellationLabel(appointment); return <article key={appointment.id} className={appointment.status}><time><strong>{appointment.date}</strong><span>{appointment.time}–{getTimeRangeEnd(appointment)}</span></time><div><strong>{appointment.type}</strong><span>{appointment.location} · {student.counselor || '담당 상담사'} 상담사</span></div><span className={`appointment-status ${appointment.status}`}>{appointment.status === 'cancelled' ? cancellationLabel : appointmentStatusLabels[appointment.status] || appointment.status}</span></article>; })}</div></section>}
      {availableSlots.length ? <div className="student-slot-groups">{Object.entries(groupedSlots).map(([date, slots]) => <section className="student-slot-group" key={date}><div><strong>{formatDate(date)}</strong><span>{slots.length}개 시간 가능</span></div><div>{slots.map(slot => <article key={slot.id}><span className="student-slot-time">{slot.time}</span><div><strong>{slot.time}–{getTimeRangeEnd(slot)} · {slot.duration}분</strong><span><Icon name="location" size={14} />{slot.location}</span></div><Link className="button primary small" to={`/student/appointments/request/${slot.id}`}>이 시간 선택</Link></article>)}</div></section>)}</div> : <section className="card student-booking-empty"><EmptyState icon="calendar" title="현재 신청 가능한 상담 시간이 없습니다" description="담당 상담사가 새로운 가능 시간을 등록하면 이곳에 표시됩니다." action={<Link className="button secondary" to="/student">학생 홈으로 돌아가기</Link>} /></section>}
    </main>
    <footer><div><strong>커리어핏</strong><span>학생 상담 지원 서비스 · 문의 대학일자리플러스센터</span></div></footer>
  </div>;
}
