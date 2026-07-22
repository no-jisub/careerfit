import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { isAvailabilityBookable } from '../utils/appointments';
import { toDateKey } from '../utils/date';
import { validateStudentAppointmentRequest } from '../utils/validation';

const initialForm = { type: '진로 상담', subject: '', requestMessage: '', preferredOutcome: '' };
const consultationTypes = ['진로 상담', '취업 상담', '자기소개서 상담', '면접 상담', '기타 상담'];

export default function StudentAppointmentRequestPage() {
  const { availabilityId } = useParams();
  const navigate = useNavigate();
  const { students, counselorAvailability, setCounselorAvailability, appointments, setAppointments, persistDocumentGroup, notify } = useApp();
  const { user, logout } = useAuth();
  const student = user ? students.find(item => item.uid === user.uid) : students[0];
  const slot = counselorAvailability.find(item => item.id === availabilityId);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const bookable = isAvailabilityBookable(slot, student, appointments, toDateKey(now), now.toTimeString().slice(0, 5));
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  if (!student) return <main className="app-loading" role="status">연결된 학생 정보를 찾고 있어요...</main>;
  if (!slot || slot.counselorUid !== student.counselorUid) return <Navigate to="/student/appointments" replace />;

  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    if (!isAvailabilityBookable(slot, student, appointments, toDateKey(), new Date().toTimeString().slice(0, 5))) {
      setError('방금 다른 신청으로 마감된 시간입니다. 다른 시간을 선택해 주세요.');
      return;
    }
    const validated = validateStudentAppointmentRequest(form);
    if (validated.error) { setError(validated.error); return; }
    const createdAt = new Date().toISOString();
    const appointmentId = `appointment-request-${Date.now()}`;
    const appointment = {
      id: appointmentId,
      availabilityId: slot.id,
      studentId: student.id,
      studentUid: student.uid || user?.uid || 'demo-student-s1',
      counselorUid: slot.counselorUid,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      location: slot.location,
      ...validated.value,
      preparation: '',
      requestedBy: 'student',
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    };
    const bookedSlot = { ...slot, status: 'booked', appointmentId, bookedByUid: appointment.studentUid, updatedAt: createdAt };
    setSaving(true);
    setError('');
    try {
      await persistDocumentGroup([{ name: 'appointments', record: appointment }, { name: 'counselorAvailability', record: bookedSlot }]);
      setAppointments(items => [...items, appointment]);
      setCounselorAvailability(items => items.map(item => item.id === slot.id ? bookedSlot : item));
      notify('상담 신청을 완료했습니다. 상담사가 확인하면 일정이 확정됩니다.');
      navigate('/student', { replace: true });
    } catch {
      setError('상담 신청을 저장하지 못했습니다. 시간이 마감되었는지 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="student-portal student-booking-page">
    <header><Link className="brand" to="/student"><span className="brand-mark"><Icon name="target" size={22} /></span><span>커리어<span>핏</span></span></Link><div><strong>{student.name}</strong><button className="text-button" onClick={logout}>로그아웃</button></div></header>
    <main>
      <Link className="withdrawal-back-link" to="/student/appointments"><Icon name="arrow" size={16} />다른 시간 선택하기</Link>
      <div className="student-request-layout">
        <aside className="student-selected-slot"><span className="eyebrow light">선택한 상담 시간</span><strong>{slot.date}</strong><b>{slot.time}</b><p>{slot.duration}분 · {slot.location}</p><small>{student.counselor || '담당 상담사'} 상담사</small></aside>
        <section className="card student-request-card">
          <span className="eyebrow">상담 사전 내용</span><h1>상담사에게 미리 알려주세요</h1><p>작성한 내용은 담당 상담사만 확인하며, 상담 준비를 위해 사용됩니다.</p>
          {!bookable && <p className="student-slot-warning" role="alert">선택한 시간이 더 이상 신청 가능하지 않습니다. 다른 시간을 선택해 주세요.</p>}
          <form onSubmit={submit}>
            <label>상담 유형<select value={form.type} onChange={event => update('type', event.target.value)}>{consultationTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <label>상담받고 싶은 주제<input autoFocus maxLength="200" value={form.subject} onChange={event => update('subject', event.target.value)} placeholder="예: 서비스 기획 직무 준비 방향" required /></label>
            <label>상담사에게 전달할 내용<textarea rows="6" maxLength="2000" value={form.requestMessage} onChange={event => update('requestMessage', event.target.value)} placeholder="현재 상황, 고민하고 있는 점, 이미 준비한 내용을 구체적으로 적어 주세요." required /><small>{form.requestMessage.length}/2000자 · 10자 이상 입력</small></label>
            <label>상담 후 얻고 싶은 결과 <small>선택</small><textarea rows="3" maxLength="1000" value={form.preferredOutcome} onChange={event => update('preferredOutcome', event.target.value)} placeholder="예: 앞으로 한 달 동안 준비할 순서를 정하고 싶어요." /></label>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="student-request-actions"><Link className="button secondary" to="/student/appointments">취소</Link><button className="button primary" disabled={saving || !bookable}>{saving ? '신청 중...' : '상담 신청하기'}</button></div>
          </form>
        </section>
      </div>
    </main>
  </div>;
}
