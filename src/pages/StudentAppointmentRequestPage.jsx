import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { createRescheduleRequest, holdAvailabilityForReschedule, isAvailabilityBookable, upsertAppointmentById } from '../utils/appointments';
import { getTimeRangeEnd, toDateKey } from '../utils/date';
import { validateStudentAppointmentRequest } from '../utils/validation';
import { buildEventNotification } from '../utils/notifications';
import { DEMO_STUDENT_ID } from '../utils/demoInteraction';
import { validateAttachments } from '../utils/attachments';
import { uploadAppointmentAttachment } from '../services/attachmentService';

const initialForm = { type: '진로 상담', subject: '', requestMessage: '', preferredOutcome: '' };
const consultationTypes = ['진로 상담', '취업 상담', '자기소개서 상담', '면접 상담', '기타 상담'];

export default function StudentAppointmentRequestPage() {
  const { availabilityId, appointmentId } = useParams();
  const navigate = useNavigate();
  const { students, counselorAvailability, setCounselorAvailability, appointments, setAppointments, notifications, setNotifications, persistDocument, persistDocumentGroup, notify } = useApp();
  const { user, logout } = useAuth();
  const student = useMemo(() => {
    const matched = user ? students.find(item => item.uid === user.uid) : students.find(item => item.id === DEMO_STUDENT_ID);
    return !user && matched ? { ...matched, counselorUid: 'demo-counselor' } : matched;
  }, [students, user]);
  const slot = counselorAvailability.find(item => item.id === availabilityId);
  const changingAppointment = appointments.find(item => item.id === appointmentId);
  const [form, setForm] = useState(() => changingAppointment ? { type: changingAppointment.type, subject: changingAppointment.subject || '', requestMessage: changingAppointment.requestMessage || '', preferredOutcome: changingAppointment.preferredOutcome || '' } : initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
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
    const validatedFiles = validateAttachments(files, changingAppointment?.attachments?.length || 0);
    if (validatedFiles.error) { setError(validatedFiles.error); return; }
    const createdAt = new Date().toISOString();
    if (changingAppointment) {
      const requested = createRescheduleRequest({ ...changingAppointment, subject: validated.value.subject, requestMessage: validated.value.requestMessage }, slot, 'student');
      if (requested.error) { setError(requested.error); return; }
      requested.value.rescheduleRequest.subject = validated.value.subject;
      requested.value.rescheduleRequest.requestMessage = validated.value.requestMessage;
      const heldSlot = holdAvailabilityForReschedule(slot, changingAppointment);
      const notification = buildEventNotification({ eventId: `${requested.value.rescheduleRequest.id}-requested`, recipientUid: changingAppointment.counselorUid, actorUid: student.uid || user?.uid || '', type: 'appointment', title: '학생이 일정 변경을 요청했습니다', description: `${student.name} 학생 · ${slot.date} ${slot.time}`, to: '/appointments' });
      setSaving(true);
      try {
        await persistDocumentGroup([{ name: 'appointments', record: requested.value }, { name: 'counselorAvailability', record: heldSlot }, { name: 'notifications', record: notification }]);
        setAppointments(items => items.map(item => item.id === changingAppointment.id ? requested.value : item));
        setCounselorAvailability(items => items.map(item => item.id === slot.id ? heldSlot : item));
        setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
        notify('일정 변경을 요청했습니다. 기존 예약은 상담사가 결정할 때까지 유지됩니다.');
        navigate('/student/appointments', { replace: true });
      } catch { setError('일정 변경 요청을 저장하지 못했습니다.'); }
      finally { setSaving(false); }
      return;
    }
    const appointmentId = `appointment-request-${Date.now()}`;
    const appointment = {
      id: appointmentId,
      availabilityId: slot.id,
      studentId: student.id,
      studentUid: student.uid || user?.uid || 'demo-student-s1',
      counselorUid: slot.counselorUid,
      date: slot.date,
      time: slot.time,
      endTime: getTimeRangeEnd(slot),
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
    const notification = buildEventNotification({ eventId: `${appointmentId}-created`, recipientUid: slot.counselorUid, actorUid: appointment.studentUid, type: 'appointment', title: '새 상담 신청이 도착했습니다', description: `${student.name} 학생 · ${slot.date} ${slot.time}`, to: '/appointments', createdAt });
    setSaving(true);
    setError('');
    try {
      await persistDocumentGroup([{ name: 'appointments', record: appointment }, { name: 'counselorAvailability', record: bookedSlot }, { name: 'notifications', record: notification }]);
      const attachments = [];
      for (const file of validatedFiles.value) attachments.push(await uploadAppointmentAttachment({ file, appointmentId, studentUid: appointment.studentUid, counselorUid: appointment.counselorUid, uploaderUid: appointment.studentUid }));
      const savedAppointment = attachments.length ? { ...appointment, attachments } : appointment;
      if (attachments.length) await persistDocument('appointments', savedAppointment);
      setAppointments(items => upsertAppointmentById(items, savedAppointment));
      setCounselorAvailability(items => items.map(item => item.id === slot.id ? bookedSlot : item));
      setNotifications(items => items.some(item => item.id === notification.id) ? items : [...items, notification]);
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
      <Link className="withdrawal-back-link" to={changingAppointment ? `/student/appointments?change=${changingAppointment.id}` : '/student/appointments'}><Icon name="arrow" size={16} />다른 시간 선택하기</Link>
      <div className="student-request-layout">
        <aside className="student-selected-slot"><span className="eyebrow light">선택한 상담 시간</span><strong>{slot.date}</strong><b>{slot.time}–{getTimeRangeEnd(slot)}</b><p>{slot.duration}분 · {slot.location}</p><small>{student.counselor || '담당 상담사'} 상담사</small></aside>
        <section className="card student-request-card">
          <span className="eyebrow">{changingAppointment ? '일정 변경 요청' : '상담 사전 내용'}</span><h1>{changingAppointment ? '상담 내용도 함께 확인하세요' : '상담사에게 미리 알려주세요'}</h1><p>{changingAppointment ? '기존 상담 내용이 유지되며 필요한 경우 수정할 수 있습니다.' : '작성한 내용은 담당 상담사만 확인하며, 상담 준비를 위해 사용됩니다.'}</p>
          {!bookable && <p className="student-slot-warning" role="alert">선택한 시간이 더 이상 신청 가능하지 않습니다. 다른 시간을 선택해 주세요.</p>}
          <form onSubmit={submit}>
            <label>상담 유형<select value={form.type} onChange={event => update('type', event.target.value)}>{consultationTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <label>상담받고 싶은 주제<input autoFocus maxLength="200" value={form.subject} onChange={event => update('subject', event.target.value)} placeholder="예: 서비스 기획 직무 준비 방향" required /></label>
            <label>상담사에게 전달할 내용<textarea rows="6" maxLength="2000" value={form.requestMessage} onChange={event => update('requestMessage', event.target.value)} placeholder="현재 상황, 고민하고 있는 점, 이미 준비한 내용을 구체적으로 적어 주세요." required /><small>{form.requestMessage.length}/2000자 · 10자 이상 입력</small></label>
            <label>상담 후 얻고 싶은 결과 <small>선택</small><textarea rows="3" maxLength="1000" value={form.preferredOutcome} onChange={event => update('preferredOutcome', event.target.value)} placeholder="예: 앞으로 한 달 동안 준비할 순서를 정하고 싶어요." /></label>
            {!changingAppointment && <label>상담 준비자료 <small>선택 · 최대 5개, 파일당 5MB</small><input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={event => { const selected = Array.from(event.target.files || []); const checked = validateAttachments(selected); if (checked.error) { setError(checked.error); event.target.value = ''; return; } setFiles(selected); setError(''); }} /><small>PDF, Word, PNG, JPG 형식만 사용할 수 있습니다.{files.length ? ` · ${files.length}개 선택됨` : ''}</small></label>}
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="student-request-actions"><Link className="button secondary" to="/student/appointments">취소</Link><button className="button primary" disabled={saving || !bookable}>{saving ? '저장 중...' : changingAppointment ? '일정 변경 요청하기' : '상담 신청하기'}</button></div>
          </form>
        </section>
      </div>
    </main>
  </div>;
}
